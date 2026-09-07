import { setupSidebarGroups, activateSidebarGroupForItem } from './navigation-groups.js';
import { connectionState, receivedTime, deliveryState, todaySeconds, activityDayLabel, editSubjects, editSchedule, assignmentFor, subjectProgress } from './cloud-workspace-model.js';
import { setupCloudMessages } from './cloud-messages.js';
import { setupCloudCalendar } from './cloud-calendar.js';
import { setupCloudRecords } from './cloud-records.js';
import { setupCloudFiles } from './cloud-files.js';
import { setupCloudGames } from './cloud-games-ui.js';
import { setupCloudLearningVideos } from './cloud-learning-videos-ui.js';
import { setupCloudAssistant } from './cloud-assistant.js';
import { setupCloudDailyQuestions } from './cloud-daily-questions.js';
import { setupCloudReading } from './cloud-reading.js';
import { setupCloudTyping } from './cloud-typing.js';
import { setupCloudEconomy } from './cloud-economy.js';
import { setupCloudLegacyArchive } from './cloud-legacy-archive.js';

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
  records.setActive(id);
  reading.setActive(id === 'reports'); dailyQuestions.setActive(id === 'reports');
  economy.setActive(id === 'economy'); typing.setActive(id === 'economy');
  legacy.setActive(id === 'settings');
  files.setActive(id === 'grades');
  games.setActive(id === 'family-games');
  learningVideos.setActive(id === 'learning-videos');
  byId(`tab-${id}`).querySelector('h1')?.setAttribute('tabindex', '-1');
  byId(`tab-${id}`).querySelector('h1')?.focus();
}
function setControls() {
  document.querySelectorAll('[data-cloud-mutation], #add-student-btn, #add-subject-btn, #edit-school-schedule').forEach(control => {
    control.disabled = !usable || mutating;
  });
}
function showSnapshot() {
  if (!snapshot) return;
  // Do not destroy a selector the parent is using during background refresh.
  if (!byId('overview-grid').contains(document.activeElement)) renderComputers();
  renderStudents();
  renderSubjects();
  records.update();
  reading.update(); dailyQuestions.update();
  economy.update(); typing.update(snapshot.students);
  files.update(snapshot.students);
  renderSchedule();
  renderSchoolCalendar();
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
    total.append(node('span', 'monitor-timer-label', activityDayLabel(snapshot)), node('span', 'monitor-timer-value', receivedTime(todaySeconds(snapshot, student?.id))));
    timerRow.append(total);
    const goals = node('details', 'cloud-subject-goals');
    const goalRows = [];
    if (student) for (const subject of snapshot.rules.subjects) {
      const progress = subjectProgress(snapshot, student.id, subject.id);
      if (progress) goalRows.push(node('p', 'cloud-note', progress.seconds === null
        ? `${subject.title}: received time unavailable · ${progress.goalMinutes}m goal`
        : `${subject.title}: ${receivedTime(progress.seconds)} of ${progress.goalMinutes}m · ${progress.percent}%`));
    }
    if (goalRows.length) goals.append(node('summary', '', `${goalRows.length} subject goal${goalRows.length === 1 ? '' : 's'} today`), ...goalRows);
    const assignment = node('select', 'admin-input');
    assignment.dataset.cloudMutation = 'true';
    assignment.setAttribute('aria-label', `Student for ${device.computer_name}`);
    const options = [{ id: '', name: 'Assign a student…' }, ...snapshot.students.filter(item => !item.archived_at)];
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
      node('p', 'cloud-note', deliveryState(device)), node('p', 'cloud-note', connected === 'Connected' && subject ? subject.title : 'No current school session reported'), timerRow,
      ...(goalRows.length ? [goals] : []), assignment, actions,
      node('p', 'cloud-note', device.recovery_configured ? 'Recovery code configured' : 'Recovery code required before study'));
    grid.append(card);
    clients.append(button(`${student?.name || device.computer_name} · ${connected}`, () => { selectTab('overview'); card.scrollIntoView({ block: 'nearest' }); }, 'nav-item'));
  }
}
function renderStudents() {
  const list = byId('students-list');
  list.replaceChildren();
  for (const student of snapshot.students) {
    const row = button('', () => editStudent(student), 'student-row');
    row.dataset.cloudMutation = 'true';
    row.setAttribute('aria-label', `Edit ${student.name}`);
    const info = node('div', 'student-row-info');
    info.append(node('div', 'student-row-name', `${student.name}${student.archived_at ? ' · Archived' : ''}`), node('div', 'student-row-pin', student.grade ? `Grade ${student.grade}` : 'Grade not specified'));
    row.append(node('span', 'student-row-avatar', '👤'), info);
    const wrapper = node('div', 'cloud-student-management');
    const archive = button(student.archived_at ? 'Restore student' : 'Archive student', async () => {
      const archived = !student.archived_at;
      if (!confirm(archived ? `Archive ${student.name}? Their records and subject settings stay saved. Connected cloud computers will be unassigned when they reconnect. Offline computers may use their cached rules until reconnection or expiry.` : `Restore ${student.name}? Reassign their cloud computer in Overview when ready.`)) return;
      try { await mutate('archive-student', { studentId: student.id, archived }); } catch (_) { /* Existing feedback retains the error. */ }
    }); archive.dataset.cloudMutation = 'true'; wrapper.append(row, archive); list.append(wrapper);
  }
  if (!snapshot.students.length) list.append(node('p', 'cloud-panel', 'No cloud students added yet. Existing student records remain in your current Admin app.'));
}
function editStudent(student) {
  editor('Edit Student', [field('Name', 'name', student.name), field('Grade level (optional)', 'grade', student.grade || '', { required: false, maxLength: 30 })],
    form => mutate('edit-student', { studentId: student.id, name: form.get('name'), grade: form.get('grade') }));
}
function renderSubjects() {
  const grid = byId('subjects-grid-admin');
  grid.replaceChildren();
  for (const subject of snapshot.rules.subjects) {
    const card = button('', () => editSubject(subject), 'subject-card-admin');
    card.dataset.cloudMutation = 'true';
    const heading = node('div', 'subject-card-admin-header');
    heading.append(node('span', 'subject-card-admin-icon', '📚'), node('span', 'subject-card-admin-name', subject.title));
    const assignments = snapshot.students.filter(student => !student.archived_at).map(student => ({ student, assignment: assignmentFor(subject, student.id) })).filter(item => item.assignment);
    const assignmentText = assignments.length
      ? assignments.map(item => `${item.student.name}: ${item.assignment.dailyGoalMinutes}m`).join(' · ')
      : 'Not assigned to a child';
    const hours = subject.scheduleStart ? `Available ${subject.scheduleStart}–${subject.scheduleEnd} in the family time zone` : 'Available throughout the family school window';
    card.append(heading, node('div', 'subject-card-admin-url', subject.url), node('div', 'cloud-note', hours), node('div', 'cloud-note', assignmentText));
    grid.append(card);
  }
  if (!snapshot.rules.subjects.length) grid.append(node('p', 'cloud-panel', 'No school links added yet. Add the curriculum websites your children use.'));
}
function renderSchedule() {
  const output = byId('cloud-school-schedule-summary');
  if (!output) return;
  const schedule = snapshot.rules.schedule;
  if (!schedule?.enabled) { output.textContent = 'No weekly school window is enforced yet. Approved school links remain available whenever the account and computer are active.'; return; }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  output.textContent = `${schedule.days.map(day => dayNames[day]).join(', ')} · ${schedule.start}–${schedule.end} · ${schedule.timeZone}`;
}
function scheduleValue(value) {
  return { enabled: false, timeZone: 'America/Chicago', days: [1, 2, 3, 4, 5], start: '08:00', end: '15:00',
    termStart: null, termEnd: null, breaks: [], exceptions: [], ...(value || {}),
    breaks: [...(value?.breaks || [])], exceptions: [...(value?.exceptions || [])] };
}
function renderSchoolCalendar() {
  const term = byId('cloud-school-term-summary');
  const items = byId('cloud-school-calendar-items');
  if (!term || !items) return;
  const schedule = scheduleValue(snapshot.rules.schedule);
  term.textContent = schedule.termStart ? `${schedule.termStart} through ${schedule.termEnd}` : 'School-year dates are not limited yet.';
  items.replaceChildren();
  const addRow = (title, detail, edit, remove) => {
    const row = node('div', 'cloud-calendar-row');
    const copy = node('div'); copy.append(node('strong', '', title), node('span', '', detail));
    const actions = node('div', 'cloud-actions');
    for (const [label, callback] of [['Edit', edit], ['Remove', remove]]) {
      const action = button(label, callback); action.dataset.cloudMutation = 'true'; action.setAttribute('aria-label', `${label} ${title}, ${detail}`); actions.append(action);
    }
    row.append(copy, actions); items.append(row);
  };
  for (const schoolBreak of [...schedule.breaks].sort((a, b) => a.start.localeCompare(b.start))) addRow(schoolBreak.label, `${schoolBreak.start} through ${schoolBreak.end}`, () => addSchoolBreak(schoolBreak), async () => {
    if (!confirm(`Remove ${schoolBreak.label} from the school calendar?`)) return;
    const captured = structuredClone(snapshot); const current = scheduleValue(captured.rules.schedule);
    await mutate('save-subjects', editSchedule(captured, { ...current, breaks: current.breaks.filter(item => item.id !== schoolBreak.id) })).catch(() => {});
  });
  for (const exception of schedule.exceptions) addRow(exception.school ? 'School open' : 'No school', exception.date, () => addDayException(exception.date, exception), async () => {
    if (!confirm(`Remove the one-day exception for ${exception.date}?`)) return;
    const captured = structuredClone(snapshot); const current = scheduleValue(captured.rules.schedule);
    await mutate('save-subjects', editSchedule(captured, { ...current, exceptions: current.exceptions.filter(item => item.date !== exception.date) })).catch(() => {});
  });
  if (!schedule.breaks.length && !schedule.exceptions.length) items.append(node('p', 'cloud-note', 'No vacations, holidays, or one-day exceptions added.'));
  calendar.render();
}
function field(label, name, value = '', { type = 'text', required = true, maxLength = 80 } = {}) {
  const wrapper = node('label', '', label);
  const input = node('input', 'admin-input');
  input.name = name; input.value = value; input.type = type; input.required = required; input.maxLength = maxLength;
  wrapper.append(input);
  return wrapper;
}
function selectField(label, name, choices, value) {
  const wrapper = node('label', '', label); const select = node('select', 'admin-input'); select.name = name;
  for (const choice of choices) { const option = node('option', '', choice.label); option.value = choice.value; select.append(option); }
  select.value = value; wrapper.append(select); return wrapper;
}
function editSchoolSchedule() {
  const captured = structuredClone(snapshot);
  const current = scheduleValue(captured.rules.schedule);
  const fields = [];
  const enabledLabel = node('label', 'cloud-schedule-toggle');
  const enabled = node('input'); enabled.type = 'checkbox'; enabled.name = 'enabled'; enabled.checked = Boolean(current.enabled);
  enabledLabel.append(enabled, node('span', '', 'Enable the school calendar'));
  fields.push(enabledLabel);
  const zoneLabel = node('label', '', 'School time zone');
  const zone = node('select', 'admin-input'); zone.name = 'timeZone';
  const zones = [...new Set([current.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone,
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'])].filter(Boolean);
  for (const value of zones) { const option = node('option', '', value.replaceAll('_', ' ')); option.value = value; zone.append(option); }
  zone.value = current.timeZone;
  zoneLabel.append(zone); fields.push(zoneLabel);
  const days = node('fieldset', 'cloud-schedule-days'); days.append(node('legend', '', 'School days'));
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach((name, index) => {
    const label = node('label'); const input = node('input'); input.type = 'checkbox'; input.name = `day-${index}`; input.checked = current.days.includes(index);
    label.append(input, node('span', '', name.slice(0, 3))); days.append(label);
  });
  fields.push(days, field('School opens', 'start', current.start, { type: 'time' }), field('School closes', 'end', current.end, { type: 'time' }),
    field('First school date (optional)', 'termStart', current.termStart || '', { type: 'date', required: false }),
    field('Last school date (optional)', 'termEnd', current.termEnd || '', { type: 'date', required: false }),
    node('p', 'cloud-note', 'The signed calendar is cached on each child computer, so it still applies during a temporary internet outage.'));
  editor('School Year & Weekly Hours', fields, form => mutate('save-subjects', editSchedule(captured, {
    ...current, enabled: form.get('enabled') === 'on', timeZone: form.get('timeZone'),
    days: [0, 1, 2, 3, 4, 5, 6].filter(day => form.get(`day-${day}`) === 'on'), start: form.get('start'), end: form.get('end'),
    termStart: form.get('termStart') || null, termEnd: form.get('termEnd') || null
  })));
}
function addSchoolBreak(existing = null) {
  const captured = structuredClone(snapshot); const current = scheduleValue(captured.rules.schedule);
  editor(existing ? 'Edit Vacation or Holiday' : 'Add Vacation or Holiday', [field('Name', 'label', existing?.label || ''),
    field('First day', 'start', existing?.start || '', { type: 'date' }), field('Last day', 'end', existing?.end || '', { type: 'date' })],
    form => mutate('save-subjects', editSchedule(captured, { ...current, breaks: [...current.breaks.filter(item => item.id !== existing?.id), {
      id: existing?.id || crypto.randomUUID(), label: form.get('label'), start: form.get('start'), end: form.get('end')
    }] })));
}
function addDayException(date = '', existing = null) {
  const captured = structuredClone(snapshot); const current = scheduleValue(captured.rules.schedule);
  editor(existing ? 'Edit One-Day Exception' : 'Add One-Day Exception', [field('Date', 'date', date, { type: 'date' }), selectField('That day should be', 'mode', [
    { value: 'closed', label: 'No school' }, { value: 'open', label: 'School open during normal hours' }
  ], existing?.school ? 'open' : 'closed')], form => {
    if (current.exceptions.some(item => item.date === form.get('date') && item.date !== existing?.date)) {
      throw new Error('That day already has an exception. Edit it from the calendar.');
    }
    return mutate('save-subjects', editSchedule(captured, { ...current,
      exceptions: [...current.exceptions.filter(item => item.date !== existing?.date), { date: form.get('date'), school: form.get('mode') === 'open' }]
    }));
  });
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
  const fields = [field('Name', 'title', subject?.title || ''), field('School website', 'url', subject?.url || '', { type: 'url', maxLength: 2048 }),
    field('Available from (optional)', 'scheduleStart', subject?.scheduleStart || '', { type: 'time', required: false }),
    field('Available until (optional)', 'scheduleEnd', subject?.scheduleEnd || '', { type: 'time', required: false }),
    node('p', 'cloud-note', 'Leave both times empty to use the whole family school window. Subject hours use the family time zone and are cached for offline enforcement.')];
  const domainsLabel = node('label', '', 'Additional allowed domains (optional)');
  const domains = node('textarea', 'admin-input'); domains.name = 'allowedDomains'; domains.rows = 3; domains.maxLength = 5100;
  domains.value = (subject?.allowedDomains || []).join('\n'); domains.placeholder = 'quizzes.example.com\nlogin.example.com';
  domainsLabel.append(domains);
  fields.push(domainsLabel, node('p', 'cloud-note', 'Approve only websites needed by this subject, separated by commas or new lines. Each domain includes its subdomains and uses HTTPS. The school website is already allowed; leave this empty if it needs no additional sites.'));
  const assignmentFields = node('fieldset', 'cloud-assignment-fields');
  assignmentFields.append(node('legend', '', 'Children and daily goals'));
  for (const student of snapshot.students) {
    const current = subject ? assignmentFor(subject, student.id) : { dailyGoalMinutes: 30 };
    const row = node('label', 'cloud-assignment-row');
    const enabled = node('input'); enabled.type = 'checkbox'; enabled.name = `assigned-${student.id}`; enabled.checked = Boolean(current);
    const name = node('span', '', `${student.name}${student.archived_at ? ' (archived; settings retained)' : ''}`);
    const goal = node('input', 'admin-input'); goal.type = 'number'; goal.name = `goal-${student.id}`; goal.min = '5'; goal.max = '480'; goal.required = enabled.checked; goal.disabled = !enabled.checked; goal.value = String(current?.dailyGoalMinutes || 30);
    const minutes = node('span', '', 'minutes each school day');
    enabled.addEventListener('change', () => { goal.disabled = !enabled.checked; goal.required = enabled.checked; });
    row.append(enabled, name, goal, minutes); assignmentFields.append(row);
  }
  if (!snapshot.students.length) assignmentFields.append(node('p', 'cloud-note', 'Add a student before assigning this subject.'));
  fields.push(assignmentFields);
  if (subject) fields.push(button('Remove subject', async () => {
    if (!confirm(`Remove ${subject.title} from cloud school links?`)) return;
    try { await mutate('save-subjects', editSubjects(captured, subject.id, '', '', true)); byId('cloud-editor').close(); }
    catch (error) { byId('cloud-editor-error').textContent = error.message; }
  }, 'btn btn-danger'));
  editor(subject ? 'Edit Subject' : 'Add Subject', fields, form => {
    const assignments = captured.students.filter(student => form.get(`assigned-${student.id}`) === 'on').map(student => ({
      studentId: student.id, dailyGoalMinutes: Number(form.get(`goal-${student.id}`))
    }));
    return mutate('save-subjects', editSubjects(captured, subjectId, form.get('title'), form.get('url'), false, assignments, {
      scheduleStart: form.get('scheduleStart') || null, scheduleEnd: form.get('scheduleEnd') || null,
      allowedDomains: String(form.get('allowedDomains') || '').split(/[,\n\r]+/).map(value => value.trim()).filter(Boolean)
    }));
  });
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
const calendar = setupCloudCalendar({ getSnapshot: () => snapshot, editException: addDayException, editSubject, setControls });
const records = setupCloudRecords({ endpoint, getSnapshot: () => snapshot, mutate, editor, field, selectField, node, button, setControls });
const files = setupCloudFiles({ endpoint, gradePaper: records.gradePaper });
const dailyQuestions = setupCloudDailyQuestions({ endpoint, getSnapshot: () => snapshot });
const reading = setupCloudReading({ endpoint, getSnapshot: () => snapshot });
const typing = setupCloudTyping({ endpoint, mutate, editor, node, button });
const economy = setupCloudEconomy({ endpoint, mutate, editor, field, node, button });
const legacy = setupCloudLegacyArchive({ root: byId('cloud-legacy-import'), onApplied: refresh });
const games = setupCloudGames({ root: byId('cloud-family-games'), parent: true, request: async (kind, input = {}) => {
  const body = kind === 'action' ? { action: 'game-action', gameAction: input.action, id: input.id, matchId: input.matchId, revision: input.revision }
    : { ...input, action: kind === 'settings' ? 'game-settings' : 'game-room' };
  const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) { const error = new Error(value.error || 'Family games could not connect.'); error.status = response.status; throw error; }
  return value;
} });
const learningVideos = setupCloudLearningVideos({ root: byId('cloud-learning-videos'), parent: true, request: async (kind, input = {}) => {
  const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, action: kind === 'save' ? 'save-learning-video' : 'list-learning-videos' }) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Learning videos could not connect.');
  return value;
} });
document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.title ||= item.textContent.replace(/\s+/g, ' ').trim();
  item.addEventListener('click', () => selectTab(item.dataset.tab));
});
document.querySelectorAll('[data-open-tab]').forEach(item => item.addEventListener('click', () => selectTab(item.dataset.openTab)));
byId('cloud-refresh').addEventListener('click', refresh);
byId('add-student-btn').addEventListener('click', () => editor('Add Student', [field('Name', 'name'), field('Grade level (optional)', 'grade', '', { required: false, maxLength: 30 })], form => mutate('add-student', { name: form.get('name'), grade: form.get('grade') })));
byId('add-subject-btn').addEventListener('click', () => editSubject());
byId('edit-school-schedule').addEventListener('click', editSchoolSchedule);
byId('add-school-break').addEventListener('click', () => addSchoolBreak());
byId('add-day-exception').addEventListener('click', () => addDayException());
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
setupCloudAssistant({ endpoint, navigate: selectTab });
window.lucide?.createIcons();
setControls();
refresh();
