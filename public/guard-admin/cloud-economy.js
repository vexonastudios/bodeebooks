/* global document, fetch, AbortSignal, crypto */
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[character]);
export function setupCloudEconomy({ endpoint, mutate, editor, field, node, button }) {
  const el = id => document.getElementById(id), modal = el('reward-catalog-modal');
  let active = false, generation = 0, loading = false, data = null, editing = null, editId = null, saving = false, offset = 0;
  function close() { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); editing = null; }
  function fields() {
    const time = el('reward-catalog-type').value === 'time'; el('reward-time-fields').hidden = !time;
    el('reward-type-help').textContent = time ? 'Family Game Room is connected. Keep other player rewards hidden until those players transfer.' : 'Coins are deducted when requested. Mark it fulfilled when ready, or refund the coins.';
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
  function render(value) {
    el('econ-balances').replaceChildren(...value.balances.map(row => {
      const line = node('div', 'cloud-panel'); line.append(node('strong', '', row.name), node('p', '', row.wallet.initialized ? `${row.wallet.balance} coins · ${row.wallet.totalEarned} earned in total` : `Earlier balance awaits transfer · ${row.wallet.cloudEarned} coins earned in the cloud`));
      line.append(button(row.wallet.initialized ? '+ / − Adjust coins' : 'Reconcile opening balance', () => adjust(row, row.wallet.initialized ? 'adjust' : 'opening-wallet'))); return line;
    }));
    const catalog = el('reward-catalog-list');
    catalog.innerHTML = value.items.map(item => `<article class="reward-admin-card${item.active ? '' : ' is-hidden'}"><div class="reward-admin-icon">${esc(item.icon)}</div><div class="reward-admin-main"><div class="reward-admin-title-row"><strong>${esc(item.name)}</strong><span class="reward-admin-pill ${item.active ? 'is-live' : 'is-hidden'}">${item.active ? 'IN STORE' : 'HIDDEN'}</span></div><div class="reward-admin-description">${esc(item.description)}</div><div class="reward-admin-meta"><span class="reward-admin-pill">${esc(item.type)}</span><span class="reward-admin-pill">🪙 ${item.price.toLocaleString()}</span><span class="reward-admin-pill">${item.daily_limit} / child / day</span>${item.type === 'time' ? `<span class="reward-admin-pill">${item.time_minutes} minutes · ${esc(item.media_type)}</span>` : ''}</div><div class="reward-admin-actions"><button class="btn btn-secondary" data-reward-edit="${esc(item.id)}">Edit</button><button class="btn btn-secondary" data-reward-toggle="${esc(item.id)}">${item.active ? 'Hide from Store' : 'Show in Store'}</button></div></div></article>`).join('') || '<p class="settings-hint">No cloud rewards yet. Select Add Reward to create one. The old catalog has not been imported.</p>';
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
    if (!value.redemptions.length) purchases.append(node('p', '', 'No cloud reward redemptions.'));
    if (offset) purchases.append(button('Newer redemptions', () => { offset = Math.max(0, offset - 50); void load(); }));
    if (value.redemptions.length > 50) purchases.append(button('Older redemptions', () => { offset += 50; void load(); }));
  }
  async function load() {
    if (!active || loading) return;
    const epoch = generation, studentId = el('econ-purchase-sel').value;
    loading = true;
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'list-store', studentId: studentId || null, offset }) });
      const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Economy could not connect.');
      if (!active || generation !== epoch) return;
      data = value; render(value); el('cloud-economy-status').textContent = 'Cloud purchases, refunds, Reading and Typing rewards are connected. Other school/practice rewards and LAN histories still await transfer.';
    } catch (error) { if (active && generation === epoch) { data = null; for (const id of ['econ-balances','econ-purchases','reward-catalog-list']) el(id).replaceChildren(); el('cloud-economy-status').textContent = error.message; } }
    finally { loading = false; if (active && generation !== epoch) void load(); }
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
  return { update() { if (active && !saving && !modal.classList.contains('active')) void load(); }, setActive(value) { active = value; generation++; if (value) void load(); else { close(); data = null; } } };
}
