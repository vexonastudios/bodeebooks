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
  students: [{ id: '11111111-1111-4111-8111-000000000001', name: 'Test Child', grade: '5' }],
  devices: [{ id: 'device-1', student_id: '11111111-1111-4111-8111-000000000001', computer_name: 'Test PC', current_subject: 'school-1', last_seen_at: new Date().toISOString(), app_version: 'test', revision: 1, acknowledged_revision: 1, locked: false, recovery_configured: true }],
  rules: { revision: 1, schedule: { enabled: false, timeZone: 'America/Chicago', days: [1,2,3,4,5], start: '08:00', end: '15:00', breaks: [], exceptions: [] }, subjects: [{ id: 'school-1', title: 'Abeka Academy', url: 'https://school.example', assignments: [{ studentId: '11111111-1111-4111-8111-000000000001', dailyGoalMinutes: 120 }] }] },
  activity: [{ student_id: '11111111-1111-4111-8111-000000000001', subject_id: 'school-1', date_utc: new Date().toISOString().slice(0, 10), seconds: 4200 }]
};
fixture.screenshotAvailability = { known: true, availableStudentIds: ['11111111-1111-4111-8111-000000000001'], checkedAt: new Date().toISOString() };
fixture.students = ['Alex', 'Jamie', 'Taylor', 'Morgan', 'Jordan', 'Avery', 'Casey', 'Riley', 'Sam'].map((name, i) => ({id:'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'),name,grade:'5'}));
fixture.students.forEach((student,i) => { student.last_child_message_sequence = i===0 ? '9' : i===1 ? '8' : null; });
fixture.students[0].main_school = { provider: 'abeka' };
let choresEnabled = true;
const history = new Map();
history.set('11111111-1111-4111-8111-000000000001', [{id:'incoming-1', sequence:'9', sender:'child', body:'I finished my reading. Can we play a game after lunch?', createdAt:new Date().toISOString()}, {id:'outgoing-1',sender:'parent',body:'Of course! Thank you for finishing your work.',createdAt:new Date().toISOString(),receivedAt:new Date().toISOString()}]);
const messageGroups = Array.from({length:20},(_,i)=>({id:'group-' + i,kind:i%2?'parent':'siblings',closedAt:i===0?'2026-10-05T12:00:00Z':null,members:fixture.students.filter((_,j)=>i===19||[i%9,(i+1)%9,(i+2)%9].includes(j)).map(student=>({studentId:student.id,name:student.name}))}));
let peerMessagingEnabled=false, failPeerSetting=true;
const childPeerSettings=new Map(fixture.students.map(student=>[student.id,true]));
let failSend = true, failSharedSend = true;
const calls = [];
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const workspace = JSON.parse(fs.readFileSync(path.join(site, 'app/guard/dashboard/generated/workspace.json'), 'utf8'));
    res.setHeader('Content-Type', 'text/html');
    res.end(workspace.html.replace('</head>', '<script>window.chatViews=[];addEventListener("message",event=>{if(event.source===window&&event.origin===location.origin&&event.data?.type==="bodeeguard-conversation-view")chatViews.push(event.data.studentId);});window.WebSocket=class{constructor(){window.fixtureSocket=this;setTimeout(()=>this.onopen?.(),0)}send(){this.onmessage?.({data:"pong"})}close(){}};</script><link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')); return;
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
    if (input.action === 'chores') output = { enabled: choresEnabled, revision: 1, date: new Date().toISOString().slice(0,10), timeZone: 'America/Chicago', students: fixture.students, items: [], history: [], computers: [] };
    if(input.action==='push-ticket')output={url:'wss://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/push/connect?fixture=synthetic'};
    if (input.action === 'set-school-pause') { fixture.devices[0].locked = input.locked; fixture.devices[0].revision++; }
    if (input.action === 'list-grades') output = { grades: [], nextBefore: null };
    if (input.action === 'list-files') output = { files: [], usage: { bytes: 0 } };
    if (input.action === 'list-message-groups') output = {groups:messageGroups,peerMessagingEnabled,
      childPeerSettings:[...childPeerSettings].map(([studentId,enabled])=>({studentId,enabled}))};
    if (input.action === 'list-family-messages') output = {messages:[],childrenCanPost:false,version:'0'};
    if (input.action === 'list-group-messages') output = {group:messageGroups.find(group=>group.id===input.groupId),messages:[],version:'0'};
    if (input.action === 'create-message-group') output = {group:messageGroups[19]};
    if (input.action === 'send-shared-message') {
      if(failSharedSend){failSharedSend=false;res.statusCode=503;return res.end(JSON.stringify({error:'Reply interrupted.'}));}
      output={id:input.familyThreadId,saved:true,recipients:input.recipients};
    }
    if (input.action === 'peer-message-settings') {
      if(failPeerSetting){failPeerSetting=false;res.statusCode=503;return res.end(JSON.stringify({error:'Connection interrupted.'}));}
      peerMessagingEnabled=input.enabled;output={peerMessagingEnabled};
    }
    if (input.action === 'child-peer-message-settings') {
      childPeerSettings.set(input.studentId,input.enabled);output={studentId:input.studentId,enabled:input.enabled};
    }
    if (input.action === 'list-messages') output = { studentId: input.studentId, messages: input.before ? [{id:'older-1',sender:'child',body:'Yesterday’s message',createdAt:'2026-09-24T14:30:00Z'}] : history.get(input.studentId)||[], version: (history.get(input.studentId)||[]).length, nextBefore: input.before ? null : 'older-page' };
    if (input.action === 'send-message') {
      if(failSend){failSend=false;res.statusCode=503;return res.end(JSON.stringify({error:'Connection interrupted.'}));}
      const rows=history.get(input.studentId)||[];if(!rows.some(row=>row.id===input.id))rows.push({...input,sender:'parent',createdAt:new Date().toISOString()});history.set(input.studentId,rows);
      output = { id: input.id, studentId: input.studentId, saved: true };
    }
    if (input.action === 'screenshots-overview') output = { retention_days: 3, screenshots: [], availability: fixture.screenshotAvailability };
    if (input.action === 'request-screenshot') output = { id: 'request-1', student_id: '11111111-1111-4111-8111-000000000001', status: 'pending', request_expires_at: new Date(Date.now() + 60000).toISOString() };
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
  await wait('document.querySelectorAll(".chore-child-summary").length===9');
  const visible = selector => js(`!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`);
  for (const width of [320,390,768]) {
    win.setContentSize(width,844); await new Promise(r=>setTimeout(r,100));
    const tools = await js(`[...document.querySelector('.mobile-overview-shortcuts').children].filter(el=>el.getClientRects().length).map(el=>({box:el.getBoundingClientRect().toJSON(),icon:!!el.querySelector('svg'),label:el.getAttribute('aria-label')}))`);
    assert.equal(tools.length,3,'all three parent tools share the mobile row');
    assert.ok(tools.every(tool=>tool.box.top===tools[0].box.top && tool.box.width>=44 && tool.box.height>=44 && tool.box.height<=100 && tool.icon && tool.label),'compact, labeled touch targets with Lucide icons');
    assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true,'no horizontal overflow');
    assert.equal(await visible('.monitor-card .monitor-quick-unlock'),true,'Quick Unlock is available without expanding');
    const quick = await js(`(()=>{const card=document.querySelector('.monitor-card'),control=card.querySelector('.monitor-quick-unlock'),toggle=card.querySelector('.mobile-card-toggle');return {inHeader:control.parentElement===card.querySelector('.monitor-card-top'),icon:!!control.querySelector('svg'),label:control.getAttribute('aria-label'),button:control.getBoundingClientRect().toJSON(),toggle:toggle.getBoundingClientRect().toJSON(),ring:card.querySelector('.monitor-completion-ring').getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON()};})()`);
    assert.ok(quick.inHeader && quick.icon && quick.label.includes('Quick Unlock') && quick.button.width>=44 && quick.button.height>=44,'the labeled icon control replaces the header timer');
    assert.equal(quick.button.top,quick.toggle.top,'Quick Unlock and expand are in the same header row');
    assert.ok(quick.button.left>=quick.ring.right,'Quick Unlock does not overlap the school progress ring');
    assert.ok(quick.card.height<100,'collapsed mobile card is one compact row');
    assert.equal(await js('document.querySelector(".mobile-card-time")'),null,'school duration is removed from the mobile header');
    assert.equal(await visible('.monitor-card .chore-child-summary'),false,'chores stay out of collapsed cards');
    assert.equal(await visible('.monitor-card .monitor-timer-row'),false,'school durations stay in expanded details');
    assert.equal(await visible('.monitor-card .monitor-control--close'),false,'only Quick Unlock remains in collapsed controls');
    await js('document.querySelector(".mobile-card-toggle").click()');
    assert.equal(await visible('.monitor-card .chore-child-summary'),true,'expansion reveals chores');
    assert.equal(await visible('.monitor-card .monitor-timer-row'),true,'expansion reveals school durations');
    assert.equal(await visible('.monitor-card .monitor-control--close'),true,'expansion reveals computer controls');
    await js('document.querySelector(".mobile-card-toggle").click()');
  }
  win.setContentSize(390,844); await new Promise(r=>setTimeout(r,100));
  fs.mkdirSync(path.join(site,'.tmp'),{recursive:true});
  fs.writeFileSync(path.join(site,'.tmp','mobile-overview-compact.png'),(await win.webContents.capturePage()).toPNG());
  await js('document.querySelector(".monitor-quick-unlock").click()');
  assert.equal(await js('document.querySelector("#cloud-quick-unlock-dialog").open'),true,'collapsed Quick Unlock opens the existing dialog');
  await js('document.querySelector("#cloud-quick-unlock-dialog").close();document.querySelector(".chore-summary").click()');
  assert.equal(await js('document.querySelector("#tab-chores").classList.contains("active")'),true);
  await js('document.querySelector("[data-mobile-tab=overview]").click();document.querySelector(".mobile-paper-shortcut").click()');
  assert.equal(await js('document.querySelector("#tab-grades").classList.contains("active")'),true);
  await js('document.querySelector("[data-mobile-tab=overview]").click()');
  assert.equal(await js('document.querySelector("#cloud-abeka-parent-shortcut").pathname'),'/Account/Students/AssessmentPermissions.aspx');
  choresEnabled=false;
  await js('window.dispatchEvent(new Event("cloud-chores-setting-saved"))');
  await wait('document.querySelector(".chore-summary").hidden');
  assert.equal(await visible('.chore-summary'),false,'disabled chores are not exposed by the compact layout');
  assert.equal(await js('document.querySelectorAll(".chore-child-summary").length'),0);
  choresEnabled=true;
  await js('window.dispatchEvent(new Event("cloud-chores-setting-saved"))');
  await wait('document.querySelectorAll(".chore-child-summary").length===9');
  win.setContentSize(1280,900); await new Promise(r=>setTimeout(r,100));
  assert.equal(await visible('.mobile-overview-shortcuts'),false,'mobile tool row disappears on desktop');
  assert.equal(await visible('.chore-summary'),true,'desktop keeps its chore summary');
  assert.equal(await visible('#cloud-abeka-parent-shortcut'),true,'desktop keeps Abeka access');
  assert.equal(await visible('.monitor-card .chore-child-summary'),true,'desktop card details remain visible');
  assert.equal(await js('document.querySelector(".monitor-quick-unlock").parentElement.classList.contains("monitor-primary-actions")'),true,'desktop restores the full Quick Unlock button');
  win.setContentSize(390,844); await new Promise(r=>setTimeout(r,100));
  assert.equal(await visible('.monitor-card .chore-child-summary'),false,'returning to mobile restores collapsed details');
  console.log('Mobile overview passed: 320/390/768px compact icon row, collapsed Quick Unlock, expanded chores and power controls, existing shortcut actions, optional chores visibility and desktop restoration.');
  await js('document.querySelector("[data-mobile-tab=messages]").click()');
  await wait('document.querySelectorAll(".cloud-chat-person").length===9');
  assert.equal(await js('document.querySelector(".cloud-chat-person").dataset.studentId'),'11111111-1111-4111-8111-000000000001');
  const unread = async items => { await js(`window.postMessage({type:'bodeeguard-unread',items:${JSON.stringify(items)}},location.origin)`); await new Promise(r=>setTimeout(r,100)); };
  await unread([{studentId:'11111111-1111-4111-8111-000000000004',count:1,sequence:'20'}]);
  assert.equal(await js('document.querySelector(".cloud-chat-person strong").textContent'),'Morgan','new student message moves its conversation first');
  await unread([]);
  assert.equal(await js('document.querySelector(".cloud-chat-person strong").textContent'),'Morgan','reading leaves the newest conversation first');
  await unread([{studentId:'11111111-1111-4111-8111-000000000001',count:1,sequence:'31'}]);
  assert.equal(await js('document.querySelector(".cloud-chat-person strong").textContent'),'Alex');
  await js('document.querySelector("#messages-back").click()');
  assert.equal(await js('document.querySelector("#tab-overview").classList.contains("active")'),true,'cold/list back returns to Controls');
  await js('document.querySelector("[data-mobile-tab=mobile-more]").click();document.querySelector("[data-mobile-tab=messages]").click();document.querySelector("#messages-back").click()');
  assert.equal(await js('document.querySelector("#tab-mobile-more").classList.contains("active")'),true,'back remembers the previous section');
  await js('document.querySelector("[data-mobile-tab=overview]").click();document.querySelector("[data-mobile-tab=messages]").click()');
  const listBackBox = await js('document.querySelector("#messages-back").getBoundingClientRect().toJSON()');
  assert.ok(listBackBox.width>=44 && listBackBox.height>=44);
  const capture=async name=>{await new Promise(r=>setTimeout(r,150));fs.mkdirSync(path.join(site,'.tmp'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp','messages-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  const layout=()=>js(`({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,people:getComputedStyle(document.querySelector('.cloud-chat-people')).display,chat:getComputedStyle(document.querySelector('.cloud-chat-conversation')).display,nav:getComputedStyle(document.querySelector('.bottom-nav')).display,assistant:getComputedStyle(document.querySelector('#parent-assistant-launcher')).display,composer:document.querySelector('#messages-reply-box').getBoundingClientRect().toJSON(),header:document.querySelector('.cloud-chat-heading').getBoundingClientRect().toJSON(),input:document.querySelector('#messages-reply-input').getBoundingClientRect().toJSON()})`);
  assert.equal((await layout()).chat,'none');assert.notEqual((await layout()).nav,'none');assert.equal((await layout()).assistant,'none');
  await wait('document.querySelectorAll(".cloud-group-list-item").length===19');
  assert.equal(await js('document.querySelector("#messages-tab-children").getAttribute("aria-selected")'),'true','individual children open first');
  assert.equal(await visible('#messages-all-kids'),false,'group controls do not bury children');
  assert.equal(await visible('.cloud-peer-settings'),false,'settings stay out of the conversation list');
  for(const width of [320,390,768]){
    win.setContentSize(width,844);await new Promise(r=>setTimeout(r,100));
    const nav=await js('[...document.querySelectorAll(".cloud-chat-list-toolbar button")].map(el=>el.getBoundingClientRect().toJSON())');
    await capture('navigation-check-'+width);
    assert.ok(nav.every(box=>box.width>=44 && box.height>=44),'tabs and settings have comfortable touch targets: '+JSON.stringify(nav));
    assert.ok(await js('document.querySelector(".cloud-chat-person").getBoundingClientRect().top<240'),'children are reachable at the top without scrolling past groups');
    assert.ok(await js('document.querySelector("#messages-student-list").clientHeight>480'),'children have one large scroll area');
    assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
    await capture('children-'+width);
  }
  win.setContentSize(390,844);await new Promise(r=>setTimeout(r,100));
  await js('document.querySelector("#messages-settings").click()');
  assert.equal(await js('document.querySelector("#messages-settings-dialog").open'),true);
  assert.equal(await js('document.querySelector(".cloud-peer-setting input").checked'),false);
  assert.ok(await js('document.querySelector(".cloud-peer-setting").getBoundingClientRect().height>=44'),'the entire setting label is tappable');
  const settingsBox=await js('document.querySelector("#messages-settings-dialog").getBoundingClientRect().toJSON()');
  assert.ok(settingsBox.left>=15 && settingsBox.right<=375 && settingsBox.top>0 && settingsBox.bottom<844,'settings dialog is centered within the phone');
  assert.ok(await js('document.querySelector(".cloud-peer-setting input").getBoundingClientRect().width>=44'),'the switch stays full width on mobile');
  await capture('settings');
  await js('document.querySelector(".cloud-peer-setting").click()');
  await wait('document.querySelector(".cloud-chat-settings-status").classList.contains("is-error")');
  assert.equal(await js('document.querySelector(".cloud-peer-setting input").checked'),false,'failed save restores the confirmed setting');
  assert.equal(peerMessagingEnabled,false);
  assert.equal(await visible('.cloud-chat-settings-status.is-error'),true,'save failures remain visible in the dialog');
  await js('document.querySelector(".cloud-peer-setting").click()');
  await wait('document.querySelector(".cloud-peer-setting input").checked && !document.querySelector(".cloud-peer-setting input").disabled');
  assert.equal(peerMessagingEnabled,true,'the existing API saves the toggle');
  assert.equal(await js('document.querySelectorAll(".cloud-child-peer-row input").length'),9,'all children have individual controls');
  await js('document.querySelectorAll(".cloud-child-peer-row input")[1].click()');
  await wait('!document.querySelectorAll(".cloud-child-peer-row input")[1].disabled');
  assert.equal(childPeerSettings.get(fixture.students[1].id),false,'a parent can pause one child without changing the others');
  assert.equal(childPeerSettings.get(fixture.students[0].id),true);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});
  await wait('!document.querySelector("#messages-settings-dialog").open');
  assert.equal(await js('document.activeElement.id'),'messages-settings','closing returns focus to settings');
  await js('document.querySelector("#messages-tab-groups").click()');
  assert.equal(await visible('.cloud-chat-person'),false);
  assert.equal(await visible('.cloud-family-conversation-link'),true);
  assert.equal(await visible('#messages-all-kids'),true);
  assert.equal(await js('document.querySelectorAll(".cloud-group-list-item").length'),19);
  assert.equal(await js('document.querySelector(".cloud-chat-group-copy strong").textContent'),'Family conversation');
  assert.equal(await visible('.cloud-chat-closed-badge'),false,'closed chats stay out of the active list');
  assert.ok(await js('document.querySelector("#messages-tab-groups").textContent.includes("20")'),'group count excludes archives and includes Family');
  await js('document.querySelector("#messages-archived-groups").click()');
  assert.equal(await js('document.querySelectorAll(".cloud-group-list-item").length'),1);
  assert.equal(await visible('.cloud-family-conversation-link'),false);
  assert.equal(await visible('#messages-all-kids'),false);
  assert.equal(await js('document.querySelector(".cloud-chat-search").placeholder'),'Search archived chats');
  assert.equal(await js('document.querySelector(".cloud-chat-closed-badge").textContent'),'Archived');
  await capture('archived-groups');
  await js('document.querySelector(".cloud-group-list-item").click()');
  await wait('document.querySelector("#tab-messages").dataset.messageLoad==="ready"');
  assert.equal(await visible('#messages-reply-box'),false,'archived conversations are read-only');
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("#messages-archived-groups").click()');
  assert.equal(await js('document.querySelectorAll(".cloud-group-list-item").length'),19);
  assert.equal(await visible('.cloud-chat-closed-badge'),false);
  assert.ok(await js('document.querySelector(".cloud-chat-group-rows").scrollHeight>document.querySelector(".cloud-chat-group-rows").clientHeight'),'all groups use one scrolling list');
  await capture('groups');
  await js('document.querySelector(".cloud-chat-group-rows").scrollTop=10000');
  assert.ok(await js('document.querySelector(".cloud-group-list-item:last-child").getBoundingClientRect().bottom<=document.querySelector(".cloud-chat-group-rows").getBoundingClientRect().bottom'),'the last group can be reached');
  await js('document.querySelector(".cloud-chat-group-rows").scrollTop=0;document.querySelector(".cloud-group-list-item").click()');
  await wait('document.querySelector("#tab-messages").dataset.messageView==="thread" && document.querySelector("#tab-messages").dataset.messageLoad==="ready"');
  await js('document.querySelector(".cloud-chat-back").click()');
  assert.equal(await js('document.querySelector("#messages-tab-groups").getAttribute("aria-selected")'),'true');
  await new Promise(r=>setTimeout(r,150));
  assert.equal(await js('document.activeElement.classList.contains("cloud-group-list-item")'),true,'group back restores the matching list and focus');
  await js('{const input=document.querySelector(".cloud-chat-search");input.value="Sam";input.dispatchEvent(new Event("input"));}');
  assert.equal(await js('document.querySelectorAll(".cloud-group-list-item").length'),messageGroups.filter(group=>!group.closedAt&&group.members.some(member=>member.name==='Sam')).length,'search includes group members');
  await js('document.querySelector("#messages-tab-children").click()');
  assert.equal(await js('document.querySelector(".cloud-chat-search").value'),'','children have an independent search');
  await js('{const input=document.querySelector(".cloud-chat-search");input.value="Jamie";input.dispatchEvent(new Event("input"));document.querySelector("#messages-tab-groups").focus();}');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'ArrowRight'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'ArrowRight'});
  assert.equal(await js('document.querySelector("#messages-tab-children").getAttribute("aria-selected")'),'true','arrow keys select and focus tabs');
  await js('document.querySelector("#messages-tab-groups").click()');
  assert.equal(await js('document.querySelector(".cloud-chat-search").value'),'Sam','switching keeps each tab’s search');
  await js('document.querySelector("#messages-tab-children").click()');
  assert.equal(await js('document.querySelector(".cloud-chat-search").value'),'Jamie');
  assert.equal(calls.filter(call=>call.action==='peer-message-settings').length,2,'navigation never changes sibling permissions');
  console.log('Mobile conversation navigation passed: children first, 19 active groups and a separate archive, independent searches, large touch targets, keyboard tabs, group back focus, compact settings, failed-save recovery and confirmed API save.');
  await js('document.querySelector("#messages-tab-groups").click();document.querySelector("#messages-all-kids").click()');
  await wait('document.querySelector("#messages-reply-input").disabled===false');
  assert.ok(await js('document.querySelector(".cloud-group-status").textContent.includes("already have a chat")'),'same-audience reuse is explained before sending');
  await js('{const input=document.querySelector("#messages-reply-input");input.value="Existing group draft";input.dispatchEvent(new Event("input"));document.querySelector("#messages-reply-box").requestSubmit();}');
  await wait('document.querySelector("#messages-reply-btn").disabled===false && document.querySelector("#messages-cloud-status").textContent.includes("draft is retained")');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Existing group draft');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-input").value==="" && document.querySelector("#tab-messages").dataset.messageLoad==="ready"');
  const creates=calls.filter(call=>call.action==='create-message-group'), sharedSends=calls.filter(call=>call.action==='send-shared-message');
  assert.equal(creates.length,1,'retry reuses the confirmed audience');
  assert.notEqual(creates[0].id,'group-19','the server can return an existing ID');
  assert.equal(sharedSends.length,2);
  assert.ok(sharedSends.every(call=>call.groupId==='group-19'&&call.recipients.length===9));
  assert.equal(sharedSends[0].familyThreadId,sharedSends[1].familyThreadId,'retry does not create another post');
  assert.equal(await js('document.querySelector(".cloud-group-status").textContent.includes("already have a chat")'),false,'successful send opens the existing conversation');
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("#messages-tab-children").click()');
  console.log('Group reuse passed: archive isolation, read-only history, canonical ID reuse, retained draft, idempotent retry and existing conversation navigation.');
  await capture('list');
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='Jamie';s.dispatchEvent(new Event('input'));}`);
  assert.equal(await js('document.querySelectorAll(".cloud-chat-person").length'),1);
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='Not a child';s.dispatchEvent(new Event('input'));}`);
  assert.equal(await js('document.querySelectorAll(".cloud-chat-person").length'),0);
  await js(`{const s=document.querySelector('.cloud-chat-search');s.value='';s.dispatchEvent(new Event('input'));document.querySelector('.cloud-chat-person').click();}`);
  await wait('document.querySelectorAll(".cloud-message").length===2');
  await wait('window.chatViews.at(-1)==="11111111-1111-4111-8111-000000000001"');
  const activeChild=fixture.students[0].id;
  history.get(activeChild).push({id:'incoming-live',sequence:'32',sender:'child',body:'Synthetic live reply',createdAt:new Date().toISOString()});
  await js('window.fixtureSocket.onmessage({data:JSON.stringify({kind:"messages",studentId:"11111111-1111-4111-8111-000000000001"})})');
  await wait('document.querySelectorAll(".cloud-message").length===3');
  await js('document.querySelector(".cloud-chat-back").click()');
  await wait('window.chatViews.at(-1)===null');
  await js('document.querySelector(".cloud-chat-person").click()');
  await wait('window.chatViews.at(-1)==="11111111-1111-4111-8111-000000000001"');
  await js('window.fixtureSocket.onerror()');
  await wait('window.chatViews.at(-1)===null');
  await wait('window.chatViews.at(-1)==="11111111-1111-4111-8111-000000000001"');

  for(const [label,width,height]of [['chat',390,844],['small',320,568],['keyboard',390,420],['landscape',844,390]]){
    win.setContentSize(width,height);await new Promise(r=>setTimeout(r,150));
    const state=await layout();assert.equal(state.people,'none');assert.equal(state.nav,'none');assert.equal(state.overflow,false);assert.ok(state.composer.bottom<=state.height+1,JSON.stringify(state));assert.ok(state.composer.top>state.header.bottom);assert.ok(state.input.width>70);await capture(label);
  }
  win.setContentSize(390,844);await new Promise(r=>setTimeout(r,100));
  await js(`{const t=document.querySelector('#messages-reply-input');t.value='Draft for Alex';t.dispatchEvent(new Event('input'));document.querySelector('.cloud-chat-back').click();document.querySelector('.cloud-chat-person[data-student-id="11111111-1111-4111-8111-000000000002"]').click();}`);
  await wait('document.querySelector("#messages-thread-header").textContent==="Jamie"');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'');
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-person").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Draft for Alex');
  await wait('document.querySelector("#messages-cloud-status").textContent==="Messages updated."');
  await js('document.querySelector("#messages-reply-input").focus()');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
  await wait('document.querySelector("#messages-cloud-status").textContent.includes("Draft retained")');
  assert.equal(await js('document.querySelector("#messages-reply-btn").getAttribute("aria-label")'),'Retry same message');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-input").value===""');
  const sends=calls.filter(x=>x.action==='send-message');assert.equal(sends.length,2);assert.equal(sends[0].id,sends[1].id);assert.equal(sends[0].studentId,'11111111-1111-4111-8111-000000000001');
  await wait('document.querySelectorAll(".cloud-message").length===4');
  await js('document.querySelector("#messages-older").click()');await wait('document.querySelectorAll(".cloud-message").length===5');
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
  // Notification navigation puts the desktop reply box in focus without a click.
  await js('window.postMessage({type:"bodeeguard-open-messages",studentId:"11111111-1111-4111-8111-000000000001"},location.origin)');
  await wait('document.activeElement.id==="messages-reply-input"');
  await js('document.querySelector("#messages-reply-input").value="First line";window.postMessage({type:"bodeeguard-open-messages",studentId:"11111111-1111-4111-8111-000000000001"},location.origin)');
  await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'First line','notification reopen keeps the existing draft');
  await js('document.querySelector("#messages-reply-input").setSelectionRange(10,10)');
  // Desktop keyboard sends through the same composer; Shift+Enter keeps multiline drafts.
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter',modifiers:['shift']});
  win.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers:['shift']});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter',modifiers:['shift']});
  await wait('document.querySelector("#messages-reply-input").value.includes(String.fromCharCode(10))');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'), 'First line\n');
  await js('document.querySelector("#messages-reply-input").value+="Second line";for(const options of [{isComposing:true},{keyCode:229},{repeat:true}])document.querySelector("#messages-reply-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true,...options}))');
  assert.equal(calls.filter(x=>x.action==='send-message').length,2,'newline, IME and held Enter do not send');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
  await wait('document.querySelector("#messages-reply-input").value===""');
  assert.equal(calls.filter(x=>x.action==='send-message').length,3);
  assert.equal(calls.filter(x=>x.action==='send-message')[2].body,'First line\nSecond line');
  await js('document.querySelector("#messages-reply-input").focus()');
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});
  win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});
  await new Promise(r=>setTimeout(r,100));
  assert.equal(calls.filter(x=>x.action==='send-message').length,3,'empty Enter does not send');
  console.log('Mobile messages passed: visible chat leases, incoming live reply, list/connection-loss release, reconnect, desktop/phone Enter sends, Shift+Enter multiline, IME/repeat/empty guards, latest student first/read-stable order, previous-section back, nine-child list/search, full-screen chat, four sizes, drafts, exact-ID send retry, older messages, attachment removal, navigation and desktop split view.');win.destroy();
}
run().then(() => { server.close(); app.quit(); }).catch(error => { console.error(error.stack); server.close(); app.exit(1); });
