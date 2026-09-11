// Existing Admin conversation layout, with only the cloud transport replaced.
import { createVoiceRecorder } from './voice-recording.js';
import { createMessageThread } from './message-thread.js';
export function setupCloudMessages({ endpoint }) {
  const el = id => document.getElementById(id);
  let students = [];
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
  let previewFile = null, previewUrl = null, recordingChild = null;
  const voicePanel = document.createElement('div'); voicePanel.className = 'cloud-chat-voice';
  voicePanel.innerHTML = '<div class="cloud-chat-voice-actions"><button id="messages-record" class="btn btn-secondary" type="button"><i data-lucide="mic"></i><span>Record voice</span></button><span id="messages-record-status" role="status"></span></div><div id="messages-voice-preview" class="cloud-chat-voice-preview" hidden><audio id="messages-voice-audio" controls preload="metadata" aria-label="Preview your voice message"></audio><span id="messages-voice-duration"></span><button id="messages-voice-discard" class="btn btn-secondary" type="button"><i data-lucide="trash-2"></i>Discard</button></div>';
  el('messages-reply-box').prepend(voicePanel);
  document.querySelector('.cloud-messages-panel > .cloud-note').textContent = 'Record a voice message up to 60 seconds, or attach an image, PDF or audio file up to 2 MB. Messages travel over an encrypted connection. Received means delivered to the computer.';
  const voice = createVoiceRecorder({ onChange: value => {
    const recording = value.phase === 'recording', label = el('messages-record').querySelector('span');
    label.textContent = recording ? 'Stop recording' : 'Record voice';
    el('messages-record').classList.toggle('recording', recording);
    const mark = document.createElement('i'); mark.dataset.lucide = recording ? 'square' : 'mic';
    el('messages-record').firstElementChild.replaceWith(mark); window.lucide?.createIcons();
    el('messages-record-status').textContent = value.error || ({ requesting: 'Opening microphone…', recording: `${Math.floor(value.seconds / 60)}:${String(value.seconds % 60).padStart(2, '0')} / 1:00`, finishing: 'Preparing preview…' }[value.phase] || '');
    if (value.phase === 'ready' && recordingChild === selected) {
      const extension = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' }[value.blob.type.split(';')[0]];
      const file = new File([value.blob], `Voice message.${extension}`, { type: value.blob.type });
      localFiles.set(selected, file); voices.set(selected, { file, seconds: value.seconds });
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
  function note(text) { el('messages-cloud-status').textContent = text; }
  async function request(action, input) {
    const response = await fetch(action === 'upload-file' ? endpoint.replace(/bridge\/?$/, 'upload/') : endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(28000),
      redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const value = await response.json();
    if (!response.ok) {
      const failure = new Error(response.status === 401 ? 'Sign in again to open messages.' : value.error || 'Messages could not sync.');
      failure.status = response.status;
      throw failure;
    }
    return value;
  }
  function controls() {
    el('messages-reply-input').disabled = !selected || sending || pending.has(selected);
    el('messages-reply-btn').disabled = !selected || sending || recordingBusy();
    el('messages-attachment').disabled = !selected || sending || recordingBusy() || pending.has(selected) || Boolean(attachments.get(selected)) || Boolean(voices.get(selected));
    el('messages-attachment-clear').disabled = !selected || sending || recordingBusy() || pending.has(selected);
    el('messages-voice-discard').disabled = sending || pending.has(selected);
    el('messages-record').disabled = !selected || sending || pending.has(selected) || ['requesting', 'finishing'].includes(voice.state().phase) || voice.state().phase !== 'recording' && Boolean(localFiles.get(selected) || attachments.get(selected));
    el('messages-attachment-status').textContent = attachments.get(selected)?.name || localFiles.get(selected)?.name || '';
    el('messages-reply-btn').innerHTML = `<i data-lucide="send"></i>${pending.has(selected) ? 'Retry same message' : 'Send'}`;
    el('messages-older').disabled = !selected || loading || !(cursor === undefined ? page?.nextBefore : cursor);
    preview(); window.lucide?.createIcons();
  }
  function render() {
    const messages = [...older, ...(page?.messages || [])];
    const unique = [...new Map(messages.map(message => [message.id, message])).values()];
    const thread = el('messages-thread-content');
    const key = JSON.stringify(unique);
    if (thread.dataset.rendered !== key) {
      const atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 40;
      threadRows.update(unique, { fingerprint: message => JSON.stringify([selected, message.sender, message.body, message.attachment]), refresh: (row, message) => {
        row.querySelector('small').textContent = `${message.sender === 'parent' ? 'Parent' : students.find(student => student.id === selected)?.name || 'Child'} · ${new Date(message.createdAt).toLocaleString()} · ${message.receivedAt ? 'Received' : 'Saved online'}`;
      }, create: message => {
        const row = document.createElement('article'); row.className = `cloud-message ${message.sender === 'parent' ? 'parent' : 'child'}`;
        const meta = document.createElement('small'); meta.textContent = `${message.sender === 'parent' ? 'Parent' : students.find(student => student.id === selected)?.name || 'Child'} · ${new Date(message.createdAt).toLocaleString()} · ${message.receivedAt ? 'Received' : 'Saved online'}`;
        const body = document.createElement('p'); body.textContent = message.body;
        row.append(meta, body);
        if (message.attachment) row.append(window.cloudFileTools.attachment(message.attachment, () => request('read-file', { id: message.attachment.id })));
        return { node: row };
      } });
      thread.dataset.rendered = key;
      if (atBottom) thread.scrollTop = thread.scrollHeight;
    }
    const uncertain = pending.get(selected);
    if (uncertain && unique.some(message => message.id === uncertain.id)) {
      pending.delete(selected); drafts.delete(selected); attachments.delete(selected); localFiles.delete(selected); voices.delete(selected); voice.cancel(); el('messages-reply-input').value = ''; el('messages-attachment').value = '';
    }
    controls();
  }
  async function refresh() {
    if (!active || document.hidden || !selected) return;
    if (loading) { refreshQueued = true; return; }
    clearTimeout(timer); loading = true; controls();
    const child = selected; const ticket = generation;
    try {
      const result = await request('list-messages', { studentId: child,
        version: page?.version, receivedIds: page?.messages.filter(message => message.sender === 'child' && !message.receivedAt).map(message => message.id) || [] });
      if (ticket !== generation || result.studentId !== child) return;
      if (!result.notModified) page = result;
      failures = 0; error = ''; render();
      note(pending.has(child) ? 'Send status is uncertain. The draft is retained; Retry uses the same message ID.' : 'Messages updated.');
    } catch (failure) {
      if (ticket !== generation) return;
      failures++; error = failure.message;
      note(`${error} Showing the last received messages; your draft remains here.`);
    } finally {
      loading = false; controls();
      if (active && !document.hidden && (refreshQueued || ticket !== generation || !live || failures)) timer = setTimeout(refresh, refreshQueued || ticket !== generation ? 0 : Math.min(300000, 30000 * 2 ** Math.min(failures, 4)));
      refreshQueued = false;
    }
  }
  function choose(child) {
    if (selected === child) return;
    voice.cancel(); threadRows.clear(); delete el('messages-thread-content').dataset.rendered;
    if (selected) drafts.set(selected, el('messages-reply-input').value);
    selected = child; generation++; page = null; older = []; cursor = undefined;
    window.cloudFileTools.close(); el('messages-attachment').value = '';
    el('messages-reply-input').value = drafts.get(child) || '';
    el('messages-thread-header').textContent = students.find(student => student.id === child)?.name || 'Conversation';
    render(); renderStudents(); note('Loading conversation…'); void refresh();
  }
  function renderStudents() {
    el('messages-student-list').replaceChildren(...students.map(student => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-secondary'; button.textContent = student.name;
      button.setAttribute('aria-pressed', String(student.id === selected)); button.addEventListener('click', () => choose(student.id)); return button;
    }));
  }
  function canChooseAttachment() {
    return Boolean(selected) && !sending && !recordingBusy() && !pending.has(selected) && !attachments.has(selected) && !voices.has(selected);
  }
  function stageAttachment(file) {
    if (!canChooseAttachment()) return;
    if (!file || file.size > 2 * 1024 * 1024 || !file.size) {
      note('Choose one nonempty image, PDF, or audio file up to 2 MB.');
      return;
    }
    if (!/\.(?:png|jpe?g|webp|pdf|wav|mp3|webm|ogg)$/i.test(file.name)) {
      note('Messages accepts PNG, JPEG, WebP, PDF, WAV, MP3, WebM, or OGG files.');
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    el('messages-attachment').files = transfer.files;
    localFiles.set(selected, file);
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
    const file = el('messages-attachment').files[0]; if (file) localFiles.set(selected, file); else localFiles.delete(selected);
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
  el('messages-reply-box').addEventListener('submit', async event => {
    event.preventDefault(); if (!selected || sending || recordingBusy()) return;
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
    } finally { sending = false; controls(); }
  });
  el('messages-older').addEventListener('click', async () => {
    const before = cursor === undefined ? page?.nextBefore : cursor; if (!selected || loading || !before) return;
    clearTimeout(timer);
    loading = true; controls(); const ticket = generation; const child = selected;
    try {
      const result = await request('list-messages', { studentId: child, before });
      if (ticket !== generation || result.studentId !== child) return;
      older = [...result.messages, ...older]; cursor = result.nextBefore; render();
    } catch (failure) { if (ticket === generation) note(failure.message); }
    finally { loading = false; controls(); if (active && !document.hidden && (refreshQueued || ticket !== generation || !live)) timer = setTimeout(refresh, refreshQueued || ticket !== generation ? 0 : 30000); refreshQueued = false; }
  });
  function pauseMedia() { if (recordingBusy()) voice.cancel(); el('messages-voice-audio').pause(); threadRows.pause(); }
  document.addEventListener('visibilitychange', () => { clearTimeout(timer); if (!document.hidden) void refresh(); else pauseMedia(); });
  window.addEventListener('pagehide', () => { clearTimeout(timer); voice.cancel(); threadRows.clear(); if (previewUrl) URL.revokeObjectURL(previewUrl); });
  return {
    openStudent(id) { if (students.some(student => student.id === id)) choose(id); },
    setLive(value) { if (live === Boolean(value)) return; live = Boolean(value); clearTimeout(timer); if (active) return refresh(); },
    notify(studentId) { if (studentId === selected && active) return refresh(); },
    update(value) { students = value || []; renderStudents(); if (selected && !students.some(student => student.id === selected)) choose(null); },
    setActive(value) { active = value; clearTimeout(timer); if (active) return refresh(); else pauseMedia(); }
  };
}
