// One reviewed editor, independent assignments and exact retries for each child.
export function createLearningAssignmentBatch(entries) {
  if(!entries.length||entries.length>50||new Set(entries.map(item=>item.command.studentId)).size!==entries.length)throw Error('Choose distinct children for this assignment.');
  const items=JSON.parse(JSON.stringify(entries));let index=0,running=false;
  return {
    get completed(){return index;},get total(){return items.length;},
    remainingIds(){return items.slice(index).map(item=>item.command.studentId);},
    summary(){return index+' of '+items.length+' saved'+(index?' for '+items.slice(0,index).map(item=>item.name).join(', '):'')+'.';},
    async run(send,progress=()=>{}) {
      if(running)throw Error('This assignment is already saving.');running=true;let result;
      try {while(index<items.length){const item=items[index];progress(this.summary()+' Saving for '+item.name+'…');result=await send(JSON.parse(JSON.stringify(item.command)));
        if(item.command.kind==='list' && (result.saved!==true || result.listId!==item.command.listId))throw Error('The saved-list confirmation did not match. Retry this assignment.');
        index++;progress(this.summary());}return result;
      } finally {running=false;}
    }
  };
}
export function createLearningRecipientPicker(select,{prefix,onChange=()=>{}}) {
  const original=select.closest('.form-group'),root=document.createElement('fieldset');root.className='learning-recipients';root.id=prefix+'-recipients';
  const legend=document.createElement('legend');legend.textContent='Assign to children';
  const help=document.createElement('p');help.textContent='Choose one or more. Each child has their own practice and progress.';
  const actions=document.createElement('div');actions.className='learning-recipient-actions';
  const all=document.createElement('button');all.type='button';all.textContent='Select all';
  const clear=document.createElement('button');clear.type='button';clear.textContent='Clear';
  const count=document.createElement('span');count.setAttribute('role','status');
  const chips=document.createElement('div');chips.className='learning-recipient-chips';
  const note=document.createElement('p');note.className='learning-assignment-note';note.textContent='An active list replaces the selected children’s current list. Earlier results stay in Archives.';
  actions.append(all,clear,count);root.append(legend,help,actions,chips,note);original.classList.add('learning-single-recipient');original.after(root);
  let records=[],selected=new Set(),excluded=null,locked=false;
  const refresh=()=>{for(const label of chips.children){const input=label.querySelector('input');input.checked=selected.has(input.value);input.disabled=locked||input.value===excluded;label.classList.toggle('is-selected',input.checked);}count.textContent=selected.size+' selected';select.value=[...selected][0]||'';onChange(selected.size);};
  all.onclick=()=>{selected=new Set(records.filter(child=>child.id!==excluded).map(child=>child.id));refresh();};clear.onclick=()=>{selected.clear();refresh();};
  return {root,
    configure(students,ids,{editing=false,exclude=null}={}){
      records=students.filter(child=>!child.archived_at);excluded=exclude;selected=new Set(ids.filter(id=>records.some(child=>child.id===id)&&id!==exclude));original.hidden=!editing;root.hidden=editing;
      chips.replaceChildren(...records.map(child=>{const label=document.createElement('label');label.className='learning-recipient';const input=document.createElement('input');input.type='checkbox';input.value=child.id;input.id=prefix+'-recipient-'+child.id;
        const avatar=document.createElement('span');avatar.className='learning-recipient-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=child.name?.slice(0,1)||'?';
        const name=document.createElement('span');name.className='learning-recipient-name';name.textContent=child.name;const detail=document.createElement('small');detail.textContent=child.id===exclude?'Source list':child.grade!==undefined&&child.grade!==null&&child.grade!==''?'Grade '+child.grade:'';name.append(detail);
        input.onchange=()=>{if(input.checked)selected.add(child.id);else selected.delete(child.id);refresh();};label.append(input,avatar,name);return label;}));refresh();
    },
    ids(){return [...selected];},
    retain(ids){selected=new Set(ids.filter(id=>records.some(child=>child.id===id)&&id!==excluded));refresh();},
    setDisabled(value){locked=value;all.disabled=clear.disabled=value;refresh();},
    setActive(value){note.hidden=!value;}
  };
}
