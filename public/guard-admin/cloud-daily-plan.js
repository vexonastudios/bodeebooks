import { PLAN_GROUPS, dailyPlanCards, saveDailyPlan, familyPlanCards, templateFromCards, applyFamilyPlan } from './cloud-daily-plan-model.js';
const make = (tag, cls = '', text = '') => { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; };
const icon = name => { const el = make('i'); el.dataset.lucide = name; el.setAttribute('aria-hidden', 'true'); return el; };
const action = (label, symbol, fn, cls = 'btn btn-secondary') => { const el = make('button', cls); el.type = 'button'; el.append(icon(symbol), document.createTextNode(label)); el.onclick = fn; return el; };
export function setupDailyPlan({ getSnapshot, mutate, navigate, endpoint = '/guard/dashboard/bridge/' }) {
  const stylesheet = make('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/guard-admin/cloud-daily-plan.css?v=20260911-family'; document.head.append(stylesheet);
  const nav = action('Daily plan', 'list-checks', () => navigate('daily-plan'), 'nav-item'); nav.dataset.tab = 'daily-plan';
  document.querySelector('.sidebar-nav .nav-item[data-tab="overview"]')?.after(nav);
  const section = make('section', 'tab-content'); section.id = 'tab-daily-plan'; section.setAttribute('aria-label', 'Daily plan');
  const head = make('div', 'tab-header'), title = make('h1', '', 'Daily plan'); title.prepend(icon('list-checks')); head.append(title, action('School calendar', 'calendar-days', () => navigate('calendar')));
  const controls = make('div', 'daily-plan-controls'), label = make('label', '', 'Plan for'), child = make('select', 'admin-select'); child.setAttribute('aria-label', 'Plan for child'); label.append(child);
  const save = action('Save plan', 'save', () => void commit(), 'btn btn-primary'), discard = action('Discard changes', 'undo-2', () => { changes.clear(); void load(); });
  const status = make('p', 'daily-plan-status'); status.setAttribute('role', 'status');
  const retry = action('Reload plan', 'refresh-cw', () => void load());
  controls.append(label, status, retry, discard, save);
  const help = make('p', 'cloud-note', 'Drag an activity to a column, or choose “Move to.” Set up your family default once, then customize each child.');
  const family = make('div', 'daily-plan-family'), familyCopy = make('div'), familyTitle = make('strong'), familyText = make('p');
  familyTitle.append(icon('users-round'), document.createTextNode('Family default')); familyCopy.append(familyTitle, familyText);
  const editDefault = action('Edit family default', 'layout-template', () => selectPlan('family'));
  const copyDefault = action('Use this plan as default', 'copy', () => {
    if (busy || !captured) return;
    const draft = templateFromCards(cards); child.value = loadedChild = 'family';
    cards = familyPlanCards(captured, draft); changes.clear(); changes.set('family', true); render();
    notify('Copied into a family draft. Save default, then apply it to your children.');
  });
  const applyDefault = action('Apply default…', 'users-round', () => reviewApply(), 'btn btn-primary');
  const familyActions = make('div', 'daily-plan-family-actions'); familyActions.append(editDefault, copyDefault, applyDefault); family.append(familyCopy, familyActions);
  const layout = make('div', 'daily-plan-layout'), board = make('div', 'daily-plan-board'), available = make('div', 'daily-plan-available');
  layout.append(available, board);
  section.append(head, help, family, controls, layout); document.querySelector('.main-content').append(section);
  const shortcut = action('Daily plan', 'list-checks', () => navigate('daily-plan')); document.querySelector('#tab-overview .tab-header')?.append(shortcut);
  let active = false, loadedChild = null, captured = null, details = {}, cards = [], generation = 0, busy = false;
  const changes = new Map(), groups = new Map(), openOptions = new Set();
  const search = make('input', 'admin-input'); search.type = 'search'; search.placeholder = 'Find an activity…'; search.setAttribute('aria-label', 'Find activities without a school requirement'); search.oninput = () => render();
  for (const [id, title, description, symbol] of PLAN_GROUPS) {
    const column = make('div', 'daily-plan-column'); column.dataset.planGroup = id;
    const heading = make('h2'), count = make('span', 'daily-plan-count'); heading.id = `daily-plan-heading-${id}`;
    heading.append(icon(symbol), document.createTextNode(title), count); column.append(heading, make('p', 'cloud-note', description));
    if (id === 'anytime') { const find = make('label', 'daily-plan-search'); find.append(icon('search'), search); column.append(find); }
    const list = make('div', 'daily-plan-list'); list.setAttribute('role', 'region'); list.setAttribute('aria-labelledby', heading.id); list.tabIndex = 0;
    column.append(list); groups.set(id, { column, list, count });
    column.ondragover = e => { if (!busy && e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; column.classList.add('drag-over'); } };
    column.ondragleave = e => { if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over'); };
    column.ondrop = e => { e.preventDefault(); clearDrag(); const card = cards.find(c => c.key === e.dataTransfer.getData('text/plain')); if (card && !busy) move(card, id); };
    (id === 'anytime' ? available : board).append(column);
  }
  function clearDrag() { layout.querySelectorAll('.drag-over,.dragging').forEach(n => n.classList.remove('drag-over', 'dragging')); }
  function notify(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function updateControls() {
    const isFamily = child.value === 'family', hasDefault = !!captured?.rules.dailyPlanTemplate;
    save.replaceChildren(icon('save'), document.createTextNode(isFamily ? 'Save default' : 'Save plan'));
    save.disabled = busy || !captured || (!changes.size && (!isFamily || hasDefault)); discard.hidden = !changes.size; child.disabled = busy; retry.disabled = busy || changes.size > 0;
    editDefault.hidden = isFamily; editDefault.disabled = busy; copyDefault.hidden = isFamily; copyDefault.disabled = busy || !captured;
    applyDefault.disabled = busy || !hasDefault || changes.size > 0 || !getSnapshot()?.students.some(s => !s.archived_at);
    familyText.textContent = isFamily
      ? 'Save a reusable plan, then apply it to all or selected children. Changes here leave their current plans in place until you apply them.'
      : 'Start with the family default, then adjust this child. Each child keeps their own school websites, assigned work and activity switches.';
    window.lucide?.createIcons();
  }
  function changed(card) { changes.set(card.key, structuredClone(card)); notify('Unsaved changes'); updateControls(); }
  function move(card, placement, focus = false) {
    if (busy || card.placement === placement) return;
    card.placement = placement;
    if (placement === 'scheduled' && !card.start) { card.start = '15:00'; card.end = '18:00'; }
    if (placement === 'school' && !card.portal && !card.assignedWork && !card.goal) card.goal = 15;
    changed(card); render();
    notify(`${card.title} moved to ${PLAN_GROUPS.find(group => group[0] === placement)[1]}. Unsaved changes.`);
    if (focus) {
      const select = section.querySelector(`[data-plan-key="${CSS.escape(card.key)}"] select`);
      (select || search).focus({ preventScroll: true });
      if (select) { const list = groups.get(placement).list, bounds = list.getBoundingClientRect(), target = select.getBoundingClientRect(); if (target.bottom > bounds.bottom) list.scrollTop += target.bottom - bounds.bottom + 12; else if (target.top < bounds.top) list.scrollTop -= bounds.top - target.top + 12; }
    }
  }
  function field(text, input) { const label = make('label', 'daily-plan-field', text); label.append(input); return label; }
  function cardView(card) {
    const el = make('article', 'daily-plan-card'); el.dataset.planKey = card.key; el.draggable = !busy;
    el.addEventListener('dragstart', e => { if (e.target.closest('input,select,button,summary')) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', card.key); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
    el.addEventListener('dragend', clearDrag);
    const heading = make('div', 'daily-plan-card-title'); heading.append(icon(card.icon), make('strong', '', card.title), icon('grip-vertical')); el.append(heading);
    const summary = card.key === 'school' ? 'Uses each child’s assigned school and lesson goals' : card.portal ? 'Finish school lessons' : card.assignedWork ? 'Finish assigned work · only when required' : card.placement === 'school' ? `${card.goal} minutes of schoolwork` : card.limitMinutes ? `${card.limitMinutes} minutes per day` : 'Uses your activity settings';
    if (summary !== 'Uses your activity settings') el.append(make('p', 'daily-plan-card-summary', summary));
    if (card.start) el.append(make('p', 'daily-plan-hours', `${card.days.length === 7 ? 'Every day' : card.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')} · ${card.start}–${card.end}`));
    if (card.disabled) el.append(make('p', 'daily-plan-off', 'Turned off in child or activity settings'));
    const select = make('select', 'admin-select'); select.setAttribute('aria-label', `Move ${card.title} to`);
    const prompt = make('option', '', 'Move to…'); prompt.value = ''; prompt.disabled = true; select.append(prompt);
    for (const [id, name] of PLAN_GROUPS) { const option = make('option', '', name); option.value = id; option.disabled = id === card.placement; select.append(option); } select.value = ''; select.onchange = () => move(card, select.value, true); select.disabled = busy;
    const moveField = field('', select); moveField.classList.add('daily-plan-move'); el.append(moveField);
    const settings = make('details', 'daily-plan-card-settings'), toggle = make('summary'); toggle.append(icon('sliders-horizontal'), document.createTextNode('Times & options')); settings.append(toggle);
    settings.open = openOptions.has(card.key);
    settings.ontoggle = () => { if (settings.isConnected) { if (settings.open) openOptions.add(card.key); else openOptions.delete(card.key); } };
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
    if (card.module) settings.append(action('Activity settings', 'settings', () => { if (!changes.size || confirm('Keep this draft and open activity settings? Return to Daily plan to save it.')) navigate(card.module === 'games' ? 'family-games' : card.module === 'art-studio' || card.module === 'typing' ? 'students' : card.module); }));
    el.append(settings); el.querySelectorAll('input,button').forEach(n => { n.disabled = busy; }); return el;
  }
  function render() {
    for (const el of section.querySelectorAll('.daily-plan-card-settings')) { const key = el.closest('[data-plan-key]').dataset.planKey; if (el.open) openOptions.add(key); else openOptions.delete(key); }
    for (const [id, { list, count }] of groups) {
      const scrollTop = list.scrollTop, entries = cards.filter(c => c.placement === id), query = id === 'anytime' ? search.value.trim().toLocaleLowerCase() : '';
      const visible = entries.filter(card => card.title.toLocaleLowerCase().includes(query));
      count.textContent = query ? `${visible.length}/${entries.length}` : String(entries.length);
      list.replaceChildren(...visible.map(cardView));
      if (!visible.length) list.append(make('p', 'daily-plan-empty', query ? 'No matching activities. Try another name.' : 'Drop an activity here'));
      list.scrollTop = scrollTop;
    }
    updateControls(); window.lucide?.createIcons();
  }
  async function load() {
    const snap = getSnapshot(); if (!snap || !child.value || changes.size) return;
    const request = ++generation; busy = true; updateControls(); notify('Loading plan…');
    try {
      if (child.value === 'family') {
        captured = structuredClone(snap); details = {}; loadedChild = 'family'; cards = familyPlanCards(captured);
        notify(snap.rules.dailyPlanTemplate ? 'Edit the default, then choose who receives it.' : 'No default saved yet. Arrange this plan, or choose a child and copy their plan.');
        return;
      }
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'daily-plan', studentId: child.value }), signal: AbortSignal.timeout(15000) });
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Could not load this plan.'); if (request !== generation) return;
      if (data.rulesRevision !== snap.rules.revision) throw Error('Settings changed. Refresh the dashboard, then reopen Daily plan.');
      captured = structuredClone(snap); details = data; loadedChild = child.value; cards = dailyPlanCards(captured, details, loadedChild); notify('Choose activities, then save your plan.');
    } catch (error) { if (request !== generation) return; cards = []; captured = null; loadedChild = null; notify(error.message, true); }
    finally { if (request === generation) { busy = false; render(); } }
  }
  async function commit() {
    if (save.disabled || busy) return;
    try {
      const isFamily = loadedChild === 'family';
      const payload = isFamily ? { revision: captured.rules.revision, subjects: captured.rules.subjects, dailyPlanTemplate: templateFromCards(cards) }
        : saveDailyPlan(captured, loadedChild, [...changes.values()]);
      busy = true; render(); notify(isFamily ? 'Saving family default…' : 'Saving plan…');
      await mutate('save-subjects', payload); changes.clear(); busy = false; await load();
      notify(isFamily ? 'Family default saved. Apply it to all or selected children when ready.' : 'Plan saved. Connected computers receive the change automatically.');
    } catch (error) { busy = false; notify(error.message, true); render(); }
  }
  function selectPlan(value) {
    if (changes.size && !confirm('Discard this plan’s unsaved changes?')) { child.value = loadedChild; return; }
    child.value = value; changes.clear(); cards = []; openOptions.clear(); search.value = ''; void load();
  }
  child.onchange = () => selectPlan(child.value);
  function reviewApply() {
    if (applyDefault.disabled) return;
    const review = structuredClone(captured), students = review.students.filter(s => !s.archived_at);
    const selected = new Set(loadedChild === 'family' ? students.map(s => s.id) : [loadedChild]);
    const dialog = make('dialog', 'daily-plan-apply'); dialog.setAttribute('aria-labelledby', 'daily-plan-apply-title');
    const title = make('h2', '', 'Apply family default'); title.id = 'daily-plan-apply-title'; title.prepend(icon('users-round'));
    const description = make('p', '', 'This replaces daily-plan choices for the selected children. Their school websites, assignments, activity switches and earned time stay as they are. You can customize each child afterward.');
    const choices = make('div', 'daily-plan-children'), info = make('p', 'daily-plan-status'); info.setAttribute('role', 'status');
    const buttons = make('div', 'daily-plan-apply-actions'), cancel = action('Cancel', 'x', () => dialog.close()), accept = action('Apply', 'check', () => void apply(), 'btn btn-primary');
    const all = action('Select all', 'check-check', () => { students.forEach(s => selected.add(s.id)); redraw(); });
    const none = action('Clear selection', 'minus', () => { selected.clear(); redraw(); });
    const selectionActions = make('div', 'daily-plan-apply-actions'); selectionActions.append(all, none);
    function redraw() {
      choices.replaceChildren(...students.map(student => {
        const label = make('label', 'daily-plan-child-choice'), input = make('input'); input.type = 'checkbox'; input.checked = selected.has(student.id);
        input.onchange = () => { if (input.checked) selected.add(student.id); else selected.delete(student.id); updateCount(); };
        label.append(input, icon('user-round'), document.createTextNode(student.name)); return label;
      }));
      updateCount(); window.lucide?.createIcons();
    }
    function updateCount() { accept.replaceChildren(icon('check'), document.createTextNode(`Apply to ${selected.size} ${selected.size === 1 ? 'child' : 'children'}`)); accept.disabled = !selected.size; window.lucide?.createIcons(); }
    async function apply() {
      if (busy || !selected.size) return;
      try {
        const payload = applyFamilyPlan(review, review.rules.dailyPlanTemplate, [...selected]);
        busy = true; dialog.querySelectorAll('input,button').forEach(el => { el.disabled = true; }); render(); info.textContent = 'Applying plan…';
        await mutate('save-subjects', payload); const count = selected.size; busy = false; dialog.close(); await load();
        notify(`Default applied to ${count} ${count === 1 ? 'child' : 'children'}. Choose a child to customize their plan.`);
      } catch (error) {
        busy = false; info.textContent = error.message; info.dataset.error = 'true';
        dialog.querySelectorAll('input,button').forEach(el => { el.disabled = false; }); updateCount(); render();
      }
    }
    buttons.append(cancel, accept); dialog.append(title, description, selectionActions, choices, info, buttons);
    dialog.oncancel = event => { if (busy) event.preventDefault(); };
    dialog.onclose = () => { dialog.remove(); applyDefault.focus(); };
    section.append(dialog); redraw(); dialog.showModal();
  }
  return {
    update() { const snapshot = getSnapshot(); if (!snapshot) return; const selected = child.value; child.replaceChildren(); for (const student of snapshot.students.filter(s => !s.archived_at)) { const option = make('option', '', student.name); option.value = student.id; child.append(option); } const option = make('option', '', 'Family default · all children'); option.value = 'family'; child.append(option); if ([...child.options].some(o => o.value === selected)) child.value = selected; if (active && !captured && !busy) void load(); },
    setActive(value) { active = value; if (active && !changes.size && !busy) void load(); }
  };
}
