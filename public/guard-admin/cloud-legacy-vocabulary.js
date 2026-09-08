export function setupCloudLegacyVocabulary({root,request,onApplied=()=>{}}){
  const node=(tag,text='')=>{const value=document.createElement(tag);value.textContent=text;return value;};
  const status=node('p'),summary=node('div'),review=node('div'),history=node('div');status.setAttribute('role','status');
  let busy=false,archiveId=null,pending=null,plan=null;
  const button=(label,action)=>{const value=node('button',label);value.type='button';value.className='btn btn-secondary';value.onclick=()=>void run(action);return value;};
  const refresh=button('Refresh Vocabulary comparison',load),prepare=button('Review family Vocabulary history',createReview);
  root.append(node('h3','Transfer original Vocabulary Mastery'),status,refresh,summary,prepare,review,history);
  function freeze(){root.querySelectorAll('button').forEach(control=>{control.disabled=busy||control.dataset.permanentDisabled==='true';});}
  async function run(action){if(busy)return;busy=true;freeze();try{await action();}catch(error){status.textContent=error.message;}finally{busy=false;freeze();}}
  function totals(detail){
    summary.replaceChildren();for(const[table,label]of [['vocabulary_lists','curriculum lists'],['vocabulary_terms','exact terms'],['vocabulary_progress','mastery records'],['vocabulary_sessions','reviews'],['vocabulary_activities','issued activities'],['vocabulary_skill_evidence','skill evidence records']])summary.append(node('p',`${detail.counts[table]} original ${label}`));
    for(const child of detail.students)summary.append(node('p',`${child.name} → ${child.cloud?.name||'Original profile mapping is required'}`));
    summary.append(node('p',`${detail.unfinishedSessions} unfinished reviews remain resumable. ${detail.retainedEvidence} dated evidence records are retained. No wallet coins or new mastery points are added.`));
    if(detail.issues.length)summary.append(node('p',`${detail.issues.length} records need review: ${[...new Set(detail.issues)].join(' ')}`));
    if(detail.hasCloudVocabulary&&!detail.imported)summary.append(node('p','This family already has cloud Vocabulary work or lists. Keep both sources and reconcile before importing.'));
    if(detail.imported)summary.append(node('p','The original Vocabulary baseline is already connected. Its receipt is below.'));
    prepare.dataset.permanentDisabled=String(detail.imported||detail.hasCloudVocabulary||detail.issues.length>0||detail.students.some(s=>!s.cloud));
  }
  async function loadHistory(){
    const data=await request('vocabularyTransferHistory');history.replaceChildren();for(const item of data.receipts){
      const record=node('details');record.append(node('summary',`${item.rolled_back_at?'Rolled back':'Connected'} · Vocabulary · ${item.receipt.records} records · ${new Date(item.created_at).toLocaleString()}`),node('p','Original mastery and evidence were retained. This transfer added no wallet coins or new mastery points.'));
      if(!item.rolled_back_at)record.append(button('Review Vocabulary rollback',async()=>{record.append(node('p','Undo removes this imported Vocabulary baseline only when no new Vocabulary work, parent edits, child mapping changes or time-zone changes depend on it. Original archive and receipts stay retained.'),button('Roll back this unused Vocabulary transfer',async()=>{await request('rollbackVocabularyTransfer',{planId:item.plan_id});status.textContent='Vocabulary transfer rolled back. The original archive and receipt remain retained.';await afterChange();}));}));history.append(record);
    }
  }
  async function afterChange(){try{await onApplied();}catch{/* The receipt confirms the saved action. */}try{await loadHistory();totals(await request('inspectVocabularyTransfer',{id:archiveId}));}catch{status.textContent+=' Refresh the comparison when connected.';}}
  async function createReview(){
    pending??={id:archiveId,requestId:crypto.randomUUID()};plan=await request('planVocabularyTransfer',pending);const detail=plan.review;review.replaceChildren();
    review.append(node('h4','Review the complete family Vocabulary baseline'),node('p',`Connect ${Object.values(detail.counts).reduce((n,v)=>n+v,0)} original records using the child mappings above.`),
      node('p','Keep exact curriculum definitions, examples, pronunciation, word relationships, saved teaching, mastery scores, review dates and dated evidence. Completed reviews retain their original results. Unfinished reviews from different days resume one at a time. Old answers are not scored again.'),
      node('p','Original evidence has no saved activity link, and older versions of edited source text and per-answer mastery states were not retained. Those details stay unknown. Issued prompts, choices and answer rules remain as saved. Unscored introductions and sentence practice stay unscored.'),
      node('p',`Importing adds no wallet coins, gradebook grades or new mastery points. The reviewed family time zone is ${detail.timeZone}.`));
    const apply=button('Apply reviewed Vocabulary history',async()=>{const result=await request('applyVocabularyTransfer',{planId:plan.id,digest:plan.digest});status.textContent=`Vocabulary history connected: ${result.records} original records, ${result.coinsAdded} coins added. Remaining module transfers are still pending.`;pending=plan=null;review.replaceChildren();await afterChange();});
    if(detail.source.rehearsalOnly||detail.source.sourceChangedDuringCopy){apply.dataset.permanentDisabled='true';review.append(node('p','This rehearsal can be reviewed. Apply requires a verified final snapshot.'));}
    review.append(apply);status.textContent='Review the child mappings, exact curriculum and retained mastery before applying.';
  }
  async function load(){pending=plan=null;review.replaceChildren();totals(await request('inspectVocabularyTransfer',{id:archiveId}));await loadHistory();status.textContent='Original Vocabulary records are ready for review.';}
  async function open(id){if(busy)return;archiveId=id;await run(load);}
  return{open};
}
