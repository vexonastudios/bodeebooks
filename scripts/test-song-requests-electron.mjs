// Actual parent and child interfaces; synthetic records and no external traffic.
import { app, BrowserWindow, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),childRoot=path.resolve(root,'../bodee-guard');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-song-request-ui-')));app.disableHardwareAcceleration();
const calls=[],childCalls=[],sid='11111111-1111-4111-8111-111111111111';
const requests=[{id:'22222222-2222-4222-8222-222222222222',student_id:sid,student_name:'Avery',song_title:'<b>Plain song title</b>',artist_hint:'Example artist'},
  {id:'33333333-3333-4333-8333-333333333333',student_id:sid,student_name:'Avery',song_title:'Another song',artist_hint:''}];
let failApproval=true,failChild=true,childLibrary=[];
let html=JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/workspace.json'),'utf8')).html;
for(const[id,panel]of Object.entries(JSON.parse(fs.readFileSync(path.join(root,'app/guard/dashboard/generated/media.json'),'utf8'))))html=html.replace(new RegExp('<section class="tab-content" id="tab-'+id+'"[\\s\\S]*?<\\/section>'),panel);
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</head>','<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
 .replace('</body>','<script src="/guard-admin/media-defaults.js"></script><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
const script=`import {setupCloudMobile} from '/guard-admin/cloud-mobile.js';import {setupSongRequests} from '/guard-admin/cloud-song-requests.js';import '/guard-admin/cloud-media-admin.js';
let mobile;window.navigate=id=>{for(const p of document.querySelectorAll('.tab-content'))p.classList.toggle('active',p.id==='tab-'+id);mobile?.setActive(id);};
window.songs=setupSongRequests({endpoint:'/guard/dashboard/bridge/',navigate});mobile=setupCloudMobile({navigate,refresh:()=>songs.refreshPending(true),openSpelling:async()=>{}});navigate('overview');document.querySelector('.cloud-feedback').textContent='';window.lucide.createIcons();window.ready=true;`;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.local');res.setHeader('Cache-Control','no-store');
  const json=(body,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(script);}
  if(url.pathname==='/preview'){res.setHeader('Content-Type','text/html');return res.end('<p>Synthetic recording preview</p>');}
  if(url.pathname==='/guard/dashboard/bridge/'){
    let raw='';for await(const chunk of req)raw+=chunk;const value=JSON.parse(raw);calls.push(value);let body=[];
    if(value.path==='/api/music/requests-count')body={pending:requests.length};
    else if(value.path==='/api/music/requests')body=requests;
    else if(value.path.includes('/resolve')){
      if(value.body.action==='approve'&&failApproval){failApproval=false;return json({error:'Synthetic approval failure. Retry.'},503);}
      const index=requests.findIndex(row=>value.path.includes(row.id));if(index>=0)requests.splice(index,1);body={success:true};
    } else if(value.path==='/api/music/tracks')body=[{id:'44444444-4444-4444-8444-444444444444',title:'Example recording',artist:'Example artist',youtube_id:'abcdefghijk',active:1,screened:0}];
    else if(value.path.includes('/lookup?'))body={title:'Example recording',author_name:'Example artist'};
    else if(value.path==='/api/students')body=[{id:sid,name:'Avery'}];
    else if(value.path.includes('/settings'))body={};
    return json({status:200,body});
  }
  if(url.pathname.startsWith('/api/music/')){
    let raw='';for await(const chunk of req)raw+=chunk;childCalls.push({path:url.pathname,body:raw?JSON.parse(raw):null,retry:req.headers['x-media-request-id']});
    if(url.pathname==='/api/music/request'){
      if(failChild){failChild=false;return json({error:'Synthetic network failure'},503);}return json({success:true,created:true});
    }
    if(url.pathname.includes('/request-history/'))return json([{song_title:'Older example',request_status:'approved'}]);
    if(url.pathname.includes('/playlist/'))return json(childLibrary);
    if(url.pathname.endsWith('/settings'))return json({music_enabled:true});
    if(url.pathname.includes('/student-settings/'))return json({require_completion:0,max_daily_minutes:45});
    if(url.pathname.includes('/school-done/'))return json({done:true});
    if(url.pathname.includes('/listen/'))return json({seconds:0});
    return json([]);
  }
  let file;
  if(url.pathname==='/child')file=path.join(childRoot,'renderer/music.html');
  else if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname))file=path.join(root,'public',url.pathname);
  else if(/^\/(?:js\/media\/music|css\/media|lib|js\/shared)\/[a-z0-9.-]+$/.test(url.pathname))file=path.join(childRoot,'renderer',url.pathname);
  else if(/^\/shared\/[a-zA-Z0-9.-]+$/.test(url.pathname))file=path.join(childRoot,url.pathname);
  if(file&&fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}
  res.statusCode=404;res.end();
});
(async()=>{try{
  await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((d,done)=>{
    if(d.url.startsWith('https://www.youtube-nocookie.com/embed/'))return done({redirectURL:origin+'/preview'});
    done({cancel:!d.url.startsWith(origin)&&!d.url.startsWith('data:')});
  });
  const win=new BrowserWindow({show:false,width:390,height:844,useContentSize:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,offscreen:true}});
  const js=code=>win.webContents.executeJavaScript(code,true),wait=async code=>{for(let n=0;n<200;n++){if(await js(code))return;await new Promise(r=>setTimeout(r,25));}throw Error('Timed out: '+code);};
  const shot=async name=>{await new Promise(r=>setTimeout(r,160));fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp',name+'.png'),(await win.webContents.capturePage()).toPNG());};
  await win.loadURL(origin);await wait('window.ready');
  await js('Promise.all([songs.refreshPending(),songs.refreshPending()])');assert.equal(calls.filter(c=>c.path==='/api/music/requests-count').length,1,'Count coalesces');
  await js("document.dispatchEvent(new CustomEvent('cloud-coloring-pending',{detail:{pending:3}}));navigate('mobile-add')");
  assert.equal(await js("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').textContent"),'5','Music and coloring badges add together');
  await shot('mobile-song-request-hub');
  await js('songs.open()');await wait("document.querySelectorAll('.song-request-card').length===2");
  assert.equal(await js("document.querySelector('.song-request-card h3 b')===null"),true,'Student text is never interpreted as HTML');
  assert.equal(await js("document.querySelector('.song-request-card h3').textContent"),'<b>Plain song title</b>');
  await shot('mobile-song-requests');
  await js("document.querySelector('.song-request-card button').click()");await wait("document.querySelector('.song-review-dialog select').options.length===2");
  await js("const select=document.querySelector('.song-review-dialog select');select.value=select.options[1].value;select.dispatchEvent(new Event('change'))");
  assert.equal(await js("document.querySelector('.song-review-dialog > button').disabled"),true,'Explicit screening required');
  await shot('mobile-song-review');
  await js("document.querySelector('.song-review-consent input').click();document.querySelector('.song-review-dialog > button').click()");
  await wait("document.querySelector('.song-review-dialog').textContent.includes('Synthetic approval failure')");
  assert.equal(await js("document.querySelector('.song-review-consent input').checked"),true,'Failed save retains review choice');
  await js("document.querySelector('.song-review-dialog > button').click()");await wait("!document.querySelector('.song-review-dialog')");
  const approvals=calls.filter(c=>c.path.includes('/resolve')&&c.body.action==='approve');assert.equal(approvals.length,2);assert.equal(approvals[0].requestId,approvals[1].requestId,'Retry uses same receipt');
  assert.equal(approvals[1].body.screened,true);assert.equal(approvals[1].body.track_id,'44444444-4444-4444-8444-444444444444');
  await js("document.querySelectorAll('.song-request-card')[1].querySelectorAll('button')[1].click()");await wait("document.querySelectorAll('.song-request-card.is-reviewed').length===2");
  assert.equal(calls.filter(c=>c.path==='/api/music/requests').length,1,'Consecutive decisions keep queue in place');
  await wait("document.querySelector('[data-mobile-tab=mobile-add] .cloud-media-badge').textContent==='3'");
  win.setContentSize(320,650);await wait('innerWidth===320');assert.equal(await js('document.documentElement.scrollWidth<=innerWidth'),true);
  // New-link approval selection and desktop layout.
  requests.push({id:'55555555-5555-4555-8555-555555555555',student_id:sid,student_name:'Avery',song_title:'Third song'});
  win.setContentSize(1360,900);await wait('innerWidth===1360');await js('songs.open()');await wait("document.querySelector('.song-request-card:not(.is-reviewed)')");
  await js("document.querySelector('.song-request-card button').click()");await wait("document.querySelector('.song-review-dialog')");
  await js("document.querySelector('[aria-label=\"YouTube song link\"]').value='https://youtu.be/abcdefghijk';document.querySelector('.song-review-source button').click()");
  await wait("!document.querySelector('.song-review-consent input').disabled");await shot('desktop-song-review');
  assert.equal(await js("document.querySelector('.song-review-dialog').getBoundingClientRect().width<=innerWidth"),true);
  await js("document.querySelector('.song-review-dialog').close()");
  await win.loadURL(origin+'/child?student_id='+sid);
  await wait("document.getElementById('gate-empty').style.display==='flex'");
  await js("document.getElementById('request-empty-btn').click()");await wait("document.getElementById('req-history').textContent.includes('Approved')");
  await js("document.getElementById('req-title').value='Synthetic request';document.getElementById('req-send').click()");
  await wait("document.getElementById('req-error').textContent.includes('Synthetic network failure')");
  assert.equal(await js("document.getElementById('req-success').style.display"),'none','A server error never shows sent');
  await win.reload();await wait("document.getElementById('gate-empty').style.display==='flex'");await js("document.getElementById('request-empty-btn').click()");
  assert.equal(await js("document.getElementById('req-title').value"),'Synthetic request','Draft survives closing/reopening the player');
  await js("document.getElementById('req-send').click()");await wait("document.getElementById('req-success').style.display==='block'");
  const sends=childCalls.filter(c=>c.path==='/api/music/request');assert.equal(sends.length,2);assert.ok(sends[0].retry);assert.equal(sends[0].retry,sends[1].retry);
  await shot('child-song-request-sent');
  childLibrary=[{id:'song-a',youtube_id:'abcdefghijk',title:'First approved song'},{id:'song-b',youtube_id:'lmnopqrstuv',title:'New approved song'}];
  await js("document.getElementById('req-modal').style.display='none';document.getElementById('gate-empty').style.display='none';document.getElementById('shell').style.display='';allTracks=[{id:'song-a',youtube_id:'abcdefghijk',title:'First approved song'}];tracks=allTracks;currentIdx=0;stSettings={require_completion:0,max_daily_minutes:45};window.cloudMediaSettingsSnapshot=JSON.stringify({music_enabled:true});window.playerPauses=0;player={pauseVideo:()=>window.playerPauses++};window.refreshCloudMediaSettings()");
  assert.equal(await js('tracks.length'),2,'A media hint refreshes the open song list');
  assert.equal(await js('tracks[currentIdx].id'),'song-a');assert.equal(await js('window.playerPauses'),0,'Adding an approved song does not pause the current recording');
  win.destroy();server.close();console.log(JSON.stringify({passed:true,mobileBadges:true,reviewAndDecline:true,explicitScreening:true,stableRetries:true,textSafety:true,noQueueReload:true,desktop:true,childErrorHandling:true,childSavedDraft:true,emptyLibraryRequest:true}));app.exit(0);
}catch(error){console.error(error);server.close();app.exit(1);}})();
