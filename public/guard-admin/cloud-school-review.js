import { localDate } from './cloud-records-model.js';

export function setupCloudSchoolReview({ before, endpoint, getSnapshot, onApplied = () => {} }) {
  const node = (tag, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
  const root = node('section'); root.id = 'cloud-school-review'; root.className = 'cloud-panel';
  const status = node('p'), choices = node('div'), rows = node('div'), student = node('select'), date = node('input'), refresh = node('button', 'Review school completion');
  student.className = date.className = 'admin-input'; student.setAttribute('aria-label', 'School review child'); date.setAttribute('aria-label', 'School review date'); date.type = 'date';
  refresh.type = 'button'; refresh.className = 'btn btn-secondary'; status.setAttribute('role', 'status'); choices.className = 'cloud-school-review-filters';
  const childLabel = node('label', 'Child'), dateLabel = node('label', 'School date'); childLabel.append(student); dateLabel.append(date); choices.append(childLabel, dateLabel, refresh);
  root.append(node('h3', 'Daily school completion'), choices, status, rows); before.before(root);
  let busy = false, pending = null, loaded = null;
  function freeze() {
    root.querySelectorAll('button,input,select,textarea').forEach(e => { e.disabled = busy || Boolean(pending && e !== pending.button); });
    if (!student.value) refresh.disabled = true;
  }
  async function request(action, input) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const data = await response.json(); if (!response.ok) { const error = new Error(data.error || 'School review could not be confirmed.'); error.status = response.status; throw error; } return data;
  }
  async function run(action) {
    if (busy) return; busy = true; freeze();
    try { await action(); } catch (error) {
      if ([400, 401, 403, 404, 409].includes(error.status)) pending = null;
      status.textContent = `${error.message}${pending ? ' Retry the same saved decision to confirm it.' : ' Refresh before making another decision.'}`;
    } finally { busy = false; freeze(); }
  }
  function render() {
    rows.replaceChildren();
    status.textContent = `${loaded.student.name} · ${loaded.date} · ${loaded.timeZone}. ${loaded.completion.completed} of ${loaded.completion.total} required items complete.${loaded.completion.isSchoolDay ? '' : ' This is a day off.'}`;
    for (const subject of loaded.subjects) {
      const row = node('article'); row.className = 'cloud-school-review-row';
      row.append(node('h4', subject.title), node('p', `${subject.completed ? 'Complete' : 'Still needs work'} · ${Math.floor(subject.seconds / 60)}m ${subject.seconds % 60}s received · ${subject.dailyGoalMinutes}m goal · saved result: ${subject.source}`));
      row.append(node('p', subject.isSchoolPortal ? 'Review the provider lesson before marking it complete.' : subject.dailyGoalMinutes > 0 ? 'The original time rule still applies: a saved completion counts after 80% of the goal, or study time completes the goal at 100%.' : 'This subject has no time goal. Completion needs an explicit review or the child’s Finish action.'));
      if (subject.portalCourses?.length) {
        const courses=node('div'); courses.className='cloud-abeka-courses';
        for(const course of subject.portalCourses) { const chip=node('span',(course.completed?'✓ ':'○ ')+course.courseName); chip.className=course.completed?'cloud-abeka-course complete':'cloud-abeka-course'; chip.title=course.lessonLabel; courses.append(chip); }
        row.append(courses);
      }
      if (loaded.student.archived_at) { row.append(node('p', 'Restore this child before changing completion.')); rows.append(row); continue; }
      const decision = node('select'); decision.className = 'admin-input'; decision.setAttribute('aria-label', `Completion decision for ${subject.title}`);
      for (const [value, label] of [['', 'Choose your reviewed decision'], ['true', 'Lesson complete'], ['false', 'Needs more work']]) { const option = node('option', label); option.value = value; decision.append(option); }
      const notes = node('textarea'); notes.className = 'admin-input'; notes.rows = 2; notes.maxLength = 2000; notes.value = subject.parentNotes; notes.setAttribute('aria-label', `Private parent notes for ${subject.title}`);
      const notesLabel = node('label', 'Private parent notes'); notesLabel.append(notes);
      const save = node('button', 'Save reviewed completion'); save.type = 'button'; save.className = 'btn btn-secondary';
      save.onclick = () => void run(async () => {
        if (!pending) {
          if (!['true', 'false'].includes(decision.value)) throw Error('Choose whether this lesson is complete or needs more work.');
          pending = { button: save, input: { id: crypto.randomUUID(), studentId: loaded.student.id, subjectId: subject.id, date: loaded.date,
            revision: subject.revision, rulesRevision: loaded.rulesRevision, completed: decision.value === 'true', parentNotes: notes.value } };
        }
        freeze(); save.textContent = 'Retry this reviewed completion';
        await request('review-school', pending.input); pending = null;
        status.textContent = 'School completion saved. Refresh to view the received result.';
        try { await onApplied(); } catch { /* The exact School receipt is already saved. */ }
        await load();
      });
      row.append(decision, notesLabel, save); rows.append(row);
    }
    for (const requirement of loaded.completion.requirements) rows.append(node('p', `${requirement.module}: ${requirement.completed ? 'complete' : 'still required'}. Review its work in the original learning module.`));
    if (!loaded.subjects.length) rows.append(node('p', 'No active School subjects are assigned to this child.'));
  }
  async function load() { loaded = await request('list-school', { studentId: student.value, date: date.value }); render(); }
  refresh.onclick = () => void run(load);
  for (const control of [student, date]) control.addEventListener('change', () => { loaded = null; rows.replaceChildren(); status.textContent = 'Select Review school completion to load this child and date.'; });
  function update() {
    if (busy || pending || root.contains(document.activeElement)) return;
    const snapshot = getSnapshot(); if (!snapshot) return;
    const previous = student.value;
    student.replaceChildren(...snapshot.students.map(s => { const option = node('option', s.name + (s.archived_at ? ' (archived)' : '')); option.value = s.id; return option; }));
    if (snapshot.students.some(s => s.id === previous)) student.value = previous;
    const today = localDate(snapshot.rules.schedule?.timeZone || 'America/Chicago'); if (!date.value) date.value = today; date.max = today;
    if (loaded && student.value !== previous) { loaded = null; rows.replaceChildren(); } freeze();
  }
  return { update };
}
