'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated synthetic browser fixture. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Fixture only');
const site=path.resolve(__dirname,'..'),out=path.join(site,'.tmp','bug-reports-ui');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bg-bug-report-'));app.setPath('userData',profile);app.disableHardwareAcceleration();
const {webpack}=require('next/dist/compiled/webpack/webpack');
fs.writeFileSync(path.join(out,'clerk.js'),'export const useAuth=()=>({userId:"synthetic-parent"});');
fs.writeFileSync(path.join(out,'link.js'),'import React from "react";export default function Link(props){return React.createElement("a",props,props.children)}');
fs.writeFileSync(path.join(out,'entry.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import ReportForm from '${path.join(site,'app/guard/report/ReportForm').replaceAll('\\','/')}';import Staff from '${path.join(site,'app/guard/admin/BugReportsPanel').replaceAll('\\','/')}';
import adminStyles from '${path.join(site,'app/guard/admin/admin.module.css').replaceAll('\\','/')}';
let denied=true;window.stoppedTracks=0;
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{if(denied){denied=false;throw Error('Microphone permission denied.');}return {getTracks:()=>[{stop(){window.stoppedTracks++}}]};}}});
class Recorder{state='inactive';mimeType='audio/webm';static isTypeSupported(){return true;}start(){this.state='recording';}stop(){if(this.state!=='recording')return;this.state='inactive';setTimeout(()=>{this.ondataavailable?.({data:new Blob([new Uint8Array([26,69,223,163,...Array(32).fill(0)])],{type:this.mimeType})});this.onstop?.();},0);}}
window.MediaRecorder=Recorder;const root=createRoot(document.getElementById('root'));root.render(location.pathname==='/staff'?<main className={adminStyles.page}><Staff/></main>:<ReportForm release="abcdef1234567"/>);`);
let voiceCalls=0,submits=[],stored=null,events=[],updates=0;const now=new Date().toISOString();
const setup={capturedAt:now,students:[{id:'d76383e4-d6ce-4270-8e9e-005dc0f563ca',name:'Alex',grade:'5',schoolProvider:'abeka'},{id:'d76383e4-d6ce-4270-8e9e-005dc0f563cb',name:'Jamie',grade:'2',schoolProvider:'bju'}],devices:[{id:'synthetic-pc',name:'Study computer',studentId:'d76383e4-d6ce-4270-8e9e-005dc0f563ca',platform:'Windows',appVersion:'1.2.293',releaseChannel:'beta',lastSeenAt:now,settingsRevision:4,acknowledgedRevision:3,locked:false}],school:{timeZone:'America/Chicago',rulesRevision:7,scheduleEnabled:true},recentErrors:[]};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));return;}
 if(req.method==='POST'){
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);res.setHeader('Content-Type','application/json');
  let result={};let code=200;
  if(body.action==='context')result={setup,voiceAvailable:true};
  else if(body.action==='list'||body.action==='bug-reports')result={reports:stored?[stored]:[],hasMore:false};
  else if(body.action==='voice'){assert.equal(body.consent,true);assert.ok(body.data);voiceCalls++;if(voiceCalls===1){code=503;result={error:'Synthetic transcription interruption. Try again.'};}else result={text:'The lesson restarted after opening Grades.'};}
  else if(body.action==='submit'){
   submits.push(body);if(!stored)stored={...body,householdId:'d76383e4-d6ce-4270-8e9e-005dc0f563cc',context:setup,reference:'BUG-TEST12345678',createdAt:now,updatedAt:now,status:'new',revision:1};
   assert.equal(body.id,stored.id);
   if(submits.length===1){code=503;result={error:'Synthetic lost send reply. Retry the same report.'};}else result={report:stored};
  }else if(body.action==='detail'||body.action==='bug-report-detail')result={report:stored,events};
  else if(body.action==='bug-report-update'){updates++;assert.equal(body.revision,stored.revision);stored={...stored,status:body.status,revision:stored.revision+1};events.push({id:body.eventId,role:'staff',status:body.status,note:body.note,internalNote:body.internalNote,createdAt:now});result={report:stored};}
  else {code=400;result={error:'Unknown fixture action'};}
  res.writeHead(code);res.end(JSON.stringify(result));return;
 }
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;--font-inter:Arial}button,textarea{font-family:Arial}</style><div id="root"></div><script src="/bundle.js"></script>');
});
let win;const watchdog=setTimeout(()=>{console.error('Bug reports UI fixture timed out');app.exit(1);},90000);
(async()=>{
 await new Promise((resolve,reject)=>{const compiler=webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@clerk/nextjs':path.join(out,'clerk.js'),'next/link':path.join(out,'link.js')}},module:{rules:[{test:/\.(tsx?|css)$/,use:path.join(site,'tests/helpers/guard-report-loader.cjs')}]},optimization:{minimize:false}});compiler.run((e,stats)=>{compiler.close(()=>{});if(e||stats.hasErrors())reject(e||Error(stats.toString({all:false,errors:true})));else resolve();});});
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)&&!d.url.startsWith('blob:')&&!d.url.startsWith('data:')}));
 win=new BrowserWindow({show:false,width:390,height:844,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false}});
 win.webContents.on('will-prevent-unload',e=>e.preventDefault());
 const errors=[];win.webContents.on('console-message',(_e,_level,message)=>{if(/Uncaught|Minified React error/.test(message))errors.push(message);});
 const js=code=>win.webContents.executeJavaScript(code,true);
 const until=async(code,label)=>{const deadline=Date.now()+10000;while(Date.now()<deadline){if(await js(code))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out '+label);};
 const tap=label=>js(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)throw Error('Unavailable button '+${JSON.stringify(label)});b.click();return true;})()`);
 const type=(selector,value)=>js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
 await win.loadURL(origin);await until('document.body.textContent.includes("Alex")','context');
 for(const width of [320,390,768,1440]){win.setContentSize(width,900);await new Promise(r=>setTimeout(r,80));assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true,'no overflow '+width);}
 win.setContentSize(390,844);
 await tap('Record instead');await until('document.body.textContent.includes("permission denied")','permission feedback');
 await type('textarea','Alex paused the math lesson to check grades.');
 await tap('Record instead');await until('document.body.textContent.includes("Stop ·")','recording');
 await js('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Stop ·")).click();true;');await until('!!document.querySelector("audio")','audio preview');
 assert.equal(await js('window.stoppedTracks>0'),true);
 await tap('Transcribe with OpenAI');await until('document.body.textContent.includes("Synthetic transcription interruption")','transcription failure');
 assert.equal(await js('!!document.querySelector("audio")'),true,'failed transcription retains clip');
 await tap('Transcribe with OpenAI');await until('document.querySelector("textarea").value.includes("lesson restarted")','editable transcript');
 await js('document.querySelector("input[type=checkbox]").click();document.querySelector("details").open=true;true;');
 await fs.promises.writeFile(path.join(out,'parent-mobile.png'),(await win.webContents.capturePage()).toPNG());
 await tap('Send report');await until('document.body.textContent.includes("Retry sending")','uncertain send');
 const before=await js('document.querySelector("textarea").value');assert.ok(before.includes('Alex paused'));
 await win.reload();await until('document.body.textContent.includes("Retry sending")','draft restored');assert.equal(await js('document.querySelector("textarea").value'),before);
 await tap('Retry sending');await until('document.body.textContent.includes("Report received")','receipt');assert.equal(submits.length,2);assert.deepEqual(submits[0],submits[1]);assert.equal(await js('document.querySelector("textarea").value'),'');
 await win.loadURL(origin+'/staff');await until('document.body.textContent.includes("BUG-TEST")','staff inbox');
 await js('document.querySelector("button[class]");[...document.querySelectorAll("button")].find(b=>b.textContent.includes("BUG-TEST")).click();true;');await until('document.body.textContent.includes("Internal investigation notes")','staff details');
 await js('(()=>{const s=[...document.querySelectorAll("select")].at(-1);s.value="resolved";s.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
 await type('textarea','The fix is ready in a new version.');await type('textarea[rows="4"]','Synthetic internal investigation only.');
 await tap('Save update');await until('document.body.textContent.includes("Report updated.")','staff saved');assert.equal(updates,1);assert.equal(stored.status,'resolved');
 win.setContentSize(1440,1000);await new Promise(r=>setTimeout(r,100));assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
 await fs.promises.writeFile(path.join(out,'staff-desktop.png'),(await win.webContents.capturePage()).toPNG());
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[320,390,768,1440],voiceConsent:true,deniedMicrophone:true,transcriptionRetry:true,lostSendRetry:true,staffTriage:true,screenshots:out}));
 win.destroy();await new Promise(r=>server.close(r));clearTimeout(watchdog);app.quit();
})().catch(error=>{console.error(error);if(win&&!win.isDestroyed())win.destroy();server.close();clearTimeout(watchdog);app.exit(1);});
