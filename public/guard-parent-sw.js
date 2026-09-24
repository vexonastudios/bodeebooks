// Online family data and commands are never put in an offline cache.
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
const sequence = value => typeof value === 'string' && /^\d{1,19}$/.test(value) ? value : '0';
const count = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 9999) : 0;
const validAccount = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const recent = value => Number.isFinite(value) && value <= Date.now() + 60000 && Date.now() - value < 86400000;
const replyJobs = new Map();
function replyDraft(data) {
  return validAccount(data?.accountUserId) && validId(data?.studentId) && validId(data?.replyId) && recent(data.createdAt) &&
    typeof data.pendingReply === 'string' && data.pendingReply.trim() && data.pendingReply.length <= 10000;
}
async function openConversation(data) {
  const studentId = validId(data?.studentId) ? data.studentId : '';
  const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = tabs.find(client => { const url = new URL(client.url); return url.origin === self.location.origin && /^\/(?:guard\/)?dashboard\/?$/.test(url.pathname); });
  if (existing) {
    existing.postMessage({ type: 'bodeeguard-open-messages', studentId });
    if (replyDraft(data)) existing.postMessage({ type: 'bodeeguard-reply-draft', draft: data });
    await existing.focus();
  } else await self.clients.openWindow('/dashboard/' + (studentId ? '?conversation=' + studentId : '') + '#messages' + (studentId ? '/' + studentId : ''));
}
async function sendReply(data) {
  if (!replyDraft(data)) return openConversation(data);
  if (replyJobs.has(data.replyId)) return replyJobs.get(data.replyId);
  const job = (async () => {
    try {
      if (data.pendingReply.length > 2000) throw Error('Reply too long');
      const response = await fetch('/guard/dashboard/notification-reply/', { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountUserId: data.accountUserId, studentId: data.studentId, id: data.replyId, body: data.pendingReply }) });
      const receipt = await response.json();
      if (!response.ok || receipt.saved !== true || receipt.id !== data.replyId || receipt.studentId !== data.studentId) throw Error('Reply not confirmed');
      await self.registration.showNotification('BodeeGuard', { body: 'Reply sent.', tag: 'bodeeguard-reply-' + data.replyId,
        icon: '/guard-icons/bodeeguard-parent-192.png', data: { studentId: data.studentId } });
      for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'bodeeguard-message-hint' });
    } catch {
      // Keep only the parent's explicitly typed reply in this local notification,
      // with a 24-hour retry window. Expired drafts are cleared on app resume.
      // Never put private drafts in URLs or the offline cache.
      await self.registration.showNotification('BodeeGuard — reply needs attention', {
        body: 'Sending was not confirmed. Open BodeeGuard to sign in or review your reply, or retry the same message.',
        tag: 'bodeeguard-reply-' + data.replyId, icon: '/guard-icons/bodeeguard-parent-192.png',
        actions: [{ action: 'open', title: 'Open & review' }, { action: 'retry', title: 'Retry reply' }], data
      });
    }
  })();
  replyJobs.set(data.replyId, job);
  try { await job; } finally { replyJobs.delete(data.replyId); }
}
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
  const replyId = !test && studentId && validAccount(data.accountUserId) ? self.crypto?.randomUUID?.() : undefined;
  event.waitUntil(Promise.all([
    self.registration.showNotification('BodeeGuard', {
      body: test ? 'Notifications are working on this device.' : unread > 1 ? unread + ' unread messages from your child. Tap to open Messages.' : 'New message from your child. Tap to open Messages.',
      icon: '/guard-icons/bodeeguard-parent-192.png',
      tag: test ? 'bodeeguard-test' : 'bodeeguard-messages' + (studentId ? '-' + studentId : ''),
      renotify: true,
      actions: replyId ? [{ action: 'reply', type: 'text', title: 'Quick reply', placeholder: 'Reply to your child…' }, { action: 'open', title: 'Open message' }] : [],
      data: {studentId,sequence:sequence(data.sequence),...(replyId ? { accountUserId: data.accountUserId, replyId, createdAt: Date.now() } : {})},
    }),
    test ? Promise.resolve() : badge(count(data.totalUnread)),
    (async()=>{for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'bodeeguard-message-hint'});})(),
  ]));
});
self.addEventListener('message', event => {
  // Only a same-origin parent page may clear this device's alerts.
  let url;
  try { url = new URL(event.source?.url); } catch { return; }
  if(url.origin !== self.location.origin || !/^\/(?:guard\/)?(?:dashboard|account)\/?$/.test(url.pathname))return;
  const data=event.data;
  if(!data || !['bodeeguard-notifications-stop','bodeeguard-notifications-unread','bodeeguard-conversation-read','bodeeguard-replies-resume','bodeeguard-reply-complete'].includes(data.type))return;
  event.waitUntil((async()=>{
    if (data.type === 'bodeeguard-replies-resume' || data.type === 'bodeeguard-reply-complete') {
      if (!validAccount(data.accountUserId)) return;
      for (const alert of await self.registration.getNotifications()) {
        if (!alert.data?.pendingReply) continue;
        if (!recent(alert.data.createdAt)) { alert.close(); continue; }
        if (alert.data.accountUserId !== data.accountUserId) continue;
        if (data.type === 'bodeeguard-reply-complete') { if (alert.data.replyId === data.replyId) alert.close(); }
        else if (replyDraft(alert.data)) event.source.postMessage({ type: 'bodeeguard-reply-draft', draft: alert.data });
      }
      return;
    }
    if(data.type==='bodeeguard-conversation-read' && !validId(data.studentId))return;
    await badge(data.type==='bodeeguard-notifications-stop'?0:count(data.totalUnread));
    if(data.type==='bodeeguard-notifications-unread')return;
    const notifications=await self.registration.getNotifications();
    for(const alert of notifications){
      if(!alert.tag.startsWith('bodeeguard-'))continue;
      if(data.type==='bodeeguard-notifications-stop' || !alert.data?.pendingReply && alert.data?.studentId===data.studentId &&
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
  const data = event.notification.data || {};
  if (event.action === 'reply' && typeof event.reply === 'string' && event.reply.trim()) {
    event.notification.close();
    event.waitUntil(sendReply({ ...data, pendingReply: event.reply.trim() }));
  } else if (event.action === 'retry' && replyDraft(data)) {
    event.notification.close(); event.waitUntil(sendReply(data));
  } else {
    // Leave a failed reply available during a cold launch or sign-in redirect.
    if (!data.pendingReply) event.notification.close();
    event.waitUntil(openConversation(data));
  }
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
  if (url.pathname !== '/' && !/^\/(?:guard\/)?(?:dashboard|account|sign-in)(?:\/|$)/.test(url.pathname)) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BodeeGuard</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#080b18;color:#f8fafc;font:16px system-ui;padding:24px}h1{font-size:26px}p{color:#a1aec4}a{color:#a5b4fc;padding:16px 0}</style></head><body><h1>You’re offline</h1><p>Reconnect to use your parent dashboard.</p><a href="/dashboard/" target="_top">Try again</a></body></html>`, {
    status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'" }
  })));
});
