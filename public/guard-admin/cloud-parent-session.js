// Recover rejected dashboard reads through the signed-in outer page. Never replay sends or uploads.
export function createParentSessionRecovery({ window: win = window, document: doc = document,
  request = fetch, onPause = () => {}, onState = () => {}, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending = null;
  function finish(ready) { pending?.finish(ready); }
  const message = event => {
    if (event.origin !== win.location.origin || event.source !== win.parent) return;
    if (event.data?.type === 'bodeeguard-session-ready') finish(true);
    if (event.data?.type === 'bodeeguard-session-required') finish(false);
  };
  const hidden = () => { if (doc.hidden) finish(false); };
  const leave = () => finish(false);
  win.addEventListener('message', message); doc.addEventListener('visibilitychange', hidden); win.addEventListener('pagehide', leave);
  function renew(signal) {
    if (pending) return pending.promise;
    if (doc.hidden || signal?.aborted) return Promise.resolve(false);
    onPause();
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const show = setTimer(() => onState('checking'), 750);
    const timeout = setTimer(() => finish(false), 8000);
    const abort = () => finish(false);
    pending = { promise, finish(ready) {
      clearTimer(show); clearTimer(timeout); signal?.removeEventListener('abort', abort);
      pending = null; resolve(ready);
    } };
    signal?.addEventListener('abort', abort, { once: true });
    win.parent.postMessage({ type: 'bodeeguard-renew-session', reason: 'authentication' }, win.location.origin);
    return promise;
  }
  function unavailable() {
    if (!doc.hidden) onState('unavailable');
    const error = new Error('We couldn’t reconnect right now. Please try again.');
    error.sessionRecovery = true; return error;
  }
  async function recoverRead(url, options) {
    let response;
    try { response = await request(url, options); }
    catch (error) { onState('idle'); throw error; }
    if (response.status === 401) {
      if (!await renew(options.signal) || doc.hidden || options.signal?.aborted) throw unavailable();
      // A renewed token is only a hint. The server must authorize the new read.
      try { response = await request(url, options); }
      catch { throw unavailable(); }
      if (response.status === 401) throw unavailable();
    }
    onState('idle');
    return response;
  }
  return {
    async read(url, options = {}) {
      if (options.method && options.method.toUpperCase() !== 'GET') throw new Error('Session recovery can only repeat a dashboard read.');
      return recoverRead(url, options);
    },
    async readMessages(url, input, options = {}) {
      // These bridge reads use POST. Receipt acknowledgement in list-messages is
      // idempotent; sending, uploading and all other actions must never replay.
      if (!['list-messages', 'read-file'].includes(input?.action)) throw new Error('Only message reads can be recovered.');
      return recoverRead(url, { ...options, method: 'POST', body: JSON.stringify(input) });
    },
    stop() { finish(false); win.removeEventListener('message', message); doc.removeEventListener('visibilitychange', hidden); win.removeEventListener('pagehide', leave); }
  };
}

export function createParentSessionNotice(refresh) {
  const notice = document.createElement('div'); notice.className = 'cloud-session-notice'; notice.hidden = true;
  notice.setAttribute('role', 'status');
  const copy = document.createElement('span');
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn btn-secondary'; retry.textContent = 'Try again'; retry.onclick = () => { retry.disabled = true; void refresh(); };
  notice.append(copy, retry); document.querySelector('.main-content').prepend(notice);
  return state => {
    notice.hidden = state === 'idle'; retry.hidden = state !== 'unavailable'; retry.disabled = false;
    copy.textContent = state === 'checking' ? 'Reconnecting… Your saved information is still here.' : 'Can’t reconnect right now. Try again in a moment.';
  };
}
