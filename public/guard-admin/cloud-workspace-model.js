// Pure presentation mappings shared by browser tests. Never infer Wi-Fi failure
// from a missing cloud heartbeat or school completion from elapsed time.
export function connectionState(device, now) {
  const last = Date.parse(device.last_seen_at);
  return Number.isFinite(last) && now >= last - 5000 && now - last < 90000 ? 'Connected' : 'Not connected';
}
export function receivedTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}
export function deliveryState(device) {
  return Number(device.revision) > Number(device.acknowledged_revision || 0)
    ? 'Waiting for computer confirmation'
    : device.locked ? 'School paused' : 'School available';
}
export function todaySeconds(snapshot, studentId) {
  return (snapshot.activity || []).filter(item => item.student_id === studentId && item.date_utc === snapshot.serverTime.slice(0, 10))
    .reduce((total, item) => total + (Number(item.seconds) || 0), 0);
}
export function editSubjects(snapshot, subjectId, title, url, remove = false, assignments) {
  // Copy the revision captured when the editor opens. A later poll must not
  // silently replace it and overwrite another parent's intervening change.
  const subjects = snapshot.rules.subjects.map(subject => ({ ...subject }));
  const index = subjects.findIndex(subject => subject.id === subjectId);
  if (remove) {
    if (index < 0) throw new Error('That subject no longer exists. Refresh the dashboard.');
    subjects.splice(index, 1);
  } else if (index >= 0) subjects[index] = { ...subjects[index], title, url, ...(assignments === undefined ? {} : { assignments }) };
  else subjects.push({ id: subjectId, title, url, ...(assignments === undefined ? {} : { assignments }) });
  return { revision: snapshot.rules.revision, subjects, schedule: snapshot.rules.schedule };
}

export function editSchedule(snapshot, schedule) {
  return { revision: snapshot.rules.revision, subjects: snapshot.rules.subjects.map(subject => ({ ...subject })), schedule };
}

export function assignmentFor(subject, studentId) {
  if (!studentId) return null;
  if (!Array.isArray(subject?.assignments)) return { studentId, dailyGoalMinutes: 30, legacy: true };
  return subject.assignments.find(item => item.studentId === studentId) || null;
}

export function subjectProgress(snapshot, studentId, subjectId, date = snapshot.serverTime.slice(0, 10)) {
  const subject = snapshot.rules.subjects.find(item => item.id === subjectId);
  const assignment = assignmentFor(subject, studentId);
  if (!assignment) return null;
  const seconds = (snapshot.activity || []).filter(item => item.student_id === studentId && item.subject_id === subjectId && item.date_utc === date)
    .reduce((total, item) => total + Math.max(0, Number(item.seconds) || 0), 0);
  const goalSeconds = assignment.dailyGoalMinutes * 60;
  return { seconds, goalMinutes: assignment.dailyGoalMinutes, percent: Math.min(100, Math.floor(seconds * 100 / goalSeconds)) };
}
