const IDS = {
  video: /^[A-Za-z0-9_-]{11}$/,
  playlist: /^[A-Za-z0-9_-]{10,}$/,
  channel: /^UC[A-Za-z0-9_-]{22}$/
};
const LABELS = { video: 'song', playlist: 'playlist', channel: 'channel' };

function requestedSearch(request) {
  const title = String(request.song_title || '').trim();
  const artist = String(request.artist_hint || '').trim();
  const generic = value => /^(?:any(?: song| songs| music| track)?|anything|whatever|no preference)$/i.test(value);
  const query = [title, artist].filter(value => value && !generic(value)).join(' ') || title || artist;
  return { query, type: generic(title) || generic(artist) ? 'channel' : 'video' };
}

function pastedSource(input, preferredType) {
  let url;
  try { url = new URL(input); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return IDS.video.test(id) ? { resource_type: 'video', youtube_id: id } : null;
  }
  if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) return null;
  const channel = url.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})(?:\/|$)/)?.[1];
  if (channel) return { resource_type: 'channel', youtube_id: channel };
  const playlist = url.searchParams.get('list');
  if (preferredType === 'playlist' && playlist && IDS.playlist.test(playlist))
    return { resource_type: 'playlist', youtube_id: playlist };
  const video = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1];
  if (video && IDS.video.test(video)) return { resource_type: 'video', youtube_id: video };
  if (playlist && IDS.playlist.test(playlist)) return { resource_type: 'playlist', youtube_id: playlist };
  return null;
}

function reviewUrl(type, id) {
  return type === 'channel' ? 'https://www.youtube.com/channel/' + id :
    type === 'playlist' ? 'https://www.youtube.com/playlist?list=' + id :
      'https://www.youtube.com/watch?v=' + id;
}

export async function reviewSongRequest({ request, row, call, button, el, finish }) {
  const dialog = el('dialog', '', 'song-review-dialog');
  dialog.setAttribute('aria-label', `Review music request for ${request.student_name}`);
  const head = el('div', '', 'song-request-actions');
  const close = button('Close', 'x', () => { if (!busy) dialog.close(); });
  head.append(el('h2', `Music for ${request.student_name}`), close);
  const status = el('p', '', 'song-request-status'); status.setAttribute('role', 'status');
  const searchStatus = el('p', '', 'song-review-search-status'); searchStatus.setAttribute('role', 'status');
  const results = el('div', '', 'song-review-results');
  const preview = el('div', '', 'song-review-preview');
  const existing = el('select'); existing.setAttribute('aria-label', 'Choose an approved song from your library');
  existing.append(new Option('Or choose an approved song from your library…', ''));
  const kind = el('select'); kind.setAttribute('aria-label', 'Search for a song, playlist, or channel');
  for (const [value, label] of [['video', 'Songs'], ['playlist', 'Playlists'], ['channel', 'Channels']]) kind.append(new Option(label, value));
  const search = el('input'); search.maxLength = 120; search.setAttribute('aria-label', 'Search YouTube or paste a link');
  search.placeholder = 'Search YouTube or paste a link';
  const title = el('input'); title.maxLength = 200; title.setAttribute('aria-label', 'Recording title');
  title.placeholder = 'Recording title'; title.hidden = true;
  const check = el('input'); check.type = 'checkbox'; check.disabled = true;
  const consent = el('label', '', 'song-review-consent');
  const consentText = el('span', 'Select a result to review before adding it.');
  consent.append(check, consentText);
  let selected = null, attempt = null, preparation = 0, busy = false;
  const approve = button('Add for ' + request.student_name, 'check', async () => {
    if (!selected || !check.checked || busy) return;
    const body = { action: 'approve', ...selected, title: title.value.trim(), screened: true };
    const key = JSON.stringify(body);
    if (!attempt || attempt.key !== key) attempt = { key, id: crypto.randomUUID() };
    busy = true; approve.disabled = close.disabled = true;
    status.textContent = 'Approving this ' + LABELS[selected.resource_type] + ' for ' + request.student_name + '…';
    try {
      await call(`/api/music/requests/${request.id}/resolve`, body, 'PATCH', attempt.id);
      finish(row, 'Approved — added for ' + request.student_name + '.');
      dialog.close();
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; close.disabled = false; approve.disabled = !check.checked; }
  });
  approve.disabled = true;

  function clearSelection(clearResults = false) {
    preparation++;
    selected = null; attempt = null; check.checked = false; check.disabled = true; approve.disabled = true;
    title.value = ''; title.hidden = true; title.readOnly = false;
    preview.replaceChildren();
    if (clearResults) { results.replaceChildren(); searchStatus.textContent = ''; }
  }
  function choose(item) {
    const type = item.resource_type || 'video', id = item.youtube_id;
    if (!IDS[type]?.test(id || '')) throw Error('Choose a valid YouTube ' + (LABELS[type] || 'result') + '.');
    clearSelection();
    kind.value = type;
    existing.hidden = type !== 'video';
    selected = item.id ? { resource_type: 'video', track_id: item.id } :
      { resource_type: type, youtube_id: id, ...(type === 'video' ? { artist: item.channel || item.artist || '' } : {}) };
    title.value = item.title || request.song_title || '';
    title.hidden = type !== 'video';
    title.readOnly = Boolean(item.id);
    check.disabled = false;
    consentText.textContent = type === 'video'
      ? 'I played this recording and approve it for this child.'
      : `I reviewed this ${LABELS[type]} and approve its current and future videos for this child.`;
    approve.querySelector('span').textContent = `Add ${LABELS[type]} for ${request.student_name}`;
    const heading = el('strong', item.title || request.song_title || 'YouTube ' + LABELS[type]);
    const link = el('a', 'Open ' + LABELS[type] + ' on YouTube to review');
    link.href = reviewUrl(type, id); link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (type === 'video') {
      const frame = el('iframe'); frame.title = 'Review the selected song';
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id;
      frame.allow = 'encrypted-media; fullscreen'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      preview.replaceChildren(heading, frame, link);
    } else {
      const hint = el('p', type === 'channel'
        ? 'This adds the channel’s uploads as a music collection. Future uploads appear automatically.'
        : 'This adds the whole playlist as a music collection. New songs added to it appear automatically.');
      preview.replaceChildren(heading, hint, link);
    }
    status.textContent = 'Review the ' + LABELS[type] + ', then confirm below.';
  }

  const find = button('Search YouTube', 'search', () => void runSearch());
  async function runSearch() {
    clearSelection(true);
    const ticket = preparation, input = search.value.trim();
    if (!input) { searchStatus.textContent = 'Enter a song, artist, playlist, or channel name.'; return; }
    const pasted = pastedSource(input, kind.value);
    if (pasted) {
      try {
        if (pasted.resource_type === 'video') {
          searchStatus.textContent = 'Finding the recording…';
          const info = await call('/api/music/lookup?youtube_id=' + pasted.youtube_id);
          if (ticket === preparation && dialog.open) choose({ ...pasted, title: info.title, channel: info.author_name });
        } else if (ticket === preparation && dialog.open) choose({ ...pasted, title: request.song_title });
      } catch (error) { if (ticket === preparation) searchStatus.textContent = error.message; }
      return;
    }
    if (input.length < 2) { searchStatus.textContent = 'Enter at least two characters to search.'; return; }
    find.disabled = kind.disabled = true;
    const type = kind.value;
    searchStatus.textContent = 'Searching YouTube ' + type + 's…';
    try {
      const found = await call('/api/youtube/search?type=' + type + '&q=' + encodeURIComponent(input));
      if (ticket !== preparation || !dialog.open) return;
      const items = (found.results || []).filter(item => IDS[type].test(item.youtube_id || ''));
      searchStatus.textContent = items.length ? 'Choose a result to review.' : 'No results. Try another name or search type.';
      for (const item of items) {
        const choice = button('', 'play', () => choose(item));
        choice.classList.add('song-review-result');
        const label = choice.querySelector('span'); label.textContent = item.title;
        if (item.channel) label.append(el('small', item.channel));
        const thumbnail = String(item.thumbnail_url || '');
        if (/^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\//.test(thumbnail)) {
          const image = el('img'); image.src = thumbnail; image.alt = ''; choice.prepend(image);
        }
        results.append(choice);
      }
      window.lucide?.createIcons();
    } catch (error) { if (ticket === preparation) searchStatus.textContent = error.message; }
    finally { find.disabled = kind.disabled = false; }
  }
  search.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); find.click(); } });
  search.addEventListener('input', () => { clearSelection(true); existing.value = ''; });
  kind.addEventListener('change', () => { existing.hidden = kind.value !== 'video'; void runSearch(); });
  existing.addEventListener('change', () => {
    clearSelection(); search.value = '';
    const track = library.get(existing.value);
    if (track) choose({ ...track, resource_type: 'video', channel: track.artist });
  });
  check.addEventListener('change', () => { approve.disabled = !check.checked || busy; });
  const library = new Map();
  const source = el('div', '', 'song-review-source');
  const searchRow = el('div', '', 'song-review-search-row'); searchRow.append(kind, search);
  source.append(searchRow, find, searchStatus, results, existing, title);
  const initial = requestedSearch(request); kind.value = initial.type; search.value = initial.query;
  existing.hidden = initial.type !== 'video';
  dialog.append(head, el('p', `Requested: ${request.song_title || request.details}${request.artist_hint ? ' — ' + request.artist_hint : ''}`),
    source, preview, consent, status, approve);
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { preparation++; dialog.remove(); row.querySelector('button')?.focus(); });
  document.body.append(dialog); dialog.showModal(); window.lucide?.createIcons();
  void runSearch();
  try {
    for (const track of await call('/api/music/tracks')) if (track.active) {
      library.set(track.id, track);
      existing.append(new Option(`${track.title}${track.artist ? ' — ' + track.artist : ''}`, track.id));
    }
  } catch { status.textContent = 'The library could not load. You can still search YouTube or paste a link.'; }
}
