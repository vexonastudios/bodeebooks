'use strict';
// Exercise real top-level navigation from the production sandbox. Synthetic
// setup/account pages only: no family changes, downloads or Windows installs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {app,BrowserWindow,session}=require('electron');
const site=path.resolve(__dirname,'..');
const sandbox=fs.readFileSync(path.join(site,'app/guard/dashboard/ParentWorkspace.tsx'),'utf8').match(/sandbox="([^"]+)"/)[1];
const studentId='11111111-1111-4111-8111-111111111111';
const snapshot={parentPassword:{configured:true,revision:1},students:[{id:studentId,name:'Sample Child'}],devices:[],rules:{revision:1,subjects:[{id:'school',assignments:[{studentId,dailyPlan:{placement:'school'}}]}],schedule:{enabled:false}}};
const setup={revision:1,step:7,completed:false,features:{},contentChoices:{},chores:{chosen:true,enabled:false,revision:1},catalog:{version:1}};
let writes=0, issued=0, failCode=false, expiresIn=60000;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Content-Type','text/html');
 if(url.pathname==='/')return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style><iframe title="Parent dashboard" sandbox="${sandbox}" src="/workspace?setup=connect"></iframe>`);
 if(url.pathname==='/workspace')return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><section id="tab-overview"><div class="tab-header"></div></section><section id="tab-settings"><div class="tab-header"></div></section><section id="tab-family-games"><div class="tab-header"></div><p>Game permissions panel</p></section><script type="module" src="/fixture.js"></script>');
 if(url.pathname==='/fixture.js'){
  res.setHeader('Content-Type','text/javascript');return res.end(`import {setupParentStart} from '/guard-admin/cloud-parent-start.js';const guide=setupParentStart({endpoint:'/setup',getSnapshot:()=>(${JSON.stringify(snapshot)}),navigate:()=>{},mutate:()=>{throw Error('No mutation expected')}});guide.update();`);
 }
 if(url.pathname==='/setup'){
  let raw='';for await(const part of req)raw+=part;
  const input=JSON.parse(raw);if(input.action==='save-setup'){writes++;setup.revision++;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(setup));}if(input.action!=='get-setup'){writes++;res.statusCode=400;return res.end('{}');}
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(setup));
 }
 if(url.pathname==='/guard/install/code/'){
  assert.equal(req.method,'POST');issued++;
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  if(failCode){failCode=false;res.statusCode=503;return res.end(JSON.stringify({error:'Downloads temporarily unavailable.'}));}
  return res.end(JSON.stringify({code:'MKR7',expiresAt:new Date(Date.now()+expiresIn).toISOString()}));
 }
 if(url.pathname==='/guard/account/'||url.pathname==='/guard/activate/')return res.end(`<h1>${url.pathname.includes('account')?'Windows installer':'Enter pairing code'}</h1><a href="/?setup=connect">Continue setup</a>`);
 if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){
  const file=path.join(site,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}
 }
 res.statusCode=404;res.end();
});
app.setPath('userData',fs.mkdtempSync(path.join(require('node:os').tmpdir(),'bg-setup-links-')));
app.on('window-all-closed',()=>{});
async function main(){
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)&&!details.url.startsWith('data:')}));
 const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const js=source=>win.webContents.executeJavaScript(source,true);
 const inside=source=>js(`(()=>{const document=window.document.querySelector('iframe').contentDocument;${source}})()`);
 const wait=async source=>{const end=Date.now()+8000;while(Date.now()<end){if(await js(source))return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Timed out: '+source);};
 let popups=0;win.webContents.setWindowOpenHandler(()=>{popups++;return{action:'deny'};});
 assert.equal(sandbox.includes('allow-popups'),false);
 for(const width of [1280,390,320]){
  win.setContentSize(width,900);
  await win.loadURL(origin+'/?setup=connect');await wait(`!!document.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]')`);
  const headings=await inside(`return [...document.querySelectorAll('.setup-device-steps li>strong:first-child')].map(el=>el.textContent);`);
  assert.deepEqual(headings,['Start on the child’s Windows computer','Get the download code on your phone','Back on your phone']);
  assert.ok(await inside(`const pc=document.querySelector('.setup-device-steps li');return pc.textContent.includes('guard.bodeebooks.com/install')&&pc.textContent.includes('Already installed')&&!pc.querySelector('a');`));
  assert.equal(await inside(`return document.querySelector('.setup-connection-status').open;`),false);
  assert.ok(await inside(`const d=document.querySelector('dialog');return d.scrollWidth<=d.clientWidth+1;`));
  fs.mkdirSync(path.join(site,'.tmp','setup-links'),{recursive:true});
  await new Promise(resolve=>setTimeout(resolve,90));
  fs.writeFileSync(path.join(site,'.tmp','setup-links','connect-first-'+width+'.png'),(await win.webContents.capturePage()).toPNG());
  const create=()=>inside(`document.querySelector('.setup-device-steps button').click();`);
  const handoffWait=s=>wait("document.querySelector('iframe')?.contentDocument?.querySelector("+JSON.stringify(s)+")");
  const before=issued;
  if(width!==320){
   if(width===1280){
    failCode=true;await create();await wait(`document.querySelector('iframe').contentDocument.querySelector('.setup-code-result').textContent.includes('temporarily unavailable')`);
    expiresIn=500;
   }
   await inside(`const b=document.querySelector('.setup-device-steps button');b.click();b.click();`);await handoffWait('.setup-download-code');
   assert.ok(await inside(`const code=document.querySelector('.setup-download-code');return code.textContent==='MKR7'&&code.parentElement.parentElement.innerText.includes('Run the installer');`));
   if(width===1280){
    await wait(`document.querySelector('iframe').contentDocument.querySelector('.setup-code-result').textContent.includes('expired')`);
    assert.ok(await inside(`return !document.querySelector('.setup-download-code')&&!document.querySelector('.setup-device-steps button').hidden;`));
    expiresIn=60000;await create();await handoffWait('.setup-download-code');
   }
   assert.equal(issued,before+(width===1280?3:1),'one issue per deliberate request, including retry after failure and expiry');
  }
  // An already-installed family can approve immediately, before issuing any code.
  await inside(`document.querySelector('.setup-device-steps a').click();`);
  await wait(`document.querySelector('h1')?.textContent==='Enter pairing code'`);
  assert.equal(new URL(win.webContents.getURL()).search,'?setup=1');
  if(width===320)assert.equal(issued,before);
 }
 snapshot.devices.push({id:'sample-device',computer_name:'Study laptop',student_id:null,revision:1});
 await win.loadURL(origin+'/?setup=connect');await wait(`!!document.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]')`);
 assert.equal(await inside(`return document.querySelector('.setup-body').firstElementChild.classList.contains('setup-computer-assignment');`),true,'return directly to the child assignment after approval');
 await inside(`document.querySelector('.setup-connection-status').open=true;document.querySelector('.setup-next-action button').click();`);
 assert.equal(await inside(`return document.activeElement===document.querySelector('.setup-computer-assignment select');`),true);
 assert.equal(writes,0);assert.equal(popups,0);
 await inside(`document.querySelector('.setup-extra-options').open=true;`);
 await inside(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Choose games for each child').click();`);
 await wait(`document.querySelector('iframe')?.contentDocument?.querySelector('dialog[data-setup-section="family-games"]')`);
 assert.equal(await inside(`return document.querySelector('dialog').textContent.includes('Game permissions panel');`),true);
 await inside(`[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Back to setup').click();`);
 assert.equal(await inside(`return !!document.querySelector('dialog[open]')&&!document.querySelector('dialog').dataset.setupSection;`),true);
 win.destroy();console.log('Computer handoff passed: child-PC first, inline code issuance, failure, expiry, direct pairing, assignment, and desktop/phone layouts.');
}
const timer=setTimeout(()=>{console.error('Setup link fixture timed out');app.exit(1);},30000);
main().then(()=>{clearTimeout(timer);server.close(()=>app.exit(0));}).catch(error=>{console.error(error);clearTimeout(timer);server.close(()=>app.exit(1));});
