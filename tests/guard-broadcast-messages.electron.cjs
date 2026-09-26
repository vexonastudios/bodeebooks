'use strict';
// Small phone-layout integration check. Only fictional data and a temporary profile.
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
if (app.isPackaged) throw Error('Development fixture only');
app.commandLine.appendSwitch('use-fake-device-for-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-broadcast-check-')));
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
fixture.students[8].archived_at = '2026-09-01T00:00:00Z';
let lostMessage = true, lostUpload = true;
const uploaded = new Map();
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
      if(input.fileId) assert.equal(uploaded.get(input.fileId)?.studentId,input.studentId,'attachments remain child-scoped');
      const rows=history.get(input.studentId)||[];if(!rows.some(row=>row.id===input.id))rows.push({...input,sender:'parent',createdAt:new Date().toISOString()});history.set(input.studentId,rows);
      if(lostMessage && input.studentId==='child-3' && input.body.includes('Dinner')){lostMessage=false;res.statusCode=503;return res.end(JSON.stringify({error:'Saved, but connection interrupted.'}));}
      output = { id: input.id, studentId: input.studentId, saved: true };
    }
    if (input.action === 'screenshots-overview') output = { retention_days: 3, screenshots: [], availability: fixture.screenshotAvailability };
    if (input.action === 'request-screenshot') output = { id: 'request-1', student_id: 'child-1', status: 'pending', request_expires_at: new Date(Date.now() + 60000).toISOString() };
    if (input.action === 'upload-file') {
      if(uploaded.has(input.id)) assert.deepEqual(uploaded.get(input.id),input,'upload retry cannot change recipient or content');
      uploaded.set(input.id,input);
      if(lostUpload && input.studentId==='child-2'){lostUpload=false;res.statusCode=503;return res.end(JSON.stringify({error:'Upload confirmation interrupted.'}));}
      output = { saved: true, file: { id: input.id } };
    }
    res.end(JSON.stringify(output)); return;
  }
  res.writeHead(404); res.end();
});
async function run() {
  await app.whenReady(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('blob:')&& !details.url.startsWith('data:')}));
  session.defaultSession.setPermissionRequestHandler((_webContents,permission,callback)=>callback(permission==='media'));
  const win=new BrowserWindow({show:false,width:390,height:844,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const js=source=>win.webContents.executeJavaScript(source,true);
  const wait=async expression=>{const end=Date.now()+12000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,60));}throw Error('Timed out: '+expression);};
  const capture=async name=>{await new Promise(r=>setTimeout(r,150));fs.mkdirSync(path.join(site,'.tmp'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp','broadcast-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await win.loadURL(origin);
  await wait('document.querySelectorAll(".monitor-card").length>=8');
  await js('document.querySelector("[data-mobile-tab=messages]").click()');
  await wait('document.querySelector("#messages-all-kids small").textContent.includes("8")');
  assert.equal(await js('document.querySelector("#messages-all-kids").getBoundingClientRect().bottom<innerHeight'),true);
  await capture('phone-list');
  // Filtering the list must not accidentally narrow "all"; archived profiles are excluded.
  await js('document.querySelector(".cloud-chat-search").value="Jamie";document.querySelector(".cloud-chat-search").dispatchEvent(new Event("input"));document.querySelector("#messages-all-kids").click()');
  assert.equal(await js('document.querySelectorAll(".cloud-broadcast-recipients li").length'),8);
  assert.equal(await js('document.querySelector("#messages-older").hidden'),true);
  assert.equal(calls.filter(c=>c.action==='list-messages').length,0,'broadcast is not a group/sibling conversation');
  for(const [label,width,height]of [['compose',390,844],['small',320,568],['keyboard',390,420],['landscape',844,390]]){
    win.setContentSize(width,height);await new Promise(r=>setTimeout(r,100));
    const bounds=await js('({overflow:document.documentElement.scrollWidth>innerWidth,composer:document.querySelector("#messages-reply-box").getBoundingClientRect().toJSON(),head:document.querySelector(".cloud-chat-heading").getBoundingClientRect().toJSON(),h:innerHeight})');
    assert.equal(bounds.overflow,false);assert.ok(bounds.composer.bottom<=bounds.h+1);assert.ok(bounds.composer.top>bounds.head.bottom);await capture(label);
  }
  win.setContentSize(390,844);
  await js('document.querySelector("#messages-reply-input").value="Dinner in ten minutes <img src=x onerror=alert(1)>";document.querySelector("#messages-reply-box").requestSubmit();document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Retry remaining"');
  assert.equal(calls.filter(c=>c.action==='send-message').length,3,'double tap must not start another batch');
  assert.equal(await js('document.querySelectorAll(".cloud-broadcast-recipients .is-saved").length'),2);
  assert.equal(await js('document.querySelector(".cloud-broadcast img")'),null,'message uses safe text');
  assert.equal(await js('document.querySelector("#messages-reply-input").disabled'),true);
  assert.equal(await js('(()=>{const e=new Event("beforeunload",{cancelable:true});dispatchEvent(e);return e.defaultPrevented;})()'),true);
  await capture('partial');
  // A newly added profile must not silently join an already-started retry.
  fixture.students.push({id:'child-10',name:'New Child',grade:'4'});
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("[data-mobile-tab=overview]").click();document.querySelector("#cloud-refresh").click()');
  await wait('document.querySelector("#messages-all-kids small").textContent.includes("9")');
  await js('document.querySelector("[data-mobile-tab=messages]").click();document.querySelector("#messages-all-kids").click()');
  assert.equal(await js('document.querySelectorAll(".cloud-broadcast-recipients li").length'),8);
  await js('document.querySelector(".cloud-broadcast-retry").click()');
  await wait('document.querySelector(".cloud-broadcast h3").textContent==="Sent to all 8 kids"');
  const dinner=calls.filter(c=>c.action==='send-message'&&c.body.startsWith('Dinner'));
  assert.equal(dinner.length,9);assert.equal(new Set(dinner.map(c=>c.id)).size,8);
  assert.equal(dinner.filter(c=>c.studentId==='child-1').length,1);assert.equal(dinner.filter(c=>c.studentId==='child-3').length,2);
  assert.equal(dinner.filter(c=>c.studentId==='child-3')[0].id,dinner.filter(c=>c.studentId==='child-3')[1].id);
  assert.ok(!dinner.some(c=>['child-9','child-10'].includes(c.studentId)));
  assert.equal([...history.values()].flat().filter(m=>m.body.startsWith('Dinner')).length,8,'lost reply retry creates exactly one message per child');
  // One person's existing draft survives, and their history contains the broadcast.
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-search").value="";document.querySelector(".cloud-chat-search").dispatchEvent(new Event("input"));document.querySelector(".cloud-chat-person").click()');
  await wait('[...document.querySelectorAll(".cloud-message p")].some(p=>p.textContent.startsWith("Dinner"))');
  await js('document.querySelector("#messages-reply-input").value="Private draft";document.querySelector(".cloud-chat-back").click();document.querySelector("#messages-all-kids").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'');
  // Attachments use one stable upload/message ID per child, even after a lost upload reply.
  await js(`{const d=new DataTransfer();d.items.add(new File(['%PDF-1.7 synthetic'],'school.pdf',{type:'application/pdf'}));const f=document.querySelector('#messages-attachment');f.files=d.files;f.dispatchEvent(new Event('change'));document.querySelector('#messages-reply-box').requestSubmit();}`);
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Retry remaining"');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector(".cloud-broadcast h3").textContent==="Sent to all 9 kids"');
  const uploads=calls.filter(c=>c.action==='upload-file');assert.equal(uploads.length,10);assert.equal(uploaded.size,9);
  const child2=uploads.filter(c=>c.studentId==='child-2');assert.equal(child2[0].id,child2[1].id);
  const attached=calls.filter(c=>c.action==='send-message'&&c.fileId);assert.equal(attached.length,9);assert.equal(new Set(attached.map(c=>c.fileId)).size,9);
  // Actual voice recording uses the same all-kids path, then its private copies.
  await js('document.querySelector("#messages-record").click()');
  await wait('document.querySelector("#messages-record").classList.contains("recording")');
  await new Promise(r=>setTimeout(r,1200));
  await js('document.querySelector("#messages-record").click()');
  await wait('!document.querySelector("#messages-voice-preview").hidden');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector(".cloud-broadcast h3").textContent==="Sent to all 9 kids" && document.querySelector("#messages-voice-preview").hidden');
  const voicesSent=calls.filter(c=>c.action==='send-message'&&c.body.startsWith('Voice message'));
  assert.equal(voicesSent.length,9);assert.ok(voicesSent.every(c=>uploaded.get(c.fileId).mime.startsWith('audio/')));
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-person").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Private draft');
  // Desktop keeps the same visible entry; even fully offline children are included.
  win.setContentSize(1365,900);await wait('!document.body.classList.contains("cloud-mobile")');
  await js('document.querySelector("#messages-all-kids").click()');await capture('desktop');
  assert.equal(await js('getComputedStyle(document.querySelector("#messages-all-kids")).display'),'flex');
  assert.ok(dinner.some(c=>c.studentId==='child-8'),'offline child still receives a saved message');
  assert.ok(!calls.some(c=>c.studentId==='all-kids'),'never send pseudo-recipient to API');
  win.destroy();console.log('Broadcast passed: visible mobile/desktop, nine-child layout, archived exclusion, filtered list, partial/lost replies, exact retries, frozen recipients, separate histories/drafts, child-scoped attachments, real voice capture and offline recipients.');
}
run().then(()=>{server.close();app.quit();}).catch(error=>{console.error(error.stack);server.close();app.exit(1);});
