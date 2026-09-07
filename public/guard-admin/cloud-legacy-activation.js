export function setupCloudLegacyActivation({root,request,onApplied=()=>{}}){
  const node=(tag,text='')=>{const value=document.createElement(tag);value.textContent=text;return value;};
  const status=node('p'),form=node('div'),review=node('div'),history=node('div');status.setAttribute('role','status');
  root.append(node('h3','Transfer profiles and opening balances'),status,form,review,history);
  let generation=0,busy=false,selectedId=null,source=null,pendingPlan=null,savedPlan=null,controls=[];
  const button=(label,action)=>{const value=node('button',label);value.type='button';value.className='btn btn-secondary';value.onclick=()=>void run(action);return value;};
  const refresh=node('button','Refresh profile comparison');refresh.type='button';refresh.className='btn btn-secondary';refresh.onclick=()=>{if(selectedId)void open(selectedId);};root.insertBefore(refresh,form);
  function freeze(){root.querySelectorAll('button,select,input').forEach(control=>{control.disabled=busy||control.dataset.permanentDisabled==='true';});}
  async function run(action){if(busy)return;busy=true;freeze();try{await action();}catch(error){status.textContent=error.message;}finally{busy=false;freeze();}}
  function invalidate(){pendingPlan=savedPlan=null;review.replaceChildren();}
  async function refreshAfterChange(){try{await onApplied();}catch{/* The mutation receipt already confirmed success. */}try{await refreshHistory();}catch{status.textContent+=' Refresh transfer history when connected.';}}
  async function refreshHistory(){
    const epoch=generation,data=await request('activationHistory');if(epoch!==generation)return;history.replaceChildren();
    for(const item of data.receipts){
      const card=node('details'),receipt=item.receipt;
      card.append(node('summary',`${item.rolled_back_at?'Rolled back':'Applied'} · ${new Date(item.created_at).toLocaleString()} · ${receipt.createdProfiles} profiles · ${receipt.openingBalances} balances`));
      for(const change of receipt.changes)card.append(node('p',`${change.original.name} → ${change.afterProfile.name} · ${change.setWallet?`original balance ${change.original.wallet.balance}, original total earned ${change.original.wallet.totalEarned}`:'opening balance unchanged'}`));
      if(!item.rolled_back_at){
        const undo=button('Review rollback',async()=>{
          const explanation=node('p','Rollback restores only this transfer. If a computer, newer records or changed balances now depend on it, the cloud refuses rollback and keeps all work.');
          const confirm=button('Roll back this unused transfer',async()=>{await request('rollbackActivation',{planId:item.plan_id});status.textContent='Transfer rolled back. Its archive and receipt are retained.';await refreshAfterChange();});
          undo.replaceWith(explanation,confirm);
        });card.append(undo);
      }
      history.append(card);
    }
  }
  function renderPlan(value){
    savedPlan=value;review.replaceChildren();
    review.append(node('h4','Review the exact changes'));
    for(const change of value.plan.changes){
      const card=node('div');card.className='cloud-panel';
      card.append(node('strong',`${change.original.name} → ${change.createProfile?'New cloud profile':change.beforeProfile.name}`),
        node('p',change.createProfile?`Create grade ${change.original.grade}, theme ${change.original.theme}, ${change.original.active?'active':'archived'}.`:'Keep the existing cloud name, grade, theme and status.'),
        node('p',change.setWallet?`Carry over ${change.original.wallet.balance} coins and ${change.original.wallet.totalEarned} total earned. Keep ${change.beforeWallet?.cloud_balance||0} cloud coins and ${change.beforeWallet?.cloud_earned||0} cloud earned coins separately.`:'Opening balance stays unchanged.'));review.append(card);
    }
    review.append(node('p',`${value.plan.retainedStudents} original profiles remain only in the archive. School subjects, records, file links and other module histories still need their operational transfer.`));
    const apply=button('Apply reviewed profiles and balances',async()=>{
      const receipt=await request('applyActivation',{planId:savedPlan.id,digest:savedPlan.digest});
      status.textContent=`Transfer saved: ${receipt.createdProfiles} profiles and ${receipt.openingBalances} opening balances. The remaining family migration is still pending.`;
      review.replaceChildren();pendingPlan=savedPlan=null;await refreshAfterChange();
    });
    if(value.plan.source.rehearsalOnly||value.plan.source.sourceChangedDuringCopy){apply.dataset.permanentDisabled='true';review.append(node('p','This rehearsal can be reviewed now. A verified final snapshot is required before applying profiles or balances.'));}
    review.append(apply);freeze();
  }
  async function prepare(){
    if(!pendingPlan){
      const mappings=controls.filter(item=>item.select.value!=='retain').map(item=>({sourceId:item.student.sourceId,studentId:item.select.value==='create'?null:item.select.value,includeWallet:item.wallet.checked}));
      if(!mappings.length)throw new Error('Choose at least one original child to transfer.');
      pendingPlan={id:selectedId,requestId:crypto.randomUUID(),mappings};
    }
    renderPlan(await request('planActivation',pendingPlan));
    status.textContent='Review each child and balance below. Applying this review keeps a receipt.';
  }
  async function open(id){
    if(busy)return;await run(async()=>{
      const epoch=++generation;selectedId=id;source=null;invalidate();form.replaceChildren();history.replaceChildren();controls=[];status.textContent='Loading original and cloud profiles…';
      const data=await request('inspectActivation',{id});if(epoch!==generation)return;source=data;
      status.textContent=`${source.students.length} original profiles · ${source.orphanWallets} balances with missing original children retained for review. ${source.canActivate?'Verified final snapshot.':'Rehearsal only; applying changes is unavailable.'}`;
      for(const student of source.students){
        const card=node('div'),select=node('select'),label=node('label'),wallet=node('input');card.className='cloud-panel';select.className='admin-select';select.setAttribute('aria-label',`Cloud profile for ${student.name}`);
        for(const option of [{id:'retain',name:'Keep only in original archive'},{id:'create',name:'Create from original profile'},...source.cloud.students.map(child=>({id:child.id,name:`Use ${child.name}${child.archived_at?' (archived)':''}`}))]){const item=node('option',option.name);item.value=option.id;select.append(item);}
        const link=source.cloud.links.find(item=>item.source_id===student.sourceId);if(link){select.value=link.student_id;select.dataset.permanentDisabled='true';}
        wallet.type='checkbox';wallet.checked=!!student.wallet?.valid;wallet.setAttribute('aria-label',`Transfer opening balance for ${student.name}`);
        if(!student.wallet?.valid)wallet.dataset.permanentDisabled='true';
        label.append(wallet,document.createTextNode(student.wallet?` Carry over ${student.wallet.balance} coins / ${student.wallet.totalEarned} total earned`:' No original balance recorded; keep it unknown'));
        card.append(node('h4',student.name),node('p',`Original grade ${student.grade} · ${student.active?'active':'archived'}`),select,label);
        if(student.issues.length)card.append(node('p',student.issues.join(' ')));
        select.onchange=wallet.onchange=invalidate;form.append(card);controls.push({student,select,wallet});
      }
      form.append(button('Review selected transfer',prepare));await refreshHistory();
    });
  }
  return{open};
}
