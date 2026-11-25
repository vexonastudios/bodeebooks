'use strict';
// Fictional onboarding only. No production data, account or installed child.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-school-picker-')));
const root=path.resolve(__dirname,'..'),schoolWrites=[],searches=[];
let snapshot={parentPassword:{configured:true,revision:1},students:[{id:'bob',name:'Bob'},{id:'betty',name:'Betty'},{id:'billy',name:'Billy'}],devices:[],rules:{revision:0,subjects:[],schedule:{}},schoolActivities:[]};
let state={revision:0,step:1,completed:false,features:{},contentChoices:{},catalog:{version:1}},failSearch=false,loseReply=false,failChild=null;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/'){
  res.setHeader('Content-Type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><style>body{font:16px Arial,sans-serif}button,input{font:inherit}</style></head><body><section id="tab-overview"><div class="tab-header"></div></section><script src="/guard-admin/lucide.min.js"></script><script type="module">
  document.body.append(Object.assign(document.createElement('section'),{id:'tab-calendar'}));
  import {setupParentStart} from '/guard-admin/cloud-parent-start.js';let snapshot=await fetch('/snapshot').then(r=>r.json());
  const refresh=async()=>{snapshot=await fetch('/snapshot').then(r=>r.json());};
  const mutate=async(action,data)=>{const r=await fetch('/bridge',{method:'POST',body:JSON.stringify({action,...data})}),value=await r.json();if(!r.ok)throw Error(value.error);await refresh();return value;};
  window.guide=setupParentStart({endpoint:'/bridge',getSnapshot:()=>snapshot,refresh,mutate,navigate:()=>{}});guide.open(1);
  </script></body></html>`);
 }
 if(url.pathname==='/snapshot'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(snapshot));}
 if(url.pathname==='/bridge'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks));res.setHeader('Content-Type','application/json');
  if(input.action==='get-setup')return res.end(JSON.stringify(state));
  if(input.action==='save-setup'){state={...state,...input,revision:state.revision+1};return res.end(JSON.stringify(state));}
  if(input.action==='find-school-sites'){
   searches.push(input);await new Promise(r=>setTimeout(r,90));
   if(failSearch){res.statusCode=503;return res.end(JSON.stringify({error:'Online lookup is unavailable. Choose a common site or paste a website.'}));}
   return res.end(JSON.stringify({results:[{title:'Test School',url:'https://school.example.edu/',source:'Wikidata',description:'Example school'},{title:'Unsafe',url:'javascript:alert(1)'}]}));
  }
  if(input.action==='setup-school'){
   schoolWrites.push(input);assert.equal(input.revision,snapshot.rules.revision);
   if(failChild===input.studentId){failChild=null;res.statusCode=503;return res.end(JSON.stringify({error:'Temporarily unavailable.'}));}
   if(input.operation==='add')snapshot.rules.subjects.push({id:'site-'+schoolWrites.length,title:input.title,url:input.url,isSchoolPortal:true,portalProvider:input.provider,assignments:[{studentId:input.studentId,active:true,dailyPlan:{placement:'school'}}]});
   if(input.operation==='edit')Object.assign(snapshot.rules.subjects.find(s=>s.id===input.subjectId),{title:input.title,url:input.url,portalProvider:input.provider});
   if(input.operation==='remove')snapshot.rules.subjects.find(s=>s.id===input.subjectId).assignments.find(a=>a.studentId===input.studentId).active=false;
   snapshot.rules.revision++;
   if(loseReply){loseReply=false;res.statusCode=503;return res.end(JSON.stringify({error:'Reply lost. Try again.'}));}
   return res.end('{}');
  }
  res.statusCode=400;return res.end(JSON.stringify({error:'Unexpected '+input.action}));
 }
 if(/^\/guard-admin\/[a-z0-9.-]+$/.test(url.pathname)){const file=path.join(root,'public',url.pathname);if(fs.existsSync(file)){res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}}
 res.writeHead(404);res.end();
});
async function main(){
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)}));
 const win=new BrowserWindow({show:false,width:1280,height:1000,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 const js=s=>win.webContents.executeJavaScript(s,true).catch(e=>{throw Error(s+' / '+e.message);});
 const wait=async expr=>{for(let i=0;i<150;i++){if(await js(expr))return;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out '+expr+'\n'+await js('document.body.innerText'));};
 const click=(text,scope='dialog[open]')=>js(`[...document.querySelectorAll(${JSON.stringify(scope+' button')})].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`);
 const bob='[data-student-id=bob]',family='.setup-school-family';
 const fill=(name,value,scope=bob)=>js(`{const input=document.querySelector(${JSON.stringify(scope+' [name='+name+']')});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input'));}`);
 const openLookup=async(scope=bob)=>{
  await js(`document.querySelector('${scope} .setup-school-lookup summary').click()`);
  await wait(`document.querySelector('${scope} [name=schoolSearch]').getBoundingClientRect().height>0`);
 };
 const count=()=>snapshot.rules.subjects.filter(s=>s.assignments.some(a=>a.studentId==='bob'&&a.active)).length;
 await win.loadURL(origin);await wait('document.querySelector("dialog[open] .setup-school-form")');
 await click('Set school calendar');await wait('document.querySelector("dialog").dataset.setupSection==="calendar"');
 await click('Back to setup');await wait('!!document.querySelector(".setup-school-family")');
 await click('Continue');await wait('document.querySelector("#parent-start-title").textContent==="Choose their activities"');assert.equal(schoolWrites.length,0,'skip creates no false school choice');
 await click('Close');await js('guide.open(1)');await wait('document.querySelector("dialog[open] .setup-school-form")');
 await click('Add school website',bob);
 assert.equal(await js('document.activeElement.name'),'schoolUrl','the first field accepts an address immediately');
 assert.equal(await js(`document.querySelector('${bob} .setup-school-lookup').open`),false);
 await fill('schoolUrl','IXL');await click('Add website',bob);
 await wait('document.querySelector(".setup-error").textContent.includes("Look up by school name")');
 assert.equal(schoolWrites.length,0);
 await openLookup();await fill('schoolSearch','IXL');assert.equal(searches.length,0,'typing common sites does not hit the cloud');
 await js(`document.querySelector('${bob} [aria-label="Use IXL"]').click()`);assert.equal(schoolWrites.length,0,'selection is a draft');
 assert.equal(await js('document.activeElement.name'),'schoolUrl');
 assert.equal(await js('document.activeElement.value'),'https://www.ixl.com/');
 assert.equal(await js(`document.querySelector('${bob} .setup-school-lookup').open`),false);
 await click('Continue');await wait('document.querySelector(".setup-error").textContent.includes("Choose Add website")');
 await fill('schoolTitle','Math');await click('Add website',bob);await wait('document.querySelector(".setup-school-list").textContent.includes("Math")');assert.equal(count(),1);
 await click('Add another school website',bob);await fill('schoolTitle','Grammar');await openLookup();await fill('schoolSearch','grammar');await js(`document.querySelector('${bob} [aria-label="Use Quill"]').click()`);await click('Add website',bob);await wait('document.querySelector(".setup-school-list").textContent.includes("Grammar")');assert.equal(count(),2);assert.equal(snapshot.rules.subjects.some(s=>s.assignments.some(a=>a.studentId==='betty')),false);
 await click('Add another school website',bob);await openLookup();await fill('schoolSearch','Test School');await click('Search online',bob);await wait('document.querySelector("[data-student-id=bob] .setup-school-results").textContent.includes("Test School")');
 assert.deepEqual(searches[0],{action:'find-school-sites',query:'Test School'});assert.equal(await js('document.querySelector("[data-student-id=bob] .setup-school-results").textContent.includes("Unsafe")'),false);
 await js(`document.querySelector('${bob} [aria-label="Use Test School"]').click()`);loseReply=true;await click('Add website',bob);await wait('document.querySelector("[data-student-id=bob]>[role=status]").textContent.includes("Reply lost")');assert.equal(count(),3);
 await click('Add website',bob);await wait('document.querySelector("[data-student-id=bob]>[role=status]").textContent.includes("already added")');assert.equal(count(),3);assert.equal(schoolWrites.length,3,'retry sees refreshed snapshot and never resubmits a committed addition');
 await click('Add another school website',bob);failSearch=true;await openLookup();await fill('schoolSearch','Unknown School');await click('Search online',bob);await wait('document.querySelector("[data-student-id=bob] .setup-school-editor").textContent.includes("Online lookup is unavailable")');
 await click('Cancel',bob);await click('Add another school website',bob);
 await fill('schoolUrl','bodeebooks.com');await click('Add website',bob);await wait('document.querySelector(".setup-school-list").textContent.includes("bodeebooks.com")');assert.equal(count(),4);
 assert.equal(schoolWrites.at(-1).url,'https://bodeebooks.com/');
 assert.equal(schoolWrites.at(-1).title,'bodeebooks.com','display name is optional');
 assert.equal(searches.length,2,'typing an address never initiates a directory search');
 await js(`document.querySelector('[aria-label="Remove Test School from Bob"]').click()`);await wait('!document.querySelector(".setup-school-list").textContent.includes("Test School")');assert.equal(count(),3);
 await click('Add another school website',bob);await openLookup();await fill('schoolSearch','Unused search');await click('Cancel',bob);assert.equal(count(),3);
 // Final screenshots use only fictional names and locally mocked sites.
 assert.equal(await js('document.querySelector(".setup-error").textContent'),'','successful retry clears the previous error');
 await js('document.querySelector(".setup-body").scrollTop=0');
 fs.mkdirSync(path.join(root,'.tmp/school-picker'),{recursive:true});
 for(const [name,width]of [['desktop',1280],['phone',390],['narrow',320]]){
  win.setContentSize(width,1000);await new Promise(r=>setTimeout(r,80));
  assert.ok(await js('{const d=document.querySelector("dialog"),f=d.querySelector("footer").getBoundingClientRect();d.scrollWidth<=d.clientWidth+1&&f.bottom<=innerHeight}'),'dialog fits '+name);
  fs.writeFileSync(path.join(root,'.tmp/school-picker',name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await click('Add another school website',bob);await openLookup();await fill('schoolSearch','grammar');await js('document.querySelector("[data-student-id=bob] .setup-school-search").scrollIntoView({block:"start"})');
 for(const [name,width]of [['search-desktop',1280],['search-phone',390]]){win.setContentSize(width,1000);await new Promise(r=>setTimeout(r,80));assert.ok(await js('document.querySelector("dialog").scrollWidth<=document.querySelector("dialog").clientWidth+1'));fs.writeFileSync(path.join(root,'.tmp/school-picker',name+'.png'),(await win.webContents.capturePage()).toPNG());}
 await click('Continue');await wait('document.querySelector("#parent-start-title").textContent==="Choose their activities"');assert.equal(count(),3,'a query alone neither blocks continue nor grants access');
 snapshot.students.push({id:'archived',name:'Archived child',archived_at:'2026-01-01'});
 snapshot.rules.subjects.push({id:'older-abeka',title:'My Abeka',url:'https://academy.abeka.com/Login.aspx',isSchoolPortal:true,assignments:[{studentId:'bob',active:true}]});
 await win.loadURL(origin);await wait('!!document.querySelector(".setup-school-family")');
 const additions=()=>schoolWrites.filter(write=>write.operation==='add');
 const before=additions().length;
 await click('Add Abeka to all',family);
 await wait('document.querySelector(".setup-school-family .btn-primary").disabled && document.querySelector(".setup-school-family>[role=status]").textContent.includes("saved for all children")');
 assert.deepEqual(additions().slice(before).map(w=>[w.studentId,w.provider,w.url]),[['betty','abeka','https://academy.abeka.com/'],['billy','abeka','https://academy.abeka.com/']]);
 assert.equal(await js(`document.querySelectorAll('[data-student-id] [aria-label^="Remove Abeka Academy"]').length`),2);
 await click('Choose a website for all',family);
 assert.equal(await js('document.activeElement.name'),'schoolUrl');
 assert.equal(await js(`document.querySelector('${family} .setup-school-lookup').open`),false);
 for(const [name,width] of [['desktop',1280],['phone',390],['narrow',320]]){
  win.setContentSize(width,900);await new Promise(r=>setTimeout(r,60));
  const rect=await js(`{const card=document.querySelector('${family}');card.scrollIntoView({block:'start'});const r=card.getBoundingClientRect();({x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)})}`);
  assert.ok(rect.x>=0&&rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=900);
  fs.writeFileSync(path.join(root,'.tmp/school-picker','address-first-'+name+'.png'),(await win.webContents.capturePage(rect)).toPNG());
 }
 await fill('schoolTitle','Family science',family);await fill('schoolUrl','science.example.edu/lessons',family);
 await click('Continue');await wait('document.querySelector(".setup-error").textContent.includes("Add to all children")');
 failChild='betty';
 await click('Add to all children',family);await wait('document.querySelector(".setup-school-family>[role=status]").textContent.includes("1 of 3")');
 await click('Add to all children',family);await wait('document.querySelector(".setup-school-family>[role=status]").textContent.includes("saved for all children")');
 const science=additions().filter(write=>write.title==='Family science');
 assert.deepEqual(science.map(w=>w.studentId),['bob','betty','betty','billy']);
 assert.equal(await js(`[...document.querySelectorAll('[data-student-id] .setup-school-list')].filter(list=>list.textContent.includes('Family science')).length`),3);
 assert.equal(additions().some(write=>write.studentId==='archived'),false);
 await click('Choose a website for all',family);await openLookup(family);await fill('schoolSearch','IXL',family);
 await js(`document.querySelector('.setup-school-family [aria-label="Use IXL"]').click()`);
 await click('Add to all children',family);await wait('document.querySelector(".setup-school-family>[role=status]").textContent.includes("IXL saved")');
 assert.deepEqual(additions().filter(w=>w.title==='IXL').map(w=>w.studentId),['betty','billy'],'Bob keeps his custom Math title for IXL');
 await js(`document.querySelector('[aria-label="Remove Family science from Betty"]').click()`);
 await wait('!document.querySelector("[data-student-id=betty] .setup-school-list").textContent.includes("Family science")');
 assert.equal(await js('document.querySelector("[data-student-id=billy] .setup-school-list").textContent.includes("Family science")'),true);
 console.log('School onboarding passed: family Abeka, search, custom address, partial retry, existing assignments, individual edit/removal, calendar return, skip and responsive layout.');
 win.destroy();server.close();app.exit(0);
}
main().catch(error=>{console.error(error);server.close();app.exit(1);});
