'use strict';
// Shared private-file UI for the parent browser and isolated child renderer.
// Bytes arrive only from authenticated APIs; no storage URL or token is used.
(() => {
  const maximum = 2 * 1024 * 1024;
  const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'audio/wav', 'audio/mpeg', 'audio/webm', 'audio/ogg']);
  const accept = '.png,.jpg,.jpeg,.webp,.pdf,.wav,.mp3,.webm,.ogg';
  const element = (tag, text = '') => { const item = document.createElement(tag); item.textContent = text; return item; };
  const button = (text, action) => { const item = element('button', text); item.type = 'button'; item.className = 'btn btn-secondary'; item.addEventListener('click', action); return item; };
  async function encode(file, purpose) {
    if (!file || file.size > maximum || !file.size) throw new Error('Choose a nonempty file up to 2 MB. For a larger scan, export a smaller image or PDF; your original stays unchanged.');
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
  function attachment(file, load) {
    const item = button(file.removed ? 'Attachment removed' : `Open ${file.name || 'attachment'}`, () => preview(load));
    item.disabled = Boolean(file.removed); return item;
  }
  window.addEventListener('pagehide', close);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.cloudFileTools = { encode, preview, attachment, close, accept, element, button };
})();
