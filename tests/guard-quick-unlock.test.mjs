import test from 'node:test';
import assert from 'node:assert/strict';
import { monitoringChildren } from '../public/guard-admin/cloud-monitoring.js';
import { applyFamilyPlan } from '../public/guard-admin/cloud-daily-plan-model.js';

const ids = model => model.quickUnlockSubjects.map(subject => subject.id);
function snapshot(subjects) {
  return { students:[{id:'a'},{id:'b'}], devices:[], serverTime:'2026-09-13T15:00:00Z',
    schoolActivities:[{module:'music',url:'app://music',ready:true}],
    rules:{revision:1,subjects}, activity:[] };
}
const assignment = (studentId, placement) => ({studentId,active:true,dailyGoalMinutes:15,dailyPlan:{placement}});

test('Quick Unlock omits No school requirement per child, retaining scheduled and after-school choices', () => {
  const state=snapshot([
    {id:'music',url:'app://music',title:'Music',accessTier:'school_optional',assignments:[assignment('a','anytime'),assignment('b','after_school')]},
    {id:'writing',title:'Writing',accessTier:'after_school',isReward:true,assignments:[assignment('a','anytime'),assignment('b','scheduled')]},
    {id:'school',title:'School',assignments:[assignment('a','school'),assignment('b','school')]},
    {id:'hidden',active:false,assignments:[assignment('a','scheduled')]},
    {id:'unassigned',assignments:[assignment('other','after_school')]},
    {id:'inactive',assignments:[{...assignment('a','after_school'),active:false}]},
  ]);
  const before=structuredClone(state), [a,b]=monitoringChildren(state);
  assert.deepEqual(ids(a),['school']);
  assert.deepEqual(ids(b),['music','writing','school']);
  assert.deepEqual(a.goals.map(s=>s.id),['music','writing','school'],'visibility does not remove activity/history rows');
  assert.deepEqual(state,before,'rendering does not change rules or unlocks');
});

test('existing optional subjects use the same placement fallback as Daily Plan', () => {
  const state=snapshot([
    {id:'optional',accessTier:'school_optional'},
    {id:'scheduled',accessTier:'school_optional',scheduleStart:'15:00'},
    {id:'reward',accessTier:'after_school'},
    {id:'legacy-reward',isReward:true},
  ]);
  assert.deepEqual(ids(monitoringChildren(state)[0]),['scheduled','reward','legacy-reward']);
  state.rules.subjects=[{id:'optional',accessTier:'school_optional'}];
  assert.deepEqual(ids(monitoringChildren(state)[0]),[]);
});

test('an applied family default is honored while a later child customization wins', () => {
  const state=snapshot([{id:'music',title:'Music',url:'app://music',assignments:[assignment('a','after_school'),assignment('b','after_school')]}]);
  const template={version:1,activities:[{key:'module:music',placement:'anytime',goal:0,days:[0,1,2,3,4,5,6],start:null,end:null,limitMinutes:30}]};
  state.rules={...state.rules,...applyFamilyPlan(state,template,['a','b']),dailyPlanTemplate:template};
  assert.deepEqual(monitoringChildren(state).map(ids),[[],[]]);
  state.rules.subjects[0].assignments.find(a=>a.studentId==='b').dailyPlan.placement='scheduled';
  assert.deepEqual(monitoringChildren(state).map(ids),[[],['music']]);
});
