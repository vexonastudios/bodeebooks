import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

function load(relative, overrides = {}) {
  const filename = path.resolve(relative), require = createRequire(filename), component = new Module(filename);
  component.filename = filename;
  component.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props, props.children) };
    return require(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return component.exports.default || component.exports;
}
test('approval page identifies the child computer, with current setup steps and authentication', async () => {
  let protectedRoute = 0;
  const Page = load('app/guard/activate/page.tsx', {
    '@clerk/nextjs/server': { auth: { protect: async () => { protectedRoute++; } } },
    './ActivationForm': { __esModule: true, default: ({ initialCode }) => React.createElement('input', { defaultValue: initialCode }) },
  });
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  assert.equal(protectedRoute, 1);
  assert.match(html, /Approve your child/); assert.match(html, /Parent setup &amp; connection/);
  assert.match(html, /Copy code/); assert.match(html, /not this phone or browser/);
  assert.doesNotMatch(html, /BodeeGuard Settings|Connect this computer to/);
});
test('empty form has separate paste and approval buttons, no placeholder submitted as a code', () => {
  const Form = load('app/guard/activate/ActivationForm.tsx', {
    react: { ...React, useActionState: () => [{ status: 'idle', message: '' }, '/synthetic-action', false] },
    '../actions': { approveComputer: () => { throw new Error('Must not approve during render'); } },
  });
  const html = renderToStaticMarkup(React.createElement(Form));
  assert.match(html, /Paste code/); assert.match(html, /Approve child computer/);
  assert.match(html, /name="userCode"[^>]*value=""/);
  assert.match(html, /type="submit" disabled=""/); assert.match(html, /field is empty/);
  assert.doesNotMatch(html, /Approve this computer/);
});
test('successful approval explains the next step and offers the family dashboard', () => {
  const Form = load('app/guard/activate/ActivationForm.tsx', {
    react: { ...React, useActionState: () => [{ status: 'success', message: 'Child computer approved.' }, '/synthetic-action', false] },
    '../actions': { approveComputer: async () => {} },
  });
  const html = renderToStaticMarkup(React.createElement(Form));
  assert.match(html, /Child computer approved/); assert.match(html, /href="\/guard\/dashboard\/\?setup=connect"/);
  assert.match(html, /Assign child &amp; check readiness/);
  assert.match(html, /type="submit" disabled=""/);
});


test('pairing success uses the authenticated API platform, not a browser or submitted platform',async()=>{
 const oldFetch=globalThis.fetch,oldApi=process.env.BODEEGUARD_COMMERCIAL_API_URL;
 let signedIn=true,payload={platform:'mac-preview'},calls=0;
 const {approveComputer}=load('app/guard/actions.ts',{
  '@clerk/nextjs/server':{auth:async()=>({isAuthenticated:signedIn,getToken:async()=>'synthetic-session'})},
  'next/navigation':{redirect:()=>{throw Error('Unexpected redirect');}}
 });
 process.env.BODEEGUARD_COMMERCIAL_API_URL='https://synthetic.invalid';
 globalThis.fetch=async(url,init)=>{calls++;assert.match(url,/device-activations\/ABCD-EFGH\/approve$/);assert.equal(init.headers.Authorization,'Bearer synthetic-session');assert.deepEqual(JSON.parse(init.body),{});return{ok:true,json:async()=>payload};};
 try{
  const data=new FormData();data.set('userCode','ABCD-EFGH');data.set('platform','windows');
  const mac=await approveComputer({status:'idle',message:''},data);assert.equal(mac.status,'success');assert.match(mac.message,/Mac preview approved/);assert.match(mac.message,/other Mac apps and settings remain accessible/);
  payload={};data.set('platform','mac-preview');const pc=await approveComputer({status:'idle',message:''},data);assert.doesNotMatch(pc.message,/Mac preview/);assert.match(pc.message,/offline recovery code/);
  signedIn=false;assert.equal((await approveComputer({status:'idle',message:''},data)).status,'error');assert.equal(calls,2);
 }finally{globalThis.fetch=oldFetch;if(oldApi===undefined)delete process.env.BODEEGUARD_COMMERCIAL_API_URL;else process.env.BODEEGUARD_COMMERCIAL_API_URL=oldApi;}
});
