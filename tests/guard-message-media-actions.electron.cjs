'use strict';
// Real parent message renderer; fictional children, no external requests or installed app.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), assert = require('node:assert/strict');
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-message-unlocks-')));
const site = path.resolve(__dirname, '..');
const students = [{ id: 'child-a', name: 'Alex' }, { id: 'child-b', name: 'Jamie' }, { id: 'archived', name: 'Archived', archived_at: '2026-01-01' }];
const msg = (id, body, extra = {}) => ({ id, body, sender: 'child', createdAt: new Date().toISOString(), reactions: [], ...extra });
const direct = [msg('request', 'can you unlock audiobooks'), msg('parent', 'Unlock music', { sender: 'parent' }), msg('no', "Don't unlock videos"), msg('text', '<img src=x onerror=alert(1)>')];
const shared = [msg('group-request', 'Please unlock videos and music for Alex', { authorStudentId: 'child-b', senderName: 'Alex' }),
  msg('unknown', 'unlock audiobooks', { senderName: 'Alex' }), msg('archived-request', 'unlock music', { authorStudentId: 'archived', senderName: 'Archived' })];
const group = { id: 'group-1', kind: 'siblings', members: students.slice(0, 2).map(s => ({ studentId: s.id, name: s.name })), closedAt: null };
const writes = [], calls = [], errors = []; let lost = true, malformed = true, holdMusic, releaseMusic;
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://fixture.local').pathname;
  if (pathname === '/') {
    let html = JSON.parse(fs.readFileSync(path.join(site, 'app/guard/dashboard/generated/workspace.json'), 'utf8')).html;
    html = html.replace('</head>', '<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>');
    html = html.replace(/<script type="module" src="\/guard-admin\/cloud-workspace.js"><\/script>/,
      `<script type="module">import {setupCloudMessages} from '/guard-admin/cloud-messages.js';
      document.querySelectorAll('[id^="tab-"]').forEach(el=>el.classList.remove('active'));document.querySelector('#tab-messages').classList.add('active');
      const mobile=()=>document.body.classList.toggle('cloud-mobile',innerWidth<=900);mobile();addEventListener('resize',mobile);
      window.students=${JSON.stringify(students)};window.messaging=setupCloudMessages({endpoint:'/bridge'});messaging.update(students);messaging.setActive(true);messaging.openStudent('child-a');</script>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return;
  }
  if (/^\/guard-admin\/[a-z0-9.-]+$/.test(pathname)) {
    const file = path.join(site, 'public', pathname);
    if (fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(fs.readFileSync(file)); return; }
  }
  if (pathname === '/bridge') {
    let raw = ''; for await (const chunk of req) raw += chunk; const input = JSON.parse(raw); calls.push(input);
    let output = {};
    if (input.action === 'list-message-groups') output = { groups: [group], peerMessagingEnabled: true, childPeerSettings: [] };
    if (input.action === 'list-messages') output = { studentId: input.studentId, version: 'v1', messages: input.studentId === 'child-a' ? direct : [], nextBefore: null };
    if (input.action === 'list-family-messages' || input.action === 'list-group-messages') output = { messages: shared, version: 'shared', childrenCanPost: true, group: input.groupId ? group : undefined };
    if (input.action === 'media') {
      writes.push(input); await new Promise(r => setTimeout(r, 100));
      if (input.path === '/api/audiobooks/quick-control' && lost) { lost = false; res.statusCode = 503; output = { error: 'Connection interrupted after saving.' }; }
      else if (input.path === '/api/video/quick-control' && malformed) { malformed = false; output = { status: 200, body: { success: true, unlocked: false } }; }
      else { if (input.path === '/api/music/quick-control' && holdMusic) await holdMusic; output = { status: 200, body: { success: true, unlocked: true } }; }
    }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(output)); return;
  }
  res.writeHead(404); res.end();
});
let win;
const js = code => win.webContents.executeJavaScript(code, true);
const until = async code => { const end = Date.now() + 12000; while (Date.now() < end) { if (await js(code)) return; await new Promise(r => setTimeout(r, 40)); } throw Error('Timed out: ' + code); };
const watchdog = setTimeout(() => { console.error('Unlock fixture timed out'); app.exit(1); }, 60000);
(async () => {
  await app.whenReady(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith(origin) && !details.url.startsWith('data:') && !details.url.startsWith('blob:') }));
  win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  win.webContents.on('console-message', event => { if (/Uncaught|TypeError|ReferenceError/.test(event.message)) errors.push(event.message); });
  await win.loadURL(origin); await until('document.querySelectorAll(".cloud-message-media-unlock").length===1');
  assert.equal(writes.length, 0, 'Reading a child request never grants access');
  assert.equal(await js('document.querySelectorAll(".cloud-message img").length'), 0, 'Message body remains plain text');
  assert.match(await js('document.querySelector(".cloud-message-media-context").textContent'), /Alex/);
  const button = 'document.querySelector(".cloud-message-media-unlock")';
  await js(`${button}.click();${button}.click()`);
  await until('document.querySelector("[data-state=error]")');
  assert.equal(writes.length, 1, 'Double tap sends only one change');
  assert.match(await js('document.querySelector(".cloud-message-media-status").textContent'), /interrupted/);
  await js("messaging.openStudent('child-b')"); await until('document.querySelectorAll(".cloud-message").length===0');
  await js("messaging.openStudent('child-a')"); await until('document.querySelector("[data-state=error]")');
  await js(`${button}.click()`); await until('document.querySelector("[data-state=saved]")');
  assert.equal(writes.length, 2); assert.equal(writes[0].requestId, writes[1].requestId, 'Lost receipt retains retry identity across chats');
  assert.deepEqual(writes[1].body, { student_id: 'child-a', operation: 'override', unlocked: true });
  assert.equal(writes[1].path, '/api/audiobooks/quick-control'); assert.equal(await js(`${button}.disabled`), true);
  // Family and sibling conversations use the API's author ID, never the display name or body.
  await js('document.querySelector(".cloud-family-conversation-link").click()');
  await until('document.querySelectorAll(".cloud-message-media-unlock").length===2');
  assert.match(await js('document.querySelector(".cloud-message-media-context").textContent'), /Jamie/);
  assert.equal(await js('document.querySelectorAll(".cloud-message-media-actions").length'), 1, 'Missing/archived author cannot get an action');
  const video = 'document.querySelector("[data-media=video] button")', music = 'document.querySelector("[data-media=music] button")';
  await js(`${video}.click()`); await until('document.querySelector("[data-media=video][data-state=error]")');
  assert.equal(await js(`${video}.disabled`), false, 'Unconfirmed receipt is not presented as successful');
  await js(`${video}.click()`); await until('document.querySelector("[data-media=video][data-state=saved]")');
  assert.equal(writes[2].requestId, writes[3].requestId); assert.equal(writes[3].body.student_id, 'child-b');
  assert.equal(writes.filter(x => x.path.includes('/music/')).length, 0, 'Video click does not unlock music');
  await js('document.querySelector("[data-group-id=group-1]").click()');
  await until('document.querySelector("[data-media=video][data-state=saved]") && document.querySelector(".cloud-group-panel")');
  holdMusic = new Promise(r => { releaseMusic = r; }); await js(`${music}.click()`);
  await until('document.querySelector("[data-media=music][data-state=saving]")');
  await js("messaging.openStudent('child-a')"); await until('document.querySelector("[data-media=audiobook]")');
  releaseMusic(); holdMusic = null;
  await js('document.querySelector("[data-group-id=group-1]").click()'); await until('document.querySelector("[data-media=music][data-state=saved]")');
  assert.equal(writes.at(-1).body.student_id, 'child-b', 'Changing chat while saving cannot retarget an unlock');
  assert.equal(writes.at(-1).path, '/api/music/quick-control');
  assert.ok(!calls.some(x => ['send-message', 'send-shared-message'].includes(x.action)), 'No automatic message is sent');
  // An already-rendered request cannot act on a student archived by a later snapshot.
  await js("messaging.openStudent('child-a')"); await until('document.querySelector("[data-media=audiobook]")');
  direct.push(msg('new-request', 'Unlock music please')); await js("messaging.notify('child-a')"); await until('document.querySelector("[data-media=music]")');
  await js("students[0].archived_at='2026-01-01';messaging.update(students);document.querySelector('[data-media=music] button').click()");
  await new Promise(r => setTimeout(r, 150)); assert.equal(writes.length, 5);
  await js("delete students[0].archived_at;messaging.update(students);messaging.openStudent('child-b');messaging.openStudent('child-a')");
  await until('document.querySelector("[data-media=music]")');
  for (const [name, width, height] of [['phone', 390, 844], ['small-phone', 320, 700], ['desktop', 1400, 900]]) {
    win.setContentSize(width, height); await new Promise(r => setTimeout(r, 180));
    await js('document.querySelector("[data-media=music] button").scrollIntoView({block:"center"})');
    const bounds = await js(`(()=>{const button=document.querySelector('[data-media=music] button'),b=button.getBoundingClientRect(),row=button.closest('.cloud-message').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,h:b.height,w:b.width,left:b.left,right:b.right,rowRight:row.right}})()`);
    assert.equal(bounds.overflow, false); assert.ok(bounds.h >= 44 && bounds.w >= 44); assert.ok(bounds.left >= 0 && bounds.right <= bounds.rowRight + 1);
    const dir = path.join(site, '.tmp/message-unlocks-20261007'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG());
  }
  assert.deepEqual(errors, []);
  console.log('Message unlocks passed: no automatic writes, exact sender in private/family/group chats, false-positive suppression, safe text, three media routes, double taps, stable retry after navigation, malformed receipt, late response, archived author and 320/390/1400px layouts.');
})().then(() => { clearTimeout(watchdog); win?.destroy(); server.close(); app.exit(0); }).catch(error => { console.error(error); clearTimeout(watchdog); win?.destroy(); server.close(); app.exit(1); });
