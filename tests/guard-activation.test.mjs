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
