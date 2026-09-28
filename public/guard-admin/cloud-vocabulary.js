// Mechanically adapted original Vocabulary parent editor.
import { createVocabularyPhotoScan } from './cloud-vocabulary-scan.js?v=20260928-photo1';
export function setupCloudVocabulary(){
let state = { students: [], lists: [], defaults: {} };
let editingId = null; let editorOpener = null;
let terms = [];
let archiveArmedUntil = 0;
let listSource = 'manual';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
})[character]);

let pending=null,busy=false,loading=false,offset=0,loadEpoch=0,scanBusy=false,photoScan=null,sourceNotes='';
function notice(message){byId('vocabulary-admin-status').textContent=message;byId('vocabulary-form-error').textContent=message;}
function controls(){
  retry.hidden=retryModal.hidden=!pending;retry.disabled=retryModal.disabled=busy;
  for(const e of byId('vocabulary-list-modal').querySelectorAll('input,select,textarea,button'))e.disabled=busy||!!pending||scanBusy;
  if(!busy&&!pending){byId('vocabulary-list-student').disabled=scanBusy||!!editingId;byId('vocabulary-list-close').disabled=byId('vocabulary-list-cancel').disabled=false;}
  retryModal.disabled=busy;photoScan?.setState({enabled:state.photoScanningAvailable===true,locked:busy||!!pending});
}
async function send(action,input={}){const response=await fetch('/guard/dashboard/vocabulary/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const result=await response.json();if(!response.ok){const error=new Error(result.error||'Vocabulary could not connect.');error.status=response.status;throw error;}return result;}
async function request(route,options={}){
  if(!options.method){const studentId=byId('vocabulary-student-filter').value;return send('list',{offset,...(studentId?{studentId}:{})});}
  if(busy||scanBusy)throw Error('Finish or cancel the current scan or save first.');
  const input=options.body?JSON.parse(options.body):{},fingerprint=JSON.stringify([route,options.method,input]);if(pending&&pending.fingerprint!==fingerprint)throw Error('Retry the saved Vocabulary change first.');
  if(!pending){const old=editingId?state.lists.find(l=>l.id===editingId):null,archive=options.method==='DELETE';if(editingId&&!old)throw Error('Refresh this Vocabulary list.');
    const value=archive?{...old,status:'archived',required_daily:false}:input;
    pending={fingerprint,command:{id:crypto.randomUUID(),kind:'list',studentId:old?.student_id||value.student_id,listId:old?.id||crypto.randomUUID(),revision:old?.revision||0,title:value.title,start_date:old?.start_date||state.defaults.startDate,test_date:value.test_date,status:value.status,required_daily:value.required_daily,daily_term_limit:value.daily_term_limit,retention_enabled:old?.retention_enabled??true,source_notes:archive?old?.source_notes||'':sourceNotes,terms:value.terms}};
  }
  busy=true;controls();try{const result=await send('command',pending.command);pending=null;return result;}catch(error){if(error.status>=400&&error.status<500)pending=null;throw error;}finally{busy=false;controls();}
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'No test date';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day, 12));
}

function csv(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean).join(', ');
  return String(value || '');
}

function confidenceFields(source) {
  const fields = new Set();
  const confidence = source.field_confidence || source.confidence_by_field || {};
  Object.entries(confidence).forEach(([field, value]) => { if (Number(value) < .8) fields.add(field); });
  [...(source.missing_fields || []), ...(source.covered_fields || []), ...(source.uncertain_fields || [])].forEach(field => fields.add(String(field)));
  if (Number(source.confidence) > 0 && Number(source.confidence) < .8) fields.add('word');
  return [...fields];
}

function normalizeTerm(source = {}) {
  const reviewFields = confidenceFields(source);
  const sourceCompleteness = ['complete', 'needs_review', 'incomplete'].includes(source.completeness) ? source.completeness : '';
  return {
    id: source.id || '',
    word: String(source.word || source.term || '').trim(),
    pronunciation: String(source.pronunciation || source.pronunciation_guide || '').trim(),
    part_of_speech: String(source.part_of_speech || source.pos || '').trim(),
    definition: String(source.exact_definition || source.definition || source.meaning || '').trim(),
    source_sentence: String(source.source_sentence || source.example_sentence || source.sentence || source.example || '').trim(),
    synonyms: csv(source.synonyms),
    antonyms: csv(source.antonyms),
    related_forms: csv(source.related_forms || source.forms),source_notes:String(source.source_notes||source.notes||''),
    review_fields: reviewFields,
    completeness: sourceCompleteness || (reviewFields.length ? 'needs_review' : 'complete')
  };
}

function termCompleteness(term) {
  if (!term.word || !term.definition) return 'incomplete';
  if (!term.review_fields.length) return 'complete';
  return term.completeness === 'incomplete' ? 'incomplete' : 'needs_review';
}

function listTerms(list) {
  return (list?.terms || list?.words || []).map(normalizeTerm);
}

function mastery(list, key) {
  const summaries = list.progress_summary?.stages || list.mastery_counts || list.stage_counts || list.mastery || {};
  const aliases = {
    new: ['New', 'new', 'new_count'], learning: ['Learning', 'learning', 'learning_count'],
    test_ready: ['Test-ready', 'test_ready', 'testReady', 'test_ready_count'], remembered: ['Remembered', 'remembered', 'remembered_count']
  };
  for (const candidate of aliases[key] || [key]) {
    if (summaries[candidate] != null) return Number(summaries[candidate]) || 0;
    if (list[candidate] != null) return Number(list[candidate]) || 0;
  }
  return 0;
}

function studentAvatar(student){return '<span>'+escapeHtml(student.name?.slice(0,1)||'Aa')+'</span>';}

const stages = [
  { key: 'new', label: 'New' }, { key: 'learning', label: 'Learning' },
  { key: 'test_ready', label: 'Test-ready' }, { key: 'remembered', label: 'Remembered' }
];
function stageClass(value) { return stages.find(stage => stage.label === value)?.key || 'new'; }
function stageMarkup(totals) {
  return stages.map((stage, index) => `<div class="vocabulary-stage ${stage.key}"><strong>${totals[index]}</strong><span>${stage.label}</span></div>`).join('');
}
function progressBar(totals) {
  const total = totals.reduce((sum, value) => sum + value, 0);
  return `<div class="vocabulary-progress-bar" aria-hidden="true">${stages.map((stage,index) => `<span class="${stage.key}" style="flex-grow:${Math.max(0, totals[index]) / (total || 1)}"></span>`).join('')}</div>`;
}
function renderFamilySummary() {
  const root = byId('vocabulary-family-summary');
  if (!root) return;
  const filter = byId('vocabulary-student-filter').value;
  byId('vocabulary-show-all').hidden = !filter;
  root.innerHTML = state.students.map(student => {
    const totalsForChild=state.familySummary.find(row=>row.studentId===student.id)||{stages:{},active:0};
    const totals = ['New','Learning','Test-ready','Remembered'].map(stage=>totalsForChild.stages[stage]||0);
    const active = totalsForChild.active;
    return `<button type="button" class="vocabulary-family-card" data-vocabulary-child="${escapeHtml(student.id)}" aria-pressed="${filter === String(student.id)}">
      <span class="vocabulary-family-name"><span class="vocabulary-avatar" aria-hidden="true">${studentAvatar(student)}</span><span><strong>${escapeHtml(student.name)}</strong><small>${active ? `${active} active list${active === 1 ? '' : 's'}` : 'No active lists'}</small></span><span class="vocabulary-child-arrow" aria-hidden="true">→</span></span>
      ${progressBar(totals)}<span class="vocabulary-child-progress">${totals.reduce((sum,value)=>sum+value,0) ? `<b>${totals[2]+totals[3]}</b> test-ready or remembered <span>of ${totals.reduce((sum,value)=>sum+value,0)} words</span>` : 'Add a list to begin'}</span>
    </button>`;
  }).join('');
}
function itemWords(items) {
  return (items || []).map(item => typeof item === 'string' ? item : item.word || item.term).filter(Boolean);
}
function wordChips(words, kind, title) {
  if (!words.length) return '';
  return `<div class="vocabulary-review-group ${kind}"><strong>${title}</strong><div>${words.map(word=>`<span>${escapeHtml(word)}</span>`).join('')}</div></div>`;
}
function masteryDetails(list) {
  const words = list.word_progress || [];
  if (!words.length) return '<p class="vocabulary-no-progress">Word progress appears after practice is received.</p>';
  return `<details class="vocabulary-word-progress"><summary><span>Word-by-word progress</span><span class="vocabulary-word-count">${words.length} words</span></summary>
    <div class="vocabulary-word-table"><div class="vocabulary-word-table-head" aria-hidden="true"><span>Word &amp; stage</span><span>Meaning</span><span>Unaided recall</span><span>Context</span></div>
      ${words.map(word=>`<div class="vocabulary-word-row"><div class="vocabulary-word-name"><strong>${escapeHtml(word.word)}</strong><span class="vocabulary-stage-label ${stageClass(word.stage)}">${escapeHtml(word.stage)}</span></div><div><small>Meaning</small><span class="${word.meaning_checked?'is-checked':''}">${word.meaning_checked?'Checked':'To practice'}</span></div><div><small>Unaided recall</small><span>${Math.min(2,Number(word.recall_days)||0)} of 2 days</span></div><div><small>Context</small><span class="${word.context_checked?'is-checked':''}">${word.context_available?(word.context_checked?'Checked':'To practice'):'Not supplied'}</span></div></div>`).join('')}
    </div></details>`;
}
function renderLists() {
  const filter = byId('vocabulary-student-filter')?.value || '';
  const lists = state.lists.filter(list => (!filter || String(list.student_id) === filter));
  const root = byId('vocabulary-list-grid');
  const child = state.students.find(student => String(student.id) === filter);
  byId('vocabulary-lists-title').textContent = child ? `${child.name}’s vocabulary lists` : 'Vocabulary lists';
  if (!lists.length) {
    root.innerHTML = '<div class="vocabulary-empty"><strong>No vocabulary lists here yet.</strong><p>Add a list with the words and definitions your child is learning.</p><button type="button" class="btn btn-primary" data-vocabulary-create>Create a vocabulary list</button></div>';
    return;
  }
  root.innerHTML = lists.map(list => {
    const status = ['active', 'draft', 'completed', 'archived'].includes(list.status) ? list.status : 'draft';
    const trouble = itemWords(list.trouble_words || list.needs_work);
    const due = itemWords(list.due_words || list.review_due);
    const count = Number(list.term_count ?? list.word_count ?? listTerms(list).length) || 0;
    const readiness = Number(list.progress_summary?.readiness_percent ?? list.readiness_percent);
    const totals = stages.map(stage => mastery(list, stage.key));
    return `<article class="vocabulary-list-card ${status === 'active' ? 'is-active' : ''}" data-vocabulary-list="${escapeHtml(list.id)}">
      <div class="vocabulary-list-top"><div><div class="vocabulary-list-student">${escapeHtml(list.student_name || state.students.find(student => String(student.id) === String(list.student_id))?.name || 'Child')}</div><h3 class="vocabulary-list-title">${escapeHtml(list.title || 'Vocabulary List')}</h3></div><span class="vocabulary-list-badge ${status}">${escapeHtml(status)}</span></div>
      <div class="vocabulary-list-meta"><span>${count} words</span><span>${list.test_date ? `Test ${escapeHtml(dateLabel(list.test_date))}` : 'No test date'}</span><span>${Number(list.daily_term_limit) || 8} words / session</span><span>${list.required_daily ? 'Daily schoolwork' : 'Optional practice'}</span></div>
      <div class="vocabulary-readiness"><span>Ready for the test</span><strong>${Number.isFinite(readiness) ? `${Math.max(0,Math.min(100,Math.round(readiness)))}%` : 'Not assessed'}</strong></div>
      ${progressBar(totals)}<div class="vocabulary-stage-grid">${stageMarkup(totals)}</div>
      ${wordChips(trouble, 'needs-attention', 'Needs attention')}${wordChips(due, 'due-review', 'Due for review')}
      ${masteryDetails(list)}
      <footer class="vocabulary-list-footer"><span>Progress updates after practice syncs.</span><button class="btn btn-secondary" type="button" data-vocabulary-edit="${escapeHtml(list.id)}" aria-label="Edit ${escapeHtml(list.title)} for ${escapeHtml(list.student_name||'child')}">Edit list <span aria-hidden="true">↗</span></button></footer>
    </article>`;
  }).join('');
}

function populateStudents() {
  const options = state.students.map(student => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} · Grade ${escapeHtml(student.grade || '')}</option>`).join('');
  byId('vocabulary-list-student').innerHTML = options;
  const filter = byId('vocabulary-student-filter');
  const selected = filter.value;
  filter.innerHTML = `<option value="">All children</option>${options}`;
  if ([...filter.options].some(option => option.value === selected)) filter.value = selected;
}

async function loadVocabularyTab() {
  const status = byId('vocabulary-admin-status');
  if (!status) return;
  const epoch=++loadEpoch;status.textContent = 'Loading vocabulary mastery…';
  try {
    const result = await request(`/admin/lists`);
    if(epoch!==loadEpoch)return;previous.disabled=offset===0;next.disabled=!result.hasMore;
    state = {
      familySummary: result.familySummary||[],photoScanningAvailable:result.photoScanningAvailable===true,
      students: Array.isArray(result.students) ? result.students : [],
      lists: Array.isArray(result.lists) ? result.lists : [],
      defaults: result.defaults || {}
    };
    populateStudents();
    renderFamilySummary();
    renderLists();
    status.textContent = `${state.lists.length} list${state.lists.length === 1 ? '' : 's'} · ${state.students.length} children`;
  } catch (error) {
    if(epoch===loadEpoch)status.textContent = error.message;
  }
}

function fieldClass(term, field) {
  return term.review_fields.includes(field) || !term[field] && ['word', 'definition'].includes(field) ? 'field-review' : '';
}

function renderTermEditor() {
  const root = byId('vocabulary-term-editor');
  if (!terms.length) {
    root.innerHTML = '<div class="vocabulary-empty-terms">Take a photo of your vocabulary page, add saved photos, or use Add word.</div>';
    return;
  }
  root.innerHTML = terms.map((term, index) => {
    const review = term.completeness !== 'complete' || term.review_fields.length || !term.word || !term.definition;
    const input = (field, label, extra = '') => `<label class="${extra} ${fieldClass(term, field)}">${label}${['definition','source_sentence'].includes(field) ? `<textarea rows="2" data-vocabulary-term="${index}" data-vocabulary-field="${field}">${escapeHtml(term[field])}</textarea>` : `<input data-vocabulary-term="${index}" data-vocabulary-field="${field}" value="${escapeHtml(term[field])}">`}</label>`;
    return `<article class="vocabulary-term-card ${review ? 'needs-review' : ''}">
      <div class="vocabulary-term-card-head"><strong>Word ${index + 1}</strong>${review ? `<span class="vocabulary-term-warning">Review ${escapeHtml(term.review_fields.join(', ') || 'word and definition')}</span><button type="button" data-review-vocabulary-term="${index}">Optional blanks reviewed</button>` : ''}<button type="button" data-remove-vocabulary-term="${index}" aria-label="Remove word ${index + 1}">Remove</button></div>
      <div class="vocabulary-term-fields">
        ${input('word', 'Word')}${input('part_of_speech', 'Part of speech')}${input('definition', 'Definition', 'full')}
        </div><details class="vocabulary-term-extra"><summary>Examples &amp; related words (optional)</summary><div class="vocabulary-term-fields">${input('pronunciation', 'Pronunciation')}${input('source_sentence', 'Source sentence', 'full')}${input('synonyms', 'Synonyms')}${input('antonyms', 'Antonyms')}${input('related_forms', 'Related forms', 'full')}</div></details>
    </article>`;
  }).join('');
}

function blankTerm() { return normalizeTerm({}); }

function openModal(list = null, studentId = '') {
  if(busy||pending){notice('Retry the saved Vocabulary change first.');return;}
  editorOpener = document.activeElement;
  editingId = list?.id || null;
  photoScan.reset();sourceNotes=list?.source_notes||'';
  listSource = list?.source || 'manual';
  archiveArmedUntil = 0;
  terms = list ? listTerms(list) : [];
  byId('vocabulary-list-modal-title').textContent = list ? 'Edit Vocabulary List' : 'New Vocabulary List';
  byId('vocabulary-list-student').disabled = !!list;
  byId('vocabulary-list-student').value = list?.student_id || studentId || state.students[0]?.id || '';
  byId('vocabulary-list-title').value = list?.title || 'Weekly Vocabulary';
  byId('vocabulary-list-test-date').value = list?.test_date || state.defaults.testDate || '';
  byId('vocabulary-list-required').checked = list ? !!list.required_daily : state.defaults.requiredDaily !== false;
  byId('vocabulary-list-daily-limit').value = Number(list?.daily_term_limit || state.defaults.dailyTermLimit || 8);
  const statusSelect = byId('vocabulary-list-status');
  const completedOption = [...statusSelect.options].find(option => option.value === 'completed');
  if (completedOption) {
    completedOption.hidden = !list;
    completedOption.disabled = !list;
  }
  statusSelect.value = ['active', 'draft', 'completed', 'archived'].includes(list?.status) ? list.status : 'active';
  byId('vocabulary-list-archive').hidden = !list || list.status === 'archived';
  byId('vocabulary-list-archive').textContent = 'Archive list';
  byId('vocabulary-form-error').textContent = '';
  byId('vocabulary-scan-status').textContent = '';
  byId('vocabulary-scan-status').className = 'vocabulary-scan-status';
  byId('vocabulary-list-photos').value = '';
  byId('vocabulary-list-save').textContent=list?'Save changes':'Save & assign';
  renderTermEditor();
  byId('vocabulary-list-modal').classList.add('active');byId('vocabulary-list-modal').querySelector('.modal-card').scrollTop=0;byId('vocabulary-list-close').focus();controls();byId('vocabulary-scan-status').textContent=state.photoScanningAvailable?'Scan photos or enter the exact words and definitions below.':'Photo scanning is temporarily unavailable. You can still enter words and definitions.';
}

function closeModal() {
  if(busy||pending){notice('Keep this editor open and retry the saved Vocabulary change.');return;}
  photoScan.reset();
  byId('vocabulary-list-modal').classList.remove('active');
  editorOpener?.focus();editorOpener=null;
  editingId = null;
  terms = [];
}

function parseList(value) { return String(value || '').split(/[,;\n]+/).map(item => item.trim()).filter(Boolean); }

function cleanTerms() {
  return terms.map(term => ({
    ...(term.id ? { id: term.id } : {}), word: term.word.trim(), pronunciation: term.pronunciation.trim(),
    part_of_speech: term.part_of_speech.trim(), definition: term.definition.trim(), source_sentence: term.source_sentence.trim(),
    synonyms: parseList(term.synonyms), antonyms: parseList(term.antonyms), related_forms: parseList(term.related_forms),
    source_notes:term.source_notes,missing_fields: [...term.review_fields], completeness: termCompleteness(term)
  })).filter(term => term.word || term.definition);
}

async function saveList() {
  const error = byId('vocabulary-form-error');
  error.textContent = '';
  const payloadTerms = cleanTerms();
  if (!byId('vocabulary-list-student').value) return (error.textContent = 'Choose a child.');
  if (!byId('vocabulary-list-title').value.trim()) return (error.textContent = 'Give the list a name.');
  if (payloadTerms.length < 3) return (error.textContent = 'Add at least 3 vocabulary words so practice choices stay meaningful.');
  const selectedStatus = byId('vocabulary-list-status').value;
  if (payloadTerms.some(term => !term.word)) return (error.textContent = 'Every saved entry needs a vocabulary word.');
  if (selectedStatus !== 'draft' && payloadTerms.some(term => !term.definition)) {
    return (error.textContent = 'Every active word needs its curriculum definition. Save as a draft if the page is incomplete.');
  }
  const button = byId('vocabulary-list-save');
  button.disabled = true; button.textContent = 'Saving…';
  try {
    await request(editingId ? `/admin/lists/${encodeURIComponent(editingId)}` : `/admin/lists`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        student_id: byId('vocabulary-list-student').value,
        title: byId('vocabulary-list-title').value.trim(),
        test_date: byId('vocabulary-list-test-date').value,
        required_daily: byId('vocabulary-list-required').checked,
        daily_term_limit: Math.max(4, Math.min(15, Number(byId('vocabulary-list-daily-limit').value) || 8)),
        status: selectedStatus,
        source: listSource, terms: payloadTerms
      })
    });
    closeModal();
    window.showToast?.('Vocabulary list saved and assigned.');
    await loadVocabularyTab();
  } catch (cause) { error.textContent = cause.message; }
  finally { button.textContent = editingId ? 'Save changes' : 'Save & assign'; controls(); }
}

async function archiveList() {
  if (!editingId) return;
  const button = byId('vocabulary-list-archive');
  if (Date.now() > archiveArmedUntil) {
    archiveArmedUntil = Date.now() + 5000;
    button.textContent = 'Click again to archive';
    byId('vocabulary-form-error').textContent = 'Practice history will be preserved. Click Archive again to continue.';
    return;
  }
  button.disabled = true;
  try {
    await request(`/admin/lists/${encodeURIComponent(editingId)}`, { method: 'DELETE' });
    closeModal(); window.showToast?.('Vocabulary list archived.'); await loadVocabularyTab();
  } catch (error) { byId('vocabulary-form-error').textContent = error.message; }
  finally { controls(); }
}

function setupVocabulary() {
  byId('vocabulary-add-list')?.addEventListener('click', () => openModal(null, byId('vocabulary-student-filter').value));
  byId('vocabulary-family-summary').addEventListener('click', event => { const child=event.target.closest('[data-vocabulary-child]'); if(child){byId('vocabulary-student-filter').value=child.dataset.vocabularyChild;offset=0;void loadVocabularyTab();} });
  byId('vocabulary-show-all').addEventListener('click',()=>{byId('vocabulary-student-filter').value='';offset=0;void loadVocabularyTab();});
  byId('vocabulary-list-grid').addEventListener('click',event=>{const edit=event.target.closest('[data-vocabulary-edit]');if(edit)openModal(state.lists.find(list=>String(list.id)===edit.dataset.vocabularyEdit));if(event.target.closest('[data-vocabulary-create]'))openModal(null,byId('vocabulary-student-filter').value);});
  byId('vocabulary-list-modal').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeModal();}if(event.key==='Tab'){const nodes=[...byId('vocabulary-list-modal').querySelectorAll('button,input,select,textarea,summary')].filter(el=>!el.disabled&&el.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  byId('vocabulary-list-close')?.addEventListener('click', closeModal);
  byId('vocabulary-list-cancel')?.addEventListener('click', closeModal);
  byId('vocabulary-list-save')?.addEventListener('click', saveList);
  byId('vocabulary-list-archive')?.addEventListener('click', archiveList);
  byId('vocabulary-student-filter')?.addEventListener('change',()=>{offset=0;void loadVocabularyTab();});
  byId('vocabulary-add-term')?.addEventListener('click', () => { listSource = listSource === 'photo' ? 'photo' : 'manual'; terms.push(blankTerm()); renderTermEditor(); });

  byId('vocabulary-term-editor')?.addEventListener('input', event => {
    const input = event.target.closest('[data-vocabulary-field]');
    if (!input) return;
    const term = terms[Number(input.dataset.vocabularyTerm)];
    if (!term) return;
    term[input.dataset.vocabularyField] = input.value;
    term.review_fields = term.review_fields.filter(field => field !== input.dataset.vocabularyField);
    term.completeness = termCompleteness(term);
    input.closest('label')?.classList.remove('field-review');
  });
  byId('vocabulary-term-editor')?.addEventListener('click', event => {
    const reviewed = event.target.closest('[data-review-vocabulary-term]');
    if (reviewed) {
      const term = terms[Number(reviewed.dataset.reviewVocabularyTerm)];
      if (term) {
        term.review_fields = term.review_fields.filter(field => ['word', 'definition'].includes(field) || term[field]);
        term.completeness = termCompleteness(term);
      }
      renderTermEditor();
      return;
    }
    const button = event.target.closest('[data-remove-vocabulary-term]');
    if (!button) return;
    terms.splice(Number(button.dataset.removeVocabularyTerm), 1); renderTermEditor();
  });
}

function button(label,action){const e=document.createElement('button');e.type='button';e.className='btn btn-secondary';e.textContent=label;e.onclick=()=>void action().catch(error=>notice(error.message));return e;}
async function retryChange(){if(!pending||busy)return;busy=true;controls();try{await send('command',pending.command);pending=null;busy=false;closeModal();await loadVocabularyTab();}catch(error){if(error.status>=400&&error.status<500)pending=null;throw error;}finally{busy=false;controls();}}
const retry=button('Retry saved Vocabulary change',retryChange),retryModal=button('Retry saved Vocabulary change',retryChange);retryModal.id='vocabulary-retry-modal';retry.hidden=retryModal.hidden=true;byId('vocabulary-admin-status').after(retry);byId('vocabulary-form-error').after(retryModal);
const previous=button('Newer Vocabulary lists',async()=>{offset=Math.max(0,offset-2);await loadVocabularyTab();}),next=button('Older Vocabulary lists',async()=>{offset+=2;await loadVocabularyTab();});previous.disabled=next.disabled=true;byId('vocabulary-pagination').append(previous,next);
const archived=document.createElement('option');archived.value='archived';archived.textContent='Archived — retained history and older-word reviews';byId('vocabulary-list-status').append(archived);
photoScan=createVocabularyPhotoScan({input:byId('vocabulary-list-photos'),status:byId('vocabulary-scan-status'),onBusy(value){scanBusy=value;controls();},onResult(result){
  if(!result.is_vocabulary_list||!result.terms.length)return 'No vocabulary words were found. Take a clearer photo with the words and definitions visible.';
  const key=word=>word.trim().normalize('NFKC').toLocaleLowerCase('en-US'),seen=new Set(terms.map(t=>key(t.word))),added=[];let skipped=0;
  for(const source of result.terms){const term=normalizeTerm(source);if(seen.has(key(term.word))){skipped++;continue;}seen.add(key(term.word));added.push(term);}
  if(terms.length+added.length>60)return 'This scan would exceed 60 words. Your current words are kept. Remove unneeded entries, then scan fewer words.';
  const first=terms.length;terms.push(...added);listSource='photo';sourceNotes=[sourceNotes,result.notes].filter(Boolean).join(' ').slice(0,800);
  if(!editingId&&first===0&&result.title&&byId('vocabulary-list-title').value==='Weekly Vocabulary')byId('vocabulary-list-title').value=result.title;
  renderTermEditor();byId('vocabulary-form-error').textContent='';
  requestAnimationFrame(()=>{if(byId('vocabulary-list-modal').classList.contains('active'))byId('vocabulary-term-editor').querySelectorAll('[data-vocabulary-field="word"]')[first]?.focus();});
  return added.length+' words added with their printed definitions and context. Review before Save & assign.'+(skipped?' '+skipped+' duplicate words skipped; your existing entries were kept.':'')+(result.notes?' '+result.notes:'');
}});
setupVocabulary();window.addEventListener('beforeunload',event=>{if(pending||busy||scanBusy){event.preventDefault();event.returnValue='';}});
return{update(){},setActive(active){if(active&&!loading){loading=true;void loadVocabularyTab().finally(()=>{loading=false;});}if(!active)closeModal();}};
}
