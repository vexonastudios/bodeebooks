import { mediaFetch as fetch } from './cloud-media-transport.js';
const targets = {
  video: { url: 'video-yt-url', lookup: 'video-lookup-btn' },
  'learning-video': { url: 'learning-video-url', lookup: 'learning-video-lookup-btn' },
  music: { url: 'music-yt-url', lookup: 'music-lookup-btn' },
  audiobook: { url: 'ab-youtube-url', lookup: 'ab-lookup' },
  'video-channel': { url: 'channel-id-input', name: 'channel-name-input', value: 'youtube_id' },
  'audiobook-channel': { url: 'ab-channel-id', name: 'ab-channel-name', value: 'youtube_id' },
  'video-playlist': { url: 'youtube-playlist-url-input', name: 'youtube-playlist-name-input' },
  'music-playlist': { url: 'music-ypl-url', name: 'music-ypl-name' },
  'audiobook-playlist': { url: 'ab-ypl-url', name: 'ab-ypl-name' },
  'family-watch': { url: 'family-watch-video-input', name: 'family-watch-title-input' }
};

let activeTarget = null;
let currentResults = [];
let nextPageToken = null;
let currentQuery = '';
let currentType = 'video';

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function createModal() {
  const modal = document.createElement('div');
  modal.id = 'youtube-search-modal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-card" style="width:min(760px,calc(100vw - 28px));max-height:88vh;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <div><h2 style="margin:0;">Search YouTube</h2><p class="settings-hint" style="margin-top:4px;">Results are safety-filtered and video results must allow embedded playback.</p></div>
        <button type="button" class="btn btn-secondary" data-yts-close>Close</button>
      </div>
      <form id="desktop-yts-form" style="display:flex;gap:8px;flex-wrap:wrap;">
        <input id="desktop-yts-query" class="admin-input" maxlength="120" placeholder="What are you looking for?" style="flex:1;min-width:220px;" required>
        <button class="btn btn-primary" type="submit">Search</button>
      </form>
      <div id="desktop-yts-status" class="settings-hint" style="min-height:20px;margin:10px 0;"></div>
      <div id="desktop-yts-results" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;overflow-y:auto;padding-right:3px;"></div>
      <button id="desktop-yts-more" class="btn btn-secondary" type="button" style="display:none;margin-top:12px;">Load more</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if (event.target === modal || event.target.closest('[data-yts-close]')) closeModal();
    const resultButton = event.target.closest('[data-yts-result]');
    if (resultButton) chooseResult(Number(resultButton.dataset.ytsResult));
  });
  modal.querySelector('#desktop-yts-form').addEventListener('submit', event => runSearch(event));
  modal.querySelector('#desktop-yts-more').addEventListener('click', () => runSearch(null, true));
  return modal;
}

function modal() { return document.getElementById('youtube-search-modal') || createModal(); }

function openSearch(button) {
  activeTarget = button.dataset.youtubeSearchTarget;
  currentType = button.dataset.youtubeSearchType || 'video';
  currentResults = [];
  nextPageToken = null;
  modal().classList.add('active');
  const query = document.getElementById('desktop-yts-query');
  query.value = '';
  document.getElementById('desktop-yts-results').innerHTML = '';
  document.getElementById('desktop-yts-status').textContent = `Search for a YouTube ${currentType}.`;
  document.getElementById('desktop-yts-more').style.display = 'none';
  setTimeout(() => query.focus(), 20);
}

function closeModal() { modal().classList.remove('active'); }

async function runSearch(event, append = false) {
  event?.preventDefault();
  const query = append ? currentQuery : document.getElementById('desktop-yts-query').value.trim();
  const status = document.getElementById('desktop-yts-status');
  if (query.length < 2) return;
  status.textContent = append ? 'Loading more…' : 'Searching YouTube…';
  try {
    const params = new URLSearchParams({ q: query, type: currentType });
    if (append && nextPageToken) params.set('page_token', nextPageToken);
    const response = await fetch(`/api/youtube/search?${params}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'YouTube search failed');
    currentResults = append ? [...currentResults, ...(data.results || [])] : (data.results || []);
    currentQuery = query;
    nextPageToken = data.next_page_token || null;
    renderResults();
    status.textContent = currentResults.length ? `${currentResults.length} results` : 'No results found.';
    document.getElementById('desktop-yts-more').style.display = nextPageToken ? 'block' : 'none';
  } catch (error) {
    status.textContent = error.message;
  }
}

function renderResults() {
  document.getElementById('desktop-yts-results').innerHTML = currentResults.map((item, index) => `
    <article style="display:grid;grid-template-columns:110px 1fr;gap:10px;padding:9px;border:1px solid rgba(148,163,184,.16);border-radius:12px;background:rgba(255,255,255,.03);">
      <img src="${escapeHtml(item.thumbnail_url || '/favicon.png')}" alt="" style="width:110px;height:82px;object-fit:cover;border-radius:8px;">
      <div style="min-width:0;"><div style="font-size:13px;font-weight:700;line-height:1.3;">${escapeHtml(item.title)}</div><div class="settings-hint" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px;">${escapeHtml(item.channel)}</div><button class="btn btn-primary" type="button" data-yts-result="${index}" style="padding:6px 10px;font-size:11px;margin-top:8px;">Use this</button></div>
    </article>`).join('');
}

function chooseResult(index) {
  const item = currentResults[index];
  const target = targets[activeTarget];
  if (!item || !target) return;
  const url = document.getElementById(target.url);
  if (!url) return;
  url.value = target.value ? item[target.value] : item.youtube_url;
  if (target.name && document.getElementById(target.name)) document.getElementById(target.name).value = item.title;
  closeModal();
  if (target.lookup) document.getElementById(target.lookup)?.click();
  url.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function setupYouTubeSearch() {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-youtube-search-target]');
    if (button) openSearch(button);
  });
}
