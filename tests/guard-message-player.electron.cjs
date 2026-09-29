"use strict";
// Actual chat player and styles, synthetic silent WAV, isolated hidden profile.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-message-player-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const site=path.resolve(__dirname,'..'),id='11111111-1111-4111-8111-111111111111';
const wav=Buffer.alloc(44+34*16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const file={id,mime:'audio/wav',name:'Voice message.wav',size:wav.length},errors=[];let reads=0;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture.local');
 if(url.pathname==='/'){
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/cloud-messages.css"><link rel="stylesheet" href="/cloud-files.css"><style>*{box-sizing:border-box}body{margin:0;background:#0d0d1a;color:#e6edf7;font:16px system-ui}.cloud-messages-panel{padding:24px;max-width:650px;margin:auto}h1{font-size:24px;margin:0 0 24px}#messages-thread-content{padding:0}small{display:block;text-align:right;margin-top:8px}</style></head><body><main class="cloud-messages-panel"><h1>Messages</h1><div id="messages-thread-content"><article class="cloud-message child"><p>Voice message · 34s</p><div id="player"></div><small>10:14 AM</small></article></div></main><script src="/cloud-file-tools.js"></script><script>window.file=${JSON.stringify(file)};window.player=cloudFileTools.attachment(file,async()=>{const res=await fetch('/voice');return res.json();});document.querySelector('#player').replaceWith(player);window.ready=true;</script></body></html>`);return;
 }
 if(url.pathname==='/voice'){reads++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({file,data:wav.toString('base64')}));return;}
 if(['/cloud-files.css','/cloud-messages.css','/cloud-file-tools.js'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(site,'public/guard-admin',url.pathname.slice(1))));return;}
 res.writeHead(404);res.end();
});
let win;const js=code=>win.webContents.executeJavaScript(code,true);
const until=async code=>{const end=Date.now()+10000;while(Date.now()<end){if(await js(code))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+code+' '+JSON.stringify(await js("({focused:document.hasFocus(),active:document.activeElement.outerHTML,audio:player.querySelector('audio').paused,time:player.querySelector('audio').currentTime,button:player.querySelector('button').outerHTML,status:player.textContent})")));};
const capture=async name=>{fs.mkdirSync(path.join(site,'.tmp/message-player-20260929'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp/message-player-20260929',name+'.png'),(await win.webContents.capturePage()).toPNG());};
const watchdog=setTimeout(()=>app.exit(1),45000);
(async()=>{
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('blob:')}));
 win=new BrowserWindow({show:false,width:1100,height:700,webPreferences:{nodeIntegration:false,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(/Uncaught|TypeError|ReferenceError/.test(event.message))errors.push(event.message);});
 await win.loadURL(origin);await until('window.ready');assert.equal(reads,0,'Rendering does not download audio');
 await js('player.querySelector("button").click()');await until('player.querySelector("audio").currentTime>.1');
 assert.equal(await js('player.querySelector(".cloud-inline-audio-play").getAttribute("aria-label")'),'Pause voice message');
 assert.equal(await js('player.querySelector("audio").controls'),false);assert.equal(await js('player.querySelector("audio").hidden'),true);
 await js('player.querySelector(".cloud-inline-audio-play").click()');await until('player.querySelector("audio").paused');
 await js('player.querySelector("input").value="15";player.querySelector("input").dispatchEvent(new Event("input"))');
 await until('player.querySelector(".cloud-inline-audio-time").textContent==="0:15 / 0:34"');
 assert.equal(await js('player.querySelector("input").getAttribute("aria-valuetext")'),'0:15 of 0:34');
 await js('player.querySelector("input").focus()');win.webContents.sendInputEvent({type:'keyDown',keyCode:'Right'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Right'});
 await until('player.querySelector("audio").currentTime>15');
 await js('player.querySelector(".cloud-inline-audio-play").focus()');win.webContents.focus();win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});win.webContents.sendInputEvent({type:'char',keyCode:'\r'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});await until('!player.querySelector("audio").paused');
 await js('player.querySelector(".cloud-inline-audio-mute").click()');await until('player.querySelector("audio").muted&&player.querySelector(".cloud-inline-audio-mute").getAttribute("aria-label")=="Unmute voice message"');
 assert.equal(await js('player.querySelector(".cloud-inline-audio-mute").getAttribute("aria-label")'),'Unmute voice message');
 await js('player.querySelector(".cloud-inline-audio-mute").click();player.querySelector(".cloud-inline-audio-play").click()');await until('player.querySelector("audio").paused');assert.equal(reads,1,'Replays and seeking reuse private bytes');
 for(const [name,width,height]of [['desktop',1100,700],['phone',390,700],['small-phone',320,600]]){
  win.setContentSize(width,height);await new Promise(r=>setTimeout(r,100));
  const box=await js(`({overflow:document.documentElement.scrollWidth>innerWidth,player:player.getBoundingClientRect().toJSON(),row:player.parentElement.getBoundingClientRect().toJSON(),seek:player.querySelector('input').getBoundingClientRect().toJSON(),play:player.querySelector('.cloud-inline-audio-play').getBoundingClientRect().toJSON(),mute:player.querySelector('.cloud-inline-audio-mute').getBoundingClientRect().toJSON()})`);
  assert.equal(box.overflow,false);assert.ok(box.player.right<=box.row.right);assert.ok(box.seek.width>=40,JSON.stringify(box));assert.ok(box.play.width>=44&&box.play.height>=44&&box.mute.width>=44&&box.mute.height>=44);await capture(name);
 }
 await js(`window.other=cloudFileTools.attachment(file,async()=>({file,data:${JSON.stringify(wav.toString('base64'))}}));document.querySelector('.cloud-message').append(other);player.querySelector('.cloud-inline-audio-play').click()`);await until('!player.querySelector("audio").paused');
 await js('other.querySelector(".cloud-inline-audio-play").click()');await until('!other.querySelector("audio").paused&&player.querySelector("audio").paused');
 await js('window.failed=cloudFileTools.attachment(file,async()=>{throw Error("Synthetic offline");});document.querySelector(".cloud-message").append(failed);failed.querySelector("button").click()');await until('failed.querySelector("button").getAttribute("aria-label")==="Retry voice message"');assert.equal(await js('failed.querySelector("button").disabled'),false);
 await js('window.oldURL=other.querySelector("audio").src;window.revoked=[];const revoke=URL.revokeObjectURL;URL.revokeObjectURL=url=>{revoked.push(url);revoke(url)};other.dispose();player.dispose()');assert.equal(await js('other.querySelector("audio").paused&&revoked.includes(oldURL)'),true);
 assert.deepEqual(errors,[]);console.log('Message player passed: actual WAV playback, pause/resume, seek including keyboard, mute, lazy download/replay, single playback, retry, disposal, touch controls and desktop/390px/320px layout.');
})().then(()=>{clearTimeout(watchdog);win?.destroy();server.close();app.exit(0);}).catch(error=>{console.error(error);clearTimeout(watchdog);win?.destroy();server.close();app.exit(1);});
