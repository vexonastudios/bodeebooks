import { previewDocument, closeDocumentPreview } from './cloud-document-preview.js?v=20261030-document-complete1';

export const documentNode = (tag, className = '', text = '') => {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
};
export function documentButton(label, icon, action, className = 'btn btn-secondary') {
  const button = documentNode('button', className); button.type = 'button';
  const glyph = documentNode('i'); glyph.dataset.lucide = icon; glyph.setAttribute('aria-hidden', 'true');
  button.append(glyph, document.createTextNode(label)); button.addEventListener('click', action); return button;
}
export function setupCloudDocuments({ request, gradePaper, getStudents, navigate }) {
  const root = document.getElementById('tab-documents');
  let active = false, loading = null, files = [], loaded = false, lastLoaded = 0, refreshAgain = false;
  const reviewing = new Map(), reviewErrors = new Map();
  let reviewRevision = 0;
  const header = documentNode('div', 'tab-header');
  const heading = documentNode('h2', '', 'Documents');
  const refresh = documentButton('Refresh', 'refresh-cw', () => void load(true)); header.append(heading, refresh);
  const intro = documentNode('p', 'cloud-note', 'Writing and papers your children submit. Choose Mark complete when you finish printing or reviewing a paper. Grading is optional; drafts stay on their computers.');
  const filters = documentNode('div', 'cloud-document-filters');
  const children = documentNode('select', 'admin-input'); children.setAttribute('aria-label', 'Child');
  const state = documentNode('select', 'admin-input'); state.setAttribute('aria-label', 'Review status');
  for (const [value, text] of [['', 'All submissions'], ['pending', 'Awaiting review'], ['reviewed', 'Completed'], ['graded', 'Graded']]) {
    const option = documentNode('option', '', text); option.value = value; state.append(option);
  }
  const search = documentNode('input', 'admin-input'); search.type = 'search'; search.placeholder = 'Find a document'; search.setAttribute('aria-label', 'Find a document');
  filters.append(children, state, search);
  const status = documentNode('p', 'cloud-note'); status.setAttribute('role', 'status');
  const list = documentNode('div', 'cloud-document-list');
  const reviewStatus = documentNode('p', 'cloud-note cloud-document-review-status'); reviewStatus.setAttribute('role', 'status'); reviewStatus.tabIndex = -1; reviewStatus.hidden = true;
  root.replaceChildren(header, intro, filters, status, reviewStatus, list);
  function update() {
    const selected = children.value;
    const all = documentNode('option', '', 'All children'); all.value = '';
    children.replaceChildren(all, ...getStudents().map(student => {
      const option = documentNode('option', '', student.name + (student.archived_at ? ' (archived)' : '')); option.value = student.id; return option;
    }));
    if ([...children.options].some(option => option.value === selected)) children.value = selected;
    if (loaded) render(); else if (getStudents().length) void load();
  }
  const canGrade = file => !file.gradeId && getStudents().some(child => child.id === file.studentId && !child.archived_at);
  function grade(file) { closeDocumentPreview(); gradePaper(file, () => load(true)); }
  function open(file, print = false) {
    void previewDocument({ file, read: () => request('read-file', { id: file.id }), print,
      childName: getStudents().find(child => child.id === file.studentId)?.name || 'Child',
      review: saveReview, grade: canGrade(file) ? grade : null });
  }
  function saveReview(file) {
    if (reviewing.has(file.id)) return reviewing.get(file.id);
    const complete = !file.reviewedAt;
    reviewErrors.delete(file.id); reviewStatus.hidden = true; reviewRevision++;
    const pending = Promise.resolve().then(async () => {
      const result = await request('review-file', { id: file.id, rotation: file.rotation || 0, reviewed: complete, gradeId: file.gradeId });
      if (result.file?.id !== file.id || result.file.studentId !== file.studentId || result.file.purpose !== 'paper' || !result.file.ready || Boolean(result.file.reviewedAt) !== complete) throw Error('Completion could not be confirmed. Please try again.');
      files = files.map(item => item.id === file.id ? result.file : item); reviewRevision++;
      reviewStatus.textContent = complete ? file.name + ' marked complete. It is saved under Completed.' : file.name + ' returned to Awaiting review.';
      reviewStatus.hidden = false; return result.file;
    }).catch(error => { reviewErrors.set(file.id, error.message || 'Completion could not be saved. Try again.'); throw error; })
      .finally(() => { reviewing.delete(file.id); render(); });
    reviewing.set(file.id, pending); render(); return pending;
  }
  async function changeReview(file) {
    try { await saveReview(file); } catch { /* The affected card retains its error and a retry button. */ }
  }
  const reminders = ['overview', 'grades'].map(tab => {
    const reminder = documentNode('aside', 'cloud-document-attention'); reminder.hidden = true;
    reminder.setAttribute('aria-label', 'Documents awaiting your review');
    const copy = documentNode('div'), title = documentNode('strong'), detail = documentNode('span', '', 'Open a submission to proofread, print or grade it.');
    copy.append(title, detail);
    reminder.append(copy, documentButton('Review documents', 'file-check', () => { state.value = 'pending'; children.value = ''; search.value = ''; navigate('documents'); render(); }));
    document.querySelector('#tab-' + tab + ' .tab-header')?.after(reminder);
    return { reminder, title };
  });
  function attention() {
    const total = files.filter(file => file.ready && !file.reviewedAt && !file.gradeId).length;
    for (const {reminder, title} of reminders) { reminder.hidden = !total; title.textContent = total + (total === 1 ? ' document needs your review' : ' documents need your review'); }
    for (const nav of document.querySelectorAll('[data-tab="documents"],[data-mobile-tab="grades"]')) {
      let badge = nav.querySelector('.cloud-document-count');
      if (!badge) { badge = documentNode('span', 'cloud-unread-badge cloud-document-count'); badge.setAttribute('aria-hidden', 'true'); nav.append(badge); }
      badge.hidden = !total; badge.textContent = total > 99 ? '99+' : String(total);
      nav.setAttribute('aria-label', (nav.dataset.mobileTab ? 'Papers' : 'Documents') + (total ? ', ' + total + ' awaiting review' : ''));
    }
  }
  function render() {
    attention();
    if (!active) return; // Keep hidden document cards out of live dashboard refreshes.
    const focusedReview = list.contains(document.activeElement) ? document.activeElement.closest('[data-document-review]')?.dataset.documentReview : null;
    const matches = files.filter(file => (!children.value || file.studentId === children.value) &&
      (!search.value || file.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())) &&
      (!state.value || (state.value === 'pending' ? !file.reviewedAt && !file.gradeId : state.value === 'graded' ? !!file.gradeId : !!file.reviewedAt)));
    status.textContent = `${matches.length} ${matches.length === 1 ? 'document' : 'documents'} · ${files.filter(file => file.ready && !file.reviewedAt && !file.gradeId).length} awaiting review`;
    list.replaceChildren(...matches.map(file => {
      const row = documentNode('article', 'cloud-document-card'); row.dataset.documentId = file.id;
      const title = documentNode('h3', '', file.name);
      const meta = documentNode('p', 'cloud-note', `${getStudents().find(child => child.id === file.studentId)?.name || 'Child'} · ${new Date(file.createdAt).toLocaleDateString()} · ${file.mime === 'application/pdf' ? 'PDF' : 'Image'}`);
      const badge = documentNode('span', 'cloud-document-badge', !file.ready ? 'Upload pending' : file.gradeId ? 'Graded' : file.reviewedAt ? 'Completed' : 'Awaiting review');
      badge.dataset.state = file.gradeId || file.reviewedAt ? 'reviewed' : 'pending';
      const details = documentNode('div', 'cloud-document-details'); details.append(title, meta, badge);
      const actions = documentNode('div', 'cloud-document-actions');
      const busy = reviewing.has(file.id);
      if (file.ready) {
        actions.append(documentButton('Open', 'file-text', () => open(file), 'btn btn-primary'), documentButton('Print', 'printer', () => open(file, true)));
        if (!file.gradeId) {
          const complete = documentButton(busy ? file.reviewedAt ? 'Reopening…' : 'Completing…' : file.reviewedAt ? 'Reopen review' : 'Mark complete', file.reviewedAt ? 'rotate-ccw' : 'check-check', () => void changeReview(file));
          complete.dataset.documentReview = file.id; complete.setAttribute('aria-label', (file.reviewedAt ? 'Reopen review for ' : 'Mark complete: ') + file.name);
          if (busy) complete.setAttribute('aria-busy', 'true');
          actions.append(complete);
        }
        if (canGrade(file)) actions.append(documentButton('Grade', 'clipboard-check', () => grade(file)));
      } else details.append(documentNode('p', 'cloud-note', 'The child can retry this upload in My Papers.'));
      if (reviewErrors.has(file.id)) { const error = documentNode('p', 'cloud-document-review-error', reviewErrors.get(file.id)); error.setAttribute('role', 'alert'); details.append(error); }
      if (busy) actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
      row.append(details, actions); return row;
    }));
    if (!matches.length) list.append(documentNode('p', 'cloud-document-empty', files.length ? 'No documents match these filters.' : 'Nothing submitted yet. Your child can choose Submit to parent in Writing.'));
    if (focusedReview) {
      const next = [...list.querySelectorAll('[data-document-review]')].find(button => button.dataset.documentReview === focusedReview);
      (next && !next.disabled ? next : reviewStatus.hidden ? refresh : reviewStatus).focus({ preventScroll: true });
    }
    window.lucide?.createIcons();
  }
  async function load(force = false) {
    if (document.hidden) { refreshAgain = true; return; }
    if (loading) { if (force) refreshAgain = true; return loading; }
    if (!force && loaded && Date.now() - lastLoaded < 60000) { attention(); return; }
    refreshAgain = false; refresh.disabled = true; status.textContent = 'Loading documents…';
    loading = (async () => {
      try {
        const revision = reviewRevision;
        const result = await request('list-files');
        if (revision !== reviewRevision) { refreshAgain = true; return; }
        // Existing Writing releases already submit child-owned paper PDFs.
        // Never request local editable drafts or list message attachments here.
        files = result.files.filter(file => file.purpose === 'paper' && file.source === 'child' && !file.removed); loaded = true; lastLoaded = Date.now(); render();
      } catch (error) { status.textContent = `${error.message} Select Refresh to try again.`; }
      finally { refresh.disabled = false; loading = null; if (refreshAgain && !document.hidden) { refreshAgain = false; void load(true); } }
    })(); return loading;
  }
  children.addEventListener('change', render); state.addEventListener('change', render); search.addEventListener('input', render);
  window.cloudOpenSubmittedDocument = async id => {
    if (typeof id !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)) return;
    state.value = ''; children.value = ''; search.value = ''; navigate('documents');
    await (loading || load(true));
    let file = files.find(item => item.id === id && item.ready);
    if (!file) { await load(true); file = files.find(item => item.id === id && item.ready); }
    if (file && active) open(file);
    else status.textContent = 'This submission is no longer available. Refresh Documents to see the remaining copies.';
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void load(refreshAgain); });
  window.addEventListener('cloud-documents-changed', () => void load(true));
  update(); window.lucide?.createIcons();
  return { update, refreshPending: load, setActive(value) { active = value; if (active) void load(true); else closeDocumentPreview(); } };
}
