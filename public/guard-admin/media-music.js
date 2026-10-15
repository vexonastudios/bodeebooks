import { mediaFetch as fetch } from './cloud-media-transport.js';
/* global AbortSignal, URL, Option */
let _musicInited = false;
let _musicReady = null;
let _playlistWired = false;
let _playlistLoading = false;
let _musicBatch = null;
let _musicBatchBusy = false;
let _allTracks   = [];
let _allStudents = [];
let _assignments = {}; // { student_id: [track_id,...] }
let _youtubePlaylists = [];
let _youtubePlaylistAssignments = {};
document.addEventListener('cloud-music-library-changed', () => { if (_musicInited) void loadMusicTracks().catch(error => window.showToast?.(error.message, true)); });
const MUSIC_DEFAULT_MINUTES = window.BODEE_MEDIA_DEFAULTS.music.dailyMinutes;

// ── Helpers ──────────────────────────────────────────
const mget = (url) => musicPlaylistFetch(url);
const mpost = async (url, body, method = 'POST') => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    method, headers: { 'Content-Type': 'application/json', 'x-kiosk-key': window._adminApiKey || '' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};
const mdel = (url) => musicPlaylistFetch(url, { method: 'DELETE' });

function musicEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function musicPlaylistFetch(url, options = {}) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-kiosk-key': window._adminApiKey || '',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// ── Sub-tab navigation ───────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-stab]');
  if (!btn) return;
  document.querySelectorAll('.music-stab').forEach(b => b.classList.remove('active-stab'));
  btn.classList.add('active-stab');
  document.querySelectorAll('.music-stab-body').forEach(b => b.style.display = 'none');
  const panel = document.getElementById(btn.dataset.stab);
  if (panel) panel.style.display = 'block';

  if (btn.dataset.stab === 'mplay') void refreshPlaylistsTab();
  if (btn.dataset.stab === 'mytplay') refreshMusicYoutubePlaylists();
  if (btn.dataset.stab === 'msett') void refreshSettingsTab().catch(error => window.showToast?.(error.message, true));
  if (btn.dataset.stab === 'mreq')   loadMusicRequests();
  if (btn.dataset.stab === 'mhist') void refreshMusicHistory().catch(error => window.showToast?.(error.message, true));
});

// ── Init ─────────────────────────────────────────────
async function initMusicAdmin() {
  if (_musicReady) return _musicReady;
  _musicReady = initializeMusicAdmin().catch(error => { _musicReady = null; throw error; });
  return _musicReady;
}
async function initializeMusicAdmin() {
  if (!_musicInited) {
    _musicInited = true;
    wireLibraryButtons();
    wireMusicYoutubePlaylistButtons();
    wireMusicBulkImport();
  }

  // Add active-stab style
  const style = document.createElement('style');
  style.textContent = '.active-stab { background: rgba(139,92,246,0.2) !important; border-color: rgba(139,92,246,0.5) !important; color: #a78bfa !important; }';
  document.head.appendChild(style);

  await Promise.all([
    loadMusicSettings(),
    loadMusicTracks(),
    loadStudents()
  ]);
  populateMusicStudents(document.getElementById('music-ypl-student'));
  loadMusicRequestsBadge();
}

async function loadStudents() {
  try {
    const students = await mget('/api/students');
    if (!Array.isArray(students)) throw Error('Could not load your children.');
    _allStudents = students;
    return students;
  } catch (error) { throw new Error('Could not load your children. Please try again.'); }
}

// ── Library Tab ──────────────────────────────────────
function wireLibraryButtons() {
  const screenedControl = document.getElementById('music-screened-input');
  if (screenedControl && !document.getElementById('music-all-students-input')) {
    const audience = document.createElement('label');
    audience.className = 'music-all-students-control';
    audience.htmlFor = 'music-all-students-input';
    audience.innerHTML = '<input type="checkbox" id="music-all-students-input"> Add to every child’s music playlist';
    screenedControl.parentElement.after(audience);
  }
  // Save global settings
  document.getElementById('save-music-settings-btn').addEventListener('click', async () => {
    await mpost('/api/music/settings', {
      music_enabled:    document.getElementById('music-enabled').checked,
      music_start_time: document.getElementById('music-start-time').value,
      music_end_time:   document.getElementById('music-end-time').value
    }, 'PATCH');
    const s = document.getElementById('music-settings-saved');
    s.style.display = 'inline';
    setTimeout(() => s.style.display = 'none', 2200);
  });

  // Look up YouTube video
  document.getElementById('music-lookup-btn').addEventListener('click', async () => {
    const raw = document.getElementById('music-yt-url').value;
    let parsed;
    try { parsed = parseMusicLinks(raw); } catch (error) { return window.showToast?.(error.message, true); }
    if (parsed.ids.length !== 1 || parsed.duplicates || parsed.invalid.length) return prepareMusicBatch('library', parsed);
    _musicBatch = null; renderMusicBatch();
    const vid = parsed.ids[0];
    const btn = document.getElementById('music-lookup-btn');
    if (!vid) { alert('Paste a YouTube URL or 11-character video ID.'); return; }
    btn.disabled = true; btn.textContent = 'Looking up…';
    try {
      const o = await mget(`/api/music/lookup?youtube_id=${vid}`);
      if (o.error) throw new Error(o.error);
      document.getElementById('music-video-id').value     = vid;
      document.getElementById('music-title-input').value  = o.title || '';
      document.getElementById('music-artist-input').value = o.author_name || '';
    } catch(e) {
      document.getElementById('music-video-id').value     = vid;
      document.getElementById('music-title-input').value  = '';
      document.getElementById('music-artist-input').value = '';
      alert('Could not auto-fetch title — please type it in.');
    }
    document.getElementById('music-preview-thumb').src  = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
    document.getElementById('music-preview').style.display = 'block';
    document.getElementById('music-screened-input').checked = false;
    document.getElementById('music-all-students-input').checked = document.getElementById('tab-music').classList.contains('mobile-media-add');
    btn.disabled = false; btn.textContent = 'Review links';
  });

  document.getElementById('music-cancel-btn').addEventListener('click', () => {
    document.getElementById('music-preview').style.display = 'none';
    document.getElementById('music-yt-url').value = '';
  });

  document.getElementById('music-add-btn').addEventListener('click', async () => {
    const vid    = document.getElementById('music-video-id').value;
    const title  = document.getElementById('music-title-input').value.trim();
    const artist = document.getElementById('music-artist-input').value.trim();
    const screened = document.getElementById('music-screened-input').checked;
    const allStudents = document.getElementById('music-all-students-input').checked;
    if (!title) { alert('Please enter a song title.'); return; }
    if (allStudents && !screened) { alert('Preview and approve the song before adding it to every child.'); return; }
    const btn = document.getElementById('music-add-btn');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      if (allStudents && !_allStudents.length) await loadStudents();
      if (allStudents && !_allStudents.length) throw new Error('Could not load your children. Please try again.');
      const r = await mpost('/api/music/tracks', {
        title, artist, youtube_id: vid,
        thumbnail_url: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`
      });
      if (screened && r.id) {
        await mpost(`/api/music/tracks/${r.id}`, { screened: true }, 'PATCH');
      }
      let failed = 0;
      if (allStudents && r.id) {
        const assignments = await Promise.allSettled(_allStudents.map(student =>
          mpost('/api/music/assign', { student_id: student.id, track_id: r.id })));
        assignments.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const studentId = _allStudents[index].id;
            if (!_assignments[studentId]) _assignments[studentId] = [];
            if (!_assignments[studentId].includes(r.id)) _assignments[studentId].push(r.id);
          } else failed++;
        });
      }
      document.getElementById('music-preview').style.display = 'none';
      document.getElementById('music-yt-url').value = '';
      await loadMusicTracks();
      if (failed) window.showToast?.(`Song saved, but ${failed} of ${_allStudents.length} child playlists did not update. Open Music → Playlists to finish.`, true);
      else window.showToast?.(allStudents ? `"${title}" added to every child’s playlist.` : `"${title}" added to the library.`);
    } catch(e) { alert(e.message || 'Failed to add song.'); }
    btn.disabled = false; btn.textContent = '➕ Add to Library';
  });
}

async function loadMusicSettings() {
  try {
    const s = await mget('/api/music/settings');
    document.getElementById('music-enabled').checked        = s.music_enabled;
    document.getElementById('music-start-time').value       = s.music_start_time || '08:00';
    document.getElementById('music-end-time').value         = s.music_end_time   || '21:00';
  } catch(e) {}
}

async function loadMusicTracks() {
  const list  = document.getElementById('music-track-list');
  const label = document.getElementById('music-count-label');
  list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Loading…</p>';
  try {
    const tracks = await mget('/api/music/tracks');
    if (!Array.isArray(tracks)) throw Error('Could not load the music library.');
    _allTracks = tracks;
    label.textContent = `${_allTracks.length} song${_allTracks.length !== 1 ? 's' : ''} in library`;
    if (!_allTracks.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No songs yet — add the first one above.</p>';
      return;
    }
    list.innerHTML = _allTracks.map((t, i) => {
      const thumb = t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/mqdefault.jpg`;
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;
        background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,${t.screened?'0.1':'0.04'});
        border-radius:10px;">
        <span style="width:22px;text-align:center;color:var(--text-muted);font-size:12px;">${i+1}</span>
        <img src="${musicEscape(thumb)}" style="width:56px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${musicEscape(t.title)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${musicEscape(t.artist||'—')}</div>
        </div>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:${t.screened?'#34d399':'#fbbf24'};flex-shrink:0;cursor:pointer;">
          <input type="checkbox" ${t.screened?'checked':''} onchange="toggleScreened('${t.id}',this)"
            style="width:13px;height:13px;cursor:pointer;">
          ${t.screened?'<i data-lucide="check-circle" style="width:14px;height:14px;margin-right:2px;"></i> Screened':'<i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:2px;"></i> Not screened'}
        </label>
        <a href="https://youtube.com/watch?v=${t.youtube_id}" target="_blank"
           style="display:flex;align-items:center;font-size:12px;color:var(--text-muted);text-decoration:none;flex-shrink:0;"><i data-lucide="play-circle" style="width:14px;height:14px;margin-right:4px;"></i> Preview</a>
        <button onclick="deleteMusicTrack('${t.id}',this)"
          style="display:flex;align-items:center;justify-content:center;padding:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);
            color:#f87171;border-radius:6px;cursor:pointer;flex-shrink:0;" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </div>`;
    }).join('');

    if (window.lucide) { setTimeout(() => window.lucide.createIcons(), 0); }
  } catch(e) { list.innerHTML = '<p style="color:var(--text-muted);">Could not load songs. Open Playlists and choose Try again.</p>'; throw e; }
}

window.toggleScreened = async function(id, cb) {
  await mpost(`/api/music/tracks/${id}`, { screened: cb.checked }, 'PATCH');
  await loadMusicTracks();
};

window.deleteMusicTrack = async function(id, btn) {
  const title = _allTracks.find(track => track.id === id)?.title || 'this song';
  if (!confirm(`Remove "${title}" from the library? It will also be removed from all student playlists.`)) return;
  btn.disabled = true;
  await mdel(`/api/music/tracks/${id}`);
  await loadMusicTracks();
};

// ── Approved YouTube Playlists ───────────────────────
function wireMusicYoutubePlaylistButtons() {
  const studentSelect = document.getElementById('music-ypl-student');
  studentSelect.innerHTML = _allStudents.map(student =>
    `<option value="${musicEscape(student.id)}">${musicEscape(student.name)}</option>`
  ).join('');
  studentSelect.addEventListener('change', renderMusicYoutubePlaylistAssignments);

  document.getElementById('music-ypl-add').addEventListener('click', async () => {
    const name = document.getElementById('music-ypl-name').value.trim();
    const url = document.getElementById('music-ypl-url').value.trim();
    if (!name || !url) return alert('Enter a display name and YouTube playlist URL.');
    const button = document.getElementById('music-ypl-add');
    button.disabled = true;
    button.textContent = 'Loading playlist…';
    try {
      const result = await musicPlaylistFetch('/api/music/youtube-playlists', {
        method: 'POST',
        body: JSON.stringify({
          name,
          url,
          is_global: document.getElementById('music-ypl-global').checked
        })
      });
      document.getElementById('music-ypl-name').value = '';
      document.getElementById('music-ypl-url').value = '';
      await refreshMusicYoutubePlaylists();
      const skipped = Number(result.skipped_unavailable || 0);
      window.showToast?.(`Added ${result.item_count ?? result.video_count ?? 0} playable songs from "${name}".${skipped ? ` Skipped ${skipped} unavailable.` : ''}`);
    } catch (error) { alert(error.message || 'Could not add that playlist.'); }
    finally {
      button.disabled = false;
      button.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:5px;vertical-align:-3px;"></i> Add Playlist';
      window.lucide?.createIcons({ el: button });
    }
  });

  document.getElementById('music-ypl-list').addEventListener('change', async event => {
    const input = event.target.closest('[data-music-ypl-global]');
    if (!input) return;
    try {
      await musicPlaylistFetch(`/api/music/youtube-playlists/${input.dataset.musicYplGlobal}`, {
        method: 'PATCH', body: JSON.stringify({ is_global: input.checked })
      });
      await refreshMusicYoutubePlaylists();
    } catch (error) {
      input.checked = !input.checked;
      alert(error.message || 'Could not update that playlist.');
    }
  });

  document.getElementById('music-ypl-list').addEventListener('click', async event => {
    const button = event.target.closest('[data-music-ypl-delete]');
    if (!button) return;
    const playlist = _youtubePlaylists.find(item => item.id === button.dataset.musicYplDelete);
    if (!playlist || !confirm(`Remove the approved playlist "${playlist.name}"?`)) return;
    try {
      await musicPlaylistFetch(`/api/music/youtube-playlists/${playlist.id}`, { method: 'DELETE' });
      await refreshMusicYoutubePlaylists();
    } catch (error) { alert(error.message || 'Could not remove that playlist.'); }
  });

  document.getElementById('music-ypl-assignments').addEventListener('click', async event => {
    const button = event.target.closest('[data-music-ypl-assign]');
    if (!button) return;
    const studentId = studentSelect.value;
    const playlistId = button.dataset.id;
    try {
      if (button.dataset.musicYplAssign === 'add') {
        await musicPlaylistFetch(`/api/music/youtube-playlists/${playlistId}/assign`, {
          method: 'POST', body: JSON.stringify({ student_id: studentId })
        });
      } else {
        await musicPlaylistFetch(`/api/music/youtube-playlists/${playlistId}/assign/${studentId}`, { method: 'DELETE' });
      }
      await refreshMusicYoutubePlaylists();
    } catch (error) { alert(error.message || 'Could not change playlist access.'); }
  });
}

async function refreshMusicYoutubePlaylists() {
  try {
    [_youtubePlaylists, _youtubePlaylistAssignments] = await Promise.all([
      musicPlaylistFetch('/api/music/youtube-playlists'),
      musicPlaylistFetch('/api/music/youtube-playlist-assignments')
    ]);
  } catch (error) {
    _youtubePlaylists = [];
    _youtubePlaylistAssignments = {};
  }
  renderMusicYoutubePlaylists();
  renderMusicYoutubePlaylistAssignments();
}

function renderMusicYoutubePlaylists() {
  const list = document.getElementById('music-ypl-list');
  if (!_youtubePlaylists.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No approved music playlists yet.</p>';
    return;
  }
  list.innerHTML = _youtubePlaylists.map(playlist => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,.03);border:1px solid ${playlist.is_global ? 'rgba(139,92,246,.35)' : 'rgba(255,255,255,.08)'};border-radius:10px;">
      <img src="${musicEscape(playlist.thumbnail_url || '')}" alt="" style="width:72px;height:48px;object-fit:cover;border-radius:7px;background:rgba(255,255,255,.05);">
      <div style="flex:1;min-width:0;"><div style="font-weight:700;">${musicEscape(playlist.name)}</div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:3px;">${musicEscape(playlist.playlist_id)}</div></div>
      <label style="font-size:12px;color:#a78bfa;white-space:nowrap;"><input type="checkbox" data-music-ypl-global="${playlist.id}" ${playlist.is_global ? 'checked' : ''}> All Students</label>
      <a href="https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.playlist_id)}" target="_blank" rel="noopener" style="font-size:12px;color:#a78bfa;text-decoration:none;">Preview</a>
      <button class="btn btn-secondary" data-music-ypl-delete="${playlist.id}" style="font-size:11px;padding:4px 8px;color:#f87171;">Delete</button>
    </div>`).join('');
}

function renderMusicYoutubePlaylistAssignments() {
  const container = document.getElementById('music-ypl-assignments');
  const studentId = document.getElementById('music-ypl-student').value;
  const personal = _youtubePlaylists.filter(playlist => !playlist.is_global);
  const assigned = new Set(_youtubePlaylistAssignments[studentId] || []);
  if (!personal.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">All approved playlists are currently global.</p>';
    return;
  }
  container.innerHTML = personal.map(playlist => {
    const hasAccess = assigned.has(playlist.id);
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:9px;">
      <span style="font-size:20px;">🎵</span><div style="flex:1;font-size:13px;font-weight:600;">${musicEscape(playlist.name)}</div>
      <button class="btn btn-secondary" data-music-ypl-assign="${hasAccess ? 'remove' : 'add'}" data-id="${playlist.id}" style="font-size:11px;padding:4px 9px;">${hasAccess ? 'Remove' : 'Add'}</button>
    </div>`;
  }).join('');
}

// ── Playlists Tab ─────────────────────────────────────
function populateMusicStudents(select) {
  const selected = select.value;
  select.replaceChildren(..._allStudents.map(student => new Option(student.name, student.id)));
  if (_allStudents.some(student => student.id === selected)) select.value = selected;
  if (!_allStudents.length) select.add(new Option('No children available', ''));
}

function playlistNotice(message, retry = false) {
  for (const id of ['playlist-assigned-list', 'playlist-available-list']) {
    const list = document.getElementById(id);
    list.replaceChildren();
    const text = document.createElement('p'); text.textContent = message; text.setAttribute('role', 'status'); list.append(text);
    if (retry) {
      const button = document.createElement('button'); button.className = 'btn btn-secondary'; button.textContent = 'Try again';
      button.addEventListener('click', refreshPlaylistsTab); list.append(button);
    }
  }
}

async function refreshPlaylistsTab() {
  if (_playlistLoading || _musicBatchBusy) return;
  _playlistLoading = true;
  const sel = document.getElementById('playlist-student-sel');
  const addAllBtn = document.getElementById('playlist-add-all-btn');
  const quickAddTrigger = document.getElementById('playlist-quick-add-btn');
  sel.disabled = addAllBtn.disabled = quickAddTrigger.disabled = true;
  playlistNotice('Loading children and playlists…');
  try {
    await initMusicAdmin();
    if (!_allStudents.length) await loadStudents();
    populateMusicStudents(sel);
    const assignments = await mget('/api/music/assignments');
    if (!assignments || Array.isArray(assignments) || typeof assignments !== 'object' || assignments.error) throw Error('Could not load playlists.');
    _assignments = assignments;
    if (!_playlistWired) {
      _playlistWired = true;
      sel.addEventListener('change', () => {
        document.getElementById('quick-add-card').style.display = 'none';
        if (_musicBatch?.mode === 'child') { _musicBatch = null; renderMusicBatch(); }
        loadPlaylistAssignView();
      });
      addAllBtn.addEventListener('click', async () => {
        const sid = sel.value;
        if (!sid) return;
        const assigned = new Set(_assignments[sid] || []);
        const tracks = _allTracks.filter(t => t.screened && t.active !== 0 && !assigned.has(t.id));
        addAllBtn.disabled = sel.disabled = true;
        let failed = 0;
        try {
          for (const track of tracks) {
            try { await mpost('/api/music/assign', { student_id: sid, track_id: track.id }); rememberMusicAssignment(sid, track.id); }
            catch { failed++; }
          }
          window.showToast?.(failed ? (tracks.length - failed) + ' songs added; ' + failed + ' could not be added. Try again to finish.' : 'Screened songs added.', !!failed);
        } finally { sel.disabled = false; loadPlaylistAssignView(); }
      });
      quickAddTrigger.textContent = '+ Add songs directly';
      quickAddTrigger.addEventListener('click', () => {
        const student = _allStudents.find(item => item.id === sel.value);
        if (!student) return;
        document.getElementById('quick-add-child-name').textContent = student.name;
        document.getElementById('quick-add-card').style.display = 'block';
        document.getElementById('quick-add-fields').style.display = 'none';
        document.getElementById('quick-add-yt-url').focus();
      });
      document.getElementById('quick-add-close').addEventListener('click', () => {
        if (_musicBatchBusy) return;
        document.getElementById('quick-add-card').style.display = 'none';
        _musicBatch = null; renderMusicBatch();
      });
      document.getElementById('quick-add-lookup').addEventListener('click', () => {
        try { return prepareMusicBatch('child', parseMusicLinks(document.getElementById('quick-add-yt-url').value)); }
        catch (error) { window.showToast?.(error.message, true); }
      });
    }
    loadPlaylistAssignView();
  } catch (error) { playlistNotice(error.message || 'Could not load playlists.', true); }
  finally {
    _playlistLoading = false;
    sel.disabled = !_allStudents.length;
    quickAddTrigger.disabled = !_allStudents.length;
    addAllBtn.disabled = !_allStudents.length || !document.querySelector('#playlist-available-list [data-music-track]');
  }
}

function rememberMusicAssignment(studentId, trackId) {
  if (!_assignments[studentId]) _assignments[studentId] = [];
  if (!_assignments[studentId].includes(trackId)) _assignments[studentId].push(trackId);
}

function loadPlaylistAssignView() {
  const sel = document.getElementById('playlist-student-sel');
  const sid = sel.value;
  const assignedList = document.getElementById('playlist-assigned-list');
  const availableList = document.getElementById('playlist-available-list');
  const currentTitle = document.getElementById('playlist-current-title');
  const availableCount = document.getElementById('playlist-available-count');

  const student = _allStudents.find(s => s.id === sid);
  if (!student) { playlistNotice('Add a child to your family to create their music playlist.'); return; }
  const studentName = musicEscape(student.name);

  const assignedIds = new Set(_assignments[sid] || []);
  const screened = _allTracks.filter(t => t.screened && t.active !== 0);

  const assignedTracks = screened.filter(t => assignedIds.has(t.id));
  const availableTracks = screened.filter(t => !assignedIds.has(t.id));

  if (currentTitle) currentTitle.textContent = `${student.name}'s Playlist (${assignedTracks.length} song${assignedTracks.length !== 1 ? 's' : ''})`;
  if (availableCount) availableCount.textContent = `${availableTracks.length} available`;

  document.getElementById('playlist-add-all-btn').disabled = !availableTracks.length;
  // 1. Render Left Column: Assigned Songs
  if (!assignedTracks.length) {
    assignedList.innerHTML = `
      <div style="text-align:center; padding:30px 14px; color:var(--text-muted); font-size:13px; border:1px dashed rgba(255,255,255,0.08); border-radius:10px;">
        <div style="margin-bottom:8px; display:flex; justify-content:center; color:var(--text-muted); opacity:0.6;"><i data-lucide="music-4" style="width:24px;height:24px;"></i></div>
        No songs in ${studentName}'s playlist yet.<br>Click <strong>+ Add to Playlist</strong> on the right!
      </div>`;
  } else {
    assignedList.innerHTML = assignedTracks.map((t, idx) => {
      const thumb = t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/mqdefault.jpg`;
      return `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.2); border-radius:10px;">
        <span style="font-size:12px; color:var(--text-muted); width:18px; text-align:center;">${idx + 1}</span>
        <img src="${musicEscape(thumb)}" style="width:48px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" alt="">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#f1f5f9;">${musicEscape(t.title)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${musicEscape(t.artist || '—')}</div>
        </div>
        <button onclick="toggleAssign('${sid}','${t.id}',true,this)" style="display:flex;align-items:center;padding:5px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171;">
          <i data-lucide="x" style="width:12px;height:12px;margin-right:4px;"></i> Remove
        </button>
      </div>`;
    }).join('');
  }

  // 2. Render Right Column: Available Library Songs
  if (!availableTracks.length) {
    availableList.innerHTML = `
      <div style="text-align:center; padding:30px 14px; color:var(--text-muted); font-size:13px; border:1px dashed rgba(255,255,255,0.08); border-radius:10px;">
        <div style="margin-bottom:8px; display:flex; justify-content:center; color:var(--text-muted); opacity:0.6;"><i data-lucide="party-popper" style="width:24px;height:24px;"></i></div>
        ${screened.length ? 'All screened songs are already in ' + studentName + '\'s playlist!' : 'No screened songs yet. Add songs directly or approve songs in the Library.'}
      </div>`;
  } else {
    availableList.innerHTML = availableTracks.map(t => {
      const thumb = t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/mqdefault.jpg`;
      return `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px;">
        <img src="${musicEscape(thumb)}" style="width:48px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" alt="">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#f1f5f9;">${musicEscape(t.title)}</div>
          <div style="font-size:11px; color:var(--text-muted);">${musicEscape(t.artist || '—')}</div>
        </div>
        <button data-music-track="${musicEscape(t.id)}" onclick="toggleAssign('${sid}','${t.id}',false,this)" style="display:flex;align-items:center;padding:5px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); color:#34d399;">
          <i data-lucide="plus" style="width:12px;height:12px;margin-right:4px;"></i> Add to Playlist
        </button>
      </div>`;
    }).join('');
  }

  if (window.lucide) { setTimeout(() => window.lucide.createIcons(), 0); }
}

window.toggleAssign = async function(studentId, trackId, isAssigned, btn) {
  btn.disabled = true;
  try {
    if (isAssigned) {
      await mdel(`/api/music/assign/${studentId}/${trackId}`);
      if (_assignments[studentId]) _assignments[studentId] = _assignments[studentId].filter(id => id !== trackId);
    } else {
      await mpost('/api/music/assign', { student_id: studentId, track_id: trackId });
      if (!_assignments[studentId]) _assignments[studentId] = [];
      _assignments[studentId].push(trackId);
    }
    loadPlaylistAssignView();
  } catch(e) { btn.disabled = false; window.showToast?.(e.message || 'Could not update this playlist. Try again.', true); }
};

// ── Per-Student Settings Tab ─────────────────────────
async function refreshSettingsTab() {
  await initMusicAdmin();
  const sel = document.getElementById('msett-student-sel');
  if (!sel.options.length) {
    _allStudents.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      const avatarTxt = '👤';
      o.textContent = `${avatarTxt} ${s.name}`;
      sel.appendChild(o);
    });
    sel.addEventListener('change', loadStudentMusicSettings);
    document.getElementById('msett-save-btn').addEventListener('click', saveStudentMusicSettings);
  }
  loadStudentMusicSettings();
}

async function loadStudentMusicSettings() {
  const sid = document.getElementById('msett-student-sel').value;
  if (!sid) return;
  try {
    const s = await mget(`/api/music/student-settings/${sid}`);
    document.getElementById('msett-max-min').value         = s.max_daily_minutes ?? MUSIC_DEFAULT_MINUTES;
    document.getElementById('msett-max-vol').value         = s.max_volume        ?? 100;
    document.getElementById('msett-req-completion').checked = !!s.require_completion;
  } catch(e) {}
}

async function saveStudentMusicSettings() {
  const sid = document.getElementById('msett-student-sel').value;
  if (!sid) return;
  const btn = document.getElementById('msett-save-btn');
  btn.disabled = true;
  try {
    await mpost(`/api/music/student-settings/${sid}`, {
      max_daily_minutes: parseInt(document.getElementById('msett-max-min').value),
      max_volume:        parseInt(document.getElementById('msett-max-vol').value),
      require_completion: document.getElementById('msett-req-completion').checked
    }, 'PUT');
    const s = document.getElementById('msett-saved');
    s.style.display = 'inline';
    setTimeout(() => s.style.display = 'none', 2200);
  } catch(e) { alert('Failed to save.'); }
  btn.disabled = false;
}

// ── Song Requests Tab ────────────────────────────────
async function loadMusicRequests() { return window.loadCloudSongRequests?.(); }
async function loadMusicRequestsBadge() { return window.refreshMusicRequestsCount?.(); }

// ── Music Listening History ─────────────────────────
async function refreshMusicHistory() {
  await initMusicAdmin();
  const sel = document.getElementById('mhist-student-sel');
  const curVal = sel.value;
  sel.innerHTML = '';
  _allStudents.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = `${'👤'} ${s.name}`;
    sel.appendChild(o);
  });
  if (curVal && sel.querySelector(`option[value="${curVal}"]`)) sel.value = curVal;
  if (!sel.dataset.wired) {
    sel.dataset.wired = 'true';
    sel.addEventListener('change', loadMusicHistoryTable);
  }
  loadMusicHistoryTable();
}

async function loadMusicHistoryTable() {
  const sid  = document.getElementById('mhist-student-sel').value;
  const wrap = document.getElementById('mhist-table');
  if (!sid) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Loading…</p>';
  try {
    const data = await mget(`/api/music/listen/${sid}/history`);
    if (!data.length) {
      wrap.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No listening sessions recorded yet.</p>';
      return;
    }
    const total = data.reduce((s, r) => s + r.listened_seconds, 0);
    wrap.innerHTML = `
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Total last 30 days: <strong style="color:var(--text);">${Math.round(total/60)} minutes</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="color:var(--text-muted);border-bottom:1px solid rgba(255,255,255,0.08);">
          <th style="text-align:left;padding:6px 10px;">Date</th>
          <th style="text-align:right;padding:6px 10px;">Minutes</th>
          <th style="padding:6px 10px;min-width:120px;"></th>
        </tr></thead>
        <tbody>
          ${data.map(r => {
            const mins = Math.round(r.listened_seconds / 60);
            const barW = Math.min(100, Math.round((r.listened_seconds / 5400) * 100));
            return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:8px 10px;">${r.date}</td>
              <td style="padding:8px 10px;text-align:right;font-weight:600;">${mins}</td>
              <td style="padding:8px 10px;">
                <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;">
                  <div style="height:100%;width:${barW}%;background:linear-gradient(90deg,var(--accent-purple),var(--accent-green));border-radius:3px;"></div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) { wrap.innerHTML = '<p style="color:var(--text-muted);">Failed to load.</p>'; }
}

// Bulk imports share the existing parent-only track and assignment routes.
// A review captures its audience once; retries never move songs to another child.
function parseMusicLinks(value) {
  const text = String(value || '').replace(/\[[^\]\r\n]*\]\(([^\s)]+)\)/g, '$1');
  if (text.length > 20000) throw Error('Paste up to 50 music links at a time.');
  const tokens = text.split(/[\s,;]+/).filter(token => token && !/^(?:[-*•]|\d+[.)])$/.test(token))
    .map(token => token.replace(/^[<"']+|[>"'.)]+$/g, ''));
  const ids = [], invalid = [], seen = new Set();
  let duplicates = 0;
  for (const token of tokens) {
    let id = /^[A-Za-z0-9_-]{11}$/.test(token) ? token : '';
    if (!id) try {
      const url = new URL(/^https?:\/\//i.test(token) ? token : 'https://' + token);
      if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.port) {
        if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
        else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
          id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
        }
      }
    } catch { /* The invalid entry stays visible for correction. */ }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) invalid.push(token);
    else if (seen.has(id)) duplicates++;
    else { seen.add(id); ids.push(id); }
  }
  if (ids.length > 50) throw Error('Paste up to 50 different songs at a time. Nothing has been added.');
  return { ids, invalid, duplicates };
}

function wireMusicBulkImport() {
  const style = document.createElement('style');
  style.textContent = `
    #tab-music textarea.music-links {min-height:86px;resize:vertical;width:100%;min-width:0;box-sizing:border-box;font:inherit;padding:12px}
    .music-batch {margin-top:18px;padding:18px;border:1px solid #615287;border-radius:12px;background:var(--bg-card,#171726);min-width:0}
    .music-batch[hidden] {display:none}
    .music-batch h4 {margin:0 0 8px}.music-batch p {line-height:1.5}
    .music-batch label {display:flex;gap:7px;flex-direction:column;min-width:0}
    .music-batch select,.music-batch input {width:100%;min-width:0;box-sizing:border-box;padding:10px;color:var(--text,#fff);background:var(--bg-input,#111123);border:1px solid #615287;border-radius:8px;font:inherit}
    .music-batch-list {list-style:none;margin:14px 0;padding:0;display:grid;gap:10px;max-height:440px;overflow:auto}
    .music-batch-list li {padding:12px;border:1px solid #514568;border-radius:10px;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:10px}
    .music-batch-list .music-batch-status {grid-column:1/-1;overflow-wrap:anywhere;font-size:13px}
    .music-batch-list a {color:#b5a3ff}.music-batch-actions {display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
    .music-batch-invalid {overflow-wrap:anywhere;color:#fbbf24}
    #tab-music .music-links-row {flex-wrap:wrap;align-items:flex-start!important}
    @media(max-width:600px){.music-batch{padding:12px}.music-batch-list li{grid-template-columns:minmax(0,1fr)}.music-batch-actions button{width:100%}}
  `;
  document.head.append(style);
  for (const [id, buttonId, mode] of [['music-yt-url', 'music-lookup-btn', 'library'], ['quick-add-yt-url', 'quick-add-lookup', 'child']]) {
    const old = document.getElementById(id);
    const input = document.createElement('textarea');
    input.id = id; input.className = old.className + ' music-links'; input.value = old.value;
    input.placeholder = 'Paste YouTube links or video IDs, one per line (up to 50)';
    input.setAttribute('aria-label', mode === 'child' ? 'Songs for this child' : 'Music links or video IDs');
    old.replaceWith(input); input.parentElement.classList.add('music-links-row');
    const help = document.createElement('p'); help.className = 'settings-hint'; help.textContent = 'Paste a list, review the songs, then approve them together. Ctrl+Enter reviews your links.';
    input.parentElement.after(help);
    const panel = document.createElement('section'); panel.className = 'music-batch'; panel.id = 'music-batch-' + mode; panel.hidden = true;
    panel.setAttribute('aria-label', 'Review music import'); help.after(panel);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); document.getElementById(buttonId).click(); }
    });
    document.getElementById(buttonId).textContent = 'Review links';
  }
}

function setMusicBatchBusy(value) {
  _musicBatchBusy = value;
  for (const id of ['music-yt-url', 'music-lookup-btn', 'quick-add-yt-url', 'quick-add-lookup', 'quick-add-close', 'playlist-student-sel', 'playlist-quick-add-btn', 'playlist-add-all-btn']) {
    const node = document.getElementById(id); if (node) node.disabled = value;
  }
  if (!value) {
    const sid = document.getElementById('playlist-student-sel').value;
    const validChild = _allStudents.some(student => student.id === sid);
    document.getElementById('playlist-student-sel').disabled = !_allStudents.length;
    document.getElementById('playlist-quick-add-btn').disabled = !validChild;
    document.getElementById('playlist-add-all-btn').disabled = !validChild || !_allTracks.some(track => track.screened && track.active !== 0 && !(_assignments[sid] || []).includes(track.id));
  }
  // Prevent switching tabs/children midway through a saved audience.
  document.querySelectorAll('#tab-music [data-stab]').forEach(button => { button.disabled = value; });
}

async function prepareMusicBatch(mode, parsed) {
  if (_musicBatchBusy) return;
  if (!parsed.ids.length && !parsed.invalid.length) return window.showToast?.('Paste a YouTube link or video ID first.', true);
  _musicBatch = null; renderMusicBatch();
  setMusicBatchBusy(true);
  const button = document.getElementById(mode === 'child' ? 'quick-add-lookup' : 'music-lookup-btn');
  button.textContent = 'Reviewing…';
  try {
    await initMusicAdmin();
    const student = mode === 'child' ? _allStudents.find(item => item.id === document.getElementById('playlist-student-sel').value) : null;
    if (mode === 'child' && !student) throw Error('Choose a child first.');
    const tracks = await mget('/api/music/tracks');
    if (!Array.isArray(tracks)) throw Error('Could not load the music library. Try again.');
    _allTracks = tracks;
    const assignments = await mget('/api/music/assignments');
    if (!assignments || Array.isArray(assignments) || typeof assignments !== 'object' || assignments.error) throw Error('Could not load playlists. Try again.');
    _assignments = assignments;
    const entries = new Array(parsed.ids.length); let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, entries.length) }, async () => {
      while (next < entries.length) {
        const index = next++, id = parsed.ids[index], existing = tracks.find(track => track.youtube_id === id);
        let info = null;
        if (!existing) try { info = await musicPlaylistFetch('/api/music/lookup?youtube_id=' + id, { signal: AbortSignal.timeout(8000) }); } catch { /* Manual title entry remains available. */ }
        entries[index] = { youtube_id: id, title: existing?.title || info?.title || '', artist: existing?.artist || info?.author_name || '',
          trackId: existing?.id || '', approved: !!existing?.screened && existing?.active !== 0, state: 'ready', error: '', existing: !!existing, metadataHidden: !existing && !info };
      }
    }));
    _musicBatch = { mode, entries, invalid: parsed.invalid, duplicates: parsed.duplicates,
      audience: student?.id || 'library', audienceName: student?.name || 'Library only', targets: null, saving: false, finished: false };
    document.getElementById('music-preview').style.display = 'none';
    document.getElementById('quick-add-fields').style.display = 'none';
  } catch (error) { window.showToast?.(error.message || 'Could not review these links. Try again.', true); }
  finally { setMusicBatchBusy(false); button.textContent = 'Review links'; renderMusicBatch(); }
}

function renderMusicBatch() {
  for (const mode of ['library', 'child']) {
    const panel = document.getElementById('music-batch-' + mode); if (!panel) continue;
    panel.hidden = !_musicBatch || _musicBatch.mode !== mode;
    if (panel.hidden) { panel.replaceChildren(); continue; }
    const batch = _musicBatch, done = batch.entries.filter(item => item.state === 'added').length;
    const pending = batch.entries.length - done;
    panel.innerHTML = '<h4>' + (batch.finished ? 'Music import results' : 'Review your songs') + '</h4>' +
      '<p role="status" aria-live="polite">' + (batch.finished ? done + ' songs ready · ' + pending + ' remaining' : batch.entries.length + ' songs to review') + ' · ' + batch.duplicates + ' duplicate links skipped</p>' +
      (mode === 'library' ? '<label>Add approved songs to<select id="music-batch-audience"' + (batch.targets || batch.saving ? ' disabled' : '') + '><option value="library">Library only</option><option value="all">Every child’s playlist</option>' + _allStudents.map(student => '<option value="' + musicEscape(student.id) + '">' + musicEscape(student.name) + '’s playlist</option>').join('') + '</select></label>' : '<p><strong>For ' + musicEscape(batch.audienceName) + '’s playlist</strong></p>') +
      '<p>Preview the songs and check their titles. Approving marks them as screened. Existing songs are reused; only the selected playlists change.</p>' +
      '<ol class="music-batch-list">' + batch.entries.map((item, index) => '<li><label>Song title<input data-music-title="' + index + '" maxlength="180" value="' + musicEscape(item.title) + '"' + (batch.saving || item.state === 'added' ? ' disabled' : '') + '></label><label>Artist<input data-music-artist="' + index + '" maxlength="180" value="' + musicEscape(item.artist) + '"' + (batch.saving || item.state === 'added' ? ' disabled' : '') + '></label><div class="music-batch-status"><a href="https://www.youtube.com/watch?v=' + item.youtube_id + '" target="_blank" rel="noopener">Preview song</a> · ' + musicEscape(item.error || (item.state === 'added' ? 'Ready in your selected destination' : item.state === 'saving' ? 'Saving…' : item.metadataHidden ? 'Title unavailable — enter a title before approval' : item.existing ? 'Already in the library' : 'Ready for review')) + '</div></li>').join('') + '</ol>' +
      (batch.invalid.length ? '<div class="music-batch-invalid">These entries need correction:<ul>' + batch.invalid.map(value => '<li>' + musicEscape(value) + '</li>').join('') + '</ul>They will stay in the paste box.</div>' : '') +
      '<div class="music-batch-actions"><button class="btn btn-secondary" id="music-batch-close" type="button">' + (batch.saving ? 'Stop after this song' : batch.finished ? 'Done' : 'Cancel') + '</button>' +
      (pending ? '<button class="btn btn-primary" id="music-batch-save" type="button"' + (batch.saving ? ' disabled' : '') + '>' + (batch.saving ? 'Saving…' : batch.finished ? 'Retry remaining songs' : 'Approve & add ' + pending + ' songs') + '</button>' : '') + '</div>';
    const audience = panel.querySelector('#music-batch-audience');
    if (audience) { audience.value = batch.audience; audience.addEventListener('change', () => { batch.audience = audience.value; }); }
    for (const field of ['title', 'artist']) panel.querySelectorAll('[data-music-' + field + ']').forEach(input => input.addEventListener('input', () => { batch.entries[Number(input.dataset[field === 'title' ? 'musicTitle' : 'musicArtist'])][field] = input.value; }));
    panel.querySelector('#music-batch-close').addEventListener('click', event => {
      if (batch.saving) { batch.stop = true; event.target.disabled = true; event.target.textContent = 'Finishing current song…'; }
      else { _musicBatch = null; renderMusicBatch(); }
    });
    panel.querySelector('#music-batch-save')?.addEventListener('click', saveMusicBatch);
  }
}

async function saveMusicBatch() {
  const batch = _musicBatch;
  if (!batch || _musicBatchBusy) return;
  if (batch.entries.some(item => item.state !== 'added' && !item.title.trim())) return window.showToast?.('Enter a title for each song before approving.', true);
  if (!batch.targets) {
    batch.targets = batch.audience === 'library' ? [] : batch.audience === 'all' ? _allStudents.map(student => student.id) : [batch.audience];
    if (batch.audience !== 'library' && (!batch.targets.length || batch.targets.some(id => !_allStudents.some(student => student.id === id)))) { batch.targets = null; return window.showToast?.('Choose an available child first.', true); }
  }
  setMusicBatchBusy(true); batch.saving = true; batch.stop = false;
  try {
    for (const item of batch.entries) {
      if (batch.stop) break;
      if (item.state === 'added') continue;
      item.state = 'saving'; item.error = ''; renderMusicBatch();
      try {
        if (!item.approved) {
          const result = await mpost('/api/music/tracks', { youtube_id: item.youtube_id, title: item.title.trim(), artist: item.artist.trim(), screened: true });
          if (!result.id || result.success === false) throw Error('No confirmation received. Retry this song.');
          item.trackId = result.id; item.approved = true;
        }
        // Parent edits to existing metadata use the same verified track identity.
        const old = _allTracks.find(track => track.id === item.trackId);
        if (old && (old.title !== item.title.trim() || (old.artist || '') !== item.artist.trim())) {
          await mpost('/api/music/tracks/' + encodeURIComponent(item.trackId), { title: item.title.trim(), artist: item.artist.trim() }, 'PATCH');
          old.title = item.title.trim(); old.artist = item.artist.trim();
        }
        for (const studentId of batch.targets) {
          if ((_assignments[studentId] || []).includes(item.trackId)) continue;
          await mpost('/api/music/assign', { student_id: studentId, track_id: item.trackId });
          rememberMusicAssignment(studentId, item.trackId);
        }
        item.state = 'added';
      } catch (error) {
        item.state = 'failed'; item.error = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'No confirmation received. Retry safely to finish this song.' : error.message;
      }
    }
    batch.finished = true;
    document.getElementById(batch.mode === 'child' ? 'quick-add-yt-url' : 'music-yt-url').value = [...batch.entries.filter(item => item.state !== 'added').map(item => item.youtube_id), ...batch.invalid].join('\n');
    await loadMusicTracks();
    if (document.getElementById('playlist-student-sel').value) loadPlaylistAssignView();
  } catch (error) { window.showToast?.('Songs were saved, but the library could not refresh. Open the tab again to refresh.', true); }
  finally { batch.saving = false; setMusicBatchBusy(false); renderMusicBatch(); }
}

export { initMusicAdmin };
