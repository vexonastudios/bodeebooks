import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {cloudReleaseModule,cloudReleaseFixture} from './guard-release-fixtures.mjs';

async function accountPage(params={}) {
  const filename=path.resolve('app/guard/account/page.tsx'),localRequire=createRequire(filename),component=new Module(filename);
  const beforeFetch=globalThis.fetch,beforeApi=process.env.BODEEGUARD_COMMERCIAL_API_URL;
  process.env.BODEEGUARD_COMMERCIAL_API_URL='https://fixture.invalid';
  globalThis.fetch=async()=>({ok:true,json:async()=>({billingMode:'complimentary',entitlementStatus:'active',releaseChannel:'beta',release:cloudReleaseFixture('beta'),devices:[]})});
  component.require=name=>{
    if(name==='@clerk/nextjs/server')return {auth:{protect:async()=>({getToken:async()=>'synthetic'})},currentUser:async()=>({fullName:'Test Parent',publicMetadata:{},unsafeMetadata:{},externalAccounts:[]})};
    if(name==='next/headers')return {cookies:async()=>({get:()=>({value:'1'})})};
    if(name==='../actions')return new Proxy({},{get:()=>async()=>{}});
    if(name.endsWith('/guard-cloud-release'))return cloudReleaseModule;
    if(name==='./ChildSetup')return {__esModule:true,default:props=>React.createElement('section',{'data-collapsed':String(props.initiallyCollapsed)},props.children)};
    if(name==='./PlanControls'||name==='../AccountRetry')return {__esModule:true,default:()=>null};
    if(name==='../SubmitButton')return {__esModule:true,default:props=>React.createElement('button',null,props.children)};
    if(name==='next/link')return {__esModule:true,default:props=>React.createElement('a',props,props.children)};
    if(name.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
    return localRequire(name);
  };
  try{
    component._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
    return renderToStaticMarkup(await component.exports.default({searchParams:Promise.resolve(params)}));
  }finally{globalThis.fetch=beforeFetch;if(beforeApi===undefined)delete process.env.BODEEGUARD_COMMERCIAL_API_URL;else process.env.BODEEGUARD_COMMERCIAL_API_URL=beforeApi;}
}
test('Account uses the same journey, preserves installer eligibility and returns to saved setup',async()=>{
 const html=await accountPage();
 assert.match(html,/children → school → activities → connect a computer/);
 assert.match(html,/href="\/guard\/dashboard\/\?setup=1"/);
 assert.match(html,/href="\/guard\/dashboard\/\?setup=connect"/);
 assert.match(html,/href="\/guard\/download\/windows"/);
 assert.match(html,/data-collapsed="true"/);
 assert.doesNotMatch(html,/<strong>Choose their school<\/strong>/);
 const connected=await accountPage({setup:'connect'});assert.match(connected,/data-collapsed="false"/);
});
