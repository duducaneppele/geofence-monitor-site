// Geofence Monitor — service worker: push + cache offline do shell (PWA)
// B = caminho base onde o app está publicado ("/" local, "/geofence-monitor/" no GitHub Pages)
const CACHE = "gm-shell-v2";
const B = new URL("./", self.location).pathname;
const TITLES = { geofence_out: "Boia FORA da cerca", geofence_alert: "Alerta de cerca", geofence_in: "Boia voltou para a cerca", asset_silent_event: "Boia silenciosa", user_pending_event: "Usuário aguardando aprovação" };

self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll([B, B + "manifest.webmanifest", B + "buoys/artic_red.png", B + "buoys/artic_green.png"]).catch(() => {}))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

// navegação: rede primeiro, cai para o shell em cache quando offline
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.mode === "navigate") { e.respondWith(fetch(e.request).catch(() => caches.match(B))); return; }
  if (u.origin === location.origin && (u.pathname.startsWith(B + "buoys/") || u.pathname === B + "manifest.webmanifest")) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return res; })));
  }
});

self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  const title = d.title || TITLES[d.type] || "Geofence Monitor";
  e.waitUntil(self.registration.showNotification(title, { body: d.body || "", icon: B + "icon-192.png", badge: B + "icon-192.png", data: { url: d.url || B }, tag: d.tag }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || B;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => { const c = cs.find(x => "focus" in x); if (c) { c.navigate(url); return c.focus(); } return self.clients.openWindow(url); }));
});
