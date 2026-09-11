import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { createDashboardRefresh } = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync('public/guard-admin/cloud-dashboard-refresh.js')).toString('base64'));
const { createCloudPushClient } = createRequire(import.meta.url)('../public/guard-admin/cloud-push-client.js');
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function fixture({ hidden = false, snapshot, computers } = {}) {
  const doc = new EventTarget(), win = new EventTarget(); doc.hidden = hidden;
  const requests = [], errors = [], busy = [], connection = [];
  let now = 0, id = 0;
  const timers = new Map();
  const clock = {
    setTimer(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key; },
    clearTimer(key) { timers.delete(key); },
  };
  const dashboard = createDashboardRefresh({ document: doc, window: win, ...clock,
    requestComputers: async signal => { requests.push({ kind: 'computers', signal }); await computers?.(signal); },
    refreshSnapshot: async signal => { requests.push({ kind: 'snapshot', signal }); await snapshot?.(signal); },
    onError: error => errors.push(error), onBusy: value => busy.push(value),
    onResume: () => connection.push('open'), onSuspend: () => connection.push('close'),
  });
  async function advance(ms) {
    await flush(); const end = now + ms;
    while (true) {
      const entry = [...timers].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      now = entry[1].at; timers.delete(entry[0]); entry[1].fn(); await flush();
    }
    now = end; await flush();
  }
  async function visibility(value) { doc.hidden = value; doc.dispatchEvent(new Event('visibilitychange')); await flush(); }
  async function page(type, persisted = false) { const event = new Event(type); event.persisted = persisted; win.dispatchEvent(event); await flush(); }
  return { dashboard, requests, errors, busy, connection, advance, visibility, page, timers, clock };
}

test('opening a background tab does no work; revealing it requests fresh computer stats immediately', async () => {
  const f = fixture({ hidden: true }); f.dashboard.start();
  await f.advance(12 * 3600000);
  await f.dashboard.refreshComputers(); await f.dashboard.refresh();
  await f.page('online');
  assert.equal(f.requests.length, 0);
  assert.deepEqual(f.connection, ['close']);
  await f.visibility(false);
  assert.deepEqual(f.requests.map(x => x.kind), ['computers']);
  await f.advance(1800);
  assert.deepEqual(f.requests.map(x => x.kind), ['computers', 'snapshot']);
  f.dashboard.stop();
});

test('a visible dashboard refreshes every 30 minutes and manual refreshes coalesce', async () => {
  const f = fixture(); f.dashboard.start(); await f.advance(1800);
  await f.advance(1800000 - 1); assert.equal(f.requests.length, 2);
  await f.advance(1); assert.equal(f.requests.at(-1).kind, 'computers');
  await f.advance(1800); assert.equal(f.requests.length, 4);
  const first = f.dashboard.refreshComputers(), second = f.dashboard.refreshComputers();
  assert.equal(first, second);
  await f.advance(1800); await first;
  assert.equal(f.requests.length, 6);
  assert.equal(f.errors.length, 0);
  f.dashboard.stop();
});

test('hiding cancels the delayed stats read and leaves no periodic work overnight', async () => {
  const f = fixture(); f.dashboard.start(); await flush();
  assert.equal(f.requests.length, 1);
  await f.visibility(true);
  assert.equal(f.requests[0].signal.aborted, true);
  await f.advance(12 * 3600000);
  assert.equal(f.requests.length, 1); assert.equal(f.timers.size, 0);
  await f.visibility(false); assert.equal(f.requests.length, 2);
  await f.advance(1800); assert.equal(f.requests.length, 3);
  f.dashboard.stop();
});

test('an old response cannot schedule a timer or cancel the new run after rapid hide/reopen', async () => {
  const old = deferred(); let reads = 0;
  const f = fixture({ snapshot: () => ++reads === 1 ? old.promise : undefined });
  f.dashboard.start(); await f.advance(1800);
  const previousSignal = f.requests.at(-1).signal;
  await f.visibility(true); await f.visibility(false);
  assert.equal(previousSignal.aborted, true);
  old.resolve(); await flush();
  await f.advance(1800);
  assert.equal(f.requests.length, 4); assert.equal(f.timers.size, 1);
  assert.equal(f.errors.length, 0); assert.equal(f.busy.at(-1), false);
  f.dashboard.stop();
});

test('navigation away suppresses work even before document.hidden changes; back navigation refreshes', async () => {
  const f = fixture(); f.dashboard.start(); await f.advance(1800);
  await f.page('pagehide'); await f.advance(3600000);
  await f.dashboard.refreshComputers(); await f.page('online');
  assert.equal(f.requests.length, 2); assert.equal(f.timers.size, 0);
  await f.page('pageshow', true); assert.equal(f.requests.at(-1).kind, 'computers');
  await f.advance(1800); assert.equal(f.requests.length, 4);
  f.dashboard.stop(); await f.visibility(false); await f.page('online');
  assert.equal(f.requests.length, 4);
});

test('failed child refresh still shows stored stats; failed snapshots back off only while visible', async () => {
  let fail = true;
  const f = fixture({ computers: () => { throw Error('child unavailable'); }, snapshot: () => { if (fail) throw Error('offline'); } });
  f.dashboard.start(); await flush();
  assert.deepEqual(f.requests.map(x => x.kind), ['computers', 'snapshot']);
  assert.equal(f.errors.length, 1);
  await f.advance(119999); assert.equal(f.requests.length, 2);
  fail = false; await f.advance(1); assert.equal(f.requests.length, 3);
  await f.visibility(true); await f.advance(3600000); assert.equal(f.requests.length, 3);
  f.dashboard.stop();
});

test('parent push socket closes when hidden; there are no pings or ticket requests until return', async () => {
  const f = fixture(); let tickets = 0; const sockets = [];
  class Socket {
    constructor() { sockets.push(this); this.sent = []; }
    send(value) { this.sent.push(value); }
    close() { this.closed = true; this.onclose?.(); }
  }
  const push = createCloudPushClient({ getIdentity: () => f.dashboard.isVisible() ? 'parent' : null,
    getTicket: async () => { tickets++; return { url: 'wss://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/push/connect?ticket=synthetic' }; },
    onSignal() {}, WebSocketImpl: Socket, ...f.clock,
  });
  f.dashboard.start(); push.start(); await flush(); sockets[0].onopen();
  await f.advance(30000); assert.deepEqual(sockets[0].sent, ['ping']);
  await f.visibility(true); push.stop();
  assert.equal(sockets[0].closed, true);
  await f.advance(12 * 3600000);
  assert.equal(tickets, 1); assert.deepEqual(sockets[0].sent, ['ping']);
  await f.visibility(false); push.start(); await flush();
  assert.equal(tickets, 2); assert.equal(sockets.length, 2);
  push.stop(); f.dashboard.stop();
});

test('a screenshot response received after hiding cannot trigger thumbnail downloads', async () => {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  const doc = new EventTarget(), win = new EventTarget(); doc.hidden = false;
  const root = { textContent: '', setAttribute() {} }; doc.getElementById = () => root;
  const response = deferred(); const requests = [];
  globalThis.document = doc; globalThis.window = win;
  globalThis.fetch = async (url, init) => { requests.push(init); await response.promise; return { ok: true, json: async () => ({ screenshots: [{ id: 'synthetic', student_id: 'child', has_image: true }] }) }; };
  try {
    const profileUrl = 'data:text/javascript;base64,' + Buffer.from(fs.readFileSync('public/guard-admin/cloud-student-profile.js')).toString('base64');
    const source = fs.readFileSync('public/guard-admin/cloud-screenshots.js', 'utf8').replace('./cloud-student-profile.js?v=20260910-photos1', profileUrl);
    const { setupCloudScreenshots } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const gallery = setupCloudScreenshots({ endpoint: '/synthetic' });
    gallery.update({ students: [{ id: 'child', name: 'Test Child' }] });
    gallery.setActive(true); await flush();
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    assert.equal(requests[0].signal.aborted, true);
    response.resolve(); await flush(); gallery.refresh(); await flush();
    assert.equal(requests.length, 1);
    assert.equal(JSON.parse(requests[0].body).action, 'screenshots-overview');
  } finally { Object.assign(globalThis, previous); }
});
