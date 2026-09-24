import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const { createParentNotifications,stopParentPhoneNotifications } = await import('data:text/javascript;base64,' + fs.readFileSync('app/guard/dashboard/parent-notifications-client.js').toString('base64'));
function fixture({ ios = false, standalone = true, permission = 'default', owner = null } = {}) {
  const calls = [], states = [], data = new Map(); if (owner) data.set('bodeeguard-phone-notifications', JSON.stringify({ userId: owner, renewed: 0 }));
  const key = Buffer.alloc(65, 4), publicKey = key.toString('base64url');
  const state = { sub: null, permissionCalls: 0, subscriptions: 0, unsubscriptions: 0, offline: false, revoked: false };
  const sub = () => ({ options: { applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) }, toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/fixture', keys: {} }), unsubscribe: async () => { state.unsubscriptions++; state.sub = null; return true; } });
  const manager = { getSubscription: async () => state.sub, subscribe: async options => { assert.equal(options.userVisibleOnly, true); assert.deepEqual(Buffer.from(options.applicationServerKey), key); state.sub = sub(); state.subscriptions++; return state.sub; } };
  if (owner) state.sub = sub();
  const browser = { document: { hidden: false }, Notification: { permission, requestPermission: () => { state.permissionCalls++; browser.Notification.permission = 'granted'; return Promise.resolve('granted'); } }, PushManager: {},
    navigator: { userAgent: ios ? 'iPhone' : 'Chrome', platform: 'fixture', serviceWorker: { ready: Promise.resolve({ pushManager: manager }),getRegistration:async()=>({pushManager:manager}) } },
    matchMedia: () => ({ matches: standalone }), atob, localStorage: { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } };
  const request = async (operation, subscription, userId,details) => { calls.push({ operation, subscription, userId,details }); if (state.offline) throw Error('offline'); return {supported:true,publicKey,deviceId:'fixture-device',devices:owner||state.sub?[{id:'fixture-device',label:'Phone',revokedAt:state.revoked?'2026-09-01':null,revokedReason:state.revoked?'remote':null}]:[],unread:[],enabled:operation==='subscribe',sent:true}; };
  const client = createParentNotifications({ userId: 'parent', browser, request, onChange: value => states.push(value) });
  return { client, browser, state, calls, states, data,request };
}
test('enrollment requests permission directly on Enable, saves the device under the current account and sends a scoped test', async () => {
  const f = fixture(); await f.client.load(); assert.equal(f.state.permissionCalls, 0);
  const enabling = f.client.enable(); assert.equal(f.state.permissionCalls, 1); await enabling;
  assert.equal(f.state.subscriptions, 1); assert.equal(f.client.state().enabled, true);
  assert.equal(f.calls.at(-1).operation, 'subscribe'); assert.equal(f.calls.at(-1).userId, 'parent');
  await f.client.test(); assert.equal(f.calls.at(-1).operation, 'test'); assert.match(f.client.state().message, /Test accepted/);
});
test('iPhone browser tabs explain Home Screen setup without asking permission; unread counts remain available', async () => {
  const f = fixture({ ios: true, standalone: false }); await f.client.load(); await f.client.enable();
  assert.equal(f.client.state().iosInstall, true); assert.deepEqual(f.calls.map(c=>c.operation),['unread']); assert.equal(f.state.permissionCalls, 0);
});
test('automatic renewal never prompts or polls while hidden, disabled or already renewed today', async () => {
  const off = fixture(); await off.client.renew(); assert.deepEqual(off.calls.map(c=>c.operation),['status']);
  const f = fixture({ permission: 'granted', owner: 'parent' }); f.browser.document.hidden = true; await f.client.renew(); assert.equal(f.calls.length, 0);
  f.browser.document.hidden = false; await f.client.renew(); assert.deepEqual(f.calls.map(c => c.operation), ['status', 'renew']);
  await f.client.renew(); assert.equal(f.calls.length, 2); assert.equal(f.state.permissionCalls, 0);
});
test('switching parent accounts invalidates the old device and does not opt the new account in automatically', async () => {
  const f = fixture({ permission: 'granted', owner: 'old-parent' }); await f.client.renew();
  assert.equal(f.state.unsubscriptions, 1); assert.equal(f.calls.length, 0); assert.equal(f.state.sub, null);
  await f.client.load(); await f.client.enable(); assert.equal(f.calls.at(-1).userId, 'parent');
});
test('turning notifications off invalidates the local endpoint even when the server is unreachable', async () => {
  const f = fixture({ permission: 'granted', owner: 'parent' }); f.state.offline = true;
  await f.client.disable(); assert.equal(f.state.unsubscriptions, 1); assert.equal(f.client.state().enabled, false); assert.equal(f.data.size, 0);
});
function worker() {
  const handlers = new Map(), notifications = [], opened = [], posted = []; let tabs = [];
  const self = { location: { origin: 'https://guard.bodeebooks.com' }, addEventListener: (name, handler) => handlers.set(name, handler),
    navigator:{setAppBadge:async value=>{self.badge=value;},clearAppBadge:async()=>{self.badge=0;}}, registration: { getNotifications:async()=>notifications.map(row=>row[1]),showNotification: async (...args) => {args[1].close=()=>{args[1].closed=true;};notifications.push(args);} }, clients: { matchAll: async () => tabs, openWindow: async url => opened.push(url) } };
  vm.runInNewContext(fs.readFileSync('public/guard-parent-sw.js', 'utf8'), { self, URL, Response });
  return { self,notifications, opened, posted, setTabs: value => { tabs = value; },
    async event(name, data) { let work; handlers.get(name)({ ...data, waitUntil: promise => { work = promise; } }); await work; } };
}
test('push notifications hide message contents and reject notification-provided navigation URLs', async () => {
  const w = worker(); await w.event('push', { data: { json: () => ({ body: 'Private child message', url: 'https://evil.test', studentId: 'bad' }) } });
  const [title, options] = w.notifications[0]; assert.equal(title, 'BodeeGuard'); assert.ok(!JSON.stringify(options).includes('Private child message')); assert.equal(options.data.studentId, '');
  await w.event('notificationclick', { notification: { close() {}, data: { url: 'https://evil.test', studentId: 'bad' } } });
  assert.deepEqual(w.opened, ['/dashboard/#messages']);
});
test('a notification focuses the existing dashboard without reloading drafts, or opens the requested conversation', async () => {
  const w = worker(), id = '11111111-1111-4111-8111-111111111111'; let focused = 0, message;
  w.setTabs([{ url: 'https://foreign.test/dashboard/', focus: () => assert.fail() }, { url: 'https://guard.bodeebooks.com/dashboard/', postMessage: value => { message = value; }, focus: async () => focused++ }]);
  await w.event('notificationclick', { notification: { close() {}, data: { studentId: id } } });
  assert.equal(focused, 1); assert.equal(message.studentId, id); assert.equal(message.type, 'bodeeguard-open-messages'); assert.equal(w.opened.length, 0);
  w.setTabs([]); await w.event('notificationclick', { notification: { close() {}, data: { studentId: id } } });
  assert.equal(w.opened[0], '/dashboard/?conversation='+id+'#messages/' + id);
});

test('lost, blocked and remotely removed registrations show a repair warning without re-enrollment',async()=>{
  for(const reason of ['lost','blocked','revoked']){
    const f=fixture({owner:'parent',permission:'granted'});
    if(reason==='lost')f.state.sub=null;
    if(reason==='blocked')f.browser.Notification.permission='denied';
    if(reason==='revoked')f.state.revoked=true;
    await f.client.load();assert.equal(f.client.state().enabled,false);assert.ok(f.client.state().attention);
    assert.equal(f.state.permissionCalls,0);assert.equal(f.state.subscriptions,0);
    if(reason==='revoked'){assert.equal(f.state.sub,null);assert.match(f.client.state().attention,/remotely/);}
  }
});
test('sign-out does not wait for a nonexistent worker and handles real local versus server failures',async()=>{
  const f=fixture();
  f.browser.navigator.serviceWorker={ready:new Promise(()=>{}),getRegistration:async()=>undefined};
  await stopParentPhoneNotifications({browser:f.browser,userId:'parent',request:f.request});
  const bad=fixture({owner:'parent',permission:'granted'});bad.state.offline=true;bad.state.sub.unsubscribe=async()=>false;
  await assert.rejects(stopParentPhoneNotifications({browser:bad.browser,userId:'parent',request:bad.request}),/Could not stop/);
  bad.state.offline=false;await stopParentPhoneNotifications({browser:bad.browser,userId:'parent',request:bad.request});
  assert.equal(bad.calls.at(-1).operation,'unsubscribe');
});
test('reading an alert preserves newer messages and siblings; only trusted parent pages can clear',async()=>{
  const w=worker(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  for(const [studentId,sequence]of [[a,'1'],[a,'3'],[b,'2']])await w.event('push',{data:{json:()=>({studentId,sequence,unread:3,totalUnread:4})}});
  assert.notEqual(w.notifications[0][1].tag,w.notifications[2][1].tag);assert.equal(w.self.badge,4);
  const data={type:'bodeeguard-conversation-read',studentId:a,throughSequence:'1',totalUnread:2};
  await w.event('message',{source:{url:'https://evil.test/dashboard/'},data});assert.ok(w.notifications.every(row=>!row[1].closed));
  await w.event('message',{source:{url:'https://guard.bodeebooks.com/dashboard/'},data});
  assert.equal(w.notifications[0][1].closed,true);assert.ok(!w.notifications[1][1].closed&&!w.notifications[2][1].closed);assert.equal(w.self.badge,2);
  await w.event('message',{source:{url:'https://guard.bodeebooks.com/account/'},data:{type:'bodeeguard-notifications-stop'}});
  assert.ok(w.notifications.every(row=>row[1].closed));assert.equal(w.self.badge,0);
});
test('subscription changes ask the visible parent app to repair without background API calls',async()=>{
  const w=worker();let message;w.setTabs([{url:'https://guard.bodeebooks.com/dashboard/',postMessage:value=>message=value}]);
  await w.event('pushsubscriptionchange',{});assert.equal(message.type,'bodeeguard-notifications-attention');
});

test('an unavailable service worker leaves usable settings and an explicit error, never a stuck loading state',async()=>{
  const f=fixture({owner:'parent',permission:'granted'});
  f.browser.navigator.serviceWorker.ready=Promise.reject(Error('Worker unavailable'));
  await f.client.load();assert.equal(f.client.state().busy,false);assert.match(f.client.state().message,/unavailable/);assert.ok(f.client.state().attention);
});
