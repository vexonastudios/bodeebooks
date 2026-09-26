'use strict';
// Local fictional-family regression. Never enrolls or changes a real computer.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..'),studentId='11111111-1111-4111-8111-111111111111';
let writes=0,failSave=false;
const setup={revision:1,step:0,completed:false,features:{},contentChoices:{},catalog:{version:1}};
const snapshot={students:[{id:studentId,name:'Test Child',main_school:null}],devices:[{id:'test-computer',computer_name:'Study laptop',student_id:null,revision:1,acknowledged_revision:1,recovery_configured:true,last_seen_at:new Date().toISOString(),locked:false}],rules:{revision:1,subjects:[],schedule:{enabled:false}}};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){
  res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><link rel="stylesheet" href="/guard-admin/cloud-monitoring.css"><section id="tab-overview"><div class="tab-header"></div></section><section id="tab-settings"><div class="tab-header"></div></section><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script>');
 }
 if(url.pathname==='/fixture.js'){
  res.setHeader('Content-Type','text/javascript');return res.end(`import {setupParentStart} from '/guard-admin/cloud-parent-start.js';let snapshot=${JSON.stringify(snapshot)};async function refresh(){snapshot=await(await fetch('/snapshot')).json();guide.update()}const guide=setupParentStart({endpoint:'/setup',getSnapshot:()=>snapshot,refresh,navigate:()=>{},mutate:async(action,data)=>{const r=await fetch('/setup',{method:'POST',body:JSON.stringify({action,...data})});const value=await r.json();if(!r.ok)throw Error(value.error);await refresh();return value}});guide.update();`);
 }
 if(url.pathname==='/snapshot'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(snapshot));}
 if(url.pathname==='/setup'){
  let raw='';for await(const part of req)raw+=part;const input=JSON.parse(raw);res.setHeader('Content-Type','application/json');
  if(input.action==='get-setup')return res.end(JSON.stringify(setup));
  if(input.action==='assign-student'){
   writes++;assert.equal(input.deviceId,'test-computer');assert.equal(input.studentId,studentId);
   if(failSave){failSave=false;res.statusCode=503;return res.end(JSON.stringify({error:'Could not save. Try again.'}));}
   snapshot.devices[0].student_id=studentId;snapshot.devices[0].revision++;return res.end(JSON.stringify({revision:snapshot.devices[0].revision}));
  }
  throw Error('Unexpected mutation: '+input.action);
 }
 if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){const file=path.join(site,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}}
 res.statusCode=404;res.end();
});
if(process.argv.includes('--preview')){server.listen(43180,'127.0.0.1',()=>console.log('Fictional setup preview: http://127.0.0.1:43180/?setup=connect'));}
else {
 const {app,BrowserWindow,session}=require('electron');if(app.isPackaged)throw Error('Development fixture only');
 app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'bg-connect-readiness-')));
 async function main(){
  await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('data:')}));
  const win=new BrowserWindow({show:false,width:390,height:844,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),js=source=>win.webContents.executeJavaScript(source,true);
  const wait=async source=>{const end=Date.now()+8000;while(Date.now()<end){if(await js(source))return;await new Promise(resolve=>setTimeout(resolve,30));}throw Error('Timed out: '+source);};
  const click=async text=>js(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent===${JSON.stringify(text)}&&!b.disabled).click()`);
  await win.loadURL(origin+'/?setup=connect');await wait('document.querySelector("dialog[open]")');
  assert.equal(await js('document.querySelector("#parent-start-title").textContent'),'Connect & check readiness','pairing goes directly to readiness even before school choices');
  assert.equal(await js('document.querySelector(".parent-start-more").open'),false,'paired computers prioritize assignment over install instructions');
  assert.equal(writes,0);assert.equal(await js('document.querySelector(".setup-computer-assignment h3").textContent'),'Study laptop');
  await js(`{const input=document.querySelector('.setup-computer-assignment select');input.value='${studentId}';input.dispatchEvent(new Event('change'));}`);
  assert.equal(writes,0,'choosing a child is only a draft');
  await click('Save and close');await wait('document.querySelector(".setup-error").textContent.includes("Tap Save student")');
  assert.equal(writes,0,'closing cannot silently discard the selected child');failSave=true;
  await click('Save student');await wait('document.querySelector(".setup-computer-assignment [role=status]").textContent.includes("Try again")');
  assert.equal(await js('document.querySelector(".setup-computer-assignment select").value'),studentId);
  await click('Save student');await wait('!document.querySelector(".setup-computer-assignment")');assert.equal(writes,2);
  assert.equal(await js('document.querySelector(".parent-start-readiness li:last-child").dataset.done'),'false','pending child acknowledgement is not ready');
  snapshot.devices[0].acknowledged_revision=snapshot.devices[0].revision;
  await click('Check again');await wait('document.querySelector(".parent-start-readiness li:last-child").dataset.done==="true"');
  assert.equal(await js('document.querySelector(".parent-start-readiness li:first-child").dataset.done'),'false','opening readiness does not mark missing school choices complete');
  assert.equal(await js('document.querySelector(".parent-start-readiness>strong").textContent'),'Setup still needs attention');
  for(const [name,width,height]of [['phone',390,844],['desktop',1280,900]]){
   win.setContentSize(width,height);await new Promise(resolve=>setTimeout(resolve,120));
   assert.ok(await js('{const d=document.querySelector("dialog[open]"),r=d.getBoundingClientRect(),f=d.querySelector("footer").getBoundingClientRect();r.left>=0&&r.right<=innerWidth&&f.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth+1}'));
   fs.writeFileSync(path.join(site,'.tmp','connect-readiness-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  await click('Close');await wait('!document.querySelector("dialog[open]")');win.destroy();
  console.log('Connect readiness passed: direct step, named computer, draft/save/retry, matching student, real acknowledgement check, missing prerequisites preserved and phone/desktop fit.');
 }
 main().then(()=>server.close(()=>app.exit(0))).catch(error=>{console.error(error);server.close(()=>app.exit(1));});
}
