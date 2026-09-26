import { createParentSessionRecovery, createParentSessionNotice } from './cloud-parent-session.js';
import { createStudentAssignment, createAssignmentConfirmation } from './cloud-student-assignment.js';
import { setupRecoveryBackups } from './cloud-retention.js';
import { parentActionFeedback } from './cloud-action-feedback.js';
import { setupWeeklyActivity } from './cloud-weekly-activity.js';
import { createConnectionRefresh } from './cloud-connection-refresh.js';
import { setupDailyPlan } from './cloud-daily-plan.js';
import { setupParentStart } from './cloud-parent-start.js?v=20260926-connect1';
import { setupMainSchool } from './cloud-school-setup.js';
import { setupApprovedApps } from './cloud-approved-apps.js';
import { studentAvatar, editStudentProfile, profileIcon } from './cloud-student-profile.js?v=20260910-photos1';
import { editCloudSubject } from './cloud-school-editor.js';
import { setupActivityLibrary } from './cloud-activity-library.js';
import { setupCloudSchoolReview } from './cloud-school-review.js';
import { setupSidebarGroups, activateSidebarGroupForItem } from './navigation-groups.js';
import { connectionState, applyConnectionStatus, deliveryState, editSchedule } from './cloud-workspace-model.js';
import { setupCloudMessages } from './cloud-messages.js';
import { setupCloudMobile } from './cloud-mobile.js';
import { setupCloudCalendar } from './cloud-calendar.js';
import { setupCloudRecords } from './cloud-records.js';
import { setupCloudFiles } from './cloud-files.js';
import { setupCloudGames } from './cloud-games-ui.js';
import { setupCloudLearningVideos } from './cloud-learning-videos-ui.js';
import { setupCloudAssistant } from './cloud-assistant.js';
import { setupCloudDailyQuestions } from './cloud-daily-questions.js';
import { setupCloudPractice } from './cloud-practice.js';
import { setupCloudGeography } from './cloud-geography.js';
import { setupCloudSpanish } from './cloud-spanish.js';
import { setupCloudColoringStudio } from './cloud-coloring-studio.js';
import { setupCloudScreenshots } from './cloud-screenshots.js';
import { setupMonitoring } from './cloud-monitoring.js?v=20260923-colors1';
import { setupCloudMathCoach } from './cloud-math-coach.js';
import { setupCloudSpelling } from './cloud-spelling.js?v=20260910-unified2';
import { setupCloudVocabulary } from './cloud-vocabulary.js';
import { setupCloudPoems } from './cloud-poems.js';
import { setupCloudQuizzes } from './cloud-quizzes.js';
import { setupCloudWorksheets } from './cloud-worksheets.js';
import { setupCloudReading } from './cloud-reading.js';
import { setupCloudTyping } from './cloud-typing.js?v=20260911-controls1';
import { setupCloudEconomy } from './cloud-economy.js?v=20260911-controls1';
import { setupCloudLegacyArchive } from './cloud-legacy-archive.js';

import { setupNotificationNavigation } from './cloud-notification-navigation.js';
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
let mobile = null;
const computerRows = new Map();
const sessionNotice = createParentSessionNotice(refresh);
const parentSession = createParentSessionRecovery({ onState: sessionNotice, onPause: () => {
  usable = false; feedback(''); setControls();
  byId('live-text').textContent = 'Reconnecting…'; byId('live-indicator').dataset.connected = 'false';
} });


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
  parentActionFeedback().page(text,error);
}
function selectTab(id) {
  weeklyActivity.setActive(id === 'overview');
  approvedApps.setActive(id === 'apps');
  dailyPlan.setActive(id === 'daily-plan');
  if(id==='science-spelling')id='spelling';
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
  reading.setActive(id === 'reports'); dailyQuestions.setActive(id === 'reports'); practice.setActive(id === 'reports'); geography.setActive(id === 'reports'); spanish.setActive(id === 'reports'); spelling.setActive(id === 'spelling');
  coloringStudio.setActive(id === 'coloring-studio');
  screenshots.setActive(id === 'screenshots');
  mathCoach.setActive(id === 'math-coach');
  vocabulary.setActive(id === 'vocabulary');
  poems.setActive(id === 'poems');
  quizzes.setActive(id === 'quizzes');
  worksheets.setActive(id === 'worksheets');
  economy.setActive(id === 'economy'); typing.setActive(id === 'typing');
  legacy.setActive(id === 'settings');
  recoveryBackups.setActive(id === 'settings');
  files.setActive(id === 'grades');
  games.setActive(id === 'family-games');
  learningVideos.setActive(id === 'learning-videos');
  byId(`tab-${id}`).querySelector('h1')?.setAttribute('tabindex', '-1');
  byId(`tab-${id}`).querySelector('h1')?.focus();
  mobile?.setActive(id);
}
function setControls() {
  document.querySelectorAll('[data-cloud-mutation], #add-student-btn, #add-subject-btn, #edit-school-schedule').forEach(control => {
    control.disabled = !usable || mutating || control.dataset.requiresDevice === 'false' || control.dataset.actionPending === 'true';
  });
}
function showSnapshot() {
  if (!snapshot) return;
  // Refresh action labels immediately; monitoring restores any open action menu.
  monitoring.render();
  weeklyActivity.update();
  renderComputers();
  renderStudents();
  renderSubjects();
  dailyPlan.update();
  mainSchool.render();
  parentStart.update();
  records.update();
  schoolReview.update();
  reading.update(); dailyQuestions.update(); practice.update(); geography.update(); spanish.update();
  economy.update(); typing.update(snapshot.students);
  files.update(snapshot.students);
  renderSchedule();
  renderSchoolCalendar();
  screenshots.update(snapshot);
  messaging.update(snapshot.students);
  notificationNavigation.update();
  setControls();
}
async function refresh() {
  if (inFlight || document.hidden) return inFlight;
  clearTimeout(timer);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  inFlight = (async () => {
    try {
      const response = await parentSession.read(endpoint, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The cloud service could not be reached.');
      snapshot = data;
      usable = true;
      failures = 0;
      byId('live-text').textContent = 'Connections checked every 30s';
      byId('live-indicator').dataset.connected = 'true';
      feedback('');
      showSnapshot();
      if (!document.hidden) connectionRefresh.start();
    } catch (error) {
      usable = false;
      failures++;
      byId('live-text').textContent = 'Cloud not refreshed';
      byId('live-indicator').dataset.connected = 'false';
      if (!error.sessionRecovery) feedback(`${error.message} ${snapshot ? 'Showing the last received information; changes are paused until reconnection.' : 'Your family records have not been cleared.'}`, true);
      setControls();
    } finally {
      clearTimeout(timeout);
      inFlight = null;
      const loader = byId('cloud-dashboard-loading');
      if (loader) {
        loader.parentElement.classList.remove('cloud-startup-loading');
        loader.parentElement.setAttribute('aria-busy', 'false');
        loader.remove();
      }
      if (!document.hidden) timer = setTimeout(refresh, failures ? Math.min(300000,30000 * (2 ** Math.min(failures,4))) : 1800000);
    }
  })();
  return inFlight;
}
async function mutate(action, data, { notify = true } = {}) {
  if (!usable || mutating) throw new Error('Wait for a successful dashboard connection before making changes.');
  mutating = true;
  setControls();
  try {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
      signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'That change could not be saved.');
    await refresh();
    feedback('');
    return result;
  } catch (error) {
    const message = error.name === 'TimeoutError' || error.name === 'TypeError'
      ? 'The result is uncertain. Refresh before trying again; your request may have reached the server.' : error.message;
    if (notify) feedback(message, true);
    throw new Error(message);
  } finally { mutating = false; setControls(); }
}
function renderComputers() {
  const setup = byId('cloud-computer-settings');
  const clients = byId('clients-panel');
  clients.replaceChildren();
  let created = false;
  for (const [id, item] of computerRows) if (!snapshot.devices.some(device => device.id === id)) { item.row.remove(); computerRows.delete(id); }
  setup.querySelector('.cloud-computers-empty')?.remove();
  if (!snapshot.devices.length) {
    setup.append(node('p', 'cloud-note cloud-computers-empty', 'No child computers paired yet. Approve a computer to assign it to a child.'));
    clients.append(node('p', 'clients-empty', 'No cloud computers yet'));
  }
  for (const device of snapshot.devices) {
    const student = snapshot.students.find(item => item.id === device.student_id);
    const connected = connectionState(device, monitoring.connectionNow());
    let item = computerRows.get(device.id);
    if (!item) {
      created = true;
      const row = node('div', 'cloud-computer-setting'), info = node('div'), title = node('strong'), status = node('p'), recoveryStatus = node('p');
      info.append(title, status, recoveryStatus);
      const assignment = createStudentAssignment({ device, students: snapshot.students, mutate: (action, data) => mutate(action, data, { notify: false }),
        canEdit: () => usable && !mutating, setControls, onSaved: () => assignmentConfirmation.start() });
      const actions = node('div', 'cloud-actions');
      const recovery = button('Offline recovery', () => showRecovery(computerRows.get(device.id).device)); recovery.dataset.cloudMutation = 'true';
      const pause = button('', () => { const current = computerRows.get(device.id).device; void mutate('set-school-pause', { deviceId: current.id, locked: !current.locked }).catch(() => {}); });
      pause.dataset.cloudMutation = 'true'; actions.append(pause, recovery);
      const controls = node('div', 'cloud-computer-controls'); controls.append(assignment.element, actions);
      row.append(info, controls); setup.append(row);
      item = { row, title, status, recoveryStatus, assignment, pause, device }; computerRows.set(device.id, item);
    }
    item.device = device; item.title.textContent = device.computer_name;
    item.status.textContent = `${connected} · ${device.app_version || 'Version unavailable'} · ${deliveryState(device)}`;
    item.recoveryStatus.textContent = device.recovery_configured ? 'Recovery code configured' : 'Recovery code required before study';
    item.pause.textContent = device.locked ? 'Resume cloud school' : 'Pause cloud school';
    item.assignment.update(device, snapshot.students);
    clients.append(button(`${student?.name || device.computer_name} · ${connected}`, () => {
      selectTab('overview');
      const card = student && [...byId('overview-grid').children].find(element => element.dataset.studentId === student.id);
      if (!card) setup.closest('details').open = true;
      (card || item.row).scrollIntoView({ block: 'nearest' });
    }, 'nav-item'));
  }
  window.lucide?.createIcons();
  if (created) queueMicrotask(() => assignmentConfirmation.start());
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
    const editLabel = node('span', 'cloud-student-edit-label', 'Edit profile'); editLabel.prepend(profileIcon('pencil'));
    row.append(studentAvatar(student, 'student-row-avatar'), info, editLabel);
    const wrapper = node('article', 'cloud-student-management'); wrapper.dataset.archived = String(!!student.archived_at);
    const archive = button(student.archived_at ? 'Restore student' : 'Archive student', async () => {
      const archived = !student.archived_at;
      if (!confirm(archived ? `Archive ${student.name}? Their records and subject settings stay saved. Connected cloud computers will be unassigned when they reconnect. Offline computers may use their cached rules until reconnection or expiry.` : `Restore ${student.name}? Reassign their cloud computer in Overview when ready.`)) return;
      try { await mutate('archive-student', { studentId: student.id, archived }); } catch (_) { /* Existing feedback retains the error. */ }
    }); archive.dataset.cloudMutation = 'true'; archive.classList.add('cloud-student-archive'); archive.prepend(profileIcon(student.archived_at ? 'archive-restore' : 'archive')); archive.setAttribute('aria-label', `${student.archived_at ? 'Restore' : 'Archive'} ${student.name}`);
    const footer = node('div', 'cloud-student-card-footer'), state = node('span', 'cloud-student-state', student.archived_at ? 'Archived' : 'Active student'); state.prepend(profileIcon(student.archived_at ? 'archive' : 'user-round-check'));
    footer.append(state, archive); wrapper.append(row, footer); list.append(wrapper);
  }
  if (!snapshot.students.length) list.append(node('p', 'cloud-panel', 'Add your first student to set up their profile and school.'));
}
function editStudent(student) {
  editStudentProfile({ student, editor, field, mutate });
}
function renderSubjects() { activityLibrary.render(); }

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
  byId('cloud-editor').scrollTop = 0;
}
function editSubject(subject = null, options = {}) {
  editCloudSubject({ snapshot, editor, field, selectField, node, button, mutate,
    close: () => byId('cloud-editor').close(), showError: message => { byId('cloud-editor-error').textContent = message; } }, subject, options);
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
const weeklyActivity = setupWeeklyActivity({ endpoint, getSnapshot: () => snapshot });
const monitoring = setupMonitoring({
  setControls,
  getSnapshot: () => snapshot,
  mutate: (action,data) => mutate(action,data,{notify:false}),
  navigate: selectTab,
  openMessages: studentId => { selectTab('messages'); messaging.openStudent(studentId); },
  showError: feedback,
  mobile: () => mobile
});
const approvedApps = setupApprovedApps({ endpoint });
const calendar = setupCloudCalendar({ getSnapshot: () => snapshot, editException: addDayException, editSubject, setControls });
const records = setupCloudRecords({ endpoint, getSnapshot: () => snapshot, mutate, editor, field, selectField, node, button, setControls, onStudentChange: id => files.setStudent(id), onGradeSaved: () => files.refresh() });
const activityLibrary = setupActivityLibrary({ getSnapshot: () => snapshot, editSubject, canEdit: () => usable && !mutating });
const schoolReview = setupCloudSchoolReview({ before: byId('activity-library-review-anchor'), endpoint, getSnapshot: () => snapshot, onApplied: refresh });
const recoveryBackups = setupRecoveryBackups({ endpoint, root: byId('tab-settings') });
const files = setupCloudFiles({ endpoint, gradePaper: records.gradePaper });
const dailyQuestions = setupCloudDailyQuestions({ endpoint, getSnapshot: () => snapshot });
const practice = setupCloudPractice({ endpoint, getSnapshot: () => snapshot });
const geography = setupCloudGeography({ endpoint, getSnapshot: () => snapshot });
const spanish = setupCloudSpanish({ endpoint, getSnapshot: () => snapshot });
const coloringStudio = setupCloudColoringStudio({ endpoint });
const screenshots = setupCloudScreenshots({ endpoint });
const mathCoach = setupCloudMathCoach({ endpoint, navigate: selectTab });
const spelling = setupCloudSpelling({ endpoint });
const vocabulary = setupCloudVocabulary();
const poems = setupCloudPoems();
const quizzes = setupCloudQuizzes();
const worksheets = setupCloudWorksheets();
const reading = setupCloudReading({ endpoint, getSnapshot: () => snapshot });
const typing = setupCloudTyping({ endpoint, mutate, editor, node, button });
const economy = setupCloudEconomy({ endpoint, mutate, editor, field, node, button });
const legacy = setupCloudLegacyArchive({ root: byId('cloud-legacy-import'), onApplied: refresh });
const games = setupCloudGames({ root: byId('cloud-family-games'), parent: true, assetBase: new URL('/guard-admin/family-games/v1/', location.href), request: async (kind, input = {}) => {
  const body = kind === 'action' ? { action: 'game-action', gameAction: input.action, id: input.id, matchId: input.matchId, revision: input.revision }
    : { ...input, action: kind === 'tabletop' ? 'game-tabletop' : kind === 'settings' ? 'game-settings' : 'game-room' };
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
const dailyPlan = setupDailyPlan({ getSnapshot: () => snapshot, mutate, navigate: selectTab, editSubject, chooseSchool: studentId => { selectTab('students'); mainSchool.open(studentId); }, endpoint });
const mainSchool = setupMainSchool({getSnapshot:()=>snapshot,editor,field,selectField,node,button,mutate});
const parentStart = setupParentStart({endpoint,getSnapshot:()=>snapshot,navigate:selectTab,mutate,refresh});

document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.title ||= item.textContent.replace(/\s+/g, ' ').trim();
  item.addEventListener('click', () => selectTab(item.dataset.tab));
});
document.querySelectorAll('[data-open-tab]').forEach(item => item.addEventListener('click', () => selectTab(item.dataset.openTab)));
const assignmentConfirmation = createAssignmentConfirmation({ refresh, hasPending: () => [...computerRows.values()].some(item => item.assignment.hasPending()) });
byId('cloud-refresh').addEventListener('click', refresh);
byId('add-student-btn').addEventListener('click', () => editor('Add Student', [field('Name', 'name'), field('Grade level (optional)', 'grade', '', { required: false, maxLength: 30 })], form => mutate('add-student', { name: form.get('name'), grade: form.get('grade') })));

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
const connectionRefresh = createConnectionRefresh({
  refresh: async signal => {
    const response = await fetch(endpoint, {method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),body:JSON.stringify({action:'connection-status'})});
    if (!response.ok) throw new Error('Connection check unavailable');
    const status = await response.json(); signal.throwIfAborted();
    snapshot = applyConnectionStatus(snapshot, status);
    monitoring.render();
    renderComputers();
    screenshots.update(snapshot); setControls();
  },
  onError: () => { monitoring.render(); setControls(); },
});
document.addEventListener('visibilitychange', () => {
  clearTimeout(timer);
  if (document.hidden) { connectionRefresh.stop(); clearRecovery(); byId('cloud-recovery').close(); }
  else refresh();
});
window.addEventListener('pagehide', () => { connectionRefresh.stop(); clearTimeout(timer); clearRecovery(); });
window.addEventListener('pageshow', event => { if (event.persisted) { usable = false; setControls(); refresh(); } });
setupCloudAssistant({ endpoint, navigate: selectTab, onChange: feature => { if (feature === 'math-coach') mathCoach.update(); if (feature === 'games') { void games.refresh(); void refresh(); } if (feature === 'music') { void refresh(); } } });
mobile = setupCloudMobile({ navigate: selectTab, refresh });
mobile.setActive('overview');
const notificationNavigation = setupNotificationNavigation({ messaging, navigate: selectTab, getStudents: () => snapshot?.students || [] });
window.lucide?.createIcons();
setControls();
refresh();
