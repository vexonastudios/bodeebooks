(() => {
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === window.parent && event.data?.type === 'bodeeguard-session-ready') location.reload();
  });
  if (document.body.dataset.status === '401') window.parent.postMessage({type:'bodeeguard-renew-session'}, location.origin);
})();
