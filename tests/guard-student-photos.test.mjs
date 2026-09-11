import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
function load(file, mocks) {
  const filename=path.resolve(file), localRequire=createRequire(filename), mod=new Module(filename);
  mod.filename=filename;mod.require=name=>mocks[name]||localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  return mod.exports;
}
test('student photo changes require same-origin parent auth and preserve omitted versus removed photo', async () => {
  let authenticated=false;const calls=[];
  const {POST}=load('app/guard/dashboard/bridge/route.ts',{'@clerk/nextjs/server':{auth:async()=>({isAuthenticated:authenticated})},'../cloud-api':{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{};}}});
  const input={action:'edit-student',studentId:'11111111-1111-4111-8111-111111111111',name:'Test Child',grade:'7',photo:'synthetic',householdId:'foreign'};
  const request=(body=input,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await POST(request())).status,401);authenticated=true;
  assert.equal((await POST(request(input,'https://foreign.example'))).status,403);assert.equal(calls.length,0);
  assert.equal((await POST(request())).status,200);assert.deepEqual(JSON.parse(calls[0][1].body),{name:'Test Child',grade:'7',photo:'synthetic'});
  await POST(request({...input,photo:null}));assert.equal(JSON.parse(calls[1][1].body).photo,null);
  const {photo,...without}=input;await POST(request(without));assert.ok(!Object.hasOwn(JSON.parse(calls[2][1].body),'photo'));
});
test('photo delivery is private, versioned, bounded, and authentication/errors never cache', async () => {
  let authenticated=false,fail=false;const calls=[];const version='a'.repeat(64);
  class CloudApiError extends Error {constructor(message,status){super(message);this.status=status;}}
  const {GET}=load('app/guard/dashboard/student-photo/route.ts',{'@clerk/nextjs/server':{auth:async()=>({isAuthenticated:authenticated})},'../cloud-api':{CloudApiError,cloudApi:async(...args)=>{calls.push(args);if(fail)throw new CloudApiError('Missing',404);return{mime:'image/webp',version,data:Buffer.from('synthetic').toString('base64')};}}});
  const request=new Request('https://guard.example/guard/dashboard/student-photo/?student=11111111-1111-4111-8111-111111111111&v='+version);
  assert.equal((await GET(request)).status,401);assert.equal(calls.length,0);authenticated=true;
  assert.equal((await GET(new Request('https://guard.example/guard/dashboard/student-photo/?student=bad&v=bad'))).status,400);
  const response=await GET(request);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/^private, max-age=86400, immutable$/);assert.equal(response.headers.get('content-type'),'image/webp');assert.equal(response.headers.get('vary'),'Cookie');assert.equal(await response.text(),'synthetic');
  fail=true;const error=await GET(request);assert.equal(error.status,404);assert.equal(error.headers.get('cache-control'),'private, no-store');
});
