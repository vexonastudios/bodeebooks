import { connectionState } from './cloud-workspace-model.js';

// Cloud evidence only. A heartbeat does not prove a school website is signed in.
export function familyReadiness(snapshot, setup) {
  const children = snapshot.students.filter(child => !child.archived_at);
  const now = Math.max(Date.now(), Date.parse(snapshot.serverTime) || 0);
  return children.map(child => {
    const devices = (snapshot.devices || []).filter(device => !device.revoked_at && device.student_id === child.id);
    const readyDevice = devices.find(device => connectionState(device, now) === 'Connected'
      && !device.locked && device.recovery_configured === true
      && (!snapshot.parentPassword?.configured || Number(device.family_password_revision || 0) >= snapshot.parentPassword.revision)
      && Number.isInteger(device.acknowledged_revision) && Number.isInteger(device.revision)
      && device.acknowledged_revision >= device.revision);
    const hasPlan = snapshot.rules.subjects.some(subject => subject.assignments?.some(a => a.studentId === child.id && a.dailyPlan));
    const checks = [
      {label:'School chosen', done:!!child.main_school?.provider, step:1},
      {label:'Activity choices saved', done:hasPlan || setup?.completed === true, step:2},
      {label:'Computer assigned', done:devices.length > 0, step:3},
      {label:'Computer online, parent controls confirmed & recovery available', done:!!readyDevice, step:3}
    ];
    const next = checks.find(check => !check.done);
    return {child, devices, checks, connected:!!readyDevice, ready:!next, next};
  });
}

export function nextSetupStep(snapshot, setup) {
  const rows = familyReadiness(snapshot, setup);
  if (!rows.length) return {step:0,label:'Add your children'};
  const unfinished = rows.find(row => row.next);
  if (unfinished) return {step:unfinished.next.step,label:`${unfinished.child.name}: ${unfinished.next.label.toLowerCase()}`};
  return setup?.completed ? null : {step:3,label:'Review your family’s readiness'};
}
