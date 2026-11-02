export function setupSongRequests({ endpoint, navigate }) {
  const el = (tag, text = '', cls = '') => { const n = document.createElement(tag); n.textContent = text; n.className = cls; return n; };
  const button = (text, icon, action) => {
    const n = el('button', '', 'btn btn-secondary'); n.type = 'button';
    const mark = el('i'); mark.dataset.lucide = icon; n.append(mark, el('span', text)); n.onclick = action; return n;
  };
  const sheet = el('link'); sheet.rel = 'stylesheet'; sheet.href = '/guard-admin/cloud-song-requests.css?v=20261101-song-search1'; document.head.append(sheet);
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
    const review = button('Review & approve', 'play', () => void reviewRequest(request, row));
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
  async function reviewRequest(request, row) {
    const dialog = el('dialog', '', 'song-review-dialog'); dialog.setAttribute('aria-label', `Review song for ${request.student_name}`);
    const head = el('div', '', 'song-request-actions');
    const close = button('Close', 'x', () => dialog.close()); head.append(el('h2', `Song for ${request.student_name}`), close);
    const status = el('p', '', 'song-request-status'); status.setAttribute('role', 'status');
    const existing = el('select'); existing.setAttribute('aria-label', 'Choose from your music library'); existing.append(new Option('Choose a recording from your library…', ''));
    const url = el('input'); url.placeholder = 'Search song or artist, or paste a YouTube link'; url.setAttribute('aria-label', 'Song or artist, or YouTube link');
    const title = el('input'); title.maxLength = 200; title.setAttribute('aria-label', 'Recording title'); title.placeholder = 'Recording title';
    const preview = el('div', '', 'song-review-preview');
    const searchStatus = el('p', '', 'song-review-search-status'); searchStatus.setAttribute('role', 'status');
    const results = el('div', '', 'song-review-results');
    const check = el('input'); check.type = 'checkbox'; check.disabled = true;
    const consent = el('label', '', 'song-review-consent'); consent.append(check, el('span', 'I reviewed this recording and approve it for this child.'));
    let selected = null, attempt = null, preparation = 0, busy = false;
    const approve = button('Approve & add to library', 'check', async () => {
      if (!selected || !check.checked || busy) return;
      const body = { action: 'approve', ...selected, title: title.value.trim(), screened: true };
      const key = JSON.stringify(body); if (!attempt || attempt.key !== key) attempt = { key, id: crypto.randomUUID() };
      busy = true; approve.disabled = true; status.textContent = 'Approving and assigning this recording…';
      try { await call(`/api/music/requests/${request.id}/resolve`, body, 'PATCH', attempt.id); finish(row, 'Approved — added to this child’s library.'); dialog.close(); }
      catch (error) { status.textContent = error.message; }
      finally { busy = false; approve.disabled = !check.checked; }
    }); approve.disabled = true;
    function reset() { preparation++; selected = null; check.checked = false; check.disabled = true; approve.disabled = true; preview.replaceChildren(); results.replaceChildren(); searchStatus.textContent = ''; }
    function prepare(track) {
      if (!/^[A-Za-z0-9_-]{11}$/.test(track.youtube_id || '')) throw Error('Choose a valid YouTube recording.');
      selected = track.id ? { track_id: track.id } : { youtube_id: track.youtube_id, artist: track.artist || '' };
      title.value = track.title; title.readOnly = Boolean(track.id); check.disabled = false; searchStatus.textContent = ''; status.textContent = 'Play the recording to review it, then confirm below.';
      const frame = el('iframe'); frame.title = 'Review the selected song'; frame.src = 'https://www.youtube-nocookie.com/embed/' + track.youtube_id;
      frame.allow = 'encrypted-media; fullscreen'; frame.referrerPolicy = 'strict-origin-when-cross-origin'; preview.replaceChildren(frame);
    }
    const lookup = button('Find recording', 'search', async () => {
      reset();
      const ticket = preparation, input = url.value.trim();
      const id = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ||
        (/^[A-Za-z0-9_-]{11}$/.test(input) ? input : null);
      if (!input) { searchStatus.textContent = 'Enter a song, artist, or YouTube link.'; return; }
      lookup.disabled = true;
      searchStatus.textContent = id ? 'Finding the recording…' : 'Searching for recordings…';
      try {
        if (id) {
          const info = await call('/api/music/lookup?youtube_id=' + id);
          if (ticket === preparation && dialog.open) prepare({ youtube_id: id, title: info.title, artist: info.author_name });
        } else {
          if (input.length < 2) { searchStatus.textContent = 'Enter at least two characters to search.'; return; }
          const found = await call('/api/youtube/search?type=video&q=' + encodeURIComponent(input));
          if (ticket !== preparation || !dialog.open) return;
          const tracks = (found.results || []).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.youtube_id || ''));
          searchStatus.textContent = tracks.length ? 'Choose a recording below to play and review.' : 'No recordings found. Try a different song or artist.';
          for (const item of tracks) {
            const choice = button(item.title + (item.channel ? ' — ' + item.channel : ''), 'play', () => {
              reset();
              url.value = item.youtube_url || 'https://www.youtube.com/watch?v=' + item.youtube_id;
              prepare({ youtube_id: item.youtube_id, title: item.title, artist: item.channel });
            });
            choice.classList.add('song-review-result');
            results.append(choice);
          }
          window.lucide?.createIcons();
        }
      } catch (error) { if (ticket === preparation) searchStatus.textContent = error.message; }
      finally { lookup.disabled = false; }
    });
    url.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); lookup.click(); } });
    const options = new Map(); existing.onchange = () => { reset(); url.value = ''; if (options.has(existing.value)) prepare(options.get(existing.value)); };
    url.oninput = () => { reset(); existing.value = ''; }; check.onchange = () => { approve.disabled = !check.checked || busy; };
    const source = el('div', '', 'song-review-source'); source.append(existing, el('p', 'Or choose a different recording'), url, lookup, searchStatus, results, title);
    dialog.append(head, el('p', `Requested: ${request.song_title || request.details}${request.artist_hint ? ' — ' + request.artist_hint : ''}`), source, preview, consent, status, approve);
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    close.onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('close', () => { preparation++; dialog.remove(); row.querySelector('button')?.focus(); });
    document.body.append(dialog); dialog.showModal(); window.lucide?.createIcons();
    try { for (const track of await call('/api/music/tracks')) if (track.active) { options.set(track.id, track); existing.append(new Option(`${track.title}${track.artist ? ' — ' + track.artist : ''}`, track.id)); } }
    catch { status.textContent = 'The library could not load. You can still paste a song link or reopen to retry.'; }
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
