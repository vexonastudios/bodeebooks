import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('game saves preserve conflict checks through the authenticated parent bridge',async()=>{
 const file=path.resolve('app/guard/dashboard/bridge/route.ts'),realRequire=createRequire(file),mod=new Module(file),calls=[];let authenticated=false;mod.filename=file;
 class CloudApiError extends Error {constructor(message,status){super(message);this.status=status;}}
 let conflict=false;
 mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:authenticated})}:name==='../cloud-api'?{CloudApiError,cloudApi:async(...args)=>{calls.push(args);if(conflict)throw new CloudApiError('Review the latest settings.',409);return{saved:true,revision:2};}}:realRequire(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const settings={enabled:true,dailyMinutes:60,requireSchool:false,start:'13:00',end:'18:00',days:[4,5,6],unlockDate:null};
 const input={action:'game-settings',studentId:'11111111-1111-4111-8111-111111111111',revision:1,settings,expectedSettings:{...settings,dailyMinutes:30},householdId:'foreign'};
 const req=(origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
 assert.equal((await mod.exports.POST(req())).status,401);authenticated=true;
 assert.equal((await mod.exports.POST(req('https://foreign.example'))).status,403);assert.equal(calls.length,0);
 assert.equal((await mod.exports.POST(req())).status,200);assert.equal(calls[0][0],'/games/settings');
 assert.deepEqual(JSON.parse(calls[0][1].body),{studentId:input.studentId,revision:1,settings,expectedSettings:input.expectedSettings});
 conflict=true;const response=await mod.exports.POST(req());assert.equal(response.status,409);assert.equal((await response.json()).error,'Review the latest settings.');
});
