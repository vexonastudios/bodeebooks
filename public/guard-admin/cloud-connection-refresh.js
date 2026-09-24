// Only small live-connection checks repeat. Full plans/history retain their own
// slower refresh, and hidden windows stop both requests and timers.
export function createConnectionRefresh({ refresh, onError = () => {}, document: doc = document,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  let active = false, timer = null, pending = null, failures = 0;
  function stop() {
    active = false; clearTimer(timer); timer = null;
    const old = pending; pending = null; old?.abort();
  }
  function run() {
    if (!active || doc.hidden || pending) return;
    const controller = new AbortController(); pending = controller;
    Promise.resolve().then(() => refresh(controller.signal)).then(() => { failures = 0; }).catch(error => {
      if (!controller.signal.aborted) { failures++; onError(error); }
    }).finally(() => {
      if (pending !== controller) return;
      pending = null;
      if (active && !doc.hidden) timer = setTimer(run, Math.min(120000, 30000 * 2 ** Math.min(failures, 2)));
    });
  }
  return { start() { if (active) return; active = true; timer = setTimer(run, 30000); }, stop };
}
