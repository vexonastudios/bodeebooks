// Success confirmations are transient; pending requests and errors remain beside the control.
const SUCCESS_MS = 6500, FADE_MS = 200;
const instances = new WeakMap();
function element(tag, className, text = '') {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
}
function glyph(name) { const node = element('i', ''); node.dataset.lucide = name; node.setAttribute('aria-hidden', 'true'); return node; }
export function parentActionFeedback(root = document.getElementById('admin-dashboard')) {
  if (instances.has(root)) return instances.get(root);
  const entries = new Map(); let serial = 0, active = null, timer, dialogHost = null;
  const legacy = document.getElementById('cloud-feedback');
  if (legacy) { legacy.hidden = true; legacy.textContent = ''; }
  const toast = element('div', 'cloud-action-toast'); toast.id = 'cloud-action-toast'; toast.hidden = true;
  toast.setAttribute('popover', 'manual'); toast.setAttribute('aria-atomic', 'true');
  const mark = element('div', 'cloud-action-mark'), copy = element('div', 'cloud-action-copy');
  const title = element('strong', 'cloud-action-title'), detail = element('p', 'cloud-action-detail'); copy.append(title, detail);
  const close = element('button', 'cloud-action-dismiss'); close.type = 'button'; close.setAttribute('aria-label', 'Dismiss notification'); close.append(glyph('x'));
  toast.append(mark, copy, close); root.append(toast);
  function dismiss() { clearTimeout(timer); delete toast.dataset.dismissing; if (dialogHost) dialogHost.removeEventListener('close', dismiss); dialogHost = null; active = null; if (toast.matches(':popover-open')) toast.hidePopover(); toast.hidden = true; }
  function pause() { clearTimeout(timer); delete toast.dataset.dismissing; }
  function schedule() {
    pause();
    if (active?.state === 'success' && !toast.matches(':hover, :focus-within')) timer = setTimeout(() => {
      toast.dataset.dismissing = 'true'; timer = setTimeout(dismiss, FADE_MS);
    }, SUCCESS_MS);
  }
  function forget(key) { clearTimeout(entries.get(key)?.timer); entries.delete(key); }
  function expire(key, entry) {
    if (entries.get(key) !== entry) return;
    if (Date.now() >= entry.expiresAt) { forget(key); render(); return; }
    render();
    entry.timer = setTimeout(() => expire(key, entry), entry.expiresAt - Date.now());
  }
  close.onclick = dismiss;
  toast.onpointerenter = pause; toast.onpointerleave = schedule;
  toast.addEventListener('focusin', pause); toast.addEventListener('focusout', schedule);
  function show(entry, kind = 'action') {
    dismiss();
    // A modal makes DOM outside it inert, even if a popover is painted above it.
    // Keep dismissible feedback inside the active modal's interaction boundary.
    const host = [...document.querySelectorAll('dialog:modal')].at(-1) || root;
    if (toast.parentElement !== host) host.append(toast);
    if (host !== root) { dialogHost = host; dialogHost.addEventListener('close', dismiss); }
    active = { ...entry, kind }; toast.dataset.state = entry.state;
    toast.setAttribute('role', entry.state === 'error' ? 'alert' : 'status');
    mark.replaceChildren(glyph(entry.state === 'error' ? 'circle-alert' : 'circle-check'));
    title.textContent = entry.title; detail.textContent = entry.detail || ''; detail.hidden = !entry.detail;
    toast.hidden = false; if (toast.showPopover && !toast.matches(':popover-open')) toast.showPopover();
    window.lucide?.createIcons(); schedule();
  }
  function render() {
    const now = Date.now();
    // Refreshing or returning from a suspended tab must not resurrect old confirmations.
    for (const [key, entry] of entries) if (entry.expiresAt <= now) forget(key);
    for (const slot of root.querySelectorAll('[data-action-feedback]')) {
      const entry = entries.get(slot.dataset.actionFeedback); slot.replaceChildren(); slot.hidden = !entry;
      slot.dataset.dismissing = String(Boolean(entry && entry.fadeAt <= now));
      if (!entry) continue;
      slot.dataset.state = entry.state;
      const text = element('div', ''); text.append(element('strong', '', entry.title));
      if (entry.detail) text.append(element('p', '', entry.detail));
      slot.append(glyph(entry.state === 'pending' ? 'loader-circle' : entry.state === 'error' ? 'circle-alert' : 'circle-check'), text);
    }
    for (const control of root.querySelectorAll('[data-action-feedback-control]')) {
      const pending = entries.get(control.dataset.actionFeedbackControl)?.state === 'pending';
      control.dataset.actionPending = String(pending); control.setAttribute('aria-busy', String(pending));
      const label = control.querySelector('span');
      if (label) { if (!control.dataset.actionLabel) control.dataset.actionLabel = label.textContent; label.textContent = pending ? 'Saving…' : control.dataset.actionLabel; }
      if (pending) control.disabled = true;
    }
    window.lucide?.createIcons();
  }
  const api = {
    bind(control, key, group = key) { control.dataset.actionFeedbackControl = key; control.dataset.actionFeedbackGroup = group; },
    mount(parent, key) { const slot = element('div', 'cloud-action-inline'); slot.dataset.actionFeedback = key; slot.hidden = true; parent.append(slot); },
    render,
    begin(key, title, group = key) { const ticket = { key, id: ++serial }; for (const [other, entry] of entries) if (entry.group === group) forget(other); entries.set(key, { id: ticket.id, group, state: 'pending', title }); dismiss(); render(); return ticket; },
    finish(ticket, title, detail = '', error = false) {
      if (entries.get(ticket.key)?.id !== ticket.id) return;
      const entry = { id: ticket.id, group: entries.get(ticket.key).group, state: error ? 'error' : 'success', title, detail };
      forget(ticket.key); entries.set(ticket.key, entry);
      if (!error) {
        entry.fadeAt = Date.now() + SUCCESS_MS; entry.expiresAt = entry.fadeAt + FADE_MS;
        entry.timer = setTimeout(() => expire(ticket.key, entry), SUCCESS_MS);
      }
      render();
      // A slower earlier request must never replace feedback for a newer action.
      if (ticket.id === serial) show(entry);
    },
    page(text, error = false) {
      if (legacy) { legacy.hidden = true; legacy.textContent = ''; }
      if (!text) { if (active?.kind === 'page') dismiss(); return; }
      show({ state: error ? 'error' : 'success', title: error ? 'Dashboard needs attention' : 'Update saved', detail: text }, 'page');
    }
  };
  instances.set(root, api); return api;
}
