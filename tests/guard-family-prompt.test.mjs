import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('reviewed family save is authenticated, same origin and strips submitted household authority',async()=>{
  const filename=path.resolve('app/guard/dashboard/bridge/route.ts'),localRequire=createRequire(filename),mod=new Module(filename),calls=[];
  let authenticated=false;mod.filename=filename;
  mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{saved:true};}}:localRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
  const input={action:'confirm-family-prompt',requestId:'11111111-1111-4111-8111-111111111111',confirmed:true,rulesRevision:0,householdId:'foreign',children:[{name:'Mia',grade:'3',provider:'abeka',schoolName:'Abeka',url:'',householdId:'foreign',studentId:'foreign',locked:false}]};
  const request=(origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
  assert.equal((await mod.exports.POST(request())).status,401);authenticated=true;
  assert.equal((await mod.exports.POST(request('https://foreign.example'))).status,403);assert.equal(calls.length,0);
  assert.equal((await mod.exports.POST(request())).status,200);
  assert.equal(calls[0][0],'/setup/family-prompt/confirm');
  assert.deepEqual(JSON.parse(calls[0][1].body),{requestId:input.requestId,confirmed:true,rulesRevision:0,children:[{name:'Mia',grade:'3',provider:'abeka',schoolName:'Abeka',url:''}]});
});
