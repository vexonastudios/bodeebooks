'use strict';
// Shared private-file UI for the parent browser and isolated child renderer.
// Bytes arrive only from authenticated APIs; no storage URL or token is used.
(() => {
  const maximum = 2 * 1024 * 1024;
  const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg']);
  const accept = '.png,.jpg,.jpeg,.webp,.pdf,.wav,.mp3,.webm,.ogg';
  const element = (tag, text = '') => { const item = document.createElement(tag); item.textContent = text; return item; };
  const button = (text, action) => { const item = element('button', text); item.type = 'button'; item.className = 'btn btn-secondary'; item.addEventListener('click', action); return item; };
  async function prepareMessageImage(file) {
    if (!/^image\/(?:jpeg|png|webp)$/.test(file.type)) return file;
    if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo under 20 MB. Your original is unchanged.');
    if (file.size <= 300 * 1024) return file;
    let bitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { throw new Error('This photo could not be opened. Try a JPG, PNG, or WebP image. Your draft is retained.'); }
    try {
      for (const [edge, quality] of [[1800, .82], [1400, .7], [1100, .6]]) {
        const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Photo compression is unavailable on this device. Your draft is retained.');
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => canvas.toBlob(resolve, 'image/jpeg', quality));
        canvas.width = canvas.height = 0;
        if (!blob) throw new Error('Photo compression failed. Your draft is retained.');
        if (blob.size <= maximum && blob.size < file.size) return new File([blob], (file.name || 'Photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    } finally { bitmap.close(); }
    if (file.size <= maximum) return file;
    throw new Error('This photo is still too large after compression. Your original and message draft are unchanged.');
  }
  async function encode(file, purpose) {
    if (!file || !file.size) throw new Error('Choose a nonempty file. Your draft is retained.');
    if (purpose === 'message') file = await prepareMessageImage(file);
    if (file.size > maximum) throw new Error('Choose a file up to 2 MB. Photos are compressed automatically; your original and draft are unchanged.');
    const bytes = new Uint8Array(await file.arrayBuffer()); let binary = '';
    for (let index = 0; index < bytes.length; index += 16384) binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
    return { id: crypto.randomUUID(), name: file.name, mime: file.type, purpose, data: btoa(binary) };
  }
  let current = null;
  let generation = 0;
  function close() {
    generation++;
    if (!current) return;
    const { dialog, url } = current; current = null;
    dialog.querySelector('audio')?.pause(); dialog.remove(); if (url) URL.revokeObjectURL(url);
  }
  async function preview(load, { review, remove } = {}) {
    close(); const ticket = generation;
    const dialog = element('dialog'); dialog.className = 'cloud-file-dialog';
    const status = element('p', 'Opening private file…'); status.setAttribute('role', 'status');
    dialog.append(button('Close', close), status); document.body.append(dialog); dialog.showModal();
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    current = { dialog, url: null };
    try {
      const value = await load(); if (ticket !== generation) return;
      let file = value.file;
      if (!types.has(file?.mime) || typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4) throw new Error('The private file response was invalid.');
      const binary = atob(value.data); if (binary.length !== file.size || binary.length > maximum) throw new Error('The private file size did not match.');
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.mime })); current.url = url;
      dialog.prepend(element('h2', file.name)); status.textContent = file.reviewedAt ? 'Reviewed by your parent.' : 'Private family file. Downloading saves a copy on this computer.';
      const download = element('a', 'Download original copy'); download.href = url;
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'application/pdf': 'pdf', 'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/webm': 'webm', 'audio/ogg': 'ogg' }[file.mime];
      download.download = `${file.name.replace(/[^\p{L}\p{N} ._-]/gu, '_').replace(/\.[^.]*$/, '').slice(0, 120) || 'BodeeGuard-file'}.${extension}`;
      download.className = 'btn btn-primary'; dialog.append(download);
      let picture, source;
      const rotate = () => {
        if (!picture || !source) return;
        const sideways = [90, 270].includes(file.rotation);
        picture.width = sideways ? source.naturalHeight : source.naturalWidth; picture.height = sideways ? source.naturalWidth : source.naturalHeight;
        const context = picture.getContext('2d'); context.translate(picture.width / 2, picture.height / 2); context.rotate((file.rotation || 0) * Math.PI / 180); context.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
      };
      if (file.mime.startsWith('image/')) {
        const viewport = element('div'); viewport.className = 'cloud-file-viewport';
        source = element('img'); source.src = url; await source.decode(); if (ticket !== generation) return;
        if (source.naturalWidth * source.naturalHeight > 40000000) throw new Error('This image is too large to preview safely. Use Download original copy.');
        picture = element('canvas'); picture.className = 'cloud-file-image'; picture.setAttribute('role', 'img'); picture.setAttribute('aria-label', file.name); rotate(); viewport.append(picture); dialog.append(viewport);
        dialog.append(button('Zoom / fit', () => viewport.classList.toggle('zoomed')));
      } else if (file.mime.startsWith('audio/')) {
        const audio = element('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = url; dialog.append(audio);
      } else dialog.append(element('p', 'Download this PDF to view all pages in your PDF reader. PDFs are not embedded in the dashboard.'));
      if (review && file.purpose === 'paper') {
        const save = async patch => {
          const controls = [...dialog.querySelectorAll('button')]; controls.forEach(item => { item.disabled = true; });
          try {
            const result = await review({ id: file.id, rotation: file.rotation || 0, reviewed: Boolean(file.reviewedAt), gradeId: file.gradeId, ...patch });
            if (ticket !== generation) return; file = result.file; rotate(); reviewed.textContent = file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed'; status.textContent = 'Review saved. Add the score and feedback using Add Grade in Gradebook.';
          } catch (error) { if (ticket === generation) status.textContent = `${error.message} The review could not be confirmed; retry the same change.`; }
          finally { controls.forEach(item => { item.disabled = false; }); }
        };
        if (picture) dialog.append(button('Rotate 90° and save', () => save({ rotation: ((file.rotation || 0) + 90) % 360 })));
        const reviewed = button(file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed', () => save({ reviewed: !file.reviewedAt })); dialog.append(reviewed);
      }
      if (remove) dialog.append(button('Remove private file', async () => {
        if (!confirm('Remove this file from your online family storage? Messages retain their text. Download a copy first if you need it.')) return;
        try { await remove(file.id); if (ticket === generation) close(); }
        catch (error) { if (ticket === generation) status.textContent = error.message; }
      }));
    } catch (error) { if (ticket === generation) status.textContent = error.message; }
  }
  function voiceAttachment(file, load) {
    const item = element('div'); item.className = 'cloud-inline-audio';
    item.setAttribute('role', 'group'); item.setAttribute('aria-label', 'Voice message player');
    const audio = element('audio'); audio.preload = 'none'; audio.hidden = true;
    audio.setAttribute('aria-label', 'Voice message');
    const status = element('span'); status.className = 'cloud-inline-audio-status'; status.setAttribute('role', 'status');
    const controls = element('div'); controls.className = 'cloud-inline-audio-controls';
    const play = button('', () => { if (!audio.paused) audio.pause(); else void start(); }); play.className = 'cloud-inline-audio-play';
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="voice-play-icon" d="m9 5 11 7-11 7Z" fill="currentColor"/><path class="voice-pause-icon" d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="4"/></svg>';
    const timeline = element('div'); timeline.className = 'cloud-inline-audio-timeline';
    const seek = element('input'); seek.type = 'range'; seek.min = '0'; seek.max = '1'; seek.step = '0.1'; seek.value = '0'; seek.disabled = true;
    seek.setAttribute('aria-label', 'Seek voice message');
    const time = element('span', '0:00 / —'); time.className = 'cloud-inline-audio-time';
    const mute = button('', () => { audio.muted = !audio.muted; }); mute.className = 'cloud-inline-audio-mute'; mute.disabled = true;
    mute.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m11 5-6 4H2v6h3l6 4Z"/><path class="voice-sound-icon" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="voice-muted-icon" d="m16 9 5 6m0-6-5 6"/></svg>';
    timeline.append(seek, time); controls.append(play, timeline, mute); item.append(controls, audio, status);
    let url = null, loading = false, disposed = false;
    const visible = () => !disposed && item.isConnected && !document.hidden && item.getClientRects().length > 0;
    const clock = value => { const seconds = Math.max(0, Math.floor(value || 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
    function paint() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0, position = audio.currentTime || 0;
      play.dataset.playing = String(!audio.paused); play.setAttribute('aria-label', status.textContent && !url ? 'Retry voice message' : audio.paused ? 'Play voice message' : 'Pause voice message');
      mute.dataset.muted = String(audio.muted); mute.setAttribute('aria-label', audio.muted ? 'Unmute voice message' : 'Mute voice message'); mute.setAttribute('aria-pressed', String(audio.muted)); mute.disabled = !url;
      seek.disabled = !duration; seek.max = String(duration || 1); seek.value = String(position);
      seek.style.setProperty('--voice-position', `${duration ? Math.min(100, position / duration * 100) : 0}%`);
      seek.setAttribute('aria-valuetext', `${clock(position)} of ${duration ? clock(duration) : 'unknown duration'}`);
      time.textContent = `${clock(position)} / ${duration ? clock(duration) : '—'}`;
    }
    seek.addEventListener('input', () => { if (visible() && Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration, Math.max(0, Number(seek.value))); paint(); } });
    for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange']) audio.addEventListener(name, paint);
    paint();
    async function start() {
      if (loading || !visible()) return;
      loading = true; play.disabled = true; item.setAttribute('aria-busy', 'true'); status.textContent = '';
      try {
        if (!url) {
          status.textContent = 'Loading voice message…';
          const value = await load(); if (!visible()) return;
          const saved = value?.file;
          if (saved?.id !== file.id || saved.removed || saved.mime !== file.mime || !types.has(saved.mime) || !saved.mime.startsWith('audio/') || typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4) throw new Error('The voice message response was invalid.');
          const binary = atob(value.data);
          if (!binary.length || binary.length !== saved.size || binary.length > maximum) throw new Error('The voice message size did not match.');
          url = URL.createObjectURL(new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: saved.mime }));
          audio.src = url;
        }
        if (!visible()) return;
        status.textContent = '';
        try { await audio.play(); }
        catch (error) {
          if (error.name === 'NotAllowedError') status.textContent = 'Ready to play. Tap Play.';
          else if (error.name !== 'AbortError') throw new Error('This voice message could not play. Please try again.');
        }
      } catch (error) {
        if (!disposed) status.textContent = error.message || 'Could not load this voice message. Try again.';
      } finally {
        loading = false; play.disabled = false; item.removeAttribute('aria-busy'); paint();
      }
    }
    audio.addEventListener('playing', () => {
      if (!visible()) { audio.pause(); return; }
      for (const other of document.querySelectorAll('.cloud-inline-audio audio')) if (other !== audio) other.pause();
      status.textContent = ''; paint();
    });
    audio.addEventListener('error', () => {
      if (disposed) return;
      status.textContent = 'This voice message could not play. Try again.';
      audio.removeAttribute('src'); if (url) URL.revokeObjectURL(url); url = null; paint();
    });
    // The keyed message row owns the URL; receipt updates leave this player intact.
    item.dispose = () => { disposed = true; audio.pause(); audio.removeAttribute('src'); audio.load(); if (url) URL.revokeObjectURL(url); url = null; };
    return item;
  }
  function imageAttachment(file, load) {
    const item = button('', () => preview(read)); item.className = 'cloud-inline-image';
    item.setAttribute('aria-label', `Open image ${file.name || 'attachment'}`);
    const picture = element('img'); picture.alt = file.name || 'Image attachment'; picture.loading = 'lazy';
    const status = element('span', 'Image attachment'); status.className = 'cloud-inline-image-status';
    item.append(picture, status);
    let url = null, saved = null, loading = false, disposed = false, observer = null;
    async function read() { return saved || (saved = await load()); }
    async function show() {
      if (loading || disposed || url) return;
      loading = true; status.textContent = 'Loading image…';
      try {
        const value = await read(), meta = value?.file;
        if (disposed) return;
        if (meta?.id !== file.id || meta.removed || meta.mime !== file.mime || !/^image\/(?:png|jpeg|webp)$/.test(meta.mime) ||
            typeof value.data !== 'string' || value.data.length > Math.ceil(maximum / 3) * 4) throw new Error('Image unavailable. Tap to retry.');
        const binary = atob(value.data);
        if (!binary.length || binary.length !== meta.size || binary.length > maximum) throw new Error('Image unavailable. Tap to retry.');
        url = URL.createObjectURL(new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: meta.mime }));
        picture.src = url;
        picture.onload = () => {
          if (picture.naturalWidth * picture.naturalHeight > 40000000) {
            picture.removeAttribute('src'); URL.revokeObjectURL(url); url = null;
            status.textContent = 'Image too large to show here. Tap to open.';
          } else status.textContent = '';
        };
        picture.onerror = () => { if (url) URL.revokeObjectURL(url); url = null; status.textContent = 'Image unavailable. Tap to retry.'; };
      } catch { saved = null; if (!disposed) status.textContent = 'Image unavailable. Tap to retry.'; }
      finally { loading = false; observer?.disconnect(); }
    }
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void show(); }, { rootMargin: '200px' });
      observer.observe(item);
    } else void show();
    item.addEventListener('click', () => { if (!url) void show(); });
    item.dispose = () => { disposed = true; observer?.disconnect(); picture.removeAttribute('src'); if (url) URL.revokeObjectURL(url); url = null; };
    return item;
  }
  function attachment(file, load) {
    if (!file.removed && types.has(file.mime) && file.mime.startsWith('audio/')) return voiceAttachment(file, load);
    if (!file.removed && types.has(file.mime) && file.mime.startsWith('image/')) return imageAttachment(file, load);
    const item = button(file.removed ? 'Attachment removed' : `Open ${file.name || 'attachment'}`, () => preview(load));
    item.disabled = Boolean(file.removed); return item;
  }
  window.addEventListener('pagehide', close);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.cloudFileTools = { encode, preview, attachment, close, accept, element, button };
})();
