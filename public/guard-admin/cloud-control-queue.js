// Independent parent controls can be queued without freezing unrelated buttons.
// Keep writes ordered, confirm each response, then coalesce the dashboard read.
export function isIndependentControl(action, data) {
  return (action === 'computer-command' && data?.kind === 'quick-unlock')
    || (action === 'media' && /^\/api\/(music|video|audiobooks)\/quick-control$/.test(data?.path || '') && ['override', 'extra-time'].includes(data?.body?.operation))
    || action === 'game-add-time' || action === 'set-school-pause';
}
export function applyControlResult(snapshot, action, data, result) {
  if (!snapshot) return snapshot;
  if (action === 'computer-command' && result.quickUnlock) {
    return { ...snapshot, students: snapshot.students.map(s => s.id === data.studentId ? { ...s, quick_unlock: result.quickUnlock } : s) };
  }
  if (action === 'media' && data.body.operation === 'override') {
    const kind = data.path.split('/')[2].replace('audiobooks', 'audiobook');
    const rows = snapshot.monitoring?.media || [], old = rows.find(r => r.studentId === data.body.student_id && r.kind === kind);
    return { ...snapshot, monitoring: { ...snapshot.monitoring, media: [...rows.filter(r => r !== old), { ...old, studentId: data.body.student_id, kind, unlocked: result.body.unlocked }] } };
  }
  if (action === 'set-school-pause') {
    return { ...snapshot, devices: snapshot.devices.map(d => d.id === data.deviceId ? { ...d, locked: data.locked } : d) };
  }
  return snapshot;
}
export function createControlQueue({ send, canSave, onSaved = () => {}, onState = () => {}, refresh, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let tail = Promise.resolve(), pending = 0, version = 0, timer;
  const confirmed = [];
  return {
    get busy() { return pending > 0; },
    get version() { return version; },
    mergeSnapshot(snapshot, readVersion) {
      // A read started before a successful write must not paint over its receipt.
      while (confirmed.length && confirmed[0].version <= readVersion) confirmed.shift();
      return confirmed.reduce((value, item) => applyControlResult(value, item.action, item.data, item.result), snapshot);
    },
    run(action, input) {
      if (!canSave()) return Promise.reject(Error('Reconnect the dashboard before making changes.'));
      const data = structuredClone(input); // Navigation cannot retarget queued work.
      clearTimer(timer); pending++; onState();
      const work = tail.then(async () => {
        if (!canSave()) throw Error('Reconnect the dashboard before making changes.');
        const result = await send(action, data);
        if (action === 'media' && (result?.status !== 200 || result.body?.success !== true || (data.body.operation === 'override' && result.body.unlocked !== data.body.unlocked))) {
          throw Error(result?.body?.error || 'The change could not be confirmed.');
        }
        if (action === 'computer-command' && (!Array.isArray(result?.quickUnlock?.subjectIds) || result.quickUnlock.subjectIds.includes(data.subjectId) !== data.unlocked)) {
          throw Error('The unlock could not be confirmed.');
        }
        confirmed.push({ version: ++version, action, data, result });
        onSaved(action, data, result);
        return result;
      });
      tail = work.catch(() => {}); // Failure of one item must not discard the next.
      return work.finally(() => {
        pending--; onState();
        if (!pending) timer = setTimer(() => { Promise.resolve().then(refresh).catch(() => {}); }, 200);
      });
    }
  };
}
