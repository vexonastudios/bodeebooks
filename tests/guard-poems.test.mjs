import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
function route({signedIn=true,fail=false}={}){const file=path.resolve('app/guard/dashboard/poems/route.ts'),module=new Module(file),calls=[];class CloudApiError extends Error{}module.require=name=>{if(name==='@clerk/nextjs/server')return{auth:async()=>({isAuthenticated:signedIn})};if(name==='../cloud-api')return{CloudApiError,cloudApi:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});if(fail)throw Error('Synthetic provider detail');return{saved:true};}};throw Error('Unexpected route dependency');};module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return{POST:module.exports.POST,calls};}
function request(body,headers={}){return new Request('https://guard.bodeebooks.com/guard/dashboard/poems/',{method:'POST',headers:{origin:'https://guard.bodeebooks.com','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});}
test('Poem parent routes require sign-in and same origin, bound inputs and only forward parent actions',async()=>{
  const f=route();assert.equal((await f.POST(request({action:'list'},{origin:'https://other.example'}))).status,403);assert.equal((await route({signedIn:false}).POST(request({action:'list'}))).status,401);assert.equal((await f.POST(request('x'.repeat(131073)))).status,413);
  assert.equal((await f.POST(request({action:'command',kind:'respond'}))).status,400);assert.equal((await f.POST(request({action:'recording',view:'put'}))).status,400);assert.equal(f.calls.length,0);
  const response=await f.POST(request({action:'command',kind:'assignment',id:'synthetic',studentId:'child',assignmentId:'poem',revision:0,title:'Exact source',poem_text:'Line one\n\nLine two',householdId:'forged',deviceCredential:'forged',coins:999}));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(f.calls[0].url,'/poems/command');assert.equal(f.calls[0].body.householdId,undefined);assert.equal(f.calls[0].body.coins,undefined);assert.equal(f.calls[0].body.poem_text,'Line one\n\nLine two');
  await f.POST(request({action:'recording',view:'part',studentId:'child',recordingId:'recording',position:0,url:'https://arbitrary.example',data:'arbitrary'}));assert.deepEqual(f.calls[1].body,{view:'part',studentId:'child',recordingId:'recording',position:0});
  const failed=await route({fail:true}).POST(request({action:'command',kind:'review',id:'synthetic',studentId:'child',recitationId:'recording',revision:1,approved:true}));assert.equal(failed.status,503);assert.doesNotMatch(JSON.stringify(await failed.json()),/provider detail/);
});
test('Poem photo route keeps pages private, bounds requests and forwards only image bytes',async()=>{
  const file=path.resolve('app/guard/dashboard/poems-scan/route.ts'),module=new Module(file),calls=[];
  class CloudApiError extends Error{}
  module.require=name=>{
    if(name==='@clerk/nextjs/server')return{auth:async()=>({isAuthenticated:true})};
    if(name==='../cloud-api')return{CloudApiError,cloudApi:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return{id:'scan',poem_text:'First line\n\nSecond stanza'};}};
    throw Error('Unexpected route dependency');
  };
  module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
  const send=(body,origin='https://guard.bodeebooks.com')=>new Request('https://guard.bodeebooks.com/guard/dashboard/poems-scan/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await module.exports.POST(send({id:'scan',images:[{}]},'https://other.example'))).status,403);
  assert.equal((await module.exports.POST(send({id:'scan',images:[]}))).status,400);
  assert.equal((await module.exports.POST(send({id:'scan',images:[{data:'a'.repeat(4*1024*1024)}]}))).status,413);
  const result=await module.exports.POST(send({id:'scan',images:[{mime:'image/png',data:'abc',studentName:'private'}],householdId:'forged',model:'forged'}));
  assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);
  assert.deepEqual(calls,[{url:'/poems/scan',body:{id:'scan',images:[{mime:'image/png',data:'abc'}]}}]);
});
