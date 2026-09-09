import { mediaFetch as fetch } from './cloud-media-transport.js';
const logger = console;

let pendingVideo = null;

function escapeHtml(value) {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
}

function extractYouTubeId(value) {
  const input = String(value || '').trim();
  const match = input.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{11}$/.test(input) ? input : '';
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
    try { payload = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
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
  const youtubeId = extractYouTubeId(input?.value);
  if (!youtubeId) return window.showToast?.('Paste a valid YouTube URL or 11-character video ID.', true);
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    let metadata = null;
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}&format=json`);
      if (response.ok) metadata = await response.json();
    } catch (error) {
      logger.info('learning-videos', 'Public YouTube metadata was unavailable; offering direct-link approval', error);
    }
    const metadataHidden = !metadata;
    pendingVideo = {
      youtube_id: youtubeId,
      title: metadata?.title || 'Unlisted learning video',
      channel: metadata?.author_name || '',
      thumbnail_url: metadata?.thumbnail_url || `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
      direct_parent_link: true
    };
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
    button.disabled = false;
    button.innerHTML = '<i data-lucide="plus"></i> Add URL / ID';
    window.refreshIcons?.();
  }
}

async function saveVideo() {
  if (!pendingVideo) return;
  const button = document.getElementById('learning-video-save');
  button.disabled = true;
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
    button.disabled = false;
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
  document.getElementById('learning-video-lookup-btn')?.addEventListener('click', lookupVideo);
  document.getElementById('learning-video-url')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); lookupVideo(); }
  });
  document.getElementById('learning-video-preview-cancel')?.addEventListener('click', closePreview);
  document.getElementById('learning-video-save')?.addEventListener('click', saveVideo);
  document.getElementById('learning-video-mp4-file')?.addEventListener('change', chooseMp4File);
  document.getElementById('learning-video-mp4-upload')?.addEventListener('click', uploadMp4);
  document.getElementById('learning-videos-refresh')?.addEventListener('click', loadLearningVideosTab);
}
