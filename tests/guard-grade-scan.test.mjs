import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('grade scanning requires same-origin parent authentication and forwards only saved-file identity and selected mode', async () => {
  const filename=path.resolve('app/guard/dashboard/grade-scan/route.ts'),localRequire=createRequire(filename),mod=new Module(filename),calls=[];
  let authenticated=false;
  mod.filename=filename;mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{
    CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{suggestions:{title:'Synthetic quiz'}};}
  }:localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const input={id:'11111111-1111-4111-8111-111111111111',fileId:'22222222-2222-4222-8222-222222222222',mode:'read',householdId:'forged',data:'untrusted client photo'};
  const request=(body=input,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/grade-scan/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await mod.exports.POST(request())).status,401);authenticated=true;
  assert.equal((await mod.exports.POST(request(input,'https://foreign.example'))).status,403);assert.equal(calls.length,0);
  for(const mode of ['read','suggest']){
    const result=await mod.exports.POST(request({...input,mode}));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
    const [url,options]=calls.at(-1);assert.equal(url,'/grades/scan');assert.deepEqual(JSON.parse(options.body),{id:input.id,fileId:input.fileId,mode});
  }
  for(const patch of [{fileId:'bad'},{mode:'automatic'},{id:null}])assert.equal((await mod.exports.POST(request({...input,...patch}))).status,400);
  assert.equal((await mod.exports.POST(request({...input,data:'x'.repeat(5000)}))).status,413);assert.equal(calls.length,2);
});
