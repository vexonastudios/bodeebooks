export function gradebookIcon(name) {
  const el = document.createElement('i'); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el;
}
export function gradebookIcons(root) { window.lucide?.createIcons({ root }); }
export function gradebookButton(label, icon, action, className = 'btn btn-secondary') {
  const el = document.createElement('button'); el.type = 'button'; el.className = className;
  el.append(gradebookIcon(icon), document.createTextNode(label)); el.addEventListener('click', action); return el;
}
export function createGradeEditor({ existing, paper, snapshot, selectedStudent, node, field, selectField, date, endpoint }) {
  const root = node('div', 'cloud-grade-editor'), fields = node('div', 'gradebook-grade-fields');
  const students = snapshot.students.filter(student => !student.archived_at);
  const studentField = selectField('Student', 'studentId', [{ value: '', label: 'Choose a student…' }, ...students.map(student => ({ value: student.id, label: student.name }))], existing?.studentId || paper?.studentId || selectedStudent || '');
  studentField.querySelector('select').required = true;
  if (existing || paper) studentField.querySelector('select').disabled = true;
  const title = field('Assignment title', 'title', existing?.title || '', { maxLength: 160 }); title.classList.add('gradebook-wide');
  const course = field('Subject / course', 'course', existing?.course || '', { maxLength: 120 });
  const assignmentDate = field('Assignment date', 'date', existing?.date || date, { type: 'date' });
  const earned = field('Points earned', 'scoreEarned', existing?.scoreEarned ?? '', { type: 'number' });
  const possible = field('Points possible', 'scorePossible', existing?.scorePossible ?? 100, { type: 'number' });
  for (const wrapper of [earned, possible]) { const input = wrapper.querySelector('input'); input.step = '0.1'; input.min = wrapper === possible ? '0.1' : '0'; input.max = wrapper === possible ? '10000' : '20000'; }
  const score = node('div', 'gradebook-score-preview'); score.setAttribute('role', 'status');
  function scorePreview() {
    const e = earned.querySelector('input'), p = possible.querySelector('input'), percent = Number(e.value) / Number(p.value) * 100;
    score.textContent = e.value !== '' && p.value !== '' && Number(p.value) > 0 && percent >= 0 && percent <= 200 ? `${Math.round(percent * 10) / 10}% · ${percent >= 90 ? 'A' : percent >= 80 ? 'B' : percent >= 70 ? 'C' : percent >= 60 ? 'D' : 'F'}` : 'Enter points, or use a percentage out of 100.';
  }
  fields.addEventListener('input', scorePreview); scorePreview();
  const notes = node('details', 'gradebook-notes'); notes.append(node('summary', '', 'Feedback & private notes'));
  for (const [label, name] of [['Feedback the student can see', 'childFeedback'], ['Private parent notes', 'parentNotes']]) {
    const wrapper = node('label', '', label), input = node('textarea', 'admin-input'); input.name = name; input.maxLength = 2000; input.rows = 3; input.value = existing?.[name] || ''; wrapper.append(input); notes.append(wrapper);
  }
  fields.append(studentField, course, title, assignmentDate, selectField('Type of work', 'category', ['Test','Quiz','Homework','Project','Classwork','Other'].map(value => ({ value, label: value })), existing?.category || 'Test'), earned, possible, score, notes);
  const publishNote = node('p', 'cloud-note gradebook-wide', 'Review the details before saving. The student can see the saved grade and feedback; parent notes stay private.'); fields.append(publishNote);
  let objectUrl = null, disposed = false;
  const dispose = () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  if (paper) {
    const preview = node('aside', 'gradebook-paper-view');
    preview.append(node('h3', '', paper.name));
    const uploaded = new Date(paper.createdAt);
    preview.append(node('p', '', `Added ${Number.isFinite(uploaded.valueOf()) ? uploaded.toLocaleString() : 'to your papers'} · Original paper kept with this grade.`));
    const stage = node('div', 'gradebook-paper-stage', 'Loading paper…'), actions = node('div', 'cloud-actions'); preview.append(stage, actions); root.append(preview);
    async function loadPaper() {
      stage.textContent = 'Loading paper…'; actions.replaceChildren();
      try {
        const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(28000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read-file', id: paper.id }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Paper unavailable.');
        if (disposed) return;
        if (data.file?.id !== paper.id || !['image/png','image/jpeg','image/webp','application/pdf'].includes(data.file.mime) || typeof data.data !== 'string' || data.data.length > 2800000) throw new Error('The paper preview could not be verified.');
        const bytes = Uint8Array.from(atob(data.data), char => char.charCodeAt(0));
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: data.file.mime }));
        stage.replaceChildren();
        if (data.file.mime.startsWith('image/')) {
          const image = node('img'); image.src = objectUrl; image.alt = 'Original school paper'; image.style.transform = `rotate(${[0,90,180,270].includes(paper.rotation) ? paper.rotation : 0}deg)`; stage.append(image);
          actions.append(gradebookButton('Zoom', 'zoom-in', () => { stage.dataset.zoom = stage.dataset.zoom !== 'true'; }));
        } else stage.append(node('p', '', 'PDF paper saved. Open a copy to compare it with the grade.'));
        const download = node('a', 'btn btn-secondary', 'Download paper'); download.href = objectUrl; download.download = paper.name; download.prepend(gradebookIcon('download')); actions.append(download); gradebookIcons(root);
      } catch (error) { if (!disposed) { stage.textContent = error.message; actions.append(gradebookButton('Retry preview', 'refresh-cw', loadPaper)); gradebookIcons(root); } }
    }
    void loadPaper();
  }
  root.append(fields);
  return { root, fields, notes, dispose, scorePreview };
}
