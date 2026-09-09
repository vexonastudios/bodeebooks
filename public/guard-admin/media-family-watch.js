import { mediaFetch as fetch } from './cloud-media-transport.js';
const FAMILY_WATCH_API = '/api/family-watch';

let familyWatchState = { active: false, children: [] };
let familyWatchStudents = [];
let pollTimer = null;
let clockTimer = null;
let parentPlayer = null;
let parentPlayerReady = false;
let parentPlayerVideoId = '';
let parentPlayerLoadingId = '';
let ytApiPromise = null;
let lastParentSyncAt = 0;

function byId(id) { return document.getElementById(id); }

function acceptState(next) {
  if (!next?.active || !familyWatchState.active || Number(next.sequence) >= Number(familyWatchState.sequence)) {
    familyWatchState = next;
    familyWatchState._received_at = Date.now();
  }
  return familyWatchState;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function avatarMarkup(student) {
  const avatar = String(student.avatar || '👤');
  if (/^(data:image\/|https?:\/\/)/i.test(avatar)) {
    return `<img class="family-watch-avatar" src="${escapeHtml(avatar)}" alt="">`;
  }
  return `<span class="family-watch-avatar">${escapeHtml(avatar)}</span>`;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function formatPosition(seconds) {
  const whole = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function currentPosition() {
  let position = Number(familyWatchState.position_seconds) || 0;
  if (familyWatchState.playback_state === 'playing') {
    const serverTime = Date.parse(familyWatchState.server_time);
    const anchor = Number.isFinite(serverTime) ? serverTime : (Number(familyWatchState._received_at) || Date.now());
    position += Math.max(0, Date.now() - anchor) / 1000;
  }
  return position;
}

function childPosition(child) {
  let position = Math.max(0, Number(child.position_seconds) || 0);
  if (child.player_state === 'playing') {
    const reportedAt = Date.parse(child.last_reported_at);
    if (Number.isFinite(reportedAt)) position += Math.max(0, Date.now() - reportedAt) / 1000;
  }
  return position;
}

function setParentSyncStatus(kind, label) {
  const dot = byId('family-watch-parent-sync-dot');
  const text = byId('family-watch-parent-sync-label');
  if (dot) dot.className = `family-watch-parent-sync-dot ${kind || ''}`;
  if (text) text.textContent = label;
}

function ensureParentPlayerHost() {
  let host = byId('family-watch-parent-player');
  if (host?.tagName === 'DIV') return host;
  host?.remove();
  host = document.createElement('div');
  host.id = 'family-watch-parent-player';
  byId('family-watch-parent-player-waiting')?.before(host);
  return host;
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => reject(new Error('YouTube player could not load'));
      document.head.appendChild(script);
    }
    window.setTimeout(() => {
      if (!window.YT?.Player) reject(new Error('YouTube player timed out'));
    }, 15_000);
  });
  return ytApiPromise;
}

function destroyParentPlayer() {
  try { parentPlayer?.destroy?.(); } catch (_) {}
  parentPlayer = null;
  parentPlayerReady = false;
  parentPlayerVideoId = '';
  parentPlayerLoadingId = '';
  lastParentSyncAt = 0;
  ensureParentPlayerHost().replaceChildren();
}

function applyParentPlayback(session, force = false) {
  if (!parentPlayerReady || !parentPlayer || !session?.active || parentPlayerVideoId !== session.youtube_id) return;
  const target = currentPosition();
  const actual = Math.max(0, Number(parentPlayer.getCurrentTime?.()) || 0);
  const duration = Math.max(0, Number(parentPlayer.getDuration?.()) || 0);
  const atEnd = duration > 0 && actual >= duration - 1.5;
  const drift = actual - target;
  if (!atEnd && (force || Math.abs(drift) > 1.5)) parentPlayer.seekTo(target, true);

  parentPlayer.setVolume(Math.max(0, Math.min(100, Number(session.volume) || 0)));
  const playerState = parentPlayer.getPlayerState?.();
  const parentViewIsVisible = byId('tab-family-watch')?.classList.contains('active') && document.visibilityState !== 'hidden';
  if (session.playback_state === 'playing' && !atEnd && parentViewIsVisible) {
    if (playerState !== window.YT?.PlayerState?.PLAYING && playerState !== window.YT?.PlayerState?.BUFFERING) parentPlayer.playVideo();
  } else if (playerState === window.YT?.PlayerState?.PLAYING || playerState === window.YT?.PlayerState?.BUFFERING) {
    parentPlayer.pauseVideo();
  }

  if (playerState === window.YT?.PlayerState?.BUFFERING) setParentSyncStatus('buffering', 'Parent player buffering — it will catch up automatically');
  else if (Math.abs(drift) > 1.5) setParentSyncStatus('buffering', 'Parent player catching up');
  else setParentSyncStatus('synced', session.playback_state === 'playing' && parentViewIsVisible ? 'Parent player synced and playing' : 'Parent player synced and paused');
  lastParentSyncAt = Date.now();
}

async function ensureParentPlayer(session) {
  if (!session?.active) return;
  if (parentPlayer && parentPlayerVideoId === session.youtube_id) {
    applyParentPlayback(session);
    return;
  }
  if (parentPlayerLoadingId === session.youtube_id) return;
  parentPlayerLoadingId = session.youtube_id;
  byId('family-watch-parent-player-waiting').hidden = false;
  byId('family-watch-parent-player-error').hidden = true;
  setParentSyncStatus('buffering', 'Parent player connecting');
  try {
    await loadYouTubeApi();
    if (!familyWatchState.active || familyWatchState.youtube_id !== session.youtube_id) return;
    try { parentPlayer?.destroy?.(); } catch (_) {}
    parentPlayer = null;
    parentPlayerReady = false;
    const host = ensureParentPlayerHost();
    host.replaceChildren();
    parentPlayerVideoId = session.youtube_id;
    parentPlayer = new window.YT.Player(host, {
      videoId: session.youtube_id,
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1,
        playsinline: 1, rel: 0, iv_load_policy: 3, start: Math.floor(currentPosition()),
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          parentPlayerReady = true;
          parentPlayerLoadingId = '';
          byId('family-watch-parent-player-waiting').hidden = true;
          applyParentPlayback(familyWatchState, true);
        },
        onStateChange: event => {
          if (event.data === window.YT?.PlayerState?.BUFFERING) setParentSyncStatus('buffering', 'Parent player buffering — it will catch up automatically');
          else if (event.data === window.YT?.PlayerState?.PLAYING || event.data === window.YT?.PlayerState?.PAUSED) applyParentPlayback(familyWatchState);
        },
        onError: () => {
          parentPlayerReady = false;
          byId('family-watch-parent-player-waiting').hidden = true;
          byId('family-watch-parent-player-error').hidden = false;
          setParentSyncStatus('error', 'Parent player could not play this video');
        }
      }
    });
  } catch (_) {
    parentPlayerLoadingId = '';
    byId('family-watch-parent-player-waiting').hidden = true;
    byId('family-watch-parent-player-error').hidden = false;
    setParentSyncStatus('error', 'Parent player could not connect to YouTube');
  }
}

function setStatus(message, error = false) {
  const status = byId('family-watch-launch-status');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('error', error);
}

function renderStudentPicker() {
  const root = byId('family-watch-student-picker');
  if (!root) return;
  root.innerHTML = familyWatchStudents.map(student => `
    <label class="family-watch-student-option">
      <input type="checkbox" value="${escapeHtml(student.id)}" checked>
      ${avatarMarkup(student)}<strong>${escapeHtml(student.name)}</strong>
    </label>`).join('');
}

function childStateLabel(child) {
  const state = child.player_state || (child.connected ? 'waiting' : 'offline');
  if (state === 'ready') return 'Ready — waiting for play';
  if (state === 'playing') {
    const position = childPosition(child);
    const drift = position - currentPosition();
    const sync = Math.abs(drift) <= 2.5 ? 'synced' : 'syncing';
    return `Playing${child.position_seconds != null ? ` · ${formatPosition(position)}` : ''} · ${sync}`;
  }
  if (state === 'paused') return 'Paused';
  if (state === 'buffering') return 'Buffering';
  if (state === 'loading') return 'Opening video';
  if (state === 'ended') return 'Video finished';
  if (state === 'error') return `Playback error${child.error_code ? ` (${child.error_code})` : ''}`;
  if (state === 'waiting') return 'Connected — waiting';
  return 'Offline';
}

function renderActiveState() {
  const active = !!familyWatchState.active;
  byId('family-watch-inactive').hidden = active;
  byId('family-watch-active').hidden = !active;
  const badge = byId('family-watch-live-badge');
  badge.style.display = active ? 'inline-flex' : 'none';
  if (!active) {
    destroyParentPlayer();
    return;
  }

  byId('family-watch-title').textContent = familyWatchState.title || 'Family video';
  byId('family-watch-thumbnail').src = familyWatchState.thumbnail_url || `https://i.ytimg.com/vi/${familyWatchState.youtube_id}/mqdefault.jpg`;
  byId('family-watch-started-by').textContent = `Started by ${familyWatchState.started_by || 'Parent'} · Child video allowances are not charged.`;
  byId('family-watch-volume').value = String(familyWatchState.volume ?? 75);
  byId('family-watch-volume-label').textContent = `${familyWatchState.volume ?? 75}%`;

  const play = byId('family-watch-play-toggle');
  const isPlaying = familyWatchState.playback_state === 'playing';
  play.dataset.familyWatchControl = isPlaying ? 'pause' : 'play';
  play.innerHTML = isPlaying
    ? '<i data-lucide="pause"></i><span>Pause</span>'
    : '<i data-lucide="play"></i><span>Play</span>';

  const children = familyWatchState.children || [];
  byId('family-watch-child-statuses').innerHTML = children.length ? children.map(child => `
    <article class="family-watch-child">
      ${avatarMarkup(child)}
      <div><strong>${escapeHtml(child.name)}</strong><small>${escapeHtml(childStateLabel(child))}</small></div>
      <span class="family-watch-child-state ${escapeHtml(child.player_state || (child.connected ? 'waiting' : 'offline'))}" aria-hidden="true"></span>
    </article>`).join('') : '<p class="family-watch-inline-status">No children are targeted by this session.</p>';
  byId('family-watch-position').textContent = formatPosition(currentPosition());
  ensureParentPlayer(familyWatchState);
  window.lucide?.createIcons();
}

export async function loadFamilyWatch() {
  try {
    acceptState(await request(`${FAMILY_WATCH_API}/admin`));
    renderActiveState();
  } catch (error) {
    if (byId('tab-family-watch')?.classList.contains('active')) setStatus(error.message, true);
  }
}

async function loadStudents() {
  try {
    familyWatchStudents = await request('/api/students');
    renderStudentPicker();
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function startSession() {
  const button = byId('family-watch-start');
  const video = byId('family-watch-video-input').value.trim();
  const all = byId('family-watch-all-students').checked;
  const studentIds = [...byId('family-watch-student-picker').querySelectorAll('input:checked')].map(input => input.value);
  if (!video) return setStatus('Paste a YouTube video link or use Search first.', true);
  if (!all && !studentIds.length) return setStatus('Choose at least one child.', true);
  button.disabled = true;
  setStatus('Checking that YouTube allows this video inside BodeeGuard…');
  try {
    acceptState(await request(`${FAMILY_WATCH_API}/admin/start`, {
      method: 'POST',
      body: JSON.stringify({
        url: video,
        title: byId('family-watch-title-input').value.trim(),
        target_mode: all ? 'all' : 'selected',
        student_ids: studentIds,
        volume: 75
      })
    }));
    renderActiveState();
    window.showToast?.('Family Watch is ready on the children’s screens. Press Play when everyone is ready.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function sendControl(action, values = {}) {
  try {
    acceptState(await request(`${FAMILY_WATCH_API}/admin/control`, {
      method: 'POST',
      body: JSON.stringify({ action, ...values })
    }));
    renderActiveState();
  } catch (error) {
    window.showToast?.(error.message, true);
  }
}

async function endSession() {
  const button = byId('family-watch-end');
  button.disabled = true;
  try {
    await request(`${FAMILY_WATCH_API}/admin/end`, { method: 'POST', body: '{}' });
    familyWatchState = { active: false, children: [] };
    renderActiveState();
    window.showToast?.('Family Watch ended. Each child returned to what they were doing.');
  } catch (error) {
    window.showToast?.(error.message, true);
  } finally {
    button.disabled = false;
  }
}

export function setupFamilyWatchTab() {
  byId('family-watch-refresh')?.addEventListener('click', () => {
    destroyParentPlayer();
    return Promise.all([loadStudents(), loadFamilyWatch()]);
  });
  byId('family-watch-start')?.addEventListener('click', startSession);
  byId('family-watch-end')?.addEventListener('click', endSession);
  byId('family-watch-all-students')?.addEventListener('change', event => {
    byId('family-watch-student-picker').hidden = event.currentTarget.checked;
  });
  byId('family-watch-active')?.addEventListener('click', event => {
    const control = event.target.closest('[data-family-watch-control]');
    const seek = event.target.closest('[data-family-watch-seek]');
    if (control) sendControl(control.dataset.familyWatchControl);
    else if (seek) sendControl('seek', { position_seconds: Math.max(0, currentPosition() + Number(seek.dataset.familyWatchSeek)) });
  });
  byId('family-watch-volume')?.addEventListener('change', event => sendControl('volume', { volume: Number(event.currentTarget.value) }));

  loadStudents();
  loadFamilyWatch();
  pollTimer = window.setInterval(() => {
    if (!document.hidden && familyWatchState.active) loadFamilyWatch();
  }, 3000);
  clockTimer = window.setInterval(() => {
    if (familyWatchState.active) {
      byId('family-watch-position').textContent = formatPosition(currentPosition());
      if (Date.now() - lastParentSyncAt >= 1500) applyParentPlayback(familyWatchState);
    }
  }, 1000);
  window.addEventListener('beforeunload', () => {
    window.clearInterval(pollTimer);
    window.clearInterval(clockTimer);
  }, { once: true });
}
