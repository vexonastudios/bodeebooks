/* global document, fetch, AbortSignal */
export function setupCloudReading({ endpoint, getSnapshot }) {
  const root = document.getElementById('cloud-reading-reports');
  const node = (tag, text = '') => { const element = document.createElement(tag); element.textContent = text; return element; };
  const selector = node('select'), status = node('p'), wallet = node('p'), books = node('div'), history = node('div');
  selector.setAttribute('aria-label', 'Reading student');
  const refresh = node('button', 'Refresh reading'); refresh.className = 'btn btn-secondary'; refresh.type = 'button';
  root.append(node('h2', 'Reading logs & completion coins'), selector, refresh, status, wallet, books, history);
  let active = false, generation = 0, busy = false, historyGeneration = 0;
  async function request(action, input) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, action }) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || 'Reading could not connect.');
    return value;
  }
  const current = (student, epoch) => active && student === selector.value && epoch === generation;
  async function sessions(book, offset = 0) {
    const studentId = selector.value, epoch = generation, historyEpoch = ++historyGeneration;
    try {
      const value = await request('reading-history', { studentId, bookId: book.id, offset });
      if (!current(studentId, epoch) || historyEpoch !== historyGeneration) return;
      history.replaceChildren(node('h3', `${book.title} — reading sessions`));
      for (const entry of value.sessions.slice(0, 50)) history.append(node('p', `${new Date(entry.created_at).toLocaleString()} · ${entry.pages_read} pages${entry.note ? ` · ${entry.note}` : ''}`));
      if (!value.sessions.length) history.append(node('p', 'No cloud reading sessions recorded.'));
      for (const [label, next] of [['Newer sessions', offset - 50], ['Older sessions', offset + 50]]) {
        if (next < 0 || next > offset && value.sessions.length <= 50) continue;
        const button = node('button', label); button.className = 'btn btn-secondary'; button.type = 'button';
        button.addEventListener('click', () => sessions(book, next)); history.append(button);
      }
    } catch (error) { if (current(studentId, epoch) && historyEpoch === historyGeneration) { history.replaceChildren(); status.textContent = error.message; } }
  }
  async function load() {
    if (!active || !selector.value || busy) return;
    const studentId = selector.value, epoch = generation;
    busy = true; refresh.disabled = true; historyGeneration++; books.replaceChildren(); history.replaceChildren(); wallet.textContent = '';
    try {
      const value = await request('list-reading', { studentId });
      if (!current(studentId, epoch)) return;
      status.textContent = 'Cloud reading records. Earlier LAN history has not been imported.';
      wallet.textContent = value.wallet.initialized ? `${value.wallet.balance} coins available · ${value.wallet.totalEarned} earned in total` : `${value.wallet.cloudEarned} coins earned in cloud Reading. Earlier wallet balance awaits reconciliation.`;
      if (!value.books.length) books.append(node('p', 'No cloud books recorded for this child.'));
      for (const book of value.books) {
        const row = node('div'); row.className = 'cloud-panel';
        row.append(node('h3', `${book.emoji} ${book.title}`), node('p', `${book.author || 'Author not recorded'} · ${book.pages_read}${book.total_pages ? ` / ${book.total_pages}` : ''} pages · ${book.status}`));
        const button = node('button', 'View reading sessions'); button.className = 'btn btn-secondary'; button.type = 'button';
        button.addEventListener('click', () => sessions(book)); row.append(button); books.append(row);
      }
    } catch (error) { if (current(studentId, epoch)) status.textContent = error.message; }
    finally { busy = false; refresh.disabled = false; if (active && (selector.value !== studentId || generation !== epoch)) void load(); }
  }
  function update() {
    const options = (getSnapshot()?.students || []).filter(student => !student.archived_at);
    const key = JSON.stringify(options.map(student => [student.id, student.name]));
    if (key === selector.dataset.options) return;
    const selected = selector.value;
    selector.replaceChildren(...options.map(student => { const option = node('option', student.name); option.value = student.id; return option; }));
    if (options.some(student => student.id === selected)) selector.value = selected;
    selector.dataset.options = key;
    if (selected !== selector.value) { generation++; books.replaceChildren(); history.replaceChildren(); wallet.textContent = ''; if (active) void load(); }
  }
  selector.addEventListener('change', () => { generation++; books.replaceChildren(); history.replaceChildren(); wallet.textContent = ''; void load(); });
  refresh.addEventListener('click', load);
  return { update, setActive(value) { active = value; generation++; if (value) { update(); void load(); } else { books.replaceChildren(); history.replaceChildren(); wallet.textContent = ''; } } };
}
