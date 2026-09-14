// Real parent media forms, fictional data, blocked external traffic and a separate Electron profile.
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-mobile-media-')));app.disableHardwareAcceleration();
const students=[{id:'11111111-1111-4111-8111-111111111111',name:'Avery'}],calls=[];
const libraries={'/api/music/tracks':[],'/api/video/videos':[],'/api/audiobooks/items':[]};
let nextId=1;
let html=JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/workspace.json'))).html;
for(const [id,panel]of Object.entries(JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/media.json')))))html=html.replace(new RegExp('<section class="tab-content" id="tab-'+id+'"[\\s\\S]*?<\\/section>'),panel);
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</head>','<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
  .replace('</body>','<script src="/guard-admin/media-defaults.js"></script><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
const script=`import {setupCloudMobile} from '/guard-admin/cloud-mobile.js';import '/guard-admin/cloud-media-admin.js';
window.alerts=[];window.alert=text=>alerts.push(text);window.confirm=()=>false;document.querySelector('.cloud-feedback').textContent='';
let mobile;window.navigate=id=>{for(const p of document.querySelectorAll('.tab-content'))p.classList.toggle('active',p.id==='tab-'+id);mobile?.setActive(id);};
mobile=setupCloudMobile({navigate,refresh:async()=>{},openSpelling:async()=>{}});navigate('overview');window.lucide.createIcons();window.ready=true;`;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.local');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(script);}
  if(url.pathname==='/metadata'){res.setHeader('Content-Type','application/json');res.setHeader('Access-Control-Allow-Origin','*');return res.end(JSON.stringify({title:'Fictional family favorite',author_name:'Test creator'}));}
  if(url.pathname==='/guard/dashboard/bridge/'){
    let raw='';for await(const part of req)raw+=part;const value=JSON.parse(raw);calls.push(value);assert.equal(value.action,'media');
    const {path:route,method='GET',body}=value;let result=[];
    if(route==='/api/students')result=students;
    else if(route.includes('/lookup?'))result={title:'Fictional family favorite',author_name:'Test creator'};
    else if(route.includes('/settings'))result={};
    else if(route.includes('/flags'))result={flags:[],pending_count:0};
    else if(method==='POST'&&libraries[route]){result={id:nextId++};libraries[route].push({...body,...result});}
    else if(method==='PATCH')result={saved:true};
    else if(libraries[route])result=libraries[route];
    res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({status:200,body:result}));
  }
  if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){
    const file=path.join(root,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}
  }
  res.writeHead(404);res.end();
});
(async()=>{try{
  await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details,done)=>{
    if(details.url.startsWith('https://noembed.com/'))return done({redirectURL:origin+'/metadata'});
    done({cancel:!details.url.startsWith(origin)});
  });
  const win=new BrowserWindow({show:false,width:390,height:780,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  const errors=[];win.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message)});
  const js=async code=>{try{return await win.webContents.executeJavaScript(code,true);}catch(error){throw Error(code+'\n'+error.message+'\n'+errors.join('\n'));}};
  const wait=async code=>{for(let n=0;n<120;n++){if(await js(code))return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out '+code+'\n'+errors.join('\n'));};
  const visible=selector=>js(`!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`);
  const shot=async name=>{fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp',name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await win.loadURL(origin);await wait('window.ready');
  await js('document.querySelector("[data-mobile-tab=mobile-add]").click()');
  assert.deepEqual(await js(`Array.from(document.querySelectorAll('.mobile-media-copy strong'),e=>e.textContent)`),['Music','Videos','Audiobooks','Coloring Studio']);
  assert.equal(calls.length,0,'Opening the hub does not download unused libraries');
  await shot('mobile-add-media-hub');
  for(const [kind,input,title,lookup,approve,save,route,subtab]of [
    ['music','music-yt-url','music-title-input','music-lookup-btn','music-screened-input','music-add-btn','/api/music/tracks','[data-stab="mlib"]'],
    ['videos','video-yt-url','video-title-input','video-lookup-btn','video-screened-input','video-add-btn','/api/video/videos','[data-vstab="vlib"]'],
    ['audiobooks','ab-youtube-url','ab-title','ab-lookup','ab-screened','ab-add','/api/audiobooks/items','[data-abtab="ab-library"]']
  ]){
    await js(`navigate('mobile-add');document.querySelector('[data-media-kind=${kind}] .mobile-media-open').click()`);
    await wait(`document.querySelector('#tab-${kind}').classList.contains('mobile-media-add')`);
    await wait(`!document.querySelector('#${lookup}').disabled`);
    await wait(`!document.querySelector('#tab-${kind} .mobile-media-add-form').inert`);
    assert.equal(await visible('#'+input),true);assert.equal(await visible('#tab-'+kind+' .tab-header'),false);
    assert.equal(await js(`document.querySelector('[data-mobile-tab=mobile-add]').getAttribute('aria-current')`),'page');
    await js(`document.querySelector('#${input}').value='https://www.youtube.com/watch?v=dQw4w9WgXcQ';document.querySelector('#${lookup}').click()`);
    await wait(`document.querySelector('#${title}').getClientRects().length>0`);
    assert.equal(await js(`document.querySelector('#${approve}').checked`),false,'Parent approval starts unchecked');
    await js(`document.querySelector('#${title}').value='My ${kind} choice';document.querySelector('#tab-${kind} .mobile-media-toolbar .text-button').click()`);
    await js(`document.querySelector('[data-media-kind=${kind}] .mobile-media-open').click()`);
    assert.equal(await js(`document.querySelector('#${title}').value`),'My '+kind+' choice','Back preserves the draft');
    assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true,'Phone form must not overflow horizontally');
    await shot('mobile-add-'+kind);
    await js(`document.querySelector('#${save}').click()`);
    for(let n=0;n<100&&!libraries[route].length;n++)await new Promise(r=>setTimeout(r,20));
    assert.equal(libraries[route].length,1);assert.equal(libraries[route][0].title,'My '+kind+' choice');
    assert.equal(calls.some(c=>c.method==='PATCH'&&c.body?.screened===true),false,'Adding does not approve media without parent consent');
    assert.equal(Boolean(libraries[route][0].screened),false);
    await js(`document.querySelector('#tab-${kind} .mobile-media-manage').click()`);
    assert.equal(await visible('#tab-'+kind+' .tab-header'),true,kind+' library heading');
    assert.equal(await js(`document.querySelector(${JSON.stringify(subtab)}).classList.contains('active-stab')`),true,kind+' library tab');
  }
  win.setContentSize(320,568);await wait('innerWidth===320');await js('navigate("mobile-add");document.querySelector("[data-media-kind=audiobooks] .mobile-media-open").click()');
  assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
  win.setContentSize(1280,900);await wait('!document.body.classList.contains("cloud-mobile")');
  assert.equal(await visible('#tab-audiobooks .tab-header'),true);assert.equal(await visible('.mobile-media-toolbar'),false);
  assert.equal(calls.filter(c=>c.method==='POST'&&libraries[c.path]).length,3);
  assert.deepEqual(errors.filter(e=>!e.includes('ERR_BLOCKED_BY_CLIENT')&&!e.includes('404')),[]);
  console.log('PASS: media-only hub, zero hub requests, all three real add forms, unscreened defaults, draft retention, library navigation, 320/390px and desktop');win.destroy();server.close();app.exit(0);
}catch(error){console.error(error);server.close();app.exit(1);}})();
