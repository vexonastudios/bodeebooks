'use strict';
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
if(app.isPackaged)throw Error('Development fixture only');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'bg-family-prompt-')));
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<html lang="en-US"><head><link rel="stylesheet" href="/cloud-parent-setup.css"><style>body{background:#0d0d1b;color:#f1edff;font:16px Arial;margin:0}button{color:inherit;background:#202034;padding:12px;border:1px solid #716584;border-radius:8px}.btn-primary{background:#258864}</style></head><body><dialog open class="parent-setup-dialog"><div class="setup-frame"><header>Family setup</header><main class="setup-body" id="host"></main><footer>Continue</footer></div></dialog><script src="/lucide.min.js"></script><script type="module">
  const {createFamilyPrompt}=await import('/cloud-family-prompt.js');
  window.snapshot={students:[{name:'Existing',id:'existing'}],rules:{revision:2}};
  window.calls=[];window.rejectSave=false;window.busy=false;
  class Speech{start(){window.voice=this;}abort(){window.aborted=(window.aborted||0)+1;}}
  window.SpeechRecognition=Speech;
  window.component=createFamilyPrompt({getSnapshot:()=>snapshot,onBusy:value=>busy=value,previewDraft:async input=>{calls.push({action:'preview',input});return{children:[{name:'Mia',grade:'3',provider:'abeka',schoolName:'Abeka'},{name:'Existing',grade:'',provider:'',schoolName:''},{name:'Jonah',grade:'5',provider:'custom',schoolName:'Book curriculum'}],notes:['Check Jonah’s website if he uses one.']};},confirmDraft:async input=>{calls.push({action:'confirm',input});if(rejectSave)throw Error('Connection lost');snapshot.students.push(...input.children.map(c=>({...c,id:c.name})));return{createdCount:input.children.length};}});
  component.mount(document.getElementById('host'));window.ready=true;
  window.typeDescription=text=>{const input=document.querySelector('textarea');input.value=text;input.dispatchEvent(new Event('input'));};
  window.clickText=text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(text));if(!b)throw Error('Missing button '+text);b.click();};
  window.settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
  </script></body></html>`);return;}
  const name=req.url.split('?')[0].slice(1);if(['cloud-family-prompt.js','cloud-setup-controls.js','cloud-parent-setup.css','lucide.min.js'].includes(name)){res.setHeader('Content-Type',name.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(path.join(root,'public/guard-admin',name)));return;}res.writeHead(404);res.end();
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
  await app.whenReady();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(origin)}));
  const win=new BrowserWindow({show:false,width:1200,height:920,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}}),js=async s=>{try{return await win.webContents.executeJavaScript(s.includes('await ')?'(async()=>{'+s+'})()':s,true);}catch(e){throw Error('Renderer fixture failed at: '+s+' / '+e.message);}};
  win.webContents.on('console-message',event=>console.log('renderer:',event.message));await win.loadURL(origin);for(let i=0;i<50&&!await js('window.ready');i++)await delay(30);assert.equal(await js('ready'),true);
  await js("typeDescription('Mia is in grade 3 with Abeka; Jonah is in grade 5.');clickText('Create family draft');await settle()");
  assert.equal(await js('calls.length'),0,'no AI request without explicit consent');
  await js("document.querySelector('.family-prompt-consent input').click();clickText('Create family draft');await settle()");
  assert.equal(await js('calls.length'),1);assert.equal(await js('calls[0].input.consent'),true);
  assert.deepEqual(await js("[...document.querySelectorAll('.family-prompt-include input')].map(i=>i.checked)"),[true,false,true]);
  assert.equal(await js('calls.some(c=>c.action==="confirm")'),false,'a draft does not save');
  assert.equal(await js('component.flush().then(()=>false,()=>true)'),true,'continuing requires review');
  assert.equal(await js('document.querySelectorAll(".family-prompt button svg").length>=4'),true,'Lucide action icons render');
  await js("typeDescription('Mia is in grade 4. Jonah is in grade 5.');");assert.equal(await js('document.querySelector(".family-prompt-review")===null'),true,'changed description invalidates old review');
  await js("clickText('Create a new draft');await settle()");
  const layout=()=>js(`({overflow:document.querySelector('.setup-body').scrollWidth>document.querySelector('.setup-body').clientWidth+1,buttons:[...document.querySelectorAll('.family-prompt-actions button')].map(b=>b.getBoundingClientRect().height),fields:[...document.querySelectorAll('.family-prompt input,.family-prompt textarea,.family-prompt select')].every(e=>e.getBoundingClientRect().right<=document.querySelector('dialog').getBoundingClientRect().right)})`);
  for(const width of [1200,570,390,320]){win.setSize(width,920);await delay(50);const geometry=await layout();assert.equal(geometry.overflow,false,'overflow at '+width);assert.equal(geometry.fields,true);assert.equal(geometry.buttons.every(h=>h>=44),true);}
  await js("rejectSave=true;clickText('Confirm & add children');await settle()");const first=await js('calls.at(-1).input');assert.equal(first.children.length,2);assert.equal(first.rulesRevision,2);
  assert.equal(await js("document.querySelector('textarea').disabled"),true,'uncertain save keeps immutable receipt');
  await js("rejectSave=false;clickText('Retry same save');await settle()");assert.deepEqual(await js('calls.at(-1).input'),first);assert.equal(await js('component.flush().then(()=>true,()=>false)'),true);
  await js("clickText('Add more children');clickText('Speak instead');voice.onresult({results:[[{transcript:'June is in kindergarten'}]]});");assert.equal(await js("document.querySelector('textarea').value"),'June is in kindergarten');
  await js("voice.onresult({results:[[{transcript:'June is in kindergarten'}]]});");assert.equal(await js("document.querySelector('textarea').value"),'June is in kindergarten','interim result replaces, never duplicates');
  await js("voice.onerror({error:'not-allowed'})");assert.equal(await js("document.querySelector('textarea').readOnly"),false);assert.match(await js("document.querySelector('.family-prompt-status').textContent"),/denied/);
  await js("clickText('Speak instead');component.unmount()");assert.equal(await js('aborted>=2'),true,'closing releases speech service');
  await js("Object.defineProperty(window,'SpeechRecognition',{value:undefined,configurable:true});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined,configurable:true});component.mount(document.getElementById('host'));clickText('Speak instead')");assert.match(await js("document.querySelector('.family-prompt-status').textContent"),/keyboard microphone/);
  console.log('Family prompt: consent, editable draft, duplicate defaults, retries, 4 responsive widths and dictation lifecycle passed');win.destroy();server.close();app.exit(0);
}
run().catch(error=>{console.error(error);server.close();app.exit(1);});
