// Installed app (PWA): takes over at once, shows a short page when there's no internet,
// and handles phone notifications (show the push, open the app on tap).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Coach Junior</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0a0c;color:#f5f5f5;font-family:system-ui,sans-serif;text-align:center">
<div><p style="font-size:20px;font-weight:800;color:#d4af37">مفيش إنترنت</p><p>اتأكد من الاتصال وجرب تاني.</p>
<button onclick="location.reload()" style="margin-top:12px;padding:12px 28px;border:0;border-radius:12px;background:#d4af37;color:#0a0a0c;font-weight:800;font-size:16px">حاول تاني</button></div>`;

// pages always come from the network (data must be fresh); only a failed page load gets the offline screen
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "content-type": "text/html; charset=utf-8" } })));
});

self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || "Coach Junior", { body: d.body || "", icon: "/img/icon-192.png", badge: "/img/icon-192.png", dir: "rtl", lang: "ar", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
