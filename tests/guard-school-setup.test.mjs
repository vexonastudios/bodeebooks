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

test('school directory bridge authenticates and forwards only the school query',async()=>{
  const filename=path.resolve('app/guard/dashboard/bridge/route.ts'),localRequire=createRequire(filename),mod=new Module(filename),calls=[];
  let authenticated=false;mod.filename=filename;
  mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{results:[]};}}:localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const input={action:'find-school-sites',query:'Math school',householdId:'foreign',studentId:'private',children:['Not for lookup'],url:'http://localhost'};
  const request=(body=input,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await mod.exports.POST(request())).status,401);authenticated=true;
  assert.equal((await mod.exports.POST(request(input,'https://foreign.example'))).status,403);
  assert.equal((await mod.exports.POST(request({...input,query:'a'.repeat(101)}))).status,400);assert.equal(calls.length,0);
  assert.equal((await mod.exports.POST(request())).status,200);assert.equal(calls[0][0],'/setup/school-search');assert.deepEqual(JSON.parse(calls[0][1].body),{query:'Math school'});
});

test('common sites match by curriculum or subject and custom URL entry stays explicit',async()=>{
  const {commonSchoolMatches,schoolWebsite,schoolProvider}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('public/guard-admin/cloud-school-directory.js','utf8')).toString('base64'));
  assert.equal(commonSchoolMatches('Bob Jones')[0].provider,'bju');assert.ok(commonSchoolMatches('grammar').some(row=>row.title==='Quill'));
  assert.equal(schoolWebsite('school.example.edu/student'),'https://school.example.edu/student');
  for(const address of ['javascript:alert(1)','file:///C:/school','https://user:password@school.edu','http://school.edu',''])assert.throws(()=>schoolWebsite(address));
  assert.equal(schoolProvider('https://academy.abeka.com/'),'abeka');assert.equal(schoolProvider('https://abeka.com.attacker.edu/'),'custom');
});
