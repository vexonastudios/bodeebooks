// Online family data and commands are never put in an offline cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (url.pathname !== '/' && !/^\/(?:guard\/)?(?:dashboard|account|sign-in)(?:\/|$)/.test(url.pathname)) return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BodeeGuard</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#080b18;color:#f8fafc;font:16px system-ui;padding:24px}h1{font-size:26px}p{color:#a1aec4}a{color:#a5b4fc;padding:16px 0}</style></head><body><h1>You’re offline</h1><p>Reconnect to use your parent dashboard.</p><a href="/dashboard/" target="_top">Try again</a></body></html>`, {
    status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'" }
  })));
});
