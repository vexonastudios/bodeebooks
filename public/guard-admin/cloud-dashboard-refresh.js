// Parent statistics are requested only while this page is visible. Child-side
// tracking and immediate message delivery have their own lifecycles.
export function createDashboardRefresh({
  refreshSnapshot, requestComputers, onError, onBusy = () => {},
  onResume = () => {}, onSuspend = () => {}, canRefresh = () => true,
  document: doc = document, window: win = window,
  setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now,
}) {
  const interval = 30 * 60 * 1000;
  let started = false, present = true, pending = null, timer = null, failures = 0;
  let lastComputerRequest = -Infinity;
  const isVisible = () => started && present && !doc.hidden;

  function settle(signal) {
    return new Promise((resolve, reject) => {
      signal.throwIfAborted();
      const abort = () => { clearTimer(wait); reject(signal.reason); };
      const wait = setTimer(() => { signal.removeEventListener('abort', abort); resolve(); }, 1800);
      signal.addEventListener('abort', abort, { once: true });
    });
  }
  function run(computers = false, manual = false, automatic = false) {
    if (automatic && !canRefresh()) { clearTimer(timer); timer = null; return Promise.resolve(); }
    if (!isVisible()) return Promise.resolve();
    if (pending) return pending.promise;
    clearTimer(timer);
    const work = { controller: new AbortController(), promise: null };
    const { signal } = work.controller;
    pending = work;
    onBusy(true);
    work.promise = Promise.resolve().then(async () => {
      signal.throwIfAborted();
      if (computers && (manual || now() - lastComputerRequest >= 60000)) {
        // Reopening the tab still reads a fresh snapshot, but does not wake every
        // child repeatedly. Explicit Refresh always bypasses this short limit.
        lastComputerRequest = now();
        // Even if a child cannot respond, show the latest stored snapshot.
        try { await requestComputers(signal); await settle(signal); }
        catch (error) { if (signal.aborted) throw error; }
      }
      signal.throwIfAborted();
      await refreshSnapshot(signal);
      signal.throwIfAborted();
      failures = 0;
    }).catch(error => {
      if (signal.aborted || pending !== work || !isVisible()) return;
      failures++;
      onError(error);
    }).finally(() => {
      // A hidden page may already have started a new run after returning.
      if (pending !== work) return;
      pending = null;
      onBusy(false);
      if (isVisible() && canRefresh()) timer = setTimer(() => run(!failures, false, true), failures
        ? Math.min(interval, 60000 * 2 ** Math.min(failures, 5)) : interval);
    });
    return work.promise;
  }
  function suspend() {
    clearTimer(timer);
    const old = pending;
    pending = null;
    old?.controller.abort();
    onBusy(false);
    onSuspend();
  }
  function resume() {
    if (!isVisible()) return;
    onResume();
    void run(true);
  }
  const visibility = () => { if (isVisible()) resume(); else suspend(); };
  const pagehide = () => { present = false; suspend(); };
  const pageshow = event => { if (event.persisted) { present = true; resume(); } };
  return {
    isVisible,
    pauseAutomatic() { clearTimer(timer); timer = null; },
    refresh: () => run(),
    refreshComputers: () => run(true, true),
    start() {
      if (started) return;
      started = true; present = true;
      doc.addEventListener('visibilitychange', visibility);
      win.addEventListener('pagehide', pagehide);
      win.addEventListener('pageshow', pageshow);
      win.addEventListener('online', resume);
      visibility();
    },
    stop() {
      started = false;
      doc.removeEventListener('visibilitychange', visibility);
      win.removeEventListener('pagehide', pagehide);
      win.removeEventListener('pageshow', pageshow);
      win.removeEventListener('online', resume);
      suspend();
    },
  };
}
