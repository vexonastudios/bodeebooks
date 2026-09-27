import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import Module from 'node:module';
import path from 'node:path';
const script=fs.readFileSync('public/guard-admin/parent-diagnostics.js','utf8');
test('browser error capture excludes messages, stacks, URLs, documents and credentials; retries preserve identity',async()=>{
 const listeners={},saved=new Map(),sent=[];let online=false;
 const context={document:{currentScript:{dataset:{version:'abcdef123'}},visibilityState:'visible'},location:{href:'https://guard.test/dashboard/',origin:'https://guard.test'},window:{addEventListener:(name,handler)=>listeners[name]=handler},localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},crypto,URL,AbortSignal,setInterval(){},fetch:async(url,init)=>{sent.push({url,body:JSON.parse(init.body)});if(!online)throw Error('offline');return {status:202};}};
 vm.runInNewContext(script,context);
 listeners.error({error:{name:'TypeError',message:'password=SECRET child paper',stack:'https://guard.test/?private=SECRET'},filename:'https://guard.test/guard-admin/cloud-workspace.js?token=SECRET',lineno:22,colno:3});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(sent.length,1);assert.equal(sent[0].body.location,'renderer/cloud-workspace.js:22:3');assert.doesNotMatch(JSON.stringify(sent),/SECRET|password|paper|stack|token|https:/);
 online=true;listeners.online();await new Promise(resolve=>setImmediate(resolve));assert.equal(sent[1].body.id,sent[0].body.id);assert.equal([...saved.values()][0],'[]');
});
test('locally injected private report fields are discarded instead of uploaded',async()=>{
 const context={document:{querySelector:()=>null,currentScript:{dataset:{}},visibilityState:'visible'},window:{addEventListener(){}},localStorage:{getItem:()=>JSON.stringify([{schemaVersion:1,password:'secret'}]),setItem(){}},setInterval(){},fetch:()=>assert.fail('Unexpected upload')};
 vm.runInNewContext(script,context);
});
const filename=path.resolve('app/guard/diagnostics/route.ts');
function route(authenticated){const mod=new Module(filename);mod.require=name=>{if(name==='@clerk/nextjs/server')return {auth:async()=>({isAuthenticated:authenticated})};throw Error(name);};mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);return mod.exports.POST;}
function request(body,origin='https://guard.test'){return new Request('https://guard.test/guard/diagnostics/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});}
test('browser relay requires same-origin authentication and rejects private fields before forwarding',async()=>{
 assert.equal((await route(false)(request({}))).status,401);
 assert.equal((await route(true)(request({},'https://foreign.test'))).status,403);
 assert.equal((await route(true)(request({password:'private'}))).status,400);
 assert.equal((await route(true)(request({message:'x'.repeat(3000)}))).status,400);
});
