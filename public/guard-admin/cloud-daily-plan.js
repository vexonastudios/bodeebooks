import { PLAN_GROUPS, dailyPlanCards, saveDailyPlan } from './cloud-daily-plan-model.js';
const make = (tag, cls = '', text = '') => { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; };
const icon = name => { const el = make('i'); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el; };
const action = (label, symbol, fn, cls = 'btn btn-secondary') => { const el = make('button', cls); el.type = 'button'; el.append(icon(symbol), document.createTextNode(label)); el.onclick = fn; return el; };
export function setupDailyPlan({ getSnapshot, mutate, navigate, endpoint = '/guard/dashboard/bridge/' }) {
  const stylesheet = make('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/guard-admin/cloud-daily-plan.css'; document.head.append(stylesheet);
  const nav = action('Daily plan', 'list-checks', () => navigate('daily-plan'), 'nav-item'); nav.dataset.tab = 'daily-plan';
  document.querySelector('.sidebar-nav .nav-item[data-tab="overview"]')?.after(nav);
  const section = make('section', 'tab-content'); section.id = 'tab-daily-plan'; section.setAttribute('aria-label', 'Daily plan');
  const head = make('div', 'tab-header'), title = make('h1', '', 'Daily plan'); title.prepend(icon('list-checks')); head.append(title, action('School calendar', 'calendar-days', () => navigate('calendar')));
  const controls = make('div', 'daily-plan-controls'), label = make('label', '', 'Plan for'), child = make('select', 'admin-select'); child.setAttribute('aria-label', 'Plan for child'); label.append(child);
  const save = action('Save plan', 'save', () => void commit(), 'btn btn-primary'), discard = action('Discard changes', 'undo-2', () => { changes.clear(); captured = structuredClone(getSnapshot()); cards = dailyPlanCards(captured, details, child.value); render(); });
  const status = make('p', 'daily-plan-status'); status.setAttribute('role', 'status');
  const retry = action('Reload plan', 'refresh-cw', () => void load());
  controls.append(label, status, retry, discard, save);
  const help = make('p', 'cloud-note', 'Drag activities into place, or use “Move to.” Each child has their own plan. Content approvals and activity on/off settings still apply.');
  const board = make('div', 'daily-plan-board'), available = make('div', 'daily-plan-available');
  section.append(head, help, controls, board, available); document.querySelector('.main-content').append(section);
  const shortcut = action('Daily plan', 'list-checks', () => navigate('daily-plan')); document.querySelector('#tab-overview .tab-header')?.append(shortcut);
  let active = false, loadedChild = null, captured = null, details = {}, cards = [], generation = 0, busy = false;
  const changes = new Map();
  function notify(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function updateControls() { save.disabled = busy || !changes.size; discard.hidden = !changes.size; child.disabled = busy; retry.disabled = busy || changes.size > 0; }
  function changed(card) { changes.set(card.key, structuredClone(card)); notify('Unsaved changes'); updateControls(); }
  function move(card, placement) {
    card.placement = placement;
    if (placement === 'scheduled' && !card.start) { card.start = '15:00'; card.end = '18:00'; }
    if (placement === 'school' && !card.portal && !card.assignedWork && !card.goal) card.goal = 15;
    changed(card); render();
    section.querySelector(`[data-plan-key="${CSS.escape(card.key)}"] select`)?.focus();
  }
  function field(text, input) { const label = make('label', 'daily-plan-field', text); label.append(input); return label; }
  function cardView(card) {
    const el = make('article', 'daily-plan-card'); el.dataset.planKey = card.key; el.draggable = !busy;
    el.addEventListener('dragstart', e => { if (e.target.closest('input,select,button,summary')) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', card.key); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); board.querySelectorAll('.drag-over').forEach(n => n.classList.remove('drag-over')); });
    const heading = make('div', 'daily-plan-card-title'); heading.append(icon(card.icon), make('strong', '', card.title), icon('grip-vertical')); el.append(heading);
    const summary = card.portal ? 'Finish school lessons' : card.assignedWork ? 'Finish assigned work · only when required' : card.placement === 'school' ? `${card.goal} minutes of schoolwork` : card.limitMinutes ? `${card.limitMinutes} minutes per day` : 'Uses your activity settings';
    el.append(make('p', 'daily-plan-card-summary', summary));
    if (card.start) el.append(make('p', 'daily-plan-hours', `${card.days.length === 7 ? 'Every day' : card.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')} · ${card.start}–${card.end}`));
    if (card.disabled) el.append(make('p', 'daily-plan-off', 'Turned off in child or activity settings'));
    const select = make('select', 'admin-select'); select.setAttribute('aria-label', `Move ${card.title} to`);
    for (const [id, name] of PLAN_GROUPS) { const option = make('option', '', name); option.value = id; select.append(option); } select.value = card.placement; select.onchange = () => move(card, select.value); select.disabled = busy;
    el.append(field('Move to', select));
    const settings = make('details', 'daily-plan-card-settings'), toggle = make('summary'); toggle.append(icon('sliders-horizontal'), document.createTextNode('Times & options')); settings.append(toggle);
    if (card.placement === 'school' && !card.portal && !card.assignedWork) {
      const goal = make('input', 'admin-input'); goal.type = 'number'; goal.min = '1'; goal.max = '480'; goal.value = card.goal; goal.onchange = () => { card.goal = Number(goal.value); changed(card); }; settings.append(field('Required minutes', goal));
    }
    if (card.limitMinutes !== null) {
      const limit = make('input', 'admin-input'); limit.type = 'number'; limit.min = '1'; limit.max = '480'; limit.value = card.limitMinutes; limit.onchange = () => { card.limitMinutes = Number(limit.value); changed(card); }; settings.append(field('Daily media minutes', limit));
    }
    const days = make('fieldset', 'daily-plan-days'); days.append(make('legend', '', 'Days'));
    for (const [d, name] of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].entries()) { const input = make('input'); input.type = 'checkbox'; input.checked = card.days.includes(d); input.onchange = () => { card.days = input.checked ? [...card.days, d].sort() : card.days.filter(n => n !== d); changed(card); }; days.append(field(name, input)); }
    settings.append(days);
    const hours = make('div', 'daily-plan-hours-inputs');
    for (const [key, text] of [['start','From'],['end','Until']]) { const input = make('input', 'admin-input'); input.type = 'time'; input.value = card[key] || ''; input.onchange = () => { card[key] = input.value || null; changed(card); }; hours.append(field(text, input)); }
    settings.append(hours);
    if (card.placement !== 'scheduled') settings.append(action('No time window', 'clock', () => { card.start = card.end = null; changed(card); render(); }));
    settings.append(make('p', 'cloud-note', card.placement === 'school' ? 'School calendar hours also apply.' : card.placement === 'after_school' ? 'Required work must finish, even during these hours.' : 'These hours work independently of the school calendar.'));
    if (card.module) settings.append(action('Activity settings', 'settings', () => { if (!changes.size || confirm('Keep this draft and open activity settings? Return to Daily plan to save it.')) navigate(card.module === 'art-studio' || card.module === 'typing' ? 'students' : card.module); }));
    el.append(settings); el.querySelectorAll('input,button').forEach(n => { n.disabled = busy; }); return el;
  }
  function render() {
    board.replaceChildren(); available.replaceChildren();
    for (const [id, title, description, symbol] of PLAN_GROUPS) {
      const column = make('div', 'daily-plan-column'); column.dataset.planGroup = id;
      const heading = make('h2'); heading.append(icon(symbol), document.createTextNode(title)); column.append(heading, make('p', 'cloud-note', description));
      const entries = cards.filter(c => c.placement === id), count = make('span', 'daily-plan-count', String(entries.length)); heading.append(count);
      for (const card of entries) column.append(cardView(card));
      if (!entries.length) column.append(make('p', 'daily-plan-empty', 'Drop an activity here'));
      column.ondragover = e => { if (!busy) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; column.classList.add('drag-over'); } };
      column.ondragleave = e => { if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over'); };
      column.ondrop = e => { e.preventDefault(); const card = cards.find(c => c.key === e.dataTransfer.getData('text/plain')); if (card && !busy) move(card, id); };
      if (id === 'anytime') { const tray = make('details', 'daily-plan-tray'); const heading = make('summary', '', `${title} · ${entries.length} activities`); tray.append(heading, column); available.append(tray); } else board.append(column);
    }
    updateControls(); window.lucide?.createIcons();
  }
  async function load() {
    const snap = getSnapshot(); if (!snap || !child.value || changes.size) return;
    const request = ++generation; busy = true; updateControls(); notify('Loading plan…');
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'daily-plan', studentId: child.value }), signal: AbortSignal.timeout(15000) });
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Could not load this plan.'); if (request !== generation) return;
      if (data.rulesRevision !== snap.rules.revision) throw Error('Settings changed. Refresh the dashboard, then reopen Daily plan.');
      captured = structuredClone(snap); details = data; loadedChild = child.value; cards = dailyPlanCards(captured, details, loadedChild); notify('Choose activities, then save your plan.');
    } catch (error) { if (request !== generation) return; cards = []; captured = null; loadedChild = null; notify(error.message, true); }
    finally { if (request === generation) { busy = false; render(); } }
  }
  async function commit() {
    if (!changes.size || busy) return;
    try {
      const payload = saveDailyPlan(captured, loadedChild, [...changes.values()]); busy = true; render(); notify('Saving plan…');
      await mutate('save-subjects', payload); changes.clear(); busy = false; await load(); notify('Plan saved. Connected computers receive the change automatically.');
    } catch (error) { busy = false; notify(error.message, true); render(); }
  }
  child.onchange = () => { if (changes.size && !confirm('Discard this child’s unsaved changes?')) { child.value = loadedChild; return; } changes.clear(); cards = []; void load(); };
  return {
    update() { const snapshot = getSnapshot(); if (!snapshot) return; const selected = child.value; child.replaceChildren(); for (const student of snapshot.students.filter(s => !s.archived_at)) { const option = make('option', '', student.name); option.value = student.id; child.append(option); } if ([...child.options].some(o => o.value === selected)) child.value = selected; if (active && !captured && !busy) void load(); },
    setActive(value) { active = value; if (active && !changes.size && !busy) void load(); }
  };
}
