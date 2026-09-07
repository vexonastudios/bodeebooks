import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

class CloudApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const origin = 'https://www.bodeebooks.com';
const deviceId = '10000000-0000-4000-8000-000000000001';
function load(relative, { authenticated = true, api = async () => ({}), name = 'Jamie' } = {}) {
  const filename = path.resolve('app/guard/dashboard', relative);
  const localRequire = createRequire(filename);
  const component = new Module(filename);
  component.filename = filename;
  component.require = nameToLoad => {
    if (nameToLoad === '@clerk/nextjs/server') return { auth: async () => ({ isAuthenticated: authenticated }), currentUser: async () => ({ firstName: name }) };
    if (nameToLoad === '../cloud-api') return { cloudApi: api, CloudApiError };
    return localRequire(nameToLoad);
  };
  component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
  return component.exports;
}
function request(input, { requestOrigin = origin, contentType = 'application/json' } = {}) {
  return new Request(`${origin}/guard/dashboard/bridge/`, { method: 'POST',
    headers: { ...(requestOrigin ? { origin: requestOrigin } : {}), 'content-type': contentType }, body: typeof input === 'string' ? input : JSON.stringify(input) });
}

test('assistant bridge requires parent sign-in and same-origin JSON, strips identity and arbitrary model/tools', async () => {
  const calls=[];
  const route=load('bridge/route.ts',{api:async(path,init)=>{calls.push({path,body:JSON.parse(init.body)});return {message:'Product help'};}});
  const input={action:'assistant-ask',prompt:'Help',requestId:deviceId,ai:true,history:[],topicId:'offline',contextTab:'overview',householdId:'foreign',apiKey:'secret',tools:['delete'],path:'https://attacker.example',model:'expensive'};
  assert.equal((await route.POST(request(input))).status,200);
  assert.deepEqual(calls,[{path:'/assistant/ask',body:{prompt:'Help',requestId:deviceId,ai:true,history:[],topicId:'offline',contextTab:'overview'}}]);
  assert.equal((await route.POST(request(input,{requestOrigin:'https://foreign.example'}))).status,403);
  assert.equal((await load('bridge/route.ts',{authenticated:false}).POST(request(input))).status,401);
  await route.POST(request({action:'assistant-welcome',householdId:'foreign'}));
  assert.deepEqual(calls[1],{path:'/assistant/welcome',body:{}});
  assert.equal((await route.POST(request({action:'assistant-execute'}))).status,400);
});

test('learning library bridge strips family authority and provides only fixed library routes', async () => {
  const calls=[]; const route=load('bridge/route.ts',{api:async(path,init)=>{calls.push({path,body:JSON.parse(init.body)});return {};}});
  await route.POST(request({action:'list-learning-videos',householdId:'forged',studentId:'forged'}));
  assert.deepEqual(calls[0],{path:'/learning-videos/list',body:{}});
  const input={id:deviceId,revision:0,url:'https://youtu.be/47wkdQ80RSA',title:'Capitals',folder:'Songs',order:0,active:true,approved:true};
  await route.POST(request({...input,action:'save-learning-video',householdId:'forged',deviceCredential:'secret',path:'/elsewhere'}));
  assert.deepEqual(calls[1],{path:'/learning-videos/save',body:input});
  assert.equal((await load('bridge/route.ts',{authenticated:false}).POST(request({action:'list-learning-videos'}))).status,401);
  assert.equal((await route.POST(request({action:'save-learning-video'},{requestOrigin:'https://foreign.example'}))).status,403);
  const workspace=await load('workspace/route.ts').GET(new Request(`${origin}/guard/dashboard/workspace/`));
  assert.match(workspace.headers.get('content-security-policy'),/frame-src 'self'/);
});

test('Reading bridge uses fixed routes and strips household, device and reward authority', async () => {
  const calls=[]; const route=load('bridge/route.ts',{api:async(path,init)=>{calls.push({path,body:JSON.parse(init.body)});return {};}});
  const input={action:'reading-command',studentId:deviceId,id:deviceId,kind:'finish',bookId:deviceId,revision:2,householdId:'forged',deviceCredential:'forged',completionBonus:9000,path:'/arbitrary'};
  assert.equal((await route.POST(request(input))).status,200);
  assert.deepEqual(calls[0],{path:'/reading/command',body:{studentId:deviceId,id:deviceId,kind:'finish',bookId:deviceId,revision:2}});
  assert.equal((await load('bridge/route.ts',{authenticated:false}).POST(request(input))).status,401);
  assert.equal((await route.POST(request(input,{requestOrigin:'https://foreign.example'}))).status,403);
  await route.POST(request({action:'list-reading',studentId:deviceId,householdId:'forged'}));
  assert.deepEqual(calls[1],{path:'/reading/list',body:{studentId:deviceId}});
  await route.POST(request({action:'reading-history',studentId:deviceId,bookId:deviceId,offset:50,deviceId:'forged'}));
  assert.deepEqual(calls[2],{path:'/reading/history',body:{studentId:deviceId,bookId:deviceId,offset:50}});
});

test('Store bridge preserves receipt and price revisions while rejecting submitted family authority', async () => {
  const calls=[]; const route=load('bridge/route.ts',{api:async(path,init)=>{calls.push({path,body:JSON.parse(init.body)});return {};}});
  const input={action:'store-command',id:deviceId,kind:'refund',redemptionId:deviceId,revision:1,householdId:'forged',studentBalance:9000,deviceCredential:'forged',sender:'forged'};
  assert.equal((await route.POST(request(input))).status,200);
  assert.deepEqual(calls[0],{path:'/store/command',body:{id:deviceId,kind:'refund',revision:1,redemptionId:deviceId}});
  assert.equal((await load('bridge/route.ts',{authenticated:false}).POST(request(input))).status,401);
  assert.equal((await route.POST(request(input,{requestOrigin:'https://foreign.example'}))).status,403);
  await route.POST(request({action:'list-store',studentId:deviceId,offset:50,householdId:'forged'}));
  assert.deepEqual(calls[1],{path:'/store/list',body:{studentId:deviceId,offset:50}});
});

test('game bridge forwards only parent game controls, not client-chosen family or player authority', async () => {
  const calls=[]; const route=load('bridge/route.ts',{api:async (path,init)=>{calls.push({path,body:JSON.parse(init.body)});return {};}});
  const settings={enabled:true,dailyMinutes:60,requireSchool:true,start:'08:00',end:'20:00',days:[1,2,3],unlockDate:null};
  assert.equal((await route.POST(request({action:'game-settings',studentId:deviceId,revision:1,settings,householdId:'forged'}))).status,200);
  assert.deepEqual(calls[0],{path:'/games/settings',body:{studentId:deviceId,revision:1,settings}});
  await route.POST(request({action:'game-action',gameAction:'cancel',id:deviceId,matchId:deviceId,revision:2,studentId:'forged',opponentId:'forged',deviceCredential:'forged'}));
  assert.deepEqual(calls[1],{path:'/games/action',body:{action:'cancel',id:deviceId,matchId:deviceId,revision:2}});
  await route.POST(request({action:'game-room',householdId:'forged'})); assert.deepEqual(calls[2],{path:'/games/room',body:{}});
});

test('workspace checks sign-in and household eligibility before serving shared controls', async () => {
  let calls = 0;
  const anonymous = load('workspace/route.ts', { authenticated: false, api: async () => { calls++; } });
  assert.equal((await anonymous.GET(new Request(`${origin}/guard/dashboard/workspace/`))).status, 401);
  assert.equal(calls, 0);
  const forbidden = load('workspace/route.ts', { api: async () => { throw new CloudApiError('Private Beta only', 403); } });
  const result = await forbidden.GET(new Request(`${origin}/guard/dashboard/workspace/`));
  assert.equal(result.status, 403);
  const html = await result.text();
  assert.match(html, /Private Beta only/);
  assert.doesNotMatch(html, /cloud-workspace\.js|overview-grid/);
});
test('workspace escapes identity, inherits real navigation, restricts scripts and never caches family HTML', async () => {
  const route = load('workspace/route.ts', { name: '<script>attack</script>' });
  const result = await route.GET(new Request(`${origin}/guard/dashboard/workspace/`));
  assert.equal(result.status, 200);
  assert.match(result.headers.get('cache-control'), /no-store/);
  assert.match(result.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(result.headers.get('x-frame-options'), 'SAMEORIGIN');
  const html = await result.text();
  assert.match(html, /&lt;script&gt;attack&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>attack|admin123|admin-password|kioskAPI/);
  for (const label of ['Live Monitoring', 'Student Management', 'Subject Management', 'Learning Videos', 'Calendar / Schedule', 'Family Games', 'Account &amp; billing']) assert.ok(html.includes(label), label);
});
test('direct workspace navigation returns to the Clerk-managed page for long-lived sessions', async () => {
  const route = load('workspace/route.ts');
  const result = await route.GET(new Request(`${origin}/guard/dashboard/workspace/`, { headers: { 'sec-fetch-dest': 'document' } }));
  assert.equal(result.status, 307);
  assert.equal(result.headers.get('location'), `${origin}/guard/dashboard/`);
});
test('outage text does not expose internal errors or show an empty household', async () => {
  const route = load('workspace/route.ts', { api: async () => { throw new Error('postgres secret connection detail'); } });
  const result = await route.GET(new Request(`${origin}/guard/dashboard/workspace/`));
  assert.equal(result.status, 503);
  const html = await result.text();
  assert.match(html, /could not be reached/);
  assert.doesNotMatch(html, /postgres|No cloud test computers/);
});
test('both bridge methods require a parent session; missing and foreign origins cannot mutate', async () => {
  let calls = 0;
  const api = async () => { calls++; };
  const anonymous = load('bridge/route.ts', { authenticated: false, api });
  assert.equal((await anonymous.GET()).status, 401);
  assert.equal((await anonymous.POST(request({ action: 'add-student', name: 'Test' }))).status, 401);
  const route = load('bridge/route.ts', { api });
  for (const requestOrigin of [null, 'https://attacker.example', 'null']) assert.equal((await route.POST(request({ action: 'add-student' }, { requestOrigin }))).status, 403);
  assert.equal(calls, 0);
});
test('bridge allowlist strips submitted identity and refuses arbitrary API paths and device IDs', async () => {
  const calls = [];
  const route = load('bridge/route.ts', { api: async (...args) => { calls.push(args); return { ok: true }; } });
  const result = await route.POST(request({ action: 'add-student', name: 'Test', grade: '5', householdId: 'other', token: 'secret', path: '/admin', locked: true }));
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [['/students', { method: 'POST', body: JSON.stringify({ name: 'Test', grade: '5' }) }]]);
  for (const input of [{ action: 'fetch', path: 'https://attacker.example' }, { action: 'create-recovery', deviceId: '../../billing' }, { action: 'set-school-pause', deviceId, locked: 'true' }]) assert.equal((await route.POST(request(input))).status, 400);
  assert.equal(calls.length, 1);
});
test('student edits use a fixed family-scoped API path and strip submitted authority', async () => {
  const calls = [];
  const route = load('bridge/route.ts', { api: async (...args) => { calls.push(args); return { id: deviceId, name: 'Updated', grade: '6' }; } });
  const result = await route.POST(request({ action: 'edit-student', studentId: deviceId, name: 'Updated', grade: '6', householdId: 'foreign', role: 'owner' }));
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [[`/students/${deviceId}`, { method: 'PATCH', body: JSON.stringify({ name: 'Updated', grade: '6' }) }]]);
  assert.equal((await route.POST(request({ action: 'edit-student', studentId: '../../other', name: 'Bad' }))).status, 400);
});
test('grades, report and archive bridge keep fixed routes and discard forged family authority', async () => {
  const calls = [];
  const route = load('bridge/route.ts', { api: async (...args) => { calls.push(args); return {}; } });
  for (const input of [
    { action: 'list-grades', studentId: deviceId, before: '30' },
    { action: 'school-report', start: '2026-09-01', end: '2026-09-06', subjectId: deviceId },
    { action: 'save-grade', id: deviceId, revision: 2, studentId: deviceId, title: 'Quiz', course: 'Math', date: '2026-09-06', category: 'Quiz', scoreEarned: 17, scorePossible: 20, childFeedback: 'Practice', parentNotes: 'Private' },
    { action: 'remove-grade', id: deviceId, revision: 2 },
    { action: 'archive-student', studentId: deviceId, archived: true },
    { action: 'archive-student', studentId: deviceId, archived: false },
  ]) {
    const result = await route.POST(request({ ...input, householdId: 'forged', senderId: 'forged', path: 'https://other.example', token: 'secret' }));
    assert.equal(result.status, 200); assert.match(result.headers.get('cache-control'), /no-store/);
  }
  assert.deepEqual(calls.map(call => call[0]), ['/grades/list', '/reports/school-time', '/grades/save', '/grades/remove', `/students/${deviceId}/archive`, `/students/${deviceId}/archive`]);
  assert.equal(JSON.stringify(calls).includes('forged'), false); assert.equal(JSON.stringify(calls).includes('secret'), false);
  assert.equal(JSON.parse(calls[2][1].body).revision, 2);
  assert.equal((await route.POST(request({ action: 'archive-student', studentId: '../other', archived: true }))).status, 400);
  assert.equal((await route.POST(request({ action: 'archive-student', studentId: deviceId, archived: 'true' }))).status, 400);
});
test('bridge preserves rules revision and returns conflicts without retrying mutations', async () => {
  let calls = 0;
  const schedule = { enabled: true, timeZone: 'America/Chicago', days: [1, 2, 3, 4, 5], start: '08:00', end: '15:00' };
  const route = load('bridge/route.ts', { api: async (path, init) => {
    calls++; assert.equal(path, '/school-rules');
    assert.deepEqual(JSON.parse(init.body), { revision: 2, subjects: [], schedule });
    throw new CloudApiError('School rules changed in another window. Refresh before saving again.', 409);
  } });
  const result = await route.POST(request({ action: 'save-subjects', revision: 2, subjects: [], schedule, householdId: 'foreign' }));
  assert.equal(result.status, 409);
  assert.equal(calls, 1);
});
test('recovery and pause/assignment route only to the selected device through household-authenticated API', async () => {
  const calls = [];
  const route = load('bridge/route.ts', { api: async (...args) => { calls.push(args); return { code: 'synthetic-test-code', revision: 7 }; } });
  const recovery = await route.POST(request({ action: 'create-recovery', deviceId }));
  assert.match(recovery.headers.get('cache-control'), /no-store/);
  assert.equal((await recovery.json()).code, 'synthetic-test-code');
  await route.POST(request({ action: 'set-school-pause', deviceId, locked: true }));
  await route.POST(request({ action: 'assign-student', deviceId, studentId: null }));
  assert.deepEqual(calls.map(([path, init]) => [path, init.method, JSON.parse(init.body)]), [
    [`/devices/${deviceId}/recovery`, 'POST', {}], [`/devices/${deviceId}`, 'PATCH', { locked: true }], [`/devices/${deviceId}`, 'PATCH', { studentId: null }],
  ]);
});
test('bridge rejects malformed JSON, form submissions and oversized bodies before upstream access', async () => {
  let calls = 0;
  const route = load('bridge/route.ts', { api: async () => { calls++; } });
  assert.equal((await route.POST(request('{"broken":'))).status, 400);
  assert.equal((await route.POST(request('[]'))).status, 400);
  assert.equal((await route.POST(request('{}', { contentType: 'text/plain' }))).status, 415);
  assert.equal((await route.POST(request({ action: 'add-student', name: 'x'.repeat(100000) }))).status, 413);
  assert.equal(calls, 0);
});
test('bridge GET has no cache or cross-origin access and does not mask errors with empty lists', async () => {
  const route = load('bridge/route.ts', { api: async () => { throw new CloudApiError('Private Beta only', 403); } });
  const result = await route.GET();
  assert.equal(result.status, 403);
  assert.match(result.headers.get('cache-control'), /no-store/);
  assert.equal(result.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await result.json(), { error: 'Private Beta only' });
});

test('message bridge preserves retry IDs but strips household, sender and device authority', async () => {
  const calls = [];
  const route = load('bridge/route.ts', { api: async (...args) => { calls.push(args); return { saved: true }; } });
  const input = { action: 'send-message', studentId: deviceId, id: deviceId, body: 'Hello', householdId: 'foreign', senderId: 'forged', deviceCredential: 'secret' };
  assert.equal((await route.POST(request(input))).status, 200);
  assert.deepEqual(JSON.parse(calls[0][1].body), { studentId: deviceId, id: deviceId, body: 'Hello' });
  assert.equal(calls[0][0], '/messages/send');
  await route.POST(request({ action: 'list-messages', studentId: deviceId, before: '123', receivedIds: [deviceId], version: 'same' }));
  assert.deepEqual(JSON.parse(calls[1][1].body), { studentId: deviceId, before: '123', receivedIds: [deviceId], version: 'same' });
  assert.equal((await route.POST(request({ action: 'list-messages', studentId: '../../other' }))).status, 400);
});

test('private file upload has bounded dedicated parsing, sign-in, origin checks and no submitted authority', async () => {
  assert.match(fs.readFileSync('app/guard/dashboard/page.tsx', 'utf8'), /sandbox="[^"]*allow-downloads/);
  const calls = [], api = async (...args) => { calls.push(args); return { saved: true }; };
  const upload = load('upload/route.ts', { api });
  const input = { action: 'upload-file', id: deviceId, studentId: deviceId, purpose: 'paper', name: 'Work.pdf', mime: 'application/pdf', data: 'a'.repeat(100000), householdId: 'foreign', storage_path: '/other', token: 'secret' };
  assert.equal((await load('upload/route.ts', { authenticated: false, api }).POST(request(input))).status, 401);
  assert.equal((await upload.POST(request(input, { requestOrigin: 'https://foreign.example' }))).status, 403);
  assert.equal((await load('bridge/route.ts', { api }).POST(request(input))).status, 413);
  const response = await upload.POST(request(input)); assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(calls[0][0], '/files/upload'); assert.deepEqual(Object.keys(JSON.parse(calls[0][1].body)).sort(), ['data', 'id', 'mime', 'name', 'purpose', 'studentId']);
  assert.equal((await upload.POST(request({ ...input, data: 'a'.repeat(3 * 1024 * 1024) }))).status, 413);
  assert.equal((await upload.POST(request({ action: 'set-school-pause' }))).status, 400);
  const bridge = load('bridge/route.ts', { api });
  await bridge.POST(request({ action: 'read-file', id: deviceId, householdId: 'foreign', url: 'https://attacker.example' }));
  assert.equal(calls[1][0], '/files/read'); assert.deepEqual(JSON.parse(calls[1][1].body), { id: deviceId });
});
