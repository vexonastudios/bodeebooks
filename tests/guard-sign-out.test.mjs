import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function fixture(fail=false){
 const calls=[],state=[];
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/GuardSignOut.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports,require:name=>name==='@clerk/nextjs'?{useAuth:()=>({userId:'fixture-parent'}),useClerk:()=>({signOut:async options=>calls.push(['sign-out',options])})}
    :name==='react'?{useRef:()=>({current:false}),useState:initial=>[initial,value=>state.push(value)]}
    :name.includes('parent-notifications-client')?{stopParentPhoneNotifications:async options=>{calls.push(['stop-alerts',options]);if(fail)throw Error('offline');}}:{},
 });
 return {flow:exports.useGuardSignOut(),calls,state};
}
test('parent sign-out stops this device first and duplicate clicks cannot start another logout',async()=>{
 const f=fixture();await Promise.all([f.flow.leave(),f.flow.leave()]);
 assert.deepEqual(f.calls.map(row=>row[0]),['stop-alerts','sign-out']);
 assert.equal(f.calls[0][1].userId,'fixture-parent');assert.equal(f.calls[1][1].redirectUrl,'/guard/sign-in/');
});
test('failed browser and server removal keeps the parent signed in with actionable feedback',async()=>{
 const f=fixture(true);await f.flow.leave();
 assert.deepEqual(f.calls.map(row=>row[0]),['stop-alerts']);assert.ok(f.state.some(value=>typeof value==='string'&&value.includes('browser settings')));
 await f.flow.leave();assert.equal(f.calls.length,2,'the parent can retry');
});
