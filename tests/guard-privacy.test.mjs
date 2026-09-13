import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {loadTsModule} from './guard-ts-module.mjs';

test('privacy bridge authenticates same-origin parents, strips submitted authority and never caches exports',async()=>{
  let authenticated=false;const calls=[];
  const mocks={'@clerk/nextjs/server':{auth:async()=>({isAuthenticated:authenticated})},'../cloud-api':{CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return {status:'synthetic'};}}};
  const {POST}=loadTsModule(path.resolve('app/guard/dashboard/bridge/route.ts'),name=>mocks[name]);
  const request=(data,origin='https://guard.example')=>new Request('https://guard.example/guard/dashboard/bridge/',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)});
  assert.equal((await POST(request({action:'privacy-delete'}))).status,401);authenticated=true;
  assert.equal((await POST(request({action:'privacy-delete'},'https://foreign.example'))).status,403);assert.equal(calls.length,0);
  for(const [action,route,body] of [
    ['privacy-export','/privacy/export',{table:2,offset:25,chunk:1,digest:'synthetic-digest'}],
    ['recovery-backups','/backups',{operation:'restore',id:'synthetic-backup',deviceId:'synthetic-child'}],
    ['privacy-delete','/privacy/delete',{revision:3,confirmation:'DELETE FAMILY DATA'}],
    ['privacy-cancel','/privacy/cancel',{revision:4}],
    ['save-retention','/retention',{revision:5,enabled:true,messageDays:90,schoolEventDays:180}]
  ]){
    const response=await POST(request({action,...body,householdId:'foreign',userId:'attacker',path:'/operator',executeAfter:'now',token:'fake'}));
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
    const call=calls.at(-1);assert.equal(call[0],route);assert.deepEqual(JSON.parse(call[1].body),body);
  }
});
