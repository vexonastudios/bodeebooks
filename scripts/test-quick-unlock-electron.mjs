// Run with Electron against a temporary profile and loopback assets only.
import {app,BrowserWindow,session} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-quick-unlock-')));
const assigned=(studentId,placement)=>({studentId,active:true,dailyGoalMinutes:15,dailyPlan:{placement}});
const snapshot={serverTime:'2026-09-13T15:00:00Z',activityDate:'2026-09-13',students:[{id:'a',name:'Avery'},{id:'b',name:'Morgan'}],devices:[],activity:[],schoolActivities:[],rules:{subjects:[
  {id:'writing',title:'Writing',accessTier:'after_school',assignments:[assigned('a','anytime'),assigned('b','anytime')]},
  {id:'music',title:'Music',assignments:[assigned('a','anytime'),assigned('b','after_school')]},
  {id:'games',title:'Games',assignments:[assigned('a','anytime'),assigned('b','scheduled')]},
  {id:'art',title:'Art Studio',icon:'palette',assignments:[assigned('a','anytime'),assigned('b','after_school')]},
]}};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://fixture.local');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){
    res.setHeader('Content-Type','text/html');
    return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;background:#0e0d19;color:white}</style><link rel="stylesheet" href="/guard-admin/cloud-monitoring.css"><link rel="stylesheet" href="/guard-admin/cloud-quick-unlock.css"></head><body><section><header class="tab-header"><div class="cloud-actions"><button id="cloud-refresh">Refresh</button></div></header><div id="overview-grid"></div></section><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body></html>');
  }
  if(url.pathname==='/fixture.js'){
    res.setHeader('Content-Type','text/javascript');
    return res.end(`import {setupMonitoring} from '/guard-admin/cloud-monitoring.js';import {updateQuickUnlockSnapshot} from '/guard-admin/cloud-quick-unlock.js';
      window.data=${JSON.stringify(snapshot)};window.calls=[];window.errors=[];window.failures=new Set();window.lostReplies=new Set();window.serverUnlocks={};window.hold=false;
      window.ui=setupMonitoring({getSnapshot:()=>window.data,mutate:async(action,body)=>{
        window.calls.push({action,body});if(window.hold){window.hold=false;await new Promise(resolve=>window.releaseSave=resolve);}
        if(window.failures.has(body.subjectId))throw Error('Synthetic save failure. Try again.');
        const ids=new Set(window.serverUnlocks[body.studentId]||[]);
        if(body.unlocked)ids.add(body.subjectId);else ids.delete(body.subjectId);
        const result={quickUnlock:{date:data.activityDate,subjectIds:[...ids]}};
        window.serverUnlocks[body.studentId]=[...ids];
        if(window.lostReplies.has(body.subjectId)){window.lostReplies.delete(body.subjectId);throw Error('Synthetic lost reply.');}
        updateQuickUnlockSnapshot(data,body,result);ui.render();return result;
      },navigate:()=>{},openMessages:()=>{},showError:(message,error)=>{if(error)window.errors.push(message);},mobile:()=>null});
      ui.render();window.ready=true;`);
  }
  if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){
    const file=path.join(root,'public',url.pathname);
    if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}
  }
  res.writeHead(404);res.end();
});
(async()=>{
  await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details,done)=>done({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('data:')}));
  const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  await win.loadURL(origin);const js=code=>win.webContents.executeJavaScript(code);
  for(let i=0;i<50&&!await js('!!window.ready');i++)await new Promise(resolve=>setTimeout(resolve,40));
  assert.equal(await js('!!window.ready'),true);
  const waitFor=async code=>{for(let n=0;n<100;n++){if(await js(code))return;await new Promise(resolve=>setTimeout(resolve,10));}assert.fail('Timed out: '+code);};
  assert.equal(await js('document.querySelector("[data-student-id=a] .monitor-quick-unlock")'),null);
  await js('document.querySelector("[data-quick-unlock-student=b]").click()');
  assert.deepEqual(await js('Array.from(document.querySelectorAll(".quick-unlock-tile strong"),b=>b.textContent)'),['Music','Games','Art Studio']);
  assert.equal(await js('document.querySelector("#cloud-quick-unlock").matches(":modal")'),true);
  await js('window.hold=true;document.querySelector(".quick-unlock-tile[data-subject-id=music]").click()');
  await waitFor('!!window.releaseSave');
  await js('document.querySelector(".quick-unlock-tile[data-subject-id=games]").click();document.querySelector(".quick-unlock-tile[data-subject-id=music]").click();ui.render()');
  assert.equal(await js('window.calls.length'),1,'rapid taps queue; duplicates cannot submit twice');
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length'),2);
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile.is-unlocked").length'),0,'no green confirmation before the server reply');
  await js('window.releaseSave()');await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  assert.deepEqual(await js('window.calls.map(c=>c.body)'),[
    {kind:'quick-unlock',studentId:'b',subjectId:'music',unlocked:true},{kind:'quick-unlock',studentId:'b',subjectId:'games',unlocked:true}]);
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile.is-unlocked").length'),2);
  assert.equal(await js('document.querySelector("#cloud-quick-unlock").open'),true,'card refreshes do not close the popup');
  await js('document.querySelector(".quick-unlock-tile[data-subject-id=games]").click()');await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  assert.equal(await js('window.calls.at(-1).body.unlocked'),false,'an unlocked item can restore normal rules');
  await js('document.querySelector(".quick-unlock-tools button").click();document.querySelector(".quick-unlock-tools button:last-child").click();window.failures.add("games");document.querySelector(".quick-unlock-apply").click()');
  await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  assert.equal(await js('document.querySelector(".quick-unlock-tile[data-subject-id=games]").classList.contains("has-error")'),true);
  assert.equal(await js('document.querySelector(".quick-unlock-tile[data-subject-id=art]").classList.contains("is-unlocked")'),true);
  assert.equal(await js('document.querySelector(".quick-unlock-apply").textContent'),'Unlock selected (1)');
  const attempts=await js('window.calls.length');
  await js('window.failures.clear();document.querySelector(".quick-unlock-apply").click()');await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  assert.equal(await js('window.calls.length'),attempts+1,'retry submits only the failed selection');
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile.is-unlocked").length'),3);
  await js('document.querySelector(".quick-unlock-tools button").click();document.querySelector(".quick-unlock-tile[data-subject-id=games]").click();document.querySelector(".quick-unlock-tile[data-subject-id=art]").click()');
  await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  await js('window.lostReplies.add("games");document.querySelector(".quick-unlock-tools button").click();document.querySelector(".quick-unlock-tools button:last-child").click();document.querySelector(".quick-unlock-apply").click()');
  await waitFor('document.querySelectorAll(".quick-unlock-tile[aria-busy=true]").length===0');
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile.is-unlocked").length'),3);
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile.has-error").length'),0,'a later authoritative response reconciles a lost acknowledgement');
  // Populate a realistically long list and verify scrolling stays within the
  // dialog while its title and actions remain reachable on desktop and phone.
  await js('for(let i=0;i<21;i++)data.rules.subjects.push({id:"extra-"+i,title:"Practice activity "+(i+1),icon:"book-open",assignments:[{studentId:"b",dailyGoalMinutes:15,dailyPlan:{placement:"after_school"}}]});ui.render()');
  for(const [label,width,height]of [['desktop',1280,900],['phone',390,844]]){
    win.setContentSize(width,height);await new Promise(resolve=>setTimeout(resolve,60));
    const bounds=await js('(()=>{const d=document.querySelector("#cloud-quick-unlock").getBoundingClientRect(),f=document.querySelector(".quick-unlock-footer").getBoundingClientRect(),g=document.querySelector(".quick-unlock-grid");return {top:d.top,bottom:d.bottom,left:d.left,right:d.right,footer:f.bottom,scroll:g.scrollHeight>g.clientHeight,cols:getComputedStyle(g).gridTemplateColumns.split(" ").length};})()');
    assert.ok(bounds.top>=0&&bounds.bottom<=height&&bounds.left>=0&&bounds.right<=width);assert.ok(bounds.footer<=height);assert.equal(bounds.cols,label==='desktop'?3:2);assert.equal(bounds.scroll,true);
    await js('document.querySelector(".quick-unlock-grid").scrollTop=250');
    const scroll=await js('document.querySelector(".quick-unlock-grid").scrollTop');await js('ui.render()');
    assert.equal(await js('document.querySelector(".quick-unlock-grid").scrollTop'),scroll);
    if(process.env.BODEE_PREVIEW_DIR){fs.mkdirSync(process.env.BODEE_PREVIEW_DIR,{recursive:true});await js('document.querySelector(".quick-unlock-grid").scrollTop=0');await new Promise(resolve=>setTimeout(resolve,60));fs.writeFileSync(path.join(process.env.BODEE_PREVIEW_DIR,label+'.png'),(await win.webContents.capturePage()).toPNG());}
  }
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await waitFor('!document.querySelector("#cloud-quick-unlock").open');
  assert.equal(await js('document.activeElement.dataset.quickUnlockStudent'),'b','focus returns to the rebuilt child button');
  await js('document.querySelector("[data-quick-unlock-student=b]").click()');
  await js('data.rules.subjects.forEach(s=>s.assignments.forEach(a=>a.dailyPlan.placement="anytime"));ui.render()');
  assert.equal(await js('document.querySelectorAll(".monitor-quick-unlock").length'),0);
  assert.equal(await js('document.querySelectorAll(".quick-unlock-tile").length'),0,'an open popup follows a changed Daily Plan');
  assert.deepEqual(await js('window.errors'),[]);
  win.destroy();await new Promise(resolve=>server.close(resolve));
  console.log('Quick Unlock: popup, rapid taps, multi-select, partial failure/retry, saved checks, refresh/scroll preservation, desktop/phone bounds and keyboard dismissal passed.');app.exit(0);
})().catch(error=>{console.error(error);server.close();app.exit(1);});
