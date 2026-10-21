/* global document, window */
export function setupParentExitControls({getSnapshot,mutate,node,button}) {
  function confirmation(report) {
    if(document.getElementById('cloud-exit-deduction'))return;
    const dialog=node('dialog','cloud-panel cloud-exit-deduction');dialog.id='cloud-exit-deduction';
    const title=node('h2','',`Deduct 100 coins from ${report.student_name}?`);title.id='cloud-exit-deduction-title';
    dialog.setAttribute('aria-labelledby',title.id);
    const note=node('p','','Opening parent controls does not prove who used the computer. Review the time and password results before choosing a consequence. This deducts 100 coins once for this report.');
    const status=node('p','cloud-note');status.setAttribute('role','alert');
    const actions=node('div','cloud-actions');let saving=false;
    const cancel=button('Keep coins',()=>dialog.close());cancel.autofocus=true;
    const confirm=button('Deduct 100 coins',async()=>{
      if(saving)return;saving=true;confirm.disabled=cancel.disabled=true;status.textContent='Saving…';
      try { await mutate('parent-exit-review',{id:report.id,studentId:report.student_id,decision:'deduct',confirmation:true});dialog.close(); }
      catch(error) {status.textContent=error.message;saving=false;confirm.disabled=cancel.disabled=false;}
    },'btn btn-danger');
    actions.append(cancel,confirm);dialog.append(title,note,status,actions);
    dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    document.body.append(dialog);dialog.showModal();cancel.focus();
  }
  function render() {
    const root=document.getElementById('cloud-parent-exit-controls'),snapshot=getSnapshot();
    if(!root || !snapshot)return;
    root.replaceChildren();
    const heading=node('h2','','Parent exit & activity');
    const description=node('p','cloud-note','On updated Windows children, the exit icon is hidden by default. Parents can open controls with Ctrl+Alt+Q; Ctrl+Shift+Q remains a recovery shortcut. Reports never contain typed passwords.');
    root.append(heading,description);
    const data=snapshot.parentExitControls;
    if(!data) {root.append(node('p','cloud-note','Exit activity is not available from this service yet.'));return;}
    const settings=node('details'),summary=node('summary','','Choose which children see the parent exit icon');settings.append(summary);
    for(const student of snapshot.students.filter(row=>!row.archived_at)) {
      const label=node('label','cloud-exit-setting'),input=document.createElement('input');input.type='checkbox';
      input.checked=data.settings?.find(row=>row.studentId===student.id)?.showIcon===true;
      input.setAttribute('aria-label',`Show parent exit icon for ${student.name}`);
      const state=node('span','cloud-note');state.setAttribute('role','status');
      input.onchange=async()=>{const previous=!input.checked;input.disabled=true;state.textContent='Saving…';
        try {await mutate('parent-exit-settings',{studentId:student.id,showIcon:input.checked});state.textContent='Saved';}
        catch(error) {input.checked=previous;state.textContent=error.message;}
        finally {input.disabled=false;}
      };
      label.append(input,node('span','',student.name),state);settings.append(label);
    }
    root.append(settings);
    const attempts=data.attempts||[],pending=attempts.filter(row=>!row.reviewed_at&&row.state!=='authorized'&&(row.source!=='recovery'||row.failed_attempts>0));
    const alert=node('p',pending.length?'cloud-exit-alert':'cloud-note',pending.length?`${pending.length} possible exit ${pending.length===1?'attempt needs':'attempts need'} review`:'No unreviewed exit attempts.');
    alert.setAttribute('role','status');root.append(alert);
    const history=node('details');history.open=pending.length>0;history.append(node('summary','','Recent exit activity'));
    const labels={opened:'Parent controls opened','incorrect-password':'Incorrect parent password',authorized:'Parent password accepted',cancelled:'Parent controls closed','service-error':'Exit service needs attention'};
    for(const report of attempts) {
      const article=node('article','cloud-exit-report');article.dataset.exitReportId=report.id;
      article.append(node('h3','',report.student_name),node('p','',labels[report.state]||'Exit activity'),
        node('p','cloud-note',`${new Date(report.occurred_at).toLocaleString()} · ${report.computer_name||'Child computer'} · ${report.source==='shortcut'?'Keyboard shortcut':report.source==='button'?'Exit button':report.source==='recovery'?'System recovery':'Close request'}`),
        node('p','cloud-note',`${report.failed_attempts} incorrect password ${report.failed_attempts===1?'submission':'submissions'}`));
      if(report.reviewed_at)article.append(node('p','cloud-note',report.coins_deducted?'Reviewed · 100 coins deducted':'Reviewed · Coins unchanged'));
      else {
        const actions=node('div','cloud-actions');
        const dismiss=button('Dismiss',async()=>{dismiss.disabled=true;try{await mutate('parent-exit-review',{id:report.id,studentId:report.student_id,decision:'dismiss',confirmation:true});}catch(error){dismiss.disabled=false;article.append(node('p','cloud-note',error.message));}});
        actions.append(dismiss);
        if(report.state!=='authorized'&&(report.source!=='recovery'||report.failed_attempts>0))actions.append(button('Deduct 100 coins',()=>confirmation(report),'btn btn-secondary'));
        article.append(actions);
      }
      history.append(article);
    }
    if(!attempts.length)history.append(node('p','cloud-note','Exit activity appears here after an updated Windows child syncs.'));
    root.append(history);window.lucide?.createIcons();
  }
  return {render};
}
