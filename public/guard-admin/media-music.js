import { mediaFetch as fetch } from './cloud-media-transport.js';
let _musicInited = false;
let _allTracks   = [];
let _allStudents = [];
let _assignments = {}; // { student_id: [track_id,...] }
let _youtubePlaylists = [];
let _youtubePlaylistAssignments = {};
const MUSIC_DEFAULT_MINUTES = window.BODEE_MEDIA_DEFAULTS.music.dailyMinutes;

// ── Helpers ──────────────────────────────────────────
const mget = (url) => fetch(url, { headers: { 'x-kiosk-key': window._adminApiKey || '' } }).then(r => r.json());
const mpost = async (url, body, method = 'POST') => {
  const response = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json', 'x-kiosk-key': window._adminApiKey || '' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};
const mdel = (url) => fetch(url, { method: 'DELETE', headers: { 'x-kiosk-key': window._adminApiKey || '' } });

function extractYouTubeId(input) {
  input = (input || '').trim();
  const m = input.match(/(?:v=|youtu\.be\/|embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  return null;
}

function musicEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function musicPlaylistFetch(url, options = {}) {
  const response = await fetch(url, {
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

  if (btn.dataset.stab === 'mplay')  refreshPlaylistsTab();
  if (btn.dataset.stab === 'mytplay') refreshMusicYoutubePlaylists();
  if (btn.dataset.stab === 'msett')  refreshSettingsTab();
  if (btn.dataset.stab === 'mreq')   loadMusicRequests();
  if (btn.dataset.stab === 'mhist')  refreshMusicHistory();
});

// ── Init ─────────────────────────────────────────────
async function initMusicAdmin() {
  if (_musicInited) return;
  _musicInited = true;

  // Add active-stab style
  const style = document.createElement('style');
  style.textContent = '.active-stab { background: rgba(139,92,246,0.2) !important; border-color: rgba(139,92,246,0.5) !important; color: #a78bfa !important; }';
  document.head.appendChild(style);

  await Promise.all([
    loadMusicSettings(),
    loadMusicTracks(),
    loadStudents()
  ]);
  loadMusicRequestsBadge();
  wireLibraryButtons();
  wireMusicYoutubePlaylistButtons();
}

async function loadStudents() {
  try {
    _allStudents = await mget('/api/students');
  } catch(e) { _allStudents = []; }
}

// ── Library Tab ──────────────────────────────────────
function wireLibraryButtons() {
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
    const vid = extractYouTubeId(document.getElementById('music-yt-url').value);
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
    btn.disabled = false; btn.textContent = '🔍 Look Up';
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
    if (!title) { alert('Please enter a song title.'); return; }
    const btn = document.getElementById('music-add-btn');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const r = await mpost('/api/music/tracks', {
        title, artist, youtube_id: vid,
        thumbnail_url: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`
      });
      if (screened && r.id) {
        await mpost(`/api/music/tracks/${r.id}`, { screened: true }, 'PATCH');
      }
      document.getElementById('music-preview').style.display = 'none';
      document.getElementById('music-yt-url').value = '';
      await loadMusicTracks();
      if (window.showToast) window.showToast(`✅ "${title}" added!`);
    } catch(e) { alert('Failed to add song.'); }
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
    _allTracks = await mget('/api/music/tracks');
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
        <img src="${thumb}" style="width:56px;height:42px;object-fit:cover;border-radius:6px;flex-shrink:0;" alt="">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title}</div>
          <div style="font-size:12px;color:var(--text-muted);">${t.artist||'—'}</div>
        </div>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:${t.screened?'#34d399':'#fbbf24'};flex-shrink:0;cursor:pointer;">
          <input type="checkbox" ${t.screened?'checked':''} onchange="toggleScreened('${t.id}',this)"
            style="width:13px;height:13px;cursor:pointer;">
          ${t.screened?'<i data-lucide="check-circle" style="width:14px;height:14px;margin-right:2px;"></i> Screened':'<i data-lucide="alert-triangle" style="width:14px;height:14px;margin-right:2px;"></i> Not screened'}
        </label>
        <a href="https://youtube.com/watch?v=${t.youtube_id}" target="_blank"
           style="display:flex;align-items:center;font-size:12px;color:var(--text-muted);text-decoration:none;flex-shrink:0;"><i data-lucide="play-circle" style="width:14px;height:14px;margin-right:4px;"></i> Preview</a>
        <button onclick="deleteMusicTrack('${t.id}','${t.title.replace(/'/g,"\\'")}',this)"
          style="display:flex;align-items:center;justify-content:center;padding:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);
            color:#f87171;border-radius:6px;cursor:pointer;flex-shrink:0;" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </div>`;
    }).join('');

    if (window.lucide) { setTimeout(() => window.lucide.createIcons(), 0); }
  } catch(e) { list.innerHTML = '<p style="color:var(--text-muted);">Failed to load.</p>'; }
}

window.toggleScreened = async function(id, cb) {
  await mpost(`/api/music/tracks/${id}`, { screened: cb.checked }, 'PATCH');
  await loadMusicTracks();
};

window.deleteMusicTrack = async function(id, title, btn) {
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
async function refreshPlaylistsTab() {
  const sel = document.getElementById('playlist-student-sel');
  // Populate students
  if (!sel.options.length) {
    _allStudents.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      const avatarTxt = getAvatarText(s.avatar, '👤');
      o.textContent = `${avatarTxt} ${s.name}`;
      sel.appendChild(o);
    });
    sel.addEventListener('change', loadPlaylistAssignView);

    // Add all screened songs button
    const addAllBtn = document.getElementById('playlist-add-all-btn');
    if (addAllBtn) {
      addAllBtn.addEventListener('click', async () => {
        const sid = sel.value;
        if (!sid) return;
        const screened = _allTracks.filter(t => t.screened);
        const assigned = new Set(_assignments[sid] || []);
        const unassigned = screened.filter(t => !assigned.has(t.id));
        if (!unassigned.length) return;

        addAllBtn.disabled = true;
        addAllBtn.textContent = '⏳ Adding…';
        for (const t of unassigned) {
          await mpost('/api/music/assign', { student_id: sid, track_id: t.id });
          if (!_assignments[sid]) _assignments[sid] = [];
          _assignments[sid].push(t.id);
        }
        addAllBtn.disabled = false;
        addAllBtn.textContent = '＋ Add All Screened';
        loadPlaylistAssignView();
      });
    }

    // Quick add song directly to child + master library
    const quickAddTrigger = document.getElementById('playlist-quick-add-btn');
    const quickAddCard = document.getElementById('quick-add-card');
    const quickAddClose = document.getElementById('quick-add-close');
    const quickAddLookup = document.getElementById('quick-add-lookup');
    const quickAddFields = document.getElementById('quick-add-fields');
    const quickAddSave = document.getElementById('quick-add-save-btn');

    if (quickAddTrigger) {
      quickAddTrigger.addEventListener('click', () => {
        const sid = sel.value;
        const student = _allStudents.find(s => s.id === sid);
        document.getElementById('quick-add-child-name').textContent = student ? student.name : 'Child';
        quickAddCard.style.display = 'block';
        document.getElementById('quick-add-yt-url').focus();
      });
    }

    if (quickAddClose) {
      quickAddClose.addEventListener('click', () => {
        quickAddCard.style.display = 'none';
        quickAddFields.style.display = 'none';
      });
    }

    if (quickAddLookup) {
      quickAddLookup.addEventListener('click', async () => {
        const urlVal = document.getElementById('quick-add-yt-url').value;
        const vid = extractYouTubeId(urlVal);
        if (!vid) { alert('Please paste a valid YouTube link or Video ID.'); return; }
        quickAddLookup.disabled = true; quickAddLookup.textContent = 'Looking up…';
        try {
          const o = await mget(`/api/music/lookup?youtube_id=${vid}`);
          if (o.error) throw new Error(o.error);
          document.getElementById('quick-add-vid').value = vid;
          document.getElementById('quick-add-title-input').value = o.title || '';
          document.getElementById('quick-add-artist-input').value = o.author_name || '';
        } catch(e) {
          document.getElementById('quick-add-vid').value = vid;
          document.getElementById('quick-add-title-input').value = '';
          document.getElementById('quick-add-artist-input').value = '';
        }
        document.getElementById('quick-add-preview-thumb').src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
        quickAddFields.style.display = 'block';
        quickAddLookup.disabled = false; quickAddLookup.textContent = '🔍 Look Up';
      });
    }

    if (quickAddSave) {
      quickAddSave.addEventListener('click', async () => {
        const sid = sel.value;
        const vid = document.getElementById('quick-add-vid').value;
        const title = document.getElementById('quick-add-title-input').value.trim();
        const artist = document.getElementById('quick-add-artist-input').value.trim();
        if (!title) { alert('Please enter a song title.'); return; }

        quickAddSave.disabled = true; quickAddSave.textContent = '⏳ Saving…';
        try {
          // 1. Add to Master Library
          const r = await mpost('/api/music/tracks', {
            title, artist, youtube_id: vid,
            thumbnail_url: `https://img.youtube.com/vi/${vid}/mqdefault.jpg`
          });

          const trackId = r.id;
          if (trackId) {
            // 2. Mark as Screened
            await mpost(`/api/music/tracks/${trackId}`, { screened: true }, 'PATCH');

            // 3. Assign to Child
            if (sid) {
              await mpost('/api/music/assign', { student_id: sid, track_id: trackId });
              if (!_assignments[sid]) _assignments[sid] = [];
              _assignments[sid].push(trackId);
            }
          }

          // 4. Refresh Library & Playlist View
          await loadMusicTracks();
          loadPlaylistAssignView();

          quickAddCard.style.display = 'none';
          quickAddFields.style.display = 'none';
          document.getElementById('quick-add-yt-url').value = '';

          const student = _allStudents.find(s => s.id === sid);
          if (window.showToast) window.showToast(`✅ "${title}" added to ${student ? student.name : 'Child'}'s playlist & Master Library!`);
        } catch(e) {
          alert('Failed to add song. Try again.');
        }
        quickAddSave.disabled = false; quickAddSave.textContent = '➕ Save & Assign to Playlist';
      });
    }
  }
  // Load assignments map
  try { _assignments = await mget('/api/music/assignments'); } catch(e){ _assignments={}; }
  if (!_allTracks.length) await loadMusicTracks();
  loadPlaylistAssignView();
}

function loadPlaylistAssignView() {
  const sel = document.getElementById('playlist-student-sel');
  const sid = sel.value;
  const assignedList = document.getElementById('playlist-assigned-list');
  const availableList = document.getElementById('playlist-available-list');
  const currentTitle = document.getElementById('playlist-current-title');
  const availableCount = document.getElementById('playlist-available-count');

  const student = _allStudents.find(s => s.id === sid);
  const studentName = student ? student.name : 'Child';

  const assignedIds = new Set(_assignments[sid] || []);
  const screened = _allTracks.filter(t => t.screened);

  const assignedTracks = screened.filter(t => assignedIds.has(t.id));
  const availableTracks = screened.filter(t => !assignedIds.has(t.id));

  if (currentTitle) currentTitle.textContent = `${studentName}'s Playlist (${assignedTracks.length} song${assignedTracks.length !== 1 ? 's' : ''})`;
  if (availableCount) availableCount.textContent = `${availableTracks.length} available`;

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
        <img src="${thumb}" style="width:48px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" alt="">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#f1f5f9;">${t.title}</div>
          <div style="font-size:11px; color:var(--text-muted);">${t.artist || '—'}</div>
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
        All screened songs are already in ${studentName}'s playlist!
      </div>`;
  } else {
    availableList.innerHTML = availableTracks.map(t => {
      const thumb = t.thumbnail_url || `https://img.youtube.com/vi/${t.youtube_id}/mqdefault.jpg`;
      return `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px;">
        <img src="${thumb}" style="width:48px; height:36px; object-fit:cover; border-radius:6px; flex-shrink:0;" alt="">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#f1f5f9;">${t.title}</div>
          <div style="font-size:11px; color:var(--text-muted);">${t.artist || '—'}</div>
        </div>
        <button onclick="toggleAssign('${sid}','${t.id}',false,this)" style="display:flex;align-items:center;padding:5px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; flex-shrink:0; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); color:#34d399;">
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
  } catch(e) { btn.disabled = false; }
};

// ── Per-Student Settings Tab ─────────────────────────
async function refreshSettingsTab() {
  const sel = document.getElementById('msett-student-sel');
  if (!sel.options.length) {
    _allStudents.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      const avatarTxt = getAvatarText(s.avatar, '👤');
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
async function loadMusicRequests() {
  const list = document.getElementById('mreq-list');
  list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">Loading…</p>';
  try {
    const requests = await mget('/api/music/requests');
    const badge = document.getElementById('mreq-badge');
    badge.textContent = requests.length || '';
    badge.style.display = requests.length ? 'inline' : 'none';

    if (!requests.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;display:flex;align-items:center;"><i data-lucide="party-popper" style="width:16px;height:16px;margin-right:6px;"></i> No pending song requests.</p>';
      if (window.lucide) setTimeout(() => window.lucide.createIcons(), 0);
      return;
    }
    list.innerHTML = requests.map(r => {
      const rawTime = r.timestamp || r.created_at || '';
      const when = rawTime ? new Date(rawTime + (rawTime.endsWith('Z') ? '' : 'Z')).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Just now';
      return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
        background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:12px;">
        <span>${renderAvatarBadge(r.student_avatar, 28, '🙋')}</span>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;">${r.student_name}</div>
          <div style="font-size:14px;margin-top:2px;">${r.details}</div>
          <div style="display:flex;align-items:center;font-size:11px;color:var(--text-muted);margin-top:3px;"><i data-lucide="calendar" style="width:12px;height:12px;margin-right:4px;"></i> ${when}</div>
        </div>
        <button onclick="dismissMusicRequest('${r.id}',this)"
          style="display:flex;align-items:center;padding:6px 14px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);
            color:#34d399;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;">
          <i data-lucide="check" style="width:12px;height:12px;margin-right:4px;"></i> Dismiss
        </button>
      </div>`;
    }).join('');
    if (window.lucide) { setTimeout(() => window.lucide.createIcons(), 0); }
  } catch(e) { list.innerHTML = '<p style="color:var(--text-muted);">Failed to load.</p>'; }
}

async function loadMusicRequestsBadge() {
  try {
    const requests = await mget('/api/music/requests');
    const badge = document.getElementById('mreq-badge');
    if (badge) {
      badge.textContent = requests.length || '';
      badge.style.display = requests.length ? 'inline' : 'none';
    }
  } catch(e) {}
}

window.dismissMusicRequest = async function(id, btn) {
  btn.disabled = true;
  await mpost(`/api/music/requests/${id}/resolve`, {}, 'PATCH');
  loadMusicRequests();
};

// ── Music Listening History ─────────────────────────
async function refreshMusicHistory() {
  const sel = document.getElementById('mhist-student-sel');
  const curVal = sel.value;
  sel.innerHTML = '';
  _allStudents.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id; o.textContent = `${getAvatarText(s.avatar, '👤')} ${s.name}`;
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

export { initMusicAdmin };
