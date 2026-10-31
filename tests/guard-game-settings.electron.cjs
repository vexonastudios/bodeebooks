'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Electron browser fixture. */
// The served parent assets and all parent styles, using fictional children only.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-parent-game-settings-')));
app.disableHardwareAcceleration();
const site=path.resolve(__dirname,'..');
const head=require('../app/guard/dashboard/generated/workspace.json').html.split('</head>')[0].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const html=head+'<link rel="stylesheet" href="/guard-admin/parent-mobile.css"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"><link rel="stylesheet" href="/guard-admin/cloud-games.css"></head><body><main style="width:100%;padding:12px"><section id="games"></section></main><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body></html>';
const script=`import {setupCloudGames} from '/guard-admin/cloud-games-ui.js';
window.fixtureRoom={date:'2026-10-30',timeZone:'America/Chicago',matches:[],children:['Alex','Emma','Noah','Ava','Ben','Mia','Sam','Zoe'].map((name,i)=>({id:'child-'+i,name,revision:0,settings:{enabled:true,dailyMinutes:60,requireSchool:true,start:'13:00',end:'18:00',days:[4,5,6],unlockDate:null},access:{allowed:false,remainingSeconds:3600,reason:'Finish schoolwork'}}))};
window.calls=[];window.unlockCalls=[];window.holdUnlock=false;window.failUnlock=false;window.holdRoom=false;
window.games=setupCloudGames({root:document.getElementById('games'),parent:true,request:async(kind,input)=>{
 if(kind==='unlock'){
  window.unlockCalls.push(input);
  if(window.holdUnlock){window.holdUnlock=false;await new Promise(r=>window.releaseUnlock=r);}
  if(window.failUnlock){window.failUnlock=false;throw Error('Synthetic interrupted unlock. Try again.');}
  const c=window.fixtureRoom.children.find(c=>c.id===input.studentId);c.access.quickUnlocked=input.unlocked;
  c.access.allowed=input.unlocked&&c.id!=='child-1';c.access.reason=c.id==='child-1'?'Finish Tidy desk to continue':c.access.allowed?'':'Finish schoolwork';
  return {quickUnlock:{date:window.fixtureRoom.date,subjectIds:input.unlocked?['games']:[]},gameUnlock:{...input,date:window.fixtureRoom.date}};
 }
 if(kind==='settings'){window.calls.push(input);const c=window.fixtureRoom.children.find(c=>c.id===input.studentId);c.settings=input.settings;c.revision++;return{saved:true,revision:c.revision};}
 const value=structuredClone(window.fixtureRoom);
 if(kind==='room'&&window.holdRoom){window.holdRoom=false;await new Promise(r=>window.releaseRoom=r);}
 return value;
}});window.games.setActive(true);`;

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(script);return;}
 if(!/^\/guard-admin\/[a-zA-Z0-9._/-]+$/.test(url.pathname)||url.pathname.includes('..')){res.writeHead(404);res.end();return;}
 const file=path.join(site,'public',url.pathname);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file));
});
let win;
(async()=>{
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>done({cancel:!details.url.startsWith(origin+'/')&&!details.url.startsWith('data:')}));
 win=new BrowserWindow({show:false,width:390,height:844,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 const evaluate=s=>win.webContents.executeJavaScript(s);
 const wait=async s=>{for(let i=0;i<160;i++){if(await evaluate(s))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+s);};
 await win.loadURL(origin);await wait('!!document.querySelector(".cloud-game-settings-all")');
 const unlock=id=>'document.querySelector('+JSON.stringify('[data-student-id="'+id+'"] .cloud-game-quick-unlock')+')';
 const feedback=id=>'document.querySelector('+JSON.stringify('[data-student-id="'+id+'"] .cloud-game-unlock-status')+')';
 await evaluate('window.holdRoom=true;void window.games.refresh()');await wait('!!window.releaseRoom');
 await evaluate('window.holdUnlock=true;'+unlock('child-0')+'.click();'+unlock('child-0')+'.click()');await wait('!!window.releaseUnlock');
 assert.equal(await evaluate('window.unlockCalls.length'),1,'double tap is suppressed');
 assert.equal(await evaluate(unlock('child-1')+'.disabled'),false,'sibling stays available');
 await evaluate(unlock('child-1')+'.click()');await wait(feedback('child-1')+'.textContent.includes("Unlocked today")');
 await evaluate('window.releaseUnlock();window.releaseRoom()');
 await wait(unlock('child-0')+'.textContent.includes("Restore")&&'+unlock('child-1')+'.textContent.includes("Restore")');
 await wait('document.querySelector("[data-student-id=child-0] .cloud-game-badge").textContent==="Available"');
 assert.equal(await evaluate('document.querySelector("[data-student-id=child-1] .cloud-game-badge").textContent'),'Locked','chores remain visible after saved override');
 assert.match(await evaluate(unlock('child-2')+'.textContent'),/Unlock today/,'other children unchanged');
 await evaluate('window.failUnlock=true;'+unlock('child-0')+'.click()');await wait(feedback('child-0')+'.textContent.includes("Try again")');
 assert.match(await evaluate(unlock('child-0')+'.textContent'),/Restore/,'failed write does not pretend to restore');
 await evaluate(unlock('child-0')+'.click()');await wait(unlock('child-0')+'.textContent.includes("Unlock today")');
 assert.equal(await evaluate('window.fixtureRoom.children[0].settings.dailyMinutes'),60,'temporary unlock leaves permanent settings alone');
 for(const width of [320,390,1200]){
  win.setContentSize(width,844);await wait('innerWidth==='+width);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'game cards fit '+width);
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".cloud-game-quick-unlock")).every(b=>b.getBoundingClientRect().height>=44&&b.scrollWidth<=b.clientWidth+1)'),true,'unlock buttons fit '+width);
 }
 win.setContentSize(390,844);await wait('innerWidth===390');
 fs.mkdirSync(path.join(site,'out/game-settings'),{recursive:true});
 fs.writeFileSync(path.join(site,'out/game-settings/quick-unlock-mobile.png'),(await win.webContents.capturePage()).toPNG());
 // A new day must clear the old success text and restore the action label.
 await evaluate('window.fixtureRoom.date="2026-10-31";window.fixtureRoom.children.forEach(c=>{c.access.quickUnlocked=false;c.access.allowed=false});void window.games.refresh()');
 await wait(unlock('child-1')+'.textContent.includes("Unlock today")');
 assert.equal(await evaluate(feedback('child-1')+'.textContent.includes("Unlocked today")'),false,'expired success text is cleared');
 await evaluate('document.querySelector(".cloud-game-settings-all").click()');
 for(const [w,h] of [[390,844],[320,568],[390,440],[1200,800]]){
  win.setContentSize(w,h);await wait('innerWidth==='+w+'&&innerHeight==='+h);
  assert.equal(await evaluate('(()=>{const b=document.querySelector("dialog button[type=submit]").getBoundingClientRect();return b.width>=44&&b.height>=44&&b.top>=0&&b.bottom<=innerHeight&&b.left>=0&&b.right<=innerWidth})()'),true,'Save visible in parent styles at '+w+'x'+h);
  assert.equal(await evaluate('document.querySelector("dialog").scrollWidth<=innerWidth'),true);
 }
 win.setContentSize(390,844);await wait('innerWidth===390&&innerHeight===844');
 const folder=path.join(site,'out/game-settings');fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,'parent-mobile.png'),(await win.webContents.capturePage()).toPNG());
 await evaluate('document.querySelector("input[name=dailyMinutes]").value="90";document.querySelector("dialog form").requestSubmit()');
 await wait('window.calls.length===8&&!document.querySelector("dialog[open]")');
 assert.equal(await evaluate('window.fixtureRoom.children.every(c=>c.settings.dailyMinutes===90)'),true);
 assert.equal(await evaluate('document.querySelector(".cloud-game-status").textContent'),'Settings saved for all 8 children.');
 console.log('Parent website Family Games passed: real styles, per-child unlock/restore, simultaneous saves, stale reads, failure/retry, retained chore block, 8-child save, phone/short-screen/desktop footer, no horizontal overflow.');
 win.destroy();server.close();app.quit();
})().catch(error=>{console.error(error);win?.destroy();server.close();app.exit(1);});
