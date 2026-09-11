import { studentAvatar, profileIcon as icon } from './cloud-student-profile.js?v=20260910-photos1';

export function setupCloudScreenshots({ endpoint }) {
  const root = document.getElementById('cloud-screenshots');
  let active = false, epoch = 0, overview = null, students = [], devices = [];
  let present = true, controller = null, viewer = null;
  const expanded = new Set();
  const visible = () => active && present && !document.hidden;
  const node = (tag, text = '', cls = '') => { const el = document.createElement(tag); el.textContent = text; el.className = cls; return el; };
  const button = (text, glyph, callback, cls = 'btn btn-secondary') => {
    const el = node('button', '', cls); el.type = 'button'; el.append(icon(glyph), document.createTextNode(text)); el.onclick = callback; return el;
  };
  async function call(input, signal) {
    signal?.throwIfAborted();
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) throw Error(value.error || 'Screenshots could not connect.'); return value;
  }
  async function image(screenshotId, thumbnail = false, signal) {
    const file = await call({ action: 'screenshot-image', screenshotId, thumbnail }, signal);
    signal?.throwIfAborted();
    if (file.url?.startsWith('https://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/download/')) return file.url;
    if (file?.mime !== 'image/webp' || typeof file.data !== 'string') throw Error('The private screenshot was invalid.');
    return 'data:' + file.mime + ';base64,' + file.data;
  }
  function statusText(item) {
    if (item.status === 'pending') return 'Waiting for child’s app';
    if (item.status === 'captured') return item.retained ? 'Kept' : 'Expires ' + new Date(item.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (item.status === 'failed') return item.failure || 'The child app did not respond.';
    return item.status === 'expired' ? 'Expired' : item.status;
  }
  async function openImage(item, student) {
    viewer?.close();
    const dialog = node('dialog', '', 'cloud-screenshot-viewer'), heading = node('div', '', 'cloud-screenshot-viewer-header');
    const label = node('h2', student.name + ' · ' + new Date(item.requested_at).toLocaleString());
    const close = button('Close', 'x', () => dialog.close()), full = node('img'), message = node('p', 'Opening screenshot…', 'cloud-note');
    full.alt = 'Screenshot for ' + student.name; full.hidden = true; heading.append(label, close); dialog.append(heading, message, full);
    dialog.setAttribute('aria-label', full.alt);
    const abort = new AbortController(); viewer = dialog;
    dialog.addEventListener('close', () => { abort.abort(); dialog.remove(); if (viewer === dialog) viewer = null; }, { once: true });
    document.body.append(dialog); dialog.showModal(); window.lucide?.createIcons();
    try {
      const url = await image(item.id, false, abort.signal);
      if (!dialog.open) return;
      full.onload = () => { message.hidden = true; full.hidden = false; };
      full.onerror = () => { message.textContent = 'The screenshot could not load. Close and try again.'; };
      full.src = url;
    } catch (error) { if (dialog.open) message.textContent = error.message; }
  }
  function screenshotRow(item, student) {
    const row = node('article', '', 'cloud-screenshot-row'), details = node('div', '', 'cloud-screenshot-details');
    details.append(node('time', new Date(item.requested_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })), node('span', statusText(item), 'cloud-screenshot-status'));
    row.append(details);
    if (item.has_image) {
      const preview = node('img', '', 'cloud-screenshot-preview'); preview.alt = 'Screenshot for ' + student.name; preview.loading = 'lazy';
      const open = button('', 'expand', () => void openImage(item, student), 'cloud-screenshot-open');
      open.setAttribute('aria-label', 'View ' + student.name + '’s screenshot'); open.prepend(preview); row.append(open);
      image(item.id, true, controller?.signal).then(url => { if (visible() && preview.isConnected) preview.src = url; }).catch(error => { if (preview.isConnected) preview.alt = error.message; });
    }
    if (item.status === 'captured') {
      const actions = node('div', '', 'cloud-screenshot-actions');
      const action = (label, glyph, kind) => {
        const control = button(label, glyph, async () => {
          control.disabled = true;
          try { await call({ action: 'screenshot-action', screenshotId: item.id, screenshotAction: kind }); await load(); }
          catch (error) { control.disabled = false; details.append(node('p', error.message, 'cloud-screenshot-error')); }
        }); return control;
      };
      if (!item.retained) actions.append(action('Keep', 'bookmark-plus', 'keep'));
      actions.append(action('Delete', 'trash-2', 'delete')); row.append(actions);
    }
    return row;
  }
  function render() {
    root.replaceChildren();
    const header = node('div', '', 'tab-header'), title = node('h1', 'Screenshots'); title.prepend(icon('camera'));
    header.append(title, button('Refresh', 'refresh-cw', () => void load())); root.append(header);
    root.append(node('p', 'Capture a child’s BodeeGuard screen on request. Unkept screenshots expire after ' + overview.retention_days + ' days.', 'cloud-note cloud-screenshot-note'));
    const byStudent = new Map();
    for (const item of overview.screenshots) { if (!byStudent.has(item.student_id)) byStudent.set(item.student_id, []); byStudent.get(item.student_id).push(item); }
    const list = node('div', '', 'cloud-screenshot-list');
    for (const student of students.filter(item => !item.archived_at)) {
      const card = node('section', '', 'cloud-panel cloud-screenshot-card'), top = node('div', '', 'cloud-screenshot-child'), identity = node('div');
      const assigned = devices.some(device => device.student_id === student.id);
      identity.append(node('h2', student.name), node('p', assigned ? 'Child computer' : 'No computer connected', 'cloud-note')); top.append(studentAvatar(student), identity);
      const status = node('p', '', 'cloud-screenshot-error'); status.setAttribute('role', 'status');
      const request = button('Take screenshot', 'camera', async () => {
        request.disabled = true; status.textContent = 'Sending request…';
        try { await call({ action: 'request-screenshot', studentId: student.id }); await load(); }
        catch (error) { request.disabled = false; status.textContent = error.message; }
      }, 'btn btn-primary');
      request.disabled = !assigned; card.append(top, request, status);
      const items = (byStudent.get(student.id) || []).sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at));
      if (!items.length) { const empty = node('div', '', 'cloud-screenshot-empty'); empty.append(icon('image'), node('p', 'No screenshots yet')); card.append(empty); }
      else card.append(screenshotRow(items[0], student));
      if (items.length > 1) {
        const history = node('details', '', 'cloud-screenshot-history'), summary = node('summary', 'History · ' + (items.length - 1)), older = node('div'); summary.prepend(icon('history'));
        let loaded = false;
        function showHistory() { if (loaded || !visible()) return; loaded = true; for (const item of items.slice(1)) older.append(screenshotRow(item, student)); window.lucide?.createIcons(); }
        history.append(summary, older); history.open = expanded.has(student.id); card.append(history);
        history.ontoggle = () => { if (history.open) { expanded.add(student.id); showHistory(); } else expanded.delete(student.id); };
        if (history.open) showHistory();
      }
      list.append(card);
    }
    if (!students.some(item => !item.archived_at)) list.append(node('p', 'Add a child in Students, then connect their computer in Settings.', 'cloud-panel'));
    root.append(list); window.lucide?.createIcons();
  }
  function suspend() { epoch++; controller?.abort(); viewer?.close(); }
  async function load() {
    if (!visible()) return; suspend(); const current = epoch; controller = new AbortController(); const signal = controller.signal;
    root.setAttribute('aria-busy', 'true'); if (!overview) root.textContent = 'Loading screenshots…';
    try { const value = await call({ action: 'screenshots-overview' }, signal); if (!visible() || current !== epoch) return; overview = value; render(); }
    catch (error) { if (visible() && current === epoch) { root.replaceChildren(node('p', error.message, 'cloud-screenshot-error'), button('Try again', 'refresh-cw', () => void load())); window.lucide?.createIcons(); } }
    finally { if (current === epoch) root.setAttribute('aria-busy', 'false'); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('pagehide', () => { present = false; suspend(); });
  window.addEventListener('pageshow', () => { present = true; });
  return { refresh() { if (visible()) void load(); }, update(snapshot) { students = snapshot?.students || []; devices = snapshot?.devices || []; }, setActive(value) { active = value; suspend(); if (value) void load(); } };
}
