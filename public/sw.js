/* global self */

// Fuerza la activación inmediata del Service Worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo de mensajes PUSH (viniendo desde el servidor)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Just Message", body: event.data.text() };
  }

  const options = {
    body: data.body || "Tienes un mensaje nuevo",
    icon: "/logo_chat_icon.png",
    badge: "/logo_chat_icon.png",
    // Tag dinámico para evitar que se pisen notificaciones
    tag: data.tag || `push-${Date.now()}`,
    renotify: true,
    data: { url: self.location.origin },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Just Message", options)
  );
});

// Manejo del clic en la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow("/");
      })
  );
});
