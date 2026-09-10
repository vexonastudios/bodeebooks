export function setupCloudMathCoach({ endpoint }) {
  const root = document.getElementById('cloud-math-coach');
  let active = false, epoch = 0, overview = null;
  const node = (tag, text = '', className = '') => { const value = document.createElement(tag); value.textContent = text; if (className) value.className = className; return value; };
  const icon = name => { const value = document.createElement('i'); value.setAttribute('data-lucide', name); value.setAttribute('aria-hidden', 'true'); return value; };
  const call = async input => {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const value = await response.json();
    if (!response.ok) throw Error(value.error || 'Math Coach could not be updated.');
    return value;
  };
  function button(label, callback, { primary = false, iconName = '', className = '' } = {}) {
    const value = node('button', '', `${primary ? 'btn btn-primary' : 'btn btn-secondary'} ${className}`.trim());
    value.type = 'button';
    if (iconName) value.append(icon(iconName));
    value.append(document.createTextNode(label));
    value.onclick = () => void callback(value);
    return value;
  }
  function toggle(label, description, checked, iconName) {
    const wrap = node('label', '', 'cloud-math-toggle');
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked === true;
    const copy = node('span', '', 'cloud-math-toggle-copy');
    const heading = node('strong'); if (iconName) heading.append(icon(iconName)); heading.append(document.createTextNode(label));
    copy.append(heading, node('small', description)); wrap.append(input, copy);
    return { wrap, input };
  }
  function number(label, value, min, max) {
    const wrap = node('label', '', 'cloud-math-number-field');
    const title = node('span', label); const input = document.createElement('input');
    input.type = 'number'; input.min = String(min); input.max = String(max); input.value = String(value); input.className = 'admin-input';
    wrap.append(title, input); return { wrap, input };
  }
  function dailyLimit(value) {
    let limit = Number(value) || 0;
    const wrap = node('fieldset', '', 'cloud-math-limit');
    wrap.append(node('legend', 'Daily questions'), node('p', 'Choose a simple limit, or leave it open. Your family monthly limit still applies.'));
    const options = node('div', '', 'cloud-math-limit-options');
    const custom = document.createElement('input'); custom.type = 'number'; custom.min = '1'; custom.max = '20'; custom.placeholder = 'Custom'; custom.className = 'admin-input';
    const choices = [{ value: 0, label: 'No limit' }, { value: 3, label: '3' }, { value: 5, label: '5' }, { value: 10, label: '10' }];
    const set = next => { limit = next; custom.value = [0, 3, 5, 10].includes(next) ? '' : String(next); for (const choice of options.querySelectorAll('button')) choice.classList.toggle('selected', Number(choice.dataset.limit) === next); };
    for (const choice of choices) {
      const option = button(choice.label, () => set(choice.value), { className: 'cloud-math-limit-choice' });
      option.dataset.limit = String(choice.value); options.append(option);
    }
    custom.addEventListener('input', () => { const next = Number(custom.value); if (Number.isInteger(next) && next >= 1 && next <= 20) set(next); });
    const customLabel = node('label', '', 'cloud-math-custom-limit'); customLabel.append(node('span', 'Custom'), custom);
    wrap.append(options, customLabel); set(limit); return { wrap, value: () => limit };
  }
  async function reload() {
    const current = ++epoch; if (!active) return; root.textContent = 'Loading Math Coach…';
    try { const value = await call({ action: 'math-coach-overview' }); if (!active || current !== epoch) return; overview = value; render(); }
    catch (error) { if (active && current === epoch) root.textContent = error.message; }
  }
  function transcript(student) {
    const card = node('details', '', 'cloud-math-transcript');
    const summary = node('summary'); summary.append(icon('messages-square'), document.createTextNode(` ${student.name}’s recent chats`)); card.append(summary);
    const status = node('p', 'Open to load the last 30 days of saved questions.', 'cloud-math-transcript-note'); card.append(status);
    const list = node('div', '', 'cloud-math-transcript-list'); card.append(list);
    let loaded = false;
    card.ontoggle = () => {
      if (!card.open || loaded) return; loaded = true; status.textContent = 'Loading saved questions…';
      void call({ action: 'math-coach-transcript', studentId: student.id }).then(value => {
        status.remove();
        if (!value.messages?.length) { list.append(node('p', 'No Math Coach questions have been saved yet.')); return; }
        for (const item of value.messages) {
          const line = node('article', '', `cloud-math-message ${item.role}`), body = item.body || {};
          const heading = node('strong'); heading.append(icon(item.role === 'coach' ? 'sparkles' : 'graduation-cap'), document.createTextNode(item.role === 'coach' ? 'Math Coach' : 'Child'));
          line.append(heading, node('p', item.role === 'coach' ? (body.explanation || '') : body.question || ''));
          if (item.role === 'coach' && Array.isArray(body.steps) && body.steps.length) line.append(node('p', body.steps.join(' · ')));
          list.append(line);
        }
        window.lucide?.createIcons();
      }).catch(error => { status.textContent = error.message; loaded = false; });
    };
    return card;
  }
  function studentCard(student) {
    const card = node('section', '', 'cloud-math-student');
    const limitValue = Number(student.settings.daily_question_limit) || 0;
    const statusName = student.access.unlocked ? 'Ready today' : student.access.pending ? 'Waiting for you' : student.settings.enabled ? 'Locked today' : 'Off';
    const heading = node('div', '', 'cloud-math-student-heading');
    const title = node('h2'); title.append(icon('user-round'), document.createTextNode(student.name));
    heading.append(title, node('span', statusName, `cloud-math-status ${student.access.unlocked ? 'ready' : student.access.pending ? 'pending' : ''}`));
    const summary = node('p', `${student.usage.today}${limitValue ? ` of ${limitValue}` : ''} questions today · ${student.usage.month} family units used this month`, 'cloud-math-summary');
    const on = toggle('Enable Math Coach', 'Let this child open Math Coach in BodeeGuard.', student.settings.enabled, 'sigma');
    const daily = dailyLimit(limitValue);
    const approval = toggle('Ask permission each day', 'The child asks you before using Math Coach for the day.', student.settings.require_daily_approval !== false, 'shield-check');
    const actions = node('div', '', 'cloud-math-card-actions'); const status = node('p', '', 'cloud-math-save-status');
    const save = button('Save settings', async () => {
      status.textContent = 'Saving…';
      try {
        await call({ action: 'math-coach-student-settings', studentId: student.id, enabled: on.input.checked, daily_question_limit: daily.value(), require_daily_approval: approval.input.checked });
        status.textContent = 'Saved.'; await reload();
      } catch (error) { status.textContent = error.message; }
    }, { primary: true, iconName: 'save' });
    actions.append(save);
    if (student.settings.enabled) {
      const access = button(student.access.unlocked ? 'Lock for today' : 'Unlock for today', async value => {
        value.disabled = true;
        try { await call({ action: 'math-coach-action', studentId: student.id, mathAction: student.access.unlocked ? 'lock' : 'unlock' }); await reload(); }
        catch (error) { status.textContent = error.message; value.disabled = false; }
      }, { iconName: student.access.unlocked ? 'lock' : 'unlock' });
      actions.append(access);
      if (student.access.pending) actions.append(button('Not now', async () => { try { await call({ action: 'math-coach-action', studentId: student.id, mathAction: 'deny' }); await reload(); } catch (error) { status.textContent = error.message; } }, { iconName: 'circle-x' }));
    }
    card.append(heading, summary, on.wrap, daily.wrap, approval.wrap, actions, status);
    const group = node('article', '', 'cloud-math-child'); group.append(card, transcript(student)); return group;
  }
  function render() {
    root.replaceChildren();
    const header = node('div', '', 'tab-header'); const title = node('h1'); title.append(icon('sigma'), document.createTextNode(' Math Coach'));
    header.append(title, button('Refresh', reload, { iconName: 'refresh-cw' })); root.append(header);
    const notice = node('p', 'Enable Math Coach for each child. It opens inside BodeeGuard without another login. Chats are saved for 30 days.', 'cloud-note'); root.append(notice);
    const family = node('section', '', 'cloud-math-family');
    const familyTitle = node('h2'); familyTitle.append(icon('wallet-cards'), document.createTextNode(' Family AI limit'));
    const limitCopy = node('p', 'This is the shared monthly allowance for every child. It keeps AI spending predictable.', 'cloud-math-family-copy');
    const monthly = number('Monthly AI units', overview.global_settings.monthly_unit_limit, 100, 30000), status = node('p', '', 'cloud-math-save-status');
    const familyActions = node('div', '', 'cloud-math-card-actions'); familyActions.append(button('Save family limit', async () => {
      status.textContent = 'Saving…';
      try { await call({ action: 'math-coach-global-settings', monthly_unit_limit: Number(monthly.input.value) }); status.textContent = 'Saved.'; await reload(); }
      catch (error) { status.textContent = error.message; }
    }, { primary: true, iconName: 'save' }));
    family.append(familyTitle, limitCopy, monthly.wrap, familyActions, status); root.append(family);
    const children = node('div', '', 'cloud-math-students'); for (const student of overview.students) children.append(studentCard(student));
    if (!overview.students.length) children.append(node('p', 'Add a child from Overview before configuring Math Coach.', 'cloud-panel'));
    root.append(children); window.lucide?.createIcons();
  }
  return { setActive(value) { active = value; epoch++; if (value) void reload(); }, update() { if (active) void reload(); } };
}
