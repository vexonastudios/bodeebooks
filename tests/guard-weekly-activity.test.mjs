import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function bridge(authenticated=true){
 const calls=[],filename=path.resolve('app/guard/dashboard/bridge/route.ts'),loadedModule=new Module(filename);
 loadedModule.require=name=>{
  if(name==='@clerk/nextjs/server')return {auth:async()=>({isAuthenticated:authenticated})};
  if(name==='../cloud-api')return {CloudApiError:class extends Error{},cloudApi:async(...args)=>{calls.push(args);return {rows:[]};}};
  throw Error('Unexpected import '+name);
 };
 loadedModule._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,filename);
 return {calls,post:loadedModule.exports.POST};
}
const request=(body,origin='https://guard.bodeebooks.com')=>new Request('https://guard.bodeebooks.com/guard/dashboard/bridge/',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('weekly bridge forwards only child and dates through the authenticated household API',async()=>{
 const b=bridge(),r=await b.post(request({action:'weekly-activity',studentId:'child',start:'2026-09-21',end:'2026-09-27',householdId:'foreign',path:'/unsafe'}));
 assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
 assert.equal(b.calls.length,1);assert.equal(b.calls[0][0],'/reports/weekly-time');assert.equal(b.calls[0][1].method,'POST');assert.deepEqual(JSON.parse(b.calls[0][1].body),{studentId:'child',start:'2026-09-21',end:'2026-09-27'});
});
test('weekly bridge rejects signed-out and foreign-origin requests without an API call',async()=>{
 for(const [signedIn,origin,status]of [[false,'https://guard.bodeebooks.com',401],[true,'https://foreign.example',403]]){const b=bridge(signedIn);assert.equal((await b.post(request({action:'weekly-activity'},origin))).status,status);assert.equal(b.calls.length,0);}
});
test('existing grade and school reports retain their original destinations',async()=>{
 for(const [action,destination]of [['list-grades','/grades/list'],['school-report','/reports/school-time']]){const b=bridge();assert.equal((await b.post(request({action}))).status,200);assert.equal(b.calls[0][0],destination);}
});
test('live connections use a read-only endpoint and tabletop roles never accept household identity',async()=>{
 const c=bridge();assert.equal((await c.post(request({action:'connection-status',householdId:'foreign'}))).status,200);
 assert.equal(c.calls[0][0],'/connections');assert.equal(c.calls[0][1].method,'GET');assert.equal(c.calls[0][1].body,undefined);
 const g=bridge();assert.equal((await g.post(request({action:'game-tabletop',role:'mom',operation:'host',id:'receipt',game:'chess',householdId:'foreign',studentId:'spoof'}))).status,200);
 assert.equal(g.calls[0][0],'/games/tabletop');assert.deepEqual(JSON.parse(g.calls[0][1].body),{role:'mom',operation:'host',id:'receipt',game:'chess'});
 for(const action of ['connection-status','game-tabletop']){const blocked=bridge(false);assert.equal((await blocked.post(request({action}))).status,401);assert.equal(blocked.calls.length,0);}
});
