import { setupCloudAttendance } from './cloud-attendance.js';
// The preview uses the same calendar decisions as the API and child app.
const { normalizeCloudSchoolSchedule, cloudSchoolDayState, cloudSchoolDateParts } = globalThis.BODEE_CLOUD_SCHEDULE;
const byId = id => document.getElementById(id);
function node(tag, className = '', text = '') {
  const result = document.createElement(tag); result.className = className; result.textContent = text; return result;
}
function action(text, callback, { className = '', icon = null, label = null } = {}) {
  const result = node('button', `btn btn-secondary ${className}`.trim()); result.type = 'button';
  if (icon) { const mark = node('i'); mark.dataset.lucide = icon; result.replaceChildren(mark, node('span', '', text)); }
  if (label) result.setAttribute('aria-label', label);
  result.dataset.cloudMutation = 'true'; result.addEventListener('click', callback); return result;
}
function formatDate(date, options) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(new Date(`${date}T12:00:00Z`));
}
function dayLabel(state) {
  if (state.reason === 'not_enabled') return 'Calendar off';
  if (state.allowed) return state.exception ? 'School · exception' : 'School';
  if (state.reason === 'school_break') return state.schoolBreak.label;
  return { outside_term: 'Outside school year', day_exception: 'No school · exception', day_off: 'Day off' }[state.reason];
}

export function setupCloudCalendar({ getSnapshot, editException, editBreak, setControls }) {
  const attendance = setupCloudAttendance();
  let month = null;
  let selectedDate = null;
  let renderedKey = null;
  const today = () => {
    const snapshot = getSnapshot();
    return cloudSchoolDateParts(normalizeCloudSchoolSchedule(snapshot.rules.schedule).timeZone, snapshot.serverTime).localDate;
  };
  function render(force = false) {
    const snapshot = getSnapshot();
    if (!snapshot) return;
    const schedule = normalizeCloudSchoolSchedule(snapshot.rules.schedule);
    const currentDate = today();
    selectedDate ||= currentDate;
    month ||= selectedDate.slice(0, 7);
    const key = JSON.stringify([snapshot.rules, currentDate, month, selectedDate]);
    const host = byId('cloud-calendar-attendance');
    if (host && byId('tab-calendar')?.classList.contains('active')) void attendance.render(host, selectedDate, snapshot);
    if (!force && key === renderedKey) return;
    renderedKey = key;
    const focusedDate = byId('cloud-calendar-days').contains(document.activeElement) ? document.activeElement.dataset.date : null;
    byId('cloud-calendar-enabled-note').textContent = schedule.enabled
      ? `School dates use ${schedule.timeZone.replaceAll('_', ' ')}. Select a date to change that day.`
      : `Calendar is off. Enable it in School start time & late coins to use your saved school days and breaks. Activity schedules still use ${schedule.timeZone.replaceAll('_', ' ')}.`;
    byId('cloud-calendar-month').textContent = formatDate(`${month}-01`, { month: 'long', year: 'numeric' });
    const first = new Date(`${month}-01T00:00:00Z`);
    const offset = first.getUTCDay();
    const next = new Date(first); next.setUTCMonth(next.getUTCMonth() + 1);
    const count = Math.round((next - first) / 86400000);
    const body = byId('cloud-calendar-days'); body.replaceChildren();
    for (let cell = 0; cell < Math.ceil((offset + count) / 7) * 7; cell++) {
      if (cell % 7 === 0) body.append(node('tr'));
      const td = node('td'); body.lastElementChild.append(td);
      const day = cell - offset + 1;
      if (day < 1 || day > count) continue;
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const state = cloudSchoolDayState(schedule, date);
      const label = dayLabel(state);
      const button = node('button', 'cloud-calendar-day'); button.type = 'button'; button.dataset.date = date;
      if (state.exception) button.dataset.exception = 'true';
      button.dataset.state = !schedule.enabled ? 'inactive' : state.allowed ? 'school' : 'off';
      button.setAttribute('aria-pressed', String(date === selectedDate));
      button.setAttribute('aria-label', `${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: ${label}`);
      if (date === currentDate) button.setAttribute('aria-current', 'date');
      button.append(node('strong', '', String(day)), node('span', '', label));
      button.addEventListener('click', () => { selectedDate = date; render(); }); td.append(button);
    }
    if (focusedDate) [...body.querySelectorAll('[data-date]')].find(button => button.dataset.date === focusedDate)?.focus();
    byId('cloud-calendar-previous').disabled = month <= '0001-01';
    byId('cloud-calendar-next').disabled = month >= '9999-12';
    renderDetails(schedule);
    setControls();
  }
  function renderDetails(schedule) {
    const details = byId('cloud-calendar-day-details'); details.replaceChildren();
    const state = cloudSchoolDayState(schedule, selectedDate);
    details.dataset.state = !schedule.enabled ? 'inactive' : state.allowed ? 'school' : 'off';
    const summary = node('header', 'cloud-day-summary'), copy = node('div');
    copy.append(node('p', 'cloud-calendar-eyebrow', 'SELECTED DAY'),
      node('h3', '', formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })),
      node('p', 'cloud-day-status', dayLabel(state)));
    summary.append(copy); details.append(summary);
    details.append(node('p', 'cloud-note', !schedule.enabled ? 'Enable the calendar to use your school days and breaks.'
      : state.allowed ? `School hours: ${schedule.start}–${schedule.end}` : 'No required schoolwork or late check-in deductions for this day.'));
    if (state.exception) details.append(node('p', 'cloud-note', 'This one-day change takes priority over the usual week, school year, and vacations.'));
    else if (state.schoolBreak) details.append(node('p', 'cloud-note', `${state.schoolBreak.start} through ${state.schoolBreak.end}`));
    const actions = node('div', 'cloud-day-actions');
    actions.append(action(state.exception ? 'Edit exception' : 'Change this day', () => editException(selectedDate, state.exception),
      { className: 'cloud-calendar-exception-action', icon: 'calendar-cog' }));
    if (state.schoolBreak && editBreak) actions.append(action('Edit this break', () => editBreak(state.schoolBreak), { icon: 'pencil' }));
    details.append(actions);
    window.lucide?.createIcons();
  }
  function shiftMonth(amount) {
    if (!month) return;
    const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + amount);
    if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return;
    month = date.toISOString().slice(0, 7); selectedDate = `${month}-01`; render();
  }
  byId('cloud-calendar-previous').addEventListener('click', () => shiftMonth(-1));
  byId('cloud-calendar-next').addEventListener('click', () => shiftMonth(1));
  byId('cloud-calendar-today').addEventListener('click', () => {
    if (!getSnapshot()) return;
    selectedDate = today(); month = selectedDate.slice(0, 7); render();
  });
  return { render };
}
