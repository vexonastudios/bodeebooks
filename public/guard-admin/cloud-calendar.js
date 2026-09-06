// The preview uses the same calendar decisions as the API and child app.
const { normalizeCloudSchoolSchedule, cloudSchoolDayState, cloudSchoolDateParts } = globalThis.BODEE_CLOUD_SCHEDULE;
const byId = id => document.getElementById(id);
function node(tag, className = '', text = '') {
  const result = document.createElement(tag); result.className = className; result.textContent = text; return result;
}
function action(text, callback) {
  const result = node('button', 'btn btn-secondary', text); result.type = 'button';
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

export function setupCloudCalendar({ getSnapshot, editException, editSubject, setControls }) {
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
    if (!force && key === renderedKey) return;
    renderedKey = key;
    const focusedDate = byId('cloud-calendar-days').contains(document.activeElement) ? document.activeElement.dataset.date : null;
    byId('cloud-calendar-enabled-note').textContent = schedule.enabled
      ? `Dates and subject hours below use ${schedule.timeZone.replaceAll('_', ' ')}. Select a day to see its hours or add an exception.`
      : `Calendar is off. Saved school-year dates, holidays, and exceptions do not restrict access until you enable the school calendar. Individual subject hours still apply in ${schedule.timeZone.replaceAll('_', ' ')}.`;
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
    renderDetails(snapshot, schedule);
    setControls();
  }
  function renderDetails(snapshot, schedule) {
    const details = byId('cloud-calendar-day-details'); details.replaceChildren();
    const state = cloudSchoolDayState(schedule, selectedDate);
    details.append(node('h3', '', formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })),
      node('p', 'cloud-day-status', dayLabel(state)));
    if (state.allowed) {
      details.append(node('p', 'cloud-note', schedule.enabled ? `School hours: ${schedule.start}–${schedule.end}` : 'No family calendar restriction.'));
      const subjects = snapshot.rules.subjects.filter(subject => !Array.isArray(subject.assignments) || subject.assignments.length);
      if (!subjects.length) details.append(node('p', 'cloud-note', 'No subjects assigned yet. Add school links and choose children under Subjects.'));
      for (const subject of subjects) {
        const start = [schedule.enabled ? schedule.start : '00:00', subject.scheduleStart || '00:00'].sort().at(-1);
        const end = [schedule.enabled ? schedule.end : '24:00', subject.scheduleEnd || '24:00'].sort()[0];
        const hours = start >= end ? 'Unavailable: subject hours do not overlap school hours'
          : start === '00:00' && end === '24:00' ? 'All day' : `${start}–${end}`;
        const row = node('div', 'cloud-day-subject'); row.append(node('strong', '', subject.title), node('span', '', hours));
        const edit = action(`Edit ${subject.title}`, () => editSubject(subject)); row.append(edit); details.append(row);
      }
    } else details.append(node('p', 'cloud-note', 'School links are closed on this date. An open-day exception uses the usual family and subject hours.'));
    const exception = state.exception;
    details.append(action(exception ? 'Edit this exception' : 'Add exception for this day', () => editException(selectedDate, exception)));
    details.append(node('p', 'cloud-note cloud-calendar-footnote', 'These are scheduled hours. A parent pause or computer awaiting approval can also keep school closed.'));
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
