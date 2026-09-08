import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
function route({signedIn=true,fail=false}={}){const file=path.resolve('app/guard/dashboard/quizzes/route.ts'),module=new Module(file),calls=[];class CloudApiError extends Error{}module.require=name=>{if(name==='@clerk/nextjs/server')return{auth:async()=>({isAuthenticated:signedIn})};if(name==='../cloud-api')return{CloudApiError,cloudApi:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(fail)throw Error('Synthetic private detail');return{saved:true};}};throw Error('Unexpected route dependency');};module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return{POST:module.exports.POST,calls};}
function request(body,headers={}){return new Request('https://guard.bodeebooks.com/guard/dashboard/quizzes/',{method:'POST',headers:{origin:'https://guard.bodeebooks.com','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});}
test('Quiz parent routes require signed-in same-origin requests and forward only allowed creation, archive and review fields',async()=>{
  const f=route();assert.equal((await f.POST(request({action:'list'},{origin:'https://foreign.example'}))).status,403);assert.equal((await route({signedIn:false}).POST(request({action:'list'}))).status,401);assert.equal((await f.POST(request('x'.repeat(262145)))).status,413);assert.equal((await f.POST(request({action:'command',kind:'submit'}))).status,400);assert.equal(f.calls.length,0);
  await f.POST(request({action:'command',kind:'create',id:'synthetic',quizId:'quiz',studentId:'child',revision:0,title:'Quiz',questions:[],householdId:'forged',coins:999}));assert.deepEqual(f.calls[0],{url:'/quizzes/command',body:{id:'synthetic',kind:'create',quizId:'quiz',studentId:'child',revision:0,title:'Quiz',questions:[]}});
  const review={action:'command',kind:'review',id:'synthetic',quizId:'quiz',studentId:'child',attemptId:'attempt',revision:2,grades:[true],notes:'Feedback',score:999,coins:999};await f.POST(request(review));assert.equal(f.calls[1].body.score,undefined);assert.equal(f.calls[1].body.coins,undefined);assert.deepEqual(f.calls[1].body.grades,[true]);const failure=await route({fail:true}).POST(request(review));assert.equal(failure.status,503);assert.doesNotMatch(JSON.stringify(await failure.json()),/private detail/);
});
