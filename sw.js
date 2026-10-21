// Network-only: no questionnaire answers, catalog or prices are cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>3Regali · Connessione assente</title><body style="font:18px/1.6 system-ui;max-width:32rem;margin:15vh auto;padding:24px;color:#15122b"><h1>Torniamo appena sei online.</h1><p>Per cercare i regali serve una connessione internet.</p><a href="/?app=1">Riprova / Try again</a><p lang="en">An internet connection is required to find gifts.</p></body></html>`, {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
