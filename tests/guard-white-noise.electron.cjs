// Exercises the served website shell, parent bridge and real White Noise renderer.
// All household data, uploads and audio are fictional and stay inside this fixture.
const {app, BrowserWindow, session} = require('electron');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const Module = require('node:module');
const site = path.resolve(__dirname, '..'), ts = require(path.join(site, 'node_modules/typescript'));
const assets = 'https://bodeeguard-cloud-assets.james-7f8.workers.dev';
const cloud = process.env.BODEEGUARD_SOURCE || 'C:/Projects/worktrees/bodee-guard/game-picker-tutorial';
const bytes = fs.readFileSync(path.join(cloud, 'renderer/assets/game-sounds/game-start.mp3'));
const students = ['Bob', 'Betty', 'Billy'].map(name => ({id: crypto.randomUUID(), name, enabled: true}));
const tracks = [{id:crypto.randomUUID(), title:'Steady Rain', scope:'shared'}, {id:crypto.randomUUID(), title:'Our quiet study sound', scope:'family'}];
const output = path.join(site, '.tmp/white-noise'); fs.mkdirSync(output, {recursive:true});
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'guard-white-noise-')));
let origin, pending, failSave = false, failFinish = true, uploads = 0;
const calls = [], uploadIds = [], violations = [], errors = [];
class CloudApiError extends Error {constructor(message, status) {super(message);this.status=status;}}
async function api(route, init) {
  if (!route) return {students:[], devices:[], rules:{subjects:[]}};
  assert.equal(route, '/white-noise'); const input = JSON.parse(init.body); calls.push(input);
  if(input.action === 'list') return {students, tracks, canManageShared:false};
  if(input.action === 'enabled') {if(failSave){failSave=false;throw new CloudApiError('Connection interrupted. Try again.',503);}students.find(s=>s.id===input.studentId).enabled=input.enabled;return {saved:true};}
  if(input.action === 'begin') {pending=input;uploadIds.push(input.id);return {uploadUrl:assets+'/v1/white-noise-upload/synthetic'};}
  if(input.action === 'finish') {if(failFinish){failFinish=false;throw new CloudApiError('Upload receipt interrupted. Press Upload MP3 to retry.',503);}if(!tracks.some(t=>t.id===input.id))tracks.push({...pending});return {saved:true};}
  if(input.action === 'preview') return {url:assets+'/v1/download/synthetic.mp3'};
  if(input.action === 'remove') {tracks.splice(tracks.findIndex(t=>t.id===input.id),1);return {saved:true};}
  throw Error('Unexpected fixture operation');
}
function load(relative) {
  const filename=path.join(site,'app/guard/dashboard',relative), mod=new Module(filename), localRequire=Module.createRequire(filename);
  mod.filename=filename;mod.require=name=>{
    if(name==='@clerk/nextjs/server')return {auth:async()=>({isAuthenticated:true}),currentUser:async()=>({firstName:'Johnson Family'})};
    if(name==='../cloud-api')return {cloudApi:api,CloudApiError};
    const file=path.resolve(path.dirname(filename),name+'.ts');
    if(name.startsWith('.')&&fs.existsSync(file))return load(path.relative(path.join(site,'app/guard/dashboard'),file));
    return localRequire(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
  return mod.exports;
}
const workspace=load('workspace/route.ts'), bridge=load('bridge/route.ts');
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(url.pathname==='/') {
    const response=await workspace.GET(new Request(origin+'/guard/dashboard/workspace/'));
    let html=await response.text();html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link[^>]+https:\/\/fonts[^>]*>/g,'');
    html=html.replace('</body>','<script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(html);return;
  }
  if(url.pathname==='/fixture.js') {
    res.setHeader('Content-Type','text/javascript');res.end(`import {setupWhiteNoise} from '/guard-admin/cloud-white-noise.js';import {setupCloudMobile} from '/guard-admin/cloud-mobile.js';import {setupSidebarGroups,activateSidebarGroupForItem} from '/guard-admin/navigation-groups.js';
      window.fixtureViolations=[];document.addEventListener('securitypolicyviolation',e=>fixtureViolations.push(e.violatedDirective+': '+e.blockedURI));
      document.getElementById('cloud-dashboard-loading')?.remove();document.querySelector('.cloud-startup-loading')?.classList.remove('cloud-startup-loading');
      const noise=setupWhiteNoise({endpoint:'/guard/dashboard/bridge/'});let mobile;
      function navigate(id){noise.setActive(id==='white-noise');document.querySelectorAll('.tab-content').forEach(p=>p.classList.toggle('active',p.id==='tab-'+id));document.querySelectorAll('.nav-item').forEach(p=>p.classList.toggle('active',p.dataset.tab===id));activateSidebarGroupForItem(document.querySelector('.nav-item[data-tab="'+id+'"]'));mobile?.setActive(id);}
      setupSidebarGroups();mobile=setupCloudMobile({navigate,refresh:async()=>{}});document.querySelectorAll('.sidebar .nav-item[data-tab]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.tab)));window.fixtureNavigate=navigate;navigate('overview');lucide.createIcons();`);return;
  }
  if(url.pathname==='/guard/dashboard/bridge/') {let raw='';for await(const c of req)raw+=c;const response=await bridge.POST(new Request(origin+url.pathname,{method:'POST',headers:{origin,'content-type':'application/json'},body:raw}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
  if(url.pathname==='/guard/report/api/') {res.setHeader('Content-Type','application/json');res.end('{"count":0}');return;}
  const file=path.join(site,'public',url.pathname);if(!file.startsWith(path.join(site,'public'))||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'image/png');res.end(fs.readFileSync(file));
}catch(error){errors.push(error.message);res.writeHead(500);res.end('Fixture failed');}});
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 await session.defaultSession.protocol.handle('https',async request=>{
   assert.equal(new URL(request.url).origin,assets,'No external service contact');
   const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,PUT,OPTIONS','Access-Control-Allow-Headers':'content-type'};
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method==='PUT'){const received=Buffer.from(await request.arrayBuffer());assert.deepEqual(received,bytes);assert.equal(crypto.createHash('sha256').update(received).digest('hex'),pending.sha256);uploads++;return new Response('{}',{status:201,headers});}
   return new Response(bytes,{headers:{...headers,'Content-Type':'audio/mpeg'}});
 });
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)&&!d.url.startsWith(assets)&&!d.url.startsWith('data:')&&!d.url.startsWith('blob:')}));
 const win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,offscreen:true}});
 const js=code=>win.webContents.executeJavaScript(code,true), wait=async code=>{for(let i=0;i<160;i++){if(await js(code))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+code);};
 const capture=async name=>fs.writeFileSync(path.join(output,name+'.png'),(await win.webContents.capturePage()).toPNG());
 try{
   await win.loadURL(origin);await wait('Boolean(window.fixtureNavigate)');assert.equal(calls.length,0,'No catalog request before opening page');
   await js('document.querySelector("[data-tab=white-noise]").click()');await wait('document.querySelectorAll(".white-noise-child").length===3');
   assert.equal(await js('document.querySelector("#tab-white-noise").classList.contains("active")'),true);
   await capture('desktop');
   await js('document.querySelectorAll(".white-noise-child input")[2].click()');await wait('document.querySelector("#cloud-white-noise [role=status]").textContent.includes("disabled for Billy")');assert.equal(students[2].enabled,false);assert.ok(students[0].enabled&&students[1].enabled);await capture('desktop-disabled');
   failSave=true;await js('document.querySelector(".white-noise-child input").click()');await wait('document.querySelector("#cloud-white-noise [role=status]").textContent.includes("Connection interrupted")');assert.equal(await js('document.querySelector(".white-noise-child input").checked'),true,'Failed save restores checkbox');
   assert.equal(await js('[...document.querySelector(".white-noise-track").querySelectorAll("button")].some(b=>b.textContent.includes("Remove"))'),false,'Shared tracks cannot be removed');
   await js(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(atob('${bytes.toString('base64')}'),c=>c.charCodeAt(0))],'Quiet study.mp3',{type:'audio/mpeg'}));const file=document.querySelector('.white-noise-upload input[type=file]');file.files=transfer.files;file.dispatchEvent(new Event('change'));})()`);
   await wait('document.querySelector(".white-noise-upload audio").readyState>=2');await js('document.querySelector(".white-noise-upload button[type=submit]").click()');await wait('document.querySelector("#cloud-white-noise [role=status]").textContent.includes("Upload receipt interrupted")');
   await js('document.querySelector(".white-noise-upload button[type=submit]").click()');await wait('document.querySelectorAll(".white-noise-track").length===3');assert.equal(new Set(uploadIds).size,1);assert.equal(uploads,2);
   await js('document.querySelector(".white-noise-track button").click()');await wait('document.querySelector(".white-noise-track audio").currentTime>0');
   await js('fixtureNavigate("overview")');assert.equal(await js('document.querySelector(".white-noise-track audio").paused'),true);
   for(const width of [390,320]) {
     win.setContentSize(width,844);await new Promise(r=>setTimeout(r,100));await js('document.querySelector("[data-mobile-tab=mobile-add]").click()');await capture('mobile-add-'+width);
     await js('document.querySelector("[data-media-kind=white-noise] button").click()');await wait('document.querySelector("#tab-white-noise").classList.contains("active")');
     assert.equal(await js('document.getElementById("tab-white-noise").scrollWidth<=document.querySelector(".main-content").clientWidth+1'),true,'No overflow at '+width);
     await capture('mobile-'+width);await js('document.querySelector("#tab-white-noise > button").click()');assert.equal(await js('document.querySelector("#tab-mobile-add").classList.contains("active")'),true);
     await js('fixtureNavigate("mobile-more");document.querySelector("[data-more-item=white-noise]").click()');assert.equal(await js('document.querySelector("#tab-white-noise").classList.contains("active")'),true);
   }
   const count=calls.length;await new Promise(r=>setTimeout(r,1100));assert.equal(calls.length,count,'No polling');
   violations.push(...await js('fixtureViolations'));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
   fs.writeFileSync(path.join(output,'ui-verification.json'),JSON.stringify({desktop:true,mobile:[390,320],savedChildOnly:true,failedSaveReverted:true,uploadRetries:uploads,playback:true,uploadCsp:true,noPolling:true,realHouseholdWrites:0},null,2));
   console.log('White Noise passed: served shell/bridge, desktop, mobile Add media/More, per-child save/retry, upload retry, CSP, preview and no polling.');
 }finally{win.destroy();server.close();}
}
app.whenReady().then(run).then(()=>app.exit(0),e=>{console.error(e);app.exit(1);});
