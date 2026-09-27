import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const moduleUrl = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const workspace = moduleUrl(fs.readFileSync(new URL('../public/guard-admin/cloud-workspace-model.js', import.meta.url), 'utf8'));
const { familyReadiness, nextSetupStep } = await import(moduleUrl(fs.readFileSync(new URL('../public/guard-admin/cloud-parent-readiness.js', import.meta.url), 'utf8').replace("'./cloud-workspace-model.js'", JSON.stringify(workspace))));
function family() {
  return { students:[{id:'child',name:'Test Child',main_school:{provider:'none'}}],
    devices:[{id:'pc',student_id:'child',revision:3,acknowledged_revision:3,recovery_configured:true,last_seen_at:'2020-01-01T00:00:00Z',locked:true}],
    rules:{subjects:[{assignments:[{studentId:'child',dailyPlan:{placement:'school'}}]}]} };
}
test('offline and paused does not block finishing a confirmed computer',()=>{
  const rows=familyReadiness(family(),{completed:false});assert.equal(rows[0].ready,true);assert.equal(rows[0].connected,false);
  assert.equal(nextSetupStep(family(),{completed:false}).label,'Finish setup and hide this reminder');
  assert.equal(nextSetupStep(family(),{completed:true}),null);
});
test('pending first confirmation tells the parent what to do',()=>{
  const s=family();s.devices[0].acknowledged_revision=2;
  const row=familyReadiness(s,{completed:false})[0];assert.equal(row.ready,false);assert.equal(row.next.id,'controls');
  assert.match(row.next.detail,/Open BodeeGuard/);assert.match(nextSetupStep(s,{}).label,/get computer confirmation/);
});
test('later control changes do not restart an already finished guide',()=>{
  const s=family();s.devices[0].revision=4;
  assert.equal(nextSetupStep(s,{completed:true}),null);assert.equal(familyReadiness(s,{completed:true})[0].controlsPending,true);
});
test('missing or revoked computers remain required after completion',()=>{
  const s=family();s.devices[0].revoked_at='2026-01-01';
  assert.match(nextSetupStep(s,{completed:true}).label,/connect a computer/);
});
test('recovery missing resurfaces even for a completed family',()=>{
  const s=family();s.devices[0].recovery_configured=false;
  assert.match(nextSetupStep(s,{completed:true}).label,/set up parent recovery/);
});
test('new parent password requires its own confirmation',()=>{
  const s=family();s.parentPassword={configured:true,revision:2};s.devices[0].family_password_revision=1;
  assert.equal(familyReadiness(s,{completed:true})[0].next.id,'password');
  s.devices[0].family_password_revision=2;assert.equal(nextSetupStep(s,{completed:true}),null);
});
test('checks cannot borrow recovery from one computer and acknowledgement from another',()=>{
  const s=family();s.devices.push({...s.devices[0],id:'second',recovery_configured:false});s.devices[0].acknowledged_revision=0;
  assert.equal(familyReadiness(s,{completed:false})[0].ready,false);
});
test('one fully configured computer is enough without forcing every spare online',()=>{
  const s=family();s.devices.unshift({...s.devices[0],id:'spare',recovery_configured:false,acknowledged_revision:0});
  assert.equal(familyReadiness(s,{completed:false})[0].device.id,'pc');assert.equal(familyReadiness(s,{completed:false})[0].ready,true);
});
test('new never-confirmed computer is not hidden by family completion',()=>{
  const s=family();s.devices[0].acknowledged_revision=0;
  assert.match(nextSetupStep(s,{completed:true}).label,/get computer confirmation/);
});
test('school and activity choices remain required and archived profiles are excluded',()=>{
  const s=family();s.students.push({id:'old',archived_at:'2020-01-01'});s.students[0].main_school=null;
  assert.equal(familyReadiness(s,{}).length,1);assert.equal(nextSetupStep(s,{}).step,1);
  s.students[0].main_school={provider:'none'};s.rules.subjects=[];assert.equal(nextSetupStep(s,{}).step,2);
});
test('no children is never complete',()=>{
  const s=family();s.students=[];assert.equal(nextSetupStep(s,{completed:true}).step,0);
});
