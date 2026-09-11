import { setupDailyPlan } from './cloud-daily-plan.js?v=20260910-board2';
import { setupMonitoring } from './cloud-monitoring.js?v=20260911-screenshot1';
import { studentAvatar, editStudentProfile, profileIcon } from './cloud-student-profile.js?v=20260910-photos1';
import { createDashboardRefresh } from './cloud-dashboard-refresh.js';
import { schoolHoursForm } from './cloud-school-hours-form.js';
import { editCloudSubject } from './cloud-school-editor.js?v=20260910-wide1';
import { setupMainSchool } from './cloud-school-setup.js';
import { setupParentGuide } from './cloud-parent-setup.js?v=20260910-unified';
import { setupCloudSchoolReview } from './cloud-school-review.js';
import { setupSidebarGroups, activateSidebarGroupForItem } from './navigation-groups.js';
import { connectionState, deliveryState, editSchedule, assignmentFor } from './cloud-workspace-model.js';
import { setupCloudMessages } from './cloud-messages.js?v=20260910-voice3';
import './cloud-push-client.js';
import { setupCloudMobile } from './cloud-mobile.js?v=20260910-controls1';
import { setupCloudCalendar } from './cloud-calendar.js';
import { setupCloudRecords } from './cloud-records.js?v=20260910-documents1';
import { setupCloudDocuments } from './cloud-documents.js?v=20260910-documents1';
import { setupCloudFiles } from './cloud-files.js?v=20260910-mobile1';
import { setupCloudGames } from './cloud-games-ui.js?v=20260910-tabletop1';
const setupCloudLearningVideos = () => ({setActive(){}}); // Original media panels initialize in cloud-media-admin.js.
import { setupCloudAssistant } from './cloud-assistant.js?v=20260910-math-controls1';
import { setupCloudDailyQuestions } from './cloud-daily-questions.js';
import { setupCloudPractice } from './cloud-practice.js';
import { setupCloudGeography } from './cloud-geography.js';
import { setupCloudSpanish } from './cloud-spanish.js';
import { setupCloudColoringStudio } from './cloud-coloring-studio.js';
import { setupCloudScreenshots } from './cloud-screenshots.js?v=20260911-screenshot1';
import { setupCloudMathCoach } from './cloud-math-coach.js?v=20260911-controls1';
import { setupCloudSpelling } from './cloud-spelling.js?v=20260910-prompt1';
import { setupCloudVocabulary } from './cloud-vocabulary.js';
import { setupCloudPoems } from './cloud-poems.js';
import { setupCloudQuizzes } from './cloud-quizzes.js';
import { setupCloudWorksheets } from './cloud-worksheets.js';
import { setupCloudReading } from './cloud-reading.js';
import { setupCloudTyping } from './cloud-typing.js?v=20260911-controls1';
import { setupCloudEconomy } from './cloud-economy.js?v=20260911-controls1';
import { setupCloudLegacyArchive } from './cloud-legacy-archive.js';

const endpoint = '/guard/dashboard/bridge/';
const messaging = setupCloudMessages({ endpoint });
const byId = id => document.getElementById(id);
let snapshot = null;
let usable = false;
let mutating = false;
let editorSave = null;
let recoveryGeneration = 0;
let mobile = null;
let parentGuide = null;

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
  byId('cloud-feedback').textContent = !error && text.startsWith('Updated ') ? '' : text;
  byId('cloud-feedback').dataset.error = String(error);
  byId('cloud-feedback').dataset.routine = String(!error && text.startsWith('Updated '));
}
function selectTab(id) {
  if (byId('cloud-feedback').dataset.error !== 'true') feedback('');
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
  files.setActive(id === 'grades');
  documents.setActive(id === 'documents');
  games.setActive(id === 'family-games');
  learningVideos.setActive(id === 'learning-videos');
  musicLibrary.setActive(id==='music');videoLibrary.setActive(id==='videos');
  byId(`tab-${id}`).querySelector('h1')?.setAttribute('tabindex', '-1');
  byId(`tab-${id}`).querySelector('h1')?.focus();
  mobile?.setActive(id);
}
function setControls() {
  document.querySelectorAll('[data-cloud-mutation], #add-student-btn, #add-subject-btn, #edit-school-schedule').forEach(control => {
    control.disabled = !usable || mutating || control.dataset.requiresDevice === 'false';
  });
}
function showSnapshot() {
  if (!snapshot) return;
  // Update card labels after a control is used. Computer selectors are protected
  // separately in Settings, where assignments are edited.
  renderComputers();
  mainSchool.render();
  void parentGuide?.startOnce();
  renderStudents();
  renderSubjects();
  dailyPlan.update();
  records.update();
  schoolReview.update();
  reading.update(); dailyQuestions.update(); practice.update(); geography.update(); spanish.update();
  economy.update(); typing.update(snapshot.students);
  files.update(snapshot.students);
  documents.update();
  renderSchedule();
  renderSchoolCalendar();
  screenshots.update(snapshot);
  messaging.update(snapshot.students);
  setControls();
}
async function refresh() {
  return dashboardRefresh.refresh();
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
    feedback('');
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
  monitoring.render();
  const passwordPanel = byId('family-parent-password');
  const familyPassword = snapshot.parentPassword || { configured: false, revision: 0 };
  const passwordButton = button(familyPassword.configured ? 'Change parent password' : 'Set parent password', () => showRecovery(), 'btn btn-primary');
  passwordButton.dataset.cloudMutation = 'true';
  passwordPanel.replaceChildren(node('h2', '', 'Parent password'), node('p', '', 'One password for all your children’s computers. It also works offline.'), passwordButton);
  const list = byId('cloud-computer-settings'), clients = byId('clients-panel');
  if(list.contains(document.activeElement))return;
  list.replaceChildren();clients.replaceChildren();
  for (const device of snapshot.devices) {
    const student = snapshot.students.find(item => item.id === device.student_id);
    const row = node('div','cloud-computer-setting');row.id='computer-'+device.id;
    const copy=node('div');copy.append(node('strong','',device.computer_name),node('p','cloud-note',device.app_version||'Version unavailable'),node('p','cloud-note',deliveryState(device)));
    const assignment=node('select','admin-input');assignment.dataset.cloudMutation='true';assignment.setAttribute('aria-label','Student for '+device.computer_name);
    for(const item of [{id:'',name:'Assign a student…'},...snapshot.students.filter(s=>!s.archived_at)]){const option=node('option','',item.name);option.value=item.id;assignment.append(option);}
    assignment.value=device.student_id||'';
    assignment.onchange=async()=>{try{await mutate('assign-student',{deviceId:device.id,studentId:assignment.value||null});parentGuide?.afterAssignment();}catch{assignment.value=device.student_id||'';}};
    row.append(copy,assignment);list.append(row);
    clients.append(button((student?.name||device.computer_name)+' · '+connectionState(device,Date.parse(snapshot.serverTime)),()=>{selectTab('settings');row.scrollIntoView({block:'nearest'});},'nav-item'));
  }
  if(!snapshot.devices.length)list.append(node('p','cloud-note','No computers connected yet. Download the child app to get started.'));
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
    row.append(studentAvatar(student, 'student-row-avatar'), info, profileIcon('pencil'));
    const wrapper = node('div', 'cloud-student-management');
    const archive = button(student.archived_at ? 'Restore student' : 'Archive student', async () => {
      const archived = !student.archived_at;
      if (!confirm(archived ? `Archive ${student.name}? Their records and subject settings stay saved. Connected cloud computers will be unassigned when they reconnect. Offline computers may use their cached rules until reconnection or expiry.` : `Restore ${student.name}? Reassign their computer in Settings when ready.`)) return;
      try { await mutate('archive-student', { studentId: student.id, archived }); } catch (_) { /* Existing feedback retains the error. */ }
    }); archive.dataset.cloudMutation = 'true';
    const school = button('Main school', () => mainSchool.edit(student)); school.dataset.cloudMutation = 'true';
    const setup = button('Child setup', () => parentGuide?.openChild(student.id)); setup.disabled=!!student.archived_at;
    school.prepend(profileIcon('school')); setup.prepend(profileIcon('sliders-horizontal')); archive.prepend(profileIcon(student.archived_at ? 'archive-restore' : 'archive'));
    wrapper.append(row, school, setup, archive); list.append(wrapper);
  }
  if (!snapshot.students.length) list.append(node('p', 'cloud-panel', 'No cloud students added yet. Existing student records remain in your current Admin app.'));
  window.lucide?.createIcons();
}
function editStudent(student) {
  editStudentProfile({ student, editor, field, mutate });
}
function renderSubjects() {
  const grid = byId('subjects-grid-admin');
  grid.replaceChildren();
  for (const subject of snapshot.rules.subjects) {
    const card = button('', () => editSubject(subject), 'subject-card-admin');
    card.dataset.cloudMutation = 'true';
    const heading = node('div', 'subject-card-admin-header');
    const icon = node('span', 'subject-card-admin-icon');
    const iconName = String(subject.icon || '').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    if (/^[a-z][a-z-]{0,79}$/.test(subject.icon || '') && window.lucide?.icons?.[iconName]) { const glyph = node('i'); glyph.setAttribute('data-lucide', subject.icon); icon.append(glyph); }
    else icon.textContent = subject.icon || '📚';
    heading.append(icon, node('span', 'subject-card-admin-name', subject.title));
    const assignments = snapshot.students.filter(student => !student.archived_at).map(student => ({ student, assignment: assignmentFor(subject, student.id) })).filter(item => item.assignment && item.assignment.active !== false);
    const assignmentText = assignments.length
      ? assignments.map(item => `${item.student.name}: ${item.assignment.dailyGoalMinutes}m`).join(' · ')
      : 'Not assigned to a child';
    const hours = globalThis.BODEE_CLOUD_SCHEDULE.cloudSubjectAlwaysOpen(subject) ? 'Always open · no time cutoff' : subject.scheduleStart ? `Available ${subject.scheduleStart}–${subject.scheduleEnd} in the family time zone` : 'Uses the family school calendar';
    card.append(heading, node('div', 'subject-card-admin-url', subject.kind === 'offline' ? 'Offline schoolwork' : subject.url), node('div', 'cloud-note', hours), node('div', 'cloud-note', assignmentText));
    if (subject.kind) card.append(node('div', 'cloud-note', `${subject.active === false ? 'Hidden · ' : ''}${({ school: 'Required school', school_optional: 'Optional school', after_school: 'After school' })[subject.accessTier || 'school']}${subject.unlockAfterSubjectId ? ' · Has a prerequisite' : ''}`));
    grid.append(card);
  }
  if (!snapshot.rules.subjects.length) grid.append(node('p', 'cloud-panel', 'No school links added yet. Add the curriculum websites your children use.'));
  window.lucide?.createIcons();
}
function renderSchedule() {
  const output = byId('cloud-school-schedule-summary');
  if (!output) return;
  const schedule = snapshot.rules.schedule;
  if (!schedule?.enabled) { output.textContent = 'School hours are not limited.'; return; }
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
  const captured = structuredClone(snapshot), fields = schoolHoursForm(captured.rules.schedule);
  editor('Calendar & school hours', [fields.form], () => mutate('save-subjects', editSchedule(captured, fields.read())));
  byId('cloud-editor').classList.add('cloud-hours-editor');
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
  byId('cloud-editor').classList.remove('cloud-hours-editor');
  byId('cloud-editor-title').textContent = title;
  byId('cloud-editor-fields').replaceChildren(...fields);
  byId('cloud-editor-error').textContent = '';
  editorSave = save;
  byId('cloud-editor').showModal();
  byId('cloud-editor').scrollTop = 0;
}
function editSubject(subject = null) {
  editCloudSubject({ snapshot, editor, field, selectField, node, button, mutate,
    close: () => byId('cloud-editor').close(), showError: message => { byId('cloud-editor-error').textContent = message; } }, subject);
}

function clearRecovery() {
  recoveryGeneration++;
  byId('cloud-recovery-content').replaceChildren();
}
function showRecovery() {
  clearRecovery();
  byId('cloud-recovery-title').textContent = 'Parent password';
  const generation = recoveryGeneration;
  const content = byId('cloud-recovery-content');
  content.append(node('p', '', 'One password to unlock or exit BodeeGuard on every child’s computer.'));
  content.append(node('p', '', 'Syncs automatically with child app 1.2.173 or newer. Offline computers update when they reconnect.'));
  const form = node('form');
  const label = node('label', '', 'Parent password');
  const password = node('input'); password.type = 'text'; password.autocomplete = 'off'; password.spellcheck = false;
  password.minLength = 6; password.maxLength = 64; password.required = true; password.placeholder = 'At least 6 characters';
  label.append(password);
  const save = button('Save parent password', () => {}, 'btn btn-primary'); save.type = 'submit';
  const icon = node('i'); icon.setAttribute('data-lucide', 'shield-check'); save.prepend(icon);
  const status = node('p'); status.setAttribute('role', 'status');
  form.append(label, save, status); content.append(form);
  form.addEventListener('submit', async event => {
    event.preventDefault(); save.disabled = true; status.textContent = 'Saving…';
    try {
      await mutate('set-parent-password', { password: password.value });
      password.value = '';
      if (generation !== recoveryGeneration || document.hidden || !byId('cloud-recovery').open) return;
      content.replaceChildren(node('p', '', 'Saved for your whole family. Child computers receive it automatically.'));
    } catch (error) {
      password.value = '';
      if (generation === recoveryGeneration && byId('cloud-recovery').open) status.textContent = error.message;
    } finally { save.disabled = false; }
  });
  window.lucide?.createIcons();
  byId('cloud-recovery').showModal();
}

setupSidebarGroups();
const calendar = setupCloudCalendar({ getSnapshot: () => snapshot, editException: addDayException, editSubject, setControls });
const records = setupCloudRecords({ endpoint, getSnapshot: () => snapshot, mutate, editor, field, selectField, node, button, setControls });
const schoolReview = setupCloudSchoolReview({ before: byId('subjects-grid-admin'), endpoint, getSnapshot: () => snapshot, onApplied: refresh });
const monitoring = setupMonitoring({ getSnapshot: () => snapshot, mutate, navigate: selectTab, showError: feedback, mobile: () => mobile, openMessages: id => { messaging.openStudent(id); selectTab('messages'); } });
const mainSchool = setupMainSchool({ getSnapshot: () => snapshot, editor, field, selectField, node, button, mutate });
const files = setupCloudFiles({ endpoint, gradePaper: records.gradePaper });
const documents = setupCloudDocuments({ request: files.request, gradePaper: records.gradePaper, getStudents: () => snapshot?.students || [] });
const dailyQuestions = setupCloudDailyQuestions({ endpoint, getSnapshot: () => snapshot });
const practice = setupCloudPractice({ endpoint, getSnapshot: () => snapshot });
const geography = setupCloudGeography({ endpoint, getSnapshot: () => snapshot });
const spanish = setupCloudSpanish({ endpoint, getSnapshot: () => snapshot });
const coloringStudio = setupCloudColoringStudio({ endpoint });
const screenshots = setupCloudScreenshots({ endpoint });
let pushTicketController = null;
const livePush = window.CloudPush.createCloudPushClient({
  getIdentity: () => dashboardRefresh.isVisible() ? 'parent' : null,
  getTicket: async () => {
    pushTicketController = new AbortController();
    const response = await fetch(endpoint, {method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([pushTicketController.signal,AbortSignal.timeout(15000)]),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'push-ticket'})});
    if(!response.ok)throw Error('Live delivery is reconnecting');
    return response.json();
  },
  onConnection: connected => { byId('live-indicator').dataset.messagesConnected=String(connected); messaging.setLive(connected); },
  onReady: () => screenshots.refresh(),
  onSignal: hint => { if(hint.kind==='messages')messaging.notify(hint.studentId); if(hint.kind==='screenshots')screenshots.refresh(); }
});
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
const games = setupCloudGames({ root: byId('cloud-family-games'), parent: true,
  assetBase: new URL('/guard-admin/family-games/v1/', location.href),
  renderAvatar: child => studentAvatar(snapshot?.students?.find(student => student.id === child.id) || child),
  request: async (kind, input = {}) => {
  const body = kind === 'action' ? { action: 'game-action', gameAction: input.action, id: input.id, matchId: input.matchId, revision: input.revision }
    : { ...input, action: kind === 'settings' ? 'game-settings' : 'game-room' };
  const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) { const error = new Error(value.error || 'Family games could not connect.'); error.status = response.status; throw error; }
  return value;
} });
const mediaRequest = async (kind, input = {}) => {
  const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, action: kind === 'save' ? 'save-learning-video' : 'list-learning-videos' }) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Learning videos could not connect.');
  return value;
};
const learningVideos = setupCloudLearningVideos({root:byId('cloud-learning-videos'),parent:true,libraryKind:'learning-videos',request:mediaRequest});
const musicLibrary = setupCloudLearningVideos({root:byId('cloud-music-library'),parent:true,libraryKind:'music',request:mediaRequest});
const videoLibrary = setupCloudLearningVideos({root:byId('cloud-video-library'),parent:true,libraryKind:'videos',request:mediaRequest});
const dailyPlan = setupDailyPlan({ getSnapshot: () => snapshot, mutate, navigate: selectTab, endpoint });

document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
  item.title ||= item.textContent.replace(/\s+/g, ' ').trim();
  item.addEventListener('click', () => selectTab(item.dataset.tab));
});
document.querySelectorAll('[data-open-tab]').forEach(item => item.addEventListener('click', () => selectTab(item.dataset.openTab)));
const dashboardRefresh = createDashboardRefresh({
  requestComputers: async signal => {
    const response = await fetch(endpoint, {method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),body:JSON.stringify({action:'refresh-computers'})});
    if (!response.ok) throw new Error('Computer refresh unavailable');
  },
  refreshSnapshot: async signal => {
    const response = await fetch(endpoint, {cache:'no-store',credentials:'same-origin',signal:AbortSignal.any([signal,AbortSignal.timeout(12000)])});
    const data = await response.json();
    signal.throwIfAborted();
    if (!response.ok) {
      if (response.status === 401) window.parent.postMessage({type:'bodeeguard-renew-session'}, location.origin);
      throw new Error(response.status === 401 ? 'Reconnecting your account…' : data.error || 'The cloud service could not be reached.');
    }
    snapshot = data;
    usable = true;
    byId('live-text').textContent = 'Refreshes on opening · Every 30 min while visible';
    byId('live-indicator').dataset.connected = 'true';
    feedback(`Updated ${new Date(data.serverTime).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}.`);
    showSnapshot();
  },
  onError: error => {
    usable = false;
    byId('live-text').textContent = 'Cloud not refreshed';
    byId('live-indicator').dataset.connected = 'false';
    feedback(`${error.message} ${snapshot ? 'Showing the last received information; changes are paused until reconnection.' : 'Your family records have not been cleared.'}`, true);
    setControls();
  },
  onBusy: busy => {
    const initial = busy && !snapshot;
    const loader = byId('cloud-dashboard-loading');
    if (loader) {
      loader.hidden = !initial;
      loader.parentElement.classList.toggle('cloud-startup-loading', initial);
      loader.parentElement.setAttribute('aria-busy', String(initial));
    }
    byId('cloud-refresh').disabled = busy;
    byId('cloud-refresh').setAttribute('aria-busy', String(busy));
    if (busy) feedback('');
    setControls();
  },
  onResume: () => livePush.start(),
  onSuspend: () => {
    pushTicketController?.abort();
    livePush.stop();
    usable = false;
    clearRecovery();
    byId('cloud-recovery').close();
    setControls();
  },
});
const refreshComputers = () => dashboardRefresh.refreshComputers();
byId('cloud-refresh').addEventListener('click', refreshComputers);
byId('add-student-btn').addEventListener('click', () => editor('Add Student', [field('Name', 'name'), field('Grade level (optional)', 'grade', '', { required: false, maxLength: 30 })], async form => {
  const student = await mutate('add-student', { name: form.get('name'), grade: form.get('grade') });
  byId('cloud-editor').addEventListener('close', () => parentGuide?.openChild(student.id), { once: true });
}));
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
window.addEventListener('message', event => {
  if (!usable && event.origin === location.origin && event.source === window.parent && event.data?.type === 'bodeeguard-session-ready') refresh();
});
setupCloudAssistant({ endpoint, navigate: selectTab, onChange: feature => { if (feature === 'math-coach') mathCoach.update(); } });
mobile = setupCloudMobile({ navigate: selectTab, refresh:refreshComputers, openSpelling:()=>spelling.openScanner(), getSnapshot:()=>snapshot, mutate, feedback });
mobile.setActive('overview');
parentGuide = setupParentGuide({ endpoint, getSnapshot: () => snapshot, navigate: selectTab, mutate });
window.lucide?.createIcons();
setControls();
dashboardRefresh.start();
