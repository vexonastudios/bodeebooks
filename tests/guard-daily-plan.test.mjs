import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {dailyPlanCards,familyPlanCards,templateFromCards,applyFamilyPlan}=await import('data:text/javascript;base64,'+readFileSync(new URL('../public/guard-admin/cloud-daily-plan-model.js',import.meta.url)).toString('base64'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',archived='33333333-3333-4333-8333-333333333333';
function family(){return {students:[{id:a},{id:b},{id:archived,archived_at:'2026-09-01'}],schoolActivities:['spelling','vocabulary','poems'].map(module=>({module,url:`app://${module}`,ready:true})),rules:{revision:4,subjects:[{id:'44444444-4444-4444-8444-444444444444',kind:'activity',title:'Spelling',url:'app://spelling',planOnly:true,assignments:[{studentId:a,active:false,dailyGoalMinutes:0},{studentId:archived,active:false,dailyGoalMinutes:20}]}],schedule:{enabled:false}}};}
test('the served parent model applies allowed built-ins to all selected children and shows exclusions',()=>{
 const snapshot=family(),before=structuredClone(snapshot),cards=familyPlanCards(snapshot),template=templateFromCards(cards);
 for(const card of cards.filter(card=>card.module))assert.equal(template.activities.find(entry=>entry.key===card.key).enabled,true);
 assert.equal(dailyPlanCards(snapshot,{},b).find(card=>card.module==='spelling').placement,'blocked');
 assert.equal(dailyPlanCards(snapshot,{},b).find(card=>card.module==='spelling').notAssigned,true);
 const saved=applyFamilyPlan(snapshot,template,[a,b]);
 for(const module of ['spelling','vocabulary','poems'])for(const child of [a,b]){
  const subject=saved.subjects.find(row=>row.url===`app://${module}`),assignment=subject.assignments.find(row=>row.studentId===child);
  assert.equal(assignment.active,true);assert.equal(assignment.dailyPlan.enabled,true);
 }
 assert.deepEqual(saved.subjects[0].assignments.find(row=>row.studentId===archived),snapshot.rules.subjects[0].assignments[1]);
 assert.deepEqual(snapshot,before);assert.throws(()=>applyFamilyPlan(snapshot,template,[archived]),/family/);
});
test('legacy saved defaults enable missing built-ins on apply, while explicit family denial remains effective',()=>{
 const snapshot=family(),template=templateFromCards(familyPlanCards(snapshot));
 for(const entry of template.activities)if(entry.key.startsWith('module:'))delete entry.enabled;
 let saved=applyFamilyPlan(snapshot,template,[b]);
 assert.equal(saved.subjects[0].assignments.find(row=>row.studentId===b).active,true);
 assert.equal(saved.subjects[0].assignments.find(row=>row.studentId===a).active,false);
 template.activities.find(entry=>entry.key==='module:spelling').enabled=false;
 saved=applyFamilyPlan({...snapshot,rules:{...snapshot.rules,...saved}},template,[a,b]);
 assert.ok(saved.subjects[0].assignments.filter(row=>[a,b].includes(row.studentId)).every(row=>row.active===false));
});
