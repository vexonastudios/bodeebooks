'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/guard-admin/media-video.js'),'utf8');
function fixture(fetch){
 const nodes=Object.fromEntries(['vsett-student-sel','vsett-save-btn','vsett-max-min','vsett-req-completion','vsett-saved','save-video-settings-btn','video-enabled','video-start-time','video-end-time','video-settings-saved'].map(id=>[id,{value:'',style:{display:'none'},dataset:{},addEventListener(type,fn){this['on'+type]=fn;},disabled:false,textContent:'Save Settings'}]));
 nodes['vsett-student-sel'].value='child-a';nodes['vsett-max-min'].value='45';nodes['vsett-req-completion'].checked=true;
 const notices=[],context=vm.createContext({document:{getElementById:id=>nodes[id]},fetch,API:'/api',authHeaders:()=>({}),apiKey:()=>'',AbortSignal,VIDEO_DEFAULT_MINUTES:20,window:{showToast:(...args)=>notices.push(args)},logger:{warn(){}},setTimeout:()=>{},renderOverrideState(){}});
 vm.runInContext(source.slice(source.indexOf('function setupVideoLibrary()'),source.indexOf('\nasync function lookupVideo')),context);
 vm.runInContext(source.slice(source.indexOf('let videoSettingsLoadSequence'),source.indexOf('\nfunction renderOverrideState')),context);
 vm.runInContext(source.slice(source.indexOf('async function saveVideoStudentSettings()'),source.indexOf('// ─────────────────────────────────────────────\n//  WATCH HISTORY')),context);
 return {nodes,notices,run:code=>vm.runInContext(code,context)};
}
test('video settings HTTP failures never show Saved, preserve edits and permit a successful retry',async()=>{
 let fail=true;const requests=[],f=fixture(async(url,options)=>{requests.push({url,options});return Response.json(fail?{error:'Offline'}:{success:true},{status:fail?503:200});});
 await f.run('saveVideoStudentSettings()');
 assert.equal(f.nodes['vsett-saved'].style.display,'none');assert.equal(f.nodes['vsett-max-min'].value,'45');
 assert.match(f.notices.at(-1)[0],/edits are still here/);assert.equal(f.nodes['vsett-save-btn'].disabled,false);
 fail=false;await f.run('saveVideoStudentSettings()');assert.equal(f.nodes['vsett-saved'].style.display,'inline');
 assert.equal(JSON.parse(requests.at(-1).options.body).max_daily_minutes,45);
});
test('failed settings reads cannot save fallback settings; retry and out-of-order child changes stay isolated',async()=>{
 let fail=true;const f=fixture(async()=>Response.json(fail?{error:'Offline'}:{max_daily_minutes:35,require_completion:0},{status:fail?503:200}));
 await f.run('loadVideoStudentSettingsForm()');
 assert.equal(f.nodes['vsett-max-min'].disabled,true);
 assert.equal(f.nodes['vsett-save-btn'].textContent,'Retry loading settings');
 fail=false;await f.run('saveVideoStudentSettings()');
 assert.equal(f.nodes['vsett-max-min'].value,35);assert.equal(f.nodes['vsett-max-min'].disabled,false);
 const pending=[],g=fixture(url=>new Promise(resolve=>pending.push({url,resolve})));
 const first=g.run('loadVideoStudentSettingsForm()');
 g.nodes['vsett-student-sel'].value='child-b';const second=g.run('loadVideoStudentSettingsForm()');
 pending[1].resolve(Response.json({max_daily_minutes:10,require_completion:1}));await second;
 pending[0].resolve(Response.json({max_daily_minutes:90,require_completion:0}));await first;
 assert.equal(g.nodes['vsett-max-min'].value,10);assert.equal(g.nodes['vsett-req-completion'].checked,true);
});


test('global video hours also reject HTTP failures without showing a false Saved indicator',async()=>{
 let fail=true;const f=fixture(async()=>Response.json(fail?{error:'Offline'}:{success:true},{status:fail?503:200}));
 f.run('setupVideoLibrary()');await f.nodes['save-video-settings-btn'].onclick();
 assert.equal(f.nodes['video-settings-saved'].style.display,'none');assert.match(f.notices.at(-1)[0],/edits are still here/);
 fail=false;await f.nodes['save-video-settings-btn'].onclick();assert.equal(f.nodes['video-settings-saved'].style.display,'inline');
});
