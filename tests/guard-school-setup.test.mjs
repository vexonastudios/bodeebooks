import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

test('multiple school-site edits keep parent authentication, same-origin checks and selected child/site IDs', async () => {
  const filename=path.resolve('app/guard/dashboard/bridge/route.ts'),localRequire=createRequire(filename),mod=new Module(filename),calls=[];
  let authenticated=false;
  mod.filename=filename;
  mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{
    CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{saved:true};}
  }:localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const input={action:'setup-school',studentId:'11111111-1111-4111-8111-111111111111',subjectId:'22222222-2222-4222-8222-222222222222',operation:'edit',provider:'custom',title:'Math',url:'https://math.example.com/',revision:3,householdId:'not-trusted'};
  const request=(body=input,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await mod.exports.POST(request())).status,401);authenticated=true;
  assert.equal((await mod.exports.POST(request(input,'https://foreign.example'))).status,403);assert.equal(calls.length,0);
  for(const operation of ['add','edit','remove']) {
    assert.equal((await mod.exports.POST(request({...input,operation}))).status,200);
    const [url,options]=calls.at(-1);assert.equal(url,`/students/${input.studentId}/school`);
    assert.deepEqual(JSON.parse(options.body),{provider:'custom',title:'Math',url:input.url,revision:3,operation,subjectId:input.subjectId});
  }
  assert.equal((await mod.exports.POST(request({...input,studentId:'invalid'}))).status,400);assert.equal(calls.length,3);
});
