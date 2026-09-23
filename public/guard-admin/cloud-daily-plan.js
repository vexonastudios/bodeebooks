import { PLAN_GROUPS, dailyPlanCards, saveDailyPlan, familyPlanCards, templateFromCards, applyFamilyPlan, differsFromFamily, movePlanCard, useSchoolWeekdays, isSchoolWeekdays } from './cloud-daily-plan-model.js';
import { activityAccent } from './cloud-activity-colors.js';
const make = (tag, cls = '', text = '') => { const el = document.createElement(tag); el.className = cls; el.textContent = text; return el; };
const requiredDaysText = card => isSchoolWeekdays(card.days) ? 'Required Mon–Fri · weekends optional' : `Required ${card.days.length === 7 ? 'every day' : card.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}`;
const icon = name => {
  const el = make('i');
  el.dataset.lucide = name;
  el.setAttribute('aria-hidden', 'true');
  return el;
};
const action = (label, symbol, fn, cls = 'btn btn-secondary') => {
  const el = make('button', cls);
  const glyph = icon(symbol);
  glyph.classList.add('nav-icon');
  el.type = 'button';
  el.append(glyph, document.createTextNode(label));
  el.onclick = fn;
  return el;
};
export function setupDailyPlan({ getSnapshot, mutate, navigate, editSubject, chooseSchool, endpoint = '/guard/dashboard/bridge/' }) {
  const stylesheet = make('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/guard-admin/cloud-daily-plan.css?v=20260923-parent-setup'; document.head.append(stylesheet);
  const nav = action('Daily plan', 'list-checks', () => navigate('daily-plan'), 'nav-item'); nav.dataset.tab = 'daily-plan';
  document.querySelector('.sidebar-nav .nav-item[data-tab="overview"]')?.after(nav);
  const section = make('section', 'tab-content'); section.id = 'tab-daily-plan'; section.setAttribute('aria-label', 'Daily plan');
  const head = make('div', 'tab-header'), title = make('h1', '', 'Daily plan'); title.prepend(icon('list-checks')); head.append(title, action('School calendar', 'calendar-days', () => navigate('calendar')));
  const controls = make('div', 'daily-plan-controls'), label = make('label', '', 'Plan for'), child = make('select', 'admin-select'); child.setAttribute('aria-label', 'Plan for child'); label.append(child);
  const save = action('Save plan', 'save', () => void commit(), 'btn btn-primary'), discard = action('Discard changes', 'undo-2', () => { changes.clear(); void load(); });
  const status = make('p', 'daily-plan-status'); status.setAttribute('role', 'status');
  const retry = action('Reload plan', 'refresh-cw', () => void load());
  controls.append(label, status, retry, discard, save);
  const help = make('p', 'cloud-note', 'Choose what your children can use here. Drag activities, or use “Move to.” Put anything you do not want them using in Not allowed.');
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
  const layout = make('div', 'daily-plan-layout'), board = make('div', 'daily-plan-board'), available = make('div', 'daily-plan-available'), blocked = make('div', 'daily-plan-blocked');
  layout.append(available, board);
  const catalog = make('div', 'daily-plan-catalog-tools');
  const differences = make('input'); differences.type = 'checkbox'; differences.onchange = () => render();
  const differencesLabel = make('label', 'daily-plan-differences', 'Show only differences from family plan'); differencesLabel.prepend(differences);
  const preview = action('Preview child activities', 'eye', () => showPlanPreview(cards, getSnapshot().students.find(s => s.id === loadedChild)?.name || 'Family'));
  catalog.append(differencesLabel, preview);
  const school = action('Choose school', 'school', openSchoolSetup);
  catalog.append(school);
  if (editSubject) catalog.append(action('Add school website or subject', 'plus', () => {
    if (changes.size) { notify('Save or discard your plan before adding a subject.', true); return; }
    editSubject();
  }));
  section.append(head, help, family, controls, catalog, layout); document.querySelector('.main-content').append(section);
  const shortcut = action('Daily plan', 'list-checks', () => navigate('daily-plan'));
  const overviewActions = document.querySelector('#overview-actions');
  (overviewActions || document.querySelector('#tab-overview .tab-header'))?.append(shortcut);
  let active = false, loadedChild = null, captured = null, details = {}, cards = [], generation = 0, busy = false;
  const changes = new Map(), groups = new Map(), openOptions = new Set();
  const search = make('input', 'admin-input'); search.type = 'search'; search.placeholder = 'Find any activity, including Quizlet…'; search.setAttribute('aria-label', 'Find an activity in any column'); search.oninput = () => render();
  const find = make('label', 'daily-plan-search'); find.append(icon('search'), search); catalog.prepend(find);
  for (const [id, title, description, symbol] of PLAN_GROUPS) {
    const column = make('div', 'daily-plan-column'); column.dataset.planGroup = id;
    const heading = make('h2'), count = make('span', 'daily-plan-count'); heading.id = `daily-plan-heading-${id}`;
    heading.append(icon(symbol), document.createTextNode(title), count); column.append(heading, make('p', 'cloud-note', description));
    const weekdays = id === 'school' ? action('Use Mon–Fri for school', 'calendar-days', () => {
      if (busy) return;
      const updated = useSchoolWeekdays(cards);
      for (const card of updated) changed(card);
      render();
      notify('School is required Monday–Friday in this draft. Save to keep this change.');
    }, 'btn btn-secondary daily-plan-weekdays') : null;
    if (weekdays) column.append(weekdays);
    const list = make('div', 'daily-plan-list'); list.setAttribute('role', 'region'); list.setAttribute('aria-labelledby', heading.id); list.tabIndex = 0;
    column.append(list); groups.set(id, { column, list, count, weekdays });
    column.ondragover = e => { if (!busy && e.dataTransfer.types.includes('text/plain')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; column.classList.add('drag-over'); } };
    column.ondragleave = e => { if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over'); };
    column.ondrop = e => { e.preventDefault(); clearDrag(); const card = cards.find(c => c.key === e.dataTransfer.getData('text/plain')); if (card && !busy) move(card, id); };
    (id === 'anytime' ? available : id === 'blocked' ? blocked : board).append(column);
  }
  available.append(blocked);
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
      : 'Apply the family plan to this child, then change only what they need. Applying is a saved copy; later family edits do not overwrite their choices.';
    differencesLabel.hidden = isFamily || !hasDefault;
    preview.disabled = busy || !captured;
    preview.hidden = isFamily;
    const weekdays = groups.get('school')?.weekdays;
    if (weekdays) weekdays.disabled = busy || !cards.some(card => card.placement === 'school' && !isSchoolWeekdays(card.days));
    if (!isFamily && hasDefault) {
      const count = cards.filter(card => differsFromFamily(card, captured.rules.dailyPlanTemplate)).length;
      familyTitle.replaceChildren(icon('users-round'), document.createTextNode(count ? `${count} ${count === 1 ? 'activity differs' : 'activities differ'} from family plan` : 'Matches family plan'));
    } else familyTitle.replaceChildren(icon('users-round'), document.createTextNode('Family default'));
    window.lucide?.createIcons();
  }
  function changed(card) { changes.set(card.key, structuredClone(card)); notify('Unsaved changes'); updateControls(); }
  function openSchoolSetup() {
    if (busy) return;
    if (changes.size) { notify('Save or discard your Daily Plan changes before changing school websites.', true); return; }
    if (chooseSchool) { chooseSchool(loadedChild === 'family' ? null : loadedChild); return; }
    navigate('students');
    const panel = document.getElementById('family-school-setup');
    if (panel) { panel.open = true; panel.scrollIntoView({ block: 'start' }); panel.querySelector('summary')?.focus(); }
  }
  function move(card, placement, focus = false) {
    if (busy || card.placement === placement) return;
    movePlanCard(card, placement);
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
    const isBlocked = card.placement === 'blocked';
    const alwaysOpen = !isBlocked && card.placement !== 'scheduled' && (card.alwaysOpen ?? card.placement === 'school');
    const el = make('article', 'daily-plan-card'); el.dataset.planKey = card.key; el.draggable = !busy;
    el.style.setProperty('--plan-accent', activityAccent(card));
    el.addEventListener('dragstart', e => { if (e.target.closest('input,select,button,summary')) { e.preventDefault(); return; } e.dataTransfer.setData('text/plain', card.key); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
    el.addEventListener('dragend', clearDrag);
    const heading = make('div', 'daily-plan-card-title'); heading.append(icon(card.icon), make('strong', '', card.title), icon('grip-vertical')); el.append(heading);
    const summary = isBlocked ? card.preset === 'quizlet' ? 'Optional flashcards and study sets. Move to allow.' : 'Hidden from the child; saved work is kept.' : card.key === 'school' ? 'All school websites assigned to each child, such as Abeka, BJU and a separate math site.' : card.portal ? 'This website has its own required days and completion.' : card.assignedWork ? 'Finish assigned work · only when required' : card.placement === 'school' ? `${card.goal} minutes of schoolwork` : card.limitMinutes ? `${card.limitMinutes} minutes per day` : 'Uses your activity settings';
    if (summary !== 'Uses your activity settings') el.append(make('p', 'daily-plan-card-summary', summary));
    if (card.placement === 'school') el.append(make('p', 'daily-plan-required-days', requiredDaysText(card)));
    if (!isBlocked && card.module === 'math-coach') el.append(make('p', 'cloud-note', 'AI permission and question allowance still apply in Math Coach settings.'));
    if (alwaysOpen) el.append(make('p', 'daily-plan-hours', 'Always open · no time cutoff'));
    else if (!isBlocked && card.start) el.append(make('p', 'daily-plan-hours', `${card.days.length === 7 ? 'Every day' : card.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')} · ${card.start}–${card.end}`));
    if (isBlocked && (card.disabled || card.globallyDisabled)) el.append(make('p', 'daily-plan-off', 'Move to an allowed group to enable it for this child.'));
    const select = make('select', 'admin-select'); select.setAttribute('aria-label', `Move ${card.title} to`);
    const prompt = make('option', '', 'Move to…'); prompt.value = ''; prompt.disabled = true; select.append(prompt);
    for (const [id, name] of PLAN_GROUPS) { const option = make('option', '', name); option.value = id; option.disabled = id === card.placement; select.append(option); } select.value = ''; select.onchange = () => move(card, select.value, true); select.disabled = busy;
    const moveField = field('', select); moveField.classList.add('daily-plan-move'); el.append(moveField);
    if (card.portal) {
      if (card.key === 'school') el.append(make('p', 'daily-plan-school-help', 'This plan sets school requirements and timing. Choose each child’s website in Students → Your children’s schools.'));
      el.append(action(card.key === 'school' ? 'Set websites for each child' : 'Manage school websites', 'school', openSchoolSetup, 'btn btn-secondary daily-plan-school-link'));
    }
    if (isBlocked) return el;
    const settings = make('details', 'daily-plan-card-settings'), toggle = make('summary'); toggle.append(icon('sliders-horizontal'), document.createTextNode('Times & options')); settings.append(toggle);
    settings.open = openOptions.has(card.key);
    settings.ontoggle = () => { if (settings.isConnected) { if (settings.open) openOptions.add(card.key); else openOptions.delete(card.key); } };
    if (card.placement === 'school' && !card.portal && !card.assignedWork) {
      const goal = make('input', 'admin-input'); goal.type = 'number'; goal.min = '1'; goal.max = '480'; goal.value = card.goal; goal.onchange = () => { card.goal = Number(goal.value); changed(card); }; settings.append(field('Required minutes', goal));
    }
    if (card.limitMinutes !== null) {
      const limit = make('input', 'admin-input'); limit.type = 'number'; limit.min = '1'; limit.max = '480'; limit.value = card.limitMinutes; limit.onchange = () => { card.limitMinutes = Number(limit.value); changed(card); }; settings.append(field('Daily media minutes', limit));
    }
    const days = make('fieldset', 'daily-plan-days'); days.append(make('legend', '', card.placement === 'school' ? 'Required work days' : 'Days'));
    for (const [d, name] of ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].entries()) { const input = make('input'); input.type = 'checkbox'; input.checked = card.days.includes(d); input.onchange = () => { card.days = input.checked ? [...card.days, d].sort() : card.days.filter(n => n !== d); const summary = el.querySelector('.daily-plan-required-days'); if (summary) summary.textContent = requiredDaysText(card); changed(card); }; days.append(field(name, input)); }
    settings.append(days);
    const hours = make('div', 'daily-plan-hours-inputs');
    for (const [key, text] of [['start','From'],['end','Until']]) { const input = make('input', 'admin-input'); input.type = 'time'; input.value = card[key] || ''; input.onchange = () => { card[key] = input.value || null; changed(card); }; hours.append(field(text, input)); }
    if (!alwaysOpen) settings.append(hours);
    if (!alwaysOpen && card.placement !== 'scheduled') settings.append(action('No time window', 'clock', () => { card.start = card.end = null; changed(card); render(); }));
    settings.append(make('p', 'cloud-note', alwaysOpen ? 'School remains available on days off. These days only decide when work is required; after-school activities do not wait for optional work.' : card.placement === 'school' ? 'School calendar hours also apply.' : card.placement === 'after_school' ? 'Waits for required work on school days. On days off, only your activity hours and daily limits apply.' : 'These hours work independently of the school calendar.'));
    if (card.module) settings.append(action('Activity settings', 'settings', () => { if (!changes.size || confirm('Keep this draft and open activity settings? Return to Daily plan to save it.')) navigate(card.module === 'games' ? 'family-games' : card.module === 'art-studio' || card.module === 'typing' ? 'students' : card.module); }));
    el.append(settings); el.querySelectorAll('input,button').forEach(n => { n.disabled = busy; }); return el;
  }
  function render() {
    for (const el of section.querySelectorAll('.daily-plan-card-settings')) { const key = el.closest('[data-plan-key]').dataset.planKey; if (el.open) openOptions.add(key); else openOptions.delete(key); }
    for (const [id, { list, count, weekdays }] of groups) {
      const scrollTop = list.scrollTop, entries = cards.filter(c => c.placement === id), query = search.value.trim().toLocaleLowerCase();
      const visible = entries.filter(card => card.title.toLocaleLowerCase().includes(query) && (child.value === 'family' || !differences.checked || !captured?.rules.dailyPlanTemplate || differsFromFamily(card, captured.rules.dailyPlanTemplate)));
      count.textContent = query ? `${visible.length}/${entries.length}` : String(entries.length);
      if (weekdays) weekdays.disabled = busy || !entries.some(card => !isSchoolWeekdays(card.days));
      list.replaceChildren(...visible.map(cardView));
      if (!visible.length) list.append(make('p', 'daily-plan-empty', differences.checked && child.value !== 'family' ? 'No differences in this group.' : query ? 'No matching activities. Try another name.' : 'Drop an activity here'));
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
    child.value = value; changes.clear(); cards = []; openOptions.clear(); search.value = ''; differences.checked = false; void load();
  }
  child.onchange = () => selectPlan(child.value);
  function reviewApply() {
    if (applyDefault.disabled) return;
    const review = structuredClone(captured), students = review.students.filter(s => !s.archived_at);
    const selected = new Set(loadedChild === 'family' ? students.map(s => s.id) : [loadedChild]);
    const dialog = make('dialog', 'daily-plan-apply'); dialog.setAttribute('aria-labelledby', 'daily-plan-apply-title');
    const title = make('h2', '', 'Apply family default'); title.id = 'daily-plan-apply-title'; title.prepend(icon('users-round'));
    const description = make('p', '', 'This applies the family plan, including activities marked Not allowed, to the selected children. Activities you explicitly allowed can be added to their plans. Their own school websites, saved work and earned time are kept.');
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
    update() {
      const snapshot = getSnapshot();
      if (!snapshot) return;
      const selected = child.value;
      child.replaceChildren();
      const defaultOption = make('option', '', 'Family default · all children');
      defaultOption.value = 'family';
      child.append(defaultOption);
      for (const student of snapshot.students.filter(s => !s.archived_at)) {
        const option = make('option', '', student.name);
        option.value = student.id;
        child.append(option);
      }
      child.value = [...child.options].some(option => option.value === selected) ? selected : 'family';
      if (active && !busy && !changes.size && (!captured || captured.rules.revision !== snapshot.rules.revision)) void load();
    },
    setActive(value) { active = value; if (active && !changes.size && !busy) void load(); }
  };
}

// A read-only plan preview: never launches school, consumes time or changes a child.
export function showPlanPreview(cards, name, host = document.body) {
  const previous = document.activeElement, dialog = make('dialog', 'daily-plan-preview');
  dialog.setAttribute('aria-label', `${name}’s activity preview`);
  const heading = make('h2', '', `${name}’s activities`);
  const close = action('Close preview', 'x', () => dialog.close());
  const header = make('header'); header.append(heading, close);
  const content = make('div', 'daily-plan-preview-body');
  content.append(make('p', 'cloud-note', 'Plan preview. School progress, hours, daily limits and assigned content determine what opens right now. This does not sign into school or start an activity.'));
  for (const [id, label, description] of PLAN_GROUPS) {
    const entries = cards.filter(card => card.placement === id); if (!entries.length) continue;
    const group = make(id === 'blocked' ? 'details' : 'section');
    group.append(make(id === 'blocked' ? 'summary' : 'h3', '', `${label} · ${entries.length}`), make('p', 'cloud-note', description));
    const grid = make('div', 'daily-plan-preview-grid');
    for (const card of entries) {
      const tile = make('article', 'daily-plan-preview-card'); tile.style.setProperty('--plan-accent', activityAccent(card));
      const title = make('strong', '', card.title); title.prepend(icon(card.icon)); tile.append(title);
      if (id === 'school') tile.append(make('p', '', card.portal ? 'School lessons' : card.assignedWork ? 'Assigned work' : `${card.goal} minutes of practice`));
      if (id === 'blocked') tile.append(make('p', '', 'Hidden from the child'));
      else {
        if (card.start) tile.append(make('p', '', `${card.start}–${card.end}`));
        if (card.limitMinutes) tile.append(make('p', '', `${card.limitMinutes} minutes per day`));
        if (card.days?.length < 7) tile.append(make('p', '', card.days.map(day => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]).join(', ')));
      }
      grid.append(tile);
    }
    group.append(grid); content.append(group);
  }
  dialog.append(header, content); host.append(dialog); dialog.onclose = () => { dialog.remove(); if (previous?.isConnected) previous.focus(); };
  dialog.showModal(); window.lucide?.createIcons();
}
