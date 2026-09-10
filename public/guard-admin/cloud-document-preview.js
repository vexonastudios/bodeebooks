// Render submitted copies in the parent's browser. PDF scripts, links and
// attachments are never executed. No document bytes are persisted by this UI.
import { documentNode as node, documentButton as button } from './cloud-documents.js?v=20260910-documents1';
let current = null;
export function closeDocumentPreview() { current?.close(); }
export async function previewDocument({ file: initial, childName, read, review, grade, print = false }) {
  closeDocumentPreview(); window.cloudFileTools?.close();
  let live = true, file = initial, pdf = null, loadingTask = null, renderTask = null, image = null, pageNumber = 1, zoom = 1, rendering = false, printing = false;
  const urls = [], frames = [];
  const dialog = node('dialog', 'cloud-document-dialog'); dialog.setAttribute('aria-label', initial.name);
  const head = node('div', 'cloud-document-view-header');
  const title = node('div'); title.append(node('h2', '', initial.name), node('p', 'cloud-note', childName));
  const status = node('p', 'cloud-note', 'Opening document…'); status.setAttribute('role', 'status');
  function close() {
    if (!live) return; live = false;
    renderTask?.cancel(); void loadingTask?.destroy().catch(() => {});
    frames.forEach(frame => frame.remove()); urls.forEach(url => URL.revokeObjectURL(url)); dialog.remove();
    if (current?.dialog === dialog) current = null;
  }
  const closeButton = button('Close', 'x', close); head.append(title, closeButton);
  const actions = node('div', 'cloud-document-actions');
  const download = node('a', 'btn btn-secondary', 'Download PDF'); download.hidden = true;
  const printButton = button('Print', 'printer', () => void printAll()); printButton.disabled = true;
  const reviewed = button(file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed', 'check-check', async () => {
    reviewed.disabled = true;
    try { file = await review(file); if (live) { reviewed.lastChild.textContent = file.reviewedAt ? 'Mark not reviewed' : 'Mark reviewed'; status.textContent = 'Review saved.'; } }
    catch (error) { if (live) status.textContent = error.message; }
    finally { reviewed.disabled = false; }
  }); reviewed.disabled = true;
  actions.append(printButton, download, reviewed);
  if (grade) actions.append(button('Grade', 'clipboard-check', () => { close(); grade(file); }, 'btn btn-primary'));
  const controls = node('div', 'cloud-document-page-controls');
  const previous = button('Previous', 'chevron-left', () => { pageNumber--; void render(); });
  const next = button('Next', 'chevron-right', () => { pageNumber++; void render(); });
  const pageLabel = node('span'); pageLabel.setAttribute('aria-live', 'polite');
  const zoomOut = button('Zoom out', 'zoom-out', () => { zoom = Math.max(0.75, zoom - 0.25); void render(); });
  const zoomIn = button('Zoom in', 'zoom-in', () => { zoom = Math.min(2, zoom + 0.25); void render(); });
  controls.append(previous, pageLabel, next, zoomOut, zoomIn);
  const viewport = node('div', 'cloud-document-pages');
  dialog.append(head, actions, controls, status, viewport); document.body.append(dialog); dialog.showModal();
  current = { dialog, close }; dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  const count = () => pdf?.numPages || 1;
  function controlsState() {
    previous.disabled = rendering || printing || pageNumber <= 1;
    next.disabled = rendering || printing || pageNumber >= count();
    zoomIn.disabled = zoomOut.disabled = rendering || printing;
    printButton.disabled = rendering || printing || (!pdf && !image);
    pageLabel.textContent = `Page ${pageNumber} of ${count()}`;
  }
  async function canvasFor(number, scale) {
    const canvas = node('canvas');
    if (pdf) {
      const page = await pdf.getPage(number); if (!live) return null;
      const base = page.getViewport({ scale: 1 });
      const bounded = Math.min(scale, Math.sqrt(5000000 / (base.width * base.height)));
      const size = page.getViewport({ scale: bounded }); canvas.width = Math.ceil(size.width); canvas.height = Math.ceil(size.height);
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport: size });
      await renderTask.promise; renderTask = null;
    } else {
      const bounded = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const sideways = [90, 270].includes(file.rotation);
      canvas.width = Math.round((sideways ? image.naturalHeight : image.naturalWidth) * bounded);
      canvas.height = Math.round((sideways ? image.naturalWidth : image.naturalHeight) * bounded);
      const context = canvas.getContext('2d'); context.translate(canvas.width / 2, canvas.height / 2); context.rotate((file.rotation || 0) * Math.PI / 180);
      context.drawImage(image, -image.naturalWidth * bounded / 2, -image.naturalHeight * bounded / 2, image.naturalWidth * bounded, image.naturalHeight * bounded);
    }
    return live ? canvas : null;
  }
  async function render() {
    if (!live || rendering || printing || (!pdf && !image)) return;
    rendering = true; controlsState();
    try {
      const canvas = await canvasFor(pageNumber, 1.5 * zoom); if (!canvas) return;
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${file.name}, page ${pageNumber}`);
      canvas.style.width = `${zoom * 100}%`; viewport.replaceChildren(canvas);
    } catch (error) { if (live) status.textContent = `Preview unavailable: ${error.message}. You can download the original.`; }
    finally { rendering = false; if (live) controlsState(); }
  }
  async function printAll() {
    if (!live || printing || rendering || (!pdf && !image)) return;
    if (count() > 40) { status.textContent = 'For this long document, download the PDF and print it from your PDF reader.'; return; }
    printing = true; controlsState();
    let frame;
    try {
      // Only locally rendered images enter this frame, never PDF-authored HTML.
      frame = node('iframe', 'cloud-document-print-frame'); frame.title = 'Print submitted document'; frames.push(frame); document.body.append(frame);
      const content = frame.contentDocument;
      content.title = file.name;
      const style = content.createElement('style'); style.textContent = '@page{size:auto;margin:12mm}body{margin:0}img{display:block;max-width:100%;max-height:245mm;margin:auto;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}'; content.head.append(style);
      for (let number = 1; number <= count(); number++) {
        if (!live) return; status.textContent = `Preparing page ${number} of ${count()}…`;
        const canvas = await canvasFor(number, 1.5); if (!canvas) return;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); canvas.width = canvas.height = 0;
        if (!live) return; if (!blob) throw Error('A page could not be prepared.');
        const url = URL.createObjectURL(blob); urls.push(url);
        const picture = content.createElement('img'); picture.src = url; content.body.append(picture); await picture.decode();
      }
      if (!live) return;
      frame.contentWindow.addEventListener('afterprint', () => { frame.remove(); }, { once: true });
      frame.contentWindow.focus(); frame.contentWindow.print();
      status.textContent = 'Print dialog opened. Choose your printer to finish.';
    } catch (error) { frame?.remove(); if (live) status.textContent = `${error.message} You can also download the original to print.`; }
    finally { printing = false; if (live) controlsState(); }
  }
  dialog.addEventListener('keydown', event => {
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(document.activeElement?.tagName)) return;
    if (event.key === 'ArrowLeft' && !previous.disabled) { event.preventDefault(); previous.click(); }
    if (event.key === 'ArrowRight' && !next.disabled) { event.preventDefault(); next.click(); }
  });
  controlsState(); window.lucide?.createIcons();
  try {
    const value = await read(); if (!live) return;
    if (value.file?.id !== file.id || value.file.studentId !== file.studentId || !value.file.ready || value.file.purpose !== 'paper') throw Error('The document response did not match.');
    file = value.file;
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.mime) || typeof value.data !== 'string' || value.data.length > 2796204) throw Error('Invalid document response.');
    const binary = atob(value.data); if (binary.length !== file.size || binary.length > 2097152) throw Error('The document size did not match.');
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: file.mime })); urls.push(url);
    download.href = url; download.download = file.name.replace(/[^\p{L}\p{N} ._-]/gu, '_'); download.textContent = file.mime === 'application/pdf' ? 'Download PDF' : 'Download image'; download.hidden = false;
    if (file.mime === 'application/pdf') {
      const engine = await import('./vendor/pdfjs/pdf.mjs'); if (!live) return;
      engine.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
      loadingTask = engine.getDocument({ data: bytes, isEvalSupported: false, useWasm: false, useSystemFonts: true,
        cMapUrl: new URL('./vendor/pdfjs/cmaps/', import.meta.url).href, cMapPacked: true,
        standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href });
      pdf = await loadingTask.promise;
    } else {
      image = new Image(); image.src = url; await image.decode();
      if (image.naturalWidth * image.naturalHeight > 40000000) throw Error('This image is too large to preview. Download the original.');
    }
    if (!live) return; reviewed.disabled = false;
    status.textContent = file.gradeId ? 'Grade recorded.' : file.reviewedAt ? 'Reviewed.' : 'Ready for your review.';
    await render(); if (print && live) await printAll();
  } catch (error) { if (live) status.textContent = `${error.message} Close and try opening the document again.`; }
}
window.addEventListener('pagehide', closeDocumentPreview);
document.addEventListener('visibilitychange', () => { if (document.hidden) closeDocumentPreview(); });
