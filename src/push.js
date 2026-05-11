// Life OS — Push Notification Helper (Pushover via /api/push proxy)

window.Push = {
  isConfigured() {
    return !!(
      localStorage.getItem("lifeos_pushover_token") &&
      localStorage.getItem("lifeos_pushover_user")
    );
  },

  async send({ title, message, priority = 0, sound } = {}) {
    const token = localStorage.getItem("lifeos_pushover_token");
    const user  = localStorage.getItem("lifeos_pushover_user");
    if (!token || !user) return false; // not configured — silent

    try {
      const r = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user, title: title || "Life OS", message, priority, sound }),
      });
      return r.ok;
    } catch (e) {
      console.warn("[Push] Failed:", e.message);
      return false;
    }
  },

  // Convenience wrappers
  blockStart(blockName) {
    return this.send({
      title: "⚡ Block startet",
      message: blockName || "Dein nächster Block beginnt jetzt.",
      priority: 0,
      sound: "pushover",
    });
  },

  timerReminder(taskName, minutes) {
    return this.send({
      title: "⏱ Timer läuft schon lange",
      message: `"${taskName}" läuft seit ${minutes} Minuten. Kurze Pause einplanen?`,
      priority: 0,
    });
  },

  inactiveReminder(blockName) {
    return this.send({
      title: "💤 Kein Timer aktiv",
      message: blockName
        ? `Block "${blockName}" läuft — aber kein Timer gestartet.`
        : "Du hast einen aktiven Block, aber keinen Timer gestartet.",
      priority: 0,
    });
  },
};
