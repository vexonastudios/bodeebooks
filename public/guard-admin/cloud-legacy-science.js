export function setupCloudLegacyScience({root,request,onApplied=()=>{}}){
  const node=(tag,text='')=>{const value=document.createElement(tag);value.textContent=text;return value;};
  const status=node('p'),summary=node('div'),review=node('div'),history=node('div');status.setAttribute('role','status');
  let busy=false,archiveId=null,pending=null,plan=null;
  const button=(label,action)=>{const value=node('button',label);value.type='button';value.className='btn btn-secondary';value.onclick=()=>void run(action);return value;};
  const refresh=button('Refresh Science comparison',load),prepare=button('Review family Science history',createReview);
  root.append(node('h3','Transfer original Science Spelling'),status,refresh,summary,prepare,review,history);
  function freeze(){root.querySelectorAll('button').forEach(control=>{control.disabled=busy||control.dataset.permanentDisabled==='true';});}
  async function run(action){if(busy)return;busy=true;freeze();try{await action();}catch(error){status.textContent=error.message;}finally{busy=false;freeze();}}
  function totals(detail){
    summary.replaceChildren();for(const[table,label]of [['science_spelling_lists','shared lists'],['science_spelling_words','science terms'],['science_spelling_assignments','assignments'],['science_spelling_progress','word memories'],['science_spelling_sessions','missions'],['science_spelling_attempts','saved answers'],['science_spelling_student_stats','student settings and research totals'],['settings','mastery rules']])summary.append(node('p',`${detail.counts[table]} original ${label}`));
    for(const child of detail.students)summary.append(node('p',`${child.name} → ${child.cloud?.name||'Original profile mapping is required'}`));
    summary.append(node('p',`${detail.unfinishedSessions} unfinished missions will resume. ${detail.researchEnergy} research energy is retained; 0 wallet coins are added.`));
    if(detail.issues.length)summary.append(node('p',`${detail.issues.length} records need review: ${[...new Set(detail.issues)].join(' ')}`));
    if(detail.hasCloudScience&&!detail.imported)summary.append(node('p','This family already has cloud Science work or settings. Keep both sources and reconcile before importing.'));
    if(detail.imported)summary.append(node('p','The original Science baseline is already connected. Its receipt is below.'));
    prepare.dataset.permanentDisabled=String(detail.imported||detail.hasCloudScience||detail.issues.length>0||detail.students.some(s=>!s.cloud));
  }
  async function loadHistory(){
    const data=await request('scienceTransferHistory');history.replaceChildren();for(const item of data.receipts){
      const record=node('details');record.append(node('summary',`${item.rolled_back_at?'Rolled back':'Connected'} · Science Spelling · ${item.receipt.records} records · ${new Date(item.created_at).toLocaleString()}`),node('p','Original research energy was retained. This transfer added no wallet coins.'));
      if(!item.rolled_back_at)record.append(button('Review Science rollback',async()=>{record.append(node('p','Undo removes the imported family Science baseline only when no new Science work, parent edits, child mapping changes or time-zone changes depend on it. Original archive and receipts stay retained.'),button('Roll back this unused Science transfer',async()=>{await request('rollbackScienceTransfer',{planId:item.plan_id});status.textContent='Science transfer rolled back. Its original archive and receipt are retained.';await afterChange();}));}));history.append(record);
    }
  }
  async function afterChange(){try{await onApplied();}catch{/* The saved receipt already confirms the action. */}try{await loadHistory();const value=await request('inspectScienceTransfer',{id:archiveId});totals(value);}catch{status.textContent+=' Refresh the comparison when connected.';}}
  async function createReview(){
    pending??={id:archiveId,requestId:crypto.randomUUID()};plan=await request('planScienceTransfer',pending);const detail=plan.review;review.replaceChildren();
    review.append(node('h4','Review the complete family Science baseline'),node('p',`Connect ${Object.values(detail.counts).reduce((n,v)=>n+v,0)} original records using the child mappings above. Shared lists transfer once for the family.`),
      node('p','Keep original words, definitions, assignments, memory counters, review dates, research energy, levels, streaks, sound preferences and mastery rules. Completed results and unfinished missions retain their saved answers. Importing adds 0 wallet coins.'),
      node('p','Original test answers already earned their recorded research energy. Finishing an imported test applies only its new answers. Historical per-answer mastery states and earlier versions of edited lists were not saved; those details remain unknown. Missions use the retained list and word definitions. Answers saved within the same second have no recorded order beyond the first-answer flag.'),
      node('p',`${detail.restoredTemplates} original starter templates become unassigned editable drafts. The built-in starter remains available. Mission days use the reviewed family time zone: ${detail.timeZone}.`));
    const apply=button('Apply reviewed Science history',async()=>{const result=await request('applyScienceTransfer',{planId:plan.id,digest:plan.digest});status.textContent=`Science history connected: ${result.records} original records, ${result.coinsAdded} coins added. Remaining module transfers are still pending.`;pending=plan=null;review.replaceChildren();await afterChange();});
    if(detail.source.rehearsalOnly||detail.source.sourceChangedDuringCopy){apply.dataset.permanentDisabled='true';review.append(node('p','This rehearsal can be reviewed. Apply requires a verified final snapshot.'));}
    review.append(apply);status.textContent='Review the shared lists, child mappings and original research totals before applying.';
  }
  async function load(){pending=plan=null;review.replaceChildren();const value=await request('inspectScienceTransfer',{id:archiveId});totals(value);await loadHistory();status.textContent='Original Science records are ready for review.';}
  async function open(id){if(busy)return;archiveId=id;await run(load);}
  return{open};
}
