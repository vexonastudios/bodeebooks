import { reviewSongRequest } from './cloud-song-request-review.js?v=20261101-collections1';

export function setupSongRequests({ endpoint, navigate }) {
  const el = (tag, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; n.className = cls; return n; };
  const button = (text, icon, action) => {
    const n = el('button', '', 'btn btn-secondary'); n.type = 'button';
    const mark = el('i'); mark.dataset.lucide = icon; n.append(mark, el('span', text)); n.onclick = action; return n;
  };
  const sheet = el('link'); sheet.rel = 'stylesheet'; sheet.href = '/guard-admin/cloud-song-requests.css?v=20261101-collections1'; document.head.append(sheet);
  let pending = 0, reading = null, dirty = true, lastRead = 0, loading = null, generation = 0, displayedPending = null;
  const list = document.getElementById('mreq-list');
  async function call(path, body, method = 'GET', requestId) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'media', path, method, body,
        ...(method !== 'GET' ? { requestId: requestId || crypto.randomUUID() } : {}) }) });
    const result = await response.json();
    if (!response.ok || result.status >= 400 || result.body?.error) throw Error(result.body?.error || result.error || 'Music could not connect. Please try again.');
    return result.body;
  }
  function announce(count) {
    if (!Number.isSafeInteger(count) || count < 0) return;
    pending = count;
    if (displayedPending !== null && count !== displayedPending && list && !list.querySelector('.song-request-new')) {
      const newer = button('Requests changed — refresh to review', 'refresh-cw', () => void load()); newer.classList.add('song-request-new'); list.prepend(newer); window.lucide?.createIcons();
    }
    const badge = document.getElementById('mreq-badge');
    if (badge) { badge.textContent = count ? String(count) : ''; badge.style.display = count ? 'inline' : 'none'; }
    const nav = document.querySelector('.sidebar [data-tab="music"]');
    if (nav) {
      let mark = nav.querySelector('.song-request-badge');
      if (!mark) { mark = el('span', '', 'song-request-badge'); nav.append(mark); }
      mark.textContent = count > 99 ? '99+' : String(count); mark.hidden = count === 0;
      nav.setAttribute('aria-label', count ? `Music, ${count} song requests awaiting review` : 'Music');
    }
    document.dispatchEvent(new CustomEvent('cloud-music-pending', { detail: { pending: count } }));
  }
  async function refreshPending(force = false) {
    if (force) dirty = true;
    if (document.hidden) return;
    if (reading) { await reading; if (!dirty) return; }
    if (!dirty && Date.now() - lastRead < 1000) return;
    dirty = false;
    reading = (async () => {
      try { const value = await call('/api/music/requests-count'); if (!document.hidden) { announce(value.pending); lastRead = Date.now(); } }
      catch { dirty = true; }
      finally { reading = null; }
    })();
    return reading;
  }
  async function load() {
    if (loading) return loading;
    const ticket = ++generation;
    list.replaceChildren(el('p', 'Loading song requests…', 'cloud-note'));
    loading = (async () => {
      try {
        const requests = await call('/api/music/requests');
        if (ticket !== generation) return;
        displayedPending = requests.length; announce(requests.length); list.replaceChildren();
        const refresh = button('Refresh requests', 'refresh-cw', () => void load()); list.append(refresh);
        if (!requests.length) list.append(el('p', 'No songs are waiting for review.', 'cloud-note'));
        for (const request of requests) list.append(card(request));
        window.lucide?.createIcons();
      } catch (error) {
        list.replaceChildren(el('p', error.message), button('Try again', 'refresh-cw', () => void load()));
      } finally { loading = null; }
    })();
    return loading;
  }
  function card(request) {
    const row = el('article', '', 'song-request-card'); row.dataset.requestId = request.id;
    row.append(el('small', request.student_name), el('h3', request.song_title || request.details), el('p', request.artist_hint || ''));
    const actions = el('div', '', 'song-request-actions'), status = el('p', '', 'song-request-status'); status.setAttribute('role', 'status');
    const review = button('Review & approve', 'play', () => void reviewSongRequest({ request, row, call, button, el, finish }));
    const declineId = crypto.randomUUID();
    const decline = button('Decline', 'x', async () => {
      review.disabled = decline.disabled = true; status.textContent = 'Saving…';
      try { await call(`/api/music/requests/${request.id}/resolve`, { action: 'decline' }, 'PATCH', declineId); finish(row, 'Declined — your child has been notified.'); }
      catch (error) { status.textContent = error.message; review.disabled = decline.disabled = false; }
    });
    actions.append(review, decline); row.append(actions, status); return row;
  }
  function finish(row, text) {
    row.classList.add('is-reviewed'); row.querySelector('.song-request-actions').remove(); row.querySelector('.song-request-status').textContent = text;
    if (displayedPending !== null) displayedPending = Math.max(0, displayedPending - 1);
    announce(Math.max(0, pending - 1)); void refreshPending(true);
    document.dispatchEvent(new CustomEvent('cloud-music-library-changed'));
  }
  function open() {
    const panel = document.getElementById('tab-music'); panel?.classList.remove('mobile-media-add');
    document.body.classList.remove('cloud-media-form-active'); navigate('music');
    document.querySelector('[data-stab="mreq"]')?.click();
  }
  window.loadCloudSongRequests = load; window.refreshMusicRequestsCount = refreshPending;
  document.addEventListener('cloud-open-song-requests', open);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && dirty) void refreshPending(); });
  return { refreshPending, open };
}
