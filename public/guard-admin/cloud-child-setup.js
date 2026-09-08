const daily = [
  ['verse', 'Daily Verse', 'A built-in Bible verse and question.'],
  ['riddle', 'Brain Teaser', 'A built-in daily thinking challenge.']
];
const steps = ['School', 'Activities', 'Starter content', 'Ready'];
function node(tag, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
function button(label, callback, className = 'btn btn-secondary') {
  const element = node('button', label, className); element.type = 'button'; element.onclick = () => void callback(); return element;
}
export function setupChildGuide({ request, getSnapshot, learning, navigate, editSchool, onSaved }) {
  const dialog = node('dialog', '', 'parent-setup-dialog child-setup-dialog');
  dialog.setAttribute('aria-labelledby', 'child-setup-title');
  const form = node('form'), header = node('header'), progress = node('p', '', 'setup-progress');
  const heading = node('h2'); heading.id = 'child-setup-title';
  const body = node('div', '', 'setup-body'), error = node('p', '', 'setup-error'), footer = node('footer');
  error.setAttribute('role', 'alert');
  const later = button('Save and close', close), back = button('Back', () => move(-1));
  const next = button('Save and next', () => move(1), 'btn btn-primary');
  header.append(progress, heading); footer.append(later, back, next); form.append(header, body, error, footer);
  form.onsubmit = event => event.preventDefault(); dialog.append(form); document.body.append(dialog);
  let state, busy = false, previousFocus;
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  dialog.addEventListener('close', () => previousFocus?.isConnected && previousFocus.focus());
  async function open(studentId, step) {
    if (busy || dialog.open) return;
    busy = true;
    try {
      state = await request('get-child-setup', { studentId });
      if (Number.isInteger(step)) state.step = step;
      previousFocus = document.activeElement; render(); dialog.showModal();
    } catch (failure) {
      // Keep a failed request visible with a working retry, without a blank guide.
      previousFocus = document.activeElement; heading.textContent = 'Child setup'; body.replaceChildren();
      body.append(button('Try again', () => { dialog.close(); void open(studentId, step); }));
      body.append(button('Close', () => dialog.close()));
      error.textContent = failure.message; footer.hidden = true; dialog.showModal(); state = null;
    } finally { busy = false; }
  }
  async function persist() {
    busy = true; error.textContent = '';
    form.querySelectorAll('button,input,select').forEach(control => control.disabled = true);
    try { state = await request('save-child-setup', state); onSaved(state); return true; }
    catch (failure) { error.textContent = failure.message; return false; }
    finally {
      busy = false; form.querySelectorAll('button,input,select').forEach(control => control.disabled = false);
      back.disabled = state.step === 0;
    }
  }
  async function close() { if (!busy && (!state || await persist())) dialog.close(); }
  async function move(direction) {
    if (busy) return;
    const before = state.step, wasComplete = state.completed;
    if (before === 3 && direction === 1) state.completed = true;
    else state.step += direction;
    if (await persist()) {
      if (before === 3 && direction === 1) dialog.close(); else render();
    } else { state.step = before; state.completed = wasComplete; }
  }
  async function section(tab, callback) {
    if (busy || !await persist()) return;
    dialog.close(); navigate(tab); callback?.();
  }
  function copy(text) { body.append(node('p', text, 'setup-copy')); }
  function activity([id, title, description]) {
    const row = node('label', '', 'setup-child-activity'), words = node('span');
    words.append(node('strong', title), node('small', description));
    const select = node('select'); select.setAttribute('aria-label', `${title} for ${state.student.name}`);
    for (const [value, title] of [['inherit', `Use family setting (${state.familyFeatures[id] === false ? 'Off' : 'On'})`], ['on', 'On for this child'], ['off', 'Off for this child']]) {
      const option = node('option', title); option.value = value; select.append(option);
    }
    select.value = id in state.features ? state.features[id] ? 'on' : 'off' : 'inherit';
    select.onchange = () => { if (select.value === 'inherit') delete state.features[id]; else state.features[id] = select.value === 'on'; };
    row.append(words, select); body.append(row);
  }
  function collection(group) {
    const section = node('section', '', 'setup-collection'); section.append(node('h3', group.title));
    if (!group.items.length) {
      section.append(node('p', 'No items approved for your family yet.', 'setup-copy'));
      body.append(section); return;
    }
    const select = node('select'); select.setAttribute('aria-label', `${group.title} selection`);
    for (const [value, title] of [['inherit', `Use family collection (${group.items.length} items)`], ['custom', 'Choose for this child']]) {
      const option = node('option', title); option.value = value; select.append(option);
    }
    select.value = group.id in state.contentChoices ? 'custom' : 'inherit';
    const details = node('details'), summary = node('summary', 'Choose items'); details.append(summary);
    const renderItems = () => {
      const customized = select.value === 'custom'; details.hidden = !customized; details.open = customized;
      details.replaceChildren(summary);
      if (!customized) return;
      details.append(node('p', 'Only checked items are available to this child.', 'setup-copy'));
      const selected = new Set(state.contentChoices[group.id].items);
      group.items.forEach(item => {
        const label = node('label', '', 'setup-choice'), check = node('input'); check.type = 'checkbox'; check.checked = selected.has(item.id);
        check.onchange = () => { check.checked ? selected.add(item.id) : selected.delete(item.id); state.contentChoices[group.id] = { items: [...selected] }; };
        label.append(check, node('span', item.title)); details.append(label);
      });
    };
    select.onchange = () => {
      if (select.value === 'inherit') delete state.contentChoices[group.id];
      else state.contentChoices[group.id] = { items: group.items.map(item => item.id) };
      renderItems();
    };
    renderItems(); section.append(select, details); body.append(section);
  }
  function render() {
    footer.hidden = false; body.replaceChildren(); error.textContent = '';
    heading.textContent = `${state.student.name}’s setup`;
    progress.textContent = `Step ${state.step + 1} of 4 · ${steps[state.step]}`;
    back.disabled = state.step === 0; next.textContent = state.step === 3 ? 'Finish child setup' : 'Save and next';
    if (state.step === 0) {
      copy('These choices follow this child on every connected computer.');
      const provider = state.student.main_school?.provider;
      const names = { abeka: 'Abeka Academy', bju: 'Bob Jones / BJU Press', custom: 'Another school website', none: 'No online school' };
      body.append(node('h3', names[provider] || 'Choose a main school'));
      body.append(button(provider ? 'Change school' : 'Choose school', () => section('overview', () => {
        const childId = state.studentId, editor = document.getElementById('cloud-editor');
        editor?.addEventListener('close', () => void open(childId, 0), { once: true });
        editSchool(getSnapshot().students.find(child => child.id === childId) || state.student);
      })));
      const count = (getSnapshot().devices || []).filter(device => device.student_id === state.studentId).length;
      body.append(node('p', count ? `${count} connected computer${count === 1 ? '' : 's'}` : 'Connect a computer when you’re ready.', 'setup-copy'));
      const download = node('a', 'Download child app', 'btn btn-secondary'); download.href = '/guard/account/'; download.target = '_top'; body.append(download);
    } else if (state.step === 1) {
      copy('Keep the family defaults, or choose On or Off just for this child.');
      [...daily, ...learning].forEach(activity);
    } else if (state.step === 2) {
      copy('Use your family’s approved collections, or choose specific items for this child.');
      state.catalog.collections.forEach(collection);
    } else {
      copy('This child’s choices are saved. Change them anytime from Students → Child setup.');
      const overrides = Object.entries(state.features);
      body.append(node('p', overrides.length ? `${overrides.length} personal activity choices. Other activities use family defaults.` : 'All activities use family defaults.'));
      for (const [id, enabled] of overrides) body.append(node('p', `${[...daily, ...learning].find(row => row[0] === id)?.[1] || id}: ${enabled ? 'On' : 'Off'}`, 'setup-child'));
      body.append(node('p', 'School assignments and AI permissions still apply.', 'setup-copy'));
      body.append(button('Subjects and time goals', () => section('subjects')), button('Math Coach limits', () => section('math-coach')), button('Coloring limits', () => section('coloring-studio')));
    }
    body.scrollTop = 0;
  }
  return { open, isOpen: () => dialog.open };
}
