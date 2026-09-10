// The cloud adapter reuses the desktop presentation, not its LAN endpoints,
// settings, mutations or credentials. Conversation text lives only in this tab.
export function setupCloudAssistant({ endpoint, navigate, onChange }) {
  const byId = id => document.getElementById(id);
  const drawer = byId('parent-assistant-drawer');
  if (!drawer) return;
  const input = byId('parent-assistant-input');
  const thread = byId('parent-assistant-thread');
  const ai = byId('parent-assistant-ai');
  const launcher = byId('parent-assistant-launcher');
  const background = byId('admin-dashboard');
  let welcome = null, busy = false, generation = 0, topicId = null, retry = null, controller = null;
  let history = [], returnFocus = null;
  function message(role, text, className = '') {
    const item = document.createElement('article');
    item.className = `assistant-message ${role} ${className}`;
    item.textContent = text;
    thread.append(item);
    // Bound long sessions without retaining hidden conversation copies.
    while (thread.children.length > 40) thread.firstElementChild.remove();
    requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
    return item;
  }
  async function request(action, data = {}) {
    const localController = new AbortController(); controller = localController;
    const timeout = setTimeout(() => localController.abort(), 26000);
    try {
      const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: localController.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          history = []; retry = null; topicId = null; thread.replaceChildren();
        }
        throw new Error(response.status === 401 ? 'Your sign-in expired. Open Account and sign in again.' : result.error || 'Parent help could not connect. Please try again.');
      }
      return result;
    } catch (error) {
      throw new Error(error.name === 'AbortError' ? 'The answer took too long. Your question is still here; try again.' : error.message);
    } finally { clearTimeout(timeout); if (controller === localController) controller = null; }
  }
  function suggestions(items) {
    const root = byId('parent-assistant-suggestions'); root.replaceChildren();
    for (const text of (items || []).slice(0, 4)) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => { if (!busy) { input.value = text; submit(); } }); root.append(button);
    }
  }
  function close() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true;
    background.inert = false; launcher.setAttribute('aria-expanded', 'false'); byId('parent-assistant-backdrop').hidden = true;
    (returnFocus?.isConnected ? returnFocus : launcher).focus();
  }
  function sources(item, entries, action = false) {
    const actions = document.createElement('div'); actions.className = 'assistant-message-actions';
    for (const source of (entries || []).slice(0, 3)) {
      if (!/^[a-z-]+$/.test(source.tab || '')) continue;
      const target = source.tab === 'account' ? null : byId(`tab-${source.tab}`);
      if (!target && source.tab !== 'account') continue;
      const details = document.createElement('span'); details.className = 'cloud-assistant-source';
      details.textContent = action ? source.title : `${source.title} · ${source.status === 'pending' ? 'Still being transferred' : source.status === 'partial' ? 'Partly connected' : 'Product guide'}`;
      actions.append(details);
      if (source.tab === 'account') {
        const link = document.createElement('a'); link.href = '/guard/account/'; link.target = '_top'; link.textContent = 'Open Account & billing'; actions.append(link);
      } else {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = action ? `Open ${source.title}` : 'Open this page';
        button.addEventListener('click', () => { close(); navigate(source.tab); }); actions.append(button);
      }
    }
    item.append(actions);
  }
  function loadWelcome() {
    if (welcome) return welcome;
    const current = generation;
    welcome = request('assistant-welcome').then(data => {
      if (current !== generation) return;
      message('assistant', data.message);
      byId('parent-assistant-privacy').textContent = data.privacy;
      byId('parent-assistant-ai-label').textContent = 'Use OpenAI for conversational help';
      ai.disabled = !data.aiConfigured;
      byId('parent-assistant-configure-ai').hidden = Boolean(data.aiConfigured);
      suggestions(data.suggestions);
    }).catch(error => {
      if (current === generation) { welcome = null; message('assistant', error.message, 'error'); }
    });
    return welcome;
  }
  async function submit() {
    if (busy || !input.value.trim()) return;
    busy = true; byId('parent-assistant-send').disabled = true;
    const current = generation;
    await loadWelcome();
    if (current !== generation) return;
    const prompt = input.value.trim().slice(0, 1500);
    const aiRequested = ai.checked && !ai.disabled;
    const body = retry?.prompt === prompt && retry.ai === aiRequested ? retry : {
      prompt, ai: aiRequested, requestId: crypto.randomUUID(), topicId,
      contextTab: document.querySelector('.nav-item.active')?.dataset.tab || 'overview', history: history.slice(-4)
    };
    retry = body;
    message('user', prompt);
    const pending = message('assistant', 'Working on your request…', 'loading');
    input.readOnly = true;
    try {
      const response = await request('assistant-ask', body);
      if (current !== generation) return;
      pending.remove();
      const reply = message('assistant', response.message);
      const mode = document.createElement('small'); mode.className = 'cloud-assistant-mode';
      mode.textContent = response.mode === 'action' ? 'Settings request complete' : response.mode === 'ai' ? 'OpenAI · grounded in the product guide' : response.mode === 'status' ? 'Current cloud check-ins' : 'Built-in product guide';
      reply.append(mode); sources(reply, response.sources, response.mode === 'action');
      if (response.mode === 'action' && response.change?.changedCount > 0) onChange?.(response.change.feature);
      if (response.notice) message('assistant', response.notice, 'cloud-assistant-notice');
      topicId = response.sources?.[0]?.id || topicId;
      history = [...history, { role: 'user', text: prompt }, { role: 'assistant', text: response.message.slice(0, 2400) }].slice(-4);
      suggestions(response.suggestions);
      if (!response.notice) { input.value = ''; retry = null; }
    } catch (error) { if (current === generation) { pending.remove(); message('assistant', error.message, 'error'); } }
    finally {
      if (current === generation) { busy = false; input.readOnly = false; byId('parent-assistant-send').disabled = false; if (drawer.classList.contains('open')) input.focus(); }
    }
  }
  launcher.hidden = false; ai.disabled = true;
  launcher.addEventListener('click', () => {
    returnFocus = launcher;
    drawer.inert = false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    background.inert = true; launcher.setAttribute('aria-expanded', 'true'); byId('parent-assistant-backdrop').hidden = false;
    loadWelcome(); input.focus();
  });
  byId('parent-assistant-close').addEventListener('click', close);
  byId('parent-assistant-backdrop').addEventListener('click', close);
  byId('parent-assistant-form').addEventListener('submit', event => { event.preventDefault(); submit(); });
  drawer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') {
      const controls = [...drawer.querySelectorAll('button, textarea, input, a[href]')].filter(control => !control.disabled && !control.hidden && control.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submit(); } });
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'cloud-assistant-reset'; reset.textContent = 'Clear conversation';
  reset.addEventListener('click', () => {
    generation++; controller?.abort(); welcome = null; history = []; retry = null; topicId = null; busy = false;
    input.value = ''; input.readOnly = false; byId('parent-assistant-send').disabled = false; thread.replaceChildren(); loadWelcome();
  });
  byId('parent-assistant-form').before(reset);
  window.addEventListener('pagehide', () => { generation++; controller?.abort(); history = []; retry = null; thread.replaceChildren(); });
}
