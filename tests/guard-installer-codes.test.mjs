import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
function load(filename,auth){
 filename=path.resolve(filename);const loaded=new Module(filename),native=createRequire(filename);
 loaded.require=name=>{
  if(name==='@clerk/nextjs/server')return{auth:async()=>({isAuthenticated:auth,getToken:async()=>auth?'synthetic-parent-token':null})};
  if(name.startsWith('.'))return load(path.resolve(path.dirname(filename),name+'.ts'),auth);
  return native(name);
 };
 loaded._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return loaded.exports;
}
async function request({action='code',authenticated=true,status=200,result,origin='https://guard.bodeebooks.com',body,raw,fail=false}={}){
 const savedFetch=globalThis.fetch;
 const names=['BODEEGUARD_COMMERCIAL_API_URL','BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION','BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN','BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET'];
 const saved=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 Object.assign(process.env,{BODEEGUARD_COMMERCIAL_API_URL:'https://api.fixture.invalid',BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION:'1.2.240',BODEEGUARD_INTERNAL_PILOT_ASSET_ORIGIN:'https://assets.fixture.invalid',BODEEGUARD_INTERNAL_PILOT_DOWNLOAD_SECRET:'synthetic-signing-secret'});
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});if(fail)throw Error('outage');return Response.json(result||{descriptor:{kind:'internal'},code:'MKR7',expiresAt:new Date(Date.now()+1800000).toISOString()},{status});};
 try{
  const route=load(`app/guard/install/${action}/route.ts`,authenticated);
  const response=await route.POST(new Request(`https://guard.bodeebooks.com/install/${action}/`,{method:'POST',headers:{origin,'sec-fetch-site':'same-origin'},body:raw??JSON.stringify(body??{})}));
  return{response,data:await response.json(),calls};
 }finally{globalThis.fetch=savedFetch;for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}}
}
test('phone issuance returns a short code and version, never the signed URL or account session',async()=>{
 const {response,data,calls}=await request({body:{version:'9.9.9',url:'https://evil.example',householdId:'other'}});
 assert.equal(response.status,200);assert.deepEqual(Object.keys(data).sort(),['code','expiresAt','version']);assert.equal(data.version,'1.2.240');
 assert.equal(data.code,'MKR7');
 assert.equal(calls[0].url,'https://api.fixture.invalid/v1/account/installer-codes');assert.equal(calls[0].options.body,'{}');
 assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');
});
test('issuance accepts the old API during rollout but rejects malformed codes',async()=>{
 const result={descriptor:{kind:'internal'},code:'ABCDE-FGHJK',expiresAt:new Date(Date.now()+1800000).toISOString()};
 const previous=await request({result});assert.equal(previous.response.status,200);assert.equal(previous.data.code,result.code);
 for(const code of ['ABC','ABCD','A7BC','ABC0','IOL7','<script>','MKR7-extra'])assert.equal((await request({result:{...result,code}})).response.status,503);
});
test('code issuance requires parent auth and rejects foreign origins without calling the API',async()=>{
 for(const options of [{authenticated:false},{origin:'https://evil.example'}]){const r=await request(options);assert.ok([401,403].includes(r.response.status));assert.equal(r.calls.length,0);}
});
test('a child redeems without signing in and only receives the current approved installer',async()=>{
 const {response,data,calls}=await request({action:'redeem',authenticated:false,body:{code:'mkr7',url:'https://evil.example',version:'0.0.0'}});
 assert.equal(response.status,200);assert.equal(data.version,'1.2.240');assert.equal(new URL(data.url).pathname,'/v1/installers/internal/BodeeGuard-Cloud-Test-1.2.240.exe');
 assert.deepEqual(JSON.parse(calls[0].options.body),{code:'mkr7'});assert.equal(calls[0].options.headers.Authorization,undefined);
 assert.deepEqual(Object.keys(data).sort(),['expiresAt','url','version']);assert.ok(Date.parse(data.expiresAt)>Date.now()+290000);
});
test('invalid, expired, throttled and unavailable responses are clear and cannot leak API data',async()=>{
 for(const status of [400,401,403,429,500]){
  const r=await request({action:'redeem',status,result:{error:'private internal data',householdId:'private'}});
  assert.equal(r.response.status,status===500?503:status);assert.doesNotMatch(JSON.stringify(r.data),/private internal|household|signature/);
 }
 assert.equal((await request({action:'redeem',fail:true})).response.status,503);
});
test('redeem rejects foreign origins and oversized or malformed input before upstream work',async()=>{
 for(const options of [{origin:'https://evil.example'},{raw:'bad-json'},{raw:'x'.repeat(1025)}]){
  const r=await request({action:'redeem',...options});assert.ok([400,403].includes(r.response.status));assert.equal(r.calls.length,0);
 }
});
test('release descriptors cannot inject redirects or select another installer',async()=>{
 for(const descriptor of [{kind:'evil',url:'https://evil.example'},{kind:'catalog',channel:'evil',version:'1.2.3'},{kind:'catalog',channel:'beta',version:'../other'},{kind:'catalog',channel:'beta',version:'01.2.3'}]){
  assert.equal((await request({action:'redeem',result:{descriptor}})).response.status,503);
 }
 const r=await request({action:'redeem',result:{descriptor:{kind:'catalog',channel:'stable',version:'1.2.250'}}});
 assert.equal(r.response.status,200);assert.equal(r.data.url,'https://github.com/vexonastudios/bodeeguard-stable-releases/releases/download/cloud-child-v1.2.250/BodeeGuard-Cloud-Child-Setup-1.2.250.exe');assert.equal(r.data.expiresAt,null);
});
test('Stable 1.2.339 code redeems to the exact temporary signed R2 mirror',async()=>{
 const r=await request({action:'redeem',result:{descriptor:{kind:'catalog',channel:'stable',version:'1.2.339'}}});
 assert.equal(r.response.status,200);const url=new URL(r.data.url);
 assert.equal(url.pathname,'/v1/installers/candidates/f7fad65465130af86e25e735d18196aa/BodeeGuard-Cloud-Child-Setup-1.2.339.exe');
 assert.ok(Date.parse(r.data.expiresAt)>Date.now());
});
test('the short address rewrites locally and the page does not demand parent login',()=>{
 const {guardRoute}=load('shared/guard-domain.ts');
 for(const [route,method] of [['/install/','GET'],['/install/redeem/','POST'],['/install/code/','POST']]) assert.deepEqual(guardRoute('https://guard.bodeebooks.com'+route,method),{kind:'rewrite',url:'https://guard.bodeebooks.com/guard'+route});
 const source=fs.readFileSync('app/guard/install/page.tsx','utf8');assert.doesNotMatch(source,/auth\.protect|Clerk/);assert.match(source,/pairing code/);
 const client=fs.readFileSync('app/guard/install/InstallForm.tsx','utf8');assert.match(client,/credentials:"omit"/);assert.match(client,/InstallerDownload key={link.url}/);assert.match(fs.readFileSync('app/guard/InstallerDownload.tsx','utf8'),/setTimeout/);
 const parent=fs.readFileSync('app/guard/account/InstallerShareLink.tsx','utf8');assert.match(parent,/guard.bodeebooks.com\/install/);assert.match(parent,/30 minutes/);assert.match(parent,/setTimeout/);
});

test('the real entry form accepts four characters, preserves older pasted codes and submits without parent credentials',async()=>{
 const filename=path.resolve('app/guard/install/InstallForm.tsx'),native=createRequire(filename),component=new Module(filename);
 let cursor=0,tree;const slots=[],effects=[],focusCalls=[],scrollCalls=[];
 const button={focus:options=>focusCalls.push(options),scrollIntoView:options=>scrollCalls.push(options)};
 component.require=name=>name==='react'?{...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=value;}];},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useEffect(effect,deps){const i=cursor++;if(!slots[i]||deps.some((value,index)=>!Object.is(value,slots[i][index]))){slots[i]=deps;effects.push(effect);}}}
   :name==='__browser'?{matchMedia:()=>({matches:true})}
   :name==='../InstallerDownload'?{__esModule:true,default:()=>null}
   :name.endsWith('.module.css')?{__esModule:true,default:{}}:native(name);
 component._compile('const window=require("__browser");'+ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
 const render=()=>{cursor=0;tree=component.exports.default();const ready=tree.props.children.find(child=>child?.props?.ref);if(ready)ready.props.ref.current={querySelector:()=>button};while(effects.length)effects.shift()();return renderToStaticMarkup(tree);};
 const input=()=>tree.props.children.find(child=>child?.type==='input');
 const savedFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return Response.json({url:'https://download.example.test/installer.exe',version:'1.2.339',expiresAt:null});};
 try{
  for(const code of ['mkr7','abcde-fghjk']){
   assert.match(render(),/3 letters and 1 number/);
   assert.ok(input().props.minLength<=code.length&&input().props.maxLength>=code.length,'browser length constraints must permit both formats');
   input().props.onChange({target:{value:code}});render();
   assert.equal(input().props.value,code.toUpperCase());
   await tree.props.onSubmit({preventDefault(){}});
   const call=calls.at(-1);assert.equal(call.url,'/guard/install/redeem/');assert.equal(call.options.credentials,'omit');
   assert.deepEqual(JSON.parse(call.options.body),{code:code.toUpperCase()});
   assert.match(render(),/Your Windows download is ready/);
   assert.deepEqual(focusCalls.at(-1),{preventScroll:true});
   assert.deepEqual(scrollCalls.at(-1),{block:'center',behavior:'instant'});
   assert.equal(focusCalls.length,calls.length,'each successful code brings the download into focus once');
   render();assert.equal(focusCalls.length,calls.length,'ordinary renders must not steal focus again');
  }
 }finally{globalThis.fetch=savedFetch;}
});


test('parent download handoff offers approval before issuance, after download and after code expiry',async()=>{
 const filename=path.resolve('app/guard/account/InstallerShareLink.tsx'),native=createRequire(filename),component=new Module(filename);
 let cursor=0,tree,expire;const slots=[],effects=[];
 component.require=name=>name==='react'?{...React,
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=value;}];},
  useEffect(effect){effects.push(effect);}}
  :name==='__clock'?{setTimeout:callback=>{expire=callback;return 1;},clearTimeout(){}}
  :name.endsWith('.module.css')?{__esModule:true,default:{}}:native(name);
 component._compile('const {setTimeout,clearTimeout}=require("__clock");'+ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
 const render=()=>{cursor=0;tree=component.exports.default();while(effects.length)effects.shift()();return renderToStaticMarkup(tree);};
 const check=()=>{const html=render();assert.match(html,/href="\/guard\/activate\/"[^>]*>Approve child computer/);assert.match(html,/different pairing code|pairing code/);assert.match(html,/download code does not approve a computer/);return html;};
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({code:'MKR7',version:'1.2.345',expiresAt:new Date(Date.now()+1800000).toISOString()});
 try{
  assert.doesNotMatch(check(),/MKR7/);
  await tree.props.children.find(child=>child?.type==='button').props.onClick();
  assert.match(check(),/MKR7/);
  expire();assert.doesNotMatch(check(),/MKR7/);
  assert.match(render(),/That code expired/);
 }finally{globalThis.fetch=previous;}
});
