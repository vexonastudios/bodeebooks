import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('Vocabulary photos require a signed-in same-origin parent; only bounded image data is forwarded',async()=>{
 const filename=path.resolve('app/guard/dashboard/vocabulary-scan/route.ts'),localRequire=createRequire(filename),mod=new Module(filename),calls=[];let authenticated=false;
 mod.filename=filename;mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{terms:[]};}}:localRequire(name);
 mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
 const input={id:'11111111-1111-4111-8111-111111111111',images:[{mime:'image/png',data:'synthetic',secret:'never forward'}],prompt:'Only chapter 4',householdId:'forged',model:'forged'};
 const request=(body=input,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/vocabulary-scan/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await mod.exports.POST(request())).status,401);authenticated=true;assert.equal((await mod.exports.POST(request(input,'https://foreign.example'))).status,403);assert.equal(calls.length,0);
 const result=await mod.exports.POST(request());assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal(calls[0][0],'/vocabulary/scan');assert.deepEqual(JSON.parse(calls[0][1].body),{id:input.id,prompt:input.prompt,images:[{mime:'image/png',data:'synthetic'}]});
 for(const patch of [{images:[]},{images:Array(7).fill(input.images[0])},{prompt:'x'.repeat(501)},{id:null}])assert.equal((await mod.exports.POST(request({...input,...patch}))).status,400);
 assert.equal((await mod.exports.POST(request({...input,images:[{mime:'image/png',data:'x'.repeat(4*1024*1024)}]}))).status,413);assert.equal(calls.length,1);
});
