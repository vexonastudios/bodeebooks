import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudSubjectEdit,siteSubjectPreset} from '../public/guard-admin/cloud-school-editor.js';
test('plain sites and local app addresses reach only the chosen child with optional defaults',()=>{
 const snapshot={students:[{id:'child'},{id:'sibling'}],rules:{revision:7,subjects:[]}};
 for(const [kind,url] of [['site','https://example.com/'],['local','http://192.168.1.200:43169/']]){
  const preset=siteSubjectPreset(kind==='local');assert.equal(preset.accessTier,'school_optional');assert.deepEqual(preset.assignments,[]);
  const data=new FormData();for(const [k,v] of Object.entries({kind,url,title:'Parent-approved site',accessTier:preset.accessTier,alwaysOpen:'on',active:'on',icon:preset.icon,color:preset.color,description:'',displayOrder:'0','assigned-child':'on','goal-child':'0','order-child':'0',portalProvider:'abeka',allowedDomains:'example.com'}))data.set(k,v);
  const change=cloudSubjectEdit(snapshot,'new-site',data), row=change.subjects[0];
  assert.equal(change.revision,7);assert.equal(row.siteType,kind);assert.equal(row.kind,'website');assert.equal(row.url,url);assert.equal(row.portalProvider,'none');assert.equal(row.gradeCaptureEnabled,false);assert.equal(row.accessTier,'school_optional');
  assert.deepEqual(row.assignments,[{studentId:'child',active:true,dailyGoalMinutes:0,displayOrder:0}]);
  assert.deepEqual(row.allowedDomains,[]);
  data.set('kind','activity');data.set('activityUrl','app://audiobooks');
  const changed=cloudSubjectEdit({...snapshot,rules:{...snapshot.rules,subjects:[row]}},'new-site',data).subjects[0];assert.equal(changed.siteType,null);assert.equal(changed.url,'app://audiobooks');
 }
});
