import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module,{createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
test('parent spelling result uses signed-in same-origin proxy with bounded fields and no submitted household authority',async()=>{
 const file=path.resolve('app/guard/dashboard/bridge/route.ts'),mod=new Module(file),realRequire=createRequire(file),calls=[];let signedIn=false;
 mod.require=name=>name==='@clerk/nextjs/server'?{auth:async()=>({isAuthenticated:signedIn})}:name==='../cloud-api'?{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return{saved:true};}}:realRequire(name);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const input={action:'spelling-command',kind:'school-result',studentId:'11111111-1111-4111-8111-111111111111',id:'22222222-2222-4222-8222-222222222222',listId:'33333333-3333-4333-8333-333333333333',testDate:'2026-10-23',correct:8,total:10,missed:['friend','jumped'],note:'Paper test',householdId:'foreign',coins:999,mastered:true};
 const req=(origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
 assert.equal((await mod.exports.POST(req())).status,401);signedIn=true;assert.equal((await mod.exports.POST(req('https://foreign.test'))).status,403);assert.equal(calls.length,0);
 assert.equal((await mod.exports.POST(req())).status,200);assert.equal(calls[0][0],'/spelling/command');
 const forwarded=JSON.parse(calls[0][1].body);assert.deepEqual(forwarded,{kind:input.kind,studentId:input.studentId,id:input.id,listId:input.listId,testDate:input.testDate,correct:8,total:10,missed:input.missed,note:input.note});
});
test('served daily spelling report escapes parent text and distinguishes practice, retention and actual school results',async()=>{
 const source=fs.readFileSync('public/guard-admin/cloud-spelling-review.js','utf8'),{spellingReviewMarkup}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const html=spellingReviewMarkup({id:'list',student_name:'<img src=x>',title:'<script>unsafe</script>',word_count:1,words:[{word:'friend',example_sentence:'A <friend> helps.'}],daily_report:{checked:1,total:1,independent:0,retained:0,due:1,focus:[{word:'friend',miss_days:3,next_review:'2026-10-24'}]},school_results:[{date:'2026-10-23',correct:0,total:1,missed:['friend'],note:'<img src=x>'}]},'2026-10-23');
 assert.doesNotMatch(html,/<img|<script/);assert.match(html,/0\/1 · parent reported/);assert.match(html,/3 review day/);assert.match(html,/Print answer sheet/);assert.match(html,/mastery and coins/);
});
