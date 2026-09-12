export function setupCloudRetention({ endpoint }) {
  const root = document.createElement('section'); root.className = 'cloud-panel'; root.id = 'cloud-history-retention';
  root.innerHTML = `<h2><i data-lucide="history"></i> History &amp; privacy</h2>
    <p>Choose when cloud messages and saved BodeeGuard tutor replies expire. School records, grades, submitted documents and kept screenshots stay saved.</p>
    <form><label><input name="enabled" type="checkbox"> Automatically remove expired history</label>
    <label>Keep messages for <select name="messageDays" class="admin-input"><option value="30">30 days</option><option value="90">90 days</option><option value="180">6 months</option><option value="365">1 year</option><option value="">Until I remove them</option></select></label>
    <p>Built-in tutor replies: 30 days. This setting does not yet cover history on the separate Math Coach website. Message attachments expire with their last message. Each settings change gives you seven days before cleanup begins.</p>
    <button class="btn btn-primary" type="submit" disabled><i data-lucide="save"></i> Save history settings</button><p role="status"></p></form>`;
  document.getElementById('tab-settings')?.append(root);
  const form = root.querySelector('form'), status = root.querySelector('[role="status"]'), save = root.querySelector('button');
  let policy = null, busy = false, active = false;
  async function request(action, data = {}) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const value = await response.json(); if (!response.ok) throw Error(value.error || 'History settings could not be loaded.'); return value.policy;
  }
  function render() {
    form.elements.enabled.checked = policy.enabled; form.elements.messageDays.value = policy.messageDays === null ? '' : String(policy.messageDays);
    status.textContent = policy.enabled ? `Automatic cleanup begins ${new Date(policy.effectiveAt).toLocaleDateString()}.` : 'Automatic history cleanup is off.';
  }
  async function load() {
    if (!active || document.hidden || busy || policy) return;
    busy = true;
    try { policy = await request('get-retention'); render(); }
    catch (error) { status.textContent = error.message; }
    finally { busy = false; save.disabled = !policy; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !policy) return; busy = true; save.disabled = true;
    try {
      policy = await request('save-retention', { revision: policy.revision, enabled: form.elements.enabled.checked, messageDays: form.elements.messageDays.value === '' ? null : Number(form.elements.messageDays.value) }); render();
    } catch (error) { status.textContent = `${error.message} Reopen Settings before retrying.`; policy = null; }
    finally { busy = false; save.disabled = !policy; }
  });
  return { setActive(value) { active = value; if (active) void load(); } };
}
