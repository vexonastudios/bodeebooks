'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-assistant-review-')));
const root=path.resolve(__dirname,'..'),cloud=process.argv.find(v=>v.startsWith('--cloud='))?.slice(8);
if(!cloud)throw Error('Pass the cloud source checkout');
const {assistantShell}=require(path.join(cloud,'shared/adminWorkspaceTemplate'));
const shell=assistantShell(fs.readFileSync(path.join(cloud,'reference/lan/renderer/admin.html'),'utf8'));
const calls=[];let loseReply=true,saves=0;const receipts=new Map();
const {createCloudParentAssistant}=require(path.join(cloud,'services/commercial-api/cloudParentAssistant'));
const principal={householdId:'synthetic-family',userId:'synthetic-parent'};
const assistant=createCloudParentAssistant({cloudFamilyService:{overview:async()=>({serverTime:'2026-10-04T17:00:00Z',rules:{schedule:{timeZone:'America/Chicago'}},students:[{id:'11111111-1111-4111-8111-111111111111',name:'Mia'},{id:'22222222-2222-4222-8222-222222222222',name:'Zoe'}]}),games:{addTime:async(_who,body)=>{if(receipts.has(body.requestId))return{...receipts.get(body.requestId),replayed:true,changedCount:0};saves++;const result={studentCount:body.studentId==='all'?2:1,changedCount:1};receipts.set(body.requestId,result);return result;}}}});
const html='<html><head><link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/assistant.css"><link rel="stylesheet" href="/cloud-assistant.css"></head><body><div id="admin-dashboard"><div id="tab-overview"></div><div id="tab-students"></div><div id="tab-family-games"></div></div>'+shell+'<script src="/lucide.min.js"></script><script type="module">import {setupCloudAssistant} from "/cloud-assistant.js";setupCloudAssistant({endpoint:"/bridge",navigate:tab=>window.navigation=tab,onChange:feature=>window.changed=feature});window.ready=true;</script></body></html>';
const server=http.createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(req.url==='/bridge'){try{let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);calls.push(body);let result;
 if(body.action==='assistant-welcome')result=await assistant.welcome(principal);
 else if(body.action==='assistant-ask')result=await assistant.ask(principal,body);
 else if(body.action==='assistant-game-time-approve'){result=await assistant.approveGameTime(principal,body);if(loseReply){loseReply=false;throw Error('Synthetic lost reply; retry confirmation');}}
 else throw Error('Unexpected fixture request');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(error){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}return;}
 const name=req.url.slice(1);if(['base.css','assistant.css','cloud-assistant.css','cloud-assistant.js','lucide.min.js'].includes(name)){res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,'public/guard-admin',name)));return;}res.writeHead(404);res.end();
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)}));
 const win=new BrowserWindow({show:false,width:1200,height:920,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),js=text=>win.webContents.executeJavaScript(text,true);
 const wait=async text=>{for(let i=0;i<100;i++){if(await js(text))return;await delay(30);}throw Error('Timed out '+text);};
 await win.loadURL(origin);await wait('window.ready===true');await js('document.getElementById("parent-assistant-launcher").click()');await wait('document.getElementById("parent-assistant-thread").textContent.includes("Tell me what")');
 await js('document.getElementById("parent-assistant-input").value="Give Mia 20 extra minutes of game time";document.getElementById("parent-assistant-form").requestSubmit()');await wait('document.querySelector(".assistant-confirmation")!==null');assert.equal(saves,0);
 for(const width of [1200,390,320]){win.setSize(width,920);await delay(70);const geometry=await js('({overflow:document.querySelector(".cloud-assistant-content").scrollWidth>document.querySelector(".cloud-assistant-content").clientWidth+1,heights:[...document.querySelectorAll(".assistant-confirmation button")].map(b=>b.getBoundingClientRect().height)})');assert.equal(geometry.overflow,false,'overflow '+width);assert.ok(geometry.heights.every(h=>h>=44));}
 await js('document.querySelector(".assistant-confirmation button").click();document.querySelector(".assistant-confirmation button").click()');await wait('document.querySelector(".assistant-confirmation").textContent.includes("Retry confirmation")');assert.equal(saves,1);assert.equal(calls.filter(c=>c.action==='assistant-game-time-approve').length,1);
 const id=calls.at(-1).requestId;await js('document.getElementById("parent-assistant-input").value="yes";document.getElementById("parent-assistant-form").requestSubmit()');await wait('document.querySelector(".assistant-confirmation").textContent.includes("already saved")');assert.equal(saves,1);assert.equal(calls.at(-1).requestId,id);assert.equal(calls.at(-1).studentId,'11111111-1111-4111-8111-111111111111');
 fs.mkdirSync(path.join(root,'.tmp/assistant-review'),{recursive:true});await delay(250);fs.writeFileSync(path.join(root,'.tmp/assistant-review/phone.png'),(await win.webContents.capturePage()).toPNG());
 await js('document.getElementById("parent-assistant-input").value="Add 30 minutes of game time for everyone";document.getElementById("parent-assistant-form").requestSubmit()');await wait('document.querySelectorAll(".assistant-confirmation").length===2');await js('document.getElementById("parent-assistant-close").click()');assert.equal(await js('[...document.querySelectorAll(".assistant-confirmation button")].every(b=>b.disabled)'),true);assert.equal(saves,1);
 console.log('Assistant reviews passed: real API, named recipient, lost reply/exact retry, double-click suppression, cancellation and 1200/390/320 widths');win.destroy();server.close();app.exit(0);
}
run().catch(error=>{console.error(error);server.close();app.exit(1);});
