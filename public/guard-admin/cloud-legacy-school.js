export function setupCloudLegacySchool({ root, request, onApplied = () => {} }) {
  root.classList.add('cloud-panel'); root.style.marginBlock = '24px'; root.style.scrollMarginTop = '24px';
  const node = (tag, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
  const status = node('p'), summary = node('div'), review = node('div'), history = node('div'); status.setAttribute('role', 'status');
  let busy = false, archiveId = null, pending = null, plan = null;
  const button = (label, action) => { const e = node('button', label); e.type = 'button'; e.className = 'btn btn-secondary'; e.onclick = () => void run(action); return e; };
  const prepare = button('Review family School transfer', createReview);
  root.append(node('h3', 'Transfer original School'), status, button('Refresh School comparison', load), summary, prepare, review, history);
  function freeze() { root.querySelectorAll('button').forEach(e => { e.disabled = busy || e.dataset.permanentDisabled === 'true'; }); }
  async function run(action) { if (busy) return; busy = true; freeze(); try { await action(); } catch (error) { status.textContent = error.message; } finally { busy = false; freeze(); } }
  function definitions(detail) {
    const list = node('details'); list.append(node('summary', 'Review original subjects and every child assignment'));
    for (const subject of detail.subjects) {
      const section = node('section'); section.append(node('h4', subject.title), node('p', `${subject.kind} · ${subject.active === false ? 'Inactive' : 'Active'} · ${subject.accessTier.replaceAll('_', ' ')} · ${subject.url || 'Offline schoolwork'}`));
      if (subject.description) section.append(node('p', subject.description));
      if (subject.scheduleStart) section.append(node('p', `Available ${subject.scheduleStart}–${subject.scheduleEnd} in ${detail.timeZone}.`));
      if (subject.unlockAfterSubjectId) section.append(node('p', `Complete ${detail.subjects.find(s => s.id === subject.unlockAfterSubjectId)?.title || 'the prerequisite subject'} first.`));
      if (subject.isSchoolPortal) section.append(node('p', 'Portal completion requires a saved provider result or parent review.'));
      for (const a of subject.assignments) {
        const child = detail.students.find(s => s.cloud?.student_id === a.studentId);
        section.append(node('p', `${child?.name || 'Original child'} → ${child?.cloud?.name || 'Unmapped'}${child?.cloud?.archived_at ? ' (archived)' : ''} · ${a.active ? 'Assigned' : 'Inactive assignment'} · ${a.dailyGoalMinutes === 0 ? 'No time goal; completion required' : a.dailyGoalMinutes + ' minutes daily'} · order ${a.displayOrder}`));
      }
      list.append(section);
    }
    return list;
  }
  function totals(detail) {
    summary.replaceChildren(node('p', `${detail.records} original records: ${detail.counts.subjects} subjects, ${detail.counts.student_subjects} assignments, ${detail.counts.sessions} sessions, ${detail.counts.daily_progress} daily progress entries and ${detail.counts.quizlet_module_enrollment} Quizlet enrollment markers.`),
      node('p', `${detail.existingSubjects.length} existing cloud subjects and the current ${detail.timeZone} calendar will be kept.`));
    if (detail.unknownSubjectHistory) summary.append(node('p', `${detail.unknownSubjectHistory} entries refer to deleted subjects. Their dates, time and saved metadata remain available in history.`));
    if (detail.unfinishedSessions) summary.append(node('p', `${detail.unfinishedSessions} unfinished original sessions will remain historical records. A new cloud timer starts only when a child opens schoolwork.`));
    if (detail.pendingActivities.length) summary.append(node('p', `These original activities are retained but still unavailable in the current cloud child: ${detail.pendingActivities.map(s => s.title).join(', ')}.`));
    for (const child of detail.students.filter(s => !s.cloud)) summary.append(node('p', `${child.name}: review and activate the original child mapping first.`));
    if (detail.subjects.length) summary.append(definitions(detail));
    if (detail.issues.length) summary.append(node('p', [...new Set(detail.issues)].join(' ')));
    if (detail.imported) summary.append(node('p', 'Original School is already connected. The receipt is below.'));
    prepare.dataset.permanentDisabled = String(detail.imported || detail.issues.length > 0 || !detail.records || detail.students.some(s => !s.cloud));
  }
  async function loadHistory() {
    const result = await request('schoolTransferHistory'); history.replaceChildren();
    for (const item of result.receipts) {
      const record = node('details'); record.append(node('summary', `${item.rolled_back_at ? 'Undone' : 'Connected'} · School · ${item.receipt.records} original records · ${new Date(item.created_at).toLocaleString()}`), node('p', 'Original assignments, schedules, prerequisites and history were retained. Session time and daily totals were reconciled without counting the same old time twice. No coins were added.'));
      if (!item.rolled_back_at) record.append(button('Review School undo', async () => {
        record.append(node('p', 'Undo restores the previous cloud subjects only if School settings, child mappings and received School work are unchanged. The verified archive and receipt remain retained.'),
          button('Undo this unchanged School transfer', async () => { await request('rollbackSchoolTransfer', { planId: item.plan_id }); status.textContent = 'School transfer undone. The archive and receipt remain retained.'; await afterChange(); }));
      }));
      history.append(record);
    }
  }
  async function afterChange() {
    try { await onApplied(); } catch { /* The durable transfer receipt remains authoritative. */ }
    try { await loadHistory(); totals(await request('inspectSchoolTransfer', { id: archiveId })); }
    catch { status.textContent += ' Refresh the comparison when connected.'; }
  }
  async function createReview() {
    pending ??= { id: archiveId, requestId: crypto.randomUUID() }; plan = await request('planSchoolTransfer', pending); const detail = plan.review;
    review.replaceChildren(node('h4', 'Review the complete original School transfer'), node('p', `Add ${detail.counts.subjects} original subjects and retain ${detail.records} records. Keep ${detail.existingSubjects.length} existing cloud subjects and the current family calendar.`), definitions(detail),
      node('p', 'Original sessions and daily progress contribute one historical time baseline. Saved completion flags remain labeled as original records. Quizlet markers do not re-enroll a removed subject. This transfer adds no coins.'));
    if (detail.pendingActivities.length) review.append(node('p', `${detail.pendingActivities.length} original activities still need their cloud child implementation. Applying the history transfer does not make the complete child installer ready.`));
    const apply = button('Apply reviewed School transfer', async () => {
      const saved = await request('applySchoolTransfer', { planId: plan.id, digest: plan.digest });
      status.textContent = `School connected: ${saved.records} original records, ${saved.coinsAdded} coins added.`;
      pending = plan = null; review.replaceChildren(); await afterChange();
    });
    if (detail.source.rehearsalOnly || detail.source.sourceChangedDuringCopy) { apply.dataset.permanentDisabled = 'true'; review.append(node('p', 'This rehearsal can be reviewed. Apply requires a verified final snapshot.')); }
    review.append(apply); status.textContent = 'Review the original subjects, child assignments and retained cloud settings before applying.';
  }
  async function load() { pending = plan = null; review.replaceChildren(); totals(await request('inspectSchoolTransfer', { id: archiveId })); await loadHistory(); status.textContent = 'Original School is ready for review.'; }
  return { async open(id) { if (busy) return; archiveId = id; await run(load); } };
}
