import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function route(signedIn=true){
 const file=path.resolve('app/guard/dashboard/bible/route.ts'),mod=new Module(file),calls=[];
 class CloudApiError extends Error{}
 mod.require=name=>{if(name==='@clerk/nextjs/server')return{auth:async()=>({isAuthenticated:signedIn})};if(name==='../cloud-api')return{CloudApiError,cloudApi:async(p,init)=>{calls.push({p,body:JSON.parse(init.body)});return{saved:true};}};throw Error(name);};
 mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,file);return{...mod.exports,calls};
}
const req=(body,origin='https://guard.bodeebooks.com')=>new Request('https://guard.bodeebooks.com/guard/dashboard/bible/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('parent Bible proxy bounds requests, rejects cross-site/auth failures and never forwards a household or private Bible payload',async()=>{
 const f=route();assert.equal((await f.POST(req({action:'list'},'https://other.test'))).status,403);assert.equal((await route(false).POST(req({action:'list'}))).status,401);
 assert.equal((await f.POST(req({action:'child-sync',data:{note:'private'}}))).status,400);assert.equal((await f.POST(req({action:'command',kind:'assign',title:'x'.repeat(33000)}))).status,413);
 assert.equal((await f.POST(req({action:'command',kind:'assign',id:'id',studentIds:['child'],title:'Comfort',passages:[],householdId:'foreign',data:{note:'private'}}))).status,200);
 assert.deepEqual(f.calls[0],{p:'/bible/command',body:{id:'id',kind:'assign',studentIds:['child'],title:'Comfort',passages:[]}});
});
