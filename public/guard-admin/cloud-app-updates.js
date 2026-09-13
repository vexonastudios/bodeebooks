const validVersion = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const attemptKey = 'bodeeguard-parent-update-attempt';

// Reuses dashboard refresh events; no additional polling timer or family API calls.
export function createParentUpdates({
  version, document: doc = document, window: win = window, fetch: request = fetch,
  now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout,
  canReload = () => true, onReady = () => {}, onCheck = () => {}, reload = () => {},
}) {
  let started = false, present = true, interacted = false, pending = null;
  let checkedAt = -Infinity, latest = null, shell = win.parent === win ? version : null, reloading = false;
  const visible = () => started && present && !doc.hidden;
  function previousAttempt() {
    try { return JSON.parse(win.sessionStorage.getItem(attemptKey) || 'null'); } catch { return null; }
  }
  function recordAttempt() {
    try { win.sessionStorage.setItem(attemptKey, JSON.stringify({ version: latest, at: now() })); return true; }
    catch { return false; } // Without a persistent loop guard, require an explicit click.
  }
  function evaluate() {
    if (!visible() || !latest || reloading) return;
    if (latest === version && (!shell || shell === latest)) { onReady(null); return; }
    const attempt = previousAttempt();
    const recent = attempt && (attempt.version === latest || now() - attempt.at < 15 * 60 * 1000);
    if (shell && !interacted && !recent && canReload() && recordAttempt()) {
      reloading = true;
      reload();
    } else onReady(latest);
  }
  function check() {
    if (!visible() || win.navigator?.onLine === false || reloading) return Promise.resolve();
    if (pending) return pending.promise;
    if (now() - checkedAt < 60000) { evaluate(); return Promise.resolve(); }
    checkedAt = now();
    onCheck();
    const work = { controller: new AbortController(), promise: null };
    pending = work;
    const timeout = setTimer(() => work.controller.abort(), 8000);
    work.promise = Promise.resolve().then(async () => {
      const response = await request('/guard-parent-version.json', {
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: work.controller.signal,
      });
      if (!response.ok) return;
      const text = await response.text();
      if (text.length > 256) return;
      const data = JSON.parse(text);
      if (work.controller.signal.aborted || pending !== work || !visible() || !validVersion(data.version)) return;
      latest = data.version;
      evaluate();
    }).catch(() => { /* Offline/rollout failures must not interrupt the dashboard. */ }).finally(() => {
      clearTimer(timeout);
      if (pending === work) pending = null;
    });
    return work.promise;
  }
  function suspend() {
    if (pending) { pending.controller.abort(); pending = null; checkedAt = -Infinity; }
  }
  const visibility = () => visible() ? void check() : suspend();
  const pagehide = () => { present = false; suspend(); };
  const pageshow = event => { if (event.persisted) { present = true; void check(); } };
  const refresh = () => { void check(); };
  const interaction = event => {
    if (!event.target?.closest?.('#cloud-app-update')) interacted = true;
  };
  const interactionEvents = ['pointerdown', 'keydown', 'input', 'change', 'submit', 'paste', 'drop', 'click'];
  return {
    check,
    defer() { reloading = false; interacted = true; if (latest) onReady(latest); },
    setShellVersion(value) { if (validVersion(value)) { shell = value; evaluate(); } },
    // Explicit navigation remains available even if an edge served an old shell.
    apply() {
      if (!latest || !visible()) return false;
      if (interacted && !win.confirm('Update BodeeGuard now? Save your work and finish any recording or upload first. Unsaved changes will be lost.')) return false;
      recordAttempt(); reloading = true; return true;
    },
    start() {
      if (started || !validVersion(version)) return;
      started = true; present = true;
      for (const event of interactionEvents) doc.addEventListener(event, interaction, true);
      doc.addEventListener('visibilitychange', visibility);
      win.addEventListener('pagehide', pagehide);
      win.addEventListener('pageshow', pageshow);
      win.addEventListener('online', refresh);
      win.addEventListener('bodeeguard-check-update', refresh);
      void check();
    },
    stop() {
      started = false; suspend();
      for (const event of interactionEvents) doc.removeEventListener(event, interaction, true);
      doc.removeEventListener('visibilitychange', visibility);
      win.removeEventListener('pagehide', pagehide);
      win.removeEventListener('pageshow', pageshow);
      win.removeEventListener('online', refresh);
      win.removeEventListener('bodeeguard-check-update', refresh);
    },
  };
}

export function setupParentUpdates() {
  const version = document.querySelector('meta[name="bodeeguard-app-version"]')?.content;
  if (!validVersion(version)) return;
  const banner = document.createElement('aside');
  banner.id = 'cloud-app-update'; banner.hidden = true;
  banner.setAttribute('aria-label', 'BodeeGuard update');
  const text = document.createElement('p'); text.setAttribute('role', 'status');
  text.textContent = 'Update ready. Save your work, then update BodeeGuard.';
  const button = document.createElement('a'); button.href = '/dashboard/'; button.target = '_top';
  button.textContent = 'Update app';
  banner.append(text, button); document.body.append(banner);
  const send = type => window.parent.postMessage({ type }, location.origin);
  const controller = createParentUpdates({
    version,
    canReload: () => !document.querySelector('dialog[open], [aria-modal="true"], .recording') &&
      !Array.from(document.querySelectorAll('audio,video')).some(media => !media.paused),
    onReady: value => { banner.hidden = !value; },
    onCheck: () => send('bodeeguard-check-worker'),
    reload: () => {
      if (window.parent === window) window.location.reload();
      else send('bodeeguard-reload-app');
    },
  });
  button.addEventListener('click', event => { if (!controller.apply()) event.preventDefault(); });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'bodeeguard-shell-version') controller.setShellVersion(event.data.version);
    if (event.data?.type === 'bodeeguard-check-update') void controller.check();
    if (event.data?.type === 'bodeeguard-update-deferred') controller.defer();
  });
  controller.start();
  return controller;
}

if (typeof document !== 'undefined') setupParentUpdates();
