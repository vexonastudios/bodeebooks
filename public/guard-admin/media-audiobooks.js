import { mediaFetch as fetch } from './cloud-media-transport.js';
const API = '/api';
const logger = console;

const AUDIOBOOK_API = `${API}/audiobooks`;
const AUDIOBOOK_DEFAULT_MINUTES = window.BODEE_MEDIA_DEFAULTS.audiobook.dailyMinutes;

let initialized = false;
let students = [];
let items = [];
let assignments = {};
let channels = [];
let channelAssignments = {};
let youtubePlaylists = [];
let youtubePlaylistAssignments = {};

function apiKey() { return window._adminApiKey || ''; }
function headers() { return { 'Content-Type': 'application/json', 'x-kiosk-key': apiKey() }; }
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
function extractYouTubeId(input) {
  const value = String(input || '').trim();
  const match = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null;
}
function extractYouTubeChannelId(input) {
  const value = String(input || '').trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(value)) return value;
  return value.match(/youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})/i)?.[1] || null;
}
function formatDuration(seconds) {
  const totalMinutes = Math.round((Number(seconds) || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}
async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function toast(message, isError = false) {
  window.showToast?.(message, isError);
}

function renderShell() {
  const root = document.getElementById('audiobook-admin-root');
  if (!root) return;
  root.innerHTML = `
    <div class="tab-header">
      <h1><i data-lucide="book-open" class="h1-icon"></i> Audiobooks</h1>
      <p style="color:var(--text-muted);font-size:14px;margin-top:4px;">Curate long-form audiobooks with their own listening allowance, separate from video and music time.</p>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">
      <button class="btn btn-secondary audiobook-stab active-stab" data-abtab="ab-library"><i data-lucide="library" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Library</button>
      <button class="btn btn-secondary audiobook-stab" data-abtab="ab-channels"><i data-lucide="radio-tower" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Channels</button>
      <button class="btn btn-secondary audiobook-stab" data-abtab="ab-youtube-playlists"><i data-lucide="list-video" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> YouTube Playlists</button>
      <button class="btn btn-secondary audiobook-stab" data-abtab="ab-playlists"><i data-lucide="list-video" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Student Shelves</button>
      <button class="btn btn-secondary audiobook-stab" data-abtab="ab-settings"><i data-lucide="settings" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Per-Student Settings</button>
      <button class="btn btn-secondary audiobook-stab" data-abtab="ab-history"><i data-lucide="bar-chart-2" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Listening History</button>
    </div>

    <div class="audiobook-stab-body" id="ab-library">
      <div class="settings-section" style="margin-bottom:24px;">
        <h3><i data-lucide="clock" class="h3-icon"></i> Global Audiobook Hours</h3>
        <p class="settings-hint">Audiobooks have their own schedule and do not use video or music minutes.</p>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:12px;">
          <div class="form-group" style="margin:0;"><label>From</label><input type="time" id="ab-start-time" class="admin-input" style="max-width:130px;"></div>
          <div class="form-group" style="margin:0;"><label>Until</label><input type="time" id="ab-end-time" class="admin-input" style="max-width:130px;"></div>
          <div style="display:flex;align-items:center;gap:8px;padding-top:18px;"><input type="checkbox" id="ab-enabled" style="width:15px;height:15px;cursor:pointer;"><label for="ab-enabled" style="cursor:pointer;font-size:14px;">Audiobooks enabled</label></div>
          <button class="btn btn-secondary" id="ab-save-global" style="margin-top:18px;">Save</button>
          <span id="ab-global-saved" style="display:none;font-size:13px;color:var(--accent-green);margin-top:18px;">Saved!</span>
        </div>
      </div>

      <div class="settings-section" style="margin-bottom:24px;">
        <h3><i data-lucide="plus-circle" class="h3-icon"></i> Add an Audiobook</h3>
        <p class="settings-hint">Paste the YouTube URL for a full audiobook or approved long-form reading.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <input type="text" id="ab-youtube-url" class="admin-input" placeholder="https://youtube.com/watch?v=... or video ID" style="flex:1;min-width:240px;">
          <button class="btn btn-primary" type="button" data-youtube-search-target="audiobook" data-youtube-search-type="video">Search YouTube</button>
          <button class="btn btn-secondary" id="ab-lookup"><i data-lucide="search" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Look Up</button>
        </div>
        <div id="ab-preview" style="display:none;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin-top:12px;">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <img id="ab-preview-thumb" src="" alt="" style="width:96px;height:72px;object-fit:cover;border-radius:8px;flex-shrink:0;">
            <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
              <input type="text" id="ab-title" class="admin-input" placeholder="Audiobook title">
              <input type="text" id="ab-author" class="admin-input" placeholder="Author / Narrator">
              <input type="hidden" id="ab-youtube-id">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);"><input type="checkbox" id="ab-screened" style="width:14px;height:14px;"> I previewed this audiobook and approve it</label>
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#fbbf24;"><input type="checkbox" id="ab-global" style="width:14px;height:14px;"> Add to every student's shelf</label>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;justify-content:flex-end;">
            <button class="btn btn-secondary" id="ab-cancel">Cancel</button>
            <button class="btn btn-primary" id="ab-add"><i data-lucide="plus" style="width:16px;height:16px;margin-right:4px;vertical-align:-3px;"></i> Add to Library</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3><i data-lucide="library" class="h3-icon"></i> Audiobook Library</h3>
        <p class="settings-hint" id="ab-count">Loading...</p>
        <p class="settings-hint" style="color:#fbbf24;margin-top:6px;">Unscreened items stay hidden from every student until approved.</p>
        <div id="ab-library-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <div class="audiobook-stab-body" id="ab-channels" style="display:none;">
      <div class="settings-section" style="margin-bottom:24px;">
        <h3><i data-lucide="radio-tower" class="h3-icon"></i> Add an Audiobook Channel</h3>
        <p class="settings-hint">Add a curated YouTube audiobook or read-aloud channel. Its recent uploads appear together on the children's Audiobook shelf.</p>
        <div style="display:grid;grid-template-columns:minmax(180px,0.8fr) minmax(280px,1.5fr);gap:12px;margin-top:14px;">
          <div class="form-group" style="margin:0;"><label>Channel Name</label><input type="text" id="ab-channel-name" class="admin-input" placeholder="e.g. Classic Read Alouds"></div>
          <div class="form-group" style="margin:0;"><label>YouTube Channel ID or URL</label><div style="display:flex;gap:8px;flex-wrap:wrap;"><input type="text" id="ab-channel-id" class="admin-input" placeholder="UC... or youtube.com/@handle" style="flex:1;min-width:220px;"><button type="button" class="btn btn-primary" data-youtube-search-target="audiobook-channel" data-youtube-search-type="channel">Search YouTube</button><button class="btn btn-secondary" id="ab-channel-resolve">Extract ID</button></div></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:#fbbf24;"><input type="checkbox" id="ab-channel-global" checked style="width:14px;height:14px;"> Visible to every student</label>
        <button class="btn btn-primary" id="ab-channel-add" style="margin-top:14px;"><i data-lucide="plus" style="width:16px;height:16px;margin-right:4px;vertical-align:-3px;"></i> Add Channel</button>
      </div>
      <div class="settings-section">
        <h3><i data-lucide="list" class="h3-icon"></i> Approved Audiobook Channels</h3>
        <p class="settings-hint">Global channels appear for every student. Personal channels can be assigned from Student Shelves.</p>
        <div id="ab-channel-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <div class="audiobook-stab-body" id="ab-youtube-playlists" style="display:none;">
      <div class="settings-section" style="margin-bottom:24px;">
        <h3><i data-lucide="list-video" class="h3-icon"></i> Add an Audiobook Playlist</h3>
        <p class="settings-hint">Paste a complete YouTube playlist of audiobooks or read-alouds. New items added on YouTube stay synchronized here.</p>
        <div style="display:grid;grid-template-columns:minmax(180px,.7fr) minmax(300px,1.4fr);gap:12px;margin-top:14px;">
          <div class="form-group" style="margin:0;"><label>Display Name</label><input id="ab-ypl-name" class="admin-input" placeholder="e.g. Classic Adventures"></div>
          <div class="form-group" style="margin:0;"><label>YouTube Playlist URL</label><input id="ab-ypl-url" class="admin-input" placeholder="https://youtube.com/playlist?list=PL..."></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:#fbbf24;"><input type="checkbox" id="ab-ypl-global" checked> Visible to every student</label>
        <button class="btn btn-secondary" type="button" data-youtube-search-target="audiobook-playlist" data-youtube-search-type="playlist" style="margin-top:14px;">Search YouTube Playlists</button>
        <button class="btn btn-primary" id="ab-ypl-add" style="margin-top:14px;"><i data-lucide="plus" style="width:16px;height:16px;margin-right:5px;vertical-align:-3px;"></i> Add Playlist</button>
      </div>
      <div class="settings-section">
        <h3><i data-lucide="list" class="h3-icon"></i> Approved Audiobook Playlists</h3>
        <p class="settings-hint">Global playlists appear for everyone. Personal playlists are assigned from Student Shelves.</p>
        <div id="ab-ypl-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>

    <div class="audiobook-stab-body" id="ab-playlists" style="display:none;">
      <div class="settings-section">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
          <div><h3 style="margin:0;"><i data-lucide="library" class="h3-icon"></i> Student Audiobook Shelves</h3><p class="settings-hint" style="margin-top:4px;">Assign screened audiobooks to each child. Global items already appear for everyone.</p></div>
          <div class="form-group" style="margin:0;min-width:240px;"><label>Select Child</label><select id="ab-play-student" class="admin-select"></select></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;"><h4 id="ab-current-title" style="margin:0 0 14px;">Current Shelf</h4><div id="ab-assigned-list" style="display:flex;flex-direction:column;gap:8px;min-height:120px;"></div></div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;"><h4 style="margin:0 0 14px;">Available Library</h4><div id="ab-available-list" style="display:flex;flex-direction:column;gap:8px;min-height:120px;"></div></div>
        </div>
        <div style="margin-top:22px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;">
          <h4 style="margin:0 0 4px;">Audiobook Channels</h4>
          <p class="settings-hint" style="margin-bottom:14px;">Global channels are automatic. Assign personal channels here.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
            <div><h5 style="margin:0 0 10px;">Current Channels</h5><div id="ab-assigned-channels" style="display:flex;flex-direction:column;gap:8px;"></div></div>
            <div><h5 style="margin:0 0 10px;">Available Channels</h5><div id="ab-available-channels" style="display:flex;flex-direction:column;gap:8px;"></div></div>
          </div>
        </div>
        <div style="margin-top:22px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;">
          <h4 style="margin:0 0 4px;">Audiobook YouTube Playlists</h4>
          <p class="settings-hint" style="margin-bottom:14px;">Global playlists are automatic. Assign personal playlists here.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
            <div><h5 style="margin:0 0 10px;">Current Playlists</h5><div id="ab-assigned-youtube-playlists" style="display:flex;flex-direction:column;gap:8px;"></div></div>
            <div><h5 style="margin:0 0 10px;">Available Playlists</h5><div id="ab-available-youtube-playlists" style="display:flex;flex-direction:column;gap:8px;"></div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="audiobook-stab-body" id="ab-settings" style="display:none;">
      <div class="settings-section">
        <h3><i data-lucide="sliders-horizontal" class="h3-icon"></i> Per-Student Audiobook Settings</h3>
        <p class="settings-hint">The default daily allowance is ${AUDIOBOOK_DEFAULT_MINUTES} minutes, separate from video time.</p>
        <div class="form-group" style="max-width:260px;margin:18px 0;"><label>Student</label><select id="ab-settings-student" class="admin-select"></select></div>
        <div style="display:flex;flex-direction:column;gap:16px;max-width:440px;">
          <div class="form-group"><label>Max Daily Audiobook Time (minutes)</label><input type="number" id="ab-max-minutes" class="admin-input" min="5" max="720" value="${AUDIOBOOK_DEFAULT_MINUTES}" style="max-width:130px;"></div>
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:14px;"><input type="checkbox" id="ab-require-completion" checked style="width:15px;height:15px;margin-top:3px;"><span><strong>Require school completion first</strong><br><span class="settings-hint">The audiobook shelf stays locked until required subjects are complete.</span></span></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button class="btn btn-primary" id="ab-save-student"><i data-lucide="save" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Save Settings</button>
            <button class="btn btn-secondary" id="ab-override"><i data-lucide="unlock" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Bypass School/Schedule Today</button>
            <button class="btn btn-secondary" id="ab-override-all"><i data-lucide="users" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Bypass for All Today</button>
          </div>
          <span id="ab-override-status" style="display:none;font-size:12px;color:#fbbf24;"></span>
          <div style="margin-top:4px;padding:14px;border:1px solid rgba(245,158,11,.24);background:rgba(245,158,11,.07);border-radius:10px;">
            <div style="font-size:14px;font-weight:700;color:#fbbf24;">Extra time today</div>
            <p class="settings-hint" style="margin:4px 0 10px;">Adds a limited amount for this student today only. It does not change their normal daily allowance.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-secondary ab-add-time" data-minutes="15">+15 minutes</button>
              <button class="btn btn-secondary ab-add-time" data-minutes="30">+30 minutes</button>
              <button class="btn btn-secondary ab-add-time" data-minutes="60">+60 minutes</button>
            </div>
            <div id="ab-extra-time-status" style="margin-top:9px;font-size:12px;color:#fdba74;"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="audiobook-stab-body" id="ab-history" style="display:none;">
      <div class="settings-section">
        <h3><i data-lucide="bar-chart-3" class="h3-icon"></i> Audiobook Listening History</h3>
        <p class="settings-hint">Daily audiobook time per student for the last 30 days.</p>
        <div class="form-group" style="max-width:260px;margin:18px 0;"><label>Student</label><select id="ab-history-student" class="admin-select"></select></div>
        <div id="ab-history-table"></div>
      </div>
    </div>
  `;
  window.lucide?.createIcons({ el: root });
}

export function setupAudiobookTab() {
  if (initialized) return;
  initialized = true;
  renderShell();

  document.querySelectorAll('.audiobook-stab').forEach(button => {
    button.addEventListener('click', async () => {
      document.querySelectorAll('.audiobook-stab').forEach(tab => tab.classList.remove('active-stab'));
      document.querySelectorAll('.audiobook-stab-body').forEach(body => { body.style.display = 'none'; });
      button.classList.add('active-stab');
      document.getElementById(button.dataset.abtab).style.display = 'block';
      if (button.dataset.abtab === 'ab-channels') await loadChannels();
      if (button.dataset.abtab === 'ab-youtube-playlists') await loadYoutubePlaylists();
      if (button.dataset.abtab === 'ab-playlists') await loadAssignmentsAndRender();
      if (button.dataset.abtab === 'ab-settings') await loadStudentSettings();
      if (button.dataset.abtab === 'ab-history') await loadHistory();
    });
  });

  document.getElementById('ab-save-global').addEventListener('click', saveGlobalSettings);
  document.getElementById('ab-lookup').addEventListener('click', lookupAudiobook);
  document.getElementById('ab-youtube-url').addEventListener('keydown', event => {
    if (event.key === 'Enter') lookupAudiobook();
  });
  document.getElementById('ab-cancel').addEventListener('click', resetPreview);
  document.getElementById('ab-add').addEventListener('click', addAudiobook);
  document.getElementById('ab-library-list').addEventListener('change', handleLibraryChange);
  document.getElementById('ab-library-list').addEventListener('click', handleLibraryClick);
  document.getElementById('ab-channel-resolve').addEventListener('click', resolveAudiobookChannel);
  document.getElementById('ab-channel-add').addEventListener('click', addAudiobookChannel);
  document.getElementById('ab-channel-list').addEventListener('change', handleChannelListChange);
  document.getElementById('ab-channel-list').addEventListener('click', handleChannelListClick);
  document.getElementById('ab-ypl-add').addEventListener('click', addAudiobookYoutubePlaylist);
  document.getElementById('ab-ypl-list').addEventListener('change', handleYoutubePlaylistChange);
  document.getElementById('ab-ypl-list').addEventListener('click', handleYoutubePlaylistClick);
  document.getElementById('ab-play-student').addEventListener('change', renderStudentShelf);
  document.getElementById('ab-assigned-list').addEventListener('click', handleShelfClick);
  document.getElementById('ab-available-list').addEventListener('click', handleShelfClick);
  document.getElementById('ab-assigned-channels').addEventListener('click', handleChannelShelfClick);
  document.getElementById('ab-available-channels').addEventListener('click', handleChannelShelfClick);
  document.getElementById('ab-assigned-youtube-playlists').addEventListener('click', handleYoutubePlaylistShelfClick);
  document.getElementById('ab-available-youtube-playlists').addEventListener('click', handleYoutubePlaylistShelfClick);
  document.getElementById('ab-settings-student').addEventListener('change', loadStudentSettings);
  document.getElementById('ab-save-student').addEventListener('click', saveStudentSettings);
  document.getElementById('ab-override').addEventListener('click', toggleOverride);
  document.getElementById('ab-override-all').addEventListener('click', overrideAll);
  document.querySelectorAll('.ab-add-time').forEach(button => button.addEventListener('click', addExtraTime));
  document.getElementById('ab-history-student').addEventListener('change', loadHistory);

  window._refreshAudiobooks = async () => {
    await loadAudiobookTab();
    const activePanel = document.querySelector('.audiobook-stab.active-stab')?.dataset.abtab;
    if (activePanel === 'ab-channels') await loadChannels();
    if (activePanel === 'ab-youtube-playlists') await loadYoutubePlaylists();
    if (activePanel === 'ab-playlists') await loadAssignmentsAndRender();
    if (activePanel === 'ab-settings') await loadStudentSettings();
    if (activePanel === 'ab-history') await loadHistory();
  };
}

export async function loadAudiobookTab() {
  if (!initialized) setupAudiobookTab();
  await Promise.all([loadGlobalSettings(), loadStudents(), loadLibrary(), loadChannels(), loadYoutubePlaylists()]);
  populateStudentSelects();
}

async function loadGlobalSettings() {
  try {
    const settings = await jsonFetch(`${AUDIOBOOK_API}/settings`);
    document.getElementById('ab-start-time').value = settings.audiobook_start_time || '08:00';
    document.getElementById('ab-end-time').value = settings.audiobook_end_time || '21:00';
    document.getElementById('ab-enabled').checked = !!settings.audiobook_enabled;
  } catch (error) { logger.warn('audiobooks', 'Failed to load global settings', error); }
}

async function saveGlobalSettings() {
  try {
    await jsonFetch(`${AUDIOBOOK_API}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({
        audiobook_enabled: document.getElementById('ab-enabled').checked,
        audiobook_start_time: document.getElementById('ab-start-time').value,
        audiobook_end_time: document.getElementById('ab-end-time').value
      })
    });
    const saved = document.getElementById('ab-global-saved');
    saved.style.display = 'inline';
    setTimeout(() => { saved.style.display = 'none'; }, 2200);
  } catch (error) { toast('Failed to save audiobook hours.', true); }
}

async function lookupAudiobook() {
  const youtubeId = extractYouTubeId(document.getElementById('ab-youtube-url').value);
  if (!youtubeId) return toast('Paste a valid YouTube URL or 11-character video ID.', true);
  const button = document.getElementById('ab-lookup');
  button.disabled = true;
  button.textContent = 'Looking up...';
  document.getElementById('ab-youtube-id').value = youtubeId;
  document.getElementById('ab-preview-thumb').src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
  document.getElementById('ab-title').value = '';
  document.getElementById('ab-author').value = '';
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
    if (response.ok) {
      const metadata = await response.json();
      document.getElementById('ab-title').value = metadata.title || '';
      document.getElementById('ab-author').value = metadata.author_name || '';
    }
  } catch (error) { logger.warn('audiobooks', 'Metadata lookup failed', error); }
  document.getElementById('ab-screened').checked = false;
  document.getElementById('ab-global').checked = false;
  document.getElementById('ab-preview').style.display = 'block';
  button.disabled = false;
  button.innerHTML = '<i data-lucide="search" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;"></i> Look Up';
  window.lucide?.createIcons({ el: button });
}

function resetPreview() {
  document.getElementById('ab-preview').style.display = 'none';
  document.getElementById('ab-youtube-url').value = '';
}

async function addAudiobook() {
  const title = document.getElementById('ab-title').value.trim();
  const author = document.getElementById('ab-author').value.trim();
  const youtubeId = document.getElementById('ab-youtube-id').value;
  if (!title || !youtubeId) return toast('Audiobook title is required.', true);
  const button = document.getElementById('ab-add');
  button.disabled = true;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/items`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        author,
        youtube_id: youtubeId,
        thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
        screened: document.getElementById('ab-screened').checked,
        is_global: document.getElementById('ab-global').checked
      })
    });
    resetPreview();
    await loadLibrary();
    toast('Audiobook added to the library.');
  } catch (error) { toast(error.message || 'Failed to add audiobook.', true); }
  finally { button.disabled = false; }
}

async function loadLibrary() {
  try {
    const data = await jsonFetch(`${AUDIOBOOK_API}/items`);
    items = Array.isArray(data) ? data : [];
    renderLibrary();
  } catch (error) {
    logger.warn('audiobooks', 'Failed to load library', error);
    items = [];
    renderLibrary();
  }
}

function renderLibrary() {
  document.getElementById('ab-count').textContent = `${items.length} audiobook${items.length === 1 ? '' : 's'} in library`;
  const list = document.getElementById('ab-library-list');
  if (!items.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No audiobooks yet. Add the first one above.</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid ${item.is_global ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'};border-radius:10px;">
      <img src="${escapeHtml(item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_id}/mqdefault.jpg`)}" alt="" style="width:80px;height:60px;object-fit:cover;border-radius:7px;flex-shrink:0;">
      <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</div><div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${escapeHtml(item.author || 'Unknown author')}</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:7px;">
          <label style="font-size:12px;color:${item.screened ? '#34d399' : '#fbbf24'};"><input type="checkbox" data-ab-toggle="screened" data-id="${item.id}" ${item.screened ? 'checked' : ''}> Screened</label>
          <label style="font-size:12px;color:#fbbf24;"><input type="checkbox" data-ab-toggle="global" data-id="${item.id}" ${item.is_global ? 'checked' : ''}> All Students</label>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;align-items:flex-end;"><a href="https://www.youtube.com/watch?v=${encodeURIComponent(item.youtube_id)}" target="_blank" rel="noopener" style="font-size:12px;color:#f59e0b;text-decoration:none;">Preview</a><button class="btn btn-secondary" data-ab-delete="${item.id}" style="font-size:11px;padding:4px 9px;color:#f87171;">Delete</button></div>
    </div>
  `).join('');
}

async function handleLibraryChange(event) {
  const input = event.target.closest('[data-ab-toggle]');
  if (!input) return;
  const field = input.dataset.abToggle === 'global' ? 'is_global' : 'screened';
  try {
    await jsonFetch(`${AUDIOBOOK_API}/items/${input.dataset.id}`, {
      method: 'PATCH', body: JSON.stringify({ [field]: input.checked })
    });
    await loadLibrary();
  } catch (error) { input.checked = !input.checked; toast('Could not update audiobook.', true); }
}

async function handleLibraryClick(event) {
  const button = event.target.closest('[data-ab-delete]');
  if (!button) return;
  const item = items.find(candidate => candidate.id === button.dataset.abDelete);
  if (!item || !confirm(`Delete "${item.title}" from the audiobook library?`)) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/items/${item.id}`, { method: 'DELETE' });
    await loadLibrary();
  } catch (error) { toast('Could not delete audiobook.', true); }
}

async function resolveAudiobookChannel() {
  const input = document.getElementById('ab-channel-id');
  const directId = extractYouTubeChannelId(input.value);
  if (directId) {
    input.value = directId;
    toast('YouTube channel ID extracted.');
    return directId;
  }
  if (!input.value.trim()) return toast('Paste a YouTube channel URL or UC channel ID.', true);
  const button = document.getElementById('ab-channel-resolve');
  button.disabled = true;
  button.textContent = 'Looking up...';
  try {
    const result = await jsonFetch(`${AUDIOBOOK_API}/resolve-channel`, {
      method: 'POST', body: JSON.stringify({ url: input.value.trim() })
    });
    input.value = result.channel_id;
    toast('YouTube channel ID found.');
    return result.channel_id;
  } catch (error) {
    toast(error.message || 'Could not resolve that YouTube channel.', true);
    return null;
  } finally {
    button.disabled = false;
    button.textContent = 'Extract ID';
  }
}

async function addAudiobookChannel() {
  const nameInput = document.getElementById('ab-channel-name');
  const idInput = document.getElementById('ab-channel-id');
  const name = nameInput.value.trim();
  let channelId = extractYouTubeChannelId(idInput.value);
  if (!channelId && idInput.value.trim()) channelId = await resolveAudiobookChannel();
  if (!name || !channelId) return toast('Enter a channel name and valid YouTube channel.', true);
  const button = document.getElementById('ab-channel-add');
  button.disabled = true;
  try {
    const result = await jsonFetch(`${AUDIOBOOK_API}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        channel_id: channelId,
        is_global: document.getElementById('ab-channel-global').checked
      })
    });
    nameInput.value = '';
    idInput.value = '';
    document.getElementById('ab-channel-global').checked = true;
    await loadChannels();
    const skipped = Number(result.skipped_unavailable || 0);
    toast(`Audiobook channel added with ${result.video_count} playable recent items.${skipped ? ` Skipped ${skipped} unavailable.` : ''}`);
  } catch (error) { toast(error.message || 'Could not add audiobook channel.', true); }
  finally { button.disabled = false; }
}

async function loadChannels() {
  try {
    const data = await jsonFetch(`${AUDIOBOOK_API}/channels`);
    channels = Array.isArray(data) ? data : [];
  } catch (error) {
    channels = [];
    logger.warn('audiobooks', 'Failed to load audiobook channels', error);
  }
  renderChannels();
}

function renderChannels() {
  const list = document.getElementById('ab-channel-list');
  if (!list) return;
  if (!channels.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No audiobook channels yet.</p>';
    return;
  }
  list.innerHTML = channels.map(channel => `
    <div style="padding:12px;background:rgba(255,255,255,0.03);border:1px solid ${channel.is_global ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'};border-radius:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.12);color:#f59e0b;flex-shrink:0;"><i data-lucide="radio-tower" style="width:22px;height:22px;"></i></div>
        <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;">${escapeHtml(channel.name)}</div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:3px;">${escapeHtml(channel.channel_id)}</div></div>
        <label style="font-size:12px;color:#fbbf24;white-space:nowrap;"><input type="checkbox" data-ab-channel-global="${channel.id}" ${channel.is_global ? 'checked' : ''}> All Students</label>
        <a href="https://www.youtube.com/channel/${encodeURIComponent(channel.channel_id)}" target="_blank" rel="noopener" style="font-size:12px;color:#f59e0b;text-decoration:none;">Preview</a>
        <button class="btn btn-secondary" data-ab-channel-exclusions="${channel.id}" style="font-size:11px;padding:4px 8px;">Flagged</button>
        <button class="btn btn-secondary" data-ab-channel-delete="${channel.id}" style="font-size:11px;padding:4px 8px;color:#f87171;">Delete</button>
      </div>
      <div id="ab-channel-exclusions-${channel.id}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);"></div>
    </div>
  `).join('');
  window.lucide?.createIcons({ el: list });
}

async function addAudiobookYoutubePlaylist() {
  const nameInput = document.getElementById('ab-ypl-name');
  const urlInput = document.getElementById('ab-ypl-url');
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  if (!name || !url) return toast('Enter a display name and YouTube playlist URL.', true);
  const button = document.getElementById('ab-ypl-add');
  button.disabled = true;
  button.textContent = 'Loading playlist...';
  try {
    const result = await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists`, {
      method: 'POST',
      body: JSON.stringify({ name, url, is_global: document.getElementById('ab-ypl-global').checked })
    });
    nameInput.value = '';
    urlInput.value = '';
    await loadYoutubePlaylists();
    const skipped = Number(result.skipped_unavailable || 0);
    toast(`Added ${result.item_count ?? result.video_count ?? 0} playable audiobooks from "${name}".${skipped ? ` Skipped ${skipped} unavailable.` : ''}`);
  } catch (error) { toast(error.message || 'Could not add that playlist.', true); }
  finally {
    button.disabled = false;
    button.innerHTML = '<i data-lucide="plus" style="width:16px;height:16px;margin-right:5px;vertical-align:-3px;"></i> Add Playlist';
    window.lucide?.createIcons({ el: button });
  }
}

async function loadYoutubePlaylists() {
  try {
    const data = await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists`);
    youtubePlaylists = Array.isArray(data) ? data : [];
  } catch (error) {
    youtubePlaylists = [];
    logger.warn('audiobooks', 'Failed to load audiobook playlists', error);
  }
  renderYoutubePlaylists();
}

function renderYoutubePlaylists() {
  const list = document.getElementById('ab-ypl-list');
  if (!list) return;
  if (!youtubePlaylists.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No approved audiobook playlists yet.</p>';
    return;
  }
  list.innerHTML = youtubePlaylists.map(playlist => `
    <div style="padding:12px;background:rgba(255,255,255,.03);border:1px solid ${playlist.is_global ? 'rgba(245,158,11,.35)' : 'rgba(255,255,255,.08)'};border-radius:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${escapeHtml(playlist.thumbnail_url || '')}" alt="" style="width:72px;height:48px;object-fit:cover;border-radius:7px;background:rgba(255,255,255,.05);">
        <div style="flex:1;min-width:0;"><div style="font-weight:700;">${escapeHtml(playlist.name)}</div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:3px;">${escapeHtml(playlist.playlist_id)}</div></div>
        <label style="font-size:12px;color:#fbbf24;white-space:nowrap;"><input type="checkbox" data-ab-ypl-global="${playlist.id}" ${playlist.is_global ? 'checked' : ''}> All Students</label>
        <a href="https://www.youtube.com/playlist?list=${encodeURIComponent(playlist.playlist_id)}" target="_blank" rel="noopener" style="font-size:12px;color:#f59e0b;text-decoration:none;">Preview</a>
        <button class="btn btn-secondary" data-ab-ypl-exclusions="${playlist.id}" style="font-size:11px;padding:4px 8px;">Flagged</button>
        <button class="btn btn-secondary" data-ab-ypl-delete="${playlist.id}" style="font-size:11px;padding:4px 8px;color:#f87171;">Delete</button>
      </div>
      <div id="ab-ypl-exclusions-${playlist.id}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);"></div>
    </div>`).join('');
}

async function handleYoutubePlaylistChange(event) {
  const input = event.target.closest('[data-ab-ypl-global]');
  if (!input) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${input.dataset.abYplGlobal}`, {
      method: 'PATCH', body: JSON.stringify({ is_global: input.checked })
    });
    await loadYoutubePlaylists();
  } catch (error) {
    input.checked = !input.checked;
    toast('Could not update that playlist.', true);
  }
}

async function handleYoutubePlaylistClick(event) {
  const exclusionsButton = event.target.closest('[data-ab-ypl-exclusions]');
  if (exclusionsButton) {
    const playlistId = exclusionsButton.dataset.abYplExclusions;
    const container = document.getElementById(`ab-ypl-exclusions-${playlistId}`);
    if (container.style.display === 'block') {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Loading flagged audiobooks...</span>';
    try {
      const exclusions = await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${playlistId}/exclusions`);
      container.innerHTML = exclusions.length ? exclusions.map(item => `
        <div style="display:flex;gap:8px;align-items:center;padding:6px 0;">
          <span style="flex:1;font-size:12px;">${escapeHtml(item.title || item.youtube_id)}</span>
          <button class="btn btn-secondary" data-ab-ypl-restore="${playlistId}" data-youtube-id="${escapeHtml(item.youtube_id)}" style="font-size:10px;padding:3px 7px;">Restore</button>
        </div>`).join('') : '<span style="font-size:12px;color:var(--text-muted);">No flagged audiobooks in this playlist.</span>';
    } catch (error) { container.innerHTML = '<span style="font-size:12px;color:#f87171;">Could not load flagged audiobooks.</span>'; }
    return;
  }

  const restoreButton = event.target.closest('[data-ab-ypl-restore]');
  if (restoreButton) {
    try {
      await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${restoreButton.dataset.abYplRestore}/exclusions/${encodeURIComponent(restoreButton.dataset.youtubeId)}`, { method: 'DELETE' });
      const container = document.getElementById(`ab-ypl-exclusions-${restoreButton.dataset.abYplRestore}`);
      container.style.display = 'none';
      document.querySelector(`[data-ab-ypl-exclusions="${restoreButton.dataset.abYplRestore}"]`)?.click();
    } catch (error) { toast('Could not restore that audiobook.', true); }
    return;
  }

  const button = event.target.closest('[data-ab-ypl-delete]');
  if (!button) return;
  const playlist = youtubePlaylists.find(item => item.id === button.dataset.abYplDelete);
  if (!playlist || !confirm(`Remove the audiobook playlist "${playlist.name}"?`)) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${playlist.id}`, { method: 'DELETE' });
    await loadYoutubePlaylists();
  } catch (error) { toast('Could not remove that playlist.', true); }
}

async function handleChannelListChange(event) {
  const input = event.target.closest('[data-ab-channel-global]');
  if (!input) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/channels/${input.dataset.abChannelGlobal}`, {
      method: 'PATCH', body: JSON.stringify({ is_global: input.checked })
    });
    await loadChannels();
  } catch (error) {
    input.checked = !input.checked;
    toast('Could not update the channel.', true);
  }
}

async function handleChannelListClick(event) {
  const deleteButton = event.target.closest('[data-ab-channel-delete]');
  if (deleteButton) {
    const channel = channels.find(item => item.id === deleteButton.dataset.abChannelDelete);
    if (!channel || !confirm(`Remove the audiobook channel "${channel.name}"?`)) return;
    try {
      await jsonFetch(`${AUDIOBOOK_API}/channels/${channel.id}`, { method: 'DELETE' });
      await loadChannels();
    } catch (error) { toast('Could not remove the channel.', true); }
    return;
  }

  const exclusionsButton = event.target.closest('[data-ab-channel-exclusions]');
  if (exclusionsButton) {
    const channelId = exclusionsButton.dataset.abChannelExclusions;
    const container = document.getElementById(`ab-channel-exclusions-${channelId}`);
    if (container.style.display === 'block') {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Loading flagged items...</span>';
    try {
      const exclusions = await jsonFetch(`${AUDIOBOOK_API}/channels/${channelId}/exclusions`);
      container.innerHTML = exclusions.length ? exclusions.map(item => `
        <div style="display:flex;gap:8px;align-items:center;padding:6px 0;">
          <span style="flex:1;font-size:12px;">${escapeHtml(item.title || item.youtube_id)}</span>
          <button class="btn btn-secondary" data-ab-remove-exclusion="${channelId}" data-youtube-id="${escapeHtml(item.youtube_id)}" style="font-size:10px;padding:3px 7px;">Restore</button>
        </div>
      `).join('') : '<span style="font-size:12px;color:var(--text-muted);">No flagged items in this channel.</span>';
    } catch (error) { container.innerHTML = '<span style="font-size:12px;color:#f87171;">Could not load flagged items.</span>'; }
    return;
  }

  const restoreButton = event.target.closest('[data-ab-remove-exclusion]');
  if (restoreButton) {
    try {
      await jsonFetch(
        `${AUDIOBOOK_API}/channels/${restoreButton.dataset.abRemoveExclusion}/exclusions/${encodeURIComponent(restoreButton.dataset.youtubeId)}`,
        { method: 'DELETE' }
      );
      const channelButton = document.querySelector(`[data-ab-channel-exclusions="${restoreButton.dataset.abRemoveExclusion}"]`);
      document.getElementById(`ab-channel-exclusions-${restoreButton.dataset.abRemoveExclusion}`).style.display = 'none';
      channelButton?.click();
    } catch (error) { toast('Could not restore that audiobook.', true); }
  }
}

async function loadStudents() {
  try {
    const data = await jsonFetch(`${API}/students`);
    students = Array.isArray(data) ? data : [];
  } catch (error) { students = []; }
}

function populateStudentSelects() {
  ['ab-play-student', 'ab-settings-student', 'ab-history-student'].forEach(id => {
    const select = document.getElementById(id);
    const previous = select.value;
    select.innerHTML = '';
    students.forEach(student => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = student.name;
      select.appendChild(option);
    });
    if (students.some(student => student.id === previous)) select.value = previous;
  });
}

async function loadAssignmentsAndRender() {
  try {
    [assignments, channelAssignments, youtubePlaylistAssignments] = await Promise.all([
      jsonFetch(`${AUDIOBOOK_API}/assignments`),
      jsonFetch(`${AUDIOBOOK_API}/channel-assignments`),
      jsonFetch(`${AUDIOBOOK_API}/youtube-playlist-assignments`)
    ]);
  } catch (error) {
    assignments = {};
    channelAssignments = {};
    youtubePlaylistAssignments = {};
  }
  renderStudentShelf();
}

function shelfRow(item, action) {
  const isGlobal = !!item.is_global;
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:9px;">
    <img src="${escapeHtml(item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_id}/default.jpg`)}" alt="" style="width:52px;height:39px;object-fit:cover;border-radius:5px;">
    <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.title)}</div><div style="font-size:11px;color:var(--text-muted);">${isGlobal ? 'All students' : escapeHtml(item.author || '')}</div></div>
    ${isGlobal ? '<span style="font-size:11px;color:#fbbf24;">Global</span>' : `<button class="btn btn-secondary" data-ab-shelf-action="${action}" data-id="${item.id}" style="font-size:11px;padding:4px 8px;">${action === 'remove' ? 'Remove' : 'Add'}</button>`}
  </div>`;
}

function renderStudentShelf() {
  const studentId = document.getElementById('ab-play-student').value;
  const student = students.find(candidate => candidate.id === studentId);
  const assignedIds = new Set(assignments[studentId] || []);
  const screened = items.filter(item => item.active !== 0 && item.screened);
  const current = screened.filter(item => item.is_global || assignedIds.has(item.id));
  const available = screened.filter(item => !item.is_global && !assignedIds.has(item.id));
  document.getElementById('ab-current-title').textContent = `${student?.name || 'Student'}'s Shelf (${current.length})`;
  document.getElementById('ab-assigned-list').innerHTML = current.length
    ? current.map(item => shelfRow(item, 'remove')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No audiobooks assigned yet.</p>';
  document.getElementById('ab-available-list').innerHTML = available.length
    ? available.map(item => shelfRow(item, 'add')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No additional screened audiobooks available.</p>';

  const assignedChannelIds = new Set(channelAssignments[studentId] || []);
  const currentChannels = channels.filter(channel => channel.is_global || assignedChannelIds.has(channel.id));
  const availableChannels = channels.filter(channel => !channel.is_global && !assignedChannelIds.has(channel.id));
  document.getElementById('ab-assigned-channels').innerHTML = currentChannels.length
    ? currentChannels.map(channel => channelShelfRow(channel, channel.is_global ? null : 'remove')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No audiobook channels assigned.</p>';
  document.getElementById('ab-available-channels').innerHTML = availableChannels.length
    ? availableChannels.map(channel => channelShelfRow(channel, 'add')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No additional personal channels available.</p>';

  const assignedYoutubeIds = new Set(youtubePlaylistAssignments[studentId] || []);
  const currentYoutubePlaylists = youtubePlaylists.filter(playlist => playlist.is_global || assignedYoutubeIds.has(playlist.id));
  const availableYoutubePlaylists = youtubePlaylists.filter(playlist => !playlist.is_global && !assignedYoutubeIds.has(playlist.id));
  document.getElementById('ab-assigned-youtube-playlists').innerHTML = currentYoutubePlaylists.length
    ? currentYoutubePlaylists.map(playlist => youtubePlaylistShelfRow(playlist, playlist.is_global ? null : 'remove')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No audiobook playlists assigned.</p>';
  document.getElementById('ab-available-youtube-playlists').innerHTML = availableYoutubePlaylists.length
    ? availableYoutubePlaylists.map(playlist => youtubePlaylistShelfRow(playlist, 'add')).join('')
    : '<p style="color:var(--text-muted);font-size:13px;">No additional personal playlists available.</p>';
  window.lucide?.createIcons({ el: document.getElementById('ab-playlists') });
}

function channelShelfRow(channel, action) {
  const actionButton = action ? `<button class="btn btn-secondary" data-ab-channel-shelf-action="${action}" data-id="${channel.id}" style="font-size:11px;padding:4px 8px;">${action === 'remove' ? 'Remove' : 'Add'}</button>` : '<span style="font-size:11px;color:#fbbf24;">Global</span>';
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:9px;">
    <div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.12);color:#f59e0b;"><i data-lucide="radio-tower" style="width:18px;height:18px;"></i></div>
    <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(channel.name)}</div><div style="font-size:10px;color:var(--text-muted);">Whole YouTube channel</div></div>
    ${actionButton}
  </div>`;
}

function youtubePlaylistShelfRow(playlist, action) {
  const actionButton = action ? `<button class="btn btn-secondary" data-ab-ypl-shelf-action="${action}" data-id="${playlist.id}" style="font-size:11px;padding:4px 8px;">${action === 'remove' ? 'Remove' : 'Add'}</button>` : '<span style="font-size:11px;color:#fbbf24;">Global</span>';
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:9px;">
    <div style="width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,.12);color:#f59e0b;"><i data-lucide="list-video" style="width:18px;height:18px;"></i></div>
    <div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(playlist.name)}</div><div style="font-size:10px;color:var(--text-muted);">Synchronized YouTube playlist</div></div>
    ${actionButton}
  </div>`;
}

async function handleShelfClick(event) {
  const button = event.target.closest('[data-ab-shelf-action]');
  if (!button) return;
  const studentId = document.getElementById('ab-play-student').value;
  try {
    if (button.dataset.abShelfAction === 'add') {
      await jsonFetch(`${AUDIOBOOK_API}/assign`, {
        method: 'POST', body: JSON.stringify({ student_id: studentId, audiobook_id: button.dataset.id })
      });
    } else {
      await jsonFetch(`${AUDIOBOOK_API}/assign/${studentId}/${button.dataset.id}`, { method: 'DELETE' });
    }
    await loadAssignmentsAndRender();
  } catch (error) { toast('Could not update the student shelf.', true); }
}

async function handleChannelShelfClick(event) {
  const button = event.target.closest('[data-ab-channel-shelf-action]');
  if (!button) return;
  const studentId = document.getElementById('ab-play-student').value;
  try {
    if (button.dataset.abChannelShelfAction === 'add') {
      await jsonFetch(`${AUDIOBOOK_API}/channels/${button.dataset.id}/assign`, {
        method: 'POST', body: JSON.stringify({ student_id: studentId })
      });
    } else {
      await jsonFetch(`${AUDIOBOOK_API}/channels/${button.dataset.id}/assign/${studentId}`, { method: 'DELETE' });
    }
    await loadAssignmentsAndRender();
    window.lucide?.createIcons();
  } catch (error) { toast('Could not update the student channel.', true); }
}

async function handleYoutubePlaylistShelfClick(event) {
  const button = event.target.closest('[data-ab-ypl-shelf-action]');
  if (!button) return;
  const studentId = document.getElementById('ab-play-student').value;
  try {
    if (button.dataset.abYplShelfAction === 'add') {
      await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${button.dataset.id}/assign`, {
        method: 'POST', body: JSON.stringify({ student_id: studentId })
      });
    } else {
      await jsonFetch(`${AUDIOBOOK_API}/youtube-playlists/${button.dataset.id}/assign/${studentId}`, { method: 'DELETE' });
    }
    await loadAssignmentsAndRender();
  } catch (error) { toast('Could not update the student playlist.', true); }
}

async function loadStudentSettings() {
  const studentId = document.getElementById('ab-settings-student').value;
  if (!studentId) return;
  try {
    const settings = await jsonFetch(`${AUDIOBOOK_API}/student-settings/${studentId}`);
    document.getElementById('ab-max-minutes').value = settings.max_daily_minutes || AUDIOBOOK_DEFAULT_MINUTES;
    document.getElementById('ab-require-completion').checked = !!settings.require_completion;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const unlocked = settings.override_date === today;
    document.getElementById('ab-override').textContent = unlocked ? 'Use Normal School/Schedule' : 'Bypass School/Schedule Today';
    const status = document.getElementById('ab-override-status');
    status.style.display = unlocked ? 'inline' : 'none';
    status.textContent = unlocked ? 'School and schedule gates are bypassed today. The daily time limit still applies.' : '';
    const bonusMinutes = Math.floor((settings.daily_bonus_seconds || 0) / 60);
    document.getElementById('ab-extra-time-status').textContent = bonusMinutes > 0
      ? `${bonusMinutes} extra minutes have been granted for today.`
      : 'No extra audiobook time has been granted today.';
  } catch (error) { toast('Could not load audiobook settings.', true); }
}

async function addExtraTime(event) {
  const studentId = document.getElementById('ab-settings-student').value;
  if (!studentId) return;
  const button = event.currentTarget;
  const minutes = Number(button.dataset.minutes);
  button.disabled = true;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/student-settings/${studentId}/add-time`, {
      method: 'POST',
      body: JSON.stringify({ minutes })
    });
    toast(`Added ${minutes} audiobook minutes for today.`);
    await loadStudentSettings();
  } catch (error) { toast('Could not add audiobook time.', true); }
  finally { button.disabled = false; }
}

async function saveStudentSettings() {
  const studentId = document.getElementById('ab-settings-student').value;
  if (!studentId) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/student-settings/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        max_daily_minutes: Number(document.getElementById('ab-max-minutes').value) || AUDIOBOOK_DEFAULT_MINUTES,
        require_completion: document.getElementById('ab-require-completion').checked
      })
    });
    toast('Audiobook settings saved.');
  } catch (error) { toast('Could not save audiobook settings.', true); }
}

async function toggleOverride() {
  const studentId = document.getElementById('ab-settings-student').value;
  if (!studentId) return;
  try {
    await jsonFetch(`${AUDIOBOOK_API}/student-settings/${studentId}/override-today`, { method: 'POST' });
    await loadStudentSettings();
  } catch (error) { toast('Could not change today\'s override.', true); }
}

async function overrideAll() {
  const button = document.getElementById('ab-override-all');
  button.disabled = true;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let count = 0;
  try {
    for (const student of students) {
      const settings = await jsonFetch(`${AUDIOBOOK_API}/student-settings/${student.id}`);
      if (settings.override_date !== today) {
        await jsonFetch(`${AUDIOBOOK_API}/student-settings/${student.id}/override-today`, { method: 'POST' });
      }
      count++;
    }
    toast(`School and schedule gates bypassed for all ${count} students today. Daily time limits still apply.`);
    await loadStudentSettings();
  } catch (error) { toast('Could not unlock every student.', true); }
  finally { button.disabled = false; }
}

async function loadHistory() {
  const studentId = document.getElementById('ab-history-student').value;
  const table = document.getElementById('ab-history-table');
  if (!studentId) { table.innerHTML = ''; return; }
  try {
    const rows = await jsonFetch(`${AUDIOBOOK_API}/watch/${studentId}/history`);
    if (!rows.length) {
      table.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No audiobook listening history yet.</p>';
      return;
    }
    table.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.08);color:var(--text-muted);"><th style="text-align:left;padding:7px 0;">Date</th><th style="text-align:right;padding:7px 0;">Listening Time</th></tr></thead><tbody>${rows.map(row => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);"><td style="padding:9px 0;">${escapeHtml(row.date)}</td><td style="padding:9px 0;text-align:right;color:#f59e0b;font-weight:600;">${formatDuration(row.listened_seconds)}</td></tr>`).join('')}</tbody></table>`;
  } catch (error) { table.innerHTML = '<p style="color:#f87171;">Error loading history.</p>'; }
}
