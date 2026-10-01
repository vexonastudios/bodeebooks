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
let childrenCanPost = false;
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
    if (input.action === 'list-messages') output = { studentId: input.studentId, messages: input.before ? [{id:'older-1',sender:'child',body:'Yesterday’s message',createdAt:'2026-09-24T14:30:00Z'}] : (history.get(input.studentId)||[]).filter(item=>!item.familyThreadId), version: (history.get(input.studentId)||[]).length, nextBefore: input.before ? null : 'older-page' };
    if (input.action === 'list-family-messages') {
      const messages=[...new Map([...history.values()].flat().filter(item=>item.familyThreadId).map(item=>[item.familyThreadId,{id:item.familyThreadId,sender:item.sender,senderName:'Mom & Dad',body:item.body,createdAt:item.createdAt,reactions:item.reactions||[],attachment:item.fileId?{id:item.fileId,name:uploaded.get(item.fileId)?.name||'Attachment',mime:uploaded.get(item.fileId)?.mime||'application/pdf',size:atob(uploaded.get(item.fileId)?.data||'').length}:undefined}])).values()];
      output={messages,version:String(messages.length)+String(childrenCanPost),childrenCanPost,nextBefore:null};
    }
    if (input.action === 'family-message-settings') { childrenCanPost=input.childrenCanPost; output={childrenCanPost}; }
    if (input.action === 'send-message') {
      if(input.fileId) assert.equal(uploaded.get(input.fileId)?.studentId,input.studentId,'attachments remain child-scoped');
      const rows=history.get(input.studentId)||[];if(!rows.some(row=>row.id===input.id))rows.push({...input,sender:'parent',createdAt:new Date().toISOString()});history.set(input.studentId,rows);
      if(lostMessage && input.studentId==='child-3' && input.body.includes('Dinner')){lostMessage=false;res.statusCode=503;return res.end(JSON.stringify({error:'Saved, but connection interrupted.'}));}
      output = { id: input.id, studentId: input.studentId, saved: true };
    }
    if (input.action === 'list-message-groups') output={groups:[],peerMessagingEnabled:true};
    if (input.action === 'send-shared-message') {
      assert.equal(input.recipients.every(person=>fixture.students.some(student=>student.id===person.studentId&&!student.archived_at)),true);
      for(const person of input.recipients){
        if(person.fileId) assert.equal(uploaded.get(person.fileId)?.studentId,person.studentId,'attachments remain child-scoped');
        const rows=history.get(person.studentId)||[];
        if(!rows.some(row=>row.id===person.id))rows.push({id:person.id,familyThreadId:input.familyThreadId,body:input.body,fileId:person.fileId,sender:'parent',createdAt:new Date().toISOString()});
        history.set(person.studentId,rows);
      }
      if(lostMessage && input.body.includes('Dinner')){lostMessage=false;res.statusCode=503;return res.end(JSON.stringify({error:'Saved, but connection interrupted.'}));}
      output={id:input.familyThreadId,saved:true,recipients:input.recipients.map(person=>person.studentId)};
    }
    if (input.action === 'react-message' && input.shared) {
      for(const rows of history.values()) for(const row of rows) if(row.familyThreadId===input.messageId)row.reactions=input.emoji?[{emoji:input.emoji,count:1,mine:true,from:['parent']}]:[];
      output={id:input.messageId,saved:true,reactions:input.emoji?[{emoji:input.emoji,count:1,mine:true,from:['parent']}]:[]};
    }
    if (input.action === 'screenshots-overview') output = { retention_days: 3, screenshots: [], availability: fixture.screenshotAvailability };
    if (input.action === 'request-screenshot') output = { id: 'request-1', student_id: 'child-1', status: 'pending', request_expires_at: new Date(Date.now() + 60000).toISOString() };
    if (input.action === 'upload-file') {
      if(uploaded.has(input.id)) assert.deepEqual(uploaded.get(input.id),input,'upload retry cannot change recipient or content');
      uploaded.set(input.id,input);
      if(lostUpload && input.studentId==='child-2'){lostUpload=false;res.statusCode=503;return res.end(JSON.stringify({error:'Upload confirmation interrupted.'}));}
      output = { saved: true, file: { id: input.id } };
    }
    if (input.action === 'read-file') {
      const file=uploaded.get(input.id);
      output={file:{id:input.id,name:file.name,mime:file.mime,size:atob(file.data).length,removed:false},data:file.data};
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
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 2 && !message.includes('ERR_BLOCKED_BY_CLIENT')) console.error('Browser:', message); });
  const js=source=>win.webContents.executeJavaScript(source,true);
  const wait=async expression=>{const end=Date.now()+12000;while(Date.now()<end){if(await js(expression))return;await new Promise(r=>setTimeout(r,60));}throw Error('Timed out: '+expression);};
  const capture=async name=>{await new Promise(r=>setTimeout(r,150));fs.mkdirSync(path.join(site,'.tmp'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp','broadcast-'+name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await win.loadURL(origin);
  const compressedPhoto=await js(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=2200;canvas.height=1800;
    const context=canvas.getContext('2d'),image=context.createImageData(canvas.width,canvas.height);
    let seed=1;for(let i=0;i<image.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;
      image.data[i]=seed&255;image.data[i+1]=seed>>>8;image.data[i+2]=seed>>>16;image.data[i+3]=255;}
    context.putImageData(image,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.98));
    const original=new File([blob],'new photo.jpg',{type:'image/jpeg'});
    const saved=await window.cloudFileTools.encode(original,'message');
    return {original:original.size,saved:atob(saved.data).length,mime:saved.mime};
  })()`);
  assert.ok(compressedPhoto.original>2*1024*1024,'synthetic camera photo exceeds the old upload limit');
  assert.ok(compressedPhoto.saved<2*1024*1024,'the real browser canvas produces an uploadable photo');
  assert.equal(compressedPhoto.mime,'image/jpeg');
  await wait('document.querySelectorAll(".monitor-card").length>=8');
  await js('document.querySelector("[data-mobile-tab=messages]").click()');
  await wait('document.querySelector("#messages-all-kids small").textContent.includes("8")');
  assert.equal(await js('document.querySelector("#messages-all-kids").getBoundingClientRect().bottom<innerHeight'),true);
  await capture('phone-list');
  // Filtering the list must not accidentally narrow "all"; archived profiles are excluded.
  await js('document.querySelector(".cloud-chat-search").value="Jamie";document.querySelector(".cloud-chat-search").dispatchEvent(new Event("input"));document.querySelector(".cloud-family-conversation-link").click()');
  await wait('document.querySelector(".cloud-family-thread-intro") && !document.querySelector(".cloud-family-thread-setting input").disabled');
  assert.equal(await js('document.querySelector(".cloud-family-thread-setting input").checked'),false);
  assert.equal(await js('document.querySelector("#messages-older").hidden'),true);
  assert.equal(calls.filter(c=>c.action==='list-messages').length,0,'family room is separate from one-to-one conversations');
  assert.ok(calls.some(c=>c.action==='list-family-messages'));
  for(const [label,width,height]of [['compose',390,844],['small',320,568],['keyboard',390,420],['landscape',844,390]]){
    win.setContentSize(width,height);await new Promise(r=>setTimeout(r,100));
    const bounds=await js('({overflow:document.documentElement.scrollWidth>innerWidth,composer:document.querySelector("#messages-reply-box").getBoundingClientRect().toJSON(),head:document.querySelector(".cloud-chat-heading").getBoundingClientRect().toJSON(),h:innerHeight})');
    assert.equal(bounds.overflow,false);assert.ok(bounds.composer.bottom<=bounds.h+1);assert.ok(bounds.composer.top>bounds.head.bottom);await capture(label);
  }
  win.setContentSize(390,844);
  await js('document.querySelector("#messages-reply-input").value="Dinner in ten minutes <img src=x onerror=alert(1)>";for(let i=0;i<2;i++)document.querySelector("#messages-reply-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}))');
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Retry message"');
  assert.equal(calls.filter(c=>c.action==='send-shared-message').length,1,'double tap must not start another batch');
  assert.match(await js('document.querySelector(".cloud-family-thread-progress").textContent'),/No partial post was published/);
  assert.equal(await js('document.querySelector(".cloud-family-thread-rows img")'),null,'message uses safe text');
  assert.equal(await js('document.querySelector("#messages-reply-input").disabled'),true);
  assert.equal(await js('(()=>{const e=new Event("beforeunload",{cancelable:true});dispatchEvent(e);return e.defaultPrevented;})()'),true);
  await capture('retry');
  // A newly added profile must not silently join an already-started retry.
  fixture.students.push({id:'child-10',name:'New Child',grade:'4'});
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("[data-mobile-tab=overview]").click();document.querySelector("#cloud-refresh").click()');
  await wait('document.querySelector("#messages-all-kids small").textContent.includes("9")');
  await js('document.querySelector("[data-mobile-tab=messages]").click();document.querySelector(".cloud-family-conversation-link").click()');
  assert.match(await js('document.querySelector(".cloud-family-thread-progress").textContent'),/No partial post was published/);
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Send to family"');
  const dinner=calls.filter(c=>c.action==='send-shared-message'&&c.body.startsWith('Dinner'));
  assert.equal(dinner.length,2);assert.equal(new Set(dinner.map(c=>c.familyThreadId)).size,1);
  assert.deepEqual(dinner[0].recipients,dinner[1].recipients,'an uncertain retry preserves every ID and recipient');
  assert.ok(!dinner[0].recipients.some(c=>['child-9','child-10'].includes(c.studentId)));
  assert.equal([...history.values()].flat().filter(m=>m.body.startsWith('Dinner')).length,8,'lost reply retry creates exactly one message per child');
  await wait('document.querySelector(".cloud-family-thread-rows .cloud-message")');
  await js('document.querySelector(".cloud-family-thread-rows .message-reaction-trigger").click();document.querySelector(".message-reaction-picker:not([hidden]) button").click()');
  await wait('document.querySelector(".cloud-family-thread-rows .message-reaction-badge")');
  assert.equal(calls.filter(c=>c.action==='react-message'&&c.shared).length,1,'family reactions use the shared thread ID');
  // One person's existing draft survives; the family post stays in its own thread.
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-search").value="";document.querySelector(".cloud-chat-search").dispatchEvent(new Event("input"));document.querySelector(".cloud-chat-person").click()');
  await wait('document.querySelector(".cloud-message p")');
  assert.equal(await js('[...document.querySelectorAll(".cloud-message p")].some(p=>p.textContent.startsWith("Dinner"))'),false);
  await js('document.querySelector("#messages-reply-input").value="Private draft";document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-family-conversation-link").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'');
  // Attachments use one stable upload/message ID per child, even after a lost upload reply.
  await js(`{const d=new DataTransfer();d.items.add(new File(['%PDF-1.7 synthetic'],'school.pdf',{type:'application/pdf'}));const f=document.querySelector('#messages-attachment');f.files=d.files;f.dispatchEvent(new Event('change'));document.querySelector('#messages-reply-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}`);
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Retry message"');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Send to family"');
  const uploads=calls.filter(c=>c.action==='upload-file');assert.equal(uploads.length,10);assert.equal(uploaded.size,9);
  const child2=uploads.filter(c=>c.studentId==='child-2');assert.equal(child2[0].id,child2[1].id);
  const attached=calls.filter(c=>c.action==='send-shared-message'&&c.recipients.some(person=>person.fileId));assert.equal(attached.length,1);assert.equal(new Set(attached[0].recipients.map(c=>c.fileId)).size,9);
  await js(`(async()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=48;const context=canvas.getContext('2d');context.fillStyle='#18a999';context.fillRect(0,0,64,48);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.8));const d=new DataTransfer();d.items.add(new File([blob],'family-photo.jpg',{type:'image/jpeg'}));const f=document.querySelector('#messages-attachment');f.files=d.files;f.dispatchEvent(new Event('change'));document.querySelector('#messages-reply-input').value='Picture';document.querySelector('#messages-reply-box').requestSubmit();})()`);
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Send to family"');
  await wait('document.querySelector(".cloud-family-thread-rows .cloud-inline-image")');
  await wait('document.querySelector(".cloud-family-thread-rows .cloud-inline-image img").naturalWidth===64');
  assert.ok(calls.some(c=>c.action==='read-file'),'image is loaded inline through the authenticated file route');
  // Actual voice recording uses the same all-kids path, then its private copies.
  await js('document.querySelector("#messages-record").click()');
  await wait('document.querySelector("#messages-record").classList.contains("recording")');
  const beforeRecordingSends = calls.filter(c=>c.action==='send-shared-message').length;
  await js('document.querySelector("#messages-reply-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}))');
  assert.equal(calls.filter(c=>c.action==='send-shared-message').length,beforeRecordingSends,'Enter does not submit an unfinished voice recording');
  await new Promise(r=>setTimeout(r,1200));
  await js('document.querySelector("#messages-record").click()');
  await wait('!document.querySelector("#messages-voice-preview").hidden');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-reply-btn").getAttribute("aria-label")==="Send to family" && document.querySelector("#messages-voice-preview").hidden');
  const voicesSent=calls.filter(c=>c.action==='send-shared-message'&&c.body.startsWith('Voice message'));
  assert.equal(voicesSent.length,1);assert.ok(voicesSent[0].recipients.every(c=>uploaded.get(c.fileId).mime.startsWith('audio/')));
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector(".cloud-chat-person").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Private draft');
  // Desktop keeps the same visible entry; even fully offline children are included.
  win.setContentSize(1365,900);await wait('!document.body.classList.contains("cloud-mobile")');
  await js('document.querySelector(".cloud-family-conversation-link").click()');await capture('desktop');
  await wait('document.querySelectorAll(".cloud-family-thread-rows .cloud-message").length>=3');
  await js('document.querySelector(".cloud-family-thread-setting input").click()');
  await wait('document.querySelector(".cloud-family-thread-setting input").checked');
  { const end=Date.now()+5000; while(!calls.some(c=>c.action==='family-message-settings')&&Date.now()<end) await new Promise(r=>setTimeout(r,40)); }
  assert.equal(calls.filter(c=>c.action==='family-message-settings').at(-1).childrenCanPost,true);
  assert.equal(await js('getComputedStyle(document.querySelector("#messages-all-kids")).display'),'flex');
  assert.ok(dinner[0].recipients.some(c=>c.studentId==='child-8'),'offline child still receives a saved message');
  assert.ok(!calls.some(c=>c.studentId==='all-kids'),'never send pseudo-recipient to API');
  win.destroy();console.log('Family chat passed: one atomic text/file/voice send, exact retry, frozen recipients, separate histories and drafts, child-scoped attachments, and mobile/desktop layout.');
}
run().then(()=>{server.close();app.quit();}).catch(error=>{console.error(error.stack);server.close();app.exit(1);});
