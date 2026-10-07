'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Isolated fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'guard-preview-')));
const root=path.resolve(__dirname,'..'),calls=[],errors=[];
const students=[{id:'11111111-1111-4111-8111-111111111111',name:'Alex'},{id:'22222222-2222-4222-8222-222222222222',name:'Jamie'}];
function seed(student){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const subjects=[{id:'spelling',title:'Spelling',url:'app://spelling',kind:'activity',accessTier:'school_optional',icon:'spell-check'}];
 return {preview:true,capturedAt:new Date().toISOString(),status:{messaging:{studentId:student.id,online:true,messages:[{id:'saved-message',sender:'parent',body:'Saved family message',createdAt:new Date().toISOString(),reactions:[]}],familyMessages:[],familyAvailable:true,childrenCanPost:false,notificationSoundMuted:true,error:'Preview only'},account:{deviceId:'parent-preview'},school:{student,ready:true,online:true,locked:false,needsRecoveryConfirmation:false,canUseLearningVideos:true,policyVersion:'1:1',timeZone:'America/Chicago',assignedSubjects:subjects,subjects,features:{verse:false},chores:{enabled:true,items:[{id:'chore',date,revision:1,available:true,status:'open',definition:{title:'Put books away',approvalRequired:true,coins:5}}]},moduleAccess:{spelling:{allowed:true}},subjectAccess:{spelling:{allowed:true}}},dashboard:{data:{student:{...student,theme:'pink'},studentId:student.id,deviceId:'parent-preview',date,policyRevision:1,rulesRevision:1,wallet:{balance:42},subjects:[]}}},vocabulary:{overview:{active:true,has_current_work:true,title:'My vocabulary',list_id:'vocab-list',total_terms:1,test_date:date,retention_only:false},list:{id:'vocab-list',title:'My vocabulary'},items:[{view:{id:'vocab-word',term_id:'word',type:'teaching',prompt:'Meet sunshine.',teaching:{word:'sunshine',exact_definition:'Light from the sun'},choices:[],term:{id:'word',word:'sunshine'}},answerSpec:{kind:'continue'},word:'sunshine',definition:'Light from the sun'}]},spelling:[{id:'list',title:'My assigned words',test_date:date,words:[{word:'sunshine',definition:'Light from the sun'}]}],daily:[{id:'preview-riddle',kind:'riddle',text:'What has hands but cannot clap?',options:['Clock','Chair'],correctIndex:0}]};
}
const server=http.createServer(async(req,res)=>{
 const p=new URL(req.url,'http://fixture').pathname;
 if(p==='/'){res.setHeader('Content-Type','text/html');res.end(`<link rel="stylesheet" href="/guard-admin/base.css"><link rel="stylesheet" href="/guard-admin/cloud-student-preview.css"><div id="overview-actions"><div class="cloud-overview-refresh"><button id="cloud-refresh">Refresh</button></div></div><script type="module">import {setupStudentPreview} from '/guard-admin/cloud-student-preview.js';setupStudentPreview({getSnapshot:()=>({students:${JSON.stringify(students)}}),endpoint:'/bridge'});</script>`);return;}
 if(p==='/bridge'){let raw='';for await(const chunk of req)raw+=chunk;const input=JSON.parse(raw);calls.push(input);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(seed(students.find(s=>s.id===input.studentId))));return;}
 const file=path.join(root,'public',p);if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript');res.end(fs.readFileSync(file));return;}
 res.writeHead(404);res.end();
});
let win;
const js=code=>win.webContents.executeJavaScript(code,true);
const child=code=>Promise.race([win.webContents.mainFrame.frames[0]?.executeJavaScript(code,true),new Promise((_,reject)=>setTimeout(()=>reject(Error('Frame command timeout: '+code)),8000))]);
const wait=async(fn,label)=>{const end=Date.now()+12000;while(Date.now()<end){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Timed out '+label+' '+JSON.stringify(errors));};
const ready=async(module='dashboard')=>{await wait(()=>js("document.querySelector('iframe')?.dataset.loaded==='true' && document.querySelector('iframe')?.dataset.module==="+JSON.stringify(module)),'host loaded '+module);await wait(()=>child('document.documentElement.dataset.previewReady=== "true"'),'child ready');};
const watchdog=setTimeout(()=>{console.error('preview timed out',errors);app.exit(1);},60000);
(async()=>{
 await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(origin)&&!d.url.startsWith('blob:')&&!d.url.startsWith('data:')}));
 win=new BrowserWindow({show:false,width:1440,height:980,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 win.webContents.on('console-message',event=>{if(/Uncaught|TypeError|ReferenceError|SecurityError/.test(event.message))errors.push(event.message);});
 await win.loadURL(origin);await wait(()=>js("!!document.getElementById('cloud-student-preview')"),'button');
 await js("document.getElementById('cloud-student-preview').click();document.querySelector('[data-preview-start]').click()");await ready();
 assert.equal(await child("document.getElementById('wallet-coins').textContent"),'42');
 assert.equal(await js("document.querySelector('iframe').getAttribute('sandbox')"),'allow-scripts');
 assert.equal(await child("(()=>{try{return parent.document.title}catch{return 'isolated'}})()"),'isolated');
 assert.equal(await child("fetch('/bridge',{method:'POST'}).then(()=>false,()=>true)"),true,'CSP prevents network writes');
 assert.equal(await child("(()=>{try{localStorage.setItem('x','y');return false}catch{return true}})()"),true,'No persistent student storage');
 await child("setTimeout(()=>document.querySelector('.subject-card').click(),0);true");await ready('spelling');
 assert.match(await child("document.body.textContent"),/My assigned words/);
 await child("document.querySelector('[data-mode=practice]').click()");await wait(()=>child("!document.getElementById('session-card').classList.contains('hidden')"),'practice');
 await child("document.getElementById('answer').value='wrong';document.getElementById('submit').click()");await wait(()=>child("!document.getElementById('spelling-next-word').hidden"),'wrong answer');
 await child("document.getElementById('spelling-next-word').click()");await wait(()=>child("!document.getElementById('results-card').classList.contains('hidden')"),'results');
 assert.equal(calls.length,1,'Practice did not call the backend');
 await js("document.querySelector('[data-preview-home]').click()");await ready();assert.equal(await child("document.getElementById('wallet-coins').textContent"),'42');
 await js("document.querySelector('[data-preview-reset]').click()");await ready();assert.equal(calls.length,1,'Reset discards test memory without writes');
 await child("document.getElementById('dash-message-btn').click()");await wait(()=>child("!document.getElementById('student-messages-panel').hidden"),'messages');
 await wait(()=>child("document.body.textContent.includes('Saved family message')"),'message history');
 await child("document.getElementById('msg-input').value='Test reply only';document.getElementById('send-btn').click()");await wait(()=>child("document.getElementById('student-messages-panel').textContent.includes('Test reply only')"),'test reply');
 assert.equal(calls.length,1,'Test message did not reach the server');
 await js("document.querySelector('[data-preview-home]').click()");await ready();
 await child("setTimeout(()=>document.querySelector('[data-subject-id=__vocabulary__]').click(),0);true");await ready('vocabulary');
 assert.match(await child('document.body.textContent'),/My vocabulary/);
 await child("document.getElementById('continue-button').click()");await wait(()=>child("document.getElementById('term-text').textContent==='sunshine'"),'vocabulary teaching');
 await child("document.getElementById('step-button').click()");await wait(()=>child("document.getElementById('step-button').textContent==='Finish review'"),'vocabulary answer');
 await child("document.getElementById('step-button').click()");await wait(()=>child("document.body.textContent.includes('Preview practice complete')"),'vocabulary completion');
 await js("document.querySelector('[data-preview-home]').click()");await ready();
 await child("document.querySelector('#riddle-options button').click()");await wait(()=>child("document.querySelector('#riddle-reward-msg').textContent.includes('Test answer')"),'daily answer');
 assert.equal(calls.length,1,'Vocabulary and daily questions stay local');
 await child("document.querySelector('.student-chores-shortcut').click()");await wait(()=>child("!!document.querySelector('.student-chores-done:not(:disabled)')"),'chore ready');
 await child("document.querySelector('.student-chores-done').click()");await wait(()=>child("document.querySelector('.student-chores-dialog').textContent.includes('Test check-off only')"),'local chore');
 await child("document.querySelector('.student-chores-close').click()");assert.equal(calls.length,1,'Chore check-off stayed in memory');
 await child("document.querySelector('[data-subject-id=__papers__]').click()");await wait(()=>child("document.querySelector('.preview-notice').open"),'unsupported panel explanation');
 await child("document.querySelector('.preview-notice button').click()");
 for(const [name,width,height]of [['desktop',1440,980],['phone',390,844]]){
  win.setContentSize(width,height);await new Promise(r=>setTimeout(r,550));
  await child("window.scrollTo(0,0);for(const a of document.getAnimations()){if(Number.isFinite(a.effect?.getTiming().iterations))a.finish()}");
  assert.equal(await js('document.documentElement.scrollWidth>innerWidth'),false);
  await new Promise(r=>setTimeout(r,150));
  const dir=path.join(root,'.tmp/student-preview');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await js(`document.querySelector('select').value=${JSON.stringify(students[1].id)};document.querySelector('select').dispatchEvent(new Event('change'));document.querySelector('[data-preview-start]').click()`);await ready();
 assert.match(await child('document.body.textContent'),/Jamie/);assert.equal(calls.length,2);
 await js("document.querySelector('[data-preview-close]').click()");assert.equal(await js('document.querySelectorAll("iframe").length'),0);
 assert.deepEqual(errors,[]);console.log('Student preview passed: isolation, no network or storage, actual dashboard, Spelling, Vocabulary, daily answers, test replies, chores, unsupported-screen explanation, reset, student switch, mobile and desktop.');
})().then(()=>{clearTimeout(watchdog);win?.destroy();server.close();app.exit(0);}).catch(error=>{console.error(error);clearTimeout(watchdog);win?.destroy();server.close();app.exit(1);});
