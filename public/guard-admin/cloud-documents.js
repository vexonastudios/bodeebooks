import { previewDocument, closeDocumentPreview } from './cloud-document-preview.js?v=20260910-documents1';

export const documentNode = (tag, className = '', text = '') => {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
};
export function documentButton(label, icon, action, className = 'btn btn-secondary') {
  const button = documentNode('button', className); button.type = 'button';
  const glyph = documentNode('i'); glyph.dataset.lucide = icon; glyph.setAttribute('aria-hidden', 'true');
  button.append(glyph, document.createTextNode(label)); button.addEventListener('click', action); return button;
}
export function setupCloudDocuments({ request, gradePaper, getStudents }) {
  const root = document.getElementById('tab-documents');
  let active = false, loading = null, files = [], loaded = false;
  const header = documentNode('div', 'tab-header');
  const heading = documentNode('h2', '', 'Documents');
  const refresh = documentButton('Refresh', 'refresh-cw', () => void load()); header.append(heading, refresh);
  const intro = documentNode('p', 'cloud-note', 'Writing and papers your children submit. Open a copy to review, grade or print. Drafts stay on their computers.');
  const filters = documentNode('div', 'cloud-document-filters');
  const children = documentNode('select', 'admin-input'); children.setAttribute('aria-label', 'Child');
  const state = documentNode('select', 'admin-input'); state.setAttribute('aria-label', 'Review status');
  for (const [value, text] of [['', 'All submissions'], ['pending', 'Awaiting review'], ['reviewed', 'Reviewed'], ['graded', 'Graded']]) {
    const option = documentNode('option', '', text); option.value = value; state.append(option);
  }
  const search = documentNode('input', 'admin-input'); search.type = 'search'; search.placeholder = 'Find a document'; search.setAttribute('aria-label', 'Find a document');
  filters.append(children, state, search);
  const status = documentNode('p', 'cloud-note'); status.setAttribute('role', 'status');
  const list = documentNode('div', 'cloud-document-list');
  root.replaceChildren(header, intro, filters, status, list);
  function update() {
    const selected = children.value;
    const all = documentNode('option', '', 'All children'); all.value = '';
    children.replaceChildren(all, ...getStudents().map(student => {
      const option = documentNode('option', '', student.name + (student.archived_at ? ' (archived)' : '')); option.value = student.id; return option;
    }));
    if ([...children.options].some(option => option.value === selected)) children.value = selected;
    if (loaded) render();
  }
  const canGrade = file => !file.gradeId && getStudents().some(child => child.id === file.studentId && !child.archived_at);
  function grade(file) { closeDocumentPreview(); gradePaper(file, () => load()); }
  function open(file, print = false) {
    void previewDocument({ file, read: () => request('read-file', { id: file.id }), print,
      childName: getStudents().find(child => child.id === file.studentId)?.name || 'Child',
      review: async current => {
        const result = await request('review-file', { id: current.id, rotation: current.rotation || 0, reviewed: !current.reviewedAt, gradeId: current.gradeId });
        files = files.map(item => item.id === current.id ? result.file : item); render(); return result.file;
      }, grade: canGrade(file) ? grade : null });
  }
  function render() {
    const matches = files.filter(file => (!children.value || file.studentId === children.value) &&
      (!search.value || file.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())) &&
      (!state.value || (state.value === 'pending' ? !file.reviewedAt && !file.gradeId : state.value === 'graded' ? !!file.gradeId : !!file.reviewedAt)));
    status.textContent = `${matches.length} ${matches.length === 1 ? 'document' : 'documents'} · ${files.filter(file => file.ready && !file.reviewedAt && !file.gradeId).length} awaiting review`;
    list.replaceChildren(...matches.map(file => {
      const row = documentNode('article', 'cloud-document-card'); row.dataset.documentId = file.id;
      const title = documentNode('h3', '', file.name);
      const meta = documentNode('p', 'cloud-note', `${getStudents().find(child => child.id === file.studentId)?.name || 'Child'} · ${new Date(file.createdAt).toLocaleDateString()} · ${file.mime === 'application/pdf' ? 'PDF' : 'Image'}`);
      const badge = documentNode('span', 'cloud-document-badge', !file.ready ? 'Upload pending' : file.gradeId ? 'Graded' : file.reviewedAt ? 'Reviewed' : 'Awaiting review');
      badge.dataset.state = file.gradeId || file.reviewedAt ? 'reviewed' : 'pending';
      const details = documentNode('div', 'cloud-document-details'); details.append(title, meta, badge);
      const actions = documentNode('div', 'cloud-document-actions');
      if (file.ready) {
        actions.append(documentButton('Open', 'file-text', () => open(file), 'btn btn-primary'), documentButton('Print', 'printer', () => open(file, true)));
        if (canGrade(file)) actions.append(documentButton('Grade', 'clipboard-check', () => grade(file)));
      } else details.append(documentNode('p', 'cloud-note', 'The child can retry this upload in My Papers.'));
      row.append(details, actions); return row;
    }));
    if (!matches.length) list.append(documentNode('p', 'cloud-document-empty', files.length ? 'No documents match these filters.' : 'Nothing submitted yet. Your child can choose Submit to parent in Writing.'));
    window.lucide?.createIcons();
  }
  async function load() {
    if (!active) return; if (loading) return loading;
    refresh.disabled = true; status.textContent = 'Loading documents…';
    loading = (async () => {
      try {
        const result = await request('list-files');
        // Existing Writing releases already submit child-owned paper PDFs.
        // Never request local editable drafts or list message attachments here.
        files = result.files.filter(file => file.purpose === 'paper' && file.source === 'child'); loaded = true; render();
      } catch (error) { status.textContent = `${error.message} Select Refresh to try again.`; }
      finally { refresh.disabled = false; loading = null; }
    })(); return loading;
  }
  children.addEventListener('change', render); state.addEventListener('change', render); search.addEventListener('input', render);
  update(); window.lucide?.createIcons();
  return { update, setActive(value) { active = value; if (active) void load(); else closeDocumentPreview(); } };
}
