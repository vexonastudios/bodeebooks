import { mediaFetch as fetch } from './cloud-media-transport.js';
const API = '/api';
const logger = console;

const VIDEO_DEFAULT_MINUTES = window.BODEE_MEDIA_DEFAULTS.video.dailyMinutes;

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
function apiKey() { return window._adminApiKey || ''; }
function authHeaders() { return { 'x-kiosk-key': apiKey(), 'Content-Type': 'application/json' }; }

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = String(value ?? '');
  return element.innerHTML;
}

function extractYouTubeId(input) {
  input = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractChannelId(input) {
  input = input.trim();
  // UC... format channel ID
  const direct = input.match(/^(UC[A-Za-z0-9_-]{22})$/);
  if (direct) return direct[1];
  // youtube.com/channel/UCxxxxxxx
  const fromUrl = input.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (fromUrl) return fromUrl[1];
  return null;
}

function fmtMin(s) {
  const m = Math.round(s / 60);
  return m + ' min';
}

function updateVideoFlagBadge(count) {
  const badge = document.getElementById('video-flags-badge');
  if (!badge) return;
  const pendingCount = Math.max(0, Number(count) || 0);
  badge.textContent = pendingCount > 99 ? '99+' : String(pendingCount);
  badge.style.display = pendingCount ? 'inline-flex' : 'none';
}

function formatVideoFlagTime(value) {
  if (!value) return '';
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value)
    ? value
    : `${String(value).replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

async function fetchPendingVideoFlags() {
  const response = await fetch(`${API}/video/flags?status=pending&limit=100`, {
    headers: { 'x-kiosk-key': apiKey() }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not load video flags');
  updateVideoFlagBadge(payload.pending_count);
  return payload;
}

export async function refreshVideoFlagBadge() {
  try {
    return await fetchPendingVideoFlags();
  } catch (error) {
    logger.warn('video', 'Failed to refresh the video flag badge', error);
    return { items: [], pending_count: 0 };
  }
}

export async function loadVideoFlags() {
  const section = document.getElementById('video-flag-review-section');
  const list = document.getElementById('video-flag-review-list');
  const count = document.getElementById('video-flag-review-count');
  if (!section || !list || !count) return;

  try {
    const payload = await fetchPendingVideoFlags();
    const flags = Array.isArray(payload.items) ? payload.items : [];
    section.style.display = flags.length ? 'block' : 'none';
    count.textContent = `${flags.length} awaiting review`;
    if (!flags.length) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = flags.map(flag => {
      const studentColor = /^#[0-9a-f]{3,8}$/i.test(flag.student_color || '')
        ? flag.student_color
        : '#a78bfa';
      const sourceKind = flag.source_type === 'playlist' ? 'playlist' : 'channel';
      const note = flag.reason_note
        ? `<div style="margin-top:7px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.045);color:var(--text-secondary);font-size:13px;line-height:1.45;">&ldquo;${escapeHtml(flag.reason_note)}&rdquo;</div>`
        : '';
      return `
        <article data-video-flag-card="${escapeHtml(flag.id)}" style="display:grid;grid-template-columns:132px minmax(0,1fr);gap:14px;padding:14px;border:1px solid rgba(255,255,255,0.09);border-radius:12px;background:rgba(10,15,28,0.58);">
          <a href="https://www.youtube.com/watch?v=${encodeURIComponent(flag.youtube_id)}" target="_blank" rel="noopener" title="Open this video on YouTube" style="display:block;position:relative;align-self:start;">
            <img src="https://img.youtube.com/vi/${encodeURIComponent(flag.youtube_id)}/mqdefault.jpg" alt="" style="display:block;width:132px;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#111827;">
            <span style="position:absolute;inset:auto 7px 7px auto;padding:3px 7px;border-radius:6px;background:rgba(0,0,0,.78);color:#fff;font-size:10px;font-weight:700;">Preview</span>
          </a>
          <div style="min-width:0;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="min-width:0;flex:1;">
                <div style="font-weight:750;color:var(--text-primary);line-height:1.35;overflow-wrap:anywhere;">${escapeHtml(flag.title || 'Untitled video')}</div>
                <div style="margin-top:4px;color:var(--text-muted);font-size:12px;">From ${escapeHtml(flag.source_name || 'removed source')} ${sourceKind}${flag.video_channel ? ` &bull; ${escapeHtml(flag.video_channel)}` : ''}</div>
              </div>
              <div style="color:var(--text-muted);font-size:11px;white-space:nowrap;">${escapeHtml(formatVideoFlagTime(flag.created_at))}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px;font-size:12px;">
              <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;background:${studentColor}22;color:${studentColor};font-weight:800;">
                <span style="width:7px;height:7px;border-radius:50%;background:${studentColor};"></span>${escapeHtml(flag.student_name)}
              </span>
              <span style="color:#fca5a5;font-weight:700;">Flagged: ${escapeHtml(flag.reason_label || 'Something else')}</span>
            </div>
            ${note}
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:11px;">
              <button type="button" class="btn btn-danger" data-video-flag-approve="${escapeHtml(flag.id)}" data-video-flag-source="${escapeHtml(flag.source_name || sourceKind)}" style="padding:7px 11px;font-size:12px;">Approve &amp; Block from this ${sourceKind}</button>
              <button type="button" class="btn btn-secondary" data-video-flag-dismiss="${escapeHtml(flag.id)}" style="padding:7px 11px;font-size:12px;">Keep Video</button>
            </div>
          </div>
        </article>`;
    }).join('');

    list.querySelectorAll('[data-video-flag-approve]').forEach(button => {
      button.addEventListener('click', () => approveVideoFlag(button.dataset.videoFlagApprove, button.dataset.videoFlagSource));
    });
    list.querySelectorAll('[data-video-flag-dismiss]').forEach(button => {
      button.addEventListener('click', () => dismissVideoFlag(button.dataset.videoFlagDismiss));
    });
  } catch (error) {
    logger.warn('video', 'Failed to load video flags', error);
    section.style.display = 'block';
    count.textContent = 'Could not load';
    list.innerHTML = `<div style="color:#fca5a5;font-size:13px;">${escapeHtml(error.message || 'Could not load video flags')}</div>`;
  }
}

async function approveVideoFlag(id, sourceName) {
  const confirmed = window.confirm(
    `Block this video from ${sourceName || 'its approved source'}? It will no longer appear for any child through that channel or playlist.`
  );
  if (!confirmed) return;
  try {
    const response = await fetch(`${API}/video/flags/${encodeURIComponent(id)}/approve`, {
      method: 'POST', headers: authHeaders(), body: '{}'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not block this video');
    window.showToast?.('Video blocked from its approved source');
    await loadVideoFlags();
    await Promise.all([loadApprovedChannels(), loadYouTubePlaylists()]);
  } catch (error) {
    window.showToast?.(error.message || 'Could not block this video', true);
  }
}

async function dismissVideoFlag(id) {
  try {
    const response = await fetch(`${API}/video/flags/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST', headers: authHeaders(), body: '{}'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not dismiss this flag');
    window.showToast?.('Video kept; the child’s flag was dismissed');
    await loadVideoFlags();
  } catch (error) {
    window.showToast?.(error.message || 'Could not dismiss this flag', true);
  }
}

// Shared students list (loaded once)
let _students = [];
let _channelSyncPollTimer = null;

async function loadStudents() {
  try {
    const res = await fetch(`${API}/students`, { headers: { 'x-kiosk-key': apiKey() } });
    _students = await res.json();
  } catch(e) { _students = []; }
}

// ─────────────────────────────────────────────
//  SETUP ENTRY POINT
// ─────────────────────────────────────────────
export function setupVideoTab() {
  setupVideoLibrary();
  setupVideoChannels();
  setupVideoPlaylists();
  setupVideoStudentSettings();
  setupVideoHistory();
  setupVideoSubNav();

  window._refreshVideoPlaylists = () => {
    if (document.getElementById('vplay')?.style.display !== 'none') {
      renderVideoPlaylistTab();
    }
  };
  window._refreshVideoFlags = loadVideoFlags;
}

export function loadVideoTab() {
  loadVideoFlags();
  loadVideoSettings();
  loadVideoLibrary();
  loadVideoChannels();
  loadStudents().then(() => {
    populateVideoStudentSelects();
  });
}

// ─────────────────────────────────────────────
//  SUB-NAV
// ─────────────────────────────────────────────
function setupVideoSubNav() {
  document.querySelectorAll('.video-stab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.video-stab').forEach(b => b.classList.remove('active-stab'));
      document.querySelectorAll('.video-stab-body').forEach(b => b.style.display = 'none');
      btn.classList.add('active-stab');
      const id = btn.dataset.vstab;
      const body = document.getElementById(id);
      if (body) body.style.display = 'block';

      if (id === 'vplay')  renderVideoPlaylistTab();
      if (id === 'vsett')  loadVideoStudentSettingsForm();
      if (id === 'vhist')  loadVideoHistory();
    });
  });
}

// ─────────────────────────────────────────────
//  GLOBAL SETTINGS
// ─────────────────────────────────────────────
async function loadVideoSettings() {
  try {
    const res = await fetch(`${API}/video/settings`, { headers: { 'x-kiosk-key': apiKey() } });
    const s = await res.json();
    const startEl = document.getElementById('video-start-time');
    const endEl   = document.getElementById('video-end-time');
    const enEl    = document.getElementById('video-enabled');
    if (startEl) startEl.value = s.video_start_time || '13:00';
    if (endEl)   endEl.value   = s.video_end_time   || '21:00';
    if (enEl)    enEl.checked  = !!s.video_enabled;
  } catch(e) { logger.warn('video', 'Failed to load video settings', e); }
}

function setupVideoLibrary() {
  const saveBtn = document.getElementById('save-video-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const body = {
        video_enabled:    document.getElementById('video-enabled')?.checked,
        video_start_time: document.getElementById('video-start-time')?.value,
        video_end_time:   document.getElementById('video-end-time')?.value
      };
      await fetch(`${API}/video/settings`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const savedEl = document.getElementById('video-settings-saved');
      if (savedEl) { savedEl.style.display = 'inline'; setTimeout(() => savedEl.style.display = 'none', 2500); }
    });
  }

  const lookupBtn = document.getElementById('video-lookup-btn');
  const urlInput  = document.getElementById('video-yt-url');
  if (lookupBtn && urlInput) {
    lookupBtn.addEventListener('click', () => lookupVideo(urlInput.value));
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') lookupVideo(urlInput.value); });
  }

  document.getElementById('video-cancel-btn')?.addEventListener('click', () => {
    const preview = document.getElementById('video-preview');
    if (preview) preview.style.display = 'none';
    if (urlInput) urlInput.value = '';
  });

  document.getElementById('video-add-btn')?.addEventListener('click', addVideoToLibrary);
}

async function lookupVideo(rawInput) {
  const ytId = extractYouTubeId(rawInput);
  if (!ytId) {
    if (window.showToast) window.showToast('❌ Could not find a YouTube video ID in that URL.', true);
    return;
  }
  const btn = document.getElementById('video-lookup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

  const thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  document.getElementById('video-preview-thumb').src = thumb;
  document.getElementById('video-title-input').value = '';
  document.getElementById('video-channel-input').value = '';
  document.getElementById('video-video-id').value = ytId;
  document.getElementById('video-screened-input').checked = false;
  if (document.getElementById('video-global-input')) document.getElementById('video-global-input').checked = false;

  try {
    const oembed = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
    if (oembed.ok) {
      const data = await oembed.json();
      if (!data.error) {
        document.getElementById('video-title-input').value   = data.title    || '';
        document.getElementById('video-channel-input').value = data.author_name || '';
      }
    }
  } catch(e) { logger.warn('video', 'YouTube oEmbed lookup failed', e); }

  document.getElementById('video-preview').style.display = 'block';
  if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Add URL / ID'; if (window.lucide) lucide.createIcons({ el: btn }); }
}

async function addVideoToLibrary() {
  const title    = document.getElementById('video-title-input')?.value.trim();
  const channel  = document.getElementById('video-channel-input')?.value.trim();
  const ytId     = document.getElementById('video-video-id')?.value.trim();
  const screened = document.getElementById('video-screened-input')?.checked;
  const isGlobal = document.getElementById('video-global-input')?.checked;

  if (!title || !ytId) {
    if (window.showToast) window.showToast('❌ Title is required.', true);
    return;
  }

  const btn = document.getElementById('video-add-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

  try {
    const res = await fetch(`${API}/video/videos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, channel, youtube_id: ytId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add video');

    if (data.id && (screened || isGlobal)) {
      await fetch(`${API}/video/videos/${data.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ screened: screened || false, is_global: isGlobal || false })
      });
    }

    document.getElementById('video-preview').style.display = 'none';
    document.getElementById('video-yt-url').value = '';
    loadVideoLibrary();
    if (window.showToast) window.showToast('✅ Video added to library!');
  } catch(e) {
    if (window.showToast) window.showToast(e.message || 'Failed to add video.', true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:4px;vertical-align:-3px;"></i> Add to Library'; if (window.lucide) lucide.createIcons({ el: btn }); }
  }
}

// ─────────────────────────────────────────────
//  MASTER LIBRARY
// ─────────────────────────────────────────────
async function loadVideoLibrary() {
  try {
    const res = await fetch(`${API}/video/videos`, { headers: { 'x-kiosk-key': apiKey() } });
    const videos = await res.json();
    renderVideoLibrary(videos);
  } catch(e) { logger.warn('video', 'Failed to load video library', e); }
}

function renderVideoLibrary(videos) {
  const list = document.getElementById('video-track-list');
  const countLabel = document.getElementById('video-count-label');
  if (!list) return;
  if (countLabel) countLabel.textContent = `${videos.length} video${videos.length !== 1 ? 's' : ''} in library`;

  if (!videos.length) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:14px; padding:12px 0;">No videos yet. Add one above.</p>';
    return;
  }

  list.innerHTML = videos.map(v => `
    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.03); border:1px solid ${v.is_global ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}; border-radius:10px; position:relative;">
      ${v.is_global ? '<div style="position:absolute;top:8px;right:8px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.35);color:#818cf8;border-radius:20px;font-size:10px;padding:2px 8px;font-weight:600;">🌐 Global</div>' : ''}
      <img src="${v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/default.jpg`}"
           style="width:72px; height:54px; object-fit:cover; border-radius:6px; flex-shrink:0;"
           onerror="this.src='https://img.youtube.com/vi/${v.youtube_id}/default.jpg'">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.title}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${v.channel || ''} &bull; <code style="font-size:10px;">${v.youtube_id}</code></div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; margin-top:6px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:${v.screened ? '#34d399' : 'var(--text-muted)'};">
            <input type="checkbox" ${v.screened ? 'checked' : ''} onchange="window._videoToggleScreened('${v.id}', this.checked)"
                   style="width:13px;height:13px;cursor:pointer;">
            ${v.screened ? '✅ Screened' : 'Mark Screened'}
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:${v.is_global ? '#818cf8' : 'var(--text-muted)'};">
            <input type="checkbox" ${v.is_global ? 'checked' : ''} onchange="window._videoToggleGlobal('${v.id}', this.checked)"
                   style="width:13px;height:13px;cursor:pointer;">
            🌐 All Students
          </label>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0; ${v.is_global ? 'margin-right:60px;' : ''}">
        <a href="https://www.youtube.com/watch?v=${v.youtube_id}" target="_blank" rel="noopener"
           style="font-size:11px; color:#a78bfa; text-decoration:none; display:flex; align-items:center; gap:4px;">
          <i data-lucide="external-link" style="width:12px;height:12px;"></i> Preview
        </a>
        <button onclick="window._videoDelete('${v.id}')"
          style="font-size:11px; padding:3px 9px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#f87171; border-radius:6px; cursor:pointer;">
          🗑️ Delete
        </button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons({ el: list });
}

window._videoToggleScreened = async (id, screened) => {
  await fetch(`${API}/video/videos/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ screened })
  });
  loadVideoLibrary();
};

window._videoToggleGlobal = async (id, is_global) => {
  await fetch(`${API}/video/videos/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ is_global })
  });
  loadVideoLibrary();
  if (window.showToast) window.showToast(is_global ? '🌐 Video is now in ALL students\' playlists!' : '📋 Video is now per-student only.');
};

window._videoDelete = async (id, title) => {
  if (!confirm(`Delete "${title}" from the video library?\n\nThis will also remove it from all student playlists.`)) return;
  await fetch(`${API}/video/videos/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadVideoLibrary();
  if (window.showToast) window.showToast('🗑️ Video removed from library.');
};

// ─────────────────────────────────────────────
//  CHANNELS
// ─────────────────────────────────────────────
function setupVideoChannels() {
  document.getElementById('channel-add-btn')?.addEventListener('click', addChannel);
  document.getElementById('youtube-playlist-add-btn')?.addEventListener('click', addYouTubePlaylist);
  document.getElementById('youtube-playlist-url-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') addYouTubePlaylist();
  });
  document.getElementById('channel-lookup-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('channel-id-input')?.value.trim();
    if (!input) return;
    const extracted = extractChannelId(input);
    if (extracted) {
      document.getElementById('channel-id-input').value = extracted;
    } else if (input.includes('youtube.com/') || input.startsWith('@')) {
      const btn = document.getElementById('channel-lookup-btn');
      const oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Looking up...';
      try {
        const url = input.startsWith('@') ? `https://www.youtube.com/${input}` : input;
        const res = await fetch(`${API}/video/resolve-channel`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.channel_id) {
          document.getElementById('channel-id-input').value = data.channel_id;
        } else {
          if (window.showToast) window.showToast('⚠️ Could not resolve channel ID from that URL.', true);
        }
      } catch(e) {
        if (window.showToast) window.showToast('⚠️ Failed to look up channel.', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = oldHtml;
      }
    } else {
      if (window.showToast) window.showToast('⚠️ Paste a Channel ID (UC...) or a full YouTube URL.', true);
    }
  });
}

async function loadVideoChannels() {
  await Promise.all([loadApprovedChannels(), loadYouTubePlaylists()]);
}

async function loadApprovedChannels() {
  try {
    const response = await fetch(`${API}/video/channels`, { headers: { 'x-kiosk-key': apiKey() } });
    renderChannelList(await response.json());
  } catch(e) { logger.warn('video', 'Failed to load video channels', e); }
}

async function addChannel() {
  const name      = document.getElementById('channel-name-input')?.value.trim();
  const channelId = document.getElementById('channel-id-input')?.value.trim();
  const isGlobal  = document.getElementById('channel-global-input')?.checked !== false;
  const excludeShorts = document.getElementById('channel-exclude-shorts-input')?.checked !== false;

  if (!name || !channelId) {
    if (window.showToast) window.showToast('❌ Channel name and ID are required.', true);
    return;
  }

  const btn = document.getElementById('channel-add-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }

  try {
    const response = await fetch(`${API}/video/channels`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, channel_id: channelId, is_global: isGlobal, exclude_shorts: excludeShorts })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to add channel');
    document.getElementById('channel-name-input').value = '';
    document.getElementById('channel-id-input').value = '';
    loadVideoChannels();
    if (window.showToast) window.showToast('Channel added. BodeeGuard is importing and screening the complete channel in the background.');
  } catch(e) {
    if (window.showToast) window.showToast(e.message || 'Failed to add channel.', true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:4px;vertical-align:-3px;"></i> Add Channel'; if (window.lucide) lucide.createIcons({ el: btn }); }
  }
}

function renderChannelList(channels) {
  const list = document.getElementById('video-channel-list');
  if (!list) return;

  if (_channelSyncPollTimer) clearTimeout(_channelSyncPollTimer);
  if (!channels.length) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:14px; padding:12px 0;">No channels added yet. Add one above.</p>';
    return;
  }

  const hasActiveSync = channels.some(channel => ['pending', 'syncing', 'screening'].includes(channel.sync_status || 'pending'));
  if (hasActiveSync) _channelSyncPollTimer = setTimeout(loadApprovedChannels, 2500);

  const describeSync = channel => {
    const status = channel.sync_status || 'pending';
    const processed = Number(channel.sync_processed_count || 0);
    const total = Number(channel.source_video_count || 0);
    if (status === 'ready') {
      const playable = Number(channel.catalog_video_count || 0);
      const unavailable = Number(channel.unavailable_video_count || 0);
      return {
        color: '#34d399',
        text: `${playable.toLocaleString()} playable video${playable === 1 ? '' : 's'}${total ? ` from ${total.toLocaleString()} public uploads` : ''}${unavailable ? ` · ${unavailable.toLocaleString()} unavailable skipped` : ''}`
      };
    }
    if (status === 'syncing') {
      return { color: '#38bdf8', text: `Importing uploads${total ? ` · ${processed.toLocaleString()} of ${total.toLocaleString()}` : processed ? ` · ${processed.toLocaleString()} found` : ''}…` };
    }
    if (status === 'screening') {
      return { color: '#fbbf24', text: `Screening videos and removing Shorts${total ? ` · ${processed.toLocaleString()} of ${total.toLocaleString()}` : ''}…` };
    }
    if (status === 'error') {
      return { color: '#f87171', text: `Sync needs attention: ${channel.sync_error || 'Unknown YouTube error'}` };
    }
    return { color: '#a78bfa', text: 'Complete channel sync queued…' };
  };

  list.innerHTML = channels.map(ch => {
    const sync = describeSync(ch);
    const syncActive = ['pending', 'syncing', 'screening'].includes(ch.sync_status || 'pending');
    return `
    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.03); border:1px solid ${ch.is_global ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}; border-radius:10px;">
      <div style="width:48px;height:48px;background:rgba(99,102,241,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i data-lucide="tv-2" style="width:22px;height:22px;color:#818cf8;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;">${escapeHtml(ch.name)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-family:monospace;">${escapeHtml(ch.channel_id)}</div>
        <div style="font-size:11px;color:${sync.color};margin-top:5px;">${escapeHtml(sync.text)}</div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;font-size:12px;color:${ch.is_global ? '#818cf8' : 'var(--text-muted)'};">
          <input type="checkbox" ${ch.is_global ? 'checked' : ''} onchange="window._channelToggleGlobal('${ch.id}', this.checked)"
                 style="width:13px;height:13px;cursor:pointer;">
          🌐 Visible to all students
        </label>
        <label style="display:flex;align-items:center;gap:6px;margin-top:5px;cursor:pointer;font-size:12px;color:${ch.exclude_shorts !== 0 ? '#fbbf24' : 'var(--text-muted)'};">
          <input type="checkbox" ${ch.exclude_shorts !== 0 ? 'checked' : ''} onchange="window._channelToggleShorts('${ch.id}', this.checked)"
                 style="width:13px;height:13px;cursor:pointer;">
          Exclude Shorts
        </label>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        <a href="https://www.youtube.com/channel/${ch.channel_id}" target="_blank" rel="noopener"
           style="font-size:11px;color:#a78bfa;text-decoration:none;display:flex;align-items:center;gap:4px;">
          <i data-lucide="external-link" style="width:12px;height:12px;"></i> View
        </a>
        <button onclick="window._channelSync('${ch.id}')" ${syncActive ? 'disabled' : ''}
          style="font-size:11px;padding:3px 9px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);color:#7dd3fc;border-radius:6px;cursor:${syncActive ? 'wait' : 'pointer'};opacity:${syncActive ? '.55' : '1'};">
          ${syncActive ? 'Syncing…' : 'Sync Now'}
        </button>
        <button onclick="window._channelManageExclusions('${ch.id}')"
          style="font-size:11px;padding:3px 9px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24;border-radius:6px;cursor:pointer;">
          🚩 Exclusions
        </button>
        <button onclick="window._channelDelete('${ch.id}')"
          style="font-size:11px;padding:3px 9px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:6px;cursor:pointer;">
          🗑️ Delete
        </button>
      </div>
    </div>
  `; }).join('');

  if (window.lucide) lucide.createIcons({ el: list });
}

window._channelToggleGlobal = async (id, is_global) => {
  await fetch(`${API}/video/channels/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ is_global })
  });
  loadVideoChannels();
};

window._channelToggleShorts = async (id, exclude_shorts) => {
  await fetch(`${API}/video/channels/${id}`, {
    method: 'PATCH', headers: authHeaders(),
    body: JSON.stringify({ exclude_shorts })
  });
  loadVideoChannels();
  if (window.showToast) window.showToast(exclude_shorts ? 'YouTube Shorts are now hidden.' : 'YouTube Shorts may now appear.');
};

window._channelSync = async id => {
  try {
    const response = await fetch(`${API}/video/channels/${id}/sync`, {
      method: 'POST',
      headers: authHeaders()
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not start channel sync');
    loadApprovedChannels();
    if (window.showToast) window.showToast(result.queued ? 'Complete channel sync started.' : 'That channel is already syncing.');
  } catch (error) {
    if (window.showToast) window.showToast(error.message || 'Could not start channel sync.', true);
  }
};

async function loadYouTubePlaylists() {
  try {
    const response = await fetch(`${API}/video/youtube-playlists`, { headers: { 'x-kiosk-key': apiKey() } });
    renderYouTubePlaylistList(await response.json());
  } catch (error) { logger.warn('video', 'Failed to load YouTube playlists', error); }
}

async function addYouTubePlaylist() {
  const url = document.getElementById('youtube-playlist-url-input')?.value.trim();
  const name = document.getElementById('youtube-playlist-name-input')?.value.trim();
  const isGlobal = document.getElementById('youtube-playlist-global-input')?.checked !== false;
  if (!url) {
    if (window.showToast) window.showToast('Paste a YouTube playlist URL first.', true);
    return;
  }

  const button = document.getElementById('youtube-playlist-add-btn');
  if (button) { button.disabled = true; button.textContent = 'Loading playlist…'; }
  try {
    const response = await fetch(`${API}/video/youtube-playlists`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url, name, is_global: isGlobal })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not add playlist');
    document.getElementById('youtube-playlist-url-input').value = '';
    document.getElementById('youtube-playlist-name-input').value = '';
    await loadYouTubePlaylists();
    const skipped = Number(result.skipped_unavailable || 0);
    if (window.showToast) window.showToast(`Playlist added with ${result.video_count} playable videos.${skipped ? ` Skipped ${skipped} unavailable.` : ''}`);
  } catch (error) {
    if (window.showToast) window.showToast(error.message || 'Failed to add playlist.', true);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:4px;"></i> Add Playlist';
      if (window.lucide) lucide.createIcons({ el: button });
    }
  }
}

function renderYouTubePlaylistList(playlists) {
  const list = document.getElementById('youtube-playlist-list');
  if (!list) return;
  if (!playlists.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:12px 0;">No YouTube playlists added yet.</p>';
    return;
  }

  list.innerHTML = playlists.map(playlist => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid ${playlist.is_global ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'};border-radius:10px;">
      ${playlist.thumbnail_url
        ? `<img src="${playlist.thumbnail_url}" style="width:72px;height:48px;object-fit:cover;border-radius:7px;flex-shrink:0;">`
        : '<div style="width:48px;height:48px;background:rgba(99,102,241,0.15);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i data-lucide="list-video" style="width:22px;height:22px;color:#818cf8;"></i></div>'}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;">${playlist.name}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-family:monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${playlist.playlist_id}</div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:6px;cursor:pointer;font-size:12px;color:${playlist.is_global ? '#818cf8' : 'var(--text-muted)'};">
          <input type="checkbox" ${playlist.is_global ? 'checked' : ''} onchange="window._youtubePlaylistToggleGlobal('${playlist.id}', this.checked)" style="width:13px;height:13px;cursor:pointer;">
          Visible to all students
        </label>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        <a href="https://www.youtube.com/playlist?list=${playlist.playlist_id}" target="_blank" rel="noopener" style="font-size:11px;color:#a78bfa;text-decoration:none;">View</a>
        <button onclick="window._youtubePlaylistManageExclusions('${playlist.id}')" style="font-size:11px;padding:3px 9px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#fbbf24;border-radius:6px;cursor:pointer;">Exclusions</button>
        <button onclick="window._youtubePlaylistDelete('${playlist.id}')" style="font-size:11px;padding:3px 9px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;border-radius:6px;cursor:pointer;">Delete</button>
      </div>
    </div>
  `).join('');
  if (window.lucide) lucide.createIcons({ el: list });
}

window._youtubePlaylistToggleGlobal = async (id, is_global) => {
  await fetch(`${API}/video/youtube-playlists/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_global })
  });
  loadYouTubePlaylists();
};

window._youtubePlaylistDelete = async (id, name) => {
  if (!confirm(`Remove the YouTube playlist "${name}"?\n\nKids will no longer see its videos.`)) return;
  await fetch(`${API}/video/youtube-playlists/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadYouTubePlaylists();
  if (window.showToast) window.showToast('YouTube playlist removed.');
};

window._youtubePlaylistManageExclusions = playlistId => {
  openVideoSourceExclusions(`youtube-playlists/${playlistId}`, 'playlist');
};

window._channelDelete = async (id, name) => {
  if (!confirm(`Remove the channel "${name}"?\n\nKids will no longer see it in their video home.`)) return;
  await fetch(`${API}/video/channels/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadVideoChannels();
  if (window.showToast) window.showToast('🗑️ Channel removed.');
};

window._channelManageExclusions = channelId => {
  openVideoSourceExclusions(`channels/${channelId}`, 'channel');
};

function openVideoSourceExclusions(sourcePath, sourceLabel) {
  const modal = document.getElementById('channel-exclusions-modal');
  modal.classList.add('active');
  window._currentExclusionSourcePath = sourcePath;
  document.getElementById('exclusion-youtube-url').value = '';
  loadVideoSourceExclusions(sourcePath, sourceLabel);
}

async function loadVideoSourceExclusions(sourcePath, sourceLabel = 'source') {
  const listEl = document.getElementById('exclusions-list');
  listEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px;">Loading...</p>';
  try {
    const res = await fetch(`${API}/video/${sourcePath}/exclusions`, { headers: authHeaders() });
    const exclusions = await res.json();
    if (!exclusions.length) {
      listEl.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No excluded videos for this ${sourceLabel}.</p>`;
      return;
    }
    listEl.innerHTML = exclusions.map(ex => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${ex.title || ex.youtube_id}</div>
          ${ex.flagged_by_student ? '<span style="font-size:11px;color:#fbbf24;margin-top:4px;display:inline-block;">🚩 Flagged by Student</span>' : ''}
        </div>
        <button onclick="window._removeExclusion('${sourcePath}', '${ex.youtube_id}', '${sourceLabel}')" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;">Remove</button>
      </div>
    `).join('');
  } catch(e) {
    listEl.innerHTML = '<p style="color:var(--accent-red);font-size:12px;">Failed to load exclusions</p>';
  }
}

window._removeExclusion = async (sourcePath, youtubeId, sourceLabel) => {
  await fetch(`${API}/video/${sourcePath}/exclusions/${youtubeId}`, { method: 'DELETE', headers: authHeaders() });
  loadVideoSourceExclusions(sourcePath, sourceLabel);
};

// Wire up the add button in the modal
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('exclusion-add-btn');
  if(addBtn) {
    addBtn.addEventListener('click', async () => {
      const url = document.getElementById('exclusion-youtube-url').value;
      if(!url) return;
      const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      const videoId = match ? match[1] : url.trim(); // Fallback to raw input if not a URL
      if(!videoId || videoId.length !== 11) {
        alert("Invalid YouTube URL or ID");
        return;
      }
      
      const sourcePath = window._currentExclusionSourcePath;
      if(!sourcePath) return;

      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';
      
      try {
        await fetch(`${API}/video/${sourcePath}/exclusions`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ youtube_id: videoId, flagged_by_student: false, title: 'Manually Excluded Video' })
        });
        document.getElementById('exclusion-youtube-url').value = '';
        loadVideoSourceExclusions(sourcePath, sourcePath.startsWith('youtube-playlists/') ? 'playlist' : 'channel');
      } catch(e) {
        console.error(e);
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Exclude';
      }
    });
  }
});

// ─────────────────────────────────────────────
//  PER-STUDENT PLAYLISTS
// ─────────────────────────────────────────────
function setupVideoPlaylists() {
  const sel = document.getElementById('vplay-student-sel');
  if (sel) {
    sel.addEventListener('change', renderVideoPlaylistTab);
  }
}

function populateVideoStudentSelects() {
  ['vplay-student-sel','vsett-student-sel','vhist-student-sel'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = _students.length
      ? _students.map(s => {
          const av = (!s.avatar || s.avatar.startsWith('data:') || s.avatar.startsWith('http')) ? '👤' : s.avatar;
          return `<option value="${s.id}">${av} ${s.name}</option>`;
        }).join('')
      : '<option value="">No students</option>';
    if (val) sel.value = val;
  });
}

let _allLibraryVideos = [];
let _assignedMap = {};

async function renderVideoPlaylistTab() {
  const sel = document.getElementById('vplay-student-sel');
  if (!sel || !sel.value) return;
  const studentId = sel.value;
  const student = _students.find(s => s.id === studentId);
  const childName = student ? student.name : 'Student';

  document.getElementById('vplay-current-title').textContent = `${childName}'s Playlist`;

  try {
    const [libRes, assignRes] = await Promise.all([
      fetch(`${API}/video/videos`, { headers: { 'x-kiosk-key': apiKey() } }),
      fetch(`${API}/video/assignments`, { headers: authHeaders() })
    ]);
    _allLibraryVideos = await libRes.json();
    _assignedMap = await assignRes.json();
  } catch(e) { return; }

  const assignedIds = new Set(_assignedMap[studentId] || []);
  const assigned  = _allLibraryVideos.filter(v => assignedIds.has(v.id) && !v.is_global);
  const globalVids = _allLibraryVideos.filter(v => v.is_global && v.screened && v.active);
  const available = _allLibraryVideos.filter(v => !assignedIds.has(v.id) && !v.is_global && v.screened && v.active);

  const assignedList = document.getElementById('vplay-assigned-list');
  if (assignedList) {
    let html = '';
    if (globalVids.length) {
      html += `<div style="font-size:11px;color:#818cf8;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:5px;"><i data-lucide="globe" style="width:12px;height:12px;"></i> Global Videos (all students)</div>`;
      html += globalVids.map(v => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);border-radius:8px;margin-bottom:4px;">
          <img src="${v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/default.jpg`}" style="width:52px;height:39px;object-fit:cover;border-radius:5px;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title}</div>
            <div style="font-size:10px;color:#818cf8;">🌐 Global — all students see this</div>
          </div>
        </div>`).join('');
    }
    if (assigned.length) {
      if (globalVids.length) html += `<div style="font-size:11px;color:var(--text-muted);font-weight:600;margin:10px 0 6px;display:flex;align-items:center;gap:5px;"><i data-lucide="user" style="width:12px;height:12px;"></i> ${childName}'s Personal Playlist</div>`;
      html += assigned.map(v => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;margin-bottom:4px;">
          <img src="${v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/default.jpg`}" style="width:52px;height:39px;object-fit:cover;border-radius:5px;flex-shrink:0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title}</div>
            <div style="font-size:10px;color:var(--text-muted);">${v.channel || ''}</div>
          </div>
          <button onclick="window._videoUnassign('${studentId}','${v.id}')"
            style="font-size:11px;padding:3px 8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;border-radius:6px;cursor:pointer;flex-shrink:0;">
            Remove
          </button>
        </div>`).join('');
    }
    if (!globalVids.length && !assigned.length) {
      html = '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No videos assigned yet. Add some from the library →</p>';
    }
    assignedList.innerHTML = html;
    if (window.lucide) lucide.createIcons({ el: assignedList });
  }

  const availList = document.getElementById('vplay-available-list');
  const availCount = document.getElementById('vplay-available-count');
  if (availCount) availCount.textContent = `${available.length} screened video${available.length !== 1 ? 's' : ''}`;
  if (availList) {
    availList.innerHTML = available.length
      ? available.map(v => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;margin-bottom:4px;">
            <img src="${v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/default.jpg`}" style="width:52px;height:39px;object-fit:cover;border-radius:5px;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title}</div>
              <div style="font-size:10px;color:var(--text-muted);">${v.channel || ''}</div>
            </div>
            <button onclick="window._videoAssign('${studentId}','${v.id}')"
              style="font-size:11px;padding:3px 8px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);color:#34d399;border-radius:6px;cursor:pointer;flex-shrink:0;">
              + Add
            </button>
          </div>`).join('')
      : '<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">All screened videos are already assigned, or the library is empty.</p>';
  }
  await renderVideoSourceAssignments(studentId);
}

async function renderVideoSourceAssignments(studentId) {
  const currentElement = document.getElementById('vplay-assigned-sources');
  const availableElement = document.getElementById('vplay-available-sources');
  if (!currentElement || !availableElement) return;
  try {
    const [channelsResponse, channelAssignmentsResponse, playlistsResponse, playlistAssignmentsResponse] = await Promise.all([
      fetch(`${API}/video/channels`, { headers: { 'x-kiosk-key': apiKey() } }),
      fetch(`${API}/video/channel-assignments`, { headers: authHeaders() }),
      fetch(`${API}/video/youtube-playlists`, { headers: { 'x-kiosk-key': apiKey() } }),
      fetch(`${API}/video/youtube-playlist-assignments`, { headers: authHeaders() })
    ]);
    const [channels, channelAssignments, playlists, playlistAssignments] = await Promise.all([
      channelsResponse.json(), channelAssignmentsResponse.json(), playlistsResponse.json(), playlistAssignmentsResponse.json()
    ]);
    const assignedChannelIds = new Set(channelAssignments[studentId] || []);
    const assignedPlaylistIds = new Set(playlistAssignments[studentId] || []);
    const sources = [
      ...channels.map(source => ({ ...source, source_type: 'channel', assigned: assignedChannelIds.has(source.id) })),
      ...playlists.map(source => ({ ...source, source_type: 'playlist', assigned: assignedPlaylistIds.has(source.id) }))
    ];
    const current = sources.filter(source => source.is_global || source.assigned);
    const available = sources.filter(source => !source.is_global && !source.assigned);

    const sourceRow = (source, action) => `
      <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;background:${source.is_global ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.03)'};border:1px solid ${source.is_global ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)'};border-radius:8px;">
        <i data-lucide="${source.source_type === 'channel' ? 'tv-2' : 'list-video'}" style="width:16px;height:16px;color:${source.source_type === 'channel' ? '#34d399' : '#a78bfa'};flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${source.name}</div>
          <div style="font-size:10px;color:${source.is_global ? '#818cf8' : 'var(--text-muted)'};">${source.is_global ? 'Global — all students' : source.source_type === 'channel' ? 'YouTube channel' : 'YouTube playlist'}</div>
        </div>
        ${action ? `<button onclick="window._videoSourceAssignment('${source.source_type}','${source.id}','${studentId}','${action}')" style="font-size:11px;padding:3px 8px;background:${action === 'add' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)'};border:1px solid ${action === 'add' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'};color:${action === 'add' ? '#34d399' : '#f87171'};border-radius:6px;cursor:pointer;">${action === 'add' ? '+ Add' : 'Remove'}</button>` : ''}
      </div>`;

    currentElement.innerHTML = current.length
      ? current.map(source => sourceRow(source, source.is_global ? null : 'remove')).join('')
      : '<p style="color:var(--text-muted);font-size:13px;">No approved sources assigned.</p>';
    availableElement.innerHTML = available.length
      ? available.map(source => sourceRow(source, 'add')).join('')
      : '<p style="color:var(--text-muted);font-size:13px;">No other non-global sources available.</p>';
    if (window.lucide) {
      lucide.createIcons({ el: currentElement });
      lucide.createIcons({ el: availableElement });
    }
  } catch (error) {
    logger.warn('video', 'Failed to load approved source assignments', error);
    currentElement.innerHTML = '<p style="color:var(--accent-red);font-size:12px;">Failed to load sources.</p>';
    availableElement.innerHTML = '';
  }
}

window._videoSourceAssignment = async (sourceType, sourceId, studentId, action) => {
  const base = sourceType === 'channel' ? `channels/${sourceId}` : `youtube-playlists/${sourceId}`;
  await fetch(`${API}/video/${base}/assign${action === 'remove' ? `/${studentId}` : ''}`, {
    method: action === 'remove' ? 'DELETE' : 'POST',
    headers: authHeaders(),
    body: action === 'remove' ? undefined : JSON.stringify({ student_id: studentId })
  });
  renderVideoSourceAssignments(studentId);
};

window._videoAssign = async (studentId, videoId) => {
  await fetch(`${API}/video/assign`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ student_id: studentId, video_id: videoId })
  });
  renderVideoPlaylistTab();
  if (window.showToast) window.showToast('✅ Video added to playlist!');
};

window._videoUnassign = async (studentId, videoId) => {
  await fetch(`${API}/video/assign/${studentId}/${videoId}`, {
    method: 'DELETE', headers: authHeaders()
  });
  renderVideoPlaylistTab();
};

// ─────────────────────────────────────────────
//  PER-STUDENT SETTINGS
// ─────────────────────────────────────────────
function setupVideoStudentSettings() {
  const sel = document.getElementById('vsett-student-sel');
  if (sel) sel.addEventListener('change', loadVideoStudentSettingsForm);

  document.getElementById('vsett-save-btn')?.addEventListener('click', saveVideoStudentSettings);

  // Override Today button
  document.getElementById('vsett-override-btn')?.addEventListener('click', toggleOverrideToday);
  document.getElementById('vsett-override-all-btn')?.addEventListener('click', overrideAllToday);
}

async function loadVideoStudentSettingsForm() {
  const sel = document.getElementById('vsett-student-sel');
  if (!sel || !sel.value) return;
  try {
    const res = await fetch(`${API}/video/student-settings/${sel.value}`, { headers: { 'x-kiosk-key': apiKey() } });
    const s = await res.json();
    const maxEl = document.getElementById('vsett-max-min');
    const reqEl = document.getElementById('vsett-req-completion');
    if (maxEl) maxEl.value   = s.max_daily_minutes ?? VIDEO_DEFAULT_MINUTES;
    if (reqEl) reqEl.checked = !!s.require_completion;
    renderOverrideState(s.override_date);
  } catch(e) { logger.warn('video', 'Failed to load student video settings', e); }
}

function renderOverrideState(overrideDate) {
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  const isOverridden = overrideDate === today;
  const btn = document.getElementById('vsett-override-btn');
  const badge = document.getElementById('vsett-override-badge');
  if (btn) {
    btn.style.background = isOverridden ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.1)';
    btn.style.borderColor = isOverridden ? 'rgba(251,191,36,0.3)' : 'rgba(52,211,153,0.2)';
    btn.style.color = isOverridden ? '#fbbf24' : '#34d399';
    btn.innerHTML = isOverridden
      ? '<i data-lucide="lock-open" style="width:15px;height:15px;margin-right:6px;vertical-align:-3px;"></i> Unlock Active — Click to Re-Lock'
      : '<i data-lucide="unlock" style="width:15px;height:15px;margin-right:6px;vertical-align:-3px;"></i> Unlock Videos for Today';
    if (window.lucide) lucide.createIcons({ el: btn });
  }
  if (badge) {
    badge.style.display = isOverridden ? 'inline-flex' : 'none';
    badge.textContent = '🟡 School requirement bypassed today';
  }
}

async function toggleOverrideToday() {
  const sel = document.getElementById('vsett-student-sel');
  if (!sel || !sel.value) return;
  try {
    const res = await fetch(`${API}/video/student-settings/${sel.value}/override-today`, {
      method: 'POST', headers: authHeaders()
    });
    const data = await res.json();
    renderOverrideState(data.override_date);
    const student = _students.find(s => s.id === sel.value);
    const name = student ? student.name : 'Student';
    if (window.showToast) window.showToast(data.overridden
      ? `🟡 ${name} can now watch videos without finishing school today!`
      : `🔒 ${name}'s video access is back to normal.`);
  } catch(e) { logger.warn('video', 'Failed to toggle override', e); }
}

async function overrideAllToday() {
  const btn = document.getElementById('vsett-override-all-btn');
  if (!btn) return;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader" style="width:15px;height:15px;margin-right:6px;vertical-align:-3px;"></i> Unlocking All...';
  btn.disabled = true;
  if (window.lucide) lucide.createIcons({ el: btn });
  
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
  
  let successCount = 0;
  for (const s of (_students || [])) {
    try {
      // Get current state
      const res = await fetch(`${API}/video/student-settings/${s.id}`, { headers: { 'x-kiosk-key': apiKey() } });
      const current = await res.json();
      
      // If they are not currently overridden for today, toggle them (which unlocks them)
      if (current.override_date !== today) {
        const tRes = await fetch(`${API}/video/student-settings/${s.id}/override-today`, {
          method: 'POST', headers: authHeaders()
        });
        if (tRes.ok) successCount++;
      } else {
        // They were already unlocked today
        successCount++;
      }
    } catch(e) { logger.warn('video', 'Failed to override student ' + s.id, e); }
  }
  
  btn.innerHTML = originalHtml;
  btn.disabled = false;
  if (window.lucide) lucide.createIcons({ el: btn });
  if (window.showToast) window.showToast(`✅ Unlocked videos for all ${successCount} students today!`);
  
  // Refresh UI for the currently selected student
  loadVideoStudentSettingsForm();
}

async function saveVideoStudentSettings() {
  const sel = document.getElementById('vsett-student-sel');
  if (!sel || !sel.value) return;
  const body = {
    max_daily_minutes: parseInt(document.getElementById('vsett-max-min')?.value) || VIDEO_DEFAULT_MINUTES,
    require_completion: document.getElementById('vsett-req-completion')?.checked ?? true
  };
  await fetch(`${API}/video/student-settings/${sel.value}`, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify(body)
  });
  const savedEl = document.getElementById('vsett-saved');
  if (savedEl) { savedEl.style.display = 'inline'; setTimeout(() => savedEl.style.display = 'none', 2500); }
  if (window.showToast) window.showToast('✅ Video settings saved!');
}

// ─────────────────────────────────────────────
//  WATCH HISTORY
// ─────────────────────────────────────────────
function setupVideoHistory() {
  const sel = document.getElementById('vhist-student-sel');
  if (sel) sel.addEventListener('change', loadVideoHistory);
}

async function loadVideoHistory() {
  const sel = document.getElementById('vhist-student-sel');
  if (!sel || !sel.value) return;
  const table = document.getElementById('vhist-table');
  if (!table) return;
  try {
    const res = await fetch(`${API}/video/watch/${sel.value}/history`, { headers: authHeaders() });
    const rows = await res.json();
    if (!rows.length) {
      table.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No watch history yet.</p>';
      return;
    }
    table.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08); color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.08em;">
            <th style="text-align:left;padding:6px 0;">Date</th>
            <th style="text-align:right;padding:6px 0;">Watch Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:8px 0; color:var(--text-primary);">${r.date}</td>
              <td style="padding:8px 0; text-align:right; color:#a78bfa; font-weight:600;">${fmtMin(r.watched_seconds)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    if (table) table.innerHTML = '<p style="color:var(--text-muted);">Error loading history.</p>';
  }
}
