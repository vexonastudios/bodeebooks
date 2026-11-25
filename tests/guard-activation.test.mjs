import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

function load(relative, overrides = {}, exportName = 'default') {
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
  return component.exports[exportName];
}
test('parents who submit a download code get the child PC instructions before any approval lookup',async()=>{
  const auth=async()=>({isAuthenticated:true,getToken:async()=>'fixture'});
  const approve=load('app/guard/actions.ts',{'@clerk/nextjs/server':{auth},'next/navigation':{},'next/headers':{},'../../shared/guard-trial-context':{}},'approveComputer');
  const previousFetch=globalThis.fetch,previousUrl=process.env.BODEEGUARD_COMMERCIAL_API_URL,paths=[];
  process.env.BODEEGUARD_COMMERCIAL_API_URL='https://example.test';
  globalThis.fetch=async url=>{paths.push(new URL(url).pathname);return Response.json({});};
  try{
    const submit=code=>{const form=new FormData();form.set('userCode',code);return approve({status:'idle',message:''},form);};
    for(const code of ['mkr7','abcde-fghjk']){
      const result=await submit(code);assert.equal(result.status,'error');assert.match(result.message,/download code.*guard\.bodeebooks\.com\/install.*child’s computer/);
    }
    assert.equal(paths.length,0);
    for(const code of ['abcd-efgh','abcdefgh'])assert.equal((await submit(code)).status,'success');
    assert.deepEqual(paths,Array(2).fill('/v1/account/device-activations/ABCD-EFGH/approve'));
  }finally{globalThis.fetch=previousFetch;if(previousUrl===undefined)delete process.env.BODEEGUARD_COMMERCIAL_API_URL;else process.env.BODEEGUARD_COMMERCIAL_API_URL=previousUrl;}
});
test('approval page identifies the child computer, with current setup steps and authentication', async () => {
  let protectedRoute = 0;
  const Page = load('app/guard/activate/page.tsx', {
    '@clerk/nextjs/server': { auth: { protect: async () => { protectedRoute++; } } },
    './ActivationForm': { __esModule: true, default: ({ initialCode }) => React.createElement('input', { defaultValue: initialCode }) },
  });
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  assert.equal(protectedRoute, 1);
  assert.match(html, /Approve your child/); assert.match(html, /Leave BodeeGuard open on the child’s computer/);
  assert.match(html, /On this parent device, enter the <strong>pairing code from the child app/);
  assert.match(html, /After approval, choose which child/); assert.match(html, /href="\/guard\/account"/);
  const setupHtml = renderToStaticMarkup(await Page({searchParams:Promise.resolve({setup:'1'})}));
  assert.ok(setupHtml.includes('href="/guard/dashboard/?setup=connect"')); assert.match(setupHtml, /Back to computer setup/);
  assert.doesNotMatch(html, /BodeeGuard Settings|Connect this computer to|Copy code|Paste/);
});
test('empty form identifies the child computer code and only offers approval, without submitting its placeholder', () => {
  const Form = load('app/guard/activate/ActivationForm.tsx', {
    react: { ...React, useActionState: () => [{ status: 'idle', message: '' }, '/synthetic-action', false] },
    '../actions': { approveComputer: () => { throw new Error('Must not approve during render'); } },
  });
  const html = renderToStaticMarkup(React.createElement(Form));
  assert.doesNotMatch(html, /Paste code/); assert.match(html, /Approve child computer/);
  assert.match(html, /name="userCode"[^>]*value=""/);
  assert.match(html, /type="submit" disabled=""/); assert.match(html, /Pairing code shown on the child’s computer/);
  assert.doesNotMatch(html, /Approve this computer/);
});
test('successful approval explains the next step and offers the family dashboard', () => {
  const Form = load('app/guard/activate/ActivationForm.tsx', {
    react: { ...React, useActionState: () => [{ status: 'success', message: 'Child computer approved.' }, '/synthetic-action', false] },
    '../actions': { approveComputer: async () => {} },
  });
  const html = renderToStaticMarkup(React.createElement(Form));
  assert.match(html, /Child computer approved/); assert.match(html, /href="\/guard\/dashboard\/\?setup=connect"/);
  assert.match(html, /Choose which child uses this computer/);
  assert.match(html, /type="submit" disabled=""/);
});

test('in-dashboard approval uses the signed-in parent and the same code checks as the standalone page',async()=>{
  let signedIn=false;
  const auth=async()=>({isAuthenticated:signedIn,getToken:async()=>'synthetic'});
  const approveComputer=load('app/guard/actions.ts',{'@clerk/nextjs/server':{auth},'next/navigation':{},'next/headers':{},'../../shared/guard-trial-context':{}},'approveComputer');
  const origin='https://parent.example',oldFetch=globalThis.fetch,oldApi=process.env.BODEEGUARD_COMMERCIAL_API_URL;
  const imports={'../../../shared/guard-cloud-release':{},'../../../shared/guard-installer-download':{},'../../../shared/guard-customer-candidate':{}};
  const sameOrigin=load('app/guard/install/server.ts',imports,'sameOrigin');
  const privateHeaders=load('app/guard/install/server.ts',imports,'privateHeaders');
  const post=load('app/guard/activate/approve/route.ts',{'../../actions':{approveComputer},'../../install/server':{sameOrigin,privateHeaders}},'POST');
  const send=(body,from=origin)=>post(new Request(origin+'/guard/activate/approve/',{method:'POST',headers:{origin:from},body}));
  const requests=[];
  process.env.BODEEGUARD_COMMERCIAL_API_URL='https://api.example';
  globalThis.fetch=async(url,init)=>{requests.push({url,init});return Response.json({status:'approved',computerName:'Study laptop'});};
  try{
    assert.equal((await send('abcdefgh','https://elsewhere.example')).status,403);
    assert.match((await (await send('abcdefgh')).json()).message,/sign in/i);
    signedIn=true;
    assert.equal((await send('a'.repeat(81))).status,400);
    assert.match((await (await send('MKR7')).json()).message,/download code/);
    assert.equal(requests.length,0);
    const approved=await send('abcdefgh');
    assert.equal(approved.status,200);assert.match(approved.headers.get('cache-control'),/no-store/);
    assert.equal((await approved.json()).computerName,'Study laptop');
    assert.equal(requests.length,1);assert.equal(requests[0].url,'https://api.example/v1/account/device-activations/ABCD-EFGH/approve');
    assert.equal(requests[0].init.headers.Authorization,'Bearer synthetic');
  }finally{globalThis.fetch=oldFetch;if(oldApi===undefined)delete process.env.BODEEGUARD_COMMERCIAL_API_URL;else process.env.BODEEGUARD_COMMERCIAL_API_URL=oldApi;}
});
