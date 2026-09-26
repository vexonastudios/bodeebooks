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
const calls = [];
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
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
    if (req.method === 'GET') { fixture.serverTime = new Date().toISOString(); res.end(JSON.stringify(fixture)); return; }
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
  const js = source => win.webContents.executeJavaScript(source, true);
  const wait = async expression => { const end = Date.now() + 10000; while (Date.now() < end) { if (await js(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(`Timed out: ${expression}`); };
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3 && !message.includes('ERR_BLOCKED_BY_CLIENT') && !message.includes('404')) console.error(message); });
  await win.loadURL(origin);
  await wait('document.querySelectorAll(".monitor-card").length===9');
  await js('document.querySelector("[data-mobile-tab=messages]").click()');
  await wait('document.querySelectorAll(".cloud-chat-person").length===9');
  const capture=async name=>{await new Promise(r=>setTimeout(r,150));fs.mkdirSync(path.join(site,'.tmp'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp','messages-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  const layout=()=>js(`({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,people:getComputedStyle(document.querySelector('.cloud-chat-people')).display,chat:getComputedStyle(document.querySelector('.cloud-chat-conversation')).display,nav:getComputedStyle(document.querySelector('.bottom-nav')).display,assistant:getComputedStyle(document.querySelector('#parent-assistant-launcher')).display,composer:document.querySelector('#messages-reply-box').getBoundingClientRect().toJSON(),header:document.querySelector('.cloud-chat-heading').getBoundingClientRect().toJSON(),input:document.querySelector('#messages-reply-input').getBoundingClientRect().toJSON()})`);
  assert.equal((await layout()).chat,'none');assert.notEqual((await layout()).nav,'none');assert.equal((await layout()).assistant,'none');
  await capture('list');
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='Jamie';s.dispatchEvent(new Event('input'));}`);
  assert.equal(await js('document.querySelectorAll(".cloud-chat-person").length'),1);
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='Not a child';s.dispatchEvent(new Event('input'));}`);
  assert.equal(await js('document.querySelectorAll(".cloud-chat-person").length'),0);
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='';s.dispatchEvent(new Event('input'));document.querySelector('.cloud-chat-person').click();}`);
  await wait('document.querySelectorAll(".cloud-message").length===2');
  for(const [label,width,height]of [['chat',390,844],['small',320,568],['keyboard',390,420],['landscape',844,390]]){
    win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));
    const state=await layout();assert.equal(state.people,'none');assert.equal(state.nav,'none');assert.equal(state.overflow,false);assert.ok(state.composer.bottom<=state.height+1,JSON.stringify(state));assert.ok(state.composer.top>state.header.bottom);assert.ok(state.input.width>70);await capture(label);
  }
  win.setContentSize(390,844);await new Promise(r=>setTimeout(r,100));
  await js(`{const t=document.querySelector('#messages-reply-input');t.value='Draft for Alex';t.dispatchEvent(new Event('input'));document.querySelector('.cloud-chat-back').click();document.querySelectorAll('.cloud-chat-person')[1].click();}`);
  await wait('document.querySelector("#messages-thread-header").textContent==="Jamie"');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'');
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-person").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Draft for Alex');
  await wait('document.querySelector("#messages-cloud-status").textContent==="Messages updated."');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-cloud-status").textContent.includes("Draft retained")');
  assert.equal(await js('document.querySelector("#messages-reply-btn").getAttribute("aria-label")'),'Retry same message');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-input").value===""');
  const sends=calls.filter(x=>x.action==='send-message');assert.equal(sends.length,2);assert.equal(sends[0].id,sends[1].id);assert.equal(sends[0].studentId,'child-1');
  await wait('document.querySelectorAll(".cloud-message").length===3');
  await js('document.querySelector("#messages-older").click()');await wait('document.querySelectorAll(".cloud-message").length===4');
  await js(`{const d=new DataTransfer();d.items.add(new File(['synthetic'],'school.pdf',{type:'application/pdf'}));const f=document.querySelector('#messages-attachment');f.files=d.files;f.dispatchEvent(new Event('change'));}`);
  assert.equal(await js('document.querySelector("#messages-attachment-status").textContent'),'school.pdf');
  await js('document.querySelector("#messages-attachment-clear").click()');assert.equal(await js('document.querySelector("#messages-attachment-clear").hidden'),true);
  await js(`{const t=document.querySelector('#messages-reply-input');t.value=Array(10).fill('A longer message').join(String.fromCharCode(10));t.dispatchEvent(new Event('input'));}`);
  assert.ok((await layout()).input.height<=112);assert.ok((await layout()).composer.bottom<=844);
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("[data-mobile-tab=overview]").click()');
  assert.equal(await js('document.body.classList.contains("cloud-messages-active")'),false);assert.equal(await js('document.body.classList.contains("cloud-conversation-open")'),false);
  await js('document.querySelector("[data-mobile-tab=messages]").click()');
  win.setContentSize(1365,900);await wait('!document.body.classList.contains("cloud-mobile")');
  assert.notEqual((await layout()).people,'none');assert.notEqual((await layout()).chat,'none');await capture('desktop');
  console.log('Mobile messages passed: nine-child list/search, full-screen chat, four sizes, drafts, exact-ID send retry, older messages, attachment removal, navigation and desktop split view.');win.destroy();
}
run().then(() => { server.close(); app.quit(); }).catch(error => { console.error(error.stack); server.close(); app.exit(1); });
