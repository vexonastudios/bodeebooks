import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
function route(authenticated = true) {
  const filename = path.resolve('app/guard/dashboard/legacy/route.ts'), calls = [];
  class CloudApiError extends Error {}
  const module = new Module(filename); module.filename = filename;
  module.require = name => {
    if (name === '@clerk/nextjs/server') return { auth: async () => ({ isAuthenticated: authenticated }) };
    if (name === '../cloud-api') return { CloudApiError, cloudApi: async (...args) => { calls.push(args); return { saved: true }; } };
    throw Error('Unexpected dependency: ' + name);
  };
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return { post: module.exports.POST, calls };
}
const request = (body, origin = 'https://guard.example') => new Request('https://guard.example/guard/dashboard/legacy/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('Parent bridge forwards a 3.3 MB archive index, excludes supplied authority and preserves file-part limits', async () => {
  const r = route(), manifest = { synthetic: 'x'.repeat(3300000) };
  const result = await r.post(request({ action: 'create', manifest, householdId: 'forged' }));
  assert.equal(result.status, 200); assert.equal(r.calls[0][0], '/legacy/create'); assert.deepEqual(JSON.parse(r.calls[0][1].body), { manifest });
  assert.equal((await r.post(request({ action: 'create', manifest: { synthetic: 'x'.repeat(4001024) } }))).status, 413);
  assert.equal((await r.post(request({ action: 'put', data: 'x'.repeat(3 * 1024 * 1024) }))).status, 413);
  assert.equal((await r.post(request({ action: 'status', id: 'x'.repeat(97000) }))).status, 400); assert.equal(r.calls.length, 1);
});
test('Parent bridge still requires same-origin authenticated access for larger archives', async () => {
  const r = route(), anonymous = route(false), body = { action: 'create', manifest: { synthetic: 'x'.repeat(3300000) } };
  assert.equal((await r.post(request(body, 'https://other.example'))).status, 403);
  assert.equal((await anonymous.post(request(body))).status, 401); assert.equal(r.calls.length + anonymous.calls.length, 0);
});
