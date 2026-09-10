// Adapted from the original weekly-list editor and progress cards.
export function setupCloudSpelling({endpoint}){
const API = '/spelling-adapter';

let data = { students: [], lists: [], defaults: {} };
let editingId = null, editingWords = [];
let currentView = 'active';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
})[character]);

let active=false,loading=false,offset=0,pending=null,scanGeneration=0,pendingScan=null,scanBusy=false;
function notice(message){byId('spelling-admin-status').textContent=message;byId('spelling-scan-status').textContent=message;}
async function send(action,input={}){const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const value=await response.json();if(!response.ok){const error=new Error(value.error||'Spelling could not connect.');error.status=response.status;throw error;}return value;}
async function request(route,options={}){
  if(!options.method)return send('list-spelling',{offset});
  const fingerprint=JSON.stringify([route,options.method,options.body||'']);
  if(pending&&pending.fingerprint!==fingerprint)throw new Error('A previous Spelling change is awaiting confirmation. Use Retry saved change.');
  if(!pending){const value=options.body?JSON.parse(options.body):{},coach=route.includes('/admin/coach/');let command;
    if(coach){const student=data.students.find(child=>child.id===decodeURIComponent(route.split('/').at(-1)));if(!student)throw new Error('Refresh the selected child.');command={kind:'settings',studentId:student.id,revision:student.coach_revision,enabled:value.enabled};}
    else {const listId=options.method==='POST'?crypto.randomUUID():decodeURIComponent(route.split('/').at(-1)),old=data.lists.find(list=>list.id===listId),archive=options.method==='DELETE';if(!old&&options.method!=='POST')throw new Error('Refresh the selected list.');const words=archive?old.words:value.words.map(word=>editingWords.find(item=>item.word.toLocaleLowerCase()===word.toLocaleLowerCase())||{word});command={kind:'list',studentId:archive?old.student_id:value.student_id,listId,revision:old?.revision||0,title:archive?old.title:value.title,weekStart:archive?old.week_start:value.week_start,testDate:archive?old.test_date:value.test_date,practiceOnly:archive?old.practice_only:value.practice_only,status:archive?'archived':value.status,words};}
    pending={fingerprint,command:{...command,id:crypto.randomUUID()}};
  }
  try{const result=await send('spelling-command',pending.command);pending=null;retry.hidden=true;return result;}catch(error){if(error.status>=400&&error.status<500)pending=null;retry.hidden=!pending;throw error;}
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'Not set';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(year, month - 1, day, 12));
}

function modeLabel(mode) {
  if (mode === 'learn') return 'Learn';
  if (mode === 'test') return 'Practice pre-test';
  return 'Practice';
}

function sessionDateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
  const today=data.date;
  return value === today ? 'today' : `on ${dateLabel(value)}`;
}

function renderCompletedSession(session) {
  if (!session) return '';
  const total = Number(session.total_words) || 0;
  const firstTry = Number(session.first_try_correct) || 0;
  const missedFirstTry = Math.max(0, total - firstTry);
  const eventual = Number(session.eventual_correct) || 0;
  return `<div class="spelling-session-status is-complete">
    <strong>✓ ${escapeHtml(modeLabel(session.mode))} completed ${escapeHtml(sessionDateLabel(session.session_date))}</strong>
    <span>${firstTry}/${total} right first try · ${missedFirstTry} missed first try · ${eventual}/${total} eventually correct</span>
  </div>`;
}

function renderActiveSession(session) {
  const total = Number(session.total_words) || 0;
  const attempted = Number(session.words_attempted) || 0;
  const corrected = Number(session.eventual_correct_so_far) || 0;
  const firstTry = Number(session.first_try_correct_so_far) || 0;
  const missedFirstTry = Number(session.missed_first_try_so_far) || 0;
  return `<div class="spelling-session-status is-progress">
    <strong>⏳ ${escapeHtml(modeLabel(session.mode))} not finished</strong>
    <span>${corrected}/${total} words completed · ${attempted}/${total} attempted · ${firstTry} right first try · ${missedFirstTry} missed first try</span>
  </div>`;
}

function countWords() {
  const count = byId('spelling-list-words').value.split(/[\r\n,;]+/).map(word => word.trim()).filter(Boolean).length;
  byId('spelling-word-count').textContent = `${count} word${count === 1 ? '' : 's'}`;
}

function listBelongsToView(list, view) {
  const status = String(list?.status || 'draft');
  if (view === 'active') return status === 'active';
  if (view === 'archive') return status === 'completed' || status === 'archived';
  return status === 'draft';
}

function updateViewTabs(studentLists) {
  const counts = {
    active: studentLists.filter(list => listBelongsToView(list, 'active')).length,
    archive: studentLists.filter(list => listBelongsToView(list, 'archive')).length,
    draft: studentLists.filter(list => listBelongsToView(list, 'draft')).length
  };
  byId('spelling-active-count').textContent = counts.active;
  byId('spelling-archive-count').textContent = counts.archive;
  byId('spelling-draft-count').textContent = counts.draft;
  document.querySelectorAll('[data-spelling-view]').forEach(button => {
    const selected = button.dataset.spellingView === currentView;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  return counts;
}

function render() {
  const filter = byId('spelling-student-filter').value;
  const studentLists = data.lists.filter(list => !filter || String(list.student_id) === filter);
  const counts = updateViewTabs(studentLists);
  const lists = studentLists.filter(list => listBelongsToView(list, currentView));
  const root = byId('spelling-list-grid');
  const viewCopy = currentView === 'active'
    ? `${counts.active} active list${counts.active === 1 ? '' : 's'}`
    : currentView === 'archive'
      ? `${counts.archive} completed or archived list${counts.archive === 1 ? '' : 's'}`
      : `${counts.draft} draft list${counts.draft === 1 ? '' : 's'}`;
  byId('spelling-admin-status').textContent = `${viewCopy} on this page · ${data.students.length} children`;
  if (!lists.length) {
    const emptyCopy = currentView === 'active'
      ? '<strong>No active spelling lists.</strong><br>Create this week’s list in the editor.'
      : currentView === 'archive'
        ? '<strong>The spelling archive is empty.</strong><br>Completed and archived weekly lists will remain available here.'
        : '<strong>No draft spelling lists.</strong><br>Save an unfinished list as a draft when you want to finish it later.';
    root.innerHTML = `<div class="spelling-empty">${emptyCopy}</div>`;
    return;
  }
  root.innerHTML = lists.map(list => {
    const latestTest = list.latest_test;
    const latestStudy = list.latest_study;
    const studyTotal = Number(latestStudy?.total_words) || 0;
    const studyFirstTry = Number(latestStudy?.first_try_correct) || 0;
    const studyMissed = latestStudy ? Math.max(0, studyTotal - studyFirstTry) : null;
    const activeSessions = Array.isArray(list.active_sessions) ? list.active_sessions : [];
    const completedCount = list.completed_count ?? (Array.isArray(list.sessions) ? list.sessions.length : 0);
    const status = String(list.status || 'draft');
    return `<article class="spelling-list-card ${status === 'active' ? 'is-active' : ''}" data-spelling-list="${escapeHtml(list.id)}">
      <div class="spelling-list-top"><div><div class="spelling-list-student">${escapeHtml(list.student_name)}</div><div class="spelling-list-title">${escapeHtml(list.title)}</div></div><span class="spelling-list-badge ${status}">${escapeHtml(status === 'active' ? 'Active list' : status)}</span></div>
      <div class="spelling-list-meta"><span>${list.word_count} words</span>${list.practice_only?'<span>Practice anytime</span>':`<span>Week ${dateLabel(list.week_start)}</span><span>Pre-test ${dateLabel(list.test_date)}</span>`}</div>
      <div class="spelling-list-progress"><div><strong>${list.study_days ?? list.days_practiced ?? 0}</strong><span>Study days</span></div><div><strong>${latestStudy ? `${studyFirstTry}/${studyTotal}` : '—'}</strong><span>Right first try</span></div><div><strong>${latestStudy ? studyMissed : '—'}</strong><span>Missed first try</span></div></div>
      <div class="spelling-pretest-row"><strong>Practice pre-test:</strong> ${list.practice_only ? 'No scheduled test' : latestTest ? `${Math.round(Number(latestTest.score_percent))}% · ${latestTest.first_try_correct}/${latestTest.total_words} right` : `Not taken yet · opens ${dateLabel(list.test_date)}`}</div>
      ${list.source_science_list_id?'<p class="spelling-history-row">Earlier science results are saved in Previous results below.</p>':''}${renderCompletedSession(latestStudy)}
      ${activeSessions.map(renderActiveSession).join('')}
      ${list.trouble_words?.length ? `<div class="spelling-trouble-row"><strong>Needs work:</strong> ${list.trouble_words.map(item => `${escapeHtml(item.word)} (${item.misses})`).join(' · ')}</div>` : ''}
      <div class="spelling-history-row">${completedCount} completed · ${activeSessions.length} unfinished</div>
    </article>`;
  }).join('');
  root.querySelectorAll('[data-spelling-list]').forEach(card => card.addEventListener('click', () => openModal(data.lists.find(list => list.id === card.dataset.spellingList))));
}

function avatarMarkup(student) { return `<span class="spelling-coach-avatar">${escapeHtml(student.name.slice(0,1))}</span>`; }

function renderCoachSettings() {
  const root = byId('spelling-coach-grid');
  if (!root) return;
  root.innerHTML = data.students.map(student => {
    const enabled = Number(student.spelling_coach_enabled) === 1;
    const activeWords = Number(student.coach_active_words || 0);
    const seenWords = Number(student.coach_words_seen || 0);
    const detail = enabled
      ? (activeWords ? `Helping with ${activeWords} current word${activeWords === 1 ? '' : 's'}` : seenWords ? 'No current hints needed' : 'Ready to learn from practice')
      : 'Off — ordinary practice only';
    return `<div class="spelling-coach-child">
      ${avatarMarkup(student)}
      <div class="spelling-coach-copy"><strong>${escapeHtml(student.name)}</strong><span>${escapeHtml(detail)}</span></div>
      <label class="spelling-coach-toggle" title="Turn Personal Spelling Coach ${enabled ? 'off' : 'on'} for ${escapeHtml(student.name)}">
        <input type="checkbox" data-spelling-coach-student="${escapeHtml(student.id)}" ${enabled ? 'checked' : ''} aria-label="Personal Spelling Coach for ${escapeHtml(student.name)}">
        <span aria-hidden="true"></span>
      </label>
    </div>`;
  }).join('');
  root.querySelectorAll('[data-spelling-coach-student]').forEach(input => input.addEventListener('change', () => saveCoachSetting(input)));
}

async function saveCoachSetting(input) {
  const student = data.students.find(item => String(item.id) === String(input.dataset.spellingCoachStudent));
  if (!student) return;
  const enabled = input.checked;
  input.disabled = true;
  try {
    const saved = await request(`${API}/spelling/admin/coach/${encodeURIComponent(student.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled })
    });
    student.spelling_coach_enabled = enabled ? 1 : 0;
    student.coach_revision = saved.revision;
    notice(`Personal Spelling Coach ${enabled ? 'enabled' : 'disabled'} for ${student.name}.`);
    renderCoachSettings();
  } catch (error) {
    input.checked = !enabled;
    input.disabled = false;
    notice(error.message, true);
  }
}

function populateSelectors() {
  const options = data.students.map(student => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} · Grade ${escapeHtml(student.grade || '')}</option>`).join('');
  byId('spelling-list-student').innerHTML = options;
  const filter = byId('spelling-student-filter');
  const selected = filter.value;
  filter.innerHTML = `<option value="">All students</option>${options}`;
  if ([...filter.options].some(option => option.value === selected)) filter.value = selected;
}

async function loadSpellingTab() {
  const status = byId('spelling-admin-status');
  if (!status) return;
  status.textContent = 'Loading weekly lists…';
  try {
    data = await request(`${API}/spelling/admin/lists`);
    previous.disabled=offset===0;next.disabled=!data.hasMoreLists;
    populateSelectors();
    renderCoachSettings();
    renderBanks();
    render();
  } catch (error) {
    status.textContent = error.message;
  }
}

function openModal(list = null, studentId = '', bank = null) {
  resetScan();
  editingId = list?.id || null;
  editingWords = list?.words || bank?.words || [];
  anytime.checked=!!list?.practice_only||!!bank;
  updateDates();
  byId('spelling-list-modal-title').textContent = list ? 'Edit Spelling List' : 'New Spelling List';
  byId('spelling-list-student').disabled = !!list;
  byId('spelling-list-student').value = list?.student_id || studentId || data.students[0]?.id || '';
  byId('spelling-list-title').value = list?.title || bank?.title || 'Weekly Spelling';
  byId('spelling-list-week').value = list?.week_start || data.defaults.weekStart || '';
  byId('spelling-list-test').value = list?.test_date || data.defaults.testDate || '';
  const listStatus = ['active', 'draft', 'completed', 'archived'].includes(list?.status) ? list.status : 'active';
  const historical = listStatus === 'completed' || listStatus === 'archived';
  byId('spelling-status-completed').hidden = !historical;
  byId('spelling-status-archived').hidden = !historical;
  byId('spelling-list-status').value = listStatus;
  byId('spelling-list-words').value = editingWords.map(item => item.word).join('\n');
  byId('spelling-list-archive').hidden = !list || list.status === 'archived';
  byId('spelling-scan-status').textContent = data.photoScanningAvailable===true?'':'Photo scanning is currently unavailable. Enter or paste the words below. The built-in spelling coach remains available.';
  byId('spelling-scan-status').className = 'spelling-scan-status';
  byId('spelling-list-photo').value = '';
  countWords();
  byId('spelling-list-modal').classList.add('active');
}

function closeModal() {
  resetScan();
  byId('spelling-list-modal').classList.remove('active');
  editingId = null;
}

async function saveList() {
  const button = byId('spelling-list-save');
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    const payload = {
      student_id: byId('spelling-list-student').value,
      title: byId('spelling-list-title').value.trim(),
      week_start: byId('spelling-list-week').value,
      test_date: byId('spelling-list-test').value,
      status: byId('spelling-list-status').value,
      practice_only: anytime.checked,
      words: byId('spelling-list-words').value.split(/[\r\n,;]+/).map(word => word.trim()).filter(Boolean)
    };
    await request(editingId ? `${API}/spelling/admin/lists/${encodeURIComponent(editingId)}` : `${API}/spelling/admin/lists`, {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify(payload)
    });
    closeModal();
    notice('Spelling list saved.');
    await loadSpellingTab();
  } catch (error) {
    notice(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = 'Save List';
  }
}

async function archiveList() {
  if (!editingId || !window.confirm('Archive this spelling list? Its practice and pre-test history will be preserved.')) return;
  try {
    await request(`${API}/spelling/admin/lists/${encodeURIComponent(editingId)}`, { method: 'DELETE' });
    closeModal();
    notice('Spelling list archived.');
    await loadSpellingTab();
  } catch (error) { notice(error.message, true); }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That photo could not be read'));
    reader.readAsDataURL(file);
  });
}

async function preparePhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024) throw new Error('Choose a JPEG, PNG or WebP photo up to 20 MB.');
  const source = await readFile(file);
  const image = await new Promise((resolve, reject) => {
    const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error('That image could not be opened')); element.src = source;
  });
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw new Error('Choose a smaller, clear photo of the printed list.');
  const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let dataUrl=canvas.toDataURL('image/jpeg',.86);
  for(const quality of [.76,.66,.56]){if(dataUrl.length<=2700000)break;dataUrl=canvas.toDataURL('image/jpeg',quality);}
  if(dataUrl.length>2700000)throw new Error('Crop the photo to the spelling words and choose it again.');
  return { data: dataUrl.split(',')[1], mime: 'image/jpeg' };
}

function scanControls(busy){
  scanBusy=busy;
  for(const id of ['spelling-list-photo','spelling-list-save','spelling-list-archive','spelling-list-title','spelling-list-words','spelling-list-week','spelling-list-test','spelling-list-status'])byId(id).disabled=busy;
  byId('spelling-list-photo').disabled=busy||data.photoScanningAvailable!==true;
  byId('spelling-list-student').disabled=busy||!!editingId;scanRetry.disabled=busy;
}
function resetScan(){scanGeneration++;pendingScan=null;scanRetry.hidden=true;scanControls(false);}
async function runScan(epoch){
  const status=byId('spelling-scan-status');status.className='spelling-scan-status';status.textContent='Scanning the printed words for your review…';scanControls(true);
  try{
    const response=await fetch('/guard/dashboard/spelling-scan/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers:{'Content-Type':'application/json'},body:JSON.stringify(pendingScan)});
    const result=await response.json();if(!response.ok){const error=new Error(result.error||'The scan reply was lost. Retry this scan.');error.status=response.status;throw error;}
    if(epoch!==scanGeneration)return;
    pendingScan=null;scanRetry.hidden=true;
    if(result.is_spelling_list===false)throw new Error('This photo does not look like a spelling list. Choose a clearer photo of the printed spelling words.');
    if(!result.words?.length)throw new Error(result.notes||'No spelling words were found. Try a clearer photo.');
    byId('spelling-list-words').value=result.words.map(item=>item.word).join('\n');
    if(result.title&&(!byId('spelling-list-title').value||byId('spelling-list-title').value==='Weekly Spelling'))byId('spelling-list-title').value=result.title;
    const uncertain=result.words.filter(item=>Number(item.confidence)<.8).length;
    status.textContent=`Found ${result.words.length} words. ${uncertain?`Carefully check ${uncertain} uncertain word${uncertain===1?'':'s'}. `:''}Review every word before saving.${result.notes?' '+result.notes:''}`;countWords();
  }catch(error){if(epoch===scanGeneration){if(error.status>=400&&error.status<500&&error.status!==409)pendingScan=null;status.className='spelling-scan-status error';status.textContent=error.message;scanRetry.hidden=!pendingScan;}}
  finally{if(epoch===scanGeneration){scanControls(false);byId('spelling-list-photo').value='';}}
}
async function scanPhoto(file) {
  if (!file||scanBusy||data.photoScanningAvailable!==true) return;
  const epoch=++scanGeneration;pendingScan=null;scanRetry.hidden=true;scanControls(true);
  const status = byId('spelling-scan-status');
  status.className = 'spelling-scan-status';
  status.textContent = 'Preparing and scanning the page…';
  try {
    const payload=await preparePhoto(file);if(epoch!==scanGeneration)return;pendingScan={...payload,id:crypto.randomUUID()};await runScan(epoch);
  } catch (error) {
    if(epoch===scanGeneration){status.className='spelling-scan-status error';status.textContent=error.message;scanControls(false);byId('spelling-list-photo').value='';}
  }
}

function setupSpelling() {
  const heading=document.querySelector('#tab-spelling h1');if(heading){heading.textContent='Spelling';const intro=heading.nextElementSibling;if(intro?.tagName==='P')intro.textContent='Set weekly words or choose science terms from the word library.';}
  const add=byId('spelling-add-list');if(add){for(const child of add.childNodes)if(child.nodeType===Node.TEXT_NODE)child.textContent=' New List';}

  byId('spelling-add-list')?.addEventListener('click', () => openModal());
  byId('spelling-list-cancel')?.addEventListener('click', closeModal);
  byId('spelling-list-save')?.addEventListener('click', saveList);
  byId('spelling-list-archive')?.addEventListener('click', archiveList);
  byId('spelling-list-words')?.addEventListener('input', countWords);
  byId('spelling-student-filter')?.addEventListener('change', render);
  document.querySelectorAll('[data-spelling-view]').forEach(button => button.addEventListener('click', () => {
    currentView = button.dataset.spellingView;
    render();
  }));
  byId('spelling-list-photo')?.addEventListener('change', event => scanPhoto(event.target.files?.[0]));
}

const button=(label,fn)=>{const value=document.createElement('button');value.className='btn btn-secondary';value.textContent=label;value.onclick=()=>void Promise.resolve().then(fn).catch(error=>notice(error.message));return value;};

const anytimeLabel=document.createElement('label');anytimeLabel.className='form-group';anytimeLabel.style.cssText='grid-column:1/-1;display:flex;gap:8px;align-items:center;color:var(--text-primary)';
const anytime=document.createElement('input');anytime.type='checkbox';anytimeLabel.append(anytime,document.createTextNode(' Practice anytime — no test date'));
byId('spelling-list-week').closest('.form-group')?.before(anytimeLabel);
if(!anytimeLabel.isConnected)byId('spelling-list-week').before(anytimeLabel);
function updateDates(){for(const id of ['spelling-list-week','spelling-list-test']){byId(id).closest('.form-group').hidden=anytime.checked;byId(id).disabled=anytime.checked;byId(id).required=!anytime.checked;}}
anytime.onchange=updateDates;
const banks=document.createElement('details');banks.className='spelling-list-card';byId('spelling-list-grid').before(banks);
function renderBanks(){
  banks.replaceChildren();const heading=document.createElement('summary');heading.textContent='Word library · Science terms';banks.append(heading);
  for(const bank of data.word_banks||[]){const row=document.createElement('div');row.className='spelling-list-meta';const name=document.createElement('span');name.textContent=bank.title+' · '+bank.words.length+' terms';const use=button('Use words',()=>openModal(null,byId('spelling-student-filter').value,bank));row.append(name,use);banks.append(row);}
}
async function exportEarlierResults(){
  const rows=[];let offset=0;
  for(;;){const response=await fetch('/guard/dashboard/science-spelling/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'list',view:'history',offset,...(byId('spelling-student-filter').value?{studentId:byId('spelling-student-filter').value}:{})})});const result=await response.json();if(!response.ok)throw Error(result.error||'Previous results could not load.');rows.push(...result.rows);if(!result.hasMore)break;offset+=200;if(offset>=100000)throw Error('Choose one child to export fewer results.');}
  const columns=['student','list','word','mode','response','correct','first_attempt','mastery_credit','created_at'];
  const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"' const scanRetry=button(").replaceAll('"','""')+'"';
  const csv=[columns.join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),link=document.createElement('a');link.href=url;link.download='previous-spelling-results.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notice(rows.length+' previous results exported.');
}
byId('spelling-list-grid').after(button('Previous results (CSV)',exportEarlierResults));

const scanRetry=button('Retry this photo scan',async()=>{if(pendingScan&&!scanBusy)await runScan(scanGeneration);});scanRetry.hidden=true;byId('spelling-scan-status').after(scanRetry);
const retry=button('Retry saved change',async()=>{if(!pending)return;retry.disabled=true;try{await send('spelling-command',pending.command);pending=null;retry.hidden=true;closeModal();await loadSpellingTab();}finally{retry.disabled=false;}});retry.hidden=true;
const previous=button('Newer weekly lists',async()=>{offset=Math.max(0,offset-100);await loadSpellingTab();}),next=button('Older weekly lists',async()=>{offset+=100;await loadSpellingTab();});previous.disabled=next.disabled=true;
byId('spelling-admin-status').after(retry);byId('spelling-list-grid').after(previous,next);setupSpelling();
return{update(){},setActive(value){active=value;if(active&&!loading){loading=true;void loadSpellingTab().finally(()=>{loading=false;});}if(!active)closeModal();}};
}
