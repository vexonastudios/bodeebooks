import { schoolHoursForm } from './cloud-school-hours-form.js?v=20261125-term';

// Keep the editor mounted during background refreshes. Only Save writes the
// draft, using the rules revision from the moment the parent started editing.
export function setupCalendarSettings({ getSnapshot, saveSchedule }) {
  const edit = document.getElementById('edit-school-schedule');
  const header = edit.closest('.cloud-calendar-header');
  const card = document.createElement('section');
  card.className = 'cloud-calendar-settings';
  const title = document.createElement('h2');
  title.id = 'cloud-calendar-settings-title';
  card.setAttribute('aria-labelledby', title.id);
  const note = document.createElement('p');
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.className = 'cloud-calendar-save-status';
  const draft = document.createElement('div');
  draft.id = 'cloud-calendar-settings-fields';
  draft.hidden = true;
  edit.setAttribute('aria-controls', draft.id);
  edit.setAttribute('aria-expanded', 'false');
  edit.className = 'btn btn-primary';
  card.append(title, note, edit, status, draft);
  header.after(card);

  function render() {
    const schedule = window.BODEE_CLOUD_SCHEDULE.normalizeCloudSchoolSchedule(getSnapshot()?.rules.schedule);
    const date = value => new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeZone:'UTC'}).format(new Date(value + 'T12:00:00Z'));
    let term = 'Year-round';
    if (schedule.termStart) {
      term = schedule.termEnd ? `${date(schedule.termStart)} – ${date(schedule.termEnd)}` : `Starts ${date(schedule.termStart)} · End date open`;
      if (schedule.schoolDayCount) term = `${schedule.schoolDayCount} school days · Projected last day ${date(schedule.termEnd)}`;
    }
    document.getElementById('cloud-school-term-summary').textContent = term;
    title.textContent = schedule.enabled || schedule.termStart ? 'School dates & hours' : 'When does school start?';
    if (schedule.enabled) {
      note.textContent = `${term} · ${schedule.start}–${schedule.end} (${schedule.timeZone.replaceAll('_', ' ')}). Attendance coins are ${schedule.attendance?.enabled ? 'on' : 'off'}.`;
    } else if (schedule.termStart) {
      note.textContent = `${term}. Set school days and hours when you’re ready.`;
    } else {
      note.textContent = 'Choose your first school day and daily hours. You can also set an on-time reward or a late coin deduction.';
    }
    edit.textContent = schedule?.enabled ? 'Edit dates, hours & coins' : 'Set school dates & hours';
  }

  function close() {
    draft.replaceChildren();
    draft.hidden = true;
    edit.hidden = false;
    edit.setAttribute('aria-expanded', 'false');
    render();
    edit.focus();
  }

  edit.addEventListener('click', () => {
    if (!draft.hidden || !getSnapshot()) return;
    const captured = { rules: structuredClone(getSnapshot().rules) };
    status.textContent = '';
    const startSetup = !captured.rules.schedule?.enabled;
    const fields = schoolHoursForm(captured.rules.schedule, { startSetup });
    const save = document.createElement('button');
    save.type = 'button'; save.className = 'btn btn-primary'; save.dataset.cloudMutation = 'true';
    const enabled = fields.form.querySelector('[name="enabled"]');
    function labelSave() {
      save.textContent = startSetup && enabled.checked ? 'Save & turn on calendar' : 'Save calendar';
    }
    labelSave();
    enabled.addEventListener('change', labelSave);
    const cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn btn-secondary'; cancel.textContent = 'Cancel';
    cancel.addEventListener('click', close);
    const error = document.createElement('p');
    error.setAttribute('role', 'alert'); error.className = 'setup-error';
    const actions = document.createElement('div'); actions.className = 'cloud-actions';
    actions.append(save, cancel);
    save.addEventListener('click', async () => {
      if (draft.inert) return;
      error.textContent = '';
      try {
        const schedule = fields.read();
        draft.inert = true;
        await saveSchedule(captured, schedule);
        close();
        status.textContent = 'Calendar saved.';
      } catch (failure) {
        error.textContent = failure.message;
      } finally {
        draft.inert = false;
      }
    });
    draft.replaceChildren(fields.form, error, actions);
    draft.hidden = false;
    edit.hidden = true;
    edit.setAttribute('aria-expanded', 'true');
    fields.form.querySelector('[name="termStart"]').focus();
  });
  render();
  return { render };
}
