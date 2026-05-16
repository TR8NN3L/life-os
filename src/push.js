// Life OS — Web Push Helper
// Handles SW registration, push subscription, and sending via /api/notify

window.Push = {
  VAPID_PUBLIC: "BMxK6OBVWwEa3sErwXZNFHsWSb3VknIiWm47HhoCO1sb8UZT0IFxWaLNUbSs2WZzoWs5YSywCtBB9ix26f--uxw",

  // ── Service Worker ──────────────────────────────────────────────────────────
  async registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      return reg;
    } catch (e) {
      console.warn("[Push] SW registration failed:", e);
      return null;
    }
  },

  // ── Subscribe ───────────────────────────────────────────────────────────────
  async subscribe() {
    if (!("PushManager" in window)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) { this._save(existing); return existing; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._b64ToUint8(this.VAPID_PUBLIC),
      });
      this._save(sub);
      return sub;
    } catch (e) {
      console.warn("[Push] Subscribe failed:", e);
      return null;
    }
  },

  // ── Permission ──────────────────────────────────────────────────────────────
  async requestPermission() {
    if (!("Notification" in window)) return "denied";
    if (Notification.permission === "granted") return "granted";
    const result = await Notification.requestPermission();
    return result;
  },

  permissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  },

  // ── Send ────────────────────────────────────────────────────────────────────
  async send({ title, message, tag } = {}) {
    const sub = this.getSubscription();
    if (!sub) return false;
    try {
      const r = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub, title: title || "Life OS", message, tag }),
      });
      return r.ok;
    } catch (e) {
      console.warn("[Push] Send failed:", e);
      return false;
    }
  },

  // ── Convenience ─────────────────────────────────────────────────────────────
  isConfigured() { return !!this.getSubscription(); },

  blockStart(blockName) {
    return this.send({
      title: "⚡ Block startet",
      message: `"${blockName || "Dein Block"}" beginnt jetzt — Timer starten!`,
      tag: "block-start",
    });
  },

  timerReminder(taskName, minutes) {
    return this.send({
      title: "⏱ Lange am Stück",
      message: `"${taskName}" läuft seit ${minutes} Min. Kurze Pause einplanen?`,
      tag: "timer-reminder",
    });
  },

  inactiveReminder(blockName) {
    return this.send({
      title: "💤 Kein Timer aktiv",
      message: blockName ? `Block "${blockName}" läuft — noch kein Timer gestartet.` : "Aktiver Block ohne Timer.",
      tag: "inactive",
    });
  },

  blockPrepare(blockName) {
    return this.send({
      title: "📋 Block in 30 Min",
      message: `"${blockName || "Dein Block"}" startet bald — kurz vorbereiten!`,
      tag: "block-prepare",
    });
  },

  blockEndingSoon(blockName, minutesLeft) {
    return this.send({
      title: "⏳ Block endet in 15 Min",
      message: `"${blockName || "Dein Block"}" — Wrap-up starten, Timer stoppen.`,
      tag: "block-ending-soon",
    });
  },

  blockEnded(blockName) {
    return this.send({
      title: "✅ Block beendet",
      message: `"${blockName || "Dein Block"}" ist vorbei. Timer stoppen & kurz reflektieren.`,
      tag: "block-ended",
    });
  },

  taskEstExceeded(taskName, minutesOver) {
    return this.send({
      title: "⚠️ Zeitschätzung überschritten",
      message: `"${taskName}" läuft ${minutesOver} Min über der Schätzung — weitermachen oder pausieren?`,
      tag: "task-est-exceeded",
    });
  },

  deadlineReminder(projName, amount, unit) {
    const urgent = unit === "Stunden" || amount <= 2;
    return this.send({
      title: urgent ? "🚨 Deadline naht!" : "📅 Deadline-Erinnerung",
      message: `"${projName || "Projekt"}" — noch ${amount} ${unit} bis zur Deadline.`,
      tag: "deadline-reminder",
    });
  },

  habitReminder(count) {
    return this.send({
      title: "🔁 Habits nicht vergessen",
      message: count === 1
        ? "1 Habit heute noch nicht erledigt — kurz einchecken!"
        : `${count} Habits heute noch offen — kurz einchecken!`,
      tag: "habit-reminder",
    });
  },

  debtAlarm(debtHours) {
    return this.send({
      title: "🚨 Ignorance Debt kritisch",
      message: `${debtHours.toFixed(1)}h Schuld zwischen Plan und Realität — jetzt Timer starten und Schuld abbauen.`,
      tag: "debt-alarm",
    });
  },

  eveningCheckin({ tasksDone, tasksPlanned, streakSafe }) {
    const streakEmoji = streakSafe ? "🔥" : "⚠️";
    const doneStr = tasksPlanned > 0
      ? `${tasksDone} von ${tasksPlanned} Tasks erledigt.`
      : `${tasksDone} Tasks heute erledigt.`;
    return this.send({
      title: `${streakEmoji} Abend-Check`,
      message: `${doneStr} ${streakSafe ? "Streak sicher!" : "Streak in Gefahr!"}`,
      tag: "evening-checkin",
    });
  },

  // ── Scheduler ───────────────────────────────────────────────────────────────
  // Call once on app start. Checks habits at 21:00 daily + debt when over threshold.
  startScheduler({ getHabits, getDebt, debtThreshold = 5, getEveningStats }) {
    const todayISO = () => new Date().toISOString().slice(0, 10);

    // Habit reminder — check every 5 minutes if it's past 21:00 and habits undone
    const checkHabits = () => {
      if (!this.isConfigured()) return;
      const h = new Date().getHours();
      if (h < 21) return;
      const lastKey = `lifeos_habit_reminder_${todayISO()}`;
      if (localStorage.getItem(lastKey)) return; // already sent today
      try {
        const habits = getHabits ? getHabits() : JSON.parse(localStorage.getItem("lifeos_habits") || "[]");
        const today = todayISO();
        const undone = habits.filter(hb => !hb.log?.[today]).length;
        if (undone > 0) {
          this.habitReminder(undone);
          localStorage.setItem(lastKey, "1");
        }
      } catch {}
    };

    // Debt alarm — check every 10 minutes
    const checkDebt = () => {
      if (!this.isConfigured()) return;
      const lastKey = `lifeos_debt_alarm_${todayISO()}`;
      if (localStorage.getItem(lastKey)) return; // max once per day
      try {
        const debt = getDebt ? getDebt() : null;
        if (debt !== null && debt >= debtThreshold) {
          this.debtAlarm(debt);
          localStorage.setItem(lastKey, "1");
        }
      } catch {}
    };

    // Evening check-in — 20:00, max once per day
    const checkEvening = () => {
      if (!this.isConfigured()) return;
      const h = new Date().getHours();
      if (h < 20 || h >= 21) return;
      const lastKey = `lifeos_evening_checkin_${todayISO()}`;
      if (localStorage.getItem(lastKey)) return;
      try {
        const stats = getEveningStats ? getEveningStats() : null;
        if (stats !== null) {
          this.eveningCheckin(stats);
          localStorage.setItem(lastKey, "1");
        }
      } catch {}
    };

    setInterval(checkHabits, 5 * 60 * 1000);
    setInterval(checkDebt,   10 * 60 * 1000);
    setInterval(checkEvening, 5 * 60 * 1000);
    // Also run once on startup (after 30s to let app settle)
    setTimeout(() => { checkHabits(); checkDebt(); checkEvening(); }, 30000);
  },

  milestone(percent, name) {
    const emoji = percent >= 100 ? "🏆" : "🎯";
    return this.send({
      title: `${emoji} ${percent}% erreicht!`,
      message: name
        ? `"${name}" — ${percent === 100 ? "vollständig abgeschlossen!" : "Halbzeit! Weiter so."}`
        : `${percent === 100 ? "Ziel vollständig erreicht!" : "Halbzeit — weiter so!"}`,
      tag: `milestone-${percent}`,
    });
  },

  // ── Storage ─────────────────────────────────────────────────────────────────
  _save(sub) {
    try { localStorage.setItem("lifeos_push_sub", JSON.stringify(sub.toJSON ? sub.toJSON() : sub)); } catch {}
  },
  getSubscription() {
    try { return JSON.parse(localStorage.getItem("lifeos_push_sub")); } catch { return null; }
  },

  // ── Util ────────────────────────────────────────────────────────────────────
  _b64ToUint8(b64) {
    const pad = "=".repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  },

  // Detect device type for install instructions
  deviceType() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  },

  isPWA() {
    return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
  },
};

// Auto-register SW on load
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => window.Push.registerSW());
}
