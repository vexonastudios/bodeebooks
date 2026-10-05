'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Electron fixture uses CommonJS. */
// Fictional poem/photos, local HTTP, native chooser interception and a fresh profile.
const {app,BrowserWindow,session,nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
const site=path.resolve(__dirname,'..'),profile=fs.mkdtempSync(path.join(os.tmpdir(),'bg-poem-picker-'));app.setPath('userData',profile);app.disableHardwareAcceleration();
const photo=path.join(profile,'synthetic-poem.png'),pixels=Buffer.alloc(400*400*4);let seed=123456;
for(let i=0;i<pixels.length;i+=4){for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i+c]=seed>>>24;}pixels[i+3]=255;}
fs.writeFileSync(photo,nativeImage.createFromBitmap(pixels,{width:400,height:400}).toPNG());assert.ok(fs.statSync(photo).size>300*1024,'fixture photo requires real compression');
const scanCalls=[],choosers=[];let scanningAvailable=true,releaseFirstScan;
const poemText='A gentle breeze\nMoves through the trees.\n\nThe morning light\nIs warm and bright.';
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture.local');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe src="/guard/dashboard/workspace/" title="Parent dashboard"></iframe>');return;}
  if(url.pathname==='/guard/dashboard/workspace/'){
    const html=JSON.parse(fs.readFileSync(path.join(site,'app/guard/dashboard/generated/workspace.json'),'utf8')).html;
    const start=html.indexOf('<section class="tab-content" id="tab-poems"'),end=html.indexOf('<section class="tab-content"',start+1);assert.ok(start>=0&&end>start);
    res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' blob:; media-src blob:; object-src 'none'; base-uri 'none'");
    res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><link rel="stylesheet" href="/guard-admin/cloud-workspace.css"><link rel="stylesheet" href="/guard-admin/poems.css"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"><style>body{padding:12px}.tab-content{display:block}</style></head><body class="cloud-mobile"><div class="cloud-workspace">'+html.slice(start,end)+'</div><script src="/guard-admin/cloud-file-tools.js"></script><script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body></html>');return;
  }
  if(url.pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end("import {setupCloudPoems} from '/guard-admin/cloud-poems.js';window.confirm=()=>true;window.controller=setupCloudPoems();controller.setActive(true);window.lucide?.createIcons();window.ready=true;");return;}
  if(url.pathname.startsWith('/guard-admin/')){const file=path.resolve(site,'public','.'+url.pathname);if(!file.startsWith(path.join(site,'public','guard-admin')+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));return;}
  if(req.method==='POST'&&['/guard/dashboard/poems/','/guard/dashboard/poems-scan/'].includes(url.pathname)){
    let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);res.setHeader('Content-Type','application/json');
    if(url.pathname.endsWith('/poems/')){assert.equal(input.action,'list');res.end(JSON.stringify({students:[{id:'child-1',name:'Alex'}],assignments:[],hasMore:false,defaults:{startDate:'2026-10-05'},photoScanningAvailable:scanningAvailable}));return;}
    scanCalls.push(input);if(scanCalls.length===1){releaseFirstScan=()=>{res.writeHead(503);res.end(JSON.stringify({error:'Synthetic lost scan reply.'}));};return;}
    res.end(JSON.stringify({id:input.id,title:'Morning Breeze',author:'Test Author',poem_text:poemText,requires_review:false}));return;
  }
  res.writeHead(404);res.end();
});
let win;const watchdog=setTimeout(()=>{console.error('Poem photo fixture timed out');app.exit(1);},60000);
(async()=>{
  await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('blob:')&& !details.url.startsWith('data:')}));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  win=new BrowserWindow({show:false,width:390,height:844,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const js=code=>win.webContents.mainFrame.frames[0].executeJavaScript('(()=>{const d=document,w=window;return ('+code+');})()',true);
  const until=async(expression,label)=>{const end=Date.now()+10000;while(Date.now()<end){if(await(expression instanceof Function?expression():js(expression)))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+label);};
  // Electron executeJavaScript's userGesture flag exercises the native chooser without a real camera.
  const tap=async(selector,icon=false)=>js('(()=>{const el=d.querySelector('+JSON.stringify(selector)+');el.scrollIntoView({block:"center"});'+(icon?'el.querySelector("svg").dispatchEvent(new w.MouseEvent("click",{bubbles:true}));':'el.click();')+'return true;})()');
  let nextSelection='cancel';
  await win.loadURL(origin);
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Page.enable');
  await win.webContents.debugger.sendCommand('DOM.enable');
  await win.webContents.debugger.sendCommand('Page.setInterceptFileChooserDialog',{enabled:true});
  win.webContents.debugger.on('message',(_event,method,params)=>{
    if(method!=='Page.fileChooserOpened')return;
    choosers.push({mode:params.mode});
    void win.webContents.debugger.sendCommand('DOM.setFileInputFiles',{backendNodeId:params.backendNodeId,files:nextSelection==='cancel'?[]:[photo]}).catch(error=>{console.error(error);app.exit(1);});
  });
  await until('w.ready && d.querySelector("#poem-student option")','poem list loaded');await js('(()=>{d.querySelector("#tab-poems").classList.add("active");return true;})()');await tap('#poem-add');await until('d.querySelector("#poem-modal").classList.contains("active")','editor open');
  for(const width of [320,390,768]){win.setContentSize(width,844);await new Promise(resolve=>setTimeout(resolve,80));const boxes=await js('["poem-take-photo","poem-choose-photos"].map(id=>{const el=d.getElementById(id);return {tag:el.tagName,disabled:el.disabled,box:el.getBoundingClientRect().toJSON()};})');assert.ok(boxes.every(value=>value.tag==='BUTTON'&&!value.disabled&&value.box.width>=44&&value.box.height>=44),'real keyboard-accessible photo buttons fit mobile');assert.equal(await js('d.documentElement.scrollWidth<=w.innerWidth'),true);}
  win.setContentSize(390,844);await new Promise(resolve=>setTimeout(resolve,80));
  assert.equal(await js('d.querySelector("#poem-camera").getAttribute("capture")'),'environment');
  assert.equal(await js('d.querySelector("#poem-camera").multiple'),false);assert.equal(await js('d.querySelector("#poem-photos").multiple'),true);
  await js('(()=>{d.querySelector("#poem-title").value="Manual draft";d.querySelector("#poem-text").value="Keep this draft.";return true;})()');
  await tap('#poem-take-photo',true);await until(()=>choosers.length===1,'camera icon opens native chooser');assert.equal(choosers[0].mode,'selectSingle');assert.equal(scanCalls.length,0);assert.equal(await js('d.querySelector("#poem-text").value'),'Keep this draft.','cancel keeps typed poem');
  nextSelection='photo';await tap('#poem-take-photo');await until(()=>scanCalls.length===1,'selected camera image reaches scanner');
  assert.ok(await js('d.querySelector("#poem-take-photo").disabled && d.querySelector("#poem-choose-photos").disabled'),'photo controls pause during scan');
  await tap('#poem-choose-photos');assert.equal(choosers.length,2,'disabled chooser cannot open another picker mid-scan');
  assert.equal(scanCalls[0].images.length,1);assert.equal(scanCalls[0].images[0].mime,'image/jpeg','actual file tool converts/compresses the captured image');assert.ok(Buffer.from(scanCalls[0].images[0].data,'base64').length>0);
  releaseFirstScan();await until('!d.querySelector("#poem-scan-retry").hidden','failed scan exposes retry');assert.equal(await js('d.querySelector("#poem-text").value'),'Keep this draft.','lost scan does not discard manual text');
  await tap('#poem-scan-retry');await until('d.querySelector("#poem-text").value.includes("A gentle breeze")','retry fills reviewed poem');assert.deepEqual(scanCalls[1],scanCalls[0],'retry keeps exact scan ID and encoded images');
  assert.equal(await js('d.querySelector("#poem-text").value'),poemText,'line/stanza breaks remain intact');assert.equal(await js('d.querySelector("#poem-author").value'),'Test Author');
  await until('!d.querySelector("#poem-choose-photos").disabled','retry finishes before choosing again');await tap('#poem-choose-photos');
  await until(()=>choosers.length===3,'gallery button opens native picker');await until(()=>scanCalls.length===3,'same photo can be chosen again');assert.equal(choosers[2].mode,'selectMultiple');assert.notEqual(scanCalls[2].id,scanCalls[0].id);
  await until('!d.querySelector("#poem-take-photo").disabled','rescan finishes');
  await js('(()=>{d.querySelector(".poem-modal-card").scrollTop=0;return true;})()');
  fs.mkdirSync(path.join(site,'.tmp/poem-photo-picker-20261005'),{recursive:true});fs.writeFileSync(path.join(site,'.tmp/poem-photo-picker-20261005/mobile-editor.png'),(await win.webContents.capturePage()).toPNG());
  await tap('#poem-cancel');scanningAvailable=false;await js('(()=>{w.controller.setActive(false);w.controller.setActive(true);return true;})()');await until('!d.querySelector("#poem-admin-status").textContent','unavailable state reloaded');await tap('#poem-add');
  assert.ok(await js('d.querySelector("#poem-take-photo").disabled && d.querySelector("#poem-choose-photos").disabled'),'unavailable scanner visibly disables both real controls');assert.match(await js('d.querySelector("#poem-scan-status").textContent'),/unavailable/);assert.equal(await js('d.querySelector("#poem-text").disabled'),false,'manual poem entry remains available');await tap('#poem-take-photo');assert.equal(choosers.length,3);
  console.log('Poem photo picker passed: real camera/gallery and icon taps inside a same-origin iframe with strict CSP; native single/multi-file chooser events; cancellation preserves draft; 320/390/768px touch targets; real image compression; scan failure and exact retry; title/author/line/stanza review; same-photo reselection; busy/unavailable controls and manual fallback. No real camera, household, upload or AI provider used.');
  clearTimeout(watchdog);win.destroy();await new Promise(resolve=>server.close(resolve));app.quit();
})().catch(error=>{console.error(error);clearTimeout(watchdog);if(win&&!win.isDestroyed())win.destroy();server.close();app.exit(1);});
