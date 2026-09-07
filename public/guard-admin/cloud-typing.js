const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]);
function courseMarkup(data) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:18px;">
        ${data.students.map(row => {
          const eligible = row.settings.course_eligible;
          const percent = eligible ? Math.round((row.mastered_count / row.total_lessons) * 100) : 0;
          const status = !eligible ? 'Speed Test only' : row.course_completed ? 'Home Row Graduate' : row.current_lesson.shortTitle;
          const count = eligible ? `${row.mastered_count}/${row.total_lessons}` : 'Speed Test';
          return `<div style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:13px;background:rgba(255,255,255,0.035);">
            <div style="display:flex;align-items:center;gap:9px;">
              👤
              <div><strong style="font-size:14px;">${esc(row.student.name)}</strong><div style="font-size:11px;color:var(--text-muted);">Grade ${esc(row.student.grade || 'Not set')}</div></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:12px;font-size:12px;"><span>${status}</span><strong>${count}</strong></div>
            <div style="height:5px;border-radius:9px;background:rgba(255,255,255,0.08);overflow:hidden;margin-top:7px;"><div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#8b5cf6,#38bdf8);"></div></div>
            <div style="font-size:11px;margin-top:8px;color:${eligible && row.practiced_today ? '#34d399' : 'var(--text-muted)'};">${eligible ? (row.practiced_today ? '✓ Practiced today' : 'Not practiced today') : 'Beginner course hidden'}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="padding:16px;border-radius:13px;background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.16);">
        <div style="display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(120px,.8fr) minmax(170px,1.2fr);gap:12px;align-items:end;">
          <div class="form-group"><label>Student controls</label><select id="typing-course-student" class="admin-select">${data.students.map(row => `<option value="${row.student.id}">${esc(row.student.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label>Daily lesson</label><select id="typing-course-goal" class="admin-select"><option value="3">3 minutes</option><option value="5">5 minutes</option><option value="8">8 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></div>
          <div class="form-group"><label>Starting lesson</label><select id="typing-course-start" class="admin-select">${data.lesson_options.map(lesson => `<option value="${lesson.id}">${lesson.order}. ${esc(lesson.title)}</option>`).join('')}</select></div>
        </div>
        <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:12px;">
          <label style="display:flex;gap:7px;align-items:center;font-size:13px;"><input type="checkbox" id="typing-course-enabled"> Guided course enabled (grades K–5)</label>
          <label style="display:flex;gap:7px;align-items:center;font-size:13px;"><input type="checkbox" id="typing-course-voice"> Teaching voice enabled</label>
          <button class="btn btn-primary" id="typing-course-save" style="margin-left:auto;">Save Typing Settings</button>
          <button class="btn btn-danger" id="typing-course-reset">Reset Lesson Progress</button>
        </div>
      </div>`;
}

export function setupCloudTyping({ endpoint, mutate, editor, node, button }) {
  const el = id => document.getElementById(id);
  let active = false, students = [], rows = [], generation = 0, loading = false, dirty = false, saving = false, offset = 0, pendingCommand = null;
  const notice = node('p', 'settings-hint'); notice.setAttribute('role', 'status');
  el('econ-typing-course-progress').before(notice);
  async function read(studentId, page = 0) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-typing', studentId, offset: page }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Typing could not connect.'); return data;
  }
  function history(data) {
    const wrap = el('econ-typing-history'), table = node('table'); table.style.width = '100%';
    const header = node('tr'); for (const value of ['Date / Time', 'Lesson or mode', 'WPM', 'Accuracy', 'Duration', 'Coins']) header.append(node('th', '', value)); table.append(header);
    for (const record of data.history.slice(0, 50)) {
      const row = node('tr');
      for (const value of [new Date(record.created_at).toLocaleString(), record.lesson_id || record.mode, record.kind === 'speed' ? record.wpm : record.mastered ? 'Mastered' : 'Practice', `${record.accuracy}%`, `${record.duration_seconds}s`, record.coins_earned]) row.append(node('td', '', String(value)));
      table.append(row);
    }
    wrap.replaceChildren(data.history.length ? table : node('p', '', 'No cloud typing sessions yet. Earlier history still awaits transfer.'));
    if (offset) wrap.append(button('Newer typing sessions', () => { offset = Math.max(0, offset - 50); void loadHistory(); }));
    if (data.history.length > 50) wrap.append(button('Older typing sessions', () => { offset += 50; void loadHistory(); }));
  }
  async function loadHistory() {
    const epoch = ++generation, studentId = el('econ-typing-sel').value;
    try { const data = await read(studentId, offset); if (active && epoch === generation && studentId === el('econ-typing-sel').value) history(data); }
    catch (error) { if (active && epoch === generation) notice.textContent = error.message; }
  }
  function render() {
    if (!rows.length) { el('econ-typing-course-progress').textContent = 'Add a student to use Typing School.'; return; }
    const data = { students: rows, lesson_options: rows[0].lessons };
    el('econ-typing-course-progress').innerHTML = courseMarkup(data);
    const select = el('typing-course-student'), formFields = ['typing-course-student', 'typing-course-goal', 'typing-course-start', 'typing-course-enabled', 'typing-course-voice'];
    function sync() {
      const row = rows.find(item => item.studentId === select.value);
      if (![...el('typing-course-goal').options].some(option => Number(option.value) === row.settings.daily_goal_minutes)) {
        const option = node('option', '', `${row.settings.daily_goal_minutes} minutes`); option.value = row.settings.daily_goal_minutes; el('typing-course-goal').append(option);
      }
      for (const [id, key] of [['typing-course-goal','daily_goal_minutes'], ['typing-course-start','starting_lesson_id']]) el(id).value = row.settings[key];
      el('typing-course-enabled').checked = row.settings.course_enabled; el('typing-course-voice').checked = row.settings.voice_enabled;
      el('typing-course-enabled').disabled = !row.settings.course_eligible;
    }
    select.addEventListener('change', sync); sync();
    for (const id of formFields) el(id).addEventListener('change', () => { dirty = true; });
    el('typing-course-save').addEventListener('click', async () => {
      if (saving) return;
      const row = rows.find(item => item.studentId === select.value);
      pendingCommand ||= { id: crypto.randomUUID(), kind: 'settings', studentId: row.studentId, revision: row.settings.revision,
        course_enabled: el('typing-course-enabled').checked, voice_enabled: el('typing-course-voice').checked,
        daily_goal_minutes: Number(el('typing-course-goal').value), starting_lesson_id: el('typing-course-start').value };
      saving = true; el('typing-course-save').disabled = true;
      for (const id of formFields) el(id).disabled = true; el('typing-course-reset').disabled = true;
      try { await mutate('typing-command', pendingCommand); pendingCommand = null; dirty = false; notice.textContent = 'Typing settings saved.'; }
      catch (error) { notice.textContent = `${error.message} Save again to retry the same settings.`; }
      finally { saving = false; el('typing-course-save').disabled = false; }
      if (!pendingCommand) await load();
    });
    el('typing-course-reset').addEventListener('click', () => {
      if (saving || pendingCommand) return;
      const row = rows.find(item => item.studentId === select.value), id = crypto.randomUUID();
      editor(`Reset ${row.student.name}’s lesson progress`, [node('p', '', 'Start the guided course again. All attempt history, speed scores, and previously awarded coins stay saved. The daily coin limit still applies.')], async () => {
        await mutate('typing-command', { studentId: row.studentId, id, kind: 'reset', revision: row.settings.revision }); dirty = false; await load();
      });
    });
    el('econ-typing-stats').replaceChildren(...rows[0].stats.map(record => {
      const card = node('div', 'cloud-panel'); card.append(node('strong', '', record.student_name), node('p', '', `${record.best_wpm} best WPM · ${record.avg_wpm} average WPM · ${record.total_sessions} cloud sessions`)); return card;
    }));
    const selected = el('econ-typing-sel').value;
    el('econ-typing-sel').replaceChildren(...rows.map(row => { const option = node('option', '', row.student.name); option.value = row.studentId; return option; }));
    el('econ-typing-sel').value = rows.some(row => row.studentId === selected) ? selected : rows[0].studentId;
    offset = 0; history(rows.find(row => row.studentId === el('econ-typing-sel').value));
  }
  async function load() {
    if (!active || loading || saving || dirty || pendingCommand) return;
    const epoch = ++generation; loading = true;
    try {
      const result = [];
      // Bound concurrent family reads; each response carries one child's page.
      for (let i = 0; i < students.length; i += 3) result.push(...await Promise.all(students.slice(i, i + 3).map(student => read(student.id))));
      if (!active || epoch !== generation || dirty) return;
      rows = result; render(); notice.textContent = 'Guided lessons and speed tests share a daily limit of five coins. Earlier typing history still awaits transfer.';
    } catch (error) { if (active && epoch === generation) notice.textContent = error.message; }
    finally { loading = false; }
  }
  el('econ-typing-sel').addEventListener('change', () => { offset = 0; void loadHistory(); });
  el('cloud-economy-refresh').addEventListener('click', () => { if (!dirty && !pendingCommand) void load(); });
  return { update(value) { students = value.filter(student => !student.archived_at); if (active && !rows.length) void load(); }, setActive(value) { active = value; generation++; if (value) void load(); } };
}
