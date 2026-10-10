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
const script="import {setupCloudGames} from '/guard-admin/cloud-games-ui.js';window.fixtureRoom={date:'2026-10-10',timeZone:'America/Chicago',matches:[],children:['Alex','Emma','Noah','Ava','Ben','Mia','Sam','Zoe'].map((name,i)=>({id:'child-'+i,name,revision:0,settings:{enabled:true,dailyMinutes:60,requireSchool:true,start:'13:00',end:'18:00',days:[4,5,6],unlockDate:null},access:{allowed:false,remainingSeconds:3600,reason:'Finish schoolwork'}}))};window.calls=[];window.games=setupCloudGames({root:document.getElementById('games'),parent:true,request:async(kind,input)=>{if(kind==='settings'){window.calls.push(input);const c=window.fixtureRoom.children.find(c=>c.id===input.studentId);c.settings=input.settings;c.revision++;return{saved:true,revision:c.revision};}return structuredClone(window.fixtureRoom);}});window.games.setActive(true);";
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
 console.log('Parent website Family Games passed: real styles, 8-child save, phone/short-screen/desktop footer, no horizontal overflow.');
 win.destroy();server.close();app.quit();
})().catch(error=>{console.error(error);win?.destroy();server.close();app.exit(1);});
