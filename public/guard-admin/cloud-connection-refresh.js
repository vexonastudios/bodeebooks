// Only small live-connection checks repeat. Full plans/history and message
// delivery have separate lifecycles. Hidden windows are stopped by the caller.
export function createConnectionRefresh({ refresh, onError = () => {}, onIdleChange = () => {}, document: doc = document,
  window: win = doc.defaultView, setTimer = setTimeout, clearTimer = clearTimeout,
  now = () => performance.now() }) {
  const activeInterval = 30000, idleAfter = 3 * 60000;
  const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
  let active = false, timer = null, pending = null, failures = 0;
  let lastInteraction = 0, lastFinished = 0, idleTimer = null, documents = [], windows = [];
  const idle = () => active && now() - lastInteraction >= idleAfter;
  const interval = () => Math.min(120000, activeInterval * 2 ** Math.min(failures, 2));
  function schedule() {
    clearTimer(timer); timer = null;
    if (active && !doc.hidden && !idle() && !pending) timer = setTimer(() => run(), Math.max(0, interval() - (now() - lastFinished)));
  }
  function publishIdle(value) {
    for (const target of documents) {
      if (target.documentElement) target.documentElement.dataset.parentIdle = String(value);
      target.dispatchEvent(new Event('bodeeguard-parent-activity'));
    }
  }
  function waitForIdle() {
    clearTimer(idleTimer);
    const remaining = idleAfter - (now() - lastInteraction);
    if (remaining > 0) { idleTimer = setTimer(waitForIdle, remaining); return; }
    idleTimer = null; clearTimer(timer); timer = null;
    publishIdle(true); onIdleChange(true);
  }
  function interact() {
    if (!active || doc.hidden) return;
    const returning = idle();
    lastInteraction = now();
    // Only returning from idle bypasses the interval. Normal typing/movement
    // must not produce a request, and an in-flight check already covers return.
    if (returning) { publishIdle(false); onIdleChange(false); waitForIdle(); run(true); }
  }
  function listen() {
    documents = [doc]; windows = win ? [win] : [];
    // The hosted dashboard lives in a same-origin iframe. Activity in the PWA
    // header and refocusing the outer window count as returning as well.
    try {
      if (win?.parent && win.parent !== win && win.parent.document) {
        documents.push(win.parent.document); windows.push(win.parent);
      }
    } catch { /* An external frame cannot expose its parent's activity. */ }
    for (const target of documents) for (const event of events) target.addEventListener(event, interact, { passive: true, capture: true });
    for (const target of windows) target.addEventListener('focus', interact);
  }
  function stop() {
    active = false; clearTimer(timer); clearTimer(idleTimer); timer = idleTimer = null;
    publishIdle(true);
    for (const target of documents) for (const event of events) target.removeEventListener(event, interact, true);
    for (const target of windows) target.removeEventListener('focus', interact);
    documents = []; windows = [];
    const old = pending; pending = null; old?.abort();
  }
  function run(immediate = false) {
    if (!active || doc.hidden || pending) return;
    if (!immediate && idle()) { clearTimer(timer); timer = null; return; }
    // Preserve error backoff while the parent is actively using the dashboard.
    if (!immediate && now() - lastFinished < interval()) { schedule(); return; }
    clearTimer(timer); timer = null;
    const controller = new AbortController(); pending = controller;
    Promise.resolve().then(() => { controller.signal.throwIfAborted(); return refresh(controller.signal); })
      .then(() => { if (pending === controller) failures = 0; }).catch(error => {
        if (!controller.signal.aborted && pending === controller) { failures++; onError(error); }
      }).finally(() => {
        if (pending !== controller) return;
        pending = null; lastFinished = now(); schedule();
      });
  }
  return {
    start() {
      if (active || doc.hidden) return;
      active = true; lastInteraction = lastFinished = now(); listen(); publishIdle(false); waitForIdle(); schedule();
    },
    stop,
    isIdle: idle,
  };
}
