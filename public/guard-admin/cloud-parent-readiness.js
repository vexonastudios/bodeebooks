import { connectionState } from './cloud-workspace-model.js';

// Setup evidence is durable. Being online or having school unpaused is a daily
// status, not a prerequisite for finishing this guide. Never infer school login.
export function familyReadiness(snapshot, setup) {
  const children = snapshot.students.filter(child => !child.archived_at);
  const now = Math.max(Date.now(), Date.parse(snapshot.serverTime) || 0);
  return children.map(child => {
    const devices = (snapshot.devices || []).filter(device => !device.revoked_at && device.student_id === child.id);
    const passwordConfirmed = device => !snapshot.parentPassword?.configured
      || Number(device.family_password_revision || 0) >= snapshot.parentPassword.revision;
    const controlsConfirmed = device => Number.isInteger(device.acknowledged_revision) && device.acknowledged_revision > 0
      && Number.isInteger(device.revision) && device.acknowledged_revision >= device.revision;
    // After the guide has been finished, ordinary control changes do not restart
    // onboarding. Missing recovery or a new password still needs attention.
    const initialConfirmation = device => controlsConfirmed(device)
      || setup?.completed === true && Number(device.acknowledged_revision) > 0;
    // Keep all checks tied to one computer; do not combine partial evidence from
    // different devices to incorrectly mark a child as set up.
    const score = device => Number(device.recovery_configured === true) * 4
      + Number(passwordConfirmed(device)) * 2 + Number(initialConfirmation(device));
    const device = [...devices].sort((a,b) => score(b)-score(a))[0];
    const connected = !!device && connectionState(device, now) === 'Connected';
    const hasPlan = snapshot.rules.subjects.some(subject => subject.assignments?.some(a => a.studentId === child.id && a.dailyPlan));
    const checks = [
      {id:'school',label:'School chosen',done:!!child.main_school?.provider,step:1,action:'Choose school',detail:'Choose a school website, or select No online school.'},
      {id:'activities',label:'Activity choices saved',done:hasPlan || setup?.completed === true,step:2,action:'Choose activities',detail:'Review the daily plan and save this child’s activity choices.'},
      {id:'computer',label:'Computer assigned',done:!!device,step:3,action:'Connect a computer',detail:'Install BodeeGuard, approve its pairing code, and assign this child.'},
      {id:'recovery',label:'Parent recovery configured',done:device?.recovery_configured === true,step:3,action:'Set up parent recovery',detail:'On this child’s computer, open BodeeGuard and finish parent recovery setup. Then tap Check again here.'},
      {id:'password',label:'Parent password configured',done:!!device && passwordConfirmed(device),step:3,action:'Sync parent password',detail:'Open BodeeGuard on this child’s computer and keep it connected to the internet to receive your parent password. Then tap Check again.'},
      {id:'controls',label:'Computer setup confirmed',done:!!device && initialConfirmation(device),step:3,action:'Get computer confirmation',detail:'Open BodeeGuard on this child’s computer and keep it connected to the internet until it confirms the saved assignment and controls. Then tap Check again.'}
    ].filter(check => check.id !== 'password' || snapshot.parentPassword?.configured);
    const next = checks.find(check => !check.done);
    const connectLater = !(snapshot.devices || []).some(item=>item.student_id===child.id) && checks.filter(check=>check.step<3).every(check=>check.done);
    return {child,devices,device,checks,connected,ready:!next,next,connectLater,controlsPending:!!device && !controlsConfirmed(device)};
  });
}

export function canFinishSetup(snapshot, setup) {
  const rows = familyReadiness(snapshot, setup);
  // A profile without a computer can wait. At least one child's computer must
  // have completed setup; assigned devices cannot skip required recovery checks.
  return rows.some(row=>row.ready) && rows.every(row=>row.ready || row.connectLater);
}

export function nextSetupStep(snapshot, setup) {
  const rows = familyReadiness(snapshot, setup);
  if (!rows.length) return {step:0,label:'Add your children'};
  const unfinished = rows.find(row => row.next && !row.connectLater)
    || (setup?.completed && rows.some(row=>row.ready) ? null : rows.find(row=>row.next));
  if (unfinished) return {step:unfinished.next.step,label:unfinished.child.name + ': ' + unfinished.next.action.toLowerCase()};
  return setup?.completed ? null : {step:3,label:'Finish setup and hide this reminder'};
}
