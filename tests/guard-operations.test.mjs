import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const filename=path.resolve('app/guard/admin/health/OperationsPanel.tsx'),localRequire=createRequire(filename);
const component=new Module(filename);component.filename=filename;
component.require=name=>{
 if(name==='./idle-refresh')return {startStaffRefresh:()=>()=>{}};
 if(name.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
 if(name==='next/link')return {__esModule:true,default:props=>React.createElement('a',props,props.children)};
 return localRequire(name);
};
component._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
const now=Date.parse('2026-11-03T12:00:00Z');
function render(probes){return renderToStaticMarkup(React.createElement(component.exports.default,{initial:{asOf:now,issues:[],probes}}));}
const probe=(id,minutes,status=200)=>({id,checked:now-minutes*60000,status,failures:status===200?0:2,latency:50});
function state(html,title){const article=html.match(new RegExp('<article[^>]*data-state="([^"]+)"[^>]*>(?:(?!<article)[\\s\\S])*?<h2>'+title+'</h2>'));assert.ok(article,title);return article[1];}
test('staff health separates customer updates, Family Beta, API and hourly database readiness',()=>{
 const html=render([probe('api',4),probe('parent',4),probe('updates',4),probe('updates-stable',4,502),probe('database',50)]);
 assert.equal(state(html,'Family services'),'healthy');assert.equal(state(html,'Family Beta updates'),'healthy');assert.equal(state(html,'Customer Stable updates'),'failed');assert.equal(state(html,'Database readiness'),'healthy');
 assert.match(html,/database readiness runs hourly/);assert.doesNotMatch(html,/Family services &amp; database/);
});
test('missing or stale public update probes never inherit Beta health',()=>{
 for(const probes of [[probe('updates',1)],[probe('updates',1),probe('updates-stable',13)]]){const html=render(probes);assert.equal(state(html,'Family Beta updates'),'healthy');assert.equal(state(html,'Customer Stable updates'),'unknown');}
 assert.equal(state(render([probe('database',76)]),'Database readiness'),'unknown');
});
