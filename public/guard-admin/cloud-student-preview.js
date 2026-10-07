const themes = new Set(['default','pink','teal','dark-green','orange','purple','aurora','crimson','sunset-gold']);
const modules = new Set(['dashboard','spelling','vocabulary']);
export function setupStudentPreview({getSnapshot,endpoint='/guard/dashboard/bridge/'}) {
  const toolbar=document.getElementById('overview-actions');if(!toolbar)return;
  const button=document.createElement('button');button.type='button';button.id='cloud-student-preview';button.className='btn btn-secondary';
  button.innerHTML='<i data-lucide="monitor-play" aria-hidden="true"></i><span>Preview</span>';const refresh=document.getElementById('cloud-refresh');const anchor=[...toolbar.children].find(node=>node===refresh||node.contains(refresh));toolbar.insertBefore(button,anchor||null);
  const sheet=document.createElement('dialog');sheet.className='cloud-preview-dialog';sheet.setAttribute('aria-labelledby','cloud-preview-title');
  sheet.innerHTML=`<header class="cloud-preview-header"><div><h2 id="cloud-preview-title">Student preview</h2><p>Safe test session · no changes to your child’s records</p></div><button type="button" class="btn btn-secondary" data-preview-close aria-label="Close student preview">Close</button></header>
    <div class="cloud-preview-controls"><label for="cloud-preview-student">Student</label><select id="cloud-preview-student" class="admin-input"></select><button type="button" class="btn btn-primary" data-preview-start>Open preview</button><button type="button" class="btn btn-secondary" data-preview-reset hidden>Reset test</button><button type="button" class="btn btn-secondary" data-preview-home hidden>Dashboard</button></div>
    <p class="cloud-preview-message" role="status" aria-live="polite"></p><div class="cloud-preview-stage"></div>`;
  document.body.append(sheet);
  const select=sheet.querySelector('select'),start=sheet.querySelector('[data-preview-start]'),reset=sheet.querySelector('[data-preview-reset]'),home=sheet.querySelector('[data-preview-home]'),message=sheet.querySelector('[role=status]'),stage=sheet.querySelector('.cloud-preview-stage');
  let abort=null,generation=0,seed=null,original=null,frame=null,readyTimer=null;
  function destroy(){clearTimeout(readyTimer);frame?.remove();frame=null;stage.replaceChildren();}
  function close(){generation++;abort?.abort();abort=null;destroy();seed=original=null;sheet.close();button.focus();}
  function render(module='dashboard') {
    destroy();frame=document.createElement('iframe');frame.dataset.module=module;frame.title=`${seed.status.school.student.name} — ${module} preview`;
    frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';
    frame.src=`/guard-admin/student-preview/${module}.html?v=20261007-preview1`;
    stage.append(frame);sheet.classList.add('is-open');
    message.textContent='Opening test screen…';
    readyTimer=setTimeout(()=>{message.textContent='Preview could not finish loading. Close it and try again.';},15000);
  }
  async function load(){
    const student=getSnapshot()?.students?.find(row=>row.id===select.value&&!row.archived_at);
    if(!student){message.textContent='Choose a student from your family.';return;}
    const run=++generation;abort?.abort();abort=new AbortController();destroy();seed=original=null;
    reset.hidden=home.hidden=true;start.disabled=true;message.textContent=`Loading ${student.name}’s saved settings…`;
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'student-preview',studentId:student.id}),signal:abort.signal});
      const value=await response.json();if(!response.ok)throw Error(value.error||'Preview could not load.');
      if(run!==generation||!sheet.open)return;
      if(value.preview!==true||value.status?.school?.student?.id!==student.id)throw Error('The student preview did not match your selection.');
      original=structuredClone(value);seed=structuredClone(value);reset.hidden=home.hidden=false;render();
    }catch(error){if(run===generation&&error.name!=='AbortError')message.textContent=error.message;}
    finally{if(run===generation)start.disabled=false;}
  }
  window.addEventListener('message',event=>{
    if(!sheet.open||!frame||event.source!==frame.contentWindow||event.origin!=='null'||!seed)return;
    const data=event.data;
    if(data?.type==='preview-ready'){
      frame.contentWindow.postMessage({type:'preview-seed',seed:structuredClone(seed)},'*');
    }else if(data?.type==='preview-loaded'){
      clearTimeout(readyTimer);frame.dataset.loaded='true';
      message.textContent=`Previewing ${seed.status.school.student.name} · saved cloud settings, not a live computer. Test answers are discarded.`;
    }else if(data?.type==='preview-open'&&modules.has(data.module))render(data.module);
    else if(data?.type==='preview-theme'&&themes.has(data.theme))seed.status.dashboard.data.student.theme=data.theme;
  });
  button.onclick=()=>{
    select.replaceChildren();for(const student of (getSnapshot()?.students||[]).filter(row=>!row.archived_at)){
      const option=document.createElement('option');option.value=student.id;option.textContent=student.name;select.append(option);
    }
    start.disabled=!select.options.length;reset.hidden=home.hidden=true;start.textContent='Open preview';sheet.classList.remove('is-open');
    message.textContent=select.options.length?'Choose a student to explore their dashboard and test assigned Spelling and Vocabulary, daily questions, messages and chores. School websites and Windows controls stay on the child’s computer.':'Add a student to your family first.';
    sheet.showModal();select.focus();
  };
  select.onchange=()=>{generation++;abort?.abort();destroy();seed=original=null;reset.hidden=home.hidden=true;start.disabled=false;message.textContent='Choose Open preview to load this student.';};
  start.onclick=load;reset.onclick=()=>{seed=structuredClone(original);render();};home.onclick=()=>render();
  sheet.querySelector('[data-preview-close]').onclick=close;sheet.addEventListener('cancel',event=>{event.preventDefault();close();});
  sheet.addEventListener('click',event=>{if(event.target===sheet&&!sheet.classList.contains('is-open'))close();});
}
