import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

function load(relative, overrides = {}) {
  const filename = path.resolve(relative), localRequire = createRequire(filename), component = new Module(filename);
  component.filename = filename;
  component.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    if (name === './navigation') return load('app/guard/dashboard/navigation.ts');
    if (name === './visible-viewport') return load('app/guard/dashboard/visible-viewport.ts');
    return localRequire(name);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return component.exports;
}
const { dashboardQuery } = load('app/guard/dashboard/navigation.ts');
const conversation = '11111111-1111-4111-8111-111111111111';
test('dashboard destinations retain only supported setup and conversation choices', () => {
  assert.equal(dashboardQuery({ setup: 'connect' }), '?setup=connect');
  assert.equal(dashboardQuery({ setup: '1', conversation }), '?setup=1&conversation=' + conversation);
  assert.equal(dashboardQuery({ setup: ['connect', '1'], conversation: ['bad'] }), '');
  assert.equal(dashboardQuery({ setup: 'https://foreign.invalid', conversation: '<script>' }), '');
});
function page(authenticated = true) {
  return load('app/guard/dashboard/page.tsx', {
    '@clerk/nextjs/server': { auth: async () => ({ isAuthenticated: authenticated }) },
    'next/navigation': { redirect: url => { throw new Error(url); } },
    './ParentWorkspace': { __esModule: true, default: ({ query }) => React.createElement('iframe', { src: '/guard/dashboard/workspace/' + query }) },
    ...Object.fromEntries(['ParentPwa', 'ParentUpdate', 'ParentNotifications'].map(name => ['./' + name, { __esModule: true, default: () => null }])),
  }).default;
}
test('pairing link reaches the inner dashboard and survives server sign-in', async () => {
  const html = renderToStaticMarkup(await page()({ searchParams: Promise.resolve({ setup: 'connect' }) }));
  assert.match(html, /src="\/guard\/dashboard\/workspace\/\?setup=connect"/);
  await assert.rejects(page(false)({ searchParams: Promise.resolve({ setup: 'connect' }) }), error => error.message === '/guard/sign-in?redirect_url=' + encodeURIComponent('/guard/dashboard/?setup=connect'));
});
test('ready client workspace passes the selected destination into its real iframe', () => {
  const Workspace = load('app/guard/dashboard/ParentWorkspace.tsx', {
    '@clerk/nextjs': { useAuth: () => ({ getToken: async () => 'fixture', isLoaded: true }) },
    react: { ...React, useState: () => [true, () => {}] },
    'next/image': { __esModule: true, default: () => null },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Workspace, { query: '?setup=connect' }));
  assert.match(html, /src="\/guard\/dashboard\/workspace\/\?setup=connect"/);
  assert.match(html, /title="BodeeGuard Parent Dashboard"/);
  assert.match(html, /sandbox="[^"]*allow-same-origin/);
});

test('a cold message notification survives the server sign-in redirect', async () => {
  await assert.rejects(page(false)({ searchParams: Promise.resolve({ conversation }) }), error => new URL(error.message,'https://guard.example').searchParams.get('redirect_url') === '/guard/dashboard/?conversation='+conversation);
});

function browser() {
  const previous={window:globalThis.window,document:globalThis.document,navigator:globalThis.navigator};
  const win=new EventTarget(),doc=new EventTarget(),worker=new EventTarget(),navigated=[],opened=[],posted=[];
  let current=new URL('https://guard.example/dashboard/?conversation='+conversation);
  win.location={get origin(){return current.origin;},get href(){return current.href;},get search(){return current.search;},assign:url=>navigated.push(url)};
  win.history={state:{keep:true},replaceState:(state,_title,url)=>{assert.deepEqual(state,{keep:true});current=new URL(url,current);}};
  win.open=(...args)=>opened.push(args);
  doc.hidden=false;const contentWindow={postMessage:data=>posted.push(data)};
  doc.querySelector=()=>({contentWindow});worker.controller={postMessage(){}};
  const nav={serviceWorker:worker,userActivation:{isActive:true}};
  for(const [key,value]of Object.entries({window:win,document:doc,navigator:nav,location:win.location}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  const dispatch=(target,source,data,origin=win.location.origin)=>target.dispatchEvent(Object.assign(new Event('message'),{source,data,origin}));
  return {win,doc,worker,nav,contentWindow,navigated,opened,posted,dispatch,restore(){for(const[key,value]of Object.entries(previous))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});delete globalThis.location;}};
}
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

test('session expiry preserves an open conversation and drafts; a real sign-in click returns to the child',async()=>{
  const b=browser(),effects=[];
  try {
    const Workspace=load('app/guard/dashboard/ParentWorkspace.tsx',{
      '@clerk/nextjs':{useAuth:()=>({getToken:async()=>null,isLoaded:true,isSignedIn:false})},
      react:{...React,useRef:()=>({current:{contentWindow:b.contentWindow,contentDocument:{body:{classList:{contains:value=>value==='cloud-messages-active'}}}}}),useState:()=>[true,()=>{}],useEffect:fn=>effects.push(fn)},
      'next/image':{__esModule:true,default:()=>null}
    }).default;
    renderToStaticMarkup(React.createElement(Workspace));const stop=effects[0]();await settle();
    assert.deepEqual(b.navigated,[]);assert.equal(b.posted.at(-1).type,'bodeeguard-session-required');
    b.dispatch(b.win,b.contentWindow,{type:'bodeeguard-sign-in',studentId:conversation},'https://foreign.example');
    b.dispatch(b.win,{}, {type:'bodeeguard-sign-in',studentId:conversation});assert.equal(b.opened.length,0);
    b.nav.userActivation.isActive=false;b.dispatch(b.win,b.contentWindow,{type:'bodeeguard-sign-in',studentId:conversation});assert.equal(b.opened.length,0);
    b.nav.userActivation.isActive=true;b.dispatch(b.win,b.contentWindow,{type:'bodeeguard-sign-in',studentId:conversation});
    assert.equal(b.opened.length,1);assert.equal(new URL(b.opened[0][0],b.win.location.origin).searchParams.get('redirect_url'),'/guard/dashboard/?conversation='+conversation);
    assert.deepEqual(b.opened[0].slice(1),['_blank','noopener']);stop();
  } finally {b.restore();}
});

test('a reused PWA remembers the newest notified child before forwarding to the iframe',async()=>{
  const b=browser(),effects=[],other='22222222-2222-4222-8222-222222222222';
  try {
    const Notifications=load('app/guard/dashboard/ParentNotifications.tsx',{
      '@clerk/nextjs':{useAuth:()=>({userId:'fixture-parent',isLoaded:true})},
      react:{...React,useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn)},
      './parent-notifications-client.js':{defaultNotificationLabel:()=>'',createParentNotifications:()=>({renew:async()=>{},dispose(){}})},
      './NotificationReply':{__esModule:true,default:()=>null}
    }).default;
    renderToStaticMarkup(React.createElement(Notifications));const stop=effects[2]();
    b.dispatch(b.worker,{}, {type:'bodeeguard-open-messages',studentId:other});assert.equal(new URL(b.win.location.href).searchParams.get('conversation'),conversation);
    b.dispatch(b.worker,b.worker.controller,{type:'bodeeguard-open-messages',studentId:other});
    assert.equal(new URL(b.win.location.href).searchParams.get('conversation'),other);assert.equal(b.posted.at(-1).studentId,other);
    b.dispatch(b.worker,b.worker.controller,{type:'bodeeguard-open-messages',studentId:'https://evil.example'});
    assert.equal(new URL(b.win.location.href).searchParams.get('conversation'),null);assert.equal(b.posted.at(-1).studentId,'');stop();
  } finally {b.restore();}
});
