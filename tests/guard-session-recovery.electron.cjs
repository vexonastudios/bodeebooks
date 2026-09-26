'use strict';
// Small phone-layout integration check. Only fictional data and a temporary profile.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-mobile-check-')));
const site = path.resolve(__dirname, '..');
const fixture = {
  serverTime: new Date().toISOString(),
  schoolActivities: [],
  students: [{ id: 'child-1', name: 'Test Child', grade: '5' }],
  devices: [{ id: 'device-1', student_id: 'child-1', computer_name: 'Test PC', current_subject: 'school-1', last_seen_at: new Date().toISOString(), app_version: 'test', revision: 1, acknowledged_revision: 1, locked: false, recovery_configured: true }],
  rules: { revision: 1, schedule: { enabled: false, timeZone: 'America/Chicago', days: [1,2,3,4,5], start: '08:00', end: '15:00', breaks: [], exceptions: [] }, subjects: [{ id: 'school-1', title: 'Abeka Academy', url: 'https://school.example', assignments: [{ studentId: 'child-1', dailyGoalMinutes: 120 }] }] },
  activity: [{ student_id: 'child-1', subject_id: 'school-1', date_utc: new Date().toISOString().slice(0, 10), seconds: 4200 }]
};
fixture.screenshotAvailability = { known: true, availableStudentIds: ['child-1'], checkedAt: new Date().toISOString() };
fixture.students = ['Alex', 'Jamie', 'Taylor', 'Morgan', 'Jordan', 'Avery', 'Casey', 'Riley', 'Sam'].map((name, i) => ({id:'child-'+(i+1),name,grade:'5'}));
const history = new Map();
history.set('child-1', [{id:'incoming-1', sender:'child', body:'I finished my reading. Can we play a game after lunch?', createdAt:new Date().toISOString()}, {id:'outgoing-1',sender:'parent',body:'Of course! Thank you for finishing your work.',createdAt:new Date().toISOString(),receivedAt:new Date().toISOString()}]);
let failSend = true;
let authFailures = 0, dashboardReads = 0;
const calls = [];
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type','text/html');res.end(`<html><style>body{margin:0}iframe{width:100%;height:100vh;border:0}</style><iframe src="/workspace/" sandbox="allow-same-origin allow-scripts allow-forms allow-modals" title="Synthetic parent dashboard"></iframe><script>window.renewDelay=1100;window.renewCount=0;addEventListener('message',event=>{const frame=document.querySelector('iframe');if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='bodeeguard-renew-session'){renewCount++;setTimeout(()=>frame.contentWindow.postMessage({type:'bodeeguard-session-ready'},location.origin),renewDelay);}});</script></html>`);return;
  }
  if (req.url === '/workspace/') {
    const workspace = JSON.parse(fs.readFileSync(path.join(site, 'app/guard/dashboard/generated/workspace.json'), 'utf8'));
    res.setHeader('Content-Type', 'text/html');
    res.end(workspace.html.replace('</head>', '<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')); return;
  }
  const assetPath = new URL(req.url, 'http://fixture.local').pathname;
  if (/^\/guard-admin\/[a-z0-9.-]+$/.test(assetPath)) {
    const file = path.join(site, 'public', assetPath);
    if (fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(fs.readFileSync(file)); return; }
  }
  if (req.url === '/guard/dashboard/bridge/' || req.url === '/guard/dashboard/upload/') {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && authFailures>0) { authFailures--;dashboardReads++;res.statusCode=401;res.end(JSON.stringify({error:'Please sign in.'}));return; }
    if (req.method === 'GET') { dashboardReads++;fixture.serverTime = new Date().toISOString(); res.end(JSON.stringify(fixture)); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const input = JSON.parse(raw); calls.push(input);
    let output = {};
    if (input.action === 'set-school-pause') { fixture.devices[0].locked = input.locked; fixture.devices[0].revision++; }
    if (input.action === 'list-grades') output = { grades: [], nextBefore: null };
    if (input.action === 'list-files') output = { files: [], usage: { bytes: 0 } };
    if (input.action === 'list-messages') output = { studentId: input.studentId, messages: input.before ? [{id:'older-1',sender:'child',body:'Yesterday’s message',createdAt:'2026-09-24T14:30:00Z'}] : history.get(input.studentId)||[], version: (history.get(input.studentId)||[]).length, nextBefore: input.before ? null : 'older-page' };
    if (input.action === 'send-message') {
      if(failSend){failSend=false;res.statusCode=503;return res.end(JSON.stringify({error:'Connection interrupted.'}));}
      const rows=history.get(input.studentId)||[];if(!rows.some(row=>row.id===input.id))rows.push({...input,sender:'parent',createdAt:new Date().toISOString()});history.set(input.studentId,rows);
      output = { id: input.id, studentId: input.studentId, saved: true };
    }
    if (input.action === 'screenshots-overview') output = { retention_days: 3, screenshots: [], availability: fixture.screenshotAvailability };
    if (input.action === 'request-screenshot') output = { id: 'request-1', student_id: 'child-1', status: 'pending', request_expires_at: new Date(Date.now() + 60000).toISOString() };
    if (input.action === 'upload-file') output = { saved: true, file: { id: input.id } };
    res.end(JSON.stringify(output)); return;
  }
  res.writeHead(404); res.end();
});
async function run() {
  await app.whenReady(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith(origin) && !details.url.startsWith('data:') && !details.url.startsWith('blob:') }));
  const win = new BrowserWindow({ show: false, width: 390, height: 844, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
  const js = source => win.webContents.mainFrame.frames[0].executeJavaScript(source, true);
  const wait = async expression => { const end = Date.now() + 10000; while (Date.now() < end) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(`Timed out: ${expression}`); };
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3 && !message.includes('ERR_BLOCKED_BY_CLIENT') && !message.includes('404')) console.error(message); });
  await win.loadURL(origin);
  await wait('document.querySelectorAll(".monitor-card").length===9');
  await js('document.querySelector("[data-mobile-tab=messages]").click();document.querySelector(".cloud-chat-person").click()');
  await wait('document.querySelector("#messages-cloud-status").textContent==="Messages updated."');
  await js('document.querySelector("#messages-reply-input").value="Keep this draft";document.querySelector(".cloud-chat-back").click();document.querySelector("[data-mobile-tab=overview]").click()');
  authFailures=1;const initialReads=dashboardReads;
  await js('document.querySelector("#cloud-refresh").click()');
  await wait('!document.querySelector(".cloud-session-notice").hidden');
  assert.equal(await js('document.querySelector("#add-student-btn").disabled'),true);
  assert.equal(await js('document.querySelector(".cloud-action-toast")?.hidden!==false'),true);
  await wait('document.querySelector(".cloud-session-notice").hidden && !document.querySelector("#add-student-btn").disabled');
  assert.equal(dashboardReads,initialReads+2);assert.equal(await win.webContents.executeJavaScript('renewCount'),1);
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Keep this draft');
  authFailures=2;await js('document.querySelector("#cloud-refresh").click()');
  await wait('!document.querySelector(".cloud-session-notice button").hidden');
  assert.equal(await js('document.querySelector("#add-student-btn").disabled'),true);
  assert.equal(await js('document.querySelector(".cloud-action-toast")?.hidden!==false'),true);
  assert.equal(await js('/expired|sign in again/i.test(document.querySelector(".cloud-session-notice").textContent)'),false);
  fs.writeFileSync(path.join(site,'.tmp','session-recovery-phone.png'),(await win.webContents.capturePage()).toPNG());
  await js('document.querySelector(".cloud-session-notice button").click()');
  await wait('document.querySelector(".cloud-session-notice").hidden && !document.querySelector("#add-student-btn").disabled');
  assert.equal(await win.webContents.executeJavaScript('renewCount'),2,'failed renewals cannot create a request loop');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Keep this draft');
  assert.ok(!calls.some(call=>call.action==='send-message'),'reconnection never submits a draft');
  assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
  win.destroy();console.log('Real iframe recovery passed: 401/renew/authorized read, quiet status, no expired-sign-in toast, disabled controls until fresh data, retained draft, failed retry and no automatic writes.');
}
run().then(() => { server.close(); app.quit(); }).catch(error => { console.error(error.stack); server.close(); app.exit(1); });
