import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

function load(file, mocks={}) {
  const filename=path.resolve(file), localRequire=createRequire(filename), mod=new Module(filename);
  mod.filename=filename;mod.require=name=>mocks[name]||localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
  return mod.exports;
}
test('dashboard errors have standalone styling, safe text and usable full-page recovery links',()=>{
  const {dashboardNotice}=load('app/guard/dashboard/dashboardNotice.ts');
  const unavailable=dashboardNotice('database secret',503);
  assert.match(unavailable,/<style>/);assert.match(unavailable,/color:#f4f2ff/);
  assert.match(unavailable,/href="\/guard\/dashboard\/" target="_top"/);
  assert.ok(!unavailable.includes('database secret'));
  const session=dashboardNotice('expired',401);
  assert.match(session,/Sign in/);assert.match(session,/connection-recovery.js/);
  assert.ok(dashboardNotice('<script>attack</script>',403).includes('&lt;script&gt;'));
});
test('account retry renews the token then performs a real reload, including a failed renewal',async()=>{
  const previous=globalThis.window;let reloads=0,renewals=0,fail=false;
  globalThis.window={location:{reload(){reloads++;}}};
  try {
    const Retry=load('app/guard/AccountRetry.tsx',{
      react:{useState:()=>[false,()=>{}]},
      '@clerk/nextjs':{useAuth:()=>({getToken:async options=>{assert.equal(options.skipCache,true);renewals++;if(fail)throw Error('offline');return 'synthetic';}})}
    }).default;
    await Retry({}).props.onClick();assert.equal(reloads,1);assert.equal(renewals,1);
    fail=true;await Retry({}).props.onClick();assert.equal(reloads,2);
  }finally{globalThis.window=previous;}
});

test('dashboard opened in a background tab waits for visibility before renewing and mounting its frame', async () => {
  const previous = { window: globalThis.window, document: globalThis.document, setTimeout: globalThis.setTimeout };
  const doc = new EventTarget(), win = new EventTarget(); doc.hidden = true;
  win.location = { origin: 'https://guard.example', assign() {} };
  let effect, renewals = 0; const ready = [];
  globalThis.window = win; globalThis.document = doc; globalThis.setTimeout = () => 0;
  try {
    const ParentWorkspace = load('app/guard/dashboard/ParentWorkspace.tsx', {
      react: { useRef: () => ({ current: null }), useState: () => [false, value => ready.push(value)], useEffect: fn => { effect = fn; } },
      '@clerk/nextjs': { useAuth: () => ({ isLoaded: true, getToken: async () => { renewals++; return 'synthetic'; } }) },
      './workspace.module.css': { default: {} },
    }).default;
    ParentWorkspace(); const cleanup = effect();
    await Promise.resolve(); assert.equal(renewals, 0); assert.deepEqual(ready, []);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
    for (let n = 0; n < 10; n++) await Promise.resolve();
    assert.equal(renewals, 1); assert.deepEqual(ready, [true]);
    cleanup();
  } finally { Object.assign(globalThis, previous); }
});

test('hiding during initial auth renewal does not mount a background dashboard and can resume immediately', async () => {
  const previous = { window: globalThis.window, document: globalThis.document, setTimeout: globalThis.setTimeout };
  const doc = new EventTarget(), win = new EventTarget(); doc.hidden = false;
  win.location = { origin: 'https://guard.example', assign() {} };
  let effect, resolveToken, renewals = 0; const ready = [];
  const token = new Promise(resolve => { resolveToken = resolve; });
  globalThis.window = win; globalThis.document = doc; globalThis.setTimeout = () => 0;
  try {
    const ParentWorkspace = load('app/guard/dashboard/ParentWorkspace.tsx', {
      react: { useRef: () => ({ current: null }), useState: () => [false, value => ready.push(value)], useEffect: fn => { effect = fn; } },
      '@clerk/nextjs': { useAuth: () => ({ isLoaded: true, getToken: () => { renewals++; return token; } }) },
      './workspace.module.css': { default: {} },
    }).default;
    ParentWorkspace(); const cleanup = effect();
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); resolveToken('synthetic');
    for (let n = 0; n < 10; n++) await Promise.resolve();
    assert.deepEqual(ready, []);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
    for (let n = 0; n < 10; n++) await Promise.resolve();
    assert.equal(renewals, 2); assert.deepEqual(ready, [true]); cleanup();
  } finally { Object.assign(globalThis, previous); }
});
