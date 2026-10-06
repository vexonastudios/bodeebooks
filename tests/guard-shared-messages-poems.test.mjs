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

test('shared messages and reactions use the parent-authenticated bridge without supplied family authority', async () => {
  const bridge = route('app/guard/dashboard/bridge/route.ts');
  const recipients = [{ studentId: 'child-1', id: 'message-1' }];
  assert.equal((await bridge.post(request('bridge', { action: 'send-shared-message', familyThreadId: 'thread-1', body: 'Hello', recipients, householdId: 'foreign' }))).status, 200);
  assert.deepEqual(bridge.calls[0], ['/messages/shared/send', { method: 'POST', body: JSON.stringify({ familyThreadId: 'thread-1', body: 'Hello', recipients }) }]);
  assert.equal((await bridge.post(request('bridge', { action: 'react-message', shared: true, messageId: 'message-1', emoji: '👍', householdId: 'foreign' }))).status, 200);
  assert.deepEqual(JSON.parse(bridge.calls[1][1].body), { shared: true, messageId: 'message-1', emoji: '👍' });
  assert.equal(bridge.calls[1][0], '/messages/react');
  assert.equal((await bridge.post(request('bridge', { action: 'child-peer-message-settings', studentId: 'child-1', enabled: false, householdId: 'foreign' }))).status, 200);
  assert.deepEqual(bridge.calls[2], ['/messages/peer/child-settings', { method: 'POST', body: JSON.stringify({ studentId: 'child-1', enabled: false }) }]);
  const signedOut = route('app/guard/dashboard/bridge/route.ts', false);
  assert.equal((await signedOut.post(request('bridge', { action: 'send-shared-message' }))).status, 401);
  assert.equal((await signedOut.post(request('bridge', { action: 'child-peer-message-settings', studentId: 'child-1', enabled: false }))).status, 401);
  assert.equal(signedOut.calls.length, 0);
});

test('poem photo scan is same-origin, parent-only, bounded and forwards only the reviewed pages', async () => {
  const scan = route('app/guard/dashboard/poems-scan/route.ts');
  const images = [{ mime: 'image/jpeg', data: 'synthetic' }];
  assert.equal((await scan.post(request('poems-scan', { id: 'scan-1', images, householdId: 'foreign' }))).status, 200);
  assert.deepEqual(scan.calls[0], ['/poems/scan', { method: 'POST', body: JSON.stringify({ id: 'scan-1', images }) }]);
  assert.equal((await scan.post(request('poems-scan', { id: 'scan-2', images }, 'https://foreign.example'))).status, 403);
  assert.equal((await scan.post(request('poems-scan', { id: 'scan-3', images: [] }))).status, 400);
  assert.equal(scan.calls.length, 1);
  const signedOut = route('app/guard/dashboard/poems-scan/route.ts', false);
  assert.equal((await signedOut.post(request('poems-scan', { id: 'scan-1', images }))).status, 401);
  assert.equal(signedOut.calls.length, 0);
});
