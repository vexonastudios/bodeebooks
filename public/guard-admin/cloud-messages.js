// Existing Admin conversation layout, with only the cloud transport replaced.
export function setupCloudMessages({ endpoint }) {
  const el = id => document.getElementById(id);
  let students = [];
  let selected = null;
  let active = false;
  let page = null;
  let older = [];
  let cursor;
  let generation = 0;
  let timer = null;
  let loading = false;
  let sending = false;
  let failures = 0;
  let error = '';
  const drafts = new Map();
  const pending = new Map();
  function note(text) { el('messages-cloud-status').textContent = text; }
  async function request(action, input) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const value = await response.json();
    if (!response.ok) {
      const failure = new Error(response.status === 401 ? 'Sign in again to open messages.' : value.error || 'Messages could not sync.');
      failure.status = response.status;
      throw failure;
    }
    return value;
  }
  function controls() {
    el('messages-reply-input').disabled = !selected || sending || pending.has(selected);
    el('messages-reply-btn').disabled = !selected || sending;
    el('messages-reply-btn').textContent = pending.has(selected) ? 'Retry same message' : 'Send';
    el('messages-older').disabled = !selected || loading || !(cursor === undefined ? page?.nextBefore : cursor);
  }
  function render() {
    const messages = [...older, ...(page?.messages || [])];
    const unique = [...new Map(messages.map(message => [message.id, message])).values()];
    const thread = el('messages-thread-content');
    const key = JSON.stringify(unique);
    if (thread.dataset.rendered !== key) {
      const atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
      thread.replaceChildren(...unique.map(message => {
        const row = document.createElement('article'); row.className = `cloud-message ${message.sender === 'parent' ? 'parent' : 'child'}`;
        const meta = document.createElement('small'); meta.textContent = `${message.sender === 'parent' ? 'Parent' : students.find(student => student.id === selected)?.name || 'Child'} · ${new Date(message.createdAt).toLocaleString()} · ${message.receivedAt ? 'Received' : 'Saved online'}`;
        const body = document.createElement('p'); body.textContent = message.body;
        row.append(meta, body); return row;
      }));
      thread.dataset.rendered = key;
      if (atBottom) thread.scrollTop = thread.scrollHeight;
    }
    const uncertain = pending.get(selected);
    if (uncertain && unique.some(message => message.id === uncertain.id)) {
      pending.delete(selected); drafts.delete(selected); el('messages-reply-input').value = '';
    }
    controls();
  }
  async function refresh() {
    if (!active || document.hidden || !selected || loading) return;
    clearTimeout(timer); loading = true; controls();
    const child = selected; const ticket = generation;
    try {
      const result = await request('list-messages', { studentId: child,
        version: page?.version, receivedIds: page?.messages.filter(message => message.sender === 'child' && !message.receivedAt).map(message => message.id) || [] });
      if (ticket !== generation || result.studentId !== child) return;
      if (!result.notModified) page = result;
      failures = 0; error = ''; render();
      note(pending.has(child) ? 'Send status is uncertain. The draft is retained; Retry uses the same message ID.' : 'Messages updated.');
    } catch (failure) {
      if (ticket !== generation) return;
      failures++; error = failure.message;
      note(`${error} Showing the last received messages; your draft remains here.`);
    } finally {
      loading = false; controls();
      if (active && !document.hidden) timer = setTimeout(refresh, ticket !== generation ? 0 : Math.min(300000, 30000 * 2 ** Math.min(failures, 4)));
    }
  }
  function choose(child) {
    if (selected) drafts.set(selected, el('messages-reply-input').value);
    selected = child; generation++; page = null; older = []; cursor = undefined;
    el('messages-reply-input').value = drafts.get(child) || '';
    el('messages-thread-header').textContent = students.find(student => student.id === child)?.name || 'Conversation';
    render(); renderStudents(); note('Loading conversation…'); void refresh();
  }
  function renderStudents() {
    el('messages-student-list').replaceChildren(...students.map(student => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary'; button.textContent = student.name;
      button.setAttribute('aria-pressed', String(student.id === selected)); button.addEventListener('click', () => choose(student.id)); return button;
    }));
  }
  el('messages-reply-box').addEventListener('submit', async event => {
    event.preventDefault(); if (!selected || sending) return;
    const child = selected;
    const body = el('messages-reply-input').value.trim(); if (!body) return;
    const message = pending.get(child) || { id: crypto.randomUUID(), body };
    pending.set(child, message); drafts.set(child, message.body); sending = true; controls(); note('Sending…');
    try {
      const receipt = await request('send-message', { studentId: child, ...message });
      if (receipt.id !== message.id || receipt.studentId !== child || receipt.saved !== true) throw new Error('The message receipt did not match.');
      pending.delete(child); drafts.delete(child);
      if (selected === child) { el('messages-reply-input').value = ''; note('Saved online. Waiting for the child’s computer to receive it.'); }
      void refresh();
    } catch (failure) {
      if ([400, 413, 415].includes(failure.status)) {
        pending.delete(child);
        if (selected === child) note(`${failure.message} Nothing was sent. Your draft is retained so you can edit it.`);
      } else if (selected === child) note(`${failure.message} Draft retained. Retry sends the same message without duplicating it; keep this page open until confirmed.`);
    } finally { sending = false; controls(); }
  });
  el('messages-older').addEventListener('click', async () => {
    const before = cursor === undefined ? page?.nextBefore : cursor; if (!selected || loading || !before) return;
    clearTimeout(timer);
    loading = true; controls(); const ticket = generation; const child = selected;
    try {
      const result = await request('list-messages', { studentId: child, before });
      if (ticket !== generation || result.studentId !== child) return;
      older = [...result.messages, ...older]; cursor = result.nextBefore; render();
    } catch (failure) { if (ticket === generation) note(failure.message); }
    finally { loading = false; controls(); if (active && !document.hidden) timer = setTimeout(refresh, ticket === generation ? 30000 : 0); }
  });
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden) void refresh(); });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  return {
    update(value) { students = value || []; renderStudents(); if (selected && !students.some(student => student.id === selected)) choose(null); },
    setActive(value) { active = value; clearTimeout(timer); if (active) void refresh(); }
  };
}
