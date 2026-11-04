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
let writes=0;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Content-Type','text/html');
 if(url.pathname==='/')return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style><iframe title="Parent dashboard" sandbox="${sandbox}" src="/workspace?setup=connect"></iframe>`);
 if(url.pathname==='/workspace')return res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><section id="tab-overview"><div class="tab-header"></div></section><section id="tab-settings"><div class="tab-header"></div></section><script type="module" src="/fixture.js"></script>');
 if(url.pathname==='/fixture.js'){
  res.setHeader('Content-Type','text/javascript');return res.end(`import {setupParentStart} from '/guard-admin/cloud-parent-start.js';const guide=setupParentStart({endpoint:'/setup',getSnapshot:()=>(${JSON.stringify(snapshot)}),navigate:()=>{},mutate:()=>{throw Error('No mutation expected')}});guide.update();`);
 }
 if(url.pathname==='/setup'){
  let raw='';for await(const part of req)raw+=part;
  const input=JSON.parse(raw);if(input.action!=='get-setup'){writes++;res.statusCode=400;return res.end('{}');}
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(setup));
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
 for(const width of [1280,390]){
  win.setContentSize(width,900);
  await win.loadURL(origin+'/?setup=connect');await wait(`!!document.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]')`);
  assert.equal(await inside(`return document.querySelector('.setup-next-action button')?.textContent||'';`),'','no empty scroll-only action when there is no computer to assign');
  assert.equal(await inside(`return document.querySelectorAll('.setup-next-action a').length;`),2);
  assert.ok(await inside(`const d=document.querySelector('dialog');return d.scrollWidth<=d.clientWidth+1;`));
  fs.mkdirSync(path.join(site,'.tmp','setup-links'),{recursive:true});
  await new Promise(resolve=>setTimeout(resolve,150));
  fs.writeFileSync(path.join(site,'.tmp','setup-links',width+'.png'),(await win.webContents.capturePage()).toPNG());
  // Click the actual anchor with a browser user gesture. Attributes alone would
  // not catch sandbox-blocked navigation or PWA nesting.
  await inside(`document.querySelector('.setup-next-action a').click();`);
  await wait(`document.querySelector('h1')?.textContent==='Windows installer'`);
  assert.equal(new URL(win.webContents.getURL()).search,'?setup=connect');
  assert.equal(new URL(win.webContents.getURL()).hash,'#child-setup-heading');
  await js(`document.querySelector('a').click()`);await wait(`!!document.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]')`);
  await inside(`document.querySelectorAll('.setup-next-action a')[1].click();`);
  await wait(`document.querySelector('h1')?.textContent==='Enter pairing code'`);
  assert.equal(new URL(win.webContents.getURL()).search,'?setup=1');
 }
 snapshot.devices.push({id:'sample-device',computer_name:'Study laptop',student_id:null,revision:1});
 await win.loadURL(origin+'/?setup=connect');await wait(`!!document.querySelector('iframe')?.contentDocument?.querySelector('dialog[open]')`);
 await inside(`document.querySelector('.setup-next-action button').click();`);
 assert.equal(await inside(`return document.activeElement===document.querySelector('.setup-computer-assignment select');`),true);
 assert.equal(writes,0);assert.equal(popups,0);
 win.destroy();console.log('Setup links passed: production iframe sandbox, desktop/phone download and pairing navigation, saved step return, real assignment control and zero mutations/popups.');
}
const timer=setTimeout(()=>{console.error('Setup link fixture timed out');app.exit(1);},30000);
main().then(()=>{clearTimeout(timer);server.close(()=>app.exit(0));}).catch(error=>{console.error(error);clearTimeout(timer);server.close(()=>app.exit(1));});
