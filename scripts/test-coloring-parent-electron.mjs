import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root=fileURLToPath(new URL('..',import.meta.url));
let sharp;
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-coloring-parent-')));
app.disableHardwareAcceleration();
const requests=[],children=[{id:'11111111-1111-4111-8111-111111111111',name:'Avery',used_today:2,settings:{enabled:true,daily_limit:3}}];
const pages=[1,2,3].map(n=>({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa'+n,student_id:children[0].id,student_name:'Avery',title:['A peaceful garden','A puppy and a kite','Saved flowers'][n-1],status:n===3?'completed':'pending_image_review',image_url:'private-r2',shared_with_family:false}));
let shareDefault=false,failApproval=true;
const pending=()=>pages.filter(p=>p.status==='pending_image_review').length;
const view=()=>({configured:true,students:children,requests:pages,global_settings:{auto_share_with_family:shareDefault,family_daily_limit:8,family_monthly_limit:60,reuse_matching_pages:true},generation_remaining:{today:6,month:58},pending:pending()});
const template=JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/workspace.json'),'utf8')).html;
const html=template.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
 .replace(/<section class="tab-content" id="tab-coloring-studio"[\s\S]*?<\/section>/,'<section class="tab-content" id="tab-coloring-studio"><div id="cloud-coloring-studio"></div></section>')
 .replace('</head>','<link rel="stylesheet" href="/guard-admin/cloud-coloring-studio.css"><link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
 .replace('</body>','<script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
const script="import {setupCloudMobile} from '/guard-admin/cloud-mobile.js'; import {setupCloudColoringStudio} from '/guard-admin/cloud-coloring-studio.js'; window.coloring=setupCloudColoringStudio({endpoint:'/bridge'}); let mobile; window.navigate=id=>{for(const p of document.querySelectorAll('.tab-content'))p.classList.toggle('active',p.id==='tab-'+id); coloring.setActive(id==='coloring-studio');mobile?.setActive(id);}; mobile=setupCloudMobile({navigate,refresh:()=>coloring.refreshPending(true),openSpelling:async()=>{}}); navigate('overview');window.lucide.createIcons();window.ready=true;";
let image;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture.local');res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(script);}
 if(url.pathname==='/bridge'){
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);requests.push(body);res.setHeader('Content-Type','application/json');
  if(body.action==='coloring-pending')return res.end(JSON.stringify({pending:pending()}));
  if(body.action==='coloring-overview')return res.end(JSON.stringify(view()));
  if(body.action==='coloring-image')return res.end(JSON.stringify({mime:'image/webp',data:image.toString('base64')}));
  if(body.action==='coloring-request-action'){
   if(failApproval){failApproval=false;res.statusCode=503;return res.end(JSON.stringify({error:'Synthetic approval failure. Try again.'}));}
   const page=pages.find(p=>p.id===body.requestId);
   assert.equal(body.requestAction,'approve-image');page.status='completed';page.shared_with_family=body.shareWithFamily;return res.end(JSON.stringify(page));
  }
  if(body.action==='coloring-global-settings'){shareDefault=body.auto_share_with_family;return res.end(JSON.stringify({settings:view().global_settings}));}
  res.statusCode=400;return res.end('{}');
 }
 if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){const file=path.join(root,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}}
 res.statusCode=404;res.end();
});
(async()=>{try{
 sharp=createRequire(new URL('../../bodee-guard/services/commercial-api/package.json',import.meta.url))('sharp');
 await app.whenReady();
 image=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="white"/><circle cx="200" cy="140" r="65" stroke="black" stroke-width="6" fill="none"/><path d="M200 205V350M200 290Q80 230 120 320M200 270Q320 210 280 315" stroke="black" stroke-width="6" fill="none"/></svg>')).webp().toBuffer();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((d,done)=>done({cancel:!d.url.startsWith(origin)&&!d.url.startsWith('data:')}));
 const win=new BrowserWindow({show:false,width:390,height:844,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
 const errors=[];win.webContents.on('console-message',(_e,level,message)=>{if(level===3)errors.push(message)});
 const js=code=>win.webContents.executeJavaScript(code,true);
 const wait=async code=>{for(let i=0;i<160;i++){if(await js(code))return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+code+'\n'+errors.join('\n'));};
 const shot=async name=>{fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp',name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await win.loadURL(origin);await wait('window.ready');await js("document.querySelector('.cloud-feedback').textContent=''");
 await js("Promise.all([coloring.refreshPending(),coloring.refreshPending()])");assert.equal(requests.length,1,'Initial count coalesces');
 await js("document.querySelector('[data-mobile-tab=mobile-more]').click()");
 assert.equal(await js("Array.from(document.querySelectorAll('#tab-mobile-more .more-list button')).every(b=>b.querySelectorAll('svg').length===2)"),true,'Every More item has an icon and chevron');
 await shot('mobile-more-icons');
 await js("document.querySelector('[data-mobile-tab=mobile-add]').click()");
 assert.equal(await js("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').textContent"),'2');
 assert.equal(requests.filter(r=>r.action==='coloring-image').length,0,'Badge and hub never download images');
 await shot('mobile-coloring-hub');
 await js("document.querySelector('[data-media-kind=coloring-studio] .mobile-media-open').click()");
 await wait("document.querySelectorAll('.cloud-coloring-review .cloud-coloring-request').length===2");
 const first=pages[0].id,second=pages[1].id;
 const card=id=>"[data-request-id='"+id+"']";
 await wait("!document.querySelector("+JSON.stringify(card(first)+" .cloud-coloring-approve")+").disabled");
 assert.equal(await js("document.querySelector('[data-mobile-tab=mobile-add]').getAttribute('aria-current')"),'page');
 assert.equal(await js("document.documentElement.scrollWidth<=innerWidth"),true);
 assert.equal(requests.some(r=>r.action==='coloring-image'&&r.requestId===pages[2].id),false,'Collapsed saved library stays lazy');
 await shot('mobile-coloring-review');
 await js("document.querySelector("+JSON.stringify(card(first)+" .cloud-coloring-zoom")+").click()");
 await wait("document.querySelector('.cloud-coloring-dialog img')?.naturalWidth>0");
 assert.ok(requests.some(r=>r.action==='coloring-image'&&r.thumbnail===false));
 await js("document.querySelector('.cloud-coloring-dialog').close()");
 await js("document.querySelector("+JSON.stringify(card(first)+" [name=shareWithFamily]")+").checked=true;document.querySelector("+JSON.stringify(card(first)+" .cloud-coloring-approve")+").click()");
 await wait("document.querySelector("+JSON.stringify(card(first)) +").textContent.includes('Synthetic approval failure')");
 assert.equal(await js("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').textContent"),'2','Failed approval preserves pending badge');
 await js("document.querySelector("+JSON.stringify(card(first)+" .cloud-coloring-approve")+").click()");
 await wait("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').textContent==='1'");
 assert.equal(await js("document.querySelector("+JSON.stringify(card(second)+" [name=shareWithFamily]")+").checked"),false,'Next page choice is preserved');
 assert.equal(requests.filter(r=>r.action==='coloring-overview').length,1,'Approval does not reload the gallery');
 await js("document.querySelector("+JSON.stringify(card(second))+").scrollIntoView({block:'center'})");
 await wait("!document.querySelector("+JSON.stringify(card(second)+" .cloud-coloring-approve")+").disabled");
 await js("document.querySelector("+JSON.stringify(card(second)+" .cloud-coloring-approve")+").click()");
 await wait("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').hidden");
 assert.equal(pages[0].shared_with_family,true);assert.equal(pages[1].shared_with_family,false);
 await js("document.querySelector('[name=auto_share_with_family]').checked=true;document.querySelector('.cloud-coloring-budget').requestSubmit()");
 await wait("document.querySelector('[name=auto_share_with_family]')?.checked && !document.querySelector('#cloud-coloring-studio').hasAttribute('aria-busy')");
 for(let n=0;n<100&&!shareDefault;n++)await new Promise(r=>setTimeout(r,20));
 assert.equal(shareDefault,true);
 await wait("document.querySelector('[name=auto_share_with_family]')?.checked && !document.querySelector('#cloud-coloring-studio').hasAttribute('aria-busy')");
 win.setContentSize(320,650);await wait('innerWidth===320');assert.equal(await js("document.documentElement.scrollWidth<=innerWidth"),true,'Small phone fits');
 win.setContentSize(1360,900);await wait('innerWidth===1360');
 await js("navigate('coloring-studio')");await wait("document.querySelector('[name=auto_share_with_family]')?.checked");
 assert.equal(await js("document.documentElement.scrollWidth<=innerWidth"),true,'Desktop fits');
 await shot('desktop-coloring-sharing');
 assert.equal(errors.filter(e=>!e.includes('503')&&!e.includes('favicon')).length,0,errors.join('\n'));
 win.destroy();server.close();console.log(JSON.stringify({passed:true,moreIcons:true,pendingBadge:true,lazyImages:true,fullImagePreview:true,failedApproval:true,approveAndShare:true,individualException:true,noGalleryReload:true,globalPreference:true,mobile320:true,desktop:true}));app.exit(0);
}catch(error){console.error(error);server.close();app.exit(1);}})();

