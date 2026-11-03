/* global document, window */
// Visibility follows configured access, not today's schedule or a temporary lock.
export function hasQuizletAccess(snapshot) {
  const students=(snapshot?.students||[]).filter(student=>!student.archived_at);
  return students.length>0&&(snapshot?.rules?.subjects||[]).some(subject=>{
    if(subject.active===false)return false;
    try {const url=new URL(subject.url);if(url.protocol!=='https:'||!['quizlet.com','www.quizlet.com'].includes(url.hostname)||url.username||url.password)return false;}catch{return false;}
    return students.some(student=>{
      const assignment=Array.isArray(subject.assignments)?subject.assignments.find(row=>row.studentId===student.id):{};
      return assignment&&assignment.active!==false&&assignment.dailyPlan?.enabled!==false&&assignment.dailyPlan?.placement!=='blocked';
    });
  });
}
export function setupQuizletReview({getSnapshot,endpoint,node,button}) {
  const root=document.getElementById('cloud-quizlet-review');
  if(!root)return {update(){}};
  root.replaceChildren();
  const home=document.createComment('Quizlet review when allowed');root.before(home);root.hidden=true;
  const icon=name=>{const el=node('i');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
  const details=node('details','cloud-overview-section'),summary=node('summary','cloud-overview-summary'),intro=node('span','cloud-overview-copy');
  const subtitle=node('small','','Optional review of questions children send to Ask Quizlet.');
  intro.append(node('strong','','Quizlet AI questions'),subtitle);summary.append(icon('message-square-text'),intro,node('span','cloud-overview-badge','Optional'),icon('chevron-down'));
  const body=node('div','cloud-overview-body'),context=node('p','cloud-note');
  body.append(context,node('p','cloud-note','Question review is off until you turn it on for a child. An updated BodeeGuard Windows app shows the child a review notice. It records submitted questions, not passwords, drafts, ordinary study answers, AI replies or file uploads.'));
  details.append(summary,body);
  const label=node('label','','Child'),select=node('select','admin-input');label.append(select);
  const actions=node('div','cloud-actions'),refresh=button('Refresh',()=>load()),toggle=button('Turn on question review',()=>save()),older=button('Older questions',()=>load(true)),clear=button('Clear history',()=>confirmClear(),'btn btn-secondary');
  const message=node('p','cloud-note');message.setAttribute('role','status');
  const coverage=node('div','cloud-quizlet-coverage'),list=node('div','cloud-quizlet-history');
  actions.append(toggle,refresh,clear);body.append(label,actions,message,coverage,list,older,node('p','cloud-note','History is limited to 30 days and 2,000 characters per question. Send attempts are shown; a saved question does not prove Quizlet answered it. Recording is best effort and covers this app only.'));
  root.append(details);
  let data=null,busy=false,offset=0,generation=0,active=false,currentTab='overview';
  async function request(action,input) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Quizlet review could not be loaded. Try Refresh.');return result;
  }
  function controls(){refresh.disabled=select.disabled=busy||!select.value;toggle.disabled=clear.disabled=busy||!select.value||!data;older.hidden=!data?.hasMore;older.disabled=busy;toggle.textContent=data?.enabled?'Turn off question review':'Turn on question review';}
  const states={ready:'Review available in the recognized Ask Quizlet composer',waiting:'Waiting for Ask Quizlet to open',unsupported:'Not recording: this Quizlet layout is not recognized',paused:'Not recording: Quizlet is paused',closed:'Quizlet was closed','storage-full':'Not recording: local review storage needs to sync'};
  function render(result,append=false) {
    data=result;if(!append)list.replaceChildren();coverage.replaceChildren();
    if(!result.enabled)coverage.append(node('p','cloud-note','Question review is OFF for this child.'));
    else if(!result.coverage.length)coverage.append(node('p','cloud-note','Enabled, but capture has not been confirmed. The child needs an updated Windows app, then must open Ask Quizlet. An empty history is not proof of no activity.'));
    else for(const item of result.coverage)coverage.append(node('p','cloud-note',`${states[item.state]||'Capture unavailable'} · ${item.computer_name||'Child computer'} · Last reported ${new Date(item.occurred_at).toLocaleString()}`));
    for(const item of result.events) {
      const article=node('article','cloud-quizlet-question');
      article.append(node('p','cloud-note',`${new Date(item.occurred_at).toLocaleString()} · ${item.computer_name||'Child computer'} · Send attempted`),node('p','cloud-quizlet-text',item.question));list.append(article);
    }
    if(!append&&!result.events.length)list.append(node('p','cloud-note','No saved questions in the past 30 days. Check the capture status above.'));
    controls();
  }
  async function load(append=false) {
    if(busy||!details.open||!select.value||!active)return;
    const expected=++generation,child=select.value;busy=true;controls();message.textContent='Loading…';
    try {const next=append?offset+50:0,result=await request('quizlet-review-list',{studentId:child,offset:next});if(expected!==generation||select.value!==child||!details.open)return;offset=next;render(result,append);message.textContent='';}
    catch(error){if(expected===generation)message.textContent=error.message;}
    finally{busy=false;controls();}
  }
  async function save() {
    if(busy||!data)return;busy=true;controls();message.textContent='Saving…';
    try {await request('quizlet-review-settings',{studentId:select.value,enabled:!data.enabled});busy=false;await load();}
    catch(error){message.textContent=error.message;}finally{busy=false;controls();}
  }
  function confirmClear() {
    const studentId=select.value;
    const dialog=node('dialog','cloud-panel'),title=node('h2','','Clear this child’s Quizlet history?');
    dialog.append(title,node('p','cloud-note','This permanently deletes the saved questions. Offline content from this consent period will not be uploaded again. Review can remain on for new questions.'));
    const status=node('p','cloud-note');status.setAttribute('role','alert');let deleting=false;
    const cancel=button('Keep history',()=>dialog.close()),remove=button('Clear history',async()=>{
      if(deleting)return;deleting=true;remove.disabled=cancel.disabled=true;
      try{await request('quizlet-review-clear',{studentId,confirmation:true});dialog.close();await load();}
      catch(error){status.textContent=error.message;deleting=false;remove.disabled=cancel.disabled=false;}
    },'btn btn-danger');
    const actions=node('div','cloud-actions');actions.append(cancel,remove);dialog.append(status,actions);dialog.addEventListener('cancel',e=>{if(deleting)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();cancel.focus();
  }
  select.onchange=()=>{generation++;data=null;list.replaceChildren();coverage.replaceChildren();void load();};
  details.ontoggle=()=>{if(details.open)void load();else generation++;};
  function update(tab=currentTab) {
    currentTab=typeof tab==='boolean'?(tab?'overview':'other'):tab;
    const snapshot=getSnapshot(),relevant=hasQuizletAccess(snapshot),settings=document.getElementById('cloud-quizlet-review-settings');
    const destination=relevant?home.parentNode:settings;
    if(destination&&root.parentNode!==destination){generation++;details.open=false;destination===home.parentNode?home.after(root):destination.append(root);}
    root.hidden=!snapshot||!destination;
    active=!root.hidden&&currentTab===(relevant?'overview':'settings');if(!active)generation++;
    subtitle.textContent=relevant?'Optional review of questions children send to Ask Quizlet.':'Optional settings and saved history for families using Quizlet.';
    context.hidden=relevant;context.textContent='Quizlet is not currently allowed for any child. Allow it in Daily Plan to show this panel on Overview. You can still manage review settings and saved history here.';
    const selected=select.value,students=snapshot?.students?.filter(s=>!s.archived_at)||[];
    if([...select.options].map(o=>`${o.value}:${o.textContent}`).join('|')!==students.map(s=>`${s.id}:${s.name}`).join('|')) {
      select.replaceChildren(...students.map(s=>{const option=node('option','',s.name);option.value=s.id;return option;}));
      if(students.some(s=>s.id===selected))select.value=selected;
    }
    controls();
  }
  window.lucide?.createIcons();return {update};
}
