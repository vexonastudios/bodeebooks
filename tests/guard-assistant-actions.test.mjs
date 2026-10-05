import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('review approvals use authenticated same-origin bridge and strip arbitrary authority/tools',async()=>{
 const file=path.resolve('app/guard/dashboard/bridge/route.ts'),realRequire=createRequire(file),mod=new Module(file),calls=[];let authenticated=false;mod.filename=file;
 mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{saved:true};}}:realRequire(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const input={action:'assistant-settings-approve',prompt:'Enable Math Coach for everyone',kind:'math-enable',requestId:'11111111-1111-4111-8111-111111111111',studentCount:2,reviewFingerprint:'review',approved:true,householdId:'foreign',tools:['delete'],model:'foreign',studentIds:['foreign']};
 const req=(origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
 assert.equal((await mod.exports.POST(req())).status,401);authenticated=true;assert.equal((await mod.exports.POST(req('https://foreign.example'))).status,403);assert.equal(calls.length,0);
 assert.equal((await mod.exports.POST(req())).status,200);assert.equal(calls[0][0],'/assistant/settings/approve');
 assert.deepEqual(JSON.parse(calls[0][1].body),{prompt:input.prompt,requestId:input.requestId,kind:input.kind,studentCount:2,reviewFingerprint:'review',approved:true});
 input.action='assistant-game-time-approve';input.minutes=20;input.studentId='22222222-2222-4222-8222-222222222222';
 assert.equal((await mod.exports.POST(req())).status,200);assert.equal(calls[1][0],'/assistant/game-time/approve');
 const body=JSON.parse(calls[1][1].body);assert.equal(body.studentId,input.studentId);assert.equal(body.minutes,20);assert.equal(body.householdId,undefined);assert.equal(body.studentIds,undefined);assert.equal(body.tools,undefined);
});
