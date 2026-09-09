(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CloudPush = factory();
})(globalThis, function () {
  'use strict';
  // Idle sockets carry only ping/pong. No recurring message/database requests.
  function createCloudPushClient({ getIdentity, getTicket, onSignal, onReady = () => {}, onConnection = () => {},
    WebSocketImpl = globalThis.WebSocket, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
    let key = '', generation = 0, socket = null, timer = null, ping = null, stopped = false, connecting = false, connected = false, failures = 0, nextAttempt = 0;
    function clearConnection() {
      generation++; clearTimer(timer); clearTimer(ping); timer = ping = null; connecting = connected = false;
      const old = socket; socket = null; if (old) old.close(); onConnection(false);
    }
    function retry() {
      clearConnection(); failures++;
      const delay = Math.min(60000, 1000 * 2 ** Math.min(failures - 1, 6));
      nextAttempt = now() + delay;
      if (!stopped && key) timer = setTimer(refresh, delay);
      timer?.unref?.();
    }
    async function connect(identity) {
      const ticketGeneration = generation; connecting = true;
      try {
        const ticket = await getTicket(identity);
        if (stopped || ticketGeneration !== generation || JSON.stringify(getIdentity()) !== key) return;
        const url = new URL(ticket.url);
        if (url.protocol !== 'wss:' || url.hostname !== 'bodeeguard-cloud-assets.james-7f8.workers.dev' || url.port || url.username || url.password || url.pathname !== '/v1/push/connect') throw Error('Invalid notification endpoint');
        const ws = new WebSocketImpl(url.href); socket = ws;
        const current = () => !stopped && socket === ws && ticketGeneration === generation && JSON.stringify(getIdentity()) === key;
        let lastPong = now();
        timer = setTimer(() => { if (current()) retry(); }, 15000); timer?.unref?.();
        ws.onopen = () => {
          if (!current()) { ws.close(); return; }
          clearTimer(timer); connecting = false; connected = true; failures = 0; onConnection(true);
          timer = setTimer(() => { if (current()) { clearConnection(); nextAttempt = 0; refresh(); } }, 50 * 60 * 1000); timer?.unref?.();
          const keepAlive = () => {
            if (!current()) return;
            if (now() - lastPong > 75000) { retry(); return; }
            try { ws.send('ping'); } catch (_) { retry(); return; }
            ping = setTimer(keepAlive, 30000); ping?.unref?.();
          };
          ping = setTimer(keepAlive, 30000); ping?.unref?.();
          onReady();
        };
        ws.onmessage = event => {
          if (!current()) return;
          if (event.data === 'pong') { lastPong = now(); return; }
          if (typeof event.data !== 'string' || event.data.length > 512) return;
          try { const hint = JSON.parse(event.data); if (['messages', 'screenshots'].includes(hint.kind) && /^[a-f0-9-]{36}$/i.test(hint.studentId)) onSignal(hint); } catch (_) { /* Ignore malformed hints. */ }
        };
        ws.onerror = ws.onclose = () => { if (current()) retry(); };
      } catch (_) { if (!stopped && ticketGeneration === generation) retry(); }
      finally { if (ticketGeneration === generation) connecting = false; }
    }
    function refresh() {
      if (stopped) return;
      const identity = getIdentity(), nextKey = identity ? JSON.stringify(identity) : '';
      if (nextKey !== key) { clearConnection(); key = nextKey; failures = 0; nextAttempt = 0; }
      if (!key || connected || connecting || socket || now() < nextAttempt) return;
      void connect(identity);
    }
    return { refresh, start() { stopped = false; refresh(); }, isConnected: () => connected, stop() { stopped = true; key = ''; clearConnection(); } };
  }
  return { createCloudPushClient };
});
