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
