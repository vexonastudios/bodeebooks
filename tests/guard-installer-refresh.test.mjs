import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';

function load(file, overrides = {}) {
  const filename = path.resolve(file), native = createRequire(filename), mod = new Module(filename);
  mod.require = name => overrides[name] || native(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, filename);
  return mod.exports;
}
const hint = load('shared/guard-installer-release-hint.ts');
const recovery = load('shared/guard-update-recovery.ts');
const { watchInstallerRelease } = load('app/guard/account/release-refresh.ts');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function bundle(channel = 'stable', version = '1.2.344', overrides = {}) {
  return JSON.stringify({ schemaVersion: 3, signature: 'fixture-hint-only-not-a-signature', payload: Buffer.from(JSON.stringify({
    purpose: channel === 'family-beta' ? 'bodeeguard-cloud-child-test-update' : 'bodeeguard-cloud-child-update',
    channel: channel === 'family-beta' ? 'beta' : channel, version,
    product: 'com.vexonastudios.bodeeguard.cloudchild', platform: 'win32', arch: 'x64', ...overrides
  })).toString('base64') });
}
function fixture({ hidden = false, version = '1.2.343', channel = 'stable', request } = {}) {
  const win = new EventTarget(), doc = new EventTarget(); doc.hidden = hidden;
  let now = 0, sequence = 0, refreshed = 0, current = version;
  const timers = new Map(), calls = [];
  win.setTimeout = (fn, delay) => { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; };
  win.clearTimeout = id => timers.delete(id);
  const start = () => watchInstallerRelease({ window: win, document: doc, channel, version: current, now: () => now,
    onChange: () => refreshed++, fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (request) return request(url, init);
      return Response.json({ channel, version: '1.2.344' });
    }
  });
  let stop = start();
  return { calls, timers, get refreshed() { return refreshed; },
    async advance(ms) {
      await flush(); const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = end; await flush();
    },
    async event(type) { win.dispatchEvent(new Event(type)); await flush(); },
    async visibility(value) { doc.hidden = value; doc.dispatchEvent(new Event('visibilitychange')); await flush(); },
    async rerender(version) { stop(); current = version; stop = start(); await flush(); },
    stop() { stop(); }
  };
}

test('an already-open old account refreshes to the new release; matching versions do not reload', async () => {
  const f = fixture(); await flush();
  assert.equal(f.refreshed, 1);
  assert.equal(f.calls[0].url, '/guard/download/release/?channel=stable');
  assert.equal(f.calls[0].init.cache, 'no-store');
  assert.equal(f.calls[0].init.credentials, 'omit');
  await f.rerender('1.2.344'); await f.advance(600000);
  assert.equal(f.refreshed, 1);
  assert.ok(f.calls.every(call => !call.url.includes('/account')));
  f.stop(); assert.equal(f.timers.size, 0);
});

test('a release published while the page is open is discovered without reloading unchanged accounts', async () => {
  let version = '1.2.343';
  const f = fixture({ request: () => Response.json({ channel: 'stable', version }) });
  await flush(); assert.equal(f.refreshed, 0);
  version = '1.2.344'; await f.advance(60000); assert.equal(f.refreshed, 1);
  // The verified account catalog may briefly retain its preceding one-minute entry.
  await f.advance(60000); assert.equal(f.refreshed, 2);
  await f.rerender(version); await f.advance(60000); assert.equal(f.refreshed, 2);
  f.stop();
});

test('hidden and back-forward-cached pages stop checks, then check automatically on return', async () => {
  const f = fixture({ hidden: true, version: '1.2.344' });
  await f.advance(3600000); assert.equal(f.calls.length, 0);
  await f.visibility(false); assert.equal(f.calls.length, 1);
  await f.event('focus'); await f.event('pageshow'); assert.equal(f.calls.length, 1);
  await f.visibility(true); await f.advance(3600000); assert.equal(f.calls.length, 1);
  await f.visibility(false); assert.equal(f.calls.length, 2);
  await f.event('pagehide'); await f.advance(3600000); await f.event('online'); assert.equal(f.calls.length, 2);
  await f.event('pageshow'); assert.equal(f.calls.length, 3);
  f.stop(); await f.event('focus'); assert.equal(f.calls.length, 3); assert.equal(f.timers.size, 0);
});

test('failures back off and wrong-channel metadata cannot refresh an account', async () => {
  let bad = true;
  const f = fixture({ request: () => bad ? Response.json({channel:'family-beta', version:'1.2.999'}) : Response.json({channel:'stable',version:'1.2.344'}) });
  await flush(); assert.equal(f.refreshed, 0);
  await f.advance(119999); assert.equal(f.calls.length, 1);
  await f.advance(1); assert.equal(f.calls.length, 2);
  bad = false; await f.advance(15000); await f.event('online'); assert.equal(f.refreshed, 1);
  f.stop();
});

test('late responses from a hidden or replaced account do not refresh the current page', async () => {
  const waiting = [];
  const f = fixture({ request: () => new Promise(resolve => waiting.push(resolve)) });
  await flush(); await f.visibility(true); assert.equal(f.calls[0].init.signal.aborted, true);
  await f.visibility(false); assert.equal(f.calls.length, 2);
  waiting[0](Response.json({channel:'stable',version:'1.2.344'})); await flush(); assert.equal(f.refreshed, 0);
  f.stop(); waiting[1](Response.json({channel:'stable',version:'1.2.344'})); await flush();
  assert.equal(f.refreshed, 0); assert.equal(f.timers.size, 0);
});

test('channel hints reject malformed, oversized and cross-channel data', () => {
  for (const channel of ['stable','beta','family-beta']) assert.equal(hint.installerVersionHint(bundle(channel), channel), '1.2.344');
  for (const value of ['{}','not json','x'.repeat(32769),bundle('beta'),bundle('family-beta'),
    bundle('stable','01.2.344'),bundle('stable','1.65536.3'),bundle('stable','1.2.344',{product:'legacy'}),
    bundle('stable','1.2.344',{platform:'darwin'})]) assert.equal(hint.installerVersionHint(value, 'stable'), null);
});

function route() {
  return load('app/guard/download/release/route.ts', {
    '../../../../shared/guard-installer-release-hint': hint,
    '../../../../shared/guard-update-recovery': recovery
  });
}
const req = channel => new Request('https://guard.bodeebooks.com/guard/download/release/?channel=' + channel);

test('public hints coalesce requests, expire promptly and never read account or billing', async () => {
  const original = globalThis.fetch, originalNow = Date.now;
  let now = 0, version = '1.2.343'; const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({url,init}); return new Response(bundle('stable',version)); };
  Date.now = () => now;
  try {
    const api = route();
    const results = await Promise.all([api.GET(req('stable')),api.GET(req('stable'))]);
    assert.equal(calls.length,1); assert.equal((await results[0].json()).version,'1.2.343');
    assert.equal(results[1].headers.get('cache-control'),'no-store');
    version = '1.2.344'; now = 30000;
    assert.deepEqual(await (await api.GET(req('stable'))).json(),{channel:'stable',version:'1.2.344'});
    assert.equal(calls.length,2);
    assert.ok(calls.every(x => x.url.startsWith('https://github.com/vexonastudios/bodeeguard-stable-releases/') && !x.init.headers));
    assert.equal((await api.GET(req('https://evil.test'))).status,400);
    assert.equal((await api.GET(req('stable&channel=beta'))).status,400);
    assert.equal(calls.length,2);
  } finally { globalThis.fetch = original; Date.now = originalNow; }
});

test('failed release hints return unavailable without a stale-success response', async () => {
  const original = globalThis.fetch;
  try {
    for (const body of [bundle('beta'),'x'.repeat(33000)]) {
      globalThis.fetch = async () => new Response(body);
      const response = await route().GET(req('stable'));
      assert.equal(response.status,503); assert.deepEqual(await response.json(),{channel:'stable',version:null});
    }
    globalThis.fetch = async () => { throw Error('offline'); };
    assert.equal((await route().GET(req('stable'))).status,503);
  } finally { globalThis.fetch = original; }
});

test('Family Beta uses only its matching published metadata and never substitutes public Stable', async () => {
  const previous = process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST, version = process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('must not fetch a public installer'); };
  try {
    process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION = '1.2.345';
    process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST = Buffer.from(bundle('family-beta','1.2.345')).toString('base64');
    assert.deepEqual(await (await route().GET(req('family-beta'))).json(),{channel:'family-beta',version:'1.2.345'});
    process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST = Buffer.from(bundle('stable','1.2.345')).toString('base64');
    assert.equal((await route().GET(req('family-beta'))).status,503);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST; else process.env.BODEEGUARD_INTERNAL_PILOT_UPDATE_MANIFEST = previous;
    if (version === undefined) delete process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION; else process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION = version;
  }
});
