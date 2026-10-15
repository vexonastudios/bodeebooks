'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/guard-admin/media-audiobooks.js'),'utf8');
function fixture(fetch){
 const nodes=Object.fromEntries(['ab-settings-student','ab-max-minutes','ab-require-completion','ab-save-student','ab-override','ab-settings-status','ab-retry-settings','ab-override-status','ab-extra-time-status','ab-enabled','ab-start-time','ab-end-time','ab-save-global','ab-global-saved','ab-retry-global'].map(id=>[id,{value:'',style:{},hidden:false,disabled:false,textContent:''}]));
 nodes['ab-settings-student'].value='child-a';
 const context=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:()=>[]},fetch,AUDIOBOOK_API:'/api/audiobooks',AUDIOBOOK_DEFAULT_MINUTES:120,AbortSignal,headers:()=>({}),window:{},Date});
 vm.runInContext("let studentSettingsReady='',studentSettingsEpoch=0,studentSettingsSaving=false,globalSettingsReady=false,globalSettingsSaving=false;",context);
 vm.runInContext(source.slice(source.indexOf('async function jsonFetch('),source.indexOf('function toast(')),context);
 vm.runInContext(source.slice(source.indexOf('function audiobookSettingsStatus('),source.indexOf('async function lookupAudiobook(')),context);
 vm.runInContext(source.slice(source.indexOf('async function loadStudentSettings('),source.indexOf('async function addExtraTime(')),context);
 vm.runInContext(source.slice(source.indexOf('async function saveStudentSettings('),source.indexOf('async function toggleOverride(')),context);
 return {nodes,run:code=>vm.runInContext(code,context)};
}
test('audiobook failed reads block fallback saves; failed saves retain edits and can retry',async()=>{
 let fail=true;const calls=[],f=fixture(async(url,options)=>{calls.push({url,options});return Response.json(fail?{error:'Offline'}:options.method?{success:true}:{max_daily_minutes:35,require_completion:0},{status:fail?503:200});});
 await f.run('loadStudentSettings()');assert.equal(f.nodes['ab-save-student'].disabled,true);assert.equal(f.nodes['ab-retry-settings'].hidden,false);
 await f.run('saveStudentSettings()');assert.equal(calls.length,1);
 fail=false;await f.run('loadStudentSettings()');assert.equal(f.nodes['ab-max-minutes'].value,35);
 f.nodes['ab-max-minutes'].value='45';fail=true;await f.run('saveStudentSettings()');
 assert.match(f.nodes['ab-settings-status'].textContent,/Could not save/);assert.equal(f.nodes['ab-max-minutes'].value,'45');
 assert.equal(f.nodes['ab-save-student'].disabled,false);assert.equal(f.nodes['ab-settings-student'].disabled,false);
 fail=false;await f.run('saveStudentSettings()');assert.match(f.nodes['ab-settings-status'].textContent,/settings saved/);
 assert.equal(JSON.parse(calls.at(-1).options.body).max_daily_minutes,45);
 for(const value of ['','0','721','10.5']){f.nodes['ab-max-minutes'].value=value;const count=calls.length;await f.run('saveStudentSettings()');assert.equal(calls.length,count);}
});
test('late audiobook settings for a former child cannot replace the selected child values',async()=>{
 const pending=[],f=fixture(url=>new Promise(resolve=>pending.push({url,resolve})));
 const first=f.run('loadStudentSettings()');f.nodes['ab-settings-student'].value='child-b';const second=f.run('loadStudentSettings()');
 pending[1].resolve(Response.json({max_daily_minutes:15,require_completion:1}));await second;
 pending[0].resolve(Response.json({max_daily_minutes:90,require_completion:0}));await first;
 assert.equal(f.nodes['ab-max-minutes'].value,15);assert.equal(f.nodes['ab-require-completion'].checked,true);
 const save=f.run('saveStudentSettings()');assert.equal(f.nodes['ab-settings-student'].disabled,true);
 assert.ok(pending[2].url.endsWith('/child-b'));pending[2].resolve(Response.json({success:true}));await save;
});
test('audiobook global hours show load errors, reject failed saves and preserve entered hours',async()=>{
 let fail=true;const f=fixture(async()=>Response.json(fail?{error:'Offline'}:{audiobook_enabled:true,audiobook_start_time:'10:00',audiobook_end_time:'20:00'},{status:fail?503:200}));
 await f.run('loadGlobalSettings()');assert.equal(f.nodes['ab-save-global'].disabled,true);assert.equal(f.nodes['ab-retry-global'].hidden,false);
 fail=false;await f.run('loadGlobalSettings()');f.nodes['ab-start-time'].value='12:00';
 fail=true;await f.run('saveGlobalSettings()');assert.match(f.nodes['ab-global-saved'].textContent,/Could not save/);assert.equal(f.nodes['ab-start-time'].value,'12:00');
 fail=false;await f.run('saveGlobalSettings()');assert.match(f.nodes['ab-global-saved'].textContent,/hours saved/);
});
