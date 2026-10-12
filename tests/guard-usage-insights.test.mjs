import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
function load(file){const filename=path.resolve(file),localRequire=createRequire(filename),compiled=new Module(filename);compiled.filename=filename;compiled.require=name=>name.endsWith('.module.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}:localRequire(name);compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);return compiled.exports;}
const {default:Insights,UsageTrends}=load('app/guard/admin/UsageInsights.tsx');
const totals={requests:100,dbQueries:1200,serverErrors:0,clientErrors:0,requestBytes:100,responseBytes:1000,aiCostMicros:0,aborted:0};
const data={from:'2026-10-10T00:00:00Z',asOf:'2026-10-12T12:00:00Z',totals,features:[],daily:[{...totals,date:'2026-10-12',activeFamilies:2}],watch:{limits:{},revision:0},insights:{normalized:{requests:100,activeFamilies:2},comparison:null,signals:[],recommendations:[],budgets:[]}};
test('staff summary explains incomplete comparisons, app queries and non-enforcing shared limits',()=>{
 const html=renderToStaticMarkup(React.createElement(Insights,{data,busy:false,refresh(){}}));
 assert.match(html,/Requests \/ active family/);assert.match(html,/>50</);assert.match(html,/not Cloudflare rows read/);assert.match(html,/at least three earlier complete days/);assert.match(html,/never block children or parent controls/);assert.match(html,/no background scans or emails/);
});
test('daily charts keep gaps unknown and identify partial days in accessible figures',()=>{
 const html=renderToStaticMarkup(React.createElement(UsageTrends,{data}));assert.match(html,/Unknown/);assert.match(html,/In progress/);assert.match(html,/Daily usage figures in UTC/);assert.match(html,/2026-10-10/);assert.match(html,/2026-10-11/);assert.doesNotMatch(html,/NaN|Infinity/);
});
test('family drill-down does not present organization budgets as family limits',()=>{
 const html=renderToStaticMarkup(React.createElement(Insights,{data:{...data,family:'synthetic-family'},busy:false,refresh(){}}));assert.doesNotMatch(html,/Daily watch limits|Save watch limits/);
});
test('idle health view makes no overnight requests and resumes once after activity or focus',()=>{
 const {startStaffRefresh}=load('app/guard/admin/health/idle-refresh.ts');let time=0,tick,requests=0,focused=true,stopped=false;
 const win=new EventTarget(),doc=new EventTarget();doc.visibilityState='visible';doc.hasFocus=()=>focused;
 const stop=startStaffRefresh(()=>requests++,{win,doc,now:()=>time,interval:fn=>{tick=fn;return 1;},cancel:()=>{stopped=true;}});
 time=60000;tick();assert.equal(requests,1);time=120000;tick();assert.equal(requests,1);
 for(time=180000;time<12*3600000;time+=60000)tick();assert.equal(requests,1);
 win.dispatchEvent(new Event('pointermove'));assert.equal(requests,2);win.dispatchEvent(new Event('focus'));assert.equal(requests,2);
 doc.visibilityState='hidden';time+=60000;win.dispatchEvent(new Event('pointermove'));tick();assert.equal(requests,2);
 doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));assert.equal(requests,3);
 focused=false;time+=60000;win.dispatchEvent(new Event('pointermove'));tick();assert.equal(requests,3);focused=true;win.dispatchEvent(new Event('focus'));assert.equal(requests,4);
 stop();assert.equal(stopped,true);time+=60000;win.dispatchEvent(new Event('pointermove'));assert.equal(requests,4);
});
