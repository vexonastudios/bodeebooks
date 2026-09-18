export function setupCloudFiles({ endpoint, gradePaper }) {
  const tools = window.cloudFileTools, el = id => document.getElementById(id);
  let students = [], active = false, loading = false, pending = null, uploading = false;
  async function request(action, input = {}) {
    const response = await fetch(action === 'upload-file' ? endpoint.replace(/bridge\/?$/, 'upload/') : endpoint,
      { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(28000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...input }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Private files could not be reached.'); return result;
  }
  async function refresh() {
    if (loading || !active) return; loading = true;
    try {
      const result = await request('list-files');
      el('cloud-files-list').replaceChildren(...result.files.map(file => {
        const row = tools.element('article'); row.className = 'cloud-file-row';
        row.append(tools.element('span', `${students.find(student => student.id === file.studentId)?.name || 'Child'} · ${file.name} · ${file.purpose === 'paper' ? (file.reviewedAt ? 'Reviewed' : 'Awaiting review') : 'Message attachment'}`));
        if (file.ready) row.append(tools.button('Open', () => tools.preview(() => request('read-file', { id: file.id }), {
          review: async input => { const value = await request('review-file', input); void refresh(); return value; },
          remove: async id => { await request('remove-file', { id }); void refresh(); }
        })));
        else row.append(tools.element('span', 'Upload not yet confirmed. Retry the original upload, or remove this incomplete reservation.'));
        if (file.ready && file.purpose === 'paper' && !file.gradeId && students.some(student => student.id === file.studentId && !student.archived_at)) row.append(tools.button('Record grade', () => gradePaper(file)));
        if (file.gradeId) row.append(tools.element('span', 'Grade recorded in Gradebook'));
        row.append(tools.button('Remove', async () => {
          if (!confirm(`Remove ${file.name} from online storage? This cannot be undone.`)) return;
          try { await request('remove-file', { id: file.id }); void refresh(); } catch (error) { el('cloud-files-status').textContent = error.message; }
        }));
        return row;
      }));
      if (!uploading && !pending) el('cloud-files-status').textContent = `${result.files.length} files · ${(Number(result.usage.bytes) / 1048576).toFixed(1)} / 128 MB used. Images, PDFs and audio: up to 2 MB each. Files are opened only when requested.`;
    } catch (error) { el('cloud-files-status').textContent = `${error.message} The last displayed files are retained.`; }
    finally { loading = false; }
  }
  el('cloud-files-refresh').addEventListener('click', refresh);
  el('cloud-paper-reset').addEventListener('click', () => {
    if (uploading || (pending && !confirm('Stop retrying this upload? It may already be saved online. Check the file list before uploading another copy. Your original file is unchanged.'))) return;
    pending = null; el('cloud-paper-file').value = ''; el('cloud-paper-file').disabled = false; el('cloud-paper-student').disabled = false; el('cloud-paper-upload').textContent = 'Upload paper';
    el('cloud-files-status').textContent = 'Choose a new paper. Previous saved files and incomplete reservations remain in the file list.'; void refresh();
  });
  el('cloud-paper-form').addEventListener('submit', async event => {
    event.preventDefault(); if (uploading) return; uploading = true;
    const submit = el('cloud-paper-upload'); submit.disabled = true;
    try {
      if (!pending) pending = { ...await tools.encode(el('cloud-paper-file').files[0], 'paper'), studentId: el('cloud-paper-student').value };
      if (!pending.studentId) throw new Error('Choose the child this paper belongs to.');
      el('cloud-files-status').textContent = 'Saving private paper…';
      const receipt = await request('upload-file', pending);
      if (receipt.file?.id !== pending.id || !receipt.saved) throw new Error('Upload receipt did not match. Retry the same upload.');
      pending = null; el('cloud-paper-file').value = ''; el('cloud-files-status').textContent = 'Paper saved. Open it to review, rotate or download; use Add Grade for its score.';
      void refresh();
    } catch (error) { el('cloud-files-status').textContent = `${error.message} Your original file is unchanged. Keep this page open and retry with the same upload ID.`; }
    finally { uploading = false; submit.disabled = false; submit.textContent = pending ? 'Retry same paper' : 'Upload paper'; el('cloud-paper-file').disabled = Boolean(pending); el('cloud-paper-student').disabled = Boolean(pending); }
  });
  return {
    request,
    update(value) { students = value || []; const selected = el('cloud-paper-student').value; el('cloud-paper-student').replaceChildren(...students.filter(student => !student.archived_at).map(student => { const option = tools.element('option', student.name); option.value = student.id; return option; })); if (students.some(student => student.id === selected)) el('cloud-paper-student').value = selected; },
    setActive(value) { active = value; if (active) void refresh(); }
  };
}
