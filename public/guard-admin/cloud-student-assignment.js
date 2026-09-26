// A selected name is a draft until the parent explicitly saves it.
export function createStudentAssignment({ device: initialDevice, students: initialStudents, mutate, canEdit, setControls, onSaved, document: doc = document }) {
  const el = (tag, cls = '', text = '') => { const item = doc.createElement(tag); item.className = cls; item.textContent = text; return item; };
  let device = initialDevice, students = initialStudents, dirty = false, saving = false, saved = initialDevice.student_id && Number(initialDevice.revision) > Number(initialDevice.acknowledged_revision || 0) ? { studentId: initialDevice.student_id, revision: Number(initialDevice.revision) } : null, error = '', optionsKey = '';
  const root = el('div', 'cloud-student-assignment'), label = el('label', '', 'Student using this computer');
  const select = el('select', 'admin-input'); select.id = `student-assignment-${device.id}`; label.htmlFor = select.id;
  select.setAttribute('aria-label', `Student for ${device.computer_name}`); // Changing this field edits a draft, so background reads must not disable it.
  const actions = el('div', 'cloud-assignment-actions'), save = el('button', 'btn btn-primary'), cancel = el('button', 'btn btn-secondary', 'Cancel');
  save.type = cancel.type = 'button'; save.dataset.cloudMutation = cancel.dataset.cloudMutation = 'true';
  const icon = el('i'); icon.dataset.lucide = 'save'; icon.setAttribute('aria-hidden', 'true');
  const caption = el('span', '', 'Save student'); save.append(icon, caption); actions.append(save, cancel);
  const message = el('p', 'cloud-assignment-status'); message.id = `student-assignment-status-${device.id}`;
  message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); select.setAttribute('aria-describedby', message.id);
  root.append(label, select, actions, message);
  const name = id => students.find(child => child.id === id)?.name || 'this student';
  function render() {
    const pending = !!saved && !(device.student_id === saved.studentId && Number(device.acknowledged_revision || 0) >= saved.revision);
    save.dataset.actionPending = String(saving || !dirty);
    cancel.dataset.actionPending = String(saving); select.dataset.actionPending = String(saving);
    save.disabled = saving || !dirty || !canEdit(); select.disabled = saving; cancel.disabled = saving || !canEdit();
    cancel.hidden = !dirty; caption.textContent = saving ? 'Saving student…' : 'Save student';
    save.setAttribute('aria-busy', String(saving));
    let text, state;
    if (saving) { text = 'Saving this student assignment…'; state = 'saving'; }
    else if (error) { text = error; state = 'error'; }
    else if (dirty) { text = 'Not saved yet. Choose Save student to send this change.'; state = 'draft'; }
    else if (saved) {
      text = pending ? (saved.studentId ? `Saved for ${name(saved.studentId)}. Waiting for this computer to confirm.` : 'Student removed. Waiting for this computer to confirm.')
        : (saved.studentId ? `Confirmed on this computer: ${name(saved.studentId)}.` : 'Confirmed: no student is assigned to this computer.');
      state = pending ? 'waiting' : 'confirmed';
      if (pending) text += ' Keep BodeeGuard open and connected on the child’s computer. This page checks automatically after saving.';
    } else {
      text = device.student_id ? `Saved student: ${name(device.student_id)}.` : 'Choose a student, then select Save student.'; state = 'saved';
    }
    if (message.textContent !== text) message.textContent = text;
    message.dataset.state = state;
  }
  function update(nextDevice, nextStudents) {
    // A read that began before Save must not roll the displayed assignment back.
    if (!saved || Number(nextDevice.revision) >= saved.revision) device = nextDevice;
    students = nextStudents;
    const options = [{ id: '', name: 'No student assigned' }, ...students.filter(child => !child.archived_at)];
    // Keep the same select and option nodes during status checks, including focus.
    const key = JSON.stringify(options.map(child => [child.id, child.name]));
    if (key !== optionsKey && !saving && !dirty) {
      optionsKey = key; select.replaceChildren(...options.map(child => { const option = el('option', '', child.name); option.value = child.id; return option; }));
    }
    if (saved && Number(device.revision) >= saved.revision && (device.student_id || null) !== saved.studentId) {
      saved = null; error = 'This computer’s student was changed elsewhere. Review the saved student before making another change.';
    }
    if (!dirty && !saving) select.value = device.student_id || '';
    render();
  }
  select.addEventListener('change', () => { dirty = select.value !== (device.student_id || ''); error = ''; render(); setControls(); });
  cancel.addEventListener('click', () => { dirty = false; error = ''; update(device, students); setControls(); });
  save.addEventListener('click', async () => {
    if (saving || !dirty || !canEdit()) return;
    const studentId = select.value || null;
    saving = true; error = ''; render(); setControls();
    try {
      const result = await mutate('assign-student', { deviceId: device.id, studentId });
      saved = { studentId, revision: Number(result.revision) }; dirty = false;
      device = { ...device, student_id: studentId, revision: Math.max(Number(device.revision) || 0, saved.revision) };
      onSaved();
    } catch (failure) { error = failure.message || 'The student assignment could not be saved. Your selection is still here.'; }
    finally { saving = false; render(); setControls(); }
  });
  update(device, students);
  return { element: root, update, hasPending: () => !!saved && (device.student_id !== saved.studentId || Number(device.acknowledged_revision || 0) < saved.revision) };
}

// Only a short burst of confirmation reads follows a save. These reads do not
// wake computers or keep loading family history while the parent page is hidden.
export function createAssignmentConfirmation({ refresh, hasPending, document: doc = document, window: win = window, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const delays = [3000, 7000, 20000, 30000];
  let timer = null, generation = 0;
  function stop() { generation++; clearTimer(timer); timer = null; }
  function start() {
    stop(); if (doc.hidden || !hasPending()) return;
    const run = generation;
    function next(index) {
      if (run !== generation || doc.hidden || !hasPending() || index >= delays.length) return;
      timer = setTimer(async () => {
        timer = null; if (run !== generation || doc.hidden) return;
        try { await refresh(); } catch { /* Saved state remains; normal dashboard errors explain reconnection. */ }
        next(index + 1);
      }, delays[index]);
    }
    next(0);
  }
  const visibility = () => doc.hidden ? stop() : start();
  doc.addEventListener('visibilitychange', visibility); win.addEventListener('pagehide', stop); win.addEventListener('pageshow', start);
  return { start, stop };
}
