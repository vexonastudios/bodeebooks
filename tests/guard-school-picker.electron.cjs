'use strict';
// Fictional onboarding only. No production data, account or installed child.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-school-picker-')));
const root=path.resolve(__dirname,'..'),schoolWrites=[],searches=[],rulesWrites=[];
let snapshot={parentPassword:{configured:true,revision:1},students:[{id:'bob',name:'Bob'},{id:'betty',name:'Betty'},{id:'billy',name:'Billy'}],devices:[],rules:{revision:0,subjects:[],schedule:{}},schoolActivities:[]};
let state={revision:0,step:1,completed:false,features:{},contentChoices:{},catalog:{version:1}},failSearch=false,loseReply=false,failChild=null;
let failPlanRead=false,failPlanSave=false,failProgress=false;
const calendarHtml=require('../app/guard/dashboard/generated/workspace.json').html.split('<section class="tab-content" id="tab-calendar"')[1].split('<section class="tab-content" id="tab-spelling"')[0];
const dayOff={date:'2027-01-15',school:false};
snapshot.rules.schedule={enabled:false,days:[1,2,3,4,5],timeZone:'America/Chicago',start:'08:00',end:'15:00',exceptions:[dayOff]};
snapshot.serverTime='2026-11-24T14:00:00Z';

const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture');
 if(url.pathname==='/'){
  res.setHeader('Content-Type','text/html');return res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/guard-admin/base.css"><style>body{font:16px Arial,sans-serif}button,input{font:inherit}</style></head><body><section id="tab-overview"><div class="tab-header"></div></section><script src="/guard-admin/lucide.min.js"></script><script type="module">
  document.body.insertAdjacentHTML('beforeend',${JSON.stringify('<section class="tab-content" id="tab-calendar"'+calendarHtml)});
  document.body.append(Object.assign(document.createElement('section'),{id:'tab-family-games'}));
  import {setupParentStart} from '/guard-admin/cloud-parent-start.js';let snapshot=await fetch('/snapshot').then(r=>r.json());
  const refresh=async()=>{snapshot=await fetch('/snapshot').then(r=>r.json());};
  const mutate=async(action,data)=>{const r=await fetch('/bridge',{method:'POST',body:JSON.stringify({action,...data})}),value=await r.json();if(!r.ok)throw Error(value.error);await refresh();return value;};
  import {setupCloudCalendar} from '/guard-admin/cloud-calendar.js';
  import {editSchedule} from '/guard-admin/cloud-workspace-model.js';
  const calendar=setupCloudCalendar({getSnapshot:()=>snapshot,editException:()=>{},editBreak:()=>{},setControls:()=>{},saveSchedule:async(c,s)=>{await mutate('save-subjects',editSchedule(c,s));calendar.render();}});
  window.navigate=tab=>{document.getElementById('tab-calendar').classList.toggle('active',tab==='calendar');if(tab==='calendar')calendar.render(true);};
  window.guide=setupParentStart({endpoint:'/bridge',getSnapshot:()=>snapshot,refresh,mutate,navigate});guide.open(1);
  </script><script src="/guard-admin/cloud-school-schedule.js"></script></body></html>`);
 }
 if(url.pathname==='/snapshot'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(snapshot));}
 if(url.pathname==='/guard/dashboard/bridge/'){res.setHeader('Content-Type','application/json');return res.end('{"rows":[],"enabled":false}');}
 if(url.pathname==='/bridge'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks));res.setHeader('Content-Type','application/json');
  if(input.action==='get-setup')return res.end(JSON.stringify(state));
  if(input.action==='chores'){
   state.chores={enabled:input.enabled,chosen:true,revision:(state.chores?.revision||0)+1};
   return res.end(JSON.stringify(state.chores));
  }
  if(input.action==='save-setup'){
   if(failProgress){failProgress=false;res.statusCode=503;return res.end(JSON.stringify({error:'Could not save setup progress.'}));}
   state={...state,...input,revision:state.revision+1};return res.end(JSON.stringify(state));
  }
  if(input.action==='daily-plan'){
   if(failPlanRead){failPlanRead=false;res.statusCode=503;return res.end(JSON.stringify({error:'Could not load activities.'}));}
   return res.end(JSON.stringify({rulesRevision:snapshot.rules.revision,features:{},media:{},requirements:[]}));
  }
  if(input.action==='save-subjects'){
   if(failPlanSave){failPlanSave=false;res.statusCode=503;return res.end(JSON.stringify({error:'Could not save activities.'}));}
   assert.equal(input.revision,snapshot.rules.revision);
   // Calendar and activities both write the same family rules. Count each
   // scenario's saves separately so the later checks start at zero.
   rulesWrites.push(input);if(Object.hasOwn(input,'schedule'))snapshot.rules.schedule=input.schedule;
   snapshot.rules.subjects=input.subjects;snapshot.rules.revision++;
   if(Object.hasOwn(input,'dailyPlanTemplate'))snapshot.rules.dailyPlanTemplate=input.dailyPlanTemplate;
   return res.end('{}');
  }
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
 const schoolDate='dialog[open] [name=setupTermStart]';
 assert.equal(await js(`document.querySelector('${schoolDate}').value`),'');
 await js("window.savedNow=Date.now;Date.now=()=>Date.parse('2026-11-25T02:00:00Z');void 0;");
 await click('Use today');
 await js('Date.now=window.savedNow;void 0;');
 assert.equal(await js(`document.querySelector('${schoolDate}').value`),'2026-11-24');
 failPlanSave=true;await click('More calendar settings');await wait('document.querySelector(".setup-error").textContent.includes("Could not save")');
 assert.equal(rulesWrites.length,0,'a failed date save keeps the draft on step two');
 await click('More calendar settings');await wait('document.querySelector("dialog").dataset.setupSection==="calendar"');
 assert.equal(rulesWrites.length,1);assert.equal(snapshot.rules.schedule.termStart,'2026-11-24');
 assert.equal(snapshot.rules.schedule.termEnd,null);assert.equal(snapshot.rules.schedule.enabled,false);
 assert.deepEqual(snapshot.rules.schedule.exceptions,[dayOff]);
 assert.match(await js('document.querySelector(".cloud-calendar-settings p").textContent'),/Nov 24, 2026/);
 await click('Close');await wait('!document.querySelector("dialog[open]")');
 await click('Review remaining steps','.parent-start-welcome');await wait(`!!document.querySelector('${schoolDate}')`);
 assert.equal(await js(`document.querySelector('${schoolDate}').value`),'2026-11-24');
 assert.equal(state.step,1,'the calendar detour keeps the saved school step');
 rulesWrites.length=0;
 await click('More calendar settings');await wait('document.querySelector("dialog").dataset.setupSection==="calendar"');
 assert.equal(await js('document.getElementById("parent-start-title").textContent'),'Family school calendar');
 await click('Set school dates & hours');assert.equal(await js('document.activeElement.name'),'termStart');
 assert.equal(rulesWrites.length,0);
  await js(`window.originalNow=Date.now;Date.now=()=>Date.parse('2026-11-25T02:00:00Z');void 0;`);await click('Use today');
  await js('Date.now=window.originalNow;void 0;');
 assert.equal(await js('document.querySelector("[name=termStart]").value'),'2026-11-24','Use today follows the school time zone');
 assert.equal(await js('document.querySelector("[name=termEndMode]").value'),'open');
 for(const width of [1280,390,320]){
  win.setContentSize(width,900);await new Promise(resolve=>setTimeout(resolve,50));
  assert.ok(await js('document.querySelector(".cloud-calendar-settings").scrollWidth<=document.querySelector(".cloud-calendar-settings").clientWidth+1'),'calendar fits '+width);
 }
 win.setContentSize(1280,1000);
 await click('Save & turn on calendar');await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 assert.equal(rulesWrites[0].schedule.termStart,'2026-11-24');assert.equal(rulesWrites[0].schedule.enabled,true);
 assert.equal(rulesWrites[0].schedule.termEnd,null);
 assert.equal(rulesWrites[0].schedule.attendance.enabled,false);assert.deepEqual(rulesWrites[0].schedule.exceptions,[dayOff]);
 await click('Back to setup');await wait('!!document.querySelector(".setup-school-family")');
 assert.equal(await js('document.getElementById("parent-start-title").textContent'),'Add school websites (optional)');
 await click('Close');await js("navigate('calendar')");await click('Edit dates, hours & coins','#tab-calendar');
 assert.equal(await js('document.querySelector("[name=termEndMode]").value'),'open');
 await fill('termStart','2027-01-05','.school-hours-form');await js('document.querySelector("[name=attendanceEnabled]").click()');
 assert.equal(await js('document.querySelector(".school-hours-options").checkVisibility()'),true);
 await click('Cancel','#tab-calendar');assert.equal(rulesWrites.length,1);
 await click('Edit dates, hours & coins','#tab-calendar');await fill('termStart','2027-01-05','.school-hours-form');
 const endMode=mode=>js(`{const el=document.querySelector('[name=termEndMode]');el.value=${JSON.stringify(mode)};el.dispatchEvent(new Event('change',{bubbles:true}));}`);
 await endMode('date');await fill('termEnd','2027-05-31','.school-hours-form');
 await click('Save calendar','#tab-calendar');await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 assert.equal(rulesWrites[1].schedule.termStart,'2027-01-05');assert.equal(rulesWrites[1].schedule.attendance.enabled,false);
 assert.equal(rulesWrites[1].schedule.termEnd,'2027-05-31');
 assert.equal(await js("document.getElementById('cloud-calendar-month').textContent"),'January 2027');
 await click('Edit dates, hours & coins','#tab-calendar');
 assert.equal(await js('document.querySelector("[name=termEndMode]").value'),'date');
 await endMode('open');
 await fill('termStart','','.school-hours-form');await fill('termEnd','','.school-hours-form');
 await js('document.querySelector("[name=attendanceEnabled]").click()');await click('Save calendar','#tab-calendar');
 await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 assert.equal(rulesWrites[2].schedule.termStart,null);assert.equal(rulesWrites[2].schedule.termEnd,null);
 assert.equal(rulesWrites[2].schedule.attendance.enabled,true);assert.deepEqual(rulesWrites[2].schedule.exceptions,[dayOff]);
 await click('Edit dates, hours & coins','#tab-calendar');
 await endMode('count');await fill('termStart','2027-01-11','.school-hours-form');
 await fill('schoolDayCount','5','.school-hours-form');
 await js("document.querySelector('[name=schoolDayCount]').dispatchEvent(new Event('input',{bubbles:true}))");
 assert.match(await js('document.querySelector(".school-hours-projection").textContent'),/January 18, 2027/);
 await click('Save calendar','#tab-calendar');await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 assert.equal(rulesWrites[3].schedule.schoolDayCount,5);
 assert.equal(rulesWrites[3].schedule.termEnd,'2027-01-18','Friday off moves the fifth lesson to Monday');
 await js("navigate('overview');guide.open(1)");await wait(`!!document.querySelector('${schoolDate}')`);
 await fill('setupTermStart','2027-01-12','.setup-school-start');await click('Continue');
 await wait('!!document.querySelector(".setup-family-activities")');
 assert.equal(rulesWrites.length,5,'Continue saves the inline date once');
 assert.deepEqual(rulesWrites[4].schedule,{...rulesWrites[3].schedule,termStart:'2027-01-12',termEnd:'2027-01-19'});
 await click('Close');await wait('!document.querySelector("dialog[open]")');
 await click('Review remaining steps','.parent-start-welcome');await wait('!!document.querySelector("dialog[open] .setup-family-activities")');
 assert.equal(await js('document.querySelector(".setup-progress").textContent'),'Step 3 of 4');
 await click('Close');await js("navigate('calendar')");
 await click('Edit dates, hours & coins','#tab-calendar');
 assert.equal(await js('document.querySelector("[name=termEndMode]").value'),'count');
 await endMode('open');await click('Save calendar','#tab-calendar');await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 assert.equal(rulesWrites[5].schedule.termEnd,null);assert.equal(rulesWrites[5].schedule.schoolDayCount,undefined);
 rulesWrites.length=0;await js("navigate('overview');guide.open(1)");await wait('!!document.querySelector("dialog[open] .setup-school-family")');
 await click('Continue');await wait('document.querySelector("#parent-start-title").textContent==="Activities for all children"');assert.equal(schoolWrites.length,0,'skip creates no false school choice');
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
 await click('Continue');await wait('document.querySelector("#parent-start-title").textContent==="Activities for all children"');assert.equal(count(),3,'a query alone neither blocks continue nor grants access');
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
 snapshot.schoolActivities=['games','audiobooks','music','videos','notebook','reading','typing','logic','words','spelling','vocabulary','poems','quizzes','worksheets','geography','learning-videos','spanish','art-studio','coloring-studio','piano','math-coach','long-division','drivers-education'].map(module=>({module,url:'app://'+module,ready:true}));
 snapshot.schoolActivities.push({module:'spelling',url:'app://science-spelling',ready:false});
 const activity=(name,property)=>js('document.querySelector(".setup-family-activities [name='+name+']").'+property);
 const loaded=()=>wait('!!document.querySelector("dialog[open] .setup-family-activities")&&!document.querySelector(".setup-body").inert');
 await win.loadURL(origin);await wait('!!document.querySelector(".setup-school-family")');
 await click('Continue');await loaded();
 assert.equal(await js('document.querySelectorAll(".setup-family-activities input:checked").length'),23);
 assert.equal(await js('!!document.querySelector(".setup-family-activities select, .setup-family-activities details")'),false);
 assert.equal(await js('document.querySelector("[name=family-start-chores]").checked'),false);
 assert.equal(rulesWrites.length,0);
 for(const [name,width] of [['desktop',1280],['phone',390],['narrow',320]]){
  win.setContentSize(width,900);await new Promise(r=>setTimeout(r,60));
  assert.ok(await js('document.querySelector(".setup-body").scrollWidth<=document.querySelector(".setup-body").clientWidth+1'));
  fs.writeFileSync(path.join(root,'.tmp/school-picker','family-activities-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await activity('music','click()');await js('document.querySelector("[name=family-start-chores]").click()');
 await click('Back');await wait('!!document.querySelector(".setup-school-family")');
 await click('More calendar settings');await wait('document.querySelector("dialog").dataset.setupSection==="calendar"');
 await click('Edit dates, hours & coins');await fill('termStart','2027-01-07','.school-hours-form');
 await click('Save calendar');await wait('document.querySelector(".cloud-calendar-save-status").textContent==="Calendar saved."');
 await click('Back to setup');await wait('!!document.querySelector(".setup-school-family")');
 await click('Continue');await loaded();
 assert.equal(await activity('music','checked'),false);
 assert.equal(await js('document.querySelector("[name=family-start-chores]").checked'),true);
 assert.equal(state.chores,undefined);assert.equal(rulesWrites.length,1);
 assert.equal(rulesWrites[0].schedule.termStart,'2027-01-07');rulesWrites.length=0;
 const portals=structuredClone(snapshot.rules.subjects);
 failPlanSave=true;await click('Save & continue');await wait('document.querySelector(".setup-error").textContent.includes("Could not save activities")');
 assert.equal(rulesWrites.length,0);
 failProgress=true;await click('Save & continue');await wait('document.querySelector(".setup-error").textContent.includes("Could not save setup progress")');
 await loaded();assert.equal(rulesWrites.length,1);assert.equal(state.chores.enabled,true);
 const subject=module=>snapshot.rules.subjects.find(s=>s.url==='app://'+module);
 assert.equal(snapshot.rules.subjects.length,portals.length+23);
 assert.deepEqual(snapshot.rules.subjects.filter(s=>s.isSchoolPortal),portals);
 assert.equal(snapshot.rules.dailyPlanTemplate.activities.length,23);
 for(const row of snapshot.rules.subjects.filter(s=>!s.isSchoolPortal)){
  if (row.assignments) {
    assert.deepEqual(row.assignments.map(a=>a.studentId),['bob','betty','billy']);
    for(const a of row.assignments)assert.equal(a.active,row.url!=='app://music');
  } else {
    assert.equal(row.active,true);assert.equal(row.accessTier,'school_optional');
  }
 }
 assert.equal(subject('games').assignments[0].dailyPlan.placement,'after_school');
 assert.equal(subject('drivers-education').assignments[0].dailyPlan.placement,'anytime');
 await click('Save & continue');await wait('!!document.querySelector(".setup-readiness-summary")');
 assert.equal(state.step,7);assert.equal(rulesWrites.length,1,'retry after progress failure does not write the plan again');
 await click('Choose games for each child');await wait('document.querySelector("dialog").dataset.setupSection==="family-games"');
 await click('Back to setup');await wait('!!document.querySelector(".setup-readiness-summary")');
 await click('Close');await wait('!document.querySelector("dialog[open]")');
 // Personalize the existing family default as a parent could do in Daily Plan.
 subject('typing').assignments=['bob','betty','billy'].map(studentId=>({studentId,active:true,dailyGoalMinutes:12,dailyPlan:{placement:'anytime',days:[1,2,3,4,5],enabled:true,limitMinutes:null}}));
 const betty=subject('typing').assignments[1];betty.active=false;betty.dailyPlan.enabled=false;
 Object.assign(betty.dailyPlan,{days:[1,4],placement:'scheduled',start:'12:00',end:'14:00',limitMinutes:18,schoolworkBypassDate:'2026-11-25'});
 snapshot.rules.revision++;const savedSubjects=structuredClone(snapshot.rules.subjects);
 const reopen=async()=>{await win.loadURL(origin);await wait('!!document.querySelector(".setup-school-family")');await click('Continue');await loaded();};
 failPlanRead=true;await win.loadURL(origin);await wait('!!document.querySelector(".setup-school-family")');await click('Continue');
 await wait('document.querySelector(".setup-error").textContent.includes("Could not load activities")');
 assert.equal(await js('document.querySelector("dialog footer .btn-primary").disabled'),true);
 await click('Reload activity choices');await loaded();assert.equal(await activity('typing','indeterminate'),true);assert.equal(await activity('music','checked'),false);
 await click('Save & continue');await wait('!!document.querySelector(".setup-readiness-summary")');
 assert.equal(rulesWrites.length,1);assert.deepEqual(snapshot.rules.subjects,savedSubjects);
 await click('Back');await loaded();
 await activity('typing','click()');await click('Save and close');await wait('!document.querySelector("dialog[open]")');
 assert.equal(rulesWrites.length,2);
 const changed=subject('typing').assignments[1];
 assert.deepEqual(changed,{...betty,active:true,dailyPlan:{...betty.dailyPlan,enabled:true}});
 assert.deepEqual(subject('typing').assignments[0],savedSubjects.find(s=>s.url==='app://typing').assignments[0]);
 assert.deepEqual(snapshot.rules.subjects.filter(s=>s.url!=='app://typing'),savedSubjects.filter(s=>s.url!=='app://typing'));
 // An untouched first-time screen also persists the checked defaults in one click.
 snapshot.rules.subjects=portals;snapshot.rules.dailyPlanTemplate=null;snapshot.rules.revision++;delete state.chores;
 snapshot.students=Array.from({length:30},(_,i)=>({id:require('crypto').randomUUID(),name:'Student '+(i+1)}));
 await reopen();await click('Save & continue');await wait('!!document.querySelector(".setup-readiness-summary")');
 assert.ok(Buffer.byteLength(JSON.stringify(snapshot.rules.subjects))<64*1024,'30 children fit the API rules limit');
 assert.equal(rulesWrites.length,3);assert.equal(state.chores,undefined);assert.equal(state.step,7);
 assert.ok(snapshot.rules.subjects.filter(s=>!s.isSchoolPortal).every(s=>s.active&&(!s.assignments||s.assignments.length===30&&s.assignments.every(a=>a.active))));
 console.log('Family activities passed on desktop and phone: all-on defaults, family opt-outs, chores, calendar return, one-click save, retry, and existing individual plans.');
 win.destroy();server.close();app.exit(0);
}
main().catch(error=>{console.error(error);server.close();app.exit(1);});
