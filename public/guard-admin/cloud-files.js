import { preparePhotoForUpload } from './parent-photo-upload.js';
import { gradebookIcon, gradebookIcons, gradebookButton } from './cloud-grade-editor.js';
export function setupCloudFiles({ endpoint, gradePaper }) {
  const tools = window.cloudFileTools, el = id => document.getElementById(id);
  let students = [], active = false, loading = false, pending = null, uploading = false, files = [], studentFilter = '', selected = null, previewUrl = null, preparing = false, pickTurn = 0;
  const status = message => { el('cloud-files-status').textContent = message; };
  async function request(action, input = {}) {
    const response = await fetch(action === 'upload-file' ? endpoint.replace(/bridge\/?$/, 'upload/') : endpoint,
      { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(28000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Private files could not be reached.'); return result;
  }
  function render() {
    const filter = el('cloud-paper-state')?.value || 'pending';
    const visible = files.filter(file => (!studentFilter || file.studentId === studentFilter) && (filter === 'attachments' ? file.purpose === 'message' : file.purpose === 'paper' && (filter === 'all' || (filter === 'graded' ? file.gradeId : !file.gradeId))));
    el('cloud-files-list').replaceChildren(...visible.map(file => {
      const row = tools.element('article'); row.className = 'cloud-file-row';
      const icon = tools.element('span'); icon.className = 'gradebook-paper-icon'; icon.append(gradebookIcon(file.purpose === 'message' ? 'message-square' : file.mime === 'application/pdf' ? 'file-text' : 'file-image'));
      const copy = tools.element('div'); copy.className = 'gradebook-file-copy'; copy.append(tools.element('strong', file.name));
      copy.append(tools.element('p', `${students.find(student => student.id === file.studentId)?.name || 'Student'} · ${new Date(file.createdAt).toLocaleString()}`));
      const tag = tools.element('span', file.gradeId ? 'Grade recorded' : file.purpose === 'message' ? 'Message attachment' : 'Needs a grade'); tag.className = 'gradebook-file-tag'; tag.prepend(gradebookIcon(file.gradeId ? 'circle-check' : 'clock-3')); copy.append(tag);
      const actions = tools.element('div'); actions.className = 'gradebook-file-actions';
      if (file.ready) actions.append(gradebookButton('Open', 'eye', () => tools.preview(() => request('read-file', { id: file.id }), {
        review: async input => { const value = await request('review-file', input); void refresh(); return value; },
        remove: async id => { await request('remove-file', { id }); void refresh(); }
      })));
      else copy.append(tools.element('p', 'Upload not yet confirmed. Retry the original upload or remove this incomplete copy.'));
      if (file.ready && file.purpose === 'paper' && !file.gradeId && students.some(student => student.id === file.studentId && !student.archived_at)) actions.append(gradebookButton('Record grade', 'notebook-pen', () => gradePaper(file), 'btn btn-primary'));
      actions.append(gradebookButton('Remove', 'trash-2', async () => {
        if (!confirm(`Remove ${file.name} from online storage? This cannot be undone. Saved grades remain in the gradebook.`)) return;
        try { await request('remove-file', { id: file.id }); void refresh(); } catch (error) { status(error.message); }
      }, 'btn btn-secondary gradebook-file-remove'));
      row.append(icon, copy, actions); return row;
    }));
    if (!visible.length) { const empty = tools.element('p', filter === 'pending' ? 'No papers waiting for a grade. Add a photo or PDF when you’re ready.' : 'No files match this view.'); empty.className = 'cloud-note'; el('cloud-files-list').append(empty); }
    gradebookIcons(el('cloud-files-list'));
  }
  async function refresh() {
    if (loading || !active) return; loading = true;
    try {
      const result = await request('list-files'); files = result.files; render();
      if (!uploading && !pending) status(`${result.files.filter(file => file.purpose === 'paper').length} saved papers · ${(Number(result.usage.bytes) / 1048576).toFixed(1)} of 128 MB used`);
    } catch (error) { status(`${error.message} The last displayed files are retained.`); }
    finally { loading = false; }
  }
  function clearSelection() {
    ++pickTurn; selected = null; preparing = false; el('cloud-paper-file').value = ''; el('cloud-paper-camera').value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    el('cloud-paper-preview').replaceChildren(); el('cloud-paper-preview').hidden = true;
    el('cloud-paper-selected').textContent = 'Photo or PDF · up to 2 MB after photo resizing'; el('cloud-paper-file').required = true;
  }
  function controls() {
    const locked = uploading || Boolean(pending);
    for (const id of ['cloud-paper-file','cloud-paper-camera','cloud-paper-student','cloud-paper-take-photo']) el(id).disabled = locked;
    el('cloud-paper-upload').disabled = uploading || preparing;
    el('cloud-paper-upload').textContent = uploading ? 'Saving paper…' : pending ? 'Retry same paper' : 'Continue to grade';
  }
  async function choose(file) {
    if (uploading || pending) return;
    clearSelection(); if (!file) { controls(); return; }
    const turn = ++pickTurn; preparing = true; controls();
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a photo under 20 MB or a PDF under 2 MB.');
      let ready = file;
      if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
        let photo = await preparePhotoForUpload(file);
        if (photo.byteSize > 2 * 1024 * 1024) photo = await preparePhotoForUpload(file, { maxEdge: 1400, quality: .7 });
        const bytes = Uint8Array.from(atob(photo.dataUrl.split(',')[1]), char => char.charCodeAt(0)); ready = new File([bytes], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
      if (!['image/png','image/jpeg','image/webp','application/pdf'].includes(ready.type) || ready.size > 2 * 1024 * 1024) throw new Error('Choose a JPG, PNG, WebP photo or PDF up to 2 MB after resizing.');
      if (turn !== pickTurn) return;
      selected = ready; el('cloud-paper-file').required = false; el('cloud-paper-selected').textContent = `${ready.name} · ${(ready.size / 1024).toFixed(0)} KB`;
      if (ready.type.startsWith('image/')) { previewUrl = URL.createObjectURL(ready); const image = tools.element('img'); image.src = previewUrl; image.alt = 'Selected paper'; el('cloud-paper-preview').replaceChildren(image); el('cloud-paper-preview').hidden = false; }
    } catch (error) { if (turn === pickTurn) status(error.message); }
    finally { if (turn === pickTurn) { preparing = false; controls(); } }
  }
  el('cloud-paper-file').addEventListener('change', event => { void choose(event.target.files[0]); });
  el('cloud-paper-camera').addEventListener('change', event => { void choose(event.target.files[0]); });
  el('cloud-paper-take-photo').addEventListener('click', () => el('cloud-paper-camera').click());
  el('cloud-scan-paper').addEventListener('click', () => { el('cloud-paper-add').open = true; el('cloud-paper-add').scrollIntoView({ block: 'center', behavior: 'smooth' }); el('cloud-paper-student').focus({ preventScroll: true }); });
  el('cloud-paper-state').addEventListener('change', render);
  el('cloud-files-refresh').addEventListener('click', refresh);
  el('cloud-paper-reset').addEventListener('click', () => {
    if (uploading || (pending && !confirm('Stop retrying this upload? It may already be saved. Check the paper list before uploading another copy.'))) return;
    pending = null; clearSelection(); controls(); status('Choose a paper. Previous saved papers are unchanged.'); void refresh();
  });
  el('cloud-paper-form').addEventListener('submit', async event => {
    event.preventDefault(); if (uploading || preparing) return; uploading = true; controls();
    try {
      if (!pending) {
        if (!el('cloud-paper-student').value) throw new Error('Choose the student this paper belongs to.');
        pending = { ...await tools.encode(selected || el('cloud-paper-file').files[0], 'paper'), studentId: el('cloud-paper-student').value };
      }
      status('Saving private paper…');
      const receipt = await request('upload-file', pending);
      if (receipt.file?.id !== pending.id || !receipt.saved) throw new Error('Upload receipt did not match. Retry the same paper.');
      pending = null; clearSelection(); status('Paper saved. Review the assignment and score before saving its grade.');
      void refresh(); gradePaper(receipt.file);
    } catch (error) { status(`${error.message} Your original file is unchanged.${pending ? ' Keep this page open and retry the same paper.' : ''}`); }
    finally { uploading = false; controls(); }
  });
  return {
    request, refresh,
    setStudent(id) { studentFilter = id || ''; if (!pending && !uploading) el('cloud-paper-student').value = students.some(student => student.id === id && !student.archived_at) ? id : ''; render(); },
    update(value) {
      students = value || []; const selectedStudent = el('cloud-paper-student').value;
      const placeholder = tools.element('option', 'Choose a student…'); placeholder.value = '';
      el('cloud-paper-student').replaceChildren(placeholder, ...students.filter(student => !student.archived_at).map(student => { const option = tools.element('option', student.name); option.value = student.id; return option; }));
      if (students.some(student => student.id === selectedStudent)) el('cloud-paper-student').value = selectedStudent;
    },
    setActive(value) { active = value; if (active) void refresh(); }
  };
}
