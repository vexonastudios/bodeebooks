// Only a confirmed, same-school-day response may replace the cached unlocks.
// Other mutations and date changes still use the normal dashboard refresh.
export function updateQuickUnlockSnapshot(snapshot, input, result) {
  const value=result?.quickUnlock, student=snapshot?.students?.find(item=>item.id===input.studentId);
  if(input.kind!=='quick-unlock'||!student||value?.date!==snapshot.activityDate||!Array.isArray(value.subjectIds)||value.subjectIds.some(id=>typeof id!=='string'))return false;
  student.quick_unlock={date:value.date,subjectIds:[...value.subjectIds]};return true;
}
const node=(tag,cls='',text='')=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;return el;};
const icon=name=>{const el=node('i');el.dataset.lucide=/^[a-z][a-z0-9-]*$/.test(name||'')?name:'book-open';el.setAttribute('aria-hidden','true');return el;};
function button(label,glyph,callback,cls='quick-unlock-action'){
  const el=node('button',cls);el.type='button';el.append(icon(glyph),document.createTextNode(label));el.onclick=callback;return el;
}

export function setupQuickUnlock({getModel,save}) {
  // Keep the dialog outside the child cards, which can refresh while it is open.
  const dialog=node('dialog','quick-unlock-dialog');dialog.id='cloud-quick-unlock';
  dialog.setAttribute('aria-labelledby','quick-unlock-title');dialog.setAttribute('aria-describedby','quick-unlock-description');
  const header=node('header','quick-unlock-header'),title=node('h2','','Quick Unlock');title.id='quick-unlock-title';
  const description=node('p','','Tap an activity to unlock it for today, or select several together. Daily media limits still apply.');description.id='quick-unlock-description';
  const heading=node('div');heading.append(title,description);
  const close=button('','x',()=>dialog.close(),'quick-unlock-close');close.setAttribute('aria-label','Close Quick Unlock');header.append(heading,close);
  const tools=node('div','quick-unlock-tools'),grid=node('div','quick-unlock-grid'),status=node('p','quick-unlock-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const footer=node('footer','quick-unlock-footer'),done=button('Done','check',()=>dialog.close());
  let state=null,queue=Promise.resolve();
  const mode=button('Select multiple','list-checks',()=>{if(state){state.multiple=!state.multiple;state.selected.clear();sync();}});
  const selectAll=button('Select all','check-check',()=>{if(state){for(const item of getModel(state.studentId)?.quickUnlockSubjects||[])if(!unlocked(item.id)&&!state.pending.has(item.id))state.selected.add(item.id);sync();}});
  const apply=button('Unlock selected','key-round',()=>{
    if(!state)return;
    const work=state,ids=[...work.selected];
    for(const id of ids)enqueue(work,id,true);
  },'quick-unlock-action quick-unlock-apply');
  tools.append(mode,selectAll);footer.append(status,done,apply);dialog.append(header,tools,grid,footer);document.body.append(dialog);
  function unlocked(id,model=getModel(state?.studentId)){
    return Boolean(model?.activityDate&&model.student.quick_unlock?.date===model.activityDate&&model.student.quick_unlock.subjectIds.includes(id));
  }
  function enqueue(work,id,value){
    const model=getModel(work.studentId);
    if(work.pending.has(id)||!model?.quickUnlockSubjects.some(item=>item.id===id)||unlocked(id,model)===value)return;
    work.pending.add(id);work.failed.delete(id);sync();
    // Serialize small existing commands; never send duplicate toggles or refresh
    // the entire overview between selections. Every request sets an explicit value.
    queue=queue.then(async()=>{
      try{
        const current=getModel(work.studentId);
        if(!current?.quickUnlockSubjects.some(item=>item.id===id))throw Error('This activity changed. Review the Daily Plan.');
        await save({kind:'quick-unlock',studentId:work.studentId,subjectId:id,unlocked:value});
        work.selected.delete(id);work.saved++;
      }catch(error){work.failed.set(id,{message:error.message||'Could not save. Try again.',unlocked:value});}
      finally{work.pending.delete(id);if(state===work)sync();}
    });
  }
  function sync(){
    if(!state||!dialog.open)return;
    const model=getModel(state.studentId);if(!model){dialog.close();return;}
    const items=model.quickUnlockSubjects,allowed=new Set(items.map(item=>item.id));
    for(const [id,failure]of state.failed)if(!allowed.has(id)||unlocked(id,model)===failure.unlocked)state.failed.delete(id);
    title.textContent=`Quick Unlock · ${model.student.name}`;
    for(const id of state.selected)if(!allowed.has(id)||unlocked(id,model))state.selected.delete(id);
    for(const [id,el]of state.rows)if(!allowed.has(id)){el.remove();state.rows.delete(id);}
    for(const item of items){
      const isUnlocked=unlocked(item.id,model),pending=state.pending.has(item.id),failure=state.failed.get(item.id)?.message;
      let tile=state.rows.get(item.id);
      if(!tile){
        tile=node('button','quick-unlock-tile');tile.type='button';tile.dataset.subjectId=item.id;
        tile.onclick=()=>{
          if(!state||state.pending.has(item.id))return;
          if(state.multiple){if(unlocked(item.id))return;if(state.selected.has(item.id))state.selected.delete(item.id);else state.selected.add(item.id);sync();}
          else enqueue(state,item.id,!unlocked(item.id));
        };
        state.rows.set(item.id,tile);grid.append(tile);
      }
      const selected=state.selected.has(item.id);
      tile.disabled=pending||(state.multiple&&isUnlocked);
      tile.className=`quick-unlock-tile${isUnlocked?' is-unlocked':''}${selected?' is-selected':''}${failure?' has-error':''}`;
      tile.setAttribute('aria-pressed',String(state.multiple?selected:isUnlocked));tile.setAttribute('aria-busy',String(pending));
      const copy=node('span','quick-unlock-copy');copy.append(node('strong','',item.label),node('small','',pending?'Saving…':failure?failure:isUnlocked?'Unlocked today':selected?'Selected':state.multiple?'Select to unlock':'Tap to unlock'));
      tile.title=isUnlocked?'Restore the normal rules for this activity':failure||'Unlock for today';
      tile.replaceChildren(icon(item.icon),copy,icon(pending?'loader-circle':isUnlocked?'circle-check':selected?'square-check':'lock-keyhole'));
    }
    mode.replaceChildren(icon('list-checks'),document.createTextNode(state.multiple?'Done selecting':'Select multiple'));mode.setAttribute('aria-pressed',String(state.multiple));
    mode.disabled=state.pending.size>0;selectAll.hidden=!state.multiple;selectAll.disabled=state.pending.size>0||items.every(item=>unlocked(item.id,model));
    apply.hidden=!state.multiple;apply.replaceChildren(icon('key-round'),document.createTextNode(`Unlock selected (${state.selected.size})`));apply.disabled=!state.selected.size||state.pending.size>0;
    status.classList.toggle('has-error',state.failed.size>0);
    status.textContent=state.pending.size?`Saving ${state.pending.size} ${state.pending.size===1?'activity':'activities'}…`:state.failed.size?`${state.failed.size} could not be saved. Successful items are checked; retry the others.`:!items.length?'No activities need Quick Unlock.':state.saved?'Saved for today.':state.multiple?'Choose activities, then Unlock selected.':'Green checks show saved unlocks.';
    window.lucide?.createIcons({root:dialog});
  }
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{
    const id=state?.studentId;state=null;grid.replaceChildren();
    const opener=[...document.querySelectorAll('[data-quick-unlock-student]')].find(el=>el.dataset.quickUnlockStudent===id);opener?.focus();
  });
  return {sync,open(studentId){
    if(!getModel(studentId)?.quickUnlockSubjects.length)return;
    if(dialog.open)return;
    state={studentId,selected:new Set(),pending:new Set(),failed:new Map(),rows:new Map(),multiple:false,saved:0};
    dialog.showModal();sync();close.focus();
  }};
}
