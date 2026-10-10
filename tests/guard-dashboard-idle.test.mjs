import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { createCloudPushClient } = createRequire(import.meta.url)('../public/guard-admin/cloud-push-client.js');
const { createConnectionRefresh } = await import('data:text/javascript;base64,' + fs.readFileSync('public/guard-admin/cloud-connection-refresh.js').toString('base64'));
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture(refresh) {
  const doc = new EventTarget(), win = new EventTarget(), host = new EventTarget();
  doc.documentElement = { dataset: {} }; host.document = new EventTarget(); host.document.documentElement = { dataset: {} };
  doc.hidden = false; doc.defaultView = win; win.parent = host;
  let now = 0, key = 0;
  const timers = new Map(), requests = [], errors = [];
  const clock = {
    now: () => now,
    setTimer(fn, ms) { const id = ++key; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimer(id) { timers.delete(id); },
  };
  const poll = createConnectionRefresh({ document: doc, ...clock,
    refresh: signal => { requests.push({ at: now, signal }); return refresh?.(signal); },
    onError: error => errors.push(error),
  });
  async function advance(ms) {
    await flush(); const end = now + ms;
    for (;;) {
      const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
    }
    now = end; await flush();
  }
  async function interact(type = 'pointermove', target = doc) { target.dispatchEvent(new Event(type)); await flush(); }
  return { doc, win, host, poll, timers, requests, errors, clock, advance, interact };
}

test('active use checks every 30 seconds without fetching on each input event', async () => {
  const f = fixture(); f.poll.start(); f.poll.start();
  for (let n = 0; n < 20; n++) { await f.advance(30000); await f.interact('keydown'); }
  assert.equal(f.requests.length, 20);
  for (let n = 0; n < 100; n++) await f.interact();
  assert.equal(f.requests.length, 20); assert.equal(f.timers.size, 2); f.poll.stop();
});

test('after three minutes idle, an overnight dashboard makes no connection checks', async () => {
  const f = fixture(); f.poll.start(); await f.advance(180000);
  assert.deepEqual(f.requests.map(item => item.at), [30000, 60000, 90000, 120000, 150000]);
  assert.equal(f.doc.documentElement.dataset.parentIdle, 'true');
  assert.equal(f.host.document.documentElement.dataset.parentIdle, 'true');
  assert.equal(f.timers.size, 0);
  await f.advance(12 * 3600000); assert.equal(f.requests.length, 5); assert.equal(f.timers.size, 0);
  await f.interact(); assert.equal(f.requests.length, 6);
  assert.equal(f.doc.documentElement.dataset.parentIdle, 'false');
  assert.equal(f.host.document.documentElement.dataset.parentIdle, 'false'); f.poll.stop();
});

test('mouse, keyboard, scrolling and touch each wake an idle dashboard immediately', async () => {
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) {
    const f = fixture(); f.poll.start(); await f.advance(180000);
    await f.interact(type); assert.equal(f.requests.at(-1).at, 180000);
    const count = f.requests.length; await f.advance(29999); assert.equal(f.requests.length, count);
    await f.advance(1); assert.equal(f.requests.length, count + 1); f.poll.stop();
  }
});

test('PWA header activity and refocusing the outer window also resume checks', async () => {
  for (const [type, where] of [['pointerdown', 'header'], ['focus', 'host'], ['focus', 'window']]) {
    const f = fixture(); f.poll.start(); await f.advance(180000);
    await f.interact(type, where === 'header' ? f.host.document : where === 'host' ? f.host : f.win);
    assert.equal(f.requests.at(-1).at, 180000); f.poll.stop();
  }
});

test('continued interaction postpones idling rather than using time since page load', async () => {
  const f = fixture(); f.poll.start(); await f.advance(120000); await f.interact();
  await f.advance(179999); assert.equal(f.requests.at(-1).at, 270000);
  await f.advance(1); assert.equal(f.requests.at(-1).at, 270000);
  await f.advance(270000); assert.equal(f.requests.at(-1).at, 270000); assert.equal(f.timers.size, 0); f.poll.stop();
});

test('a return while a check is in flight coalesces and resumes normal cadence', async () => {
  const work = deferred(); const f = fixture(() => work.promise);
  f.poll.start(); await f.advance(180000); assert.equal(f.requests.length, 1);
  await f.interact(); await f.interact('keydown'); assert.equal(f.requests.length, 1);
  work.resolve(); await flush(); await f.advance(30000); assert.equal(f.requests.length, 2); f.poll.stop();
});

test('hidden/stopped pages cancel work, detach activity handlers and ignore stale responses', async () => {
  const work = deferred(); const f = fixture(() => work.promise);
  f.poll.start(); await f.advance(30000); f.doc.hidden = true; f.poll.stop();
  assert.equal(f.requests[0].signal.aborted, true); f.poll.start();
  await f.advance(12 * 3600000); await f.interact('focus', f.host);
  assert.equal(f.requests.length, 1); assert.equal(f.timers.size, 0);
  f.doc.hidden = false; f.poll.start(); work.resolve(); await flush();
  assert.equal(f.timers.size, 2); await f.advance(30000); assert.equal(f.requests.length, 2);
  f.poll.stop(); await f.advance(180000); await f.interact(); await f.interact('focus', f.host);
  assert.equal(f.requests.length, 2); assert.equal(f.timers.size, 0);
});

test('failed checks back off while active and never retry overnight while idle', async () => {
  const f = fixture(() => { throw Error('offline'); }); f.poll.start();
  await f.advance(90000); assert.deepEqual(f.requests.map(item => item.at), [30000, 90000]);
  await f.advance(12 * 3600000); assert.equal(f.requests.length, 2); assert.equal(f.timers.size, 0);
  await f.interact(); assert.equal(f.requests.length, 3);
  await f.advance(120000); assert.equal(f.requests.length, 4);
  assert.equal(f.errors.length, 4); f.poll.stop();
});

test('a cross-origin embed can still track local input without accessing its parent', async () => {
  const f = fixture(); Object.defineProperty(f.win, 'parent', { get() { throw Error('cross-origin'); } });
  f.poll.start(); await f.advance(180000); await f.interact('keydown');
  assert.equal(f.requests.at(-1).at, 180000); f.poll.stop();
});

test('idle connection checks leave live message delivery connected', async () => {
  const f = fixture(), sockets = [], messages = [];
  class Socket {
    constructor() { sockets.push(this); queueMicrotask(() => this.onopen?.()); }
    send() { this.onmessage?.({ data: 'pong' }); }
    close() { this.closed = true; }
  }
  const push = createCloudPushClient({ getIdentity: () => 'parent', ...f.clock, WebSocketImpl: Socket,
    getTicket: async () => ({ url: 'wss://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/push/connect?ticket=test' }),
    onSignal: hint => messages.push(hint),
  });
  f.poll.start(); push.start(); await f.advance(10 * 60000);
  assert.equal(push.isConnected(), true); assert.equal(sockets.length, 1); assert.equal(sockets[0].closed, undefined);
  sockets[0].onmessage({ data: JSON.stringify({ kind: 'messages', studentId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }) });
  assert.equal(messages.length, 1); assert.equal(f.requests.length, 5, 'message delivery does not restart idle connection polling'); await f.interact(); assert.equal(push.isConnected(), true);
  f.poll.stop(); push.stop(); assert.equal(f.timers.size, 0);
});


test('an idle chat releases the reading lease once and resumes it only on parent activity', async () => {
  const { createConversationPresence } = await import('data:text/javascript;base64,' + fs.readFileSync('app/guard/dashboard/conversation-presence.js').toString('base64'));
  const f = fixture(), leases = [];
  const presence = createConversationPresence({
    browser: { crypto: { randomUUID: () => 'synthetic-window' }, setTimeout: f.clock.setTimer, clearTimeout: f.clock.clearTimer },
    isVisible: () => f.host.document.documentElement.dataset.parentIdle !== 'true',
    send: async studentId => { leases.push(studentId); return true; },
  });
  f.host.document.addEventListener('bodeeguard-parent-activity', presence.refresh);
  f.poll.start(); presence.set('synthetic-child'); await f.advance(180000);
  assert.equal(leases.at(-1), null); const count = leases.length;
  await f.advance(12 * 3600000); assert.equal(leases.length, count); assert.equal(f.timers.size, 0);
  await f.interact(); assert.equal(leases.at(-1), 'synthetic-child');
  f.host.document.removeEventListener('bodeeguard-parent-activity', presence.refresh);
  presence.dispose(); f.poll.stop(); await flush(); assert.equal(f.timers.size, 0);
});
