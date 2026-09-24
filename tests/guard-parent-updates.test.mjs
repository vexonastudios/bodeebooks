import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

function load(file, mocks = {}) {
  const filename = path.resolve(file), localRequire = createRequire(filename), mod = new Module(filename);
  mod.filename = filename; mod.require = name => mocks[name] || localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename);
  return mod.exports;
}
const releaseModule = () => load('app/guard/dashboard/parentRelease.ts');
const settle = async () => { for (let n = 0; n < 30; n++) await Promise.resolve(); };
function globals(values) {
  const old = Object.fromEntries(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  return () => { for (const [key, value] of Object.entries(old)) if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; };
}
function browser(fetch) {
  const document = new EventTarget(), window = new EventTarget(), navigator = { onLine: true }, timers = new Map();
  document.hidden = false; let timer = 0;
  const restore = globals({ document, window, navigator, fetch,
    setTimeout: (fn, delay) => { timers.set(++timer, { fn, delay }); return timer; }, clearTimeout: id => timers.delete(id) });
  return { document, window, navigator, timers, restore };
}

test('release identity is public metadata only and explicitly uncached', async () => {
  const old = process.env.NEXT_PUBLIC_GUARD_RELEASE;
  try {
    process.env.NEXT_PUBLIC_GUARD_RELEASE = 'dpl_synthetic';
    const response = load('app/guard/dashboard/release/route.ts').GET();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { release: 'dpl_synthetic' });
  } finally { if (old === undefined) delete process.env.NEXT_PUBLIC_GUARD_RELEASE; else process.env.NEXT_PUBLIC_GUARD_RELEASE = old; }
});

test('first check compares with the loaded build, detects rollback, and clears a withdrawn update', async () => {
  let release = 'dpl_new'; const changes = [];
  const b = browser(async (url, options) => {
    assert.equal(url, '/guard/dashboard/release/'); assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    return Response.json({ release });
  });
  let stop;
  try {
    stop = releaseModule().watchParentRelease('dpl_loaded', value => changes.push(value));
    await settle(); assert.deepEqual(changes, ['dpl_new']);
    assert.equal([...b.timers.values()][0].delay, 300000);
    release = 'dpl_older'; b.window.dispatchEvent(new Event('online')); await settle();
    release = 'dpl_loaded'; b.window.dispatchEvent(new Event('online')); await settle();
    assert.deepEqual(changes, ['dpl_new', 'dpl_older', '']);
    assert.equal(b.timers.size, 1);
  } finally { stop?.(); b.restore(); }
});

test('checks pause while hidden/offline, resume on return, coalesce events, and clean up', async () => {
  let calls = 0, resolve, signal; const changes = [];
  const b = browser((_url, options) => { calls++; signal = options.signal; return new Promise(done => { resolve = done; }); });
  b.document.hidden = true; let stop;
  try {
    stop = releaseModule().watchParentRelease('loaded', value => changes.push(value));
    assert.equal(calls, 0); assert.equal(b.timers.size, 0);
    b.document.hidden = false; b.navigator.onLine = false; b.document.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 0);
    b.navigator.onLine = true; b.window.dispatchEvent(new Event('online')); b.window.dispatchEvent(new Event('focus')); b.window.dispatchEvent(new Event('online'));
    assert.equal(calls, 1);
    resolve(Response.json({ release: 'new' })); await settle();
    assert.deepEqual(changes, ['new']); assert.equal(b.timers.size, 1);
    b.document.hidden = true; b.document.dispatchEvent(new Event('visibilitychange')); assert.equal(b.timers.size, 0);
    b.document.hidden = false; b.document.dispatchEvent(new Event('visibilitychange')); assert.equal(calls, 2);
    stop(); assert.equal(signal.aborted, true);
    resolve(Response.json({ release: 'another' })); await settle();
    b.window.dispatchEvent(new Event('online')); assert.equal(calls, 2); assert.equal(b.timers.size, 0);
    assert.deepEqual(changes, ['new']);
  } finally { stop?.(); b.restore(); }
});

test('offline, unauthorized and malformed release responses never produce an update', async () => {
  for (const fetch of [async () => { throw Error('offline'); }, async () => new Response('Sign in', { status: 401 }), async () => Response.json({}), async () => Response.json({ release: '<html>' })]) {
    const b = browser(fetch); const changes = []; let stop;
    try {
      stop = releaseModule().watchParentRelease('loaded', value => changes.push(value)); await settle();
      assert.deepEqual(changes, []); assert.equal(b.timers.size, 1);
    } finally { stop?.(); b.restore(); }
  }
});

function updateUi(fetchParentRelease, confirm) {
  let reloads = 0, state = 0; const updates = [];
  const restore = globals({ window: { confirm, location: { reload: () => { reloads++; } } } });
  const Component = load('app/guard/dashboard/ParentUpdate.tsx', {
    react: { useEffect() {}, useRef: value => ({ current: value }), useState: () => [['new', false, ''][state++], value => updates.push(value)] },
    './parentRelease': { fetchParentRelease, watchParentRelease() {} },
    './workspace.module.css': { default: {} }
  }).default;
  return { button: Component().props.children[2], updates, restore, reloads: () => reloads };
}

test('Update waits for explicit confirmation; cancel keeps drafts and does not reload', async () => {
  let requests = 0;
  const ui = updateUi(async () => { requests++; }, message => { assert.match(message, /unsaved edits will be lost/); return false; });
  try { ui.button.props.onClick(); await settle(); assert.equal(requests, 0); assert.equal(ui.reloads(), 0); } finally { ui.restore(); }
});

test('confirmed Update checks connectivity, prevents double clicks, and performs a full reload', async () => {
  let resolve, requests = 0;
  const ui = updateUi(() => { requests++; return new Promise(done => { resolve = done; }); }, () => true);
  try {
    ui.button.props.onClick(); ui.button.props.onClick(); assert.equal(requests, 1); assert.equal(ui.reloads(), 0);
    resolve('new'); await settle(); assert.equal(ui.reloads(), 1);
  } finally { ui.restore(); }
});

test('failed Update leaves the dashboard open with an actionable reconnect message', async () => {
  const ui = updateUi(async () => { throw Error('offline'); }, () => true);
  try { ui.button.props.onClick(); await settle(); assert.equal(ui.reloads(), 0); assert.ok(ui.updates.some(value => /Reconnect and try Update/.test(value))); } finally { ui.restore(); }
});

test('mutable dashboard assets revalidate while versioned games remain immutable', async () => {
  const headers = await load('next.config.ts').default.headers();
  const value = source => headers.find(row => row.source === source).headers.find(header => header.key === 'Cache-Control').value;
  assert.equal(value('/guard-admin/:path*'), 'public, max-age=0, must-revalidate');
  assert.equal(value('/guard-parent.webmanifest'), 'public, max-age=0, must-revalidate');
  assert.match(value('/guard-admin/family-games/v1/:file*'), /immutable/);
  assert.ok(headers.findIndex(row => row.source === '/guard-admin/family-games/v1/:file*') > headers.findIndex(row => row.source === '/guard-admin/:path*'));
});
