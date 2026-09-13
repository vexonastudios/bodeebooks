import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { parentVersion, writeParentVersion } from '../scripts/build-guard-parent-version.mjs';

const { createParentUpdates } = await import('data:text/javascript;base64,' + fs.readFileSync('public/guard-admin/cloud-app-updates.js').toString('base64'));
const a = 'a'.repeat(64), b = 'b'.repeat(64), c = 'c'.repeat(64);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture({ version = a, latest = a, storage = new Map(), framed = false, hidden = false } = {}) {
  const doc = new EventTarget(), win = new EventTarget(); doc.hidden = hidden;
  win.parent = framed ? {} : win; win.navigator = { onLine: true };
  win.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  const state = { time: 1000000, calls: [], ready: [], reloads: 0, confirms: 0, accept: false, latest, busy: false };
  win.confirm = () => { state.confirms++; return state.accept; };
  const controller = createParentUpdates({
    version, document: doc, window: win, now: () => state.time,
    fetch: async (url, options) => { state.calls.push({ url, options }); return state.fetch ? state.fetch(options) : new Response(JSON.stringify({ version: state.latest })); },
    reload: () => state.reloads++, onReady: value => state.ready.push(value), canReload: () => !state.busy,
  });
  controller.start();
  return { controller, doc, win, state, storage, advance: () => { state.time += 61000; } };
}

test('visible launch and existing refresh events check tiny static metadata, with no API, credentials or new poll loop', async () => {
  const f = fixture(); await f.controller.check();
  assert.equal(f.state.reloads, 0); assert.equal(f.state.calls.length, 1);
  const { url, options } = f.state.calls[0]; assert.equal(url, '/guard-parent-version.json');
  assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error');
  f.state.latest = b; f.advance(); f.win.dispatchEvent(new Event('bodeeguard-check-update')); await f.controller.check();
  assert.equal(f.state.reloads, 1); assert.equal(f.state.calls.length, 2); f.controller.stop();
});

test('drafts, uploads, recordings and quick actions suppress automatic reload from the first interaction', async () => {
  for (const name of ['pointerdown', 'keydown', 'input', 'change', 'submit', 'paste', 'drop', 'click']) {
    const f = fixture(); await f.controller.check();
    f.doc.dispatchEvent(new Event(name)); f.state.latest = b; f.advance(); await f.controller.check();
    assert.equal(f.state.reloads, 0, name); assert.equal(f.state.ready.at(-1), b);
    assert.equal(f.controller.apply(), false); assert.equal(f.state.confirms, 1);
    f.state.accept = true; assert.equal(f.controller.apply(), true); f.controller.stop();
  }
});

test('open modal/media prevents automatic reload; matching metadata hides a withdrawn update', async () => {
  const f = fixture(); await f.controller.check(); f.state.busy = true;
  f.state.latest = b; f.advance(); await f.controller.check(); assert.equal(f.state.reloads, 0); assert.equal(f.state.ready.at(-1), b);
  f.state.latest = a; f.advance(); await f.controller.check(); assert.equal(f.state.ready.at(-1), null); f.controller.stop();
});

test('background launch, hide, back/forward restore and online lifecycle do no hidden checks', async () => {
  const f = fixture({ hidden: true }); await flush(); assert.equal(f.state.calls.length, 0);
  f.win.dispatchEvent(new Event('online')); await flush(); assert.equal(f.state.calls.length, 0);
  f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange')); await f.controller.check(); assert.equal(f.state.calls.length, 1);
  f.win.dispatchEvent(new Event('pagehide')); f.advance(); await f.controller.check(); assert.equal(f.state.calls.length, 1);
  f.win.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true })); await f.controller.check(); assert.equal(f.state.calls.length, 2);
  f.doc.hidden = true; f.advance(); f.doc.dispatchEvent(new Event('visibilitychange')); f.win.dispatchEvent(new Event('bodeeguard-check-update'));
  await flush(); assert.equal(f.state.calls.length, 2); f.controller.stop();
});

test('repeated resumes and simultaneous checks coalesce, aborting a hidden request prevents stale reload', async () => {
  const f = fixture(); await f.controller.check(); let resolve;
  f.state.fetch = () => new Promise(done => { resolve = done; }); f.advance();
  const pending = f.controller.check(); await flush();
  assert.equal(f.controller.check(), pending); assert.equal(f.state.calls.length, 2);
  f.doc.hidden = true; f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.state.calls.at(-1).options.signal.aborted, true);
  resolve(new Response(JSON.stringify({ version: b }))); await pending; assert.equal(f.state.reloads, 0);
  delete f.state.fetch; f.doc.hidden = false; f.doc.dispatchEvent(new Event('visibilitychange')); await f.controller.check();
  assert.equal(f.state.calls.length, 3); await f.controller.check(); assert.equal(f.state.calls.length, 3); f.controller.stop();
});

test('offline and malformed metadata never reload or disable the working dashboard', async () => {
  const f = fixture(); await f.controller.check();
  for (const response of [new Response('bad JSON'), new Response('{"version":"untrusted"}'), new Response('unavailable', { status: 503 }), new Response('x'.repeat(500))]) {
    f.state.fetch = async () => response; f.advance(); await f.controller.check(); assert.equal(f.state.reloads, 0);
  }
  f.state.fetch = async () => { throw Error('offline'); }; f.advance(); await f.controller.check();
  f.win.navigator.onLine = false; f.advance(); const count = f.state.calls.length; await f.controller.check();
  assert.equal(f.state.calls.length, count); assert.equal(f.state.reloads, 0); f.controller.stop();
});

test('same deployment and rapid version changes cannot cause a reload loop; blocked storage requires a click', async () => {
  const first = fixture({ latest: b }); await first.controller.check(); assert.equal(first.state.reloads, 1); first.controller.stop();
  for (const latest of [b, c]) {
    const f = fixture({ latest, storage: first.storage }); await f.controller.check();
    assert.equal(f.state.reloads, 0); assert.equal(f.state.ready.at(-1), latest); assert.equal(f.controller.apply(), true); f.controller.stop();
  }
  const f = fixture(); await f.controller.check(); f.win.sessionStorage.setItem = () => { throw Error('blocked'); };
  f.state.latest = b; f.advance(); await f.controller.check(); assert.equal(f.state.reloads, 0); assert.equal(f.state.ready.at(-1), b); f.controller.stop();
});

test('outer PWA version is checked too, and an unavailable old wrapper cannot cause an automatic reload', async () => {
  const f = fixture({ framed: true }); await f.controller.check();
  f.controller.setShellVersion(b); assert.equal(f.state.reloads, 1, 'new iframe in an old wrapper still refreshes the whole app');
  f.controller.defer(); assert.equal(f.state.ready.at(-1), a); f.controller.stop();
  const old = fixture({ framed: true, latest: b }); await old.controller.check(); assert.equal(old.state.reloads, 0); assert.equal(old.state.ready.at(-1), b);
  old.controller.setShellVersion('bad'); assert.equal(old.state.reloads, 0); old.controller.stop();
});

test('build metadata changes with shipped imports/styles/wrapper but not generated output, docs or secrets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-parent-version-'));
  try {
    for (const dir of ['public/guard-admin', 'app/guard', 'docs']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/guard-admin/module.js'), 'hello\r\n');
    const before = writeParentVersion(root); assert.deepEqual(writeParentVersion(root), before);
    fs.writeFileSync(path.join(root, 'public/guard-admin/module.js'), 'hello\n'); assert.deepEqual(parentVersion(root), before);
    fs.writeFileSync(path.join(root, 'docs/receipt.md'), 'notes'); fs.writeFileSync(path.join(root, '.env.production.local'), 'synthetic secret');
    assert.deepEqual(parentVersion(root), before);
    for (const file of ['public/guard-admin/module.js', 'public/guard-admin/style.css', 'app/guard/ParentPwa.tsx', 'public/guard-parent-sw.js']) {
      const previous = parentVersion(root); fs.appendFileSync(path.join(root, file), 'change'); assert.notDeepEqual(parentVersion(root), previous);
    }
    const latest = writeParentVersion(root);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'public/guard-parent-version.json'))), latest);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'app/guard/dashboard/generated/parent-version.json'))), latest);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('only the authenticated same-origin workspace can request outer reloads/worker updates', async () => {
  const win = new EventTarget(), sw = new EventTarget(), effects = []; let reloads = 0, updates = 0;
  const frame = { postMessage(message) { frame.message = message; } };
  const doc = { hidden: false, querySelector: () => ({ contentWindow: frame }) };
  sw.register = async (url, options) => { assert.equal(url, '/guard-parent-sw.js'); assert.equal(options.updateViaCache, 'none'); return { update: async () => updates++ }; };
  win.location = { reload: () => reloads++ };
  const context = { exports: {}, window: win, document: doc, location: { hostname: 'guard.bodeebooks.com', origin: 'https://guard.bodeebooks.com' },
    navigator: { serviceWorker: sw, userAgent: 'fixture' }, matchMedia: () => ({ matches: false }),
    require: name => name === 'react' ? { useRef: () => ({ current: null }), useState: () => [false, () => {}], useEffect: fn => effects.push(fn) }
      : name.includes('parent-version') ? { version: a } : {},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/guard/dashboard/ParentPwa.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  context.exports.default(); const cleanups = effects.map(fn => fn());
  const send = (type, source = frame, origin = context.location.origin) => win.dispatchEvent(Object.assign(new Event('message'), { data: { type }, source, origin }));
  send('bodeeguard-reload-app', {}); send('bodeeguard-reload-app', frame, 'https://foreign.example'); assert.equal(reloads, 0);
  send('bodeeguard-check-worker'); send('bodeeguard-check-worker'); await flush();
  assert.equal(updates, 1); assert.equal(frame.message.version, a);
  doc.hidden = true; send('bodeeguard-reload-app'); send('bodeeguard-check-worker'); await flush(); assert.equal(reloads, 0); assert.equal(updates, 1);
  doc.hidden = false; send('bodeeguard-reload-app'); assert.equal(reloads, 1);
  sw.dispatchEvent(new Event('controllerchange')); assert.equal(frame.message.type, 'bodeeguard-check-update');
  for (const cleanup of cleanups) cleanup?.();
});
