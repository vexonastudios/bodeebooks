import { schoolReportCsv, localDate, reportDefaults } from './cloud-records-model.js';
import { createGradeEditor, gradebookIcon, gradebookIcons, gradebookButton } from './cloud-grade-editor.js';
import { addGradeScan } from './cloud-grade-scan.js';

export function setupCloudRecords({ endpoint, getSnapshot, mutate, editor, field, selectField, node, button, setControls, onStudentChange = () => {}, onGradeSaved = () => {} }) {
  const byId = id => document.getElementById(id);
  let active = '', report = null, gradePage = null, generation = 0, controller = null, initialized = false;
  const formData = kind => Object.fromEntries(new FormData(byId(`cloud-${kind}-filters`)));
  function status(kind, message) { byId(`cloud-${kind}-status`).textContent = message; }
  async function load(kind, before = null) {
    if (kind === 'grades') {
      const filters = formData(kind);
      if (Boolean(filters.start) !== Boolean(filters.end)) { status(kind, 'Choose both a From and Through date, or clear the dates to see all grades.'); return; }
    }
    controller?.abort(); controller = new AbortController();
    const currentController = controller;
    const turn = ++generation, timeout = setTimeout(() => currentController.abort(), 15000);
    byId(`cloud-${kind}-results`).replaceChildren();
    if (kind === 'reports') { report = null; byId('cloud-report-export').disabled = true; }
    else { gradePage = null; byId('cloud-grades-older').disabled = true; }
    status(kind, 'Loading saved cloud records…');
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: kind === 'grades' ? 'list-grades' : 'school-report', ...formData(kind), before }) });
      const data = await response.json();
      if (turn !== generation) return;
      if (!response.ok) throw new Error(data.error || 'School records could not load.');
      if (kind === 'reports') { report = data; renderReport(); }
      else { gradePage = data; renderGrades(); }
    } catch (error) {
      if (turn === generation) status(kind, `${error.name === 'AbortError' ? 'The request timed out.' : error.message} Your saved records have not been removed. Try Refresh.`);
    } finally { clearTimeout(timeout); }
  }
  function table(headings, rows) {
    const wrap = node('div', 'cloud-table-wrap'), result = node('table'), head = node('thead'), tr = node('tr'), body = node('tbody');
    headings.forEach(text => { const th = node('th', '', text); th.scope = 'col'; tr.append(th); });
    head.append(tr); result.append(head, body); wrap.append(result);
    for (const cells of rows) { const row = node('tr'); for (const value of cells) { const cell = node('td'); if (value instanceof Node) cell.append(value); else cell.textContent = String(value); row.append(cell); } body.append(row); }
    return wrap;
  }
  function renderReport() {
    const total = report.rows.reduce((sum, row) => sum + row.seconds, 0);
    status('reports', `${report.start} through ${report.end} · ${report.timeZone} · ${(total / 60).toFixed(1)} minutes received${report.truncated ? ' (partial result — over 1,000 rows; narrow the filters before exporting)' : ''}. Offline work appears after the child reconnects. ${report.rows.some(row => row.includes_lan_history) ? 'Includes imported original time, counted once per subject and day. ' : ''}Lesson completion is reviewed separately.`);
    byId('cloud-report-export').disabled = report.truncated;
    byId('cloud-reports-results').replaceChildren(report.rows.length ? table(['Date', 'Student', 'Subject', 'Received time'], report.rows.map(row => [row.date, row.student_name, row.subject_name, `${Math.floor(row.seconds / 60)}m ${row.seconds % 60}s`])) : node('p', 'cloud-panel', 'No received school time matches these filters.'));
  }
  function renderGrades() {
    const students = getSnapshot()?.students || [];
    const rows = gradePage.grades.map(grade => {
      const student = students.find(item => item.id === grade.studentId);
      const details = node('details'); details.append(node('summary', '', grade.title));
      details.append(node('p', 'cloud-record-text', `Child feedback: ${grade.childFeedback || 'None'}`), node('p', 'cloud-record-text', `Private parent notes: ${grade.parentNotes || 'None'}`));
      const assignment = node('div'); assignment.append(details, node('p', 'gradebook-cell-meta', `${grade.course} · ${grade.date}`), node('span', 'gradebook-category', grade.category));
      const actions = node('div', 'cloud-actions');
      if (!student?.archived_at) {
        const edit = gradebookButton('Edit', 'pencil', () => editGrade(grade)); edit.dataset.cloudMutation = 'true'; actions.append(edit);
      }
      const remove = button('Remove', async () => {
        if (!confirm(`Remove “${grade.title}” from the gradebook? Its revision history will be retained.`)) return;
        try { await mutate('remove-grade', { id: grade.id, revision: grade.revision }); await load('grades'); }
        catch (error) { status('grades', error.message); }
      }); remove.dataset.cloudMutation = 'true'; remove.classList.add('gradebook-remove'); remove.prepend(gradebookIcon('trash-2')); actions.append(remove);
      const score = node('div', 'gradebook-score'); score.dataset.letter = grade.letterGrade;
      score.append(node('strong', '', `${grade.percentage}% · ${grade.letterGrade}`), node('span', '', `${grade.scoreEarned}/${grade.scorePossible} points`));
      return [assignment, `${student?.name || 'Student'}${student?.archived_at ? ' (archived)' : ''}`, score, actions];
    });
    const empty = node('div', 'gradebook-empty');
    empty.append(gradebookIcon('notebook-pen'), node('h3', '', 'Ready for your first grade'), node('p', '', 'Scan a school paper or enter a score yourself. Each grade stays organized by student, subject and date.'));
    const filtered = Boolean(formData('grades').studentId || formData('grades').start || formData('grades').end);
    if (filtered) { empty.querySelector('h3').textContent = 'No grades for these filters'; empty.querySelector('p').textContent = 'Choose another student or date range, or add a grade for this student.'; }
    const emptyActions = node('div', 'cloud-actions'); emptyActions.append(gradebookButton('Add grade', 'plus', () => editGrade()), gradebookButton('Scan a paper', 'scan-line', () => byId('cloud-scan-paper').click())); empty.append(emptyActions);
    byId('cloud-grades-results').replaceChildren(rows.length ? table(['Assignment', 'Student', 'Grade', ''], rows) : empty);
    if (byId('cloud-grade-count')) byId('cloud-grade-count').textContent = `${rows.length}${gradePage.hasOlder ? '+' : ''} on this page`;
    byId('cloud-grades-older').disabled = !gradePage.hasOlder;
    status('grades', `${rows.length} grades on this page · Newest first. Private parent notes stay private.`);
    gradebookIcons(byId('tab-grades'));
    setControls();
  }
  function editGrade(existing = null, paper = null) {
    const snapshot = getSnapshot();
    const students = snapshot.students.filter(student => !student.archived_at);
    if (!students.length) { status('grades', 'Add or restore a student before entering grades.'); return; }
    const id = existing?.id || crypto.randomUUID();
    const view = createGradeEditor({ existing, paper, snapshot, selectedStudent: formData('grades').studentId, node, field, selectField, date: localDate(snapshot.rules.schedule.timeZone), endpoint });
    if (paper) addGradeScan({ ...view, paper, endpoint, node });
    let revision = existing?.revision || 0, savedPayload = null;
    editor(existing ? 'Edit grade' : paper ? 'Review paper & grade' : 'Add grade', [view.root], async form => {
      const payload = { ...Object.fromEntries(form), id, revision, studentId: existing?.studentId || paper?.studentId || form.get('studentId'), scoreEarned: Number(form.get('scoreEarned')), scorePossible: Number(form.get('scorePossible')) };
      // A saved grade is not lost if its paper link needs a retry. Keep the
      // returned revision so a parent can correct their draft and retry safely.
      if (JSON.stringify(payload) !== savedPayload) {
        const saved = await mutate('save-grade', payload); revision = saved.revision;
        savedPayload = JSON.stringify({ ...payload, revision });
      }
      if (paper) {
        try { await mutate('review-file', { id: paper.id, rotation: paper.rotation || 0, reviewed: true, gradeId: id }); }
        catch { throw new Error('Your grade was saved. The paper link could not finish; select Save again to retry without creating a duplicate grade.'); }
      }
      await load('grades'); onGradeSaved();
    });
    byId('cloud-editor').addEventListener('close', view.dispose, { once: true });
    gradebookIcons(view.root);
  }
  function fillSelect(select, choices) {
    const old = select.value;
    select.replaceChildren(...choices.map(({ value, label }) => { const option = node('option', '', label); option.value = value; return option; }));
    if (choices.some(choice => choice.value === old)) select.value = old;
  }
  function update() {
    const snapshot = getSnapshot(); if (!snapshot) return;
    for (const kind of ['grades', 'reports']) {
      const select = byId(`cloud-${kind}-filters`).elements.studentId;
      if (select !== document.activeElement) fillSelect(select, [{ value: '', label: 'All students' }, ...snapshot.students.map(student => ({ value: student.id, label: `${student.name}${student.archived_at ? ' (archived)' : ''}` }))]);
    }
    const subjects = byId('cloud-reports-filters').elements.subjectId;
    if (subjects !== document.activeElement) fillSelect(subjects, [{ value: '', label: 'All subjects' }, ...snapshot.rules.subjects.map(subject => ({ value: subject.id, label: subject.title }))]);
    if (!initialized) {
      const defaults = reportDefaults(snapshot.rules.schedule.timeZone);
      for (const [name, value] of Object.entries(defaults)) byId('cloud-reports-filters').elements[name].value = value;
      initialized = true;
      if (['grades', 'reports'].includes(active)) load(active);
    }
  }
  for (const kind of ['grades', 'reports']) {
    byId(`cloud-${kind}-filters`).addEventListener('submit', event => { event.preventDefault(); load(kind); });
    byId(`cloud-${kind}-filters`).addEventListener('input', () => {
      ++generation; controller?.abort();
      if (kind === 'reports') { report = null; byId('cloud-report-export').disabled = true; }
      else { gradePage = null; byId('cloud-grades-older').disabled = true; }
      byId(`cloud-${kind}-results`).replaceChildren(); status(kind, 'Filters changed. Select Refresh to load matching records.');
    });
  }
  byId('cloud-add-grade').addEventListener('click', () => editGrade());
  byId('cloud-grades-filters').elements.studentId.addEventListener('change', () => { onStudentChange(formData('grades').studentId); load('grades'); });
  byId('cloud-grades-clear')?.addEventListener('click', () => { for (const name of ['start','end']) byId('cloud-grades-filters').elements[name].value = ''; load('grades'); });
  byId('cloud-grades-older').addEventListener('click', () => load('grades', gradePage?.nextBefore));
  byId('cloud-report-export').addEventListener('click', () => {
    if (!report || report.truncated) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF' + schoolReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
    const link = node('a'); link.href = url; link.download = `BodeeGuard-school-time-${report.start}-${report.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return { update, gradePaper: paper => editGrade(null, paper), setActive(value) { active = value; if (initialized && ['grades', 'reports'].includes(value)) load(value); else { ++generation; controller?.abort(); } } };
}
