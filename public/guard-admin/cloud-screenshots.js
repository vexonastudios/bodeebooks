import { studentAvatar, profileIcon as icon } from './cloud-student-profile.js?v=20260910-photos1';

export function setupCloudScreenshots({ endpoint }) {
  const root = document.getElementById('cloud-screenshots');
  let active = false, epoch = 0, overview = null, students = [], devices = [];
  let present = true, controller = null, viewer = null;
  let availability = null, availabilityUntil = 0, expiryTimer = null, serverOffset = 0;
  const requests = new Map(), notices = new Map();
  const expanded = new Set();
  const visible = () => active && present && !document.hidden;
  const node = (tag, text = '', cls = '') => { const el = document.createElement(tag); el.textContent = text; el.className = cls; return el; };
  const button = (text, glyph, callback, cls = 'btn btn-secondary') => {
    const el = node('button', '', cls); el.type = 'button'; el.append(icon(glyph), document.createTextNode(text)); el.onclick = callback; return el;
  };
  async function call(input, signal) {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(input.action === 'request-screenshot' ? 12000 : 30000);
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const value = await response.json(); if (!response.ok) { const error = Error(value.error || 'Screenshots could not connect.'); error.status = response.status; throw error; } return value;
  }
  function setAvailability(value) {
    availability = value || null; availabilityUntil = Date.now() + 75000;
    if (Number.isFinite(Date.parse(value?.checkedAt))) serverOffset = Date.parse(value.checkedAt) - Date.now();
  }
  const online = studentId => Date.now() < availabilityUntil && availability?.known === true && availability.availableStudentIds.includes(studentId);
  const pending = studentId => overview?.screenshots.some(item => item.student_id === studentId && item.status === 'pending' && Date.parse(item.request_expires_at) > Date.now() + serverOffset);
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    const deadlines = [availabilityUntil, ...(overview?.screenshots || []).filter(item => item.status === 'pending').map(item => Date.parse(item.request_expires_at) - serverOffset)].filter(value => value > Date.now());
    if (visible() && deadlines.length) expiryTimer = setTimeout(() => { if (visible()) render(); }, Math.min(...deadlines) - Date.now() + 20);
  }
  async function requestScreenshot(student) {
    if (!visible() || !online(student.id) || pending(student.id) || requests.has(student.id)) return;
    const abort = new AbortController(); requests.set(student.id, abort); notices.set(student.id, 'Sending request…'); render();
    try {
      const result = await call({ action: 'request-screenshot', studentId: student.id }, abort.signal);
      if (overview) overview.screenshots = [result, ...overview.screenshots.filter(item => item.id !== result.id)];
      notices.delete(student.id);
    } catch (error) {
      notices.set(student.id, error.name === 'TimeoutError' || error.name === 'AbortError' || error.name === 'TypeError'
        ? 'The request could not be confirmed. Refresh to check its result before trying again.' : error.message);
      if (error.status === 409 || error.status === 503) availability = { ...availability, availableStudentIds: (availability?.availableStudentIds || []).filter(id => id !== student.id) };
    } finally {
      requests.delete(student.id);
      if (visible()) render();
    }
    if (visible() && !notices.has(student.id)) await load();
  }
  async function image(screenshotId, thumbnail = false, signal) {
    const file = await call({ action: 'screenshot-image', screenshotId, thumbnail }, signal);
    signal?.throwIfAborted();
    if (file.url?.startsWith('https://bodeeguard-cloud-assets.james-7f8.workers.dev/v1/download/')) return file.url;
    if (file?.mime !== 'image/webp' || typeof file.data !== 'string') throw Error('The private screenshot was invalid.');
    return 'data:' + file.mime + ';base64,' + file.data;
  }
  function statusText(item) {
    if (item.status === 'pending') return Date.parse(item.request_expires_at) <= Date.now() + serverOffset
      ? 'The child app did not respond. Refresh and try again when it is online.' : 'Waiting for child’s app…';
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
      const connected = online(student.id);
      const connection = !assigned ? 'No computer connected' : Date.now() >= availabilityUntil || !availability?.known ? 'Refresh to check connection' : connected ? 'Online' : 'Offline';
      identity.append(node('h2', student.name), node('p', connection, 'cloud-note')); top.append(studentAvatar(student), identity);
      const status = node('p', notices.get(student.id) || '', 'cloud-screenshot-error'); status.setAttribute('role', 'status');
      const request = button('Take screenshot', 'camera', () => void requestScreenshot(student), 'btn btn-primary');
      request.disabled = !connected || requests.has(student.id) || pending(student.id);
      request.title = !connected ? 'Open BodeeGuard on this child’s computer, then refresh.' : pending(student.id) ? 'A screenshot request is already waiting for this child.' : 'Capture this child’s BodeeGuard screen';
      card.dataset.studentId = student.id; card.append(top, request, status);
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
    root.append(list); window.lucide?.createIcons(); scheduleExpiry();
  }
  function suspend(cancelRequests = false) { epoch++; controller?.abort(); viewer?.close(); clearTimeout(expiryTimer); if (cancelRequests) for (const request of requests.values()) request.abort(); }
  async function load() {
    if (!visible()) return; suspend(); const current = epoch; controller = new AbortController(); const signal = controller.signal;
    root.setAttribute('aria-busy', 'true'); if (!overview) root.textContent = 'Loading screenshots…';
    try { const value = await call({ action: 'screenshots-overview' }, signal); if (!visible() || current !== epoch) return; overview = value; if (value.devices) devices = value.devices; setAvailability(value.availability); for (const id of notices.keys()) if (!requests.has(id)) notices.delete(id); render(); }
    catch (error) { if (visible() && current === epoch) { root.replaceChildren(node('p', error.message, 'cloud-screenshot-error'), button('Try again', 'refresh-cw', () => void load())); window.lucide?.createIcons(); } }
    finally { if (current === epoch) root.setAttribute('aria-busy', 'false'); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(true); else if (visible()) void load(); });
  window.addEventListener('pagehide', () => { present = false; suspend(true); });
  window.addEventListener('pageshow', () => { present = true; if (visible()) void load(); });
  return { refresh() { if (visible()) return load(); }, update(snapshot) { students = snapshot?.students || []; devices = snapshot?.devices || []; setAvailability(snapshot?.screenshotAvailability); if (visible() && overview) render(); }, setActive(value) { active = value; suspend(!value); if (value) return load(); } };
}
