/* global document, window */
export function setupParentExitControls({getSnapshot,mutate,node,button}) {
  let settingsOpen=false,historyOpen=false,recentOpen=true,busy=false,notice='';
  const icon=name=>{const el=document.createElement('i');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
  const appearance=report=>report.state==='authorized'?['accepted','Accepted','shield-check']:
    report.state==='incorrect-password'||report.failed_attempts>0?['failed','Failed','shield-alert']:
    report.state==='service-error'?['warning','Service issue','triangle-alert']:
    report.state==='opened'?['pending','Opened','key-round']:['neutral','Closed','circle-minus'];
  async function clearReports(reports) {
    if(busy)return;busy=true;notice='Clearing reports…';render();
    try {
      const result=await mutate('parent-exit-clear',{confirmation:true,reports:reports.map(report=>({id:report.id,studentId:report.student_id,sequence:report.sequence}))},{notify:false});
      notice=result.cleared+' '+(result.cleared===1?'report cleared.':'reports cleared.')+' Coins unchanged.'+(result.skipped?' Changed or previously reviewed reports were left alone.':'');
    } catch(error) {notice=error.message;}
    finally {busy=false;render();}
  }
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
  function reportCard(report) {
    const [tone,label,symbol]=appearance(report),article=node('article','cloud-exit-report cloud-exit-report--'+tone);
    article.dataset.exitReportId=report.id;article.dataset.exitOutcome=tone;
    const heading=node('div','cloud-exit-report-heading'),title=node('h3','',report.student_name),badge=node('span','cloud-exit-outcome');
    badge.append(icon(symbol),node('span','',label));badge.title=report.state==='authorized'?'Parent password accepted':tone==='failed'?'Incorrect parent password':label;
    heading.append(title,badge);article.append(heading);
    const meta=node('div','cloud-exit-report-meta'),time=node('time');time.dateTime=report.occurred_at;
    time.textContent=new Date(report.occurred_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});time.title=new Date(report.occurred_at).toLocaleString();meta.append(time);
    if(report.failed_attempts>0)meta.append(node('span','cloud-exit-failed-count',report.failed_attempts+' failed '+(report.failed_attempts===1?'try':'tries')));
    if(report.coins_deducted)meta.append(node('span','', '−100 coins'));
    article.append(meta);
    const details=node('details','cloud-exit-report-details');details.append(node('summary','','Details'));
    details.append(node('p','cloud-note',report.computer_name||'Child computer'),node('p','cloud-note',report.source==='shortcut'?'Keyboard shortcut':report.source==='button'?'Exit button':report.source==='recovery'?'System recovery':'Close request'),node('p','cloud-note',new Date(report.occurred_at).toLocaleString()));
    if(report.reviewed_at)details.append(node('p','cloud-note',report.coins_deducted?'Reviewed · 100 coins deducted':'Reviewed · Coins unchanged'));
    article.append(details);
    if(!report.reviewed_at) {
      const actions=node('div','cloud-actions');
      const dismiss=button('Dismiss',async()=>{if(busy)return;busy=true;render();try{await mutate('parent-exit-review',{id:report.id,studentId:report.student_id,decision:'dismiss',confirmation:true},{notify:false});notice='Report cleared. Coins unchanged.';}catch(error){notice=error.message;}finally{busy=false;render();}});dismiss.prepend(icon('check'));dismiss.disabled=busy;actions.append(dismiss);
      if(report.state!=='authorized'&&(report.source!=='recovery'||report.failed_attempts>0)) {const deduct=button('−100 coins',()=>confirmation(report),'btn btn-secondary');deduct.prepend(icon('coins'));deduct.title='Review and deduct 100 coins';deduct.setAttribute('aria-label','Deduct 100 coins');deduct.disabled=busy;actions.append(deduct);}
      article.append(actions);
    }
    return article;
  }
  function render() {
    const root=document.getElementById('cloud-parent-exit-controls'),snapshot=getSnapshot();
    if(!root || !snapshot)return;
    root.replaceChildren();
    const data=snapshot.parentExitControls;
    root.append(node('h2','','Parent exit & activity'));
    if(!data) {root.append(node('p','cloud-note','Exit activity is not available from this service yet.'));return;}
    const attempts=data.attempts||[],unreviewed=attempts.filter(row=>!row.reviewed_at),reviewed=attempts.filter(row=>row.reviewed_at);
    const pending=unreviewed.filter(row=>row.state!=='authorized'&&(row.source!=='recovery'||row.failed_attempts>0));
    const tools=node('div','cloud-exit-tools');
    const alert=node('p',pending.length?'cloud-exit-alert':'cloud-note',pending.length?pending.length+' possible exit '+(pending.length===1?'attempt needs':'attempts need')+' review':'No unreviewed exit attempts.');alert.setAttribute('role','status');
    const clear=button('Clear all',()=>clearReports(unreviewed),'btn btn-secondary cloud-exit-clear');clear.prepend(icon('list-checks'));
    clear.disabled=busy||!unreviewed.length||unreviewed.some(report=>!Number.isInteger(report.sequence));clear.title='Mark displayed reports reviewed. Coins stay unchanged.';
    tools.append(alert,clear);root.append(tools);
    const status=node('p','cloud-exit-action-status',notice);status.setAttribute('role','status');status.setAttribute('aria-live','polite');if(notice)root.append(status);
    const recent=node('details','cloud-exit-recent');recent.open=recentOpen;recent.addEventListener('toggle',()=>{recentOpen=recent.open;});recent.append(node('summary','','Recent exit activity'+(unreviewed.length?' · '+unreviewed.length:'')));
    const list=node('div','cloud-exit-list');for(const report of unreviewed)list.append(reportCard(report));
    if(!unreviewed.length)list.append(node('p','cloud-note','All caught up. Reviewed reports are saved below.'));
    recent.append(list);root.append(recent);
    if(reviewed.length) {const history=node('details','cloud-exit-history');history.open=historyOpen;history.addEventListener('toggle',()=>{historyOpen=history.open;});history.append(node('summary','','Reviewed history · '+reviewed.length));const saved=node('div','cloud-exit-list');for(const report of reviewed)saved.append(reportCard(report));history.append(saved);root.append(history);}
    const settings=node('details','cloud-exit-settings');settings.open=settingsOpen;settings.addEventListener('toggle',()=>{settingsOpen=settings.open;});settings.append(node('summary','','Exit settings & shortcuts'));
    settings.append(node('p','cloud-note','The exit icon is hidden by default. Parents can open controls with Ctrl+Alt+Q or Ctrl+Shift+Q. Reports never contain typed passwords.'));
    for(const student of snapshot.students.filter(row=>!row.archived_at)) {
      const label=node('label','cloud-exit-setting'),input=document.createElement('input');input.type='checkbox';input.disabled=busy;
      input.checked=data.settings?.find(row=>row.studentId===student.id)?.showIcon===true;
      input.setAttribute('aria-label','Show parent exit icon for '+student.name);
      const state=node('span','cloud-note');state.setAttribute('role','status');
      input.onchange=async()=>{const previous=!input.checked;input.disabled=true;state.textContent='Saving…';try {await mutate('parent-exit-settings',{studentId:student.id,showIcon:input.checked});state.textContent='Saved';}catch(error){input.checked=previous;state.textContent=error.message;}finally{input.disabled=false;}};
      label.append(input,node('span','',student.name),state);settings.append(label);
    }
    root.append(settings);window.lucide?.createIcons();
  }
  return {render};
}
