'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-quick-setup-')));
const root=path.resolve(__dirname,'..');
let snapshot={students:[],devices:[],rules:{revision:0,subjects:[],schedule:{}},schoolActivities:[]};
let state={revision:0,step:0,completed:false,features:{},contentChoices:{},catalog:{version:1}},previews=0,confirms=[],lostReply=true;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/'){
  res.setHeader('Content-Type','text/html');res.end(`<html lang="en-US"><head><style>body{background:#0d0d1b;color:#f1edff;font:16px Arial}button{color:inherit;background:#202034;padding:12px;border:1px solid #716584;border-radius:8px}</style></head><body><section id="tab-overview"><div class="tab-header"></div><div id="overview-actions"></div></section><script src="/guard-admin/lucide.min.js"></script><script type="module">
  import {setupParentStart} from '/guard-admin/cloud-parent-start.js';
  let snapshot=await fetch('/snapshot').then(r=>r.json());
  const refresh=async()=>{snapshot=await fetch('/snapshot').then(r=>r.json());};
  const request=async(action,data={})=>{const r=await fetch('/bridge',{method:'POST',body:JSON.stringify({action,...data})});if(!r.ok)throw Error('Save failed');return r.json();};
  class Speech{start(){window.voice=this;}abort(){window.aborts=(window.aborts||0)+1;}}window.SpeechRecognition=Speech;
  window.guide=setupParentStart({endpoint:'/bridge',getSnapshot:()=>snapshot,refresh,mutate:async(a,d)=>{const r=await request(a,d);await refresh();return r;},navigate:()=>{}});guide.update();
  </script></body></html>`);return;
 }
 if(url.pathname==='/snapshot'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot));return;}
 if(url.pathname==='/bridge'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks));res.setHeader('Content-Type','application/json');
  if(input.action==='get-setup'){res.end(JSON.stringify(state));return;}
  if(input.action==='save-setup'){state={...state,...input,revision:state.revision+1};res.end(JSON.stringify(state));return;}
  if(input.action==='preview-family-prompt'){previews++;if(input.prompt==='No setup details yet'){res.end(JSON.stringify({children:[],notes:[]}));return;}assert.equal(input.prompt,'Mia is in grade 3 with Abeka');await new Promise(r=>setTimeout(r,100));res.end(JSON.stringify({children:[{name:'Mia',grade:'3',provider:'abeka',schoolName:'Abeka'}],notes:[]}));return;}
  if(input.action==='confirm-family-prompt'){
   confirms.push(input);if(!snapshot.students.length)snapshot.students.push({id:'mia',name:'Mia',grade:'3',main_school:{provider:'abeka'}});
   if(lostReply){lostReply=false;res.writeHead(503);res.end(JSON.stringify({error:'Connection lost'}));return;}
   res.end(JSON.stringify({createdCount:1,replayed:true}));return;
  }
  if(input.action==='add-student'){snapshot.students.push({id:'manual',name:input.name,grade:input.grade});res.end('{}');return;}
  res.end('{}');return;
 }
 if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){const file=path.join(root,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));return;}}
 res.writeHead(404);res.end();
});
async function main(){
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)}));
 const win=new BrowserWindow({show:false,width:1200,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 win.webContents.on("console-message",e=>console.log(e.message));
 const js=async s=>{try{return await win.webContents.executeJavaScript(s,true);}catch(e){throw Error("At: "+s+" / "+e.message);}};
 const wait=async expr=>{for(let i=0;i<100;i++){if(await js(expr))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out '+expr);};
 const click=text=>js(`[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`);
 await win.loadURL(origin);await wait('document.querySelector(".family-prompt textarea")');
 assert.equal(await js('document.querySelector(".setup-progress").textContent'),'Step 1 of 4');
 assert.equal(await js('document.querySelector(".setup-manual-children").open'),false);
 await js(`document.querySelector('.setup-manual-children').open=true;document.querySelector('[name=childName]').value='Manual draft';document.querySelector('textarea').value='Mia is in grade 3 with Abeka';document.querySelector('textarea').dispatchEvent(new Event('input'));`);
 await click('Create family draft');
 assert.equal(await js('document.querySelector(".setup-dismiss").disabled'),true);
 await js('document.querySelector("dialog").dispatchEvent(new Event("cancel",{cancelable:true}))');assert.equal(await js('document.querySelector("dialog").open'),true);
 assert.equal(await js('[...document.querySelectorAll("footer button")].every(b=>b.disabled)'),true);
 await wait('document.querySelector(".family-prompt-review")');
 assert.equal(confirms.length,0);assert.equal(previews,1);
 await click('Continue');await wait('document.querySelector(".setup-error").textContent.includes("Confirm your family draft")');
 await click('Confirm & add children');await wait('document.querySelector(".family-prompt-status").textContent.includes("Retry")');
 await click('Retry same save');await wait('document.querySelector(".family-prompt-status").textContent.includes("already saved")');
 assert.deepEqual(confirms[0],confirms[1]);assert.equal(snapshot.students.length,1);
 assert.equal(await js('document.querySelector("[name=childName]").value'),'Manual draft','quick save preserves manual draft');
 assert.match(await js('document.querySelector(".setup-manual-children").textContent'),/Mia/);
 await js('document.querySelector("[name=childName]").value=""');
 for(const width of [1200,390,320]){win.setContentSize(width,900);await new Promise(r=>setTimeout(r,50));assert.ok(await js('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth+1'));}
 await click('Continue');await wait('document.querySelector("#parent-start-title").textContent==="Choose their school"');
 assert.equal(await js('document.querySelector("[name=school-mia]").value'),'abeka');
 await click('Back');await wait('document.querySelector(".family-prompt")');await click('Add more children');await click('Speak instead');
 await js('voice.onresult({results:[[{transcript:"June is in kindergarten"}]]})');await click('Close');await wait('!document.querySelector("dialog[open]")');
 await wait('window.aborts>0');await js('guide.open(0)');await wait('document.querySelector("dialog[open] textarea")');
 assert.equal(await js('document.querySelector("textarea").value'),'June is in kindergarten');
 assert.match(await js('document.querySelector(".family-prompt-status").textContent'),/Dictation stopped/);
 await js('document.querySelector("textarea").value="No setup details yet";document.querySelector("textarea").dispatchEvent(new Event("input"))');await click('Create family draft');
 await wait('document.querySelector(".family-prompt-status").textContent.includes("could not make a draft")');
 assert.equal(await js('document.querySelector(".family-prompt-review")'),null,'empty response has no review or confirmation');
 assert.equal(await js('document.querySelector("textarea").value'),'No setup details yet','failed parsing preserves the transcript');
 await click('Add children one at a time');
 assert.equal(await js('document.querySelector(".setup-manual-children").open'),true);assert.equal(await js('document.activeElement.name'),'childName');
 assert.equal(await js('document.querySelector("textarea").value'),'');assert.equal(confirms.length,2,'manual fallback never confirms a draft');
 await new Promise(r=>setTimeout(r,150));
 fs.mkdirSync(path.join(root,'.tmp/quick-setup'),{recursive:true});fs.writeFileSync(path.join(root,'.tmp/quick-setup/phone.png'),(await win.webContents.capturePage()).toPNG());
 console.log('Active quick setup passed: first-step mount, server draft, review, guarded navigation, safe retry, manual preservation, school handoff, widths and microphone cleanup.');
 win.destroy();server.close();app.exit(0);
}
main().catch(e=>{console.error(e);server.close();app.exit(1);});
