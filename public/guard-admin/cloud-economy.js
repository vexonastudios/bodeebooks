import { setupChallengeSettings } from './cloud-challenges.js?v=20261007-opening1';
/* global document, fetch, AbortSignal, crypto, window, structuredClone */
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]);
const mediaLabels = { music:'Music', video:'Videos', audiobook:'Audiobooks', family_game:'Family Games' };
const mediaIcons = { music:'music', video:'video', audiobook:'headphones', family_game:'gamepad-2' };
export function setupCloudEconomy({ endpoint, mutate, editor, field, node, button }) {
  const challenges = setupChallengeSettings({endpoint,mutate});
  const el = id => document.getElementById(id), modal = el('reward-catalog-modal');
  let active = false, generation = 0, loading = false, data = null, editing = null, editId = null, saving = false, offset = 0;
  function close() { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); editing = null; }
  function fields() {
    const time = el('reward-catalog-type').value === 'time'; el('reward-time-fields').hidden = !time;
    el('reward-type-help').textContent = time ? 'Music, videos, audiobooks and Family Games support extra time. Unused time stays saved. Your access rules still apply.' : 'Coins are deducted when requested. Mark it fulfilled when ready, or refund the coins.';
  }
  function open(item = null) {
    if (saving) return;
    editing = item; editId = crypto.randomUUID();
    const values = { icon: item?.icon || '🎁', name: item?.name || '', description: item?.description || '', type: item?.type || 'privilege', price: item?.price || 100,
      media: item?.media_type || 'family_game', minutes: item?.time_minutes || 15, limit: item?.daily_limit || 1, order: item?.display_order ?? 100 };
    for (const [key, value] of Object.entries(values)) el(`reward-catalog-${key}`).value = value;
    el('reward-catalog-active').checked = item ? item.active : true; el('reward-catalog-type').disabled = !!item;
    el('reward-catalog-modal-title').textContent = item ? 'Edit Reward' : 'Add Reward'; el('reward-catalog-error').textContent = '';
    fields(); modal.classList.add('active'); modal.setAttribute('aria-hidden', 'false'); el('reward-catalog-name').focus();
  }
  function catalogCommand(item, visibility = item.active) {
    return { kind: 'catalog', itemId: item.id, revision: item.revision, name: item.name, description: item.description, icon: item.icon, type: item.type,
      price: item.price, mediaType: item.media_type, minutes: item.time_minutes, dailyLimit: item.daily_limit, order: item.display_order, active: visibility };
  }
  function adjust(row, kind) {
    const requestId = crypto.randomUUID();
    editor(kind === 'opening-wallet' ? `Reconcile ${row.name}’s opening balance` : `Adjust ${row.name}’s coins`, [
      node('p', '', kind === 'opening-wallet' ? `Enter the old Admin balance before these new cloud earnings: ${row.wallet.cloudEarned}. This opening balance is recorded once.` : `Current balance: ${row.wallet.balance}. Positive numbers add coins; negative numbers subtract them.`),
      field(kind === 'opening-wallet' ? 'Opening balance from old Admin' : 'Coins to add or subtract', 'amount', kind === 'opening-wallet' ? '' : 0, { type: 'number' }),
      ...(kind === 'opening-wallet' ? [field('Total earned in old Admin', 'totalEarned', '', { type: 'number' })] : [field('Reason', 'reason', '')])
    ], async form => {
      const values = kind === 'opening-wallet' ? { action: 'reading-command', kind, studentId: row.studentId, id: requestId, balance: Number(form.get('amount')), totalEarned: Number(form.get('totalEarned')) }
        : { action: 'store-command', kind: 'adjust', studentId: row.studentId, id: requestId, revision: row.wallet.revision, amount: Number(form.get('amount')), reason: form.get('reason') };
      await mutate(values.action, values); await load();
    });
  }
  async function perform(input) {
    try { await mutate('store-command', input); await load(); }
    catch (error) { el('cloud-economy-status').textContent = error.message; }
  }
  let earningsSelected = '', earningsDirty = false, earningsSaving = false, earningsRetry = null;
  function renderEarnings(value) {
    const root = el('cloud-economy-earnings');
    if (!root || !value.earnings) return;
    const earnings = value.earnings, children = value.balances;
    if (!children.some(child => child.studentId === earningsSelected)) earningsSelected = '';
    root.replaceChildren();
    const choice = node('select', 'admin-select'); choice.id = 'economy-earning-child';
    for (const child of [{studentId:'', name:'Family default'}, ...children]) {
      const option = node('option', '', child.name); option.value = child.studentId; choice.append(option);
    }
    choice.value = earningsSelected;
    const choiceLabel = node('label', '', 'Reward settings for'); choiceLabel.htmlFor = choice.id;
    root.append(choiceLabel, choice);
    const form = node('form', 'cloud-earnings-form');
    const settings = earnings.settings.children[earningsSelected] || earnings.settings.school;
    function input(label, name, type, value) {
      const wrap = node('label', 'cloud-earnings-field', label), control = node('input');
      control.name = name; control.type = type;
      if (type === 'checkbox') control.checked = value; else control.value = value;
      if (type === 'number') { control.min = '0'; control.max = '10000'; control.step = '1'; }
      if (type !== 'checkbox') control.required = true;
      wrap.append(control); form.append(wrap); return control;
    }
    const inherit = earningsSelected ? input('Use family settings', 'inherit', 'checkbox', !earnings.settings.children[earningsSelected]) : null;
    const coins = input('Coins for completing school', 'coins', 'number', settings.coins);
    const enabled = input('Add a finish-by bonus', 'bonusEnabled', 'checkbox', settings.bonusEnabled);
    const deadline = input('Finish by', 'finishBy', 'time', settings.finishBy);
    const bonus = input('Bonus coins', 'bonusCoins', 'number', settings.bonusCoins);
    const hint = node('p', 'settings-hint', `Times use ${earnings.timeZone}. Give older children a later deadline. Missing it never reduces their school coins.`);
    hint.classList.add('cloud-earnings-wide'); form.append(hint);
    form.append(node('p', 'settings-hint cloud-earnings-wide', 'New settings affect unpaid days. Bonuses require online confirmation before the deadline.'));
    const status = node('p', 'cloud-earnings-status'); status.setAttribute('role','status');
    const save = node('button', 'btn btn-primary', 'Save school rewards'); save.type = 'submit';
    function disabled() {
      coins.disabled = enabled.disabled = !!inherit?.checked || earningsSaving;
      deadline.disabled = bonus.disabled = !!inherit?.checked || !enabled.checked || earningsSaving;
      if (inherit) inherit.disabled = earningsSaving;
      choice.disabled = earningsSaving; save.disabled = earningsSaving;
    }
    inherit?.addEventListener('change', () => {
      if (inherit.checked) { coins.value = earnings.settings.school.coins; enabled.checked = earnings.settings.school.bonusEnabled; deadline.value = earnings.settings.school.finishBy; bonus.value = earnings.settings.school.bonusCoins; }
      disabled();
    });
    enabled.addEventListener('change', disabled);
    form.addEventListener('input', () => { earningsDirty = true; status.textContent = 'Unsaved changes'; });
    choice.addEventListener('change', () => { earningsSelected = choice.value; earningsDirty = false; renderEarnings(value); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (earningsSaving || !active) return;
      const config = structuredClone(earnings.settings);
      const updated = { coins: Number(coins.value), bonusEnabled: enabled.checked, bonusCoins: Number(bonus.value), finishBy: deadline.value };
      if (!earningsSelected) config.school = updated;
      else if (inherit.checked) delete config.children[earningsSelected];
      else config.children[earningsSelected] = updated;
      const body = {kind:'earnings',revision:earnings.revision,settings:config}, key = JSON.stringify(body);
      if (earningsRetry?.key !== key) earningsRetry = {key,id:crypto.randomUUID()};
      earningsSaving = true; disabled(); status.textContent = 'Saving…';
      try {
        const saved = await mutate('store-command', {...body,id:earningsRetry.id});
        value.earnings = {...earnings,...saved.earnings}; earningsDirty = false; earningsRetry = null;
        earningsSaving = false; renderEarnings(value);
        el('cloud-economy-earnings').querySelector('[role=status]').textContent = 'School rewards saved.';
      } catch (error) { status.textContent = `${error.message} Your changes remain here.`; }
      finally { earningsSaving = false; disabled(); }
    });
    form.append(save, status); root.append(form); disabled();
    el('cloud-economy-automatic').replaceChildren(...earnings.automaticRewards.map(row => {
      const line = node('div','cloud-panel'); line.append(node('strong','',row.name),node('p','settings-hint',row.detail)); return line;
    }));
    el('cloud-economy-school-history').replaceChildren(...earnings.history.map(row => {
      const child = children.find(child => child.studentId === row.student_id), line = node('div','cloud-panel');
      line.append(node('strong','',`${child?.name || 'Archived student'} · ${row.date} · ${row.base_coins + row.bonus_coins} coins`),
        node('p','settings-hint',`${row.base_coins} for school + ${row.bonus_coins} bonus · Confirmed ${new Date(row.confirmed_at).toLocaleTimeString([], {timeZone:row.time_zone,hour:'numeric',minute:'2-digit'})} (${row.time_zone})`)); return line;
    }));
    if (!earnings.history.length) el('cloud-economy-school-history').append(node('p','settings-hint','Payments appear here when a child finishes their required schoolwork.'));
  }
  function render(value) {
    renderEarnings(value);
    el('econ-balances').replaceChildren(...value.balances.map(row => {
      const line = node('div', 'cloud-panel'); line.append(node('strong', '', row.name), node('p', '', `${row.wallet.balance} coins · ${row.wallet.totalEarned} earned in total`));
      line.append(button('+ / − Adjust coins', () => adjust(row, 'adjust')));
      if (!row.wallet.initialized) {
        const previous = node('details', ''), summary = node('summary', '', 'Have coins from the old app?');
        previous.append(summary, button('Add previous balance', () => adjust(row, 'opening-wallet'))); line.append(previous);
      }
      return line;
    }));
    const catalog = el('reward-catalog-list');
    catalog.innerHTML = value.items.map(item => `<article class="reward-admin-card${item.active ? '' : ' is-hidden'}" data-media="${esc(item.media_type || 'custom')}"><div class="reward-admin-icon"><i data-lucide="${mediaIcons[item.media_type] || 'gift'}" aria-hidden="true"></i></div><div class="reward-admin-main"><div class="reward-admin-title-row"><strong>${esc(item.name)}</strong><span class="reward-admin-pill ${item.active ? 'is-live' : 'is-hidden'}">${item.active ? 'IN STORE' : 'HIDDEN'}</span></div><div class="reward-admin-price"><i data-lucide="coins" aria-hidden="true"></i> ${item.price.toLocaleString()} <small>coins</small></div><div class="reward-admin-description">${esc(item.description)}</div><div class="reward-admin-meta">${item.type === 'time' ? `<span class="reward-admin-pill">${item.time_minutes} minutes · ${esc(mediaLabels[item.media_type] || item.media_type)}</span>` : `<span class="reward-admin-pill">${esc(item.type)}</span>`}<span class="reward-admin-pill">${item.daily_limit} per child / day</span></div><div class="reward-admin-actions"><button class="btn btn-secondary" data-reward-edit="${esc(item.id)}"><i data-lucide="pencil" aria-hidden="true"></i> Edit reward</button><button class="btn btn-secondary" data-reward-toggle="${esc(item.id)}"><i data-lucide="${item.active ? 'eye-off' : 'eye'}" aria-hidden="true"></i> ${item.active ? 'Hide' : 'Show in Store'}</button></div></div></article>`).join('') || '<p class="settings-hint">No rewards yet. Select Add Reward to create one.</p>';
    for (const control of catalog.querySelectorAll('[data-reward-edit]')) control.addEventListener('click', () => open(value.items.find(item => item.id === control.dataset.rewardEdit)));
    for (const control of catalog.querySelectorAll('[data-reward-toggle]')) {
      const item = value.items.find(item => item.id === control.dataset.rewardToggle), requestId = crypto.randomUUID();
      control.addEventListener('click', () => perform({ id: requestId, ...catalogCommand(item, !item.active) }));
    }
    const select = el('econ-purchase-sel'), selected = select.value;
    select.replaceChildren(...[{ studentId: '', name: 'All students' }, ...value.balances].map(row => { const option = node('option', '', row.name); option.value = row.studentId; return option; }));
    select.value = value.balances.some(row => row.studentId === selected) ? selected : '';
    const purchases = el('econ-purchases'); purchases.replaceChildren();
    for (const record of value.redemptions.slice(0, 50)) {
      const row = node('div', 'cloud-panel'), student = value.balances.find(child => child.studentId === record.student_id);
      row.append(node('strong', '', `${student?.name || 'Archived student'} — ${record.item.name}`), node('p', '', `${record.coins_spent} coins · ${record.status} · ${new Date(record.purchased_at).toLocaleString()}`));
      if (record.status === 'pending') for (const kind of ['fulfill','refund']) {
        const id = crypto.randomUUID(); row.append(button(kind === 'fulfill' ? 'Mark fulfilled' : 'Refund coins', () => perform({ id, kind, redemptionId: record.id, revision: record.revision })));
      }
      purchases.append(row);
    }
    if (!value.redemptions.length) purchases.append(node('p', '', 'No rewards purchased yet.'));
    if (offset) purchases.append(button('Newer redemptions', () => { offset = Math.max(0, offset - 50); void load(); }));
    if (value.redemptions.length > 50) purchases.append(button('Older redemptions', () => { offset += 50; void load(); }));
    window.lucide?.createIcons();
  }
  async function load() {
    if (!active || loading || earningsSaving) return;
    const epoch = generation, studentId = el('econ-purchase-sel').value;
    loading = true; el('cloud-economy-refresh').disabled = true; el('reward-catalog-add').disabled = true;
    el('cloud-economy-status').textContent = 'Loading balances and rewards…';
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-store', studentId: studentId || null, offset }) });
      const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Economy could not connect.');
      if (!active || generation !== epoch) return;
      data = value; render(value); el('cloud-economy-status').textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
    } catch (error) { if (active && generation === epoch) { el('cloud-economy-status').textContent = `${error.name === 'TimeoutError' ? 'Loading took too long.' : error.message} Use Refresh to try again.${data ? ' Showing the last loaded values.' : ''}`; } }
    finally { loading = false; el('cloud-economy-refresh').disabled = false; el('reward-catalog-add').disabled = !data; if (active && generation !== epoch) void load(); }
  }
  el('reward-catalog-add').addEventListener('click', () => open());
  for (const id of ['reward-catalog-close','reward-catalog-cancel']) el(id).addEventListener('click', close);
  el('reward-catalog-type').addEventListener('change', fields);
  el('reward-catalog-form').addEventListener('submit', async event => {
    event.preventDefault(); if (saving || !active) return;
    const itemId = editing?.id || (editing = { id: crypto.randomUUID(), revision: 0 }).id;
    const input = { id: editId, itemId, revision: editing.revision, kind: 'catalog', type: el('reward-catalog-type').value,
      name: el('reward-catalog-name').value, description: el('reward-catalog-description').value, icon: el('reward-catalog-icon').value,
      price: Number(el('reward-catalog-price').value), mediaType: el('reward-catalog-media').value, minutes: Number(el('reward-catalog-minutes').value),
      dailyLimit: Number(el('reward-catalog-limit').value), order: Number(el('reward-catalog-order').value), active: el('reward-catalog-active').checked };
    saving = true; el('reward-catalog-save').disabled = true;
    try { await mutate('store-command', input); close(); await load(); }
    catch (error) { el('reward-catalog-error').textContent = error.message; }
    finally { saving = false; el('reward-catalog-save').disabled = false; }
  });
  el('cloud-economy-refresh').addEventListener('click', load);
  el('econ-purchase-sel').addEventListener('change', () => { offset = 0; generation++; void load(); });
  return { update() { challenges.update(); if (active && !saving && !earningsSaving && !earningsDirty && !modal.classList.contains('active')) void load(); }, setActive(value) { challenges.setActive(value); active = value; generation++; if (value) void load(); else { close(); data = null; } } };
}
