import { schoolReportCsv, localDate, reportDefaults } from './cloud-records-model.js';

export function setupCloudRecords({ endpoint, getSnapshot, mutate, editor, field, selectField, node, button, setControls }) {
  const byId = id => document.getElementById(id);
  let active = '', report = null, gradePage = null, generation = 0, controller = null, initialized = false;
  const formData = kind => Object.fromEntries(new FormData(byId(`cloud-${kind}-filters`)));
  function status(kind, message) { byId(`cloud-${kind}-status`).textContent = message; }
  async function load(kind, before = null) {
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
    status('reports', `${report.start} through ${report.end} · ${report.timeZone} · ${(total / 60).toFixed(1)} minutes received${report.truncated ? ' (partial result — over 1,000 rows; narrow the filters before exporting)' : ''}. Offline work appears after the child reconnects. This is measured school time, not verified lesson completion.`);
    byId('cloud-report-export').disabled = report.truncated;
    byId('cloud-reports-results').replaceChildren(report.rows.length ? table(['Date', 'Student', 'Subject', 'Received time'], report.rows.map(row => [row.date, row.student_name, row.subject_name, `${Math.floor(row.seconds / 60)}m ${row.seconds % 60}s`])) : node('p', 'cloud-panel', 'No received school time matches these filters.'));
  }
  function renderGrades() {
    const students = getSnapshot()?.students || [];
    const rows = gradePage.grades.map(grade => {
      const student = students.find(item => item.id === grade.studentId);
      const details = node('details'); details.append(node('summary', '', grade.title));
      details.append(node('p', 'cloud-record-text', `Child feedback: ${grade.childFeedback || 'None'}`), node('p', 'cloud-record-text', `Private parent notes: ${grade.parentNotes || 'None'}`));
      const actions = node('div', 'cloud-actions');
      if (!student?.archived_at) {
        const edit = button('Edit', () => editGrade(grade)); edit.dataset.cloudMutation = 'true'; actions.append(edit);
      }
      const remove = button('Remove', async () => {
        if (!confirm(`Remove “${grade.title}” from the gradebook? Its revision history will be retained.`)) return;
        try { await mutate('remove-grade', { id: grade.id, revision: grade.revision }); await load('grades'); }
        catch (error) { status('grades', error.message); }
      }); remove.dataset.cloudMutation = 'true'; actions.append(remove);
      return [grade.date, `${student?.name || 'Student'}${student?.archived_at ? ' (archived)' : ''}`, grade.course, details, grade.category,
        `${grade.scoreEarned}/${grade.scorePossible} · ${grade.percentage}% (${grade.letterGrade})`, actions];
    });
    byId('cloud-grades-results').replaceChildren(rows.length ? table(['Date', 'Student', 'Course', 'Assignment / notes', 'Category', 'Grade', 'Actions'], rows) : node('p', 'cloud-panel', 'No grades match these filters. Add a manually reviewed grade to begin.'));
    byId('cloud-grades-older').disabled = !gradePage.hasOlder;
    status('grades', `${rows.length} grades on this page, newest entries first. Saved grades and child feedback are visible to the assigned child; private parent notes are never sent to child computers.`);
    setControls();
  }
  function editGrade(existing = null) {
    const snapshot = getSnapshot();
    const students = snapshot.students.filter(student => !student.archived_at);
    if (!students.length) { status('grades', 'Add or restore a student before entering grades.'); return; }
    const id = existing?.id || crypto.randomUUID();
    const studentField = selectField('Student', 'studentId', students.map(student => ({ value: student.id, label: student.name })), existing?.studentId || students[0].id);
    // Grade ownership is immutable. Corrections for the wrong student are a new
    // record, not a reassignment of another child's history.
    if (existing) studentField.querySelector('select').disabled = true;
    const earned = field('Points earned (or percentage)', 'scoreEarned', existing?.scoreEarned ?? '', { type: 'number' });
    const possible = field('Points possible (100 for percentage)', 'scorePossible', existing?.scorePossible ?? 100, { type: 'number' });
    for (const wrapper of [earned, possible]) { const input = wrapper.querySelector('input'); input.step = '0.1'; input.min = wrapper === possible ? '0.1' : '0'; input.max = wrapper === possible ? '10000' : '20000'; }
    const textArea = (label, name, value) => { const wrapper = node('label', '', label), input = node('textarea', 'admin-input'); input.name = name; input.maxLength = 2000; input.rows = 3; input.value = value || ''; wrapper.append(input); return wrapper; };
    editor(existing ? 'Edit Grade' : 'Add Grade', [studentField,
      field('Course name', 'course', existing?.course || '', { maxLength: 120 }),
      field('Assignment title', 'title', existing?.title || '', { maxLength: 160 }),
      field('Date', 'date', existing?.date || localDate(snapshot.rules.schedule.timeZone), { type: 'date' }),
      selectField('Category', 'category', ['Test', 'Quiz', 'Homework', 'Project', 'Classwork', 'Other'].map(value => ({ value, label: value })), existing?.category || 'Test'),
      earned, possible, textArea('Feedback visible to the child', 'childFeedback', existing?.childFeedback), textArea('Private parent notes', 'parentNotes', existing?.parentNotes),
      node('p', 'cloud-note', 'Saving publishes this manually reviewed grade to the child. Scanned papers, automated quiz capture, course weighting, and existing LAN grade history have not been transferred yet.')], async form => {
      await mutate('save-grade', { ...Object.fromEntries(form), id, revision: existing?.revision || 0, studentId: existing?.studentId || form.get('studentId'), scoreEarned: Number(form.get('scoreEarned')), scorePossible: Number(form.get('scorePossible')) });
      await load('grades');
    });
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
  byId('cloud-grades-older').addEventListener('click', () => load('grades', gradePage?.nextBefore));
  byId('cloud-report-export').addEventListener('click', () => {
    if (!report || report.truncated) return;
    const url = URL.createObjectURL(new Blob(['\uFEFF' + schoolReportCsv(report)], { type: 'text/csv;charset=utf-8' }));
    const link = node('a'); link.href = url; link.download = `BodeeGuard-school-time-${report.start}-${report.end}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return { update, setActive(value) { active = value; if (initialized && ['grades', 'reports'].includes(value)) load(value); else { ++generation; controller?.abort(); } } };
}
