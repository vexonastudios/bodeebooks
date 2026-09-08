// Mechanically adapted original Vocabulary parent editor.
export function setupCloudVocabulary(){
let state = { students: [], lists: [], defaults: {} };
let editingId = null;
let terms = [];
let archiveArmedUntil = 0;
let listSource = 'manual';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
})[character]);

let pending=null,busy=false,loading=false,offset=0,loadEpoch=0;
function notice(message){byId('vocabulary-admin-status').textContent=message;byId('vocabulary-form-error').textContent=message;}
function controls(){retry.hidden=retryModal.hidden=!pending;retry.disabled=retryModal.disabled=busy;for(const e of byId('vocabulary-list-modal').querySelectorAll('input,select,textarea,button'))e.disabled=busy||!!pending;if(!busy&&!pending){byId('vocabulary-list-student').disabled=!!editingId;byId('vocabulary-list-photos').disabled=true;}retryModal.disabled=busy;}
async function send(action,input={}){const response=await fetch('/guard/dashboard/vocabulary/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const result=await response.json();if(!response.ok){const error=new Error(result.error||'Vocabulary could not connect.');error.status=response.status;throw error;}return result;}
async function request(route,options={}){
  if(!options.method){const studentId=byId('vocabulary-student-filter').value;return send('list',{offset,...(studentId?{studentId}:{})});}
  if(busy)throw Error('Vocabulary is still saving.');
  const input=options.body?JSON.parse(options.body):{},fingerprint=JSON.stringify([route,options.method,input]);if(pending&&pending.fingerprint!==fingerprint)throw Error('Retry the saved Vocabulary change first.');
  if(!pending){const old=editingId?state.lists.find(l=>l.id===editingId):null,archive=options.method==='DELETE';if(editingId&&!old)throw Error('Refresh this Vocabulary list.');
    const value=archive?{...old,status:'archived',required_daily:false}:input;
    pending={fingerprint,command:{id:crypto.randomUUID(),kind:'list',studentId:old?.student_id||value.student_id,listId:old?.id||crypto.randomUUID(),revision:old?.revision||0,title:value.title,start_date:old?.start_date||state.defaults.startDate,test_date:value.test_date,status:value.status,required_daily:value.required_daily,daily_term_limit:value.daily_term_limit,retention_enabled:old?.retention_enabled??true,source_notes:old?.source_notes||'',terms:value.terms}};
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
    related_forms: csv(source.related_forms || source.forms),
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

function renderFamilySummary() {
  const root = byId('vocabulary-family-summary');
  if (!root) return;
  root.innerHTML = state.students.map(student => {
    const totalsForChild=state.familySummary.find(row=>row.studentId===student.id)||{stages:{},active:0};
    const totals = ['New','Learning','Test-ready','Remembered'].map(stage=>totalsForChild.stages[stage]||0);
    const active = totalsForChild.active;
    return `<article class="vocabulary-family-card">
      <div class="vocabulary-family-name">${studentAvatar(student)}<span><strong>${escapeHtml(student.name)}</strong><small>${active} active list${active === 1 ? '' : 's'}</small></span></div>
      <div class="vocabulary-stage-strip"><span><b>${totals[0]}</b><small>New</small></span><span><b>${totals[1]}</b><small>Learning</small></span><span><b>${totals[2]}</b><small>Test-ready</small></span><span><b>${totals[3]}</b><small>Remembered</small></span></div>
    </article>`;
  }).join('');
}

function itemWords(items) {
  return (items || []).map(item => typeof item === 'string' ? item : item.word || item.term).filter(Boolean);
}

function renderLists() {
  const filter = byId('vocabulary-student-filter')?.value || '';
  const lists = state.lists.filter(list => (!filter || String(list.student_id) === filter));
  const root = byId('vocabulary-list-grid');
  if (!lists.length) {
    root.innerHTML = '<div class="vocabulary-empty"><strong>No vocabulary lists here yet.</strong><br>Add the curriculum words and definitions manually. Photo scanning is unavailable.</div>';
    return;
  }
  root.innerHTML = lists.map(list => {
    const status = ['active', 'draft', 'completed', 'archived'].includes(list.status) ? list.status : 'draft';
    const trouble = itemWords(list.trouble_words || list.needs_work);
    const due = itemWords(list.due_words || list.review_due);
    const count = Number(list.term_count ?? list.word_count ?? listTerms(list).length) || 0;
    const readiness = Number(list.progress_summary?.readiness_percent ?? list.readiness_percent);
    return `<article class="vocabulary-list-card ${status === 'active' ? 'is-active' : ''}" data-vocabulary-list="${escapeHtml(list.id)}">
      <div class="vocabulary-list-top"><div><div class="vocabulary-list-student">${escapeHtml(list.student_name || state.students.find(student => String(student.id) === String(list.student_id))?.name || 'Child')}</div><div class="vocabulary-list-title">${escapeHtml(list.title || 'Vocabulary List')}</div></div><span class="vocabulary-list-badge ${status}">${escapeHtml(status)}</span></div>
      <div class="vocabulary-list-meta"><span>${count} words</span><span>Test ${escapeHtml(dateLabel(list.test_date))}</span><span>${Number(list.daily_term_limit) || 8} words per session</span><span>${list.required_daily ? 'Required daily' : 'Optional'}</span>${Number.isFinite(readiness) ? `<span>${Math.round(readiness)}% test-ready</span>` : ''}</div>
      <div class="vocabulary-stage-grid"><div><strong>${mastery(list, 'new')}</strong><span>New</span></div><div><strong>${mastery(list, 'learning')}</strong><span>Learning</span></div><div><strong>${mastery(list, 'test_ready')}</strong><span>Test-ready</span></div><div><strong>${mastery(list, 'remembered')}</strong><span>Remembered</span></div></div>
      ${trouble.length ? `<div class="vocabulary-trouble"><strong>Needs attention:</strong> ${trouble.slice(0, 8).map(escapeHtml).join(' · ')}</div>` : ''}
      ${due.length ? `<div class="vocabulary-due"><strong>Due for review:</strong> ${due.slice(0, 8).map(escapeHtml).join(' · ')}</div>` : ''}
    </article>`;
  }).join('');
  root.querySelectorAll('[data-vocabulary-list]').forEach(card => card.addEventListener('click', () => openModal(state.lists.find(list => String(list.id) === card.dataset.vocabularyList))));
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
      familySummary: result.familySummary||[],
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
    root.innerHTML = '<div class="vocabulary-empty-terms">No words yet. Add a word manually or scan the printed list.</div>';
    return;
  }
  root.innerHTML = terms.map((term, index) => {
    const review = term.completeness !== 'complete' || term.review_fields.length || !term.word || !term.definition;
    const input = (field, label, extra = '') => `<label class="${extra} ${fieldClass(term, field)}">${label}<input data-vocabulary-term="${index}" data-vocabulary-field="${field}" value="${escapeHtml(term[field])}"></label>`;
    return `<article class="vocabulary-term-card ${review ? 'needs-review' : ''}">
      <div class="vocabulary-term-card-head"><strong>Word ${index + 1}</strong>${review ? `<span class="vocabulary-term-warning">Review ${escapeHtml(term.review_fields.join(', ') || 'the scan result')}</span><button type="button" data-review-vocabulary-term="${index}">Optional blanks reviewed</button>` : ''}<button type="button" data-remove-vocabulary-term="${index}" aria-label="Remove word ${index + 1}">Remove</button></div>
      <div class="vocabulary-term-fields">
        ${input('word', 'Word')}${input('pronunciation', 'Pronunciation')}${input('part_of_speech', 'Part of speech')}${input('definition', 'Definition')}
        ${input('source_sentence', 'Source sentence', 'wide')}${input('synonyms', 'Synonyms', 'wide')}
        ${input('antonyms', 'Antonyms', 'wide')}${input('related_forms', 'Related forms', 'wide')}
      </div>
    </article>`;
  }).join('');
}

function blankTerm() { return normalizeTerm({}); }

function openModal(list = null, studentId = '') {
  if(busy||pending){notice('Retry the saved Vocabulary change first.');return;}
  editingId = list?.id || null;
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
  renderTermEditor();
  byId('vocabulary-list-modal').classList.add('active');controls();byId('vocabulary-scan-status').textContent='Photo scanning and AI meaning feedback are unavailable. Enter the exact curriculum words and definitions manually.';
}

function closeModal() {
  if(busy||pending){notice('Keep this editor open and retry the saved Vocabulary change.');return;}
  byId('vocabulary-list-modal').classList.remove('active');
  editingId = null;
  terms = [];
}

function parseList(value) { return String(value || '').split(/[,;\n]+/).map(item => item.trim()).filter(Boolean); }

function cleanTerms() {
  return terms.map(term => ({
    ...(term.id ? { id: term.id } : {}), word: term.word.trim(), pronunciation: term.pronunciation.trim(),
    part_of_speech: term.part_of_speech.trim(), definition: term.definition.trim(), source_sentence: term.source_sentence.trim(),
    synonyms: parseList(term.synonyms), antonyms: parseList(term.antonyms), related_forms: parseList(term.related_forms),
    missing_fields: [...term.review_fields], completeness: termCompleteness(term)
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
  finally { button.textContent = 'Save & assign'; controls(); }
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

function scanPhotos(){notice('Photo scanning is unavailable. Add the exact curriculum terms manually.');}

function setupVocabulary() {
  byId('vocabulary-add-list')?.addEventListener('click', () => openModal());
  byId('vocabulary-list-close')?.addEventListener('click', closeModal);
  byId('vocabulary-list-cancel')?.addEventListener('click', closeModal);
  byId('vocabulary-list-save')?.addEventListener('click', saveList);
  byId('vocabulary-list-archive')?.addEventListener('click', archiveList);
  byId('vocabulary-student-filter')?.addEventListener('change',()=>{offset=0;void loadVocabularyTab();});
  byId('vocabulary-add-term')?.addEventListener('click', () => { listSource = listSource === 'photo' ? 'photo' : 'manual'; terms.push(blankTerm()); renderTermEditor(); });
  byId('vocabulary-list-photos')?.addEventListener('change', event => scanPhotos(event.currentTarget.files));
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
const previous=button('Newer Vocabulary lists',async()=>{offset=Math.max(0,offset-2);await loadVocabularyTab();}),next=button('Older Vocabulary lists',async()=>{offset+=2;await loadVocabularyTab();});previous.disabled=next.disabled=true;byId('vocabulary-list-grid').after(previous,next);
const archived=document.createElement('option');archived.value='archived';archived.textContent='Archived — retained history and older-word reviews';byId('vocabulary-list-status').append(archived);
setupVocabulary();window.addEventListener('beforeunload',event=>{if(pending||busy){event.preventDefault();event.returnValue='';}});
return{update(){},setActive(active){if(active&&!loading){loading=true;void loadVocabularyTab().finally(()=>{loading=false;});}if(!active)closeModal();}};
}
