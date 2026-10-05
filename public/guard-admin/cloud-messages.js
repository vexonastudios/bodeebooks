// Existing Admin conversation layout, with only the cloud transport replaced.
import { createVoiceRecorder } from './voice-recording.js';
import { createMessageThread } from './message-thread.js';
import { createMessageReactions } from './message-reactions.js';
import { createParentSessionRecovery } from './cloud-parent-session.js';
export function setupCloudMessages({ endpoint, onBack = () => {} }) {
  const el = id => document.getElementById(id);
  const ALL_KIDS = 'all-kids';
  const FAMILY = 'family-conversation';
  const groupKey = id => `group:${id}`;
  const groupId = key => key?.startsWith('group:') ? key.slice(6) : null;
  let broadcastResult = null;
  const recipients = () => students.filter(student => !student.archived_at);
  const textNode = (tag, text, className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
  let students = [];
  let peerSaving = false, peerRevision = 0;
  let archivedGroups = false;
  let groups = [], peerEnabled = false, chosenKids = new Set(), chosenInitialized = false, groupDraftId = null;
  let unread = new Map();
  const recentChildMessages = new Map();
  const sequence = value => typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value) ? BigInt(value) : 0n;
  function rememberChildMessage(studentId, value) {
    const next = sequence(value);
    if (next > (recentChildMessages.get(studentId) || 0n)) recentChildMessages.set(studentId, next);
  }
  let selected = null;
  let active = false;
  let page = null;
  let older = [];
  let cursor;
  let generation = 0;
  let timer = null;
  let loading = false;
  let live = false, refreshQueued = false;
  let sending = false;
  let failures = 0;
  let error = '';
  const drafts = new Map();
  const pending = new Map();
  const attachments = new Map();
  const localFiles = new Map(), voices = new Map();
  const threadRows = createMessageThread(el('messages-thread-content'));
  const familyPanel = textNode('div', '', 'cloud-family-thread-intro');
  const familyRows = textNode('div', '', 'cloud-family-thread-rows');
  const familyEmpty = textNode('p', 'No family messages yet. Send the first one below.', 'cloud-family-thread-empty');
  const familyThreadRows = createMessageThread(familyRows);
  const groupPanel = textNode('div', '', 'cloud-group-panel');
  const groupTitle = textNode('h3', 'New group message');
  const groupDescription = textNode('p', 'Choose who belongs. Everyone selected can see and reply in one shared chat.');
  const groupPeople = textNode('div', '', 'cloud-group-people');
  const groupClose = textNode('button', 'Close group', 'btn btn-secondary cloud-group-close'); groupClose.type = 'button';
  const groupReopen = textNode('button', 'Reopen chat', 'btn btn-secondary cloud-group-close'); groupReopen.type = 'button';
  const groupStatus = textNode('p', '', 'cloud-group-status');
  groupPanel.append(groupTitle, groupDescription, groupPeople, groupClose, groupReopen, groupStatus);
  groupClose.addEventListener('click', async () => {
    const id = groupId(selected); if (!id || sending) return;
    groupClose.disabled = true;
    try { const result = await request('close-message-group', { groupId: id });
      groups = groups.map(group => group.id === id ? result.group : group);
      if (page) page.group = result.group;
      render(); renderStudents(); note('Chat archived. Its history is kept, and children cannot reply.');
    } catch (failure) { note(failure.message); }
    finally { groupClose.disabled = false; }
  });
  groupReopen.addEventListener('click', async () => {
    const id = groupId(selected); if (!id || sending) return;
    const current = groups.find(group => group.id === id);
    if (current?.duplicateOf) { archivedGroups = false; choose(groupKey(current.duplicateOf)); return; }
    groupReopen.disabled = true;
    try { const result = await request('reopen-message-group', { groupId: id });
      groups = groups.map(group => group.id === id ? result.group : group);
      archivedGroups = false;
      if (result.group.id !== id) { choose(groupKey(result.group.id)); void loadGroups(); }
      else { if (page) page.group = result.group; render(); renderStudents(); }
      note('Chat reopened. Children can reply while sibling messaging is on.');
    } catch (failure) { note(failure.message); }
    finally { groupReopen.disabled = false; }
  });
  const familyTitle = textNode('h3', 'Family conversation');
  const familyDescription = textNode('p', 'Everyone can read this thread. Only parents can post unless you turn on children’s replies.');
  const familyToggleLabel = textNode('label', '', 'cloud-family-thread-setting');
  const familyToggle = document.createElement('input'); familyToggle.type = 'checkbox';
  familyToggleLabel.append(familyToggle, textNode('span', 'Let children post here'));
  const familyProgress = textNode('div', '', 'cloud-family-thread-progress');
  familyPanel.append(familyTitle, familyDescription, familyToggleLabel, familyProgress);
  familyToggle.addEventListener('change', async () => {
    const desired = familyToggle.checked; familyToggle.disabled = true;
    try { const saved = await request('family-message-settings', { childrenCanPost: desired });
      if (saved.childrenCanPost !== desired) throw new Error('The family setting could not be confirmed.');
      if (page) page.childrenCanPost = desired;
      note(desired ? 'Children can now post in the family conversation.' : 'Only parents can post in the family conversation.');
    } catch (failure) { familyToggle.checked = !desired; note(`${failure.message} The previous setting is still shown.`); }
    finally { familyToggle.disabled = !peerEnabled; }
  });
  const mobile = window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)');
  const section = el('tab-messages') || document.querySelector('.cloud-messages-panel');
  section.dataset.messageView = 'list';
  const listBack = document.createElement('button'); listBack.type = 'button'; listBack.id = 'messages-back'; listBack.className = 'btn cloud-messages-back';
  listBack.setAttribute('aria-label', 'Back to previous page'); listBack.title = 'Back to previous page';
  listBack.innerHTML = '<i data-lucide="arrow-left" aria-hidden="true"></i>';
  section.querySelector('.tab-header h1').before(listBack); listBack.addEventListener('click', onBack);
  const threadHeader = document.createElement('div'); threadHeader.className = 'cloud-chat-heading';
  const back = document.createElement('button'); back.type = 'button'; back.className = 'btn cloud-chat-back';
  back.setAttribute('aria-label', 'Back to conversations'); back.innerHTML = '<i data-lucide="arrow-left" aria-hidden="true"></i>';
  el('messages-thread-header').before(threadHeader); threadHeader.append(back, el('messages-thread-header'));
  const threadAvatar = document.createElement('span'); threadAvatar.className = 'cloud-chat-avatar'; threadAvatar.setAttribute('aria-hidden', 'true'); back.after(threadAvatar);
  const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('');
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Search your children'; search.className = 'cloud-chat-search'; search.setAttribute('aria-label', 'Search conversations');
  const messageAll = document.createElement('button'); messageAll.type = 'button'; messageAll.id = 'messages-all-kids'; messageAll.className = 'btn cloud-chat-all';
  messageAll.innerHTML = '<i data-lucide="users" aria-hidden="true"></i><span><strong>Message all kids</strong><small></small></span><i data-lucide="chevron-right" aria-hidden="true"></i>';
  messageAll.addEventListener('click', () => choose(ALL_KIDS));
  const familyButton = textNode('button', 'Family conversation', 'btn btn-secondary cloud-family-conversation-link'); familyButton.type = 'button';
  familyButton.addEventListener('click', () => choose(FAMILY));
  const listToolbar = textNode('div', '', 'cloud-chat-list-toolbar');
  const tabs = textNode('div', '', 'cloud-chat-list-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Conversations');
  const listTabs = new Map(), listQueries = { children: '', groups: '' };
  let listScope = 'children';
  for (const [scope, label] of [['children', 'Children'], ['groups', 'Groups']]) {
    const tab = textNode('button', '', 'btn cloud-chat-list-tab'); tab.type = 'button'; tab.id = 'messages-tab-' + scope;
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'messages-' + scope + '-panel');
    tab.append(textNode('span', label), textNode('span', '', 'cloud-chat-tab-count'));
    tab.addEventListener('click', () => setListScope(scope));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 'children' : event.key === 'End' ? 'groups' : scope === 'children' ? 'groups' : 'children';
      setListScope(next); listTabs.get(next).focus();
    });
    listTabs.set(scope, tab); tabs.append(tab);
  }
  const settingsButton = textNode('button', '', 'btn cloud-chat-settings-button'); settingsButton.type = 'button'; settingsButton.id = 'messages-settings';
  settingsButton.innerHTML = '<i data-lucide="settings-2" aria-hidden="true"></i>';
  settingsButton.setAttribute('aria-label', 'Messaging settings'); settingsButton.setAttribute('aria-haspopup', 'dialog'); settingsButton.setAttribute('aria-controls', 'messages-settings-dialog');
  listToolbar.append(tabs, settingsButton);
  const childrenPanel = textNode('div', '', 'cloud-chat-list-panel'); childrenPanel.id = 'messages-children-panel';
  const groupsPanel = textNode('div', '', 'cloud-chat-list-panel'); groupsPanel.id = 'messages-groups-panel';
  for (const [scope, panel] of [['children', childrenPanel], ['groups', groupsPanel]]) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'messages-tab-' + scope); }
  const settingsDialog = textNode('dialog', '', 'cloud-chat-settings-dialog'); settingsDialog.id = 'messages-settings-dialog'; settingsDialog.setAttribute('aria-labelledby', 'messages-settings-title');
  const settingsHeader = textNode('div', '', 'cloud-chat-settings-heading');
  const settingsTitle = textNode('h2', 'Messaging settings'); settingsTitle.id = 'messages-settings-title';
  const settingsClose = textNode('button', '', 'btn cloud-chat-settings-close'); settingsClose.type = 'button'; settingsClose.setAttribute('aria-label', 'Close messaging settings'); settingsClose.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
  settingsClose.addEventListener('click', () => settingsDialog.close());
  settingsHeader.append(settingsTitle, settingsClose); settingsDialog.append(settingsHeader); section.append(settingsDialog);
  settingsButton.addEventListener('click', () => { settingsDialog.showModal(); settingsClose.focus(); });
  settingsDialog.addEventListener('close', () => { if (active) settingsButton.focus(); });
  const peerLabel = textNode('label', '', 'cloud-peer-setting');
  const peerToggle = document.createElement('input'); peerToggle.type = 'checkbox'; peerToggle.setAttribute('role', 'switch'); peerToggle.setAttribute('aria-describedby', 'messages-peer-hint');
  peerLabel.append(textNode('span', 'Kid-to-kid chats'), peerToggle);
  const peerHint = textNode('small', 'Allow sibling chats and group replies. You can review or close any chat.'); peerHint.id = 'messages-peer-hint';
  const settingsStatus = textNode('p', '', 'cloud-chat-settings-status'); settingsStatus.setAttribute('role', 'status');
  const peerSettings = textNode('div', '', 'cloud-peer-settings'); peerSettings.append(peerLabel, peerHint, settingsStatus); settingsDialog.append(peerSettings);
  peerToggle.addEventListener('change', async () => {
    const desired = peerToggle.checked; peerSaving = true; peerRevision++; peerToggle.disabled = true;
    settingsStatus.textContent = 'Saving…'; settingsStatus.classList.remove('is-error');
    try { const saved = await request('peer-message-settings', { enabled: desired });
      if (saved.peerMessagingEnabled !== desired) throw new Error('The sibling messaging setting could not be confirmed.');
      peerEnabled = desired; if (selected === FAMILY || groupId(selected)) render();
      settingsStatus.textContent = desired ? 'On · Children can chat with siblings.' : 'Off · Sibling chats are paused. History is kept.';
    } catch (failure) { settingsStatus.textContent = failure.message + ' The previous setting is still shown.'; settingsStatus.classList.add('is-error'); }
    finally { peerSaving = false; peerToggle.disabled = false; renderStudents(); }
  });
  const groupList = textNode('div', '', 'cloud-group-list');
  const groupRows = textNode('div', '', 'cloud-chat-group-rows');
  const archiveGroups = textNode('button', '', 'btn cloud-chat-archive-groups'); archiveGroups.type = 'button'; archiveGroups.id = 'messages-archived-groups';
  archiveGroups.addEventListener('click', () => { archivedGroups = !archivedGroups; listQueries.groups = ''; search.value = ''; groupRows.scrollTop = 0; renderStudents(); });
  el('messages-student-list').before(listToolbar, search, childrenPanel, groupsPanel);
  childrenPanel.append(el('messages-student-list')); groupRows.append(familyButton, groupList); groupsPanel.append(messageAll, archiveGroups, groupRows);
  familyButton.classList.add('cloud-chat-group-row');
  familyButton.innerHTML = '<i data-lucide="house" aria-hidden="true"></i><span class="cloud-chat-group-copy"><strong>Family conversation</strong><small>Everyone in your family</small></span>';
  search.addEventListener('input', () => { listQueries[listScope] = search.value; renderStudents(); });
  function setListScope(scope) {
    listQueries[listScope] = search.value; listScope = scope; search.value = listQueries[scope];
    search.placeholder = scope === 'children' ? 'Search your children' : 'Search groups'; search.setAttribute('aria-label', search.placeholder);
    renderStudents();
  }
  back.addEventListener('click', () => { pauseMedia(); clearTimeout(timer); showConversation(false); void loadGroups(); renderStudents(); (selected === ALL_KIDS ? messageAll : selected === FAMILY ? familyButton : groupId(selected) ? groupList.querySelector('[aria-pressed="true"]') : el('messages-student-list').querySelector('[aria-pressed="true"]'))?.focus(); });
  el('messages-reply-input').placeholder = 'Message…';
  el('messages-attachment').setAttribute('aria-label', 'Attach an image, PDF or audio file');
  el('messages-attachment-clear').innerHTML = '<i data-lucide="x" aria-hidden="true"></i><span>Clear attachment</span>';
  el('messages-attachment-clear').setAttribute('aria-label', 'Remove attachment');
  const help = document.createElement('details'); help.className = 'cloud-chat-help';
  const summary = document.createElement('summary'); summary.textContent = 'About messages';
  const helpNote = document.querySelector('.cloud-messages-panel > .cloud-note');
  settingsDialog.append(help); help.append(summary, helpNote);
  function showConversation(value) { section.dataset.messageView = value ? 'thread' : 'list'; document.body.classList.toggle('cloud-conversation-open', active && value); sizeInput(); publishConversationView(); }
  function publishConversationView() {
    const studentId = conversationVisible() && selected !== ALL_KIDS && selected !== FAMILY && !groupId(selected) && live && !error && section.dataset.messageLoad === 'ready' ? selected : null;
    window.parent.postMessage({type:'bodeeguard-conversation-view',studentId},location.origin);
  }
  window.addEventListener('message', event => {
    if(event.origin===location.origin && event.source===window.parent && event.data?.type==='bodeeguard-conversation-view-request') publishConversationView();
  });
  function conversationVisible() { return active && !document.hidden && selected && (!mobile.matches || section.dataset.messageView === 'thread'); }
  function sizeInput() {
    const input = el('messages-reply-input'); input.style.removeProperty('height');
    if (mobile.matches) { input.style.height = '44px'; input.style.height = `${Math.min(112, Math.max(44, input.scrollHeight + 2))}px`; }
  }
  function newBroadcastDraft() {
    if (selected === FAMILY && broadcastResult && !pending.has(FAMILY)) { broadcastResult = null; note(''); renderFamily(); }
  }
  el('messages-reply-input').addEventListener('input', () => { sizeInput(); newBroadcastDraft(); });
  el('messages-reply-input').title = 'Enter to send; Shift+Enter for a new line.';
  el('messages-reply-input').setAttribute('aria-description', 'Enter to send; Shift+Enter for a new line.');
  el('messages-reply-input').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const send = el('messages-reply-btn');
    if (event.repeat || event.currentTarget.disabled || send.disabled) return;
    el('messages-reply-box').requestSubmit(send);
  });
  mobile.addEventListener('change', () => { publishConversationView(); sizeInput(); if (conversationVisible()) void refresh(); else { clearTimeout(timer); pauseMedia(); } });
  let previewFile = null, previewUrl = null, recordingChild = null;
  const voicePanel = document.createElement('div'); voicePanel.className = 'cloud-chat-voice';
  voicePanel.innerHTML = '<div class="cloud-chat-voice-actions"><button id="messages-record" class="btn btn-secondary" type="button" disabled><i data-lucide="mic"></i><span>Record voice</span></button><span id="messages-record-status" role="status"></span></div><div id="messages-voice-preview" class="cloud-chat-voice-preview" hidden><audio id="messages-voice-audio" controls preload="metadata" aria-label="Preview your voice message"></audio><span id="messages-voice-duration"></span><button id="messages-voice-discard" class="btn btn-secondary" type="button"><i data-lucide="trash-2"></i>Discard</button></div>';
  el('messages-compose-tools').prepend(voicePanel);
  helpNote.textContent = 'Record a voice message up to 60 seconds, or attach a photo up to 20 MB (compressed automatically), PDF or audio file up to 2 MB. Messages travel over an encrypted connection. Received means delivered to the computer.';
  const voice = createVoiceRecorder({ onChange: value => {
    const recording = value.phase === 'recording', label = el('messages-record').querySelector('span');
    label.textContent = recording ? 'Stop recording' : 'Record voice';
    el('messages-record').setAttribute('aria-label', label.textContent);
    el('messages-record').classList.toggle('recording', recording);
    const mark = document.createElement('i'); mark.dataset.lucide = recording ? 'square' : 'mic';
    el('messages-record').firstElementChild.replaceWith(mark); window.lucide?.createIcons();
    el('messages-record-status').textContent = value.error || ({ requesting: 'Opening microphone…', recording: `${Math.floor(value.seconds / 60)}:${String(value.seconds % 60).padStart(2, '0')} / 1:00`, finishing: 'Preparing preview…' }[value.phase] || '');
    if (value.phase === 'ready' && recordingChild === selected) {
      const extension = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' }[value.blob.type.split(';')[0]];
      const file = new File([value.blob], `Voice message.${extension}`, { type: value.blob.type });
      localFiles.set(selected, file); voices.set(selected, { file, seconds: value.seconds }); newBroadcastDraft();
      note('Listen to your recording, then press Send.');
    }
    controls();
  } });
  function recordingBusy() { return ['requesting', 'recording', 'finishing'].includes(voice.state().phase); }
  function preview() {
    const value = voices.get(selected), file = value?.file || null;
    if (previewFile !== file) {
      const audio = el('messages-voice-audio'); audio.pause(); audio.removeAttribute('src');
      if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; previewFile = file;
      if (file) { previewUrl = URL.createObjectURL(file); audio.src = previewUrl; }
    }
    el('messages-voice-preview').hidden = !file;
    el('messages-voice-duration').textContent = value ? `${value.seconds}s · Ready to send` : '';
  }
  const reconnect = document.createElement('div'); reconnect.className = 'cloud-chat-reconnect'; reconnect.hidden = true;
  const retry = textNode('button', 'Retry connection', 'btn btn-secondary'); retry.type = 'button';
  const signIn = textNode('a', 'Sign in', 'btn btn-primary'); signIn.rel = 'noopener';
  reconnect.append(retry, signIn); el('messages-cloud-status').after(reconnect);
  const session = createParentSessionRecovery({ onState: state => {
    if (state === 'checking') note('Reconnecting to your messages…');
  } });
  retry.addEventListener('click', () => { reconnect.hidden = true; void refresh(); });
  signIn.target = '_top';
  signIn.addEventListener('click', event => {
    if (el('messages-reply-input').value.trim() || [...drafts.values()].some(Boolean) || pending.size || localFiles.size || recordingBusy()) {
      // The trusted outer page opens sign-in; the sandboxed conversation stays
      // in place with its unsent text/files. No draft goes into storage or a URL.
      event.preventDefault();
      window.parent.postMessage({ type: 'bodeeguard-sign-in', studentId: selected === ALL_KIDS || selected === FAMILY || groupId(selected) ? '' : selected }, location.origin);
      note('Sign in in the new window, then return here and retry. Your draft stays here.');
    }
  });
  function recoveryActions(authentication = false) {
    reconnect.hidden = false; signIn.hidden = !authentication;
    const target = '/guard/dashboard/' + (selected && selected !== ALL_KIDS && selected !== FAMILY && !groupId(selected) ? '?conversation=' + encodeURIComponent(selected) : '') + '#messages';
    signIn.href = '/guard/sign-in/?redirect_url=' + encodeURIComponent(target);
  }
  function note(text) { el('messages-cloud-status').textContent = text; el('messages-cloud-status').classList.toggle('is-routine', text === 'Messages updated.'); }
  async function request(action, input) {
    const options = { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(28000),
      redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, action }) };
    let response;
    try {
      response = ['list-messages', 'list-family-messages', 'read-file'].includes(action)
        ? await session.readMessages(endpoint, { ...input, action }, options)
        : await fetch(action === 'upload-file' ? endpoint.replace(/bridge\/?$/, 'upload/') : endpoint, options);
    } catch (failure) { if (failure.sessionRecovery) recoveryActions(true); throw failure; }
    const value = await response.json();
    if (!response.ok) {
      if (response.status === 401) recoveryActions(true);
      const failure = new Error(response.status === 401 ? 'Sign in again to open messages.' : value.error || 'Messages could not sync.');
      failure.status = response.status;
      throw failure;
    }
    return value;
  }
  function controls() {
    const closed = Boolean(groupId(selected) && (page?.group || groups.find(group => group.id === groupId(selected)))?.closedAt);
    el('messages-reply-box').hidden = closed;
    el('messages-reply-input').disabled = !selected || closed || sending || pending.has(selected);
    el('messages-reply-btn').disabled = !selected || closed || sending || recordingBusy() || (selected === ALL_KIDS && !chosenKids.size);
    el('messages-attachment').disabled = !selected || sending || recordingBusy() || pending.has(selected) || Boolean(attachments.get(selected)) || Boolean(voices.get(selected));
    el('messages-attachment-clear').disabled = !selected || sending || recordingBusy() || pending.has(selected);
    el('messages-voice-discard').disabled = sending || pending.has(selected);
    el('messages-record').disabled = !selected || sending || pending.has(selected) || ['requesting', 'finishing'].includes(voice.state().phase) || voice.state().phase !== 'recording' && Boolean(localFiles.get(selected) || attachments.get(selected));
    el('messages-attachment-status').textContent = attachments.get(selected)?.name || localFiles.get(selected)?.name || '';
    el('messages-attachment-status').hidden = voices.has(selected);
    el('messages-attachment-clear').hidden = !attachments.has(selected) && !localFiles.has(selected) || voices.has(selected);
    const sendLabel = sending ? 'Sending…' : selected === ALL_KIDS || groupId(selected) ? (pending.has(selected) ? 'Retry message' : 'Send to group') : selected === FAMILY ? (pending.has(selected) ? 'Retry message' : 'Send to family') : pending.has(selected) ? 'Retry same message' : 'Send';
    el('messages-reply-btn').innerHTML = `<i data-lucide="send" aria-hidden="true"></i><span>${sendLabel}</span>`;
    el('messages-reply-btn').setAttribute('aria-label', sendLabel);
    el('messages-record').setAttribute('aria-label', el('messages-record').querySelector('span').textContent);
    retry.disabled = loading || sending;
    el('messages-older').disabled = !selected || loading || !(cursor === undefined ? page?.nextBefore : cursor);
    el('messages-older').hidden = !(cursor === undefined ? page?.nextBefore : cursor);
    sizeInput(); preview(); window.lucide?.createIcons();
  }
  function messageMeta(message) {
    const date = new Date(message.createdAt);
    const today = date.toDateString() === new Date().toDateString();
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${today ? '' : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) + ' · '}${time}${message.sender === 'parent' ? ' · ' + (message.receivedAt ? 'Received' : 'Saved online') : ''}`;
  }
  function render() {
    if (selected === ALL_KIDS || selected === FAMILY || groupId(selected)) { renderFamily(); controls(); return; }
    const messages = [...older, ...(page?.messages || [])];
    const unique = [...new Map(messages.map(message => [message.id, message])).values()];
    const thread = el('messages-thread-content');
    const key = JSON.stringify(unique);
    if (thread.dataset.rendered !== key) {
      const atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
      threadRows.update(unique, { fingerprint: message => JSON.stringify([selected, message.sender, message.body, message.attachment]), refresh: (row, message) => {
        row.querySelector('.cloud-message-meta').textContent = messageMeta(message);
        row.messageReactions.update(message.reactions);
      }, create: message => {
        const row = document.createElement('article'); row.className = `cloud-message ${message.sender === 'parent' ? 'parent' : 'child'}`;
        const meta = document.createElement('small'); meta.className = 'cloud-message-meta'; meta.textContent = messageMeta(message);
        const body = document.createElement('p'); body.textContent = message.body;
        meta.title = new Date(message.createdAt).toLocaleString();
        row.append(body);
        if(message.sender==='child' && message.body.startsWith('🎵 Song request:')) {
          const review=document.createElement('button');review.type='button';review.className='btn btn-secondary';review.textContent='Review song requests';
          review.onclick=()=>document.dispatchEvent(new CustomEvent('cloud-open-song-requests'));row.append(review);
        }
        const attachment = message.attachment ? window.cloudFileTools.attachment(message.attachment, () => request('read-file', { id: message.attachment.id })) : null;
        if (attachment) row.append(attachment);
        row.append(meta);
        const child = selected;
        const reactions = createMessageReactions({ messageElement: row, otherChild: students.find(student => student.id === child)?.name || 'Child', onReact: async emoji => {
          if (selected !== child || !conversationVisible()) throw new Error('Reopen this conversation before reacting.');
          const result = await request('react-message', { studentId: child, messageId: message.id, emoji });
          if (selected !== child || result.id !== message.id || result.studentId !== child || !result.saved || !Array.isArray(result.reactions)) throw new Error('The reaction could not be confirmed. Reopen this conversation.');
          older = older.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item);
          if (page) page = { ...page, version: null, messages: page.messages.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item) };
          render();
          return result.reactions;
        } });
        row.messageReactions = reactions; row.append(reactions.node);
        return { node: row, dispose: () => { reactions.dispose(); attachment?.dispose?.(); } };
      } });
      thread.dataset.rendered = key;
      if (atBottom) thread.scrollTop = thread.scrollHeight;
    }
    const uncertain = pending.get(selected);
    if (uncertain && unique.some(message => message.id === uncertain.id)) {
      pending.delete(selected); drafts.delete(selected); attachments.delete(selected); localFiles.delete(selected); voices.delete(selected); voice.cancel(); el('messages-reply-input').value = ''; el('messages-attachment').value = '';
    }
    controls();
    markVisibleConversation();
  }
  function markVisibleConversation() {
    if (selected === ALL_KIDS || selected === FAMILY || groupId(selected)) return;
    const thread=el('messages-thread-content');
    if(!conversationVisible()||thread.scrollHeight-thread.scrollTop-thread.clientHeight>=40)return;
    const latest=page?.messages.filter(message=>message.sender==='child').at(-1);
    if(latest)window.parent.postMessage({type:'bodeeguard-conversation-read',studentId:selected,messageId:latest.id},location.origin);
  }
  el('messages-thread-content').addEventListener('scroll',markVisibleConversation,{passive:true});
  async function refresh() {
    if (!conversationVisible()) return;
    if (selected === ALL_KIDS) { render(); return; }
    if (loading) { refreshQueued = true; return; }
    clearTimeout(timer); loading = true; controls();
    const child = selected; const ticket = generation;
    try {
      const result = child === FAMILY
        ? await request('list-family-messages', { version: page?.version })
        : groupId(child) ? await request('list-group-messages', { groupId: groupId(child), version: page?.version })
        : await request('list-messages', { studentId: child,
          version: page?.version, receivedIds: page?.messages.filter(message => message.sender === 'child' && !message.receivedAt).map(message => message.id) || [] });
      if (ticket !== generation || child !== selected || child !== FAMILY && !groupId(child) && result.studentId !== child) return;
      if (!result.notModified) {
        page = result;
        if (child !== FAMILY && !groupId(child)) for (const message of result.messages || []) if (message.sender === 'child') rememberChildMessage(child, message.sequence);
        renderStudents();
      } else if (groupId(child) && page && result.group) page.group = result.group;
      failures = 0; error = ''; reconnect.hidden = true; section.dataset.messageLoad = 'ready'; render();
      note(pending.has(child) ? 'Send status is uncertain. The draft is retained; Retry uses the same message ID.' : 'Messages updated.');
    } catch (failure) {
      if (ticket !== generation) return;
      failures++; error = failure.message; section.dataset.messageLoad = 'error';
      recoveryActions(Boolean(failure.sessionRecovery || failure.status === 401));
      note(`${error} ${page ? 'Previously loaded messages are still shown. ' : ''}Your draft stays here while you reconnect.`);
    } finally {
      loading = false; controls(); publishConversationView();
      if (conversationVisible() && (refreshQueued || ticket !== generation || !live || failures)) timer = setTimeout(refresh, refreshQueued || ticket !== generation ? 0 : Math.min(15 * 60000, 5 * 60000 * 2 ** Math.min(failures, 2)));
      refreshQueued = false;
    }
  }
  function choose(child) {
    if (child) setListScope(child === ALL_KIDS || child === FAMILY || groupId(child) ? 'groups' : 'children');
    showConversation(Boolean(child));
    if (mobile.matches && child) back.focus();
    if (selected === child) { void refresh(); return; }
    voice.cancel(); threadRows.clear(); familyThreadRows.clear(); delete el('messages-thread-content').dataset.rendered;
    if (selected) drafts.set(selected, el('messages-reply-input').value);
    selected = child; generation++; page = null; older = []; cursor = undefined;
    if (child === ALL_KIDS && !chosenInitialized && !pending.has(ALL_KIDS)) { chosenKids = new Set(recipients().map(student => student.id)); chosenInitialized = true; }
    reconnect.hidden = true; section.dataset.messageLoad = 'loading'; publishConversationView();
    window.cloudFileTools.close(); el('messages-attachment').value = '';
    el('messages-reply-input').value = drafts.get(child) || '';
    const group = groups.find(item => item.id === groupId(child));
    const name = child === ALL_KIDS ? 'New group message' : child === FAMILY ? 'Family conversation' : group ? 'Group conversation' : students.find(student => student.id === child)?.name || 'Conversation';
    el('messages-thread-header').textContent = name; threadAvatar.textContent = child === ALL_KIDS || child === FAMILY || group ? 'All' : child ? initials(name) : ''; threadAvatar.hidden = !child;
    render(); renderStudents(); note(child === ALL_KIDS ? 'Choose recipients and send a group message.' : 'Loading conversation…'); void refresh();
  }
  async function loadGroups() {
    const revision = peerRevision;
    try { const result = await request('list-message-groups', {}); groups = result.groups || []; if (!peerSaving && revision === peerRevision) peerEnabled = result.peerMessagingEnabled === true; renderStudents();
      if (groupId(selected) && !groups.some(group => group.id === groupId(selected))) choose(null);
    } catch (failure) { if (groupId(selected)) note(`Group conversations could not load. ${failure.message}`); }
  }
  function renderStudents() {
    const focused = document.activeElement;
    const focusedChild = el('messages-student-list').contains(focused) ? focused.dataset.studentId : null;
    const focusedGroup = groupList.contains(focused) ? focused.dataset.groupId : null;
    if (!peerSaving) peerToggle.checked = peerEnabled;
    settingsButton.setAttribute('aria-label', 'Messaging settings. Kid-to-kid chats ' + (peerEnabled ? 'on' : 'off'));
    settingsButton.classList.toggle('has-kid-chats', peerEnabled);
    childrenPanel.hidden = listScope !== 'children'; groupsPanel.hidden = listScope !== 'groups';
    for (const [scope, tab] of listTabs) { tab.setAttribute('aria-selected', String(listScope === scope)); tab.tabIndex = listScope === scope ? 0 : -1; tab.querySelector('.cloud-chat-tab-count').textContent = String(scope === 'children' ? recipients().length : groups.filter(group => !group.closedAt).length + 1); }
    const childQuery = listQueries.children.trim().toLocaleLowerCase(), groupQuery = listQueries.groups.trim().toLocaleLowerCase();
    familyButton.hidden = archivedGroups || !'family conversation everyone in your family'.includes(groupQuery);
    messageAll.hidden = archivedGroups;
    archiveGroups.innerHTML = archivedGroups ? '<i data-lucide="arrow-left" aria-hidden="true"></i><span>Back to active groups</span>' : '<i data-lucide="archive" aria-hidden="true"></i><span>Archived (' + groups.filter(group => group.closedAt).length + ')</span>';
    archiveGroups.setAttribute('aria-pressed', String(archivedGroups));
    if (listScope === 'groups') { search.placeholder = archivedGroups ? 'Search archived chats' : 'Search groups'; search.setAttribute('aria-label', search.placeholder); }
    window.lucide?.createIcons({ root: archiveGroups });
    messageAll.disabled = false;
    messageAll.setAttribute('aria-pressed', String(selected === ALL_KIDS));
    messageAll.querySelector('strong').textContent = 'New group message';
    messageAll.querySelector('small').textContent = `Choose from ${recipients().length} ${recipients().length === 1 ? 'child' : 'kids'}`;
    familyButton.setAttribute('aria-pressed', String(selected === FAMILY));
    const matchedGroups = groups.filter(group => Boolean(group.closedAt) === archivedGroups).filter(group => group.members.some(member => member.name.toLocaleLowerCase().includes(groupQuery)) || (group.kind === 'siblings' ? 'sibling chat' : 'group chat').includes(groupQuery));
    groupList.replaceChildren(...matchedGroups.map(group => {
      const names = group.members.map(member => member.name).join(', ');
      const all = group.members.length === recipients().length && group.members.every(member => recipients().some(student => student.id === member.studentId));
      const button = textNode('button', '', 'btn btn-secondary cloud-group-list-item cloud-chat-group-row');
      button.type = 'button'; button.title = names; button.dataset.groupId = group.id; button.setAttribute('aria-pressed', String(groupKey(group.id) === selected));
      button.setAttribute('aria-label', names + (group.closedAt ? ', closed chat' : ''));
      const icon = document.createElement('i'); icon.dataset.lucide = 'users'; icon.setAttribute('aria-hidden', 'true');
      const copy = textNode('span', '', 'cloud-chat-group-copy'); copy.append(textNode('strong', all ? 'All children' : names), textNode('small', group.members.length + ' children · ' + (group.kind === 'siblings' ? 'Sibling chat' : 'Group chat')));
      button.append(icon, copy); if (group.closedAt) button.append(textNode('span', group.duplicateOf ? 'Earlier chat' : 'Archived', 'cloud-chat-closed-badge'));
      button.addEventListener('click', () => choose(groupKey(group.id)));
      return button;
    }));
    if (!matchedGroups.length && familyButton.hidden) groupList.append(textNode('p', groupQuery ? 'No groups match your search.' : 'No archived chats.', 'cloud-chat-list-empty'));
    const matches = recipients().filter(student => student.name.toLocaleLowerCase().includes(childQuery))
      .sort((a, b) => { const left = recentChildMessages.get(a.id) || 0n, right = recentChildMessages.get(b.id) || 0n; return left === right ? 0 : left > right ? -1 : 1; });
    el('messages-student-list').replaceChildren(...matches.map(student => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary cloud-chat-person'; button.dataset.studentId = student.id;
      const count=unread.get(student.id)||0;
      const avatar = document.createElement('span'); avatar.className = 'cloud-chat-avatar'; avatar.setAttribute('aria-hidden', 'true'); avatar.textContent = initials(student.name);
      const copy = document.createElement('span'); copy.className = 'cloud-chat-person-copy';
      const name = document.createElement('strong'); name.textContent = student.name;
      const hint = document.createElement('small'); hint.textContent = count ? 'New message' + (count === 1 ? '' : 's') : 'Open conversation';
      copy.append(name, hint); button.append(avatar, copy);
      button.setAttribute('aria-label', student.name + (count ? ', ' + count + ' unread messages' : ''));
      if(count){const badge=document.createElement('span');badge.className='cloud-unread-badge';badge.textContent=count>99?'99+':String(count);button.append(badge);}
      button.setAttribute('aria-pressed', String(student.id === selected)); button.addEventListener('click', () => choose(student.id)); return button;
    }));
    window.lucide?.createIcons({ root: groupRows });
    if (focusedChild || focusedGroup) { const rows = focusedChild ? el('messages-student-list').children : groupList.children; (Array.from(rows).find(row => focusedChild ? row.dataset.studentId === focusedChild : row.dataset.groupId === focusedGroup) || listTabs.get(listScope)).focus(); }
    if (!matches.length) { const empty = document.createElement('p'); empty.className = 'cloud-chat-list-empty'; empty.textContent = students.length ? 'No children match your search.' : 'Your children’s conversations will appear here.'; el('messages-student-list').append(empty); }
  }
  function canChooseAttachment() {
    return Boolean(selected) && !sending && !recordingBusy() && !pending.has(selected) && !attachments.has(selected) && !voices.has(selected);
  }
  function stageAttachment(file) {
    if (!canChooseAttachment()) return;
    if (!file || !file.size || file.size > (/^image\/(?:jpeg|png|webp)$/.test(file.type) ? 20 : 2) * 1024 * 1024) {
      note('Choose one photo under 20 MB, or a PDF or audio file under 2 MB. Photos are compressed when sent.');
      return;
    }
    if (!/\.(?:png|jpe?g|webp|pdf|wav|mp3|webm|ogg)$/i.test(file.name)) {
      note('Messages accepts PNG, JPEG, WebP, PDF, WAV, MP3, WebM, or OGG files.');
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    el('messages-attachment').files = transfer.files;
    localFiles.set(selected, file); newBroadcastDraft();
    controls();
    note(`${file.name} is ready to send.`);
  }
  const dropZone = el('messages-attachment-dropzone');
  const clearDropState = () => dropZone.classList.remove('is-dragging');
  dropZone.addEventListener('dragenter', event => {
    if (!canChooseAttachment() || !Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragover', event => {
    if (!canChooseAttachment() || !Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', clearDropState);
  dropZone.addEventListener('drop', event => {
    if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
    event.preventDefault();
    clearDropState();
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length !== 1) {
      note('Drop one image, PDF, or audio file at a time.');
      return;
    }
    stageAttachment(files[0]);
  });
  el('messages-attachment').addEventListener('change', () => {
    if (!selected || attachments.has(selected)) return;
    const file = el('messages-attachment').files[0]; if (file) { localFiles.set(selected, file); newBroadcastDraft(); } else localFiles.delete(selected);
    controls();
  });
  function clearAttachment() {
    if (!selected || sending || pending.has(selected)) return;
    attachments.delete(selected); localFiles.delete(selected); voices.delete(selected); voice.cancel(); el('messages-attachment').value = ''; controls(); note('Attachment cleared.');
  }
  el('messages-attachment-clear').addEventListener('click', clearAttachment);
  el('messages-voice-discard').addEventListener('click', clearAttachment);
  el('messages-record').addEventListener('click', () => {
    if (voice.state().phase === 'recording') voice.stop();
    else if (canChooseAttachment() && !localFiles.has(selected)) { recordingChild = selected; void voice.start(); }
  });
  function renderFamily() {
    const family = selected === FAMILY, newGroup = selected === ALL_KIDS;
    const currentGroup = page?.group || groups.find(item => item.id === groupId(selected));
    const batch = pending.get(selected) || (family ? broadcastResult : null);
    const people = batch?.recipients || (currentGroup ? currentGroup.members : recipients().filter(student => chosenKids.has(student.id)).map(student => ({ studentId: student.id, name: student.name })));
    const total = people.length;
    const thread = el('messages-thread-content');
    const atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
    if ((family ? familyPanel : groupPanel).parentElement !== thread) thread.replaceChildren(family ? familyPanel : groupPanel, familyRows);
    familyToggle.checked = Boolean(page?.childrenCanPost);
    familyToggle.disabled = !page || !peerEnabled;
    familyDescription.textContent = peerEnabled ? 'Everyone can read this thread. Turn on replies below if you want children to post here.' :
      'Everyone can read this thread. Turn on sibling messaging from the conversation list before allowing replies.';
    const progress = family ? familyProgress : groupStatus;
    progress.replaceChildren();
    if (!family) {
      groupTitle.textContent = newGroup ? 'Who should receive this?' : currentGroup?.kind === 'siblings' ? currentGroup.members.length > 2 ? 'Sibling group' : 'Sibling chat' : 'Group conversation';
      groupDescription.textContent = newGroup ? `${total} selected · Tap a name to include or remove them. Children can reply when sibling messaging is on.` :
        currentGroup?.duplicateOf ? 'This earlier chat is archived. Its messages are kept here; continue in the existing chat.' : currentGroup?.closedAt ? 'This chat is archived. Reopen it to send messages again.' :
        peerEnabled ? 'Everyone in this chat can read and reply.' : 'Only parents can post while sibling messaging is off.';
      groupPeople.replaceChildren(...recipients().filter(student => newGroup || currentGroup?.members.some(member => member.studentId === student.id)).map(student => {
        const selectedKid = newGroup ? chosenKids.has(student.id) : true;
        const chip = textNode('button', student.name, 'cloud-group-chip'); chip.type = 'button';
        chip.setAttribute('aria-pressed', String(selectedKid)); chip.disabled = !newGroup || Boolean(batch) || sending;
        chip.addEventListener('click', () => { selectedKid ? chosenKids.delete(student.id) : chosenKids.add(student.id); chosenInitialized = true; render(); });
        return chip;
      }));
      groupClose.hidden = newGroup || Boolean(currentGroup?.closedAt);
      groupReopen.hidden = newGroup || !currentGroup?.closedAt;
      groupReopen.textContent = currentGroup?.duplicateOf ? 'Open existing chat' : 'Reopen chat';
      if (newGroup) {
        const match = groups.find(group => !group.duplicateOf && group.members.length === chosenKids.size && group.members.every(member => chosenKids.has(member.studentId)));
        if (match) {
          progress.append(textNode('span', match.closedAt ? 'This chat is archived. Open it and choose Reopen chat before sending.' : 'You already have a chat with these children. Your message will go there.'));
          const open = textNode('button', 'Open existing chat', 'btn btn-secondary'); open.type = 'button';
          open.addEventListener('click', () => { archivedGroups = Boolean(match.closedAt); choose(groupKey(match.id)); }); progress.append(open);
        }
      }
    }
    if (batch) progress.append(textNode('span', sending ? 'Sending to everyone…' : 'This message is ready to retry. No partial post was published.'));
    const messages = [...older, ...(page?.messages || [])];
    const unique = [...new Map(messages.map(message => [message.id, message])).values()];
    familyEmpty.textContent = family ? 'No family messages yet. Send the first one below.' : 'No group messages yet. Send the first one below.';
    familyEmpty.hidden = unique.length > 0 || newGroup;
    if (familyEmpty.parentElement !== familyRows) familyRows.append(familyEmpty);
    familyThreadRows.update(unique, {
      fingerprint: message => JSON.stringify([message.sender, message.senderName, message.body, message.attachment]),
      refresh: (row, message) => row.messageReactions.update(message.reactions),
      create: message => {
        const row = textNode('article', '', `cloud-message ${message.sender === 'parent' ? 'parent' : 'child'}`);
        row.append(textNode('strong', message.senderName || 'Mom & Dad'), textNode('p', message.body));
        const attachment = message.attachment ? window.cloudFileTools.attachment(message.attachment, () => request('read-file', { id: message.attachment.id })) : null;
        if (attachment) row.append(attachment);
        row.append(textNode('small', new Date(message.createdAt).toLocaleString()));
        const conversation = selected;
        const reactions = createMessageReactions({ messageElement: row, onReact: async emoji => {
          if (selected !== conversation || !conversationVisible()) throw new Error('Reopen this conversation before reacting.');
          const result = await request('react-message', { shared: true, groupId: groupId(conversation), messageId: message.id, emoji });
          if (selected !== conversation || result.id !== message.id || !result.saved || !Array.isArray(result.reactions)) throw new Error('The reaction could not be confirmed.');
          older = older.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item);
          if (page) page = { ...page, version: null, messages: page.messages.map(item => item.id === message.id ? { ...item, reactions: result.reactions } : item) };
          render(); return result.reactions;
        } });
        row.messageReactions = reactions; row.append(reactions.node);
        return { node: row, dispose: () => { reactions.dispose(); attachment?.dispose?.(); } };
      }
    });
    if (atBottom) thread.scrollTop = thread.scrollHeight;
  }
  function restoreComposerFocus(recipient, wasComposing) {
    const input = el('messages-reply-input');
    if (!wasComposing || selected !== recipient || !active || document.hidden || input.disabled) return;
    if (![document.body, document.documentElement, input, el('messages-reply-btn')].includes(document.activeElement)) return;
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }
  }
  async function sendShared(wasComposing) {
    const target = selected, family = target === FAMILY, newGroup = target === ALL_KIDS;
    const file = localFiles.get(target) || el('messages-attachment').files[0];
    const body = el('messages-reply-input').value.trim() || (voices.has(target) ? `Voice message · ${voices.get(target).seconds}s` : '');
    if (!pending.has(target) && (!body && !file || newGroup && !chosenKids.size)) return;
    sending = true; controls(); note('Preparing message…');
    let batch = pending.get(target);
    try {
      if (!batch) {
        // Freeze names, recipients, contents and per-child retry IDs before the first write.
        const members = family ? recipients().map(student => ({ studentId: student.id, name: student.name }))
          : newGroup ? recipients().filter(student => chosenKids.has(student.id)).map(student => ({ studentId: student.id, name: student.name }))
          : groups.find(group => group.id === groupId(target))?.members || [];
        if (!members.length) throw new Error('Choose at least one child.');
        batch = { id: crypto.randomUUID(), groupId: family ? null : newGroup ? groupDraftId || crypto.randomUUID() : groupId(target), body,
          recipients: members.map(student => ({ studentId: student.studentId, name: student.name, id: crypto.randomUUID(), uploadId: crypto.randomUUID() })) };
        if (newGroup) groupDraftId = batch.groupId;
        if (file) batch.attachment = await window.cloudFileTools.encode(file, 'message');
        pending.set(target, batch); drafts.set(target, body); if (family) broadcastResult = batch;
      }
      if (newGroup && !batch.created) {
        const created = await request('create-message-group', { id: batch.groupId, studentIds: batch.recipients.map(person => person.studentId) });
        const group = created.group;
        if (!group?.id || !Array.isArray(group.members) || group.members.length !== batch.recipients.length || !group.members.every(member => batch.recipients.some(person => person.studentId === member.studentId))) throw new Error('The group could not be confirmed.');
        groups = [group, ...groups.filter(item => item.id !== group.id)]; renderStudents();
        if (group.closedAt) throw new Error('This chat is archived. Reopen it from Archived before sending.');
        batch.groupId = group.id; batch.created = true;
      }
      if (selected === target) render();
      if (batch.attachment) {
        // Files remain child-scoped; prepare at most three in parallel before publishing the post.
        let next = 0;
        const upload = async () => {
          while (next < batch.recipients.length) {
            const person = batch.recipients[next++]; if (person.fileId) continue;
            const receipt = await request('upload-file', { ...batch.attachment, id: person.uploadId, studentId: person.studentId });
            if (!receipt.saved || receipt.file?.id !== person.uploadId) throw new Error('Attachment confirmation was interrupted. Retry keeps your draft.');
            person.fileId = person.uploadId;
          }
        };
        const uploads = await Promise.allSettled(Array.from({ length: Math.min(3, batch.recipients.length) }, upload));
        const failure = uploads.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
      }
      const receipt = await request('send-shared-message', { familyThreadId: batch.id, groupId: batch.groupId, body: batch.body,
        recipients: batch.recipients.map(person => ({ studentId: person.studentId, id: person.id, ...(person.fileId ? { fileId: person.fileId } : {}) })) });
      if (receipt.id !== batch.id || receipt.saved !== true || receipt.recipients?.length !== batch.recipients.length) throw new Error('The group send could not be confirmed. Retry the same draft.');
      {
        pending.delete(target); drafts.delete(target); attachments.delete(target); localFiles.delete(target); voices.delete(target);
        if (family) broadcastResult = null;
        if (selected === target) { voice.cancel(); el('messages-reply-input').value = ''; el('messages-attachment').value = ''; }
        if (newGroup) { groupDraftId = null; chosenKids = new Set(recipients().map(student => student.id)); chosenInitialized = true; }
      }
      if (selected === target) {
        note('Message saved for this conversation.');
        if (newGroup && !pending.has(target)) choose(groupKey(batch.groupId)); else void refresh();
      }
    } catch (failure) {
      if (selected === target) note(`${failure.message} Your draft is retained.`);
    } finally { sending = false; if (selected === target) render(); else controls(); if (!pending.has(target)) restoreComposerFocus(target, wasComposing); }
  }
  el('messages-reply-box').addEventListener('submit', async event => {
    event.preventDefault(); if (!selected || sending || recordingBusy()) return;
    const composer = el('messages-reply-input');
    const wasComposing = [composer, el('messages-reply-btn')].includes(document.activeElement);
    if (selected === ALL_KIDS || selected === FAMILY || groupId(selected)) { await sendShared(wasComposing); return; }
    const child = selected;
    const file = localFiles.get(child) || el('messages-attachment').files[0];
    const body = el('messages-reply-input').value.trim() || (voices.has(child) ? `Voice message · ${voices.get(child).seconds}s` : ''); if (!body && !attachments.has(child) && !file) return;
    const message = pending.get(child) || { id: crypto.randomUUID(), body };
    pending.set(child, message); drafts.set(child, message.body); sending = true; controls(); note('Sending…');
    try {
      let attachment = attachments.get(child);
      if (!attachment && file) { attachment = await window.cloudFileTools.encode(file, 'message'); attachments.set(child, attachment); }
      if (attachment && !message.fileId) {
        const saved = await request('upload-file', { ...attachment, studentId: child });
        if (saved.file?.id !== attachment.id || !saved.saved) throw new Error('The attachment receipt did not match. Retry the same message.');
        message.fileId = attachment.id;
      }
      const receipt = await request('send-message', { studentId: child, ...message });
      if (receipt.id !== message.id || receipt.studentId !== child || receipt.saved !== true) throw new Error('The message receipt did not match.');
      pending.delete(child); drafts.delete(child); attachments.delete(child); localFiles.delete(child); voices.delete(child);
      if (selected === child) { voice.cancel(); el('messages-reply-input').value = ''; el('messages-attachment').value = ''; note('Message sent.'); }
      void refresh();
    } catch (failure) {
      if ([400, 413, 415].includes(failure.status)) {
        pending.delete(child);
        if (selected === child) note(`${failure.message} Nothing was sent. Your draft is retained so you can edit it.`);
      } else if (selected === child) note(`${failure.message} Draft retained. Retry sends the same message without duplicating it; keep this page open until confirmed.`);
    } finally { sending = false; controls(); if (!pending.has(child)) restoreComposerFocus(child, wasComposing); }
  });
  el('messages-older').addEventListener('click', async () => {
    const before = cursor === undefined ? page?.nextBefore : cursor; if (!selected || loading || !before) return;
    clearTimeout(timer);
    loading = true; controls(); const ticket = generation; const child = selected;
    try {
      const result = child === FAMILY ? await request('list-family-messages', { before }) : groupId(child)
        ? await request('list-group-messages', { groupId: groupId(child), before }) : await request('list-messages', { studentId: child, before });
      if (ticket !== generation || child !== selected || child !== FAMILY && !groupId(child) && result.studentId !== child) return;
      older = [...result.messages, ...older]; cursor = result.nextBefore; render();
    } catch (failure) { if (ticket === generation) note(failure.message); }
    finally { loading = false; controls(); if (conversationVisible() && (refreshQueued || ticket !== generation || !live)) timer = setTimeout(refresh, refreshQueued || ticket !== generation ? 0 : 5 * 60000); refreshQueued = false; }
  });
  function pauseMedia() { if (recordingBusy()) voice.cancel(); el('messages-voice-audio').pause(); threadRows.pause(); familyThreadRows.pause(); }
  document.addEventListener('visibilitychange', () => { publishConversationView(); clearTimeout(timer); if (!document.hidden) { if (active) void loadGroups(); void refresh(); } else pauseMedia(); });
  window.addEventListener('focus', () => { if (error && !loading) void refresh(); });
  window.addEventListener('online', () => { if (error && !loading) void refresh(); });
  window.addEventListener('beforeunload', event => { if ([...pending.keys()].some(key => key === ALL_KIDS || key === FAMILY || groupId(key))) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('pagehide', () => { window.parent.postMessage({type:'bodeeguard-conversation-view',studentId:null},location.origin); clearTimeout(timer); voice.cancel(); threadRows.clear(); familyThreadRows.clear(); if (previewUrl) URL.revokeObjectURL(previewUrl); });
  return {
    setUnread(items){unread=new Map(items.map(item=>[item.studentId,item.count]));for(const item of items)rememberChildMessage(item.studentId,item.sequence);renderStudents();},
    openStudent(id, { focusReply = false } = {}) {
      if (!students.some(student => student.id === id)) return;
      choose(id);
      // Only an explicit notification open requests typing focus. Keep the
      // phone's conversation heading and existing unsent drafts intact.
      const input = el('messages-reply-input');
      if (focusReply && !mobile.matches && active && !document.hidden && !input.disabled) input.focus({ preventScroll: true });
    },
    setLive(value) { if (live === Boolean(value)) return; live = Boolean(value); publishConversationView(); clearTimeout(timer); if (active) return refresh(); },
    notify(studentId) { if ((studentId === selected || selected === FAMILY || groupId(selected)) && active) return refresh(); },
    update(value) { students = value || []; const ids = new Set(recipients().map(student => student.id)); for(const id of recentChildMessages.keys())if(!ids.has(id))recentChildMessages.delete(id); for(const student of recipients())rememberChildMessage(student.id,student.last_child_message_sequence); if (!chosenInitialized) { chosenKids = new Set(ids); chosenInitialized = true; } renderStudents(); if (selected === ALL_KIDS) { if (!recipients().length && !pending.has(ALL_KIDS)) choose(null); else render(); } else if (selected && selected !== FAMILY && !groupId(selected) && !students.some(student => student.id === selected)) choose(null); },
    setActive(value) { active = value; document.body.classList.toggle('cloud-messages-active', active); showConversation(section.dataset.messageView === 'thread'); clearTimeout(timer); if (active) { void loadGroups(); return refresh(); } else { if (settingsDialog.open) settingsDialog.close(); pauseMedia(); } }
  };
}
