/* eslint-disable @typescript-eslint/no-require-imports -- Electron main-process fixtures require CommonJS. */
'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..'),cloud=process.argv.find(arg=>arg.startsWith('--cloud='))?.slice(8);if(!cloud)throw Error('Pass --cloud=<cloud source>');
const {createCloudPostgresFixture}=require(cloud+'/services/commercial-api/tests/helpers/cloud-postgres-fixture');
const {createCloudSpelling}=require(cloud+'/services/commercial-api/cloudSpelling'),{createCloudVocabulary}=require(cloud+'/services/commercial-api/cloudVocabulary');
const output=path.join(site,'.tmp/multi-child-lists-20261005');fs.mkdirSync(output,{recursive:true});
app.disableHardwareAcceleration();app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-multi-child-lists-')));
let db,server,win;const calls={spelling:[],vocabulary:[]},lost={spelling:true,vocabulary:true};
(async()=>{
 await app.whenReady();console.log('Multi-child fixture: creating isolated database.');
 db=await createCloudPostgresFixture();console.log('Multi-child fixture: database ready.');const householdId=await db.seedHousehold(),principal={householdId,userId:'synthetic-parent'},students=[];
 for(const name of ['Alex','Ben','Clara','Drew <img src=x>'])students.push({id:await db.seedStudent(householdId,crypto.randomUUID(),name),name});
 const devices=[];for(const child of students)devices.push(await db.seedDevice(householdId,child.id));console.log('Multi-child fixture: students/devices ready.');
 const options={repository:db.repository,access:async()=>{},commercialService:{authenticateDevice:async id=>devices.find(device=>device.id===id)},now:()=>Date.parse('2026-10-05T18:00:00Z')};
 const spelling=createCloudSpelling(options),vocabulary=createCloudVocabulary(options),source={spelling:crypto.randomUUID(),vocabulary:crypto.randomUUID()};
 await spelling.parentCommand(principal,{id:crypto.randomUUID(),kind:'list',listId:source.spelling,studentId:students[0].id,revision:0,title:'Shared spelling words',weekStart:'2026-10-05',testDate:'2026-10-12',status:'active',practiceOnly:false,words:[{word:'letter',teaching_hint:'Remember the double t.',pattern:'tt'},{word:'because',definition:'For the reason that'}]});
 await vocabulary.parentCommand(principal,{id:crypto.randomUUID(),kind:'list',listId:source.vocabulary,studentId:students[0].id,revision:0,title:'Shared meanings',start_date:'2026-10-05',test_date:'2026-10-12',status:'active',required_daily:true,daily_term_limit:10,retention_enabled:true,source_notes:'Printed curriculum definitions',terms:[{word:'steadfast',definition:'firm and unwavering',source_sentence:'Her steadfast faith encouraged us.',antonyms:['inconstant']},{word:'guile',definition:'cunning deceit',source_sentence:'He used guile.',synonyms:['deceit']},{word:'integrity',definition:'moral soundness',source_sentence:'She showed integrity.'}]});
 console.log('Multi-child fixture: original lists saved.');
 const originalSpell=(await spelling.parentList(principal)).lists[0],originalVocab=(await vocabulary.parentList(principal)).lists[0];
 // A real source-child study session proves copying does not transfer learning history.
 const run=await spelling.childCommand({studentId:students[0].id,deviceId:devices[0].id,id:crypto.randomUUID(),kind:'start',mode:'learn'},'synthetic');
 for(const item of run.items)await spelling.childCommand({studentId:students[0].id,deviceId:devices[0].id,id:crypto.randomUUID(),kind:'attempt',sessionId:run.session.id,wordId:item.id,answer:item.word},'synthetic');
 await spelling.childCommand({studentId:students[0].id,deviceId:devices[0].id,id:crypto.randomUUID(),kind:'complete',sessionId:run.session.id},'synthetic');
 console.log('Multi-child fixture: original practice saved.');
 let html=JSON.parse(fs.readFileSync(path.join(site,'app/guard/dashboard/generated/workspace.json'))).html;
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="/guard-admin/lucide.min.js"></script><script type="module" src="/fixture.js"></script></body>');
 server=http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  if(pathname==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(`import {setupCloudSpelling} from '/guard-admin/cloud-spelling.js';import {setupCloudVocabulary} from '/guard-admin/cloud-vocabulary.js';window.changeTab=tab=>document.querySelectorAll('.tab-content').forEach(el=>el.classList.toggle('active',el.id==='tab-'+tab));changeTab('spelling');window.sf=setupCloudSpelling({endpoint:'/fixture-spelling',getActivityDate:()=> '2026-10-05'});window.vf=setupCloudVocabulary();sf.setActive(true);vf.setActive(true);`);return;}
  if(pathname==='/fixture-spelling'||pathname==='/guard/dashboard/vocabulary/'){
   let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body),kind=pathname==='/fixture-spelling'?'spelling':'vocabulary',service=kind==='spelling'?spelling:vocabulary;
   res.setHeader('Content-Type','application/json');if(['list','list-spelling'].includes(input.action)){res.end(JSON.stringify(await service.parentList(principal,input)));return;}
   const command={...input};delete command.action;calls[kind].push(JSON.parse(JSON.stringify(command)));const result=await service.parentCommand(principal,command);
   if(command.studentId===students[2].id&&lost[kind]){lost[kind]=false;res.writeHead(502);res.end(JSON.stringify({error:'Synthetic reply lost after assignment saved'}));return;}
   res.end(JSON.stringify(result));return;
  }
  if(!/^\/guard-admin\/[a-zA-Z0-9._/-]+$/.test(pathname)||pathname.includes('..')){res.writeHead(404);res.end();return;}
  const file=path.join(site,'public',pathname);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(fs.readFileSync(file));
 }catch(error){res.writeHead(error.status||error.statusCode||500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}});
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 session.defaultSession.webRequest.onBeforeRequest((details,done)=>done({cancel:!details.url.startsWith(origin+'/')&&!details.url.startsWith('data:')}));
 win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{nodeIntegration:false,contextIsolation:true}});const evaluate=code=>win.webContents.executeJavaScript(code);
 const wait=async(code)=>{for(let i=0;i<180;i++){if(await evaluate(code))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error('Timed out: '+code);};
 console.log('Multi-child fixture: loading editor.');
 await win.loadURL(origin);await wait('document.querySelectorAll("#spelling-list-grid article").length===1&&document.querySelectorAll("#vocabulary-list-grid article").length===1');
 const geometry=[];
 for(const kind of ['spelling','vocabulary']){
  assert.equal(await evaluate(`document.querySelector('[data-${kind}-assign] svg')!==null`),true,'Assignment action has a rendered icon');
  await evaluate(`changeTab('${kind}');document.querySelector('[data-${kind}-assign]').click()`);
  assert.equal(await evaluate(`document.getElementById('${kind}-list-student').closest('.form-group').hidden`),true);
  assert.equal(await evaluate(`document.querySelectorAll('#${kind}-recipients input:checked').length`),0);
  assert.equal(await evaluate(`document.querySelector('#${kind}-recipients input[value="${students[0].id}"]').disabled`),true);
  assert.equal(await evaluate(`document.querySelectorAll('#${kind}-recipients img').length`),0);
  await evaluate(`document.getElementById('${kind}-list-save').click()`);assert.equal(calls[kind].length,0,'No child selected must not save');
  for(const child of students.slice(1,3))await evaluate(`document.querySelector('#${kind}-recipients input[value="${child.id}"]').click()`);
  assert.match(await evaluate(`document.getElementById('${kind}-list-save').textContent`),/2 children/);
  assert.equal(await evaluate(`document.getElementById('${kind==='spelling'?'spelling-scan-status':'vocabulary-form-error'}').textContent`),'');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#${kind}-list-modal .spelling-photo-tray')).display`),'none');
  for(const width of [1280,768,390,320]){
   win.setContentSize(width,900);await wait(`innerWidth===${width}`);
   const result=await evaluate(`(()=>{const modal=document.getElementById('${kind}-list-modal'),card=modal.querySelector('.modal-card'),picker=document.getElementById('${kind}-recipients'),chips=[...picker.querySelectorAll('label')];return{width:innerWidth,cardFits:card.getBoundingClientRect().right<=innerWidth+1&&card.getBoundingClientRect().left>=0,pickerFits:picker.scrollWidth<=picker.clientWidth,heights:chips.map(el=>el.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth>innerWidth};})()`);
   assert.equal(result.cardFits,true,kind+' modal '+width);assert.equal(result.pickerFits,true,kind+' picker '+width);assert.equal(result.overflow,false);assert.ok(result.heights.every(height=>height>=44));geometry.push({kind,...result});
  }
  win.setContentSize(390,900);await evaluate(`document.getElementById('${kind}-list-modal').querySelector('.modal-card').scrollTop=0`);fs.writeFileSync(path.join(output,kind+'-phone.png'),(await win.webContents.capturePage()).toPNG());
  await evaluate(`document.getElementById('${kind}-list-save').click();document.getElementById('${kind}-list-save').click()`);
  const errorId=kind==='spelling'?'spelling-scan-status':'vocabulary-form-error';await wait(`document.getElementById('${errorId}').textContent.includes('Synthetic reply lost')`);
  assert.equal(calls[kind].length,2);assert.match(await evaluate(`document.getElementById('${errorId}').textContent`),/1 of 2 saved for Ben/);
  assert.equal(await evaluate(`document.querySelector('#${kind}-recipients input').disabled`),true);
  const retryId=kind==='spelling'?'spelling-retry-modal':'vocabulary-retry-modal';await evaluate(`document.getElementById('${retryId}').click()`);await wait(`!document.getElementById('${kind}-list-modal').classList.contains('active')`);
  assert.equal(calls[kind].length,3);assert.deepEqual(calls[kind][1],calls[kind][2]);assert.deepEqual(calls[kind].map(call=>call.studentId),[students[1].id,students[2].id,students[2].id]);
 }
 const allSpell=(await spelling.parentList(principal)).lists;assert.equal(allSpell.length,3);assert.equal(allSpell.find(list=>list.id===source.spelling).completed_count,1);
 for(const child of students.slice(1,3)){const list=allSpell.find(list=>list.student_id===child.id);assert.deepEqual(list.words.map(word=>word.word),originalSpell.words.map(word=>word.word));assert.equal(list.words[0].teaching_hint,'Remember the double t.');assert.equal(list.completed_count,0);assert.equal(list.words.some(word=>originalSpell.words.some(old=>old.id===word.id)),false);}
 const vocabLists=[];for(const student of students)vocabLists.push(...(await vocabulary.parentList(principal,{studentId:student.id})).lists);
 assert.equal(vocabLists.length,3);for(const child of students.slice(1,3)){const list=vocabLists.find(list=>list.student_id===child.id);assert.deepEqual(list.terms.map(term=>[term.word,term.exact_definition,term.source_sentence]),originalVocab.terms.map(term=>[term.word,term.exact_definition,term.source_sentence]));assert.equal(list.sessions.length,0);assert.equal(list.terms.some(term=>originalVocab.terms.some(old=>old.id===term.id)),false);assert.equal(list.daily_term_limit,10);}
 // The ordinary editor still changes only its original child; New List exposes all children.
 await evaluate(`changeTab('spelling');document.querySelector('[data-spelling-edit="${source.spelling}"]').click()`);assert.equal(await evaluate('document.getElementById("spelling-recipients").hidden'),true);
 await evaluate('document.getElementById("spelling-list-cancel").click();document.getElementById("spelling-add-list").click()');assert.equal(await evaluate('document.getElementById("spelling-recipients").hidden'),false);
 await evaluate('document.querySelector("#spelling-recipients .learning-recipient-actions button").click()');assert.equal(await evaluate('document.querySelectorAll("#spelling-recipients input:checked").length'),4);
 const report={realServiceMultiChildAssignments:true,sourceProgressPreserved:true,separateWordAndTermIdentities:true,selectedChildrenOnly:true,spellingHintsPreserved:true,exactDefinitionsPreserved:true,exactLostResponseRetry:true,doubleClickSuppressed:true,zeroRecipientBlocked:true,editRemainsSingleChild:true,newListSupportsSelectAll:true,namesTextSafe:true,geometry};
 fs.writeFileSync(path.join(output,'ui-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();await db.close();app.quit();
})().catch(async error=>{console.error(error);win?.destroy();server?.close();await db?.close();app.exit(1);});
