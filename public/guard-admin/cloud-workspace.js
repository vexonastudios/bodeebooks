import { setupSidebarGroups, activateSidebarGroupForItem } from './navigation-groups.js';
import { connectionState, receivedTime, deliveryState, todaySeconds, editSubjects } from './cloud-workspace-model.js';
import { setupCloudMessages } from './cloud-messages.js';

const endpoint = '/guard/dashboard/bridge/';
const messaging = setupCloudMessages({ endpoint });
const byId = id => document.getElementById(id);
let snapshot = null;
let inFlight = null;
let timer = null;
let failures = 0;
let usable = false;
let mutating = false;
let editorSave = null;
let recoveryGeneration = 0;

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
function button(text, callback, className = 'btn btn-secondary') {
  const element = node('button', className, text);
  element.type = 'button';
  element.addEventListener('click', callback);
  return element;
}
function feedback(text, error = false) {
  byId('cloud-feedback').textContent = text;
  byId('cloud-feedback').dataset.error = String(error);
}
function selectTab(id) {
  const item = document.querySelector(`.nav-item[data-tab="${id}"]`);
  if (!item || !byId(`tab-${id}`)) return;
  document.querySelectorAll('.nav-item').forEach(nav => {
    nav.classList.toggle('active', nav === item);
    if (nav === item) nav.setAttribute('aria-current', 'page'); else nav.removeAttribute('aria-current');
  });
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.toggle('active', tab.id === `tab-${id}`));
  activateSidebarGroupForItem(item);
  messaging.setActive(id === 'messages');
  byId(`tab-${id}`).querySelector('h1')?.setAttribute('tabindex', '-1');
  byId(`tab-${id}`).querySelector('h1')?.focus();
}
function setControls() {
  document.querySelectorAll('[data-cloud-mutation], #add-student-btn, #add-subject-btn').forEach(control => {
    control.disabled = !usable || mutating;
  });
}
function showSnapshot() {
  if (!snapshot) return;
  // Do not destroy a selector the parent is using during background refresh.
  if (!byId('overview-grid').contains(document.activeElement)) renderComputers();
  renderStudents();
  renderSubjects();
  renderActivity();
  messaging.update(snapshot.students);
  setControls();
}
async function refresh() {
  if (inFlight || document.hidden) return inFlight;
  clearTimeout(timer);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  inFlight = (async () => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Your sign-in expired. Open Account to sign in again.' : data.error || 'The cloud service could not be reached.');
      snapshot = data;
      usable = true;
      failures = 0;
      byId('live-text').textContent = 'Connected · 30s refresh';
      byId('live-indicator').dataset.connected = 'true';
      feedback(`Updated ${new Date(data.serverTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Current LAN computers are not part of this preview.`);
      showSnapshot();
    } catch (error) {
      usable = false;
      failures++;
      byId('live-text').textContent = 'Cloud not refreshed';
      byId('live-indicator').dataset.connected = 'false';
      feedback(`${error.message} ${snapshot ? 'Showing the last received information; changes are paused until reconnection.' : 'Your family records have not been cleared.'}`, true);
      setControls();
    } finally {
      clearTimeout(timeout);
      inFlight = null;
      if (!document.hidden) timer = setTimeout(refresh, Math.min(300000, 30000 * (2 ** Math.min(failures, 4))));
    }
  })();
  return inFlight;
}
async function mutate(action, data) {
  if (!usable || mutating) throw new Error('Wait for a successful dashboard connection before making changes.');
  mutating = true;
  setControls();
  try {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'That change could not be saved.');
    await refresh();
    feedback('Saved. Computer changes wait for confirmation from the child’s app.');
    return result;
  } catch (error) {
    const message = error.name === 'TimeoutError' || error.name === 'TypeError'
      ? 'The result is uncertain. Refresh before trying again; your request may have reached the server.' : error.message;
    feedback(message, true);
    throw new Error(message);
  } finally { mutating = false; setControls(); }
}
function mutationButton(text, action, data, className) {
  const result = button(text, () => mutate(action, data).catch(() => {}), className);
  result.dataset.cloudMutation = 'true';
  return result;
}
function renderComputers() {
  const grid = byId('overview-grid');
  const clients = byId('clients-panel');
  grid.replaceChildren();
  clients.replaceChildren();
  if (!snapshot.devices.length) {
    grid.append(node('p', 'cloud-panel', 'No cloud test computers connected yet. Your current LAN computers and records are unchanged.'));
    clients.append(node('p', 'clients-empty', 'No cloud computers yet'));
  }
  for (const device of snapshot.devices) {
    const student = snapshot.students.find(item => item.id === device.student_id);
    const connected = connectionState(device, Date.parse(snapshot.serverTime));
    const subject = snapshot.rules.subjects.find(item => item.id === device.current_subject);
    const card = node('article', `monitor-card ${connected === 'Connected' ? 'monitor-card--active' : 'monitor-card--idle'}`);
    const top = node('div', 'monitor-card-top');
    const identity = node('div', 'monitor-card-identity');
    const names = node('div', 'monitor-name-status');
    names.append(node('h2', 'monitor-name', student?.name || device.computer_name), node('p', `monitor-status-badge ${connected === 'Connected' ? 'active' : 'idle'}`, connected));
    identity.append(node('span', 'monitor-avatar', '👤'), names);
    top.append(identity);
    const timerRow = node('div', 'monitor-timer-row');
    const total = node('div', 'monitor-timer-box');
    total.append(node('span', 'monitor-timer-label', 'Received today (UTC)'), node('span', 'monitor-timer-value', receivedTime(todaySeconds(snapshot, student?.id))));
    timerRow.append(total);
    const assignment = node('select', 'admin-input');
    assignment.dataset.cloudMutation = 'true';
    assignment.setAttribute('aria-label', `Student for ${device.computer_name}`);
    const options = [{ id: '', name: 'Assign a student…' }, ...snapshot.students];
    for (const item of options) { const option = node('option', '', item.name); option.value = item.id; assignment.append(option); }
    assignment.value = device.student_id || '';
    assignment.addEventListener('change', async () => {
      try { await mutate('assign-student', { deviceId: device.id, studentId: assignment.value || null }); }
      catch { assignment.value = device.student_id || ''; }
    });
    const actions = node('div', 'cloud-actions');
    const recovery = button('Offline recovery', () => showRecovery(device));
    recovery.dataset.cloudMutation = 'true';
    actions.append(mutationButton(device.locked ? 'Resume cloud school' : 'Pause cloud school', 'set-school-pause', { deviceId: device.id, locked: !device.locked }, 'btn btn-secondary'), recovery);
    card.append(top, node('p', 'cloud-note', `${device.computer_name} · ${device.app_version || 'Version unavailable'}`),
      node('p', 'cloud-note', deliveryState(device)), node('p', 'cloud-note', connected === 'Connected' && subject ? subject.title : 'No current school session reported'), timerRow, assignment, actions,
      node('p', 'cloud-note', device.recovery_configured ? 'Recovery code configured' : 'Recovery code required before study'));
    grid.append(card);
    clients.append(button(`${student?.name || device.computer_name} · ${connected}`, () => { selectTab('overview'); card.scrollIntoView({ block: 'nearest' }); }, 'nav-item'));
  }
}
function renderStudents() {
  const list = byId('students-list');
  list.replaceChildren();
  for (const student of snapshot.students) {
    const row = node('div', 'student-row');
    const info = node('div', 'student-row-info');
    info.append(node('div', 'student-row-name', student.name), node('div', 'student-row-pin', student.grade ? `Grade ${student.grade}` : 'Grade not specified'));
    row.append(node('span', 'student-row-avatar', '👤'), info);
    list.append(row);
  }
  if (!snapshot.students.length) list.append(node('p', 'cloud-panel', 'No cloud students added yet. Existing student records remain in your current Admin app.'));
}
function renderSubjects() {
  const grid = byId('subjects-grid-admin');
  grid.replaceChildren();
  for (const subject of snapshot.rules.subjects) {
    const card = button('', () => editSubject(subject), 'subject-card-admin');
    card.dataset.cloudMutation = 'true';
    const heading = node('div', 'subject-card-admin-header');
    heading.append(node('span', 'subject-card-admin-icon', '📚'), node('span', 'subject-card-admin-name', subject.title));
    card.append(heading, node('div', 'subject-card-admin-url', subject.url));
    grid.append(card);
  }
  if (!snapshot.rules.subjects.length) grid.append(node('p', 'cloud-panel', 'No school links added yet. Add the curriculum websites your children use.'));
}
function renderActivity() {
  const container = byId('cloud-activity');
  container.replaceChildren();
  if (!snapshot.activity?.length) { container.append(node('p', 'cloud-panel', 'No cloud school time received yet. Offline checkpoints appear after the child reconnects.')); return; }
  const wrap = node('div', 'cloud-table-wrap');
  const table = node('table');
  const head = node('thead'); const heading = node('tr');
  for (const text of ['Date (UTC)', 'Student', 'Subject', 'Received time']) { const th = node('th', '', text); th.scope = 'col'; heading.append(th); }
  head.append(heading); table.append(head);
  const body = node('tbody');
  for (const activity of snapshot.activity) {
    const row = node('tr');
    const student = snapshot.students.find(item => item.id === activity.student_id);
    const subject = snapshot.rules.subjects.find(item => item.id === activity.subject_id);
    for (const text of [activity.date_utc, student?.name || 'Previously assigned student', subject?.title || 'Previous school link', receivedTime(activity.seconds)]) row.append(node('td', '', text));
    body.append(row);
  }
  table.append(body); wrap.append(table); container.append(wrap);
}
function field(label, name, value = '', { type = 'text', required = true, maxLength = 80 } = {}) {
  const wrapper = node('label', '', label);
  const input = node('input', 'admin-input');
  input.name = name; input.value = value; input.type = type; input.required = required; input.maxLength = maxLength;
  wrapper.append(input);
  return wrapper;
}
function editor(title, fields, save) {
  if (!usable || mutating) return;
  byId('cloud-editor-title').textContent = title;
  byId('cloud-editor-fields').replaceChildren(...fields);
  byId('cloud-editor-error').textContent = '';
  editorSave = save;
  byId('cloud-editor').showModal();
}
function editSubject(subject = null) {
  const captured = structuredClone(snapshot);
  const subjectId = subject?.id || crypto.randomUUID();
  const fields = [field('Name', 'title', subject?.title || ''), field('School website', 'url', subject?.url || '', { type: 'url', maxLength: 2048 })];
  if (subject) fields.push(button('Remove subject', async () => {
    if (!confirm(`Remove ${subject.title} from cloud school links?`)) return;
    try { await mutate('save-subjects', editSubjects(captured, subject.id, '', '', true)); byId('cloud-editor').close(); }
    catch (error) { byId('cloud-editor-error').textContent = error.message; }
  }, 'btn btn-danger'));
  editor(subject ? 'Edit Subject' : 'Add Subject', fields, form => mutate('save-subjects', editSubjects(captured, subjectId, form.get('title'), form.get('url'))));
}
function clearRecovery() {
  recoveryGeneration++;
  byId('cloud-recovery-content').replaceChildren();
}
function showRecovery(device) {
  clearRecovery();
  const generation = recoveryGeneration;
  const content = byId('cloud-recovery-content');
  content.append(node('p', '', `Save a private recovery code for ${device.computer_name}. This is not your website password. The child computer must receive and confirm the code before studying.`),
    node('p', '', 'Replacing a code invalidates it only after the computer receives the new policy. Keep the previous code until then.'));
  const label = node('label', '', ' I am ready to save the new code privately.');
  const check = node('input'); check.type = 'checkbox'; label.prepend(check);
  const generate = button(device.recovery_configured ? 'Replace recovery code' : 'Create recovery code', async () => {
    generate.disabled = true;
    try {
      const result = await mutate('create-recovery', { deviceId: device.id });
      if (generation !== recoveryGeneration || document.hidden || !byId('cloud-recovery').open) return;
      content.replaceChildren(node('p', '', 'Save this now. It is shown once and is hidden when you leave this tab.'), node('code', '', result.code), node('p', '', `Waiting for computer policy revision ${result.revision}. Confirm this code in the cloud test app before use.`));
    } catch (error) {
      if (generation === recoveryGeneration && byId('cloud-recovery').open) content.append(node('p', '', `${error.message} Do not generate another code blindly if the result is uncertain.`));
    }
  }, 'btn btn-primary');
  generate.disabled = true;
  check.addEventListener('change', () => { generate.disabled = !check.checked; });
  content.append(label, generate);
  byId('cloud-recovery').showModal();
}

setupSidebarGroups();
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.title ||= item.textContent.replace(/\s+/g, ' ').trim();
  item.addEventListener('click', () => selectTab(item.dataset.tab));
});
document.querySelectorAll('[data-open-tab]').forEach(item => item.addEventListener('click', () => selectTab(item.dataset.openTab)));
byId('cloud-refresh').addEventListener('click', refresh);
byId('add-student-btn').addEventListener('click', () => editor('Add Student', [field('Name', 'name'), field('Grade level (optional)', 'grade', '', { required: false, maxLength: 30 })], form => mutate('add-student', { name: form.get('name'), grade: form.get('grade') })));
byId('add-subject-btn').addEventListener('click', () => editSubject());
byId('cloud-editor-cancel').addEventListener('click', () => byId('cloud-editor').close());
byId('cloud-editor-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!editorSave || mutating) return;
  const submit = event.currentTarget.querySelector('[type="submit"]');
  submit.disabled = true;
  try { await editorSave(new FormData(event.currentTarget)); byId('cloud-editor').close(); }
  catch (error) { byId('cloud-editor-error').textContent = error.message; }
  finally { submit.disabled = false; }
});
byId('cloud-recovery-close').addEventListener('click', () => byId('cloud-recovery').close());
byId('cloud-recovery').addEventListener('close', clearRecovery);
document.addEventListener('visibilitychange', () => {
  clearTimeout(timer);
  if (document.hidden) { clearRecovery(); byId('cloud-recovery').close(); }
  else refresh();
});
window.addEventListener('pagehide', () => { clearTimeout(timer); clearRecovery(); });
window.addEventListener('pageshow', event => { if (event.persisted) { usable = false; setControls(); refresh(); } });
window.lucide?.createIcons();
setControls();
refresh();
