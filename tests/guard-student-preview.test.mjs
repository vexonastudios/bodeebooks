import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';

function route(relative, authenticated = true) {
  const calls = [], filename = path.resolve(relative), loaded = new Module(filename);
  loaded.require = name => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ isAuthenticated: authenticated }) };
    if (name === '../cloud-api') return { CloudApiError: class extends Error {}, cloudApi: async (...args) => { calls.push(args); return { saved: true }; } };
    throw Error(`Unexpected import ${name}`);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return { calls, post: loaded.exports.POST };
}

function request(routeName, body, origin = 'https://guard.bodeebooks.com') {
  return new Request(`https://guard.bodeebooks.com/guard/dashboard/${routeName}/`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('preview requires same-origin parent authentication and forwards only the selected student',async()=>{
 const studentId='11111111-1111-4111-8111-111111111111';
 const bridge=route('app/guard/dashboard/bridge/route.ts');
 const result=await bridge.post(request('bridge',{action:'student-preview',studentId,householdId:'foreign',deviceCredential:'secret',command:'award-coins'}));
 assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(bridge.calls,[['/student-preview',{method:'POST',body:JSON.stringify({studentId})}]]);
 const signedOut=route('app/guard/dashboard/bridge/route.ts',false);
 assert.equal((await signedOut.post(request('bridge',{action:'student-preview',studentId}))).status,401);assert.equal(signedOut.calls.length,0);
 assert.equal((await bridge.post(request('bridge',{action:'student-preview',studentId},'https://untrusted.test'))).status,403);
 assert.equal((await bridge.post(request('bridge',{action:'student-preview',studentId:'../../other'}))).status,400);assert.equal(bridge.calls.length,1);
});
