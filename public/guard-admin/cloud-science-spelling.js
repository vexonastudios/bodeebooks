// Adapted from the original Science Spelling parent editor.
export function setupCloudScienceSpelling(){
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' })[character]);
let state = { students:[], lists:[], categories:[], mastery:{} };
let editingId = null;
let words = [];

let active=false,loading=false,offset=0,pending=null,busy=false;
let editorEpoch=0,libraryEpoch=0;
function notice(message){$('science-spelling-status').textContent=message;$('science-spelling-form-error').textContent=message;}
function controls(){retry.hidden=retryModal.hidden=!pending;retry.disabled=retryModal.disabled=busy;for(const e of $('science-spelling-list-modal').querySelectorAll('input,select,textarea,button'))if(!['science-spelling-close','science-spelling-cancel','science-spelling-retry-modal'].includes(e.id))e.disabled=busy||!!pending;}
async function send(action,input={}){const response=await fetch('/guard/dashboard/science-spelling/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const result=await response.json();if(!response.ok){const error=new Error(result.error||'Science Spelling could not connect.');error.status=response.status;throw error;}return result;}
async function request(route,options={}){
  const parsed=new URL(route,'https://science.invalid'),parts=parsed.pathname.split('/').filter(Boolean),input=options.body?JSON.parse(options.body):{};
  if(!options.method){if(parsed.pathname==='/admin/overview'){const result=await send('list',{offset});previous.disabled=offset===0;next.disabled=!result.hasMoreLists;return result;}if(parts[1]==='student')return send('list',{studentId:parts[2],search:parsed.searchParams.get('search')||''});throw Error('Unsupported Science Spelling view.');}
  if(busy)throw Error('Science Spelling is still saving.');
  const fingerprint=JSON.stringify([route,options.method,input]);if(pending&&pending.fingerprint!==fingerprint)throw Error('Retry the saved Science Spelling change first.');
  if(!pending){let command;
    if(parsed.pathname==='/admin/config')command={kind:'config',revision:state.mastery.revision,...input};
    else if(parts[1]==='student'&&parts[3]==='progress'){const child=state.students.find(s=>s.id===parts[2]);if(!child)throw Error('Refresh the selected child.');command={kind:'reset',studentId:child.id,revision:child.science_spelling.revision};}
    else if(parts[1]==='lists'){const old=state.lists.find(list=>list.id===parts[2]),archive=options.method==='DELETE',listId=parts[2]||crypto.randomUUID();if(parts[2]&&!old)throw Error('Refresh the selected science list.');command={kind:'list',listId,revision:old?.revision||0,...(archive?{title:old.title,category:old.category,test_date:old.test_date,status:'archived',words:old.words,student_ids:old.assignments.map(a=>a.student_id)}:input),notes:old?.notes||''};}
    else throw Error('Unsupported Science Spelling change.');
    pending={fingerprint,command:{...command,id:crypto.randomUUID()}};
  }
  busy=true;controls();try{const result=await send('command',pending.command);pending=null;return result;}catch(error){if(error.status>=400&&error.status<500)pending=null;throw error;}finally{busy=false;controls();}
}

function avatar(student){return '<span class="science-spelling-avatar">'+escapeHtml(student.name?.slice(0,1)||'⚗')+'</span>';}
function dateLabel(value){if(!value)return'No test date';const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.valueOf())?'No test date':date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}

function renderFamily(){
  $('science-spelling-family-summary').innerHTML=state.students.map(student=>{const data=student.science_spelling||{};return `<button class="science-spelling-family-card" type="button" data-science-student="${escapeHtml(student.id)}"><div class="science-spelling-family-head">${avatar(student)}<span><strong>${escapeHtml(student.name)}</strong><small>Grade ${escapeHtml(student.grade||'—')} · ${data.study_streak||0} day streak</small></span></div><div class="science-spelling-family-stats"><span><b>${data.due_count||0}</b><small>Due</small></span><span><b>${data.learning_count||0}</b><small>Learning</small></span><span><b>${data.mastered_count||0}</b><small>Mastered</small></span></div></button>`}).join('');
  $('science-spelling-family-summary').querySelectorAll('[data-science-student]').forEach(button=>button.addEventListener('click',()=>{$('science-spelling-student-filter').value=button.dataset.scienceStudent;loadLibrary(button.dataset.scienceStudent)}));
}

function renderLists(){
  const grid=$('science-spelling-list-grid');
  if(!state.lists.length){grid.innerHTML='<div class="science-spelling-list-card"><h3>No science spelling lists yet.</h3><p>Create a weekly list or duplicate the starter research list.</p></div>';return}
  grid.innerHTML=state.lists.map(list=>`<article class="science-spelling-list-card" data-science-list="${escapeHtml(list.id)}"><div class="science-spelling-list-head"><div><h3>${escapeHtml(list.title)}</h3><small>${escapeHtml(list.category)}</small></div><span>${list.is_demo?'starter':escapeHtml(list.status)}</span></div><div class="science-spelling-list-meta"><span>${list.word_count||0} terms</span><span>${escapeHtml(dateLabel(list.test_date))}</span><span>${list.progress?.mastered||0} mastered</span><span>${list.progress?.needs_review||0} need review</span></div><div class="science-spelling-list-progress"><i style="width:${Math.max(0,Math.min(100,Number(list.progress?.strength)||0))}%"></i></div><div class="science-spelling-list-children">${(list.assignments||[]).map(item=>`<span>${escapeHtml(item.name)}</span>`).join('')||'<span>Not assigned</span>'}</div></article>`).join('');
  grid.querySelectorAll('[data-science-list]').forEach(card=>card.addEventListener('click',()=>openList(state.lists.find(list=>list.id===card.dataset.scienceList))));
}

function populateFilters(){
  const options=state.students.map(student=>`<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)} · Grade ${escapeHtml(student.grade||'—')}</option>`).join('');
  const filter=$('science-spelling-student-filter'),selected=filter.value;filter.innerHTML=`<option value="">Family overview</option>${options}`;if([...filter.options].some(item=>item.value===selected))filter.value=selected;
  $('science-spelling-category').innerHTML=state.categories.map(category=>`<option>${escapeHtml(category)}</option>`).join('');
  $('science-spelling-mastery-retrievals').value=state.mastery?.independent_retrievals||3;
  $('science-spelling-mastery-days').value=state.mastery?.delayed_interval_days||7;
}

async function loadScienceSpellingTab(){
  if(!$('science-spelling-status'))return;
  $('science-spelling-status').textContent='Loading Science Spelling Lab…';
  try{state=await request('/admin/overview');populateFilters();renderFamily();renderLists();$('science-spelling-status').textContent=`${state.lists.length} list${state.lists.length===1?'':'s'} · mastery requires ${state.mastery.independent_retrievals||3} independent recalls and a ${state.mastery.delayed_interval_days||7}-day delayed recall.`;const selected=$('science-spelling-student-filter').value;if(selected)await loadLibrary(selected);else $('science-spelling-library-panel').hidden=true}catch(error){$('science-spelling-status').textContent=error.message}
}

function normalizeWord(source={}){return{word:String(source.word||source.term||'').trim(),pronunciation_text:String(source.pronunciation_text||source.pronunciation||'').trim(),definition:String(source.definition||'').trim(),example_sentence:String(source.example_sentence||source.sentence||'').trim(),category:String(source.category||$('science-spelling-category')?.value||'Mixed Science'),chunks:Array.isArray(source.chunks)?source.chunks.join(', '):String(source.chunks||''),morphemes:Array.isArray(source.morphemes)?source.morphemes.map(item=>`${item.part}=${item.meaning}`).join('; '):String(source.morphemes||''),difficulty:Number(source.difficulty)||3,common_misspellings:Array.isArray(source.common_misspellings)?source.common_misspellings.join(', '):String(source.common_misspellings||source.commonMisspellings||''),notes:String(source.notes||'').trim()}}
function blankWord(){return normalizeWord({})}
function values(value){return String(value||'').split(/[,;+]/).map(item=>item.trim()).filter(Boolean)}
function morphemes(value){return String(value||'').split(';').map(entry=>{const [part,...meaning]=entry.split('=');return{part:String(part||'').trim(),meaning:meaning.join('=').trim()}}).filter(item=>item.part)}

function renderWordEditor(){
  $('science-spelling-word-count').textContent=`${words.length} term${words.length===1?'':'s'}`;
  const editor=$('science-spelling-word-editor');if(!words.length){editor.innerHTML='<div class="science-spelling-list-card"><strong>No terms yet.</strong><p>Paste one term per line, import CSV, or add a term manually.</p></div>';return}
  const input=(index,field,label,wide=false,type='input',attributes='')=>`<label class="${wide?'wide':''}">${label}${type==='textarea'?`<textarea data-science-index="${index}" data-science-field="${field}" ${attributes}>${escapeHtml(words[index][field])}</textarea>`:`<input data-science-index="${index}" data-science-field="${field}" value="${escapeHtml(words[index][field])}" ${attributes}>`}</label>`;
  const categorySelect=(index,word)=>`<label>Science area<select data-science-index="${index}" data-science-field="category">${state.categories.map(category=>`<option value="${escapeHtml(category)}" ${category===word.category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select></label>`;
  editor.innerHTML=words.map((word,index)=>`<article class="science-spelling-word-card"><div class="science-spelling-word-head"><strong>Term ${index+1}: ${escapeHtml(word.word||'new term')}</strong><button class="btn btn-danger" type="button" data-remove-science-word="${index}">Remove</button></div><div class="science-spelling-word-fields">${input(index,'word','Science term')}${input(index,'pronunciation_text','Pronunciation text')}${categorySelect(index,word)}${input(index,'difficulty','Difficulty 1–5',false,'input','type="number" min="1" max="5" step="1" inputmode="numeric"')}${input(index,'definition','Definition',true,'textarea')}${input(index,'example_sentence','Example sentence',true,'textarea')}${input(index,'chunks','Chunks — comma separated',true)}${input(index,'morphemes','Roots — photo=light; synthesis=putting together',true)}${input(index,'common_misspellings','Common misspellings — comma separated',true)}${input(index,'notes','Parent notes',true)}</div></article>`).join('');
  editor.querySelectorAll('[data-science-field]').forEach(field=>field.addEventListener('input',()=>{words[Number(field.dataset.scienceIndex)][field.dataset.scienceField]=field.value}));
  editor.querySelectorAll('[data-remove-science-word]').forEach(button=>button.addEventListener('click',()=>{words.splice(Number(button.dataset.removeScienceWord),1);renderWordEditor()}));
}

function studentChips(selected=[]){const set=new Set(selected.map(String));$('science-spelling-student-chips').innerHTML=state.students.map(student=>`<label class="science-spelling-student-chip">${avatar(student)}<span>${escapeHtml(student.name)}</span><input type="checkbox" value="${escapeHtml(student.id)}" ${set.has(String(student.id))?'checked':''}></label>`).join('')}

function openList(list=null){
  if(pending||busy){notice('Retry the saved Science Spelling change first.');return;}editorEpoch++;
  const isTemplate=Boolean(list?.is_demo);
  editingId=isTemplate?null:(list?.id||null);words=(list?.words||[]).map(normalizeWord);
  $('science-spelling-modal-title').textContent=isTemplate?'Create from Starter Research':list?'Edit Science List':'New Science List';$('science-spelling-title').value=isTemplate?`${list.title} — Working Copy`:(list?.title||'Weekly Science Spelling');$('science-spelling-category').value=list?.category||'Mixed Science';$('science-spelling-test-date').value=isTemplate?'':(list?.test_date||'');$('science-spelling-list-status').value=list?.status==='draft'?'draft':'active';$('science-spelling-paste').value='';$('science-spelling-form-error').textContent='';$('science-spelling-archive').hidden=!list||isTemplate;studentChips(isTemplate?[]:(list?.assignments||[]).map(item=>item.student_id));renderWordEditor();$('science-spelling-list-modal').classList.add('active');$('science-spelling-list-modal').setAttribute('aria-hidden','false');window.refreshIcons?.()
}
function closeList(){editorEpoch++;editingId=null;$('science-spelling-list-modal').classList.remove('active');$('science-spelling-list-modal').setAttribute('aria-hidden','true')}

async function addPasted(){if(busy||pending)return;const epoch=editorEpoch;busy=true;controls();try{const terms=$('science-spelling-paste').value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);if(words.length+terms.length>150)throw Error('Use at most 150 science terms.');const result=await send('list',{view:'defaults',terms,category:$('science-spelling-category').value});if(epoch!==editorEpoch)return;words.push(...result.words.map(normalizeWord));$('science-spelling-paste').value='';renderWordEditor();}catch(error){if(epoch===editorEpoch)notice(error.message);}finally{busy=false;controls();}}

function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;for(let index=0;index<text.length;index++){const character=text[index];if(character==='"'&&quoted&&text[index+1]==='"'){cell+='"';index++}else if(character==='"')quoted=!quoted;else if(character===','&&!quoted){row.push(cell);cell=''}else if((character==='\n'||character==='\r')&&!quoted){if(character==='\r'&&text[index+1]==='\n')index++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell=''}else cell+=character}row.push(cell);if(row.some(value=>value.trim()))rows.push(row);if(!rows.length)return[];const headings=rows[0].map(value=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_'));return rows.slice(1).map(valuesRow=>{const result={};headings.forEach((heading,index)=>result[heading]=valuesRow[index]||'');return normalizeWord({word:result.word||result.term,pronunciation_text:result.pronunciation_text||result.pronunciation,definition:result.definition,example_sentence:result.example_sentence||result.sentence,category:result.category,chunks:result.chunks,morphemes:result.morphemes,difficulty:result.difficulty,common_misspellings:result.common_misspellings,notes:result.notes})}).filter(item=>item.word)}

async function importCsv(file){if(!file)return;if(file.size>1024*1024)throw Error("Use a CSV up to 1 MB.");const epoch=editorEpoch,imported=parseCsv(await file.text());if(epoch!==editorEpoch)return;if(!imported.length)throw new Error('The CSV needs a Word or Term column and at least one row.');if(words.length+imported.length>150)throw Error('Use at most 150 science terms.');words.push(...imported);renderWordEditor();window.showToast?.(`${imported.length} science terms imported.`)}

function payload(){return{title:$('science-spelling-title').value,category:$('science-spelling-category').value,test_date:$('science-spelling-test-date').value||null,status:$('science-spelling-list-status').value,student_ids:[...$('science-spelling-student-chips').querySelectorAll('input:checked')].map(input=>input.value),words:words.map(word=>({...word,chunks:values(word.chunks),morphemes:morphemes(word.morphemes),common_misspellings:values(word.common_misspellings)}))}}

async function saveList(){const button=$('science-spelling-save');button.disabled=true;$('science-spelling-form-error').textContent='';try{await request(editingId?`/admin/lists/${encodeURIComponent(editingId)}`:'/admin/lists',{method:editingId?'PUT':'POST',body:JSON.stringify(payload())});closeList();window.showToast?.('Science spelling list saved and assigned.');await loadScienceSpellingTab()}catch(error){$('science-spelling-form-error').textContent=error.message}finally{button.disabled=false}}
async function archiveList(){if(!editingId||!confirm('Archive this science spelling list? Learning history remains available in exported results.'))return;await request(`/admin/lists/${encodeURIComponent(editingId)}`,{method:'DELETE'});closeList();await loadScienceSpellingTab();window.showToast?.('Science spelling list archived.')}

async function loadLibrary(studentId,search=''){const epoch=++libraryEpoch;
  if(!studentId){$('science-spelling-library-panel').hidden=true;return}
  const student=state.students.find(item=>String(item.id)===String(studentId));$('science-spelling-library-panel').hidden=false;$('science-spelling-library-title').textContent=`${student?.name||'Student'}’s science spelling memory`;
  try{const result=await request(`/admin/student/${encodeURIComponent(studentId)}/library?search=${encodeURIComponent(search)}`);if(epoch!==libraryEpoch)return;$('science-spelling-library').innerHTML=result.words.map(word=>`<article class="science-spelling-library-word"><header><h3>${escapeHtml(word.word.toUpperCase())}</h3><span>${escapeHtml(word.state)}</span></header><p>${escapeHtml(word.definition)}</p><footer><span>${word.first_attempt_accuracy||0}% first try</span><span>${word.successful_recalls||0} recalls · ${word.misses||0} misses</span></footer>${word.personal_misspelling?`<small>${escapeHtml(word.personal_misspelling.toUpperCase())} → ${escapeHtml(word.word.toUpperCase())}</small>`:''}</article>`).join('')||'<div class="science-spelling-list-card">No assigned terms match this search.</div>'}catch(error){if(epoch!==libraryEpoch)return;$('science-spelling-library').innerHTML=`<div class="science-spelling-list-card">${escapeHtml(error.message)}</div>`}
}

async function resetProgress(){const studentId=$('science-spelling-student-filter').value;if(!studentId)return;const student=state.students.find(item=>String(item.id)===String(studentId));if(!confirm(`Reset all Science Spelling progress for ${student?.name||'this child'}? Lists stay assigned. Current mastery and energy restart; previous attempts and results remain in exported history.`))return;await request(`/admin/student/${encodeURIComponent(studentId)}/progress`,{method:'DELETE'});window.showToast?.('Science Spelling progress reset.');await loadScienceSpellingTab()}

async function saveMastery(){
  const independent_retrievals=Math.max(2,Math.min(10,Number($('science-spelling-mastery-retrievals').value)||3));
  const delayed_interval_days=Math.max(1,Math.min(60,Number($('science-spelling-mastery-days').value)||7));
  state.mastery=await request('/admin/config',{method:'PUT',body:JSON.stringify({independent_retrievals,delayed_interval_days})});
  $('science-spelling-status').textContent=`Mastery now requires ${state.mastery.independent_retrievals} independent recalls and a ${state.mastery.delayed_interval_days}-day delayed recall.`;
  window.showToast?.('Science Spelling mastery rule saved.');
}

function setupScienceSpelling(){
  $('science-spelling-add-list')?.addEventListener('click',()=>openList());$('science-spelling-save-mastery')?.addEventListener('click',()=>saveMastery().catch(error=>window.showToast?.(error.message,true)));$('science-spelling-close')?.addEventListener('click',closeList);$('science-spelling-cancel')?.addEventListener('click',closeList);$('science-spelling-save')?.addEventListener('click',saveList);$('science-spelling-archive')?.addEventListener('click',archiveList);$('science-spelling-add-pasted')?.addEventListener('click',addPasted);$('science-spelling-add-word')?.addEventListener('click',()=>{words.push(blankWord());renderWordEditor()});$('science-spelling-csv')?.addEventListener('change',event=>importCsv(event.target.files?.[0]).catch(error=>window.showToast?.(error.message,true)));$('science-spelling-student-filter')?.addEventListener('change',event=>loadLibrary(event.target.value));$('science-spelling-library-search')?.addEventListener('input',event=>loadLibrary($('science-spelling-student-filter').value,event.target.value));$('science-spelling-reset')?.addEventListener('click',resetProgress);$('science-spelling-export')?.addEventListener('click',()=>void exportHistory().catch(error=>notice(error.message)));
}

function button(label,action){const e=document.createElement('button');e.type='button';e.className='btn btn-secondary';e.textContent=label;e.onclick=()=>void action().catch(error=>notice(error.message));return e;}
async function retryChange(){if(!pending||busy)return;busy=true;controls();try{await send('command',pending.command);pending=null;closeList();await loadScienceSpellingTab();}finally{busy=false;controls();}}
const retry=button('Retry saved science change',retryChange),retryModal=button('Retry saved science change',retryChange);retryModal.id='science-spelling-retry-modal';retry.hidden=retryModal.hidden=true;$('science-spelling-status').after(retry);$('science-spelling-form-error').after(retryModal);
const previous=button('Newer science lists',async()=>{offset=Math.max(0,offset-2);await loadScienceSpellingTab();}),next=button('Older science lists',async()=>{offset+=2;await loadScienceSpellingTab();});previous.disabled=next.disabled=true;$('science-spelling-list-grid').after(previous,next);
async function exportHistory(){const button=$('science-spelling-export');button.disabled=true;try{const rows=[],studentId=$('science-spelling-student-filter').value;let pageOffset=0;for(;;){const page=await send('list',{view:'history',...(studentId?{studentId}:{}),offset:pageOffset});rows.push(...page.rows);if(!page.hasMore)break;pageOffset+=200;if(rows.length>=100000)throw Error('This export exceeds 100,000 results. Choose one child.');notice('Preparing '+rows.length+' Science Spelling results…');}
  const columns=['student','list','word','mode','response','correct','first_attempt','hint_level','mastery_credit','research_energy','response_ms','created_at','generation','status','origin'];
  const cell=value=>{let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const csv=[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='science-spelling-results.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);notice(rows.length+' Science Spelling results exported.');
}finally{button.disabled=false;}}
setupScienceSpelling();
return{update(){},setActive(value){active=value;if(active&&!loading){loading=true;void loadScienceSpellingTab().finally(()=>{loading=false;});}if(!active)closeList();}};
}
