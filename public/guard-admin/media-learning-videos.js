import { mediaFetch as fetch } from './cloud-media-transport.js';
const logger = console;

let pendingVideo = null;

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const MAX_VIDEO_LINKS = 50;
let batch = null;
let busy = false;

function extractYouTubeId(value) {
  const input = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return '';
    const host = url.hostname.toLowerCase();
    let id = '';
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
  } catch { return ''; }
}

export function parseLearningVideoLinks(value) {
  // A Markdown link's label and destination refer to one entry, not two videos.
  const text = String(value || '').replace(/\[[^\]\r\n]*\]\(([^\s)]+)\)/g, '$1');
  if (text.length > 20000) throw new Error('Paste up to 50 video links at a time.');
  const tokens = text.split(/[\s,;]+/).filter(token => token && !/^(?:[-*•]|\d+[.)])$/.test(token))
    .map(token => token.replace(/^[<"']+|[>"'.)]+$/g, ''));
  const ids = [], invalid = [], seen = new Set();
  let duplicates = 0;
  for (const token of tokens) {
    const id = extractYouTubeId(token);
    if (!id) invalid.push(token);
    else if (seen.has(id)) duplicates++;
    else { seen.add(id); ids.push(id); }
  }
  if (ids.length > MAX_VIDEO_LINKS) throw new Error('Paste up to 50 different videos at a time. Nothing has been added.');
  return { ids, invalid, duplicates };
}

function setBusy(value) {
  busy = value;
  document.getElementById('learning-video-url').disabled = value;
  document.querySelectorAll('.learning-video-add-row button, #learning-video-batch button, #learning-video-save, #learning-video-preview-cancel')
    .forEach(button => { button.disabled = value; });
}

async function videoMetadata(youtubeId) {
  let metadata = null;
  try {
    const response = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + youtubeId) + '&format=json', { signal: AbortSignal.timeout(6000) });
    if (response.ok) metadata = await response.json();
  } catch (error) {
    logger.info('learning-videos', 'Public YouTube metadata was unavailable; offering direct-link approval', error);
  }
  return {
    youtube_id: youtubeId,
    title: metadata?.title || 'Unlisted learning video',
    channel: metadata?.author_name || '',
    thumbnail_url: metadata?.thumbnail_url || 'https://img.youtube.com/vi/' + youtubeId + '/mqdefault.jpg',
    direct_parent_link: true,
    metadataHidden: !metadata
  };
}

function renderBatch() {
  const panel = document.getElementById('learning-video-batch');
  if (!batch) { panel.hidden = true; return; }
  panel.hidden = false;
  const added = batch.entries.filter(item => item.state === 'added').length;
  const pending = batch.entries.filter(item => item.state !== 'added');
  const failed = pending.length;
  const summary = batch.saving ? 'Adding videos… ' + added + ' of ' + batch.entries.length + ' added.'
    : batch.finished ? added + ' added · ' + batch.skipped + ' skipped · ' + (failed + batch.invalid.length) + ' need attention'
    : pending.length + ' videos ready · ' + batch.skipped + ' duplicates skipped' + (batch.invalid.length ? ' · ' + batch.invalid.length + ' invalid entries' : '');
  panel.innerHTML = '<h4 id="learning-video-batch-heading">' + (batch.finished ? 'Import results' : 'Add these learning videos') + '</h4>' +
    '<p class="learning-video-batch-summary" role="status" aria-live="polite">' + escapeHtml(summary) + '</p>' +
    '<p class="settings-hint">Approved videos will be available to every child. You can edit titles below. Videos with hidden details still need a playable exact link.</p>' +
    '<ol class="learning-video-batch-list">' + batch.entries.map((item, index) =>
      '<li data-state="' + item.state + '"><div><label for="learning-video-batch-title-' + index + '">' + escapeHtml(item.youtube_id) + '</label>' +
      '<input class="admin-input" id="learning-video-batch-title-' + index + '" data-index="' + index + '" maxlength="180" value="' + escapeHtml(item.title) + '"' + (item.state === 'added' || batch.saving ? ' disabled' : '') + '>' +
      (item.metadataHidden && item.state !== 'added' ? '<span class="settings-hint">Public title unavailable; confirm or edit the title before approval.</span>' : '') +
      '</div><span class="learning-video-item-status">' + escapeHtml(item.error || (item.state === 'added' ? 'Added' : item.state === 'saving' ? 'Adding…' : 'Ready')) + '</span></li>').join('') + '</ol>' +
    (batch.invalid.length ? '<div class="learning-video-invalid"><strong>These entries were not recognized</strong><ul>' + batch.invalid.map(value => '<li>' + escapeHtml(value) + '</li>').join('') + '</ul><p>They will stay in the box so you can correct them.</p></div>' : '') +
    '<div class="learning-video-batch-actions"><button id="learning-video-batch-close" class="btn btn-secondary" type="button">' + (batch.saving ? 'Stop after this video' : batch.finished ? 'Done' : 'Cancel') + '</button>' +
    (pending.length ? '<button id="learning-video-batch-save" class="btn btn-primary" type="button">' + (batch.saving ? 'Adding…' : batch.finished ? 'Retry / add ' + pending.length + ' remaining videos' : 'Approve & add ' + pending.length + ' videos') + '</button>' : '') + '</div>';
  panel.querySelectorAll('input[data-index]').forEach(input => input.addEventListener('input', () => { batch.entries[Number(input.dataset.index)].title = input.value; }));
  document.getElementById('learning-video-batch-close').addEventListener('click', () => { if (batch.saving) { batch.stopRequested = true; document.getElementById('learning-video-batch-close').textContent = 'Finishing current video…'; } else if (!busy) { batch = null; renderBatch(); } });
  document.getElementById('learning-video-batch-save')?.addEventListener('click', saveBatch);
  if (busy) panel.querySelectorAll('button').forEach(button => { button.disabled = button.id !== 'learning-video-batch-close' || !batch.saving; });
}

async function prepareBatch(parsed) {
  closePreview();
  const existing = new Set((await request('/videos')).filter(video => Number(video.active) === 1).map(video => video.youtube_id));
  const ids = parsed.ids.filter(id => !existing.has(id));
  const entries = new Array(ids.length);
  let next = 0;
  // Limit metadata requests; imports use the existing parent-only verification route.
  await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
    while (next < ids.length) {
      const index = next++;
      entries[index] = { ...await videoMetadata(ids[index]), state: 'ready' };
    }
  }));
  batch = { entries, skipped: parsed.duplicates + parsed.ids.length - ids.length, invalid: parsed.invalid, finished: false, saving: false };
  renderBatch();
}

async function saveBatch() {
  if (busy || !batch) return;
  if (batch.entries.some(item => item.state !== 'added' && !item.title.trim())) return window.showToast?.('Give each video a title before adding it.', true);
  setBusy(true);
  batch.saving = true; batch.stopRequested = false;
  try {
    for (const item of batch.entries) {
      if (batch.stopRequested) break;
      if (item.state === 'added') continue;
      item.state = 'saving'; item.error = '';
      renderBatch();
      try {
        await request('/videos', { method: 'POST', signal: AbortSignal.timeout(45000), body: JSON.stringify({
          youtube_id: item.youtube_id, title: item.title.trim(), channel: item.channel,
          thumbnail_url: item.thumbnail_url, direct_parent_link: true, category: 'General'
        }) });
        item.state = 'added';
      } catch (error) {
        item.state = 'failed';
        item.error = error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'No confirmation received. Retry to check and add this video safely.' : error.message;
      }
    }
    batch.finished = true;
    document.getElementById('learning-video-url').value = [...batch.entries.filter(item => item.state !== 'added').map(item => 'https://youtu.be/' + item.youtube_id), ...batch.invalid].join('\n');
    await loadLearningVideosTab();
  } finally {
    batch.saving = false;
    setBusy(false);
    renderBatch();
  }
}

function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function setMp4Status(message, error = false) {
  const status = document.getElementById('learning-video-mp4-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = error ? '#fca5a5' : '';
}

function chooseMp4File() {
  const file = document.getElementById('learning-video-mp4-file')?.files?.[0];
  if (!file) return setMp4Status('Choose an MP4 up to 4 GB.');
  if (!/\.mp4$/i.test(file.name)) return setMp4Status('Choose an MP4 video file.', true);
  const title = document.getElementById('learning-video-mp4-title');
  if (title && !title.value.trim()) title.value = file.name.replace(/\.mp4$/i, '').replace(/[_-]+/g, ' ').trim();
  setMp4Status(`${file.name} · ${formatBytes(file.size)} · ready to upload`);
}

function uploadMp4() {
  const fileInput = document.getElementById('learning-video-mp4-file');
  const titleInput = document.getElementById('learning-video-mp4-title');
  const button = document.getElementById('learning-video-mp4-upload');
  const progress = document.getElementById('learning-video-mp4-progress');
  const file = fileInput?.files?.[0];
  const title = titleInput?.value.trim();
  if (!file || !/\.mp4$/i.test(file.name)) return setMp4Status('Choose an MP4 video file first.', true);
  if (!title) return setMp4Status('Give this MP4 lesson a title.', true);
  if (file.size > 4 * 1024 * 1024 * 1024) return setMp4Status('MP4 files must be smaller than 4 GB.', true);

  button.disabled = true;
  if (progress) progress.style.width = '0%';
  setMp4Status(`Uploading ${file.name}… Keep BodeeGuard open.`);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/learning-videos/uploads');
  xhr.setRequestHeader('Content-Type', 'video/mp4');
  xhr.setRequestHeader('X-Learning-Video-Filename', encodeURIComponent(file.name));
  xhr.setRequestHeader('X-Learning-Video-Title', encodeURIComponent(title));
  xhr.setRequestHeader('X-Learning-Video-Channel', encodeURIComponent(document.getElementById('learning-video-mp4-channel')?.value.trim() || 'BodeeGuard MP4 Archive'));
  xhr.setRequestHeader('X-Learning-Video-Category', encodeURIComponent(document.getElementById('learning-video-mp4-category')?.value.trim() || 'General'));
  xhr.upload.onprogress = event => {
    if (!event.lengthComputable) return;
    const value = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
    if (progress) progress.style.width = `${value}%`;
    setMp4Status(`Uploading ${file.name}… ${value}%`);
  };
  xhr.onerror = () => {
    button.disabled = false;
    setMp4Status('The upload was interrupted. Check the parent computer and try again.', true);
  };
  xhr.onload = async () => {
    button.disabled = false;
    let payload = {};
    try { payload = JSON.parse(xhr.responseText || '{}'); } catch {}
    if (xhr.status < 200 || xhr.status >= 300) {
      if (progress) progress.style.width = '0%';
      setMp4Status(payload.error || 'BodeeGuard could not save that MP4.', true);
      return;
    }
    if (progress) progress.style.width = '100%';
    fileInput.value = '';
    titleInput.value = '';
    document.getElementById('learning-video-mp4-channel').value = '';
    setMp4Status('MP4 added to the Learning Videos archive for every child.');
    await loadLearningVideosTab();
    window.showToast?.('Local MP4 lesson added for every child.');
  };
  xhr.send(file);
}

async function request(path, options = {}) {
  const response = await fetch(`/api/learning-videos${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Learning Videos request failed.');
  return payload;
}

function closePreview() {
  pendingVideo = null;
  const preview = document.getElementById('learning-video-preview');
  if (preview) preview.style.display = 'none';
}

async function lookupVideo() {
  const input = document.getElementById('learning-video-url');
  const button = document.getElementById('learning-video-lookup-btn');
  if (busy) return;
  let parsed;
  try { parsed = parseLearningVideoLinks(input?.value); }
  catch (error) { return window.showToast?.(error.message, true); }
  if (!parsed.ids.length && !parsed.invalid.length) return window.showToast?.('Paste YouTube links or video IDs, one per line.', true);
  batch = null; renderBatch(); closePreview();
  setBusy(true);
  button.textContent = 'Checking links…';
  try {
    if (parsed.ids.length !== 1 || parsed.invalid.length || parsed.duplicates) {
      await prepareBatch(parsed);
      return;
    }
    pendingVideo = await videoMetadata(parsed.ids[0]);
    const metadataHidden = pendingVideo.metadataHidden;
    document.getElementById('learning-video-preview-thumb').src = pendingVideo.thumbnail_url;
    document.getElementById('learning-video-title').value = pendingVideo.title;
    document.getElementById('learning-video-channel').value = pendingVideo.channel;
    document.getElementById('learning-video-category').value ||= 'General';
    document.getElementById('learning-video-preview-status').textContent = metadataHidden
      ? 'YouTube hides this video’s public details. If this is your unlisted video, confirm its title and approve the exact link.'
      : 'Ready for parent approval. BodeeGuard will also verify that the video permits embedded playback.';
    document.getElementById('learning-video-preview').style.display = 'block';
  } catch (error) {
    window.showToast?.(error.message, true);
  } finally {
    setBusy(false);
    button.innerHTML = '<i data-lucide="plus"></i> Review links';
    window.refreshIcons?.();
  }
}

async function saveVideo() {
  if (!pendingVideo || busy) return;
  setBusy(true);
  try {
    await request('/videos', {
      method: 'POST',
      body: JSON.stringify({
        ...pendingVideo,
        title: document.getElementById('learning-video-title').value.trim(),
        channel: document.getElementById('learning-video-channel').value.trim(),
        category: document.getElementById('learning-video-category').value.trim() || 'General'
      })
    });
    document.getElementById('learning-video-url').value = '';
    closePreview();
    await loadLearningVideosTab();
    window.showToast?.('Learning video added for every child.');
  } catch (error) {
    window.showToast?.(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function retireVideo(id) {
  try {
    await request(`/videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadLearningVideosTab();
    window.showToast?.('Learning video removed from the children’s library.');
  } catch (error) {
    window.showToast?.(error.message, true);
  }
}

export async function loadLearningVideosTab() {
  const list = document.getElementById('learning-videos-list');
  if (!list) return;
  list.innerHTML = '<p class="settings-hint">Loading learning videos…</p>';
  try {
    const videos = await request('/videos');
    const active = videos.filter(video => Number(video.active) === 1);
    if (!active.length) {
      list.innerHTML = '<div style="grid-column:1/-1;padding:28px;text-align:center;border:1px dashed rgba(255,255,255,.12);border-radius:12px;color:var(--text-muted);">No learning videos yet. Add states and capitals, multiplication songs, science lessons, or another parent-approved video above.</div>';
      return;
    }
    list.innerHTML = active.map(video => {
      const isLocal = video.source_type === 'local_mp4';
      const preview = isLocal
        ? `<div style="width:105px;aspect-ratio:16/9;border-radius:8px;background:linear-gradient(135deg,#064e3b,#075985);display:grid;place-items:center;color:white;"><div style="text-align:center;"><i data-lucide="file-video-2" style="width:28px;height:28px;"></i><div style="font-size:9px;font-weight:800;letter-spacing:.1em;margin-top:2px;">LOCAL MP4</div></div></div>`
        : `<img src="${escapeHtml(video.thumbnail_url)}" alt="" style="width:105px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#07111f;">`;
      const source = isLocal
        ? `${video.channel || 'BodeeGuard MP4 Archive'} · ${formatBytes(video.file_size_bytes)}`
        : (video.channel || 'YouTube');
      return `
      <article style="display:grid;grid-template-columns:105px minmax(0,1fr);gap:12px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.025);">
        ${preview}
        <div style="min-width:0;display:flex;flex-direction:column;gap:4px;">
          <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(video.title)}</strong>
          <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(source)} · ${escapeHtml(video.category || 'General')}</span>
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:auto;">
            <span style="font-size:11px;color:#34d399;font-weight:700;">${isLocal ? 'LAN archive' : 'Always available'}</span>
            <button class="btn btn-danger learning-video-remove" type="button" data-id="${escapeHtml(video.id)}" style="padding:5px 9px;font-size:11px;">Remove</button>
          </div>
        </div>
      </article>`;
    }).join('');
    list.querySelectorAll('.learning-video-remove').forEach(button => button.addEventListener('click', () => retireVideo(button.dataset.id)));
    window.refreshIcons?.();
  } catch (error) {
    logger.warn('learning-videos', 'Could not load Learning Videos', error);
    list.innerHTML = `<p style="color:#fca5a5;">${escapeHtml(error.message)}</p>`;
  }
}

export function setupLearningVideosTab() {
  const original = document.getElementById('learning-video-url');
  if (!original || original.dataset.bulkReady) return;
  // Shared setup upgrades both the hosted panel and the original single-link markup.
  const input = document.createElement('textarea');
  input.id = original.id; input.className = original.className; input.value = original.value;
  input.rows = 3; input.maxLength = 20000; input.dataset.bulkReady = 'true';
  input.placeholder = 'Paste YouTube links or video IDs, one per line';
  input.setAttribute('aria-label', 'YouTube links or video IDs');
  input.setAttribute('aria-describedby', 'learning-video-links-hint');
  original.replaceWith(input);
  const row = input.closest('.learning-video-add-row');
  const hint = document.createElement('p');
  hint.id = 'learning-video-links-hint'; hint.className = 'settings-hint';
  hint.textContent = 'Add up to 50 videos at once. Paste a list, review it, then approve all together. Ctrl+Enter (or ⌘+Enter) reviews your links.';
  row.after(hint);
  const panel = document.createElement('div');
  panel.id = 'learning-video-batch'; panel.className = 'learning-video-batch'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'learning-video-batch-heading'); hint.after(panel);
  document.getElementById('learning-video-lookup-btn').innerHTML = '<i data-lucide="plus"></i> Review links';
  input.addEventListener('input', () => { if (!busy) { closePreview(); batch = null; renderBatch(); } });
  document.getElementById('learning-video-lookup-btn')?.addEventListener('click', lookupVideo);
  document.getElementById('learning-video-url')?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); lookupVideo(); }
  });
  document.getElementById('learning-video-preview-cancel')?.addEventListener('click', closePreview);
  document.getElementById('learning-video-save')?.addEventListener('click', saveVideo);
  document.getElementById('learning-video-mp4-file')?.addEventListener('change', chooseMp4File);
  document.getElementById('learning-video-mp4-upload')?.addEventListener('click', uploadMp4);
  document.getElementById('learning-videos-refresh')?.addEventListener('click', loadLearningVideosTab);
}
