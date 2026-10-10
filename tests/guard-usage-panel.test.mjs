import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const filename=path.resolve('app/guard/admin/UsagePanel.tsx'), localRequire=createRequire(filename);
const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const empty={requests:0,clientErrors:0,serverErrors:0,aborted:0,requestBytes:0,responseBytes:0,dbQueries:0,dbResultBytes:0,durationMs:0,maxResponseBytes:0,aiRequests:0,aiCostMicros:0,aiEstimatedMicros:0};
const row=(feature,values={})=>({...empty,feature,...values});
function load(features,sort='dbResultBytes'){
  const data={from:'2026-10-03T16:00:00Z',asOf:'2026-10-10T15:00:00Z',firstTracked:'2026-10-03T16:00:00Z',warnings:[],totals:{...empty,requests:100000,serverErrors:73},features,families:[],daily:[]};
  let index=0;const states=[7,'',[],data,false,'',sort,0];
  const module=new Module(filename);module.filename=filename;
  module.require=name=>name==='react'?{...React,useState:()=>[states[index++],()=>{}],useEffect:()=>{}}:name.endsWith('.module.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}:localRequire(name);
  module._compile(source,filename);
  return {warnings:module.exports.usageWarnings(features),render:()=>renderToStaticMarkup(React.createElement(module.exports.default))};
}
test('a concentrated feature failure is visible even when the aggregate rate is low',()=>{
  const f=load([row('sync',{requests:99000}),row('audiobooks',{requests:686,serverErrors:73})]);
  assert.equal(f.warnings.length,1);assert.match(f.warnings[0],/Audiobooks: 10.6%/);
  assert.match(f.render(),/Investigate this feature even if the overall error rate is low/);
});
test('staff can see rejected requests and per-request database cost without extra fetches',()=>{
  const f=load([row('diagnostics',{requests:100,clientErrors:49,dbQueries:900,durationMs:12500})]);
  assert.match(f.warnings[0],/Check rate limits, expired sessions and expected access denials/);
  const html=f.render();
  assert.match(html,/Rejected · 4xx/);assert.match(html,/49.0%/);assert.match(html,/9 \/ request/);assert.match(html,/125 ms mean/);
});
test('sorting by queries per request finds a low-volume expensive feature',()=>{
  const html=load([row('sync',{requests:1000,dbQueries:39000}),row('games',{requests:10,dbQueries:1550})],'queriesPerRequest').render();
  const table=html.slice(html.indexOf('<caption>Usage by feature'));
  assert.ok(table.indexOf('Games')<table.indexOf('Connection &amp; settings'));
});
test('zero requests and isolated expected denials do not generate spurious warnings or invalid averages',()=>{
  const f=load([row('poems-voice',{aiRequests:5}),row('messages',{requests:100,clientErrors:1}),row('files',{requests:1,serverErrors:1})]);
  assert.deepEqual(f.warnings,[]);assert.doesNotMatch(f.render(),/NaN|Infinity/);
});
