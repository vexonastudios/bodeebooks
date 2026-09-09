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
