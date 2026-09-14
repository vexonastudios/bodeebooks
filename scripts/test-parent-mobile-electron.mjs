// Synthetic family and loopback server only. Run with Electron, never the installed child app.
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
if (app.isPackaged) throw Error('Development fixture only');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'bg-parent-mobile-')));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('use-fake-device-for-media-stream');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
const students = [{ id: '11111111-1111-4111-8111-111111111111', name: 'Avery' }, { id: '22222222-2222-4222-8222-222222222222', name: 'Morgan' }, { id: '33333333-3333-4333-8333-333333333333', name: 'Riley' }];
const requests = [], sends = [];
let loseReceipt = false;
const messages = [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', sender: 'child', body: 'I finished my reading! Can you unlock music?', createdAt: '2026-09-13T15:23:00Z', receivedAt: null }, { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', sender: 'parent', body: 'Of course. Nice work finishing your schoolwork.', createdAt: '2026-09-13T15:24:00Z', receivedAt: '2026-09-13T15:24:01Z' }];
const fixtureJs = `
import { setupCloudMessages } from '/guard-admin/cloud-messages.js';
import { setupCloudMobile } from '/guard-admin/cloud-mobile.js';
import { setupMessageUnread } from '/guard-admin/cloud-message-unread.js';
import { setupDailyPlan } from '/guard-admin/cloud-daily-plan.js';
window.reads=[]; window.refreshes=0;
document.querySelector('.cloud-feedback').textContent='';
addEventListener('message',e=>{if(e.data?.type==='bodeeguard-conversation-read')reads.push(e.data)});
window.cloudFileTools={close(){},attachment(){const a=document.createElement('audio');a.controls=true;return a;}};
window.chat=setupCloudMessages({endpoint:'/guard/dashboard/bridge/'});
let mobile;
window.navigate=id=>{for(const tab of document.querySelectorAll('.tab-content'))tab.classList.toggle('active',tab.id==='tab-'+id); chat.setActive(id==='messages');mobile?.setActive(id);};
setupDailyPlan({getSnapshot:()=>({students:${JSON.stringify(students)},rules:{subjects:[]}}),mutate:async()=>{},navigate});
const controls=document.querySelector('#overview-actions');
const lock=document.createElement('button');lock.id='cloud-lock-all';lock.className='btn monitor-student-action--lock';lock.innerHTML='<i data-lucide="lock"></i>Lock all computers';controls.prepend(lock);
const refresh=document.querySelector('#cloud-refresh'), group=document.createElement('div');group.className='cloud-overview-refresh';refresh.before(group);
group.innerHTML='<time class="cloud-overview-updated">Updated 10:23 AM</time>';group.append(refresh);
const notification=document.createElement('button');notification.className='btn btn-secondary';notification.innerHTML='<i data-lucide="bell"></i>Phone notifications';document.querySelector('#tab-messages .tab-header').append(notification);
mobile=setupCloudMobile({navigate,refresh:async()=>{refreshes++;await new Promise(r=>setTimeout(r,60));},openSpelling:async()=>{}});
chat.update(${JSON.stringify(students)}); chat.setLive(true); setupMessageUnread(chat);
window.unread=count=>window.postMessage({type:'bodeeguard-unread',items:[{studentId:${JSON.stringify(students[0].id)},count}]},location.origin);
for(const nav of document.querySelectorAll('.sidebar [data-tab]'))nav.addEventListener('click',()=>navigate(nav.dataset.tab));
navigate('overview'); unread(2);window.lucide?.createIcons();window.ready=true;`;
const template = JSON.parse(fs.readFileSync(path.join(root, 'app/guard/dashboard/generated/workspace.json'), 'utf8')).html;
const html = template.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .replace('</head>', '<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
  .replace('</body>', '<button id="parent-assistant-launcher">Ask BodeeGuard</button><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://fixture.local'); response.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html'); return response.end(html); }
  if (url.pathname === '/fixture.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(fixtureJs); }
  if (url.pathname === '/guard/dashboard/bridge/') {
    let raw='';for await(const chunk of request)raw+=chunk;const body=JSON.parse(raw);requests.push(body);
    response.setHeader('Content-Type','application/json');
    if(body.action==='list-messages')return response.end(JSON.stringify({studentId:body.studentId,messages,version:messages.length}));
    if(body.action==='send-message'){
      sends.push(body); if(loseReceipt){loseReceipt=false;response.writeHead(503);return response.end(JSON.stringify({error:'Synthetic lost response'}));}
      messages.push({...body,sender:'parent',createdAt:new Date().toISOString()});
      return response.end(JSON.stringify({id:body.id,studentId:body.studentId,saved:true}));
    }
    response.writeHead(400);return response.end('{}');
  }
  if (/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)) {
    const file = path.join(root, 'public', url.pathname);
    if (fs.existsSync(file)) { response.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript'); return response.end(fs.readFileSync(file)); }
  }
  response.writeHead(404);response.end();
});
(async () => { try {
  await app.whenReady(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details, done) => done({ cancel: !details.url.startsWith(origin) && !details.url.startsWith('blob:') }));
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'media'));
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === 'media');
  const win = new BrowserWindow({ show: false, width: 390, height: 780, useContentSize: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  const errors=[];win.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message)});
  const js = async code => {try{return await win.webContents.executeJavaScript(code, true);}catch(error){throw Error(code+'\n'+error.message+'\n'+errors.join('\n'));}};
  const wait = async code => { for(let n=0;n<100;n++){if(await js(code))return;await new Promise(r=>setTimeout(r,30));}assert.fail('Timed out: '+code+' '+errors.join('\n')); };
  const visible = selector => js(`!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`);
  const shot = async name => {fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp',name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await win.loadURL(origin); await wait('window.ready');await wait('document.querySelector("[data-mobile-tab=messages] .cloud-unread-badge")?.textContent==="2"');
  assert.equal(await visible('.cloud-daily-plan-shortcut'),false); assert.equal(await visible('#cloud-refresh'),false);
  assert.equal(await visible('.app-header [aria-label="Refresh dashboard"]'),true);
  await js('document.querySelector(".app-header .icon-button").click()');
  await wait('window.refreshes===1&&!document.querySelector(".app-header .icon-button").disabled');
  assert.equal(await js(`Array.from(document.querySelectorAll('#tab-mobile-more button')).some(b=>b.textContent.includes('Daily plan'))`),false);
  assert.equal(await js(`(()=>{const b=document.querySelector('[data-mobile-tab=messages] .cloud-unread-badge').getBoundingClientRect(),n=document.querySelector('[data-mobile-tab=messages]').getBoundingClientRect();return b.height<=20&&b.top>=n.top&&b.bottom<n.bottom;})()`),true);
  await shot('parent-mobile-controls');
  await js('navigate("messages")');assert.equal(await visible('.cloud-chat-conversation'),false);assert.equal(requests.length,0);
  await shot('parent-mobile-conversations');
  await js('document.querySelector("#messages-student-list button").click()'); await wait('document.querySelectorAll(".cloud-message").length===2');
  assert.equal(await visible('.cloud-chat-people'),false);assert.equal(await visible('#parent-assistant-launcher'),false);
  assert.equal(await visible('#messages-attachment-clear'),false);assert.equal(await visible('#messages-older'),false);
  await wait('window.reads.length>0');
  const composerFits = `(()=>{const r=document.querySelector('#messages-reply-box').getBoundingClientRect(),nav=document.querySelector('.bottom-nav').getBoundingClientRect();return r.bottom<=nav.top+1&&r.top>0&&r.height<90&&document.documentElement.scrollWidth<=innerWidth;})()`;
  assert.equal(await js(composerFits),true);await shot('parent-mobile-chat');
  // Drafts survive Back, another child and returning. Hidden conversations aren't fetched/read.
  await js(`document.querySelector('#messages-reply-input').value='Draft for Avery';document.querySelector('.cloud-chat-back').click();`);
  const before=requests.length,readBefore=await js('window.reads.length');
  await js(`chat.notify(${JSON.stringify(students[0].id)});unread(102)`);await wait('document.querySelector("[data-mobile-tab=messages] .cloud-unread-badge").textContent==="99+"');
  assert.equal(requests.length,before);assert.equal(await js('window.reads.length'),readBefore);
  await js('document.querySelectorAll("#messages-student-list button")[1].click()'); await wait('document.querySelector("#messages-thread-header").textContent==="Morgan"');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'');
  await js('document.querySelector(".cloud-chat-back").click();document.querySelector("#messages-student-list button").click()');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Draft for Avery');
  await wait('document.querySelectorAll(".cloud-message").length===2');
  // Unread updates and sync retain media nodes; no one-second audio restart.
  await js(`window.audio=document.createElement('audio');audio.controls=true;document.querySelector('.cloud-message').append(audio);unread(1);chat.notify(${JSON.stringify(students[0].id)});`);
  await wait('document.querySelector("[data-mobile-tab=messages] .cloud-unread-badge").textContent==="1"');
  assert.equal(await js('audio.isConnected'),true);
  // Phone keyboard-sized viewport; input and send remain visible with history scrolling separately.
  win.setContentSize(390,440);await wait('innerHeight===440'); assert.equal(await js(composerFits),true);
  await shot('parent-mobile-keyboard');
  loseReceipt=true;await js('document.querySelector("#messages-reply-box").requestSubmit()');
  await wait('document.querySelector("#messages-cloud-status").textContent.includes("Draft retained")');
  assert.equal(await js('document.querySelector("#messages-reply-input").value'),'Draft for Avery');
  await js('document.querySelector("#messages-reply-box").requestSubmit()');await wait('document.querySelector("#messages-reply-input").value===""');
  assert.equal(sends.length,2);assert.equal(sends[0].id,sends[1].id);assert.equal(sends[1].studentId,students[0].id);
  await js(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File(['fixture'],'Homework.pdf',{type:'application/pdf'}));const input=document.querySelector('#messages-attachment');input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
  assert.equal(await visible('#messages-attachment-clear'),true);assert.equal(await js('document.querySelector("#messages-attachment-status").textContent'),'Homework.pdf');
  await js('document.querySelector("#messages-attachment-clear").click()');assert.equal(await visible('#messages-attachment-clear'),false);
  win.setContentSize(390,780);await wait('innerHeight===780');
  await js('document.querySelector("#messages-record").click()');await wait('document.querySelector("#messages-record").classList.contains("recording")');
  await new Promise(resolve=>setTimeout(resolve,1200));await js('document.querySelector("#messages-record").click()');
  await wait('!document.querySelector("#messages-voice-preview").hidden');
  await new Promise(resolve=>setTimeout(resolve,100));await shot('parent-mobile-voice');
  assert.equal(await js(`(()=>{const r=document.querySelector('#messages-reply-box').getBoundingClientRect();return r.bottom<=document.querySelector('.bottom-nav').getBoundingClientRect().top+1&&r.height<240;})()`),true, await js(`JSON.stringify(['#messages-reply-box','.bottom-nav','#messages-voice-preview'].map(s=>({selector:s,rect:document.querySelector(s).getBoundingClientRect().toJSON()})))`));
  await shot('parent-mobile-voice');await js('document.querySelector("#messages-voice-discard").click()');assert.equal(await visible('#messages-voice-preview'),false);
  win.setContentSize(320,568);await wait('innerWidth===320');assert.equal(await js(composerFits),true);
  // Desktop keeps the two-pane workspace and Daily plan shortcut.
  win.setContentSize(1280,900);await wait('!document.body.classList.contains("cloud-mobile")');
  assert.equal(await visible('.cloud-chat-people'),true);assert.equal(await visible('.cloud-chat-conversation'),true);
  await shot('parent-messages-desktop');await js('navigate("overview")');assert.equal(await visible('.cloud-daily-plan-shortcut'),true);assert.equal(await visible('#cloud-refresh'),true);
  const failures=errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')&&!e.includes('404')&&!e.includes('503'));
  assert.deepEqual(failures,[]);win.destroy();server.close();console.log('PASS: parent mobile controls, badges, list/chat, drafts, visibility, keyboard viewport, media stability, retry and desktop');app.exit(0);
} catch(error) {console.error(error);server.close();app.exit(1);} })();
