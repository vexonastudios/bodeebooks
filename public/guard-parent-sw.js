// Online family data and commands are never put in an offline cache.
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const sequence = value => typeof value === 'string' && /^\d{1,19}$/.test(value) ? value : '0';
const count = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 9999) : 0;
async function badge(value) {
  try { if(value)await self.navigator?.setAppBadge?.(value);else await self.navigator?.clearAppBadge?.(); } catch { /* Optional OS support. */ }
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Empty pushes still display an alert. */ }
  const studentId = validId(data.studentId) ? data.studentId : '';
  const unread = count(data.unread), test = data.type === 'test';
  event.waitUntil(Promise.all([
    self.registration.showNotification('BodeeGuard', {
      body: test ? 'Notifications are working on this device.' : unread > 1 ? unread + ' unread messages from your child. Tap to open Messages.' : 'New message from your child. Tap to open Messages.',
      icon: '/guard-icons/bodeeguard-parent-192.png',
      tag: test ? 'bodeeguard-test' : 'bodeeguard-messages' + (studentId ? '-' + studentId : ''),
      renotify: true, data: {studentId,sequence:sequence(data.sequence)},
    }),
    test ? Promise.resolve() : badge(count(data.totalUnread)),
  ]));
});
self.addEventListener('message', event => {
  // Only a same-origin parent page may clear this device's alerts.
  let url;
  try { url = new URL(event.source?.url); } catch { return; }
  if(url.origin !== self.location.origin || !/^\/(?:guard\/)?(?:dashboard|account)\/?$/.test(url.pathname))return;
  const data=event.data;
  if(!data || !['bodeeguard-notifications-stop','bodeeguard-notifications-unread','bodeeguard-conversation-read'].includes(data.type))return;
  event.waitUntil((async()=>{
    if(data.type==='bodeeguard-conversation-read' && !validId(data.studentId))return;
    await badge(data.type==='bodeeguard-notifications-stop'?0:count(data.totalUnread));
    if(data.type==='bodeeguard-notifications-unread')return;
    const notifications=await self.registration.getNotifications();
    for(const alert of notifications){
      if(!alert.tag.startsWith('bodeeguard-'))continue;
      if(data.type==='bodeeguard-notifications-stop' || alert.data?.studentId===data.studentId &&
          BigInt(sequence(alert.data?.sequence))<=BigInt(sequence(data.throughSequence)))alert.close();
    }
  })());
});
self.addEventListener('pushsubscriptionchange', event => {
  // Never subscribe without the parent's permission/account. Visible-page checks
  // also repair browsers that do not implement this event.
  event.waitUntil((async()=>{
    for(const client of await self.clients.matchAll({type:'window'})){
      const url=new URL(client.url);
      if(url.origin===self.location.origin)client.postMessage({type:'bodeeguard-notifications-attention'});
    }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const studentId=validId(event.notification.data?.studentId)?event.notification.data.studentId:'';
  event.waitUntil((async()=>{
    const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=tabs.find(client=>{
      const url=new URL(client.url);
      return url.origin===self.location.origin&&/^\/(?:guard\/)?dashboard\/?$/.test(url.pathname);
    });
    if(existing){existing.postMessage({type:'bodeeguard-open-messages',studentId});await existing.focus();}
    else await self.clients.openWindow('/dashboard/'+(studentId?'?conversation='+studentId:'')+'#messages'+(studentId?'/'+studentId:''));
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (url.pathname !== '/' && !/^\/(?:guard\/)?(?:dashboard|account|sign-in)(?:\/|$)/.test(url.pathname)) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BodeeGuard</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#080b18;color:#f8fafc;font:16px system-ui;padding:24px}h1{font-size:26px}p{color:#a1aec4}a{color:#a5b4fc;padding:16px 0}</style></head><body><h1>You’re offline</h1><p>Reconnect to use your parent dashboard.</p><a href="/dashboard/" target="_top">Try again</a></body></html>`, {
    status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'" }
  })));
});
