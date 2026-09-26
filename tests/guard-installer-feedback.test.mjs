import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

// Exercise the real click handlers with an isolated clock; no network or installer runs.
function mount(props = {}) {
  const filename=path.resolve('app/guard/InstallerDownload.tsx'), native=createRequire(filename);
  let cursor=0, now=Date.parse('2030-01-01T00:00:00Z'), sequence=0, tree;
  const slots=[], cleanups=[], timers=new Map();
  const clock={Date:{now:()=>now,parse:Date.parse},setTimeout(fn,ms){const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},clearTimeout(id){timers.delete(id);}};
  const hooks={...React,useId:()=> 'download-feedback',useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=value;}];},useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useEffect(effect){const i=cursor++;if(!(i in slots)){slots[i]=true;cleanups.push(effect());}}};
  const component=new Module(filename);
  component.require=name=>name==='react'?hooks:name==='__clock'?clock:name.endsWith('.css')?{__esModule:true,default:{}}:native(name);
  component._compile('const {setTimeout,clearTimeout,Date}=require("__clock");'+ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,filename);
  const render=()=>{cursor=0;tree=component.exports.default({href:'https://downloads.example.test/child.exe',label:'Download child app for Windows',version:'1.2.240',...props});return renderToStaticMarkup(tree);};
  render();
  return {render,anchor:()=>tree.props.children[0],click(overrides={}){const event={button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...overrides};tree.props.children[0].props.onClick(event);return event;},advance(ms){now+=ms;for(const [id,timer] of timers)if(timer.at<=now){timers.delete(id);timer.fn();}},unmount(){cleanups.forEach(fn=>fn?.());return timers.size;}};
}

test('native handoff remains intact, feedback appears immediately, and rapid duplicate clicks are suppressed',()=>{
  const view=mount();
  assert.doesNotMatch(view.render(),/Download requested/);
  assert.equal(view.anchor().props.href,'https://downloads.example.test/child.exe');
  assert.equal(view.anchor().props.target,'_blank');
  assert.equal(view.anchor().props.rel,'noopener noreferrer');
  assert.equal(view.click().defaultPrevented,false);
  assert.equal(view.click().defaultPrevented,true);
  assert.match(view.render(),/role="status".*aria-live="polite"/);
  assert.match(view.render(),/Download requested/);
  assert.match(view.render(),/Ctrl.*J/);
  view.advance(5000);
  assert.match(view.render(),/Try download again/);
  assert.equal(view.click().defaultPrevented,false);
  assert.equal(view.unmount(),0);
});

test('expiry never clears an in-progress handoff or falsely reports a completed transfer',()=>{
  const view=mount({expiresAt:'2030-01-01T00:05:00Z'});
  assert.equal(view.click().defaultPrevented,false);
  view.advance(300000);
  const html=view.render();
  assert.match(html,/Download requested/);
  assert.match(html,/An existing download can continue/);
  assert.match(html,/Get download/);
  assert.doesNotMatch(html,/Download complete|role="progressbar"/);
  assert.equal(view.click().defaultPrevented,true);
  assert.equal(view.unmount(),0);
});

test('expired links cannot start a new request; modified clicks retain normal browser behavior',()=>{
  const expired=mount({expiresAt:'2029-12-31T23:59:00Z'});
  assert.equal(expired.click().defaultPrevented,true);
  assert.match(expired.render(),/This download link expired/);
  assert.doesNotMatch(expired.render(),/Download requested/);
  expired.unmount();
  const normal=mount();
  assert.equal(normal.click({ctrlKey:true}).defaultPrevented,false);
  assert.doesNotMatch(normal.render(),/Download requested/);
  normal.unmount();
});
