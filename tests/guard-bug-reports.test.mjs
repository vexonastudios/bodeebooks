import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function route({signedIn=true,fail=false}={}){
 const file=path.resolve('app/guard/report/api/route.ts'),mod=new Module(file),calls=[];
 class CloudApiError extends Error{constructor(message,status){super(message);this.status=status;}}
 mod.require=name=>{
  if(name==='@clerk/nextjs/server')return {auth:async()=>({isAuthenticated:signedIn})};
  if(name==='../../dashboard/cloud-api')return {CloudApiError,cloudApi:async(p,init={})=>{calls.push({p,body:init.body?JSON.parse(init.body):undefined});if(fail)throw Error('SECRET diagnostic');return {ok:true};}};
  throw Error('Unexpected dependency '+name);
 };
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 return {...mod.exports,calls};
}
const req=(body,headers={})=>new Request('https://guard.bodeebooks.com/guard/report/api/',{method:'POST',headers:{origin:'https://guard.bodeebooks.com','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('report proxy rejects CSRF, unauthenticated and oversized requests before forwarding',async()=>{
 const f=route();
 assert.equal((await f.POST(req({action:'submit'},{origin:'https://wrong.test'}))).status,403);
 assert.equal((await route({signedIn:false}).POST(req({action:'list'}))).status,401);
 assert.equal((await f.POST(req('x'.repeat(3*1024*1024+1)))).status,413);
 assert.equal((await f.POST(req('{bad'))).status,400);
 assert.equal((await f.POST(req({action:'operator'}))).status,400);
 assert.equal(f.calls.length,0);
});
test('report proxy allows only bounded parent actions, not household IDs or staff fields',async()=>{
 const f=route(),id='f6b2096f-62a6-4d2f-bf6e-0e7fe36020a1';
 await f.POST(req({action:'submit',id,description:'A test issue',area:'general',studentIds:[],includeSetup:false,householdId:'foreign',status:'resolved',internalNote:'spoof'}));
 assert.equal(f.calls[0].p,'/bug-reports');assert.equal(f.calls[0].body.householdId,undefined);assert.equal(f.calls[0].body.status,undefined);
 await f.POST(req({action:'reply',id,note:'More detail',revision:1,eventId:id,status:'resolved',internalNote:'spoof'}));
 assert.deepEqual(f.calls[1].body,{note:'More detail',revision:1,eventId:id});
 await f.POST(req({action:'voice',consent:true,data:'synthetic',mime:'audio/webm',studentIds:['private']}));
 assert.deepEqual(f.calls[2].body,{consent:true,data:'synthetic',mime:'audio/webm'});
 assert.equal((await f.POST(req({action:'detail',id:'../operator'}))).status,400);
 assert.match((await f.POST(req({action:'list'}))).headers.get('cache-control'),/private, no-store/);
 assert.doesNotMatch(JSON.stringify(await (await route({fail:true}).POST(req({action:'list'}))).json()),/SECRET/);
});
test('report routes and return paths work on the parent domain without changing API origins',()=>{
 const file=path.resolve('shared/guard-domain.ts'),mod=new Module(file);
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);
 const {guardReturnPath,guardRoute}=mod.exports;
 assert.equal(guardReturnPath('/guard/report/'),'/report/');
 assert.deepEqual(guardRoute('https://guard.bodeebooks.com/report/api/','POST'),{kind:'rewrite',url:'https://guard.bodeebooks.com/guard/report/api/'});
 assert.equal(guardRoute('https://guard.bodeebooks.com/guard/report/').url,'https://guard.bodeebooks.com/report/');
});
