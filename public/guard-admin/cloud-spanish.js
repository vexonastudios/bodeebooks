export function setupCloudSpanish({ endpoint, getSnapshot }) {
  const root = document.getElementById('cloud-spanish-reports');
  const node = (tag, text = '') => { const el = document.createElement(tag); el.textContent = text; return el; };
  const selector = node('select'), refresh = node('button', 'Refresh Spanish progress'), status = node('p'), content = node('div');
  selector.className = 'admin-select'; selector.setAttribute('aria-label', 'Spanish student');
  refresh.className = 'btn btn-secondary'; status.setAttribute('role', 'status');
  const toolbar = node('div'); toolbar.className = 'cloud-report-toolbar'; toolbar.append(selector, refresh);
  root.append(node('h2', 'Spanish'), toolbar, status, content);
  let active = false, generation = 0;
  function update() {
    const selected = selector.value;
    selector.replaceChildren(...(getSnapshot()?.students || []).filter(child => !child.archived).map(child => { const option = node('option', child.name); option.value = child.id; return option; }));
    if ([...selector.options].some(option => option.value === selected)) selector.value = selected;
  }
  async function load() {
    const epoch = ++generation;
    if (!active || !selector.value) { content.replaceChildren(); status.textContent = 'Choose a child to see Spanish progress.'; return; }
    refresh.disabled = true; status.textContent = 'Loading saved Spanish progress…';
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-spanish', studentId: selector.value }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Spanish progress could not load');
      if (!active || epoch !== generation) return;
      content.replaceChildren();
      content.append(node('p', `${data.stats.total_xp} Spanish XP · ${data.stats.streak} day streak · ${data.stats.words_learned}/${data.stats.total_words} words learned · ${data.stats.words_mastered} mastered · ${data.stats.words_practiced_today} practiced today`));
      const table = node('table'); table.className = 'admin-table';
      const header = node('tr'); for (const label of ['Lesson', 'Status', 'Best accuracy']) header.append(node('th', label)); table.append(header);
      for (const lesson of data.lessons) { const row = node('tr'); row.append(node('td', lesson.title), node('td', lesson.completed_today ? 'Completed today' : lesson.completed ? 'Completed' : lesson.locked ? 'Upcoming' : 'Ready'), node('td', lesson.completed ? Math.round(lesson.best_accuracy * 100) + '%' : '—')); table.append(row); }
      content.append(table);
      status.textContent = 'Showing saved Spanish progress.';
    } catch (error) { if (active && epoch === generation) { content.replaceChildren(); status.textContent = error.message; } }
    finally { if (epoch === generation) refresh.disabled = false; }
  }
  selector.onchange = load; refresh.onclick = load;
  return { update, setActive(value) { active = value; generation++; if (value) { update(); void load(); } } };
}
