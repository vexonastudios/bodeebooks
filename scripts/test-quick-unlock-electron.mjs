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
]}};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://fixture.local');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){
    res.setHeader('Content-Type','text/html');
    return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/cloud-monitoring.css"></head><body><section><header class="tab-header"><div class="cloud-actions"><button id="cloud-refresh">Refresh</button></div></header><div id="overview-grid"></div></section><script type="module" src="/fixture.js"></script></body></html>');
  }
  if(url.pathname==='/fixture.js'){
    res.setHeader('Content-Type','text/javascript');
    return res.end(`import {setupMonitoring} from '/guard-admin/cloud-monitoring.js';
      window.data=${JSON.stringify(snapshot)};window.calls=[];window.errors=[];
      window.ui=setupMonitoring({getSnapshot:()=>window.data,mutate:async(action,body)=>window.calls.push({action,body}),navigate:()=>{},openMessages:()=>{},showError:(message,error)=>{if(error)window.errors.push(message);},mobile:()=>null});
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
  for(const [width,height]of [[1280,900],[390,844]]){
    win.setContentSize(width,height);
    assert.equal(await js('document.querySelector("[data-student-id=a] .monitor-quick-unlock")'),null);
    assert.deepEqual(await js('Array.from(document.querySelectorAll("[data-student-id=b] .monitor-quick-options button"),b=>b.textContent)'),['Music','Games']);
    await js('document.querySelector("[data-student-id=b] .monitor-quick-unlock").open=true');
    assert.equal(await js('document.querySelector("[data-student-id=b] .monitor-quick-options button").getBoundingClientRect().height>0'),true);
  }
  await js('document.querySelector("[data-student-id=b] .monitor-quick-options button").click()');
  assert.deepEqual(await js('window.calls'),[{action:'computer-command',body:{kind:'quick-unlock',studentId:'b',subjectId:'music',unlocked:true}}]);
  await js('data.students[1].quick_unlock={date:data.activityDate,subjectIds:["music"]};ui.render()');
  assert.equal(await js('document.querySelector("[data-student-id=b] .monitor-quick-options button").getAttribute("aria-pressed")'),'true');
  await js('data.rules.subjects.forEach(s=>s.assignments.forEach(a=>a.dailyPlan.placement="anytime"));ui.render()');
  assert.equal(await js('document.querySelectorAll(".monitor-quick-unlock").length'),0);
  assert.deepEqual(await js('window.errors'),[]);
  win.destroy();await new Promise(resolve=>server.close(resolve));
  console.log('Quick Unlock: desktop/phone options, all-anytime omission, action payload and current unlock state passed.');app.exit(0);
})().catch(error=>{console.error(error);server.close();app.exit(1);});
