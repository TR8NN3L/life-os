// Life OS — Service Worker
// Handles Web Push notifications + offline caching basics

const CACHE = "lifeos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// ── Push received ────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Life OS", body: "Neue Benachrichtigung" };
  try { data = event.data.json(); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title || "Life OS", {
      body: data.body || data.message || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      tag: data.tag || "lifeos",
      renotify: true,
      data: { url: "/" },
    })
  );
});

// ── Notification click → open / focus the app ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client)
          return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
