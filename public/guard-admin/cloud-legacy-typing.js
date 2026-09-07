export function setupCloudLegacyTyping({root,request,onApplied=()=>{}}){
  const node=(tag,text='')=>{const value=document.createElement(tag);value.textContent=text;return value;};
  const status=node('p'),select=node('select'),summary=node('div'),review=node('div'),history=node('div');status.setAttribute('role','status');select.className='admin-select';select.setAttribute('aria-label','Original Typing student');
  let busy=false,generation=0,archiveId=null,data=null,pending=null,plan=null;
  const button=(label,action)=>{const value=node('button',label);value.type='button';value.className='btn btn-secondary';value.onclick=()=>void run(action);return value;};
  const refresh=node('button','Refresh Typing comparison');refresh.type='button';refresh.className='btn btn-secondary';refresh.onclick=()=>{if(archiveId)void open(archiveId);};
  const prepare=button('Review selected Typing history',createReview);
  root.append(node('h3','Transfer original Typing history'),status,refresh,select,summary,prepare,review,history);
  function freeze(){root.querySelectorAll('button,select').forEach(control=>{control.disabled=busy||control.dataset.permanentDisabled==='true';});}
  async function run(action){if(busy)return;busy=true;freeze();try{await action();}catch(error){status.textContent=error.message;}finally{busy=false;freeze();}}
  function renderStudent(){
    pending=plan=null;review.replaceChildren();summary.replaceChildren();
    const student=data?.students.find(item=>item.sourceId===select.value);prepare.dataset.permanentDisabled=String(!student?.cloud||!!student?.imported||!!student?.issues.length);
    if(!student){summary.append(node('p','No original Typing profiles are listed.'));freeze();return;}
    summary.append(node('p',`${student.name} → ${student.cloud?.name||'Original profile mapping is required'}`));
    for(const[table,label]of [['typing_results','speed tests'],['typing_lesson_attempts','lesson attempts'],['typing_lesson_progress','lesson progress records'],['student_typing_settings','course settings records']])summary.append(node('p',`${student.counts[table]} original ${label}`));
    summary.append(node('p',`${student.unknownRewardDates} older tests have no recorded reward date. Unknown dates and keystroke counts stay unknown.`));
    if(student.imported)summary.append(node('p','This child’s original Typing history is already connected. Its receipt is below.'));
    else if(!student.cloud)summary.append(node('p','Review and activate this original child under Profiles and opening balances first, then refresh here.'));
    if(student.issues.length)summary.append(node('p',`${student.issues.length} records need review: ${[...new Set(student.issues)].join(' ')}`));
    freeze();
  }
  async function loadHistory(){
    const epoch=generation,value=await request('typingTransferHistory');if(epoch!==generation)return;history.replaceChildren();
    for(const item of value.receipts){
      const record=node('details');record.append(node('summary',`${item.rolled_back_at?'Rolled back':'Connected'} · ${item.receipt.review.cloudName} · ${item.receipt.records} records · ${new Date(item.created_at).toLocaleString()}`),node('p','No coins were added by this history transfer. Original source records remain in the retained archive.'));
      if(!item.rolled_back_at){const undo=button('Review Typing rollback',async()=>{
        undo.replaceWith(node('p','Rollback removes this imported Typing baseline only when no newer Typing work, profile edits or settings depend on it. The original archive remains retained.'),button('Roll back this unused Typing transfer',async()=>{await request('rollbackTypingTransfer',{planId:item.plan_id});status.textContent='Typing transfer rolled back. Its original archive and receipt are retained.';await afterChange();}));
      });record.append(undo);}history.append(record);
    }
  }
  async function afterChange(){try{await onApplied();}catch{/* The mutation receipt already confirms its outcome. */}try{await loadHistory();}catch{status.textContent+=' Refresh transfer receipts when connected.';}}
  async function createReview(){
    if(!pending)pending={id:archiveId,sourceId:select.value,requestId:crypto.randomUUID()};
    plan=await request('planTypingTransfer',pending);const detail=plan.review;review.replaceChildren();
    review.append(node('h4',`${detail.sourceName} → ${detail.cloudName}`),node('p',`Transfer ${Object.values(detail.counts).reduce((count,value)=>count+value,0)} original records. Original best speed: ${detail.bestWpm} WPM. Original mastered lessons: ${detail.masteredLessons}.`),
      node('p',detail.currentGeneration>0?'Keep the current reset course. Original progress remains retained; the reset course stays unchanged.':'Combine original mastery with saved cloud progress, retaining the cloud attempts.'),
      node('p',detail.keepCloudSettings?'Keep the parent’s current cloud course settings.':'Restore recorded original course settings; use course defaults where no original settings exist.'),
      node('p','This import adds 0 coins. Original earned coins are handled by the separate opening-balance transfer. Unknown historical fields stay unknown.'));
    const apply=button('Apply reviewed Typing history',async()=>{
      const result=await request('applyTypingTransfer',{planId:plan.id,digest:plan.digest});
      status.textContent=`Typing history connected: ${result.records} original records, ${result.coinsAdded} coins added. The remaining module transfers are still pending.`;pending=plan=null;review.replaceChildren();await afterChange();
    });
    if(detail.source.rehearsalOnly||detail.source.sourceChangedDuringCopy){apply.dataset.permanentDisabled='true';review.append(node('p','This rehearsal can be reviewed. Apply requires a verified final snapshot.'));}
    review.append(apply);status.textContent='Review the original scores, progress and settings before connecting this history.';freeze();
  }
  async function open(id){if(busy)return;await run(async()=>{
    const epoch=++generation;archiveId=id;pending=plan=null;review.replaceChildren();summary.replaceChildren();history.replaceChildren();status.textContent='Loading the original Typing comparison…';
    const value=await request('inspectTypingTransfer',{id});if(epoch!==generation)return;data=value;
    const previous=select.value;select.replaceChildren(...data.students.map(student=>{const option=node('option',student.name);option.value=student.sourceId;return option;}));if(data.students.some(student=>student.sourceId===previous))select.value=previous;
    renderStudent();status.textContent=`Original Typing records are ready for review. ${data.orphanRecords} records with missing original profiles remain in the archive.`;await loadHistory();
  });}
  select.onchange=renderStudent;return{open};
}
