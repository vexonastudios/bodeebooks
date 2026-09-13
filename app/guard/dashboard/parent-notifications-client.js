const markerKey = 'bodeeguard-phone-notifications';
export async function notificationRequest(operation, subscription, accountUserId) {
  const response = await fetch('/guard/dashboard/bridge/', { method: 'POST', cache: 'no-store', credentials: 'same-origin',
    signal: AbortSignal.timeout(12000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'phone-notifications', operation, accountUserId, ...(subscription ? { subscription } : {}) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Notifications could not be updated. Try again.');
  return data;
}

/** @param {{userId:string, browser?:Window, request?:typeof notificationRequest, onChange?:(value:{supported:boolean,enabled:boolean,busy:boolean,message:string,iosInstall:boolean})=>void}} options */
export function createParentNotifications({ userId, browser = window, request = notificationRequest, onChange = () => {} }) {
  const nav = browser.navigator;
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
  const standalone = browser.matchMedia('(display-mode: standalone)').matches || nav.standalone;
  const supported = Boolean(browser.Notification && browser.PushManager && nav.serviceWorker && (!ios || standalone));
  let state = { supported, enabled: false, busy: false, message: '', iosInstall: Boolean(ios && !standalone) };
  let publicKey = null, pending = false, disposed = false;
  const call = (operation, subscription) => {
    if (disposed) throw new Error('The parent account changed. Reopen notification settings.');
    return request(operation, subscription, userId);
  };
  const publish = value => { state = { ...state, ...value }; if (!disposed) onChange(state); };
  const marker = () => { try { return JSON.parse(browser.localStorage.getItem(markerKey) || 'null'); } catch { return null; } };
  const saveMarker = () => { try { browser.localStorage.setItem(markerKey, JSON.stringify({ userId, renewed: Date.now() })); } catch { /* Notification permission still works without localStorage. */ } };
  const clearMarker = () => { try { browser.localStorage.removeItem(markerKey); } catch { /* Optional local reminder. */ } };
  async function registration() {
    let timer;
    try { return await Promise.race([nav.serviceWorker.ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Please reopen BodeeGuard and try again.')), 8000); })]); }
    finally { clearTimeout(timer); }
  }
  async function run(work) {
    if (pending || disposed) return;
    pending = true; publish({ busy: true, message: '' });
    try { await work(); } catch (error) { publish({ message: error.message || 'Please try again.' }); }
    finally { pending = false; publish({ busy: false }); }
  }
  async function config() {
    const data = await call('config');
    if (!data.supported || !/^[A-Za-z0-9_-]{87}$/.test(data.publicKey)) throw new Error('Phone notifications are not available right now.');
    publicKey = data.publicKey;
  }
  async function save(subscription) { await call('subscribe', subscription.toJSON()); if (!disposed) { saveMarker(); publish({ enabled: true }); } }
  function matchingKey(sub) {
    const expected = Uint8Array.from(browser.atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const actual = sub?.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
    return { expected, matches: Boolean(actual && actual.length === expected.length && actual.every((v, i) => v === expected[i])) };
  }
  async function bind(manager, sub) {
    const key = matchingKey(sub);
    if (sub && (marker()?.userId !== userId || !key.matches)) { await sub.unsubscribe(); sub = null; }
    return sub || manager.subscribe({ userVisibleOnly: true, applicationServerKey: key.expected });
  }
  return {
    state: () => state,
    async load() {
      if (!supported) { publish({}); return; }
      await run(async () => {
        await config(); const sub = await (await registration()).pushManager.getSubscription();
        publish({ enabled: Boolean(sub && marker()?.userId === userId && matchingKey(sub).matches && browser.Notification.permission === 'granted'),
          message: browser.Notification.permission === 'denied' ? 'Notifications are blocked. Allow BodeeGuard notifications in your phone or browser settings, then try again.' : '' });
      });
    },
    enable() {
      if (!supported || pending || disposed || !publicKey) return Promise.resolve();
      // Permission is requested directly in the parent's click, before any await.
      const permission = browser.Notification.requestPermission();
      return run(async () => {
        if (await permission !== 'granted') { publish({ message: 'Notifications were not allowed. You can enable them in your phone or browser settings.' }); return; }
        const manager = (await registration()).pushManager;
        const sub = await bind(manager, await manager.getSubscription());
        await save(sub); publish({ message: 'Message notifications are on for this device.' });
      });
    },
    disable() {
      return run(async () => {
        const sub = await (await registration()).pushManager.getSubscription();
        // Stop delivery locally even if the network is temporarily unavailable.
        if (sub) { const json = sub.toJSON(); await sub.unsubscribe(); clearMarker(); publish({ enabled: false });
          try { await call('unsubscribe', json); } catch { /* Push provider rejects the invalidated endpoint; server removes it on the next attempt. */ }
        } else clearMarker();
        publish({ enabled: false, message: 'Message notifications are off for this device.' });
      });
    },
    test() { return run(async () => {
      const sub = await (await registration()).pushManager.getSubscription();
      if (!sub || marker()?.userId !== userId) throw new Error('Enable notifications on this device first.');
      await call('test', sub.toJSON()); publish({ message: 'Test sent. Look for a BodeeGuard notification on your phone.' });
    }); },
    async renew() {
      if (!supported || browser.document.hidden || browser.Notification.permission !== 'granted' || pending) return;
      const saved = marker(); if (!saved) return;
      const manager = (await registration()).pushManager;
      const sub = await manager.getSubscription();
      if (saved.userId !== userId) { if (sub) await sub.unsubscribe(); clearMarker(); return; }
      if (!sub || Date.now() - saved.renewed < 86400000) return;
      await run(async () => { await config(); await save(await bind(manager, sub)); });
    },
    dispose() { disposed = true; },
  };
}
