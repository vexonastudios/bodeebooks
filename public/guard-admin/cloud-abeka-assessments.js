import './abeka-assessments-contract.js';
import {familyUsesAbeka,ABEKA_ASSESSMENT_URL} from './cloud-abeka-parent.js';

export function setupAbekaAssessments({getSnapshot,endpoint,node,button}){
  const root=document.getElementById('cloud-abeka-assessments');if(!root)return {update(){}};
  const contract=window.BodeeAbekaAssessments,heading=node('h2','','Abeka quizzes & tests'),summary=node('p','cloud-assessment-summary'),children=node('div','cloud-assessment-children'),details=node('details'),open=node('summary','','Review assessments');
  const intro=node('p','cloud-note','Track assessments separately from watched lessons. An empty or missing list is not proof that school or quizzes are complete.');
  const student=node('select','admin-input'),studentLabel=node('label','','Child');studentLabel.append(student);
  const term=node('input','admin-input');term.type='text';term.maxLength=9;term.pattern='20[0-9]{2}-20[0-9]{2}';const termLabel=node('label','','School year');termLabel.append(term);
  const filter=node('select','admin-input');filter.setAttribute('aria-label','Assessment filter');for(const [value,label] of [['attention','Needs attention'],['all','All known assessments'],['finished','Submitted or graded'],['unverified','Not yet verified']]){const option=node('option','',label);option.value=value;filter.append(option);}
  const search=node('input','admin-input');search.type='search';search.placeholder='Find a course, quiz or test';search.setAttribute('aria-label','Find an assessment');
  const controls=node('div','cloud-assessment-controls'),refresh=button('Refresh assessments',()=>void load());controls.append(studentLabel,termLabel,filter,search,refresh);
  const message=node('p','cloud-note');message.setAttribute('role','status');const coverage=node('div','cloud-assessment-coverage'),rows=node('div','cloud-assessment-rows'),more=button('Show 50 more',()=>{limit+=50;render();});
  const importDetails=node('details','cloud-assessment-import'),importSummary=node('summary','','Accredited students: import parent permissions');
  const link=node('a','btn btn-secondary','Open Abeka Assessment Permissions');link.href=ABEKA_ASSESSMENT_URL;link.target='_top';link.referrerPolicy='no-referrer';
  const exportLink=node('a','btn btn-secondary','Save Abeka assessment summary');exportLink.href=contract.bookmarklet();exportLink.draggable=true;
  const instructions=node('p','cloud-note','One-time setup on a desktop: drag “Save Abeka assessment summary” to your bookmarks bar. In Abeka’s parent account, open Assessment Permissions and select one child, then use that bookmark to download a summary. Return here, choose that same child and school year, and review the file before importing. BodeeGuard cannot read your separate Abeka login automatically.');
  const file=node('input','admin-input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Abeka assessment summary file');
  const preview=node('div','cloud-assessment-preview'),confirm=node('input');confirm.type='checkbox';const confirmation=node('label','cloud-assessment-confirm');confirmation.append(confirm,document.createTextNode('I confirm this summary belongs to the child and school year selected above.'));
  const saveImport=button('Import reviewed summary',()=>void importSummaryFile());saveImport.disabled=true;
  importDetails.append(importSummary,instructions,link,exportLink,file,preview,confirmation,saveImport,node('p','cloud-note','Permissions show listed or in-progress assessments, including future work. Locked permission alone is not an overdue quiz. Disappearing items are never marked complete automatically. No Abeka passwords, answers or permissions are changed.'));
  details.append(open,intro,controls,message,coverage,rows,more,importDetails);root.append(heading,summary,children,details);
  let data=null,busy=false,generation=0,active=true,limit=50,pendingImport=null,importId=null;
  const states={outstanding:'Outstanding',locked:'Locked — not submitted','in-progress':'In progress',submitted:'Submitted — grade pending',graded:'Graded','marked-complete':'Marked complete in Abeka — submission unverified',listed:'Listed in parent permissions — completion unverified','needs-review':'Conflicting evidence — review needed','parent-complete':'Parent confirmed complete','needs-work':'Parent: needs more work'};
  async function request(action,input){const r=await fetch(action==='abeka-assessments-import'?endpoint.replace(/bridge\/?$/,'assessment-import/'):endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const value=await r.json();if(!r.ok)throw Error(value.error||'Assessment review is unavailable. Try Refresh.');return value;}
  function freeze(){student.disabled=term.disabled=refresh.disabled=busy;saveImport.disabled=busy||!pendingImport||!confirm.checked;}
  function clearImport(){pendingImport=null;importId=null;confirm.checked=false;file.value='';preview.replaceChildren();freeze();}
  function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:getSnapshot()?.rules?.schedule?.timeZone||'America/Chicago'}).format(new Date());}
  function render(){
    rows.replaceChildren();coverage.replaceChildren();if(!data){more.hidden=true;return;}
    if(!data.sources.some(s=>s.source==='student-dashboard'))coverage.append(node('p','cloud-assessment-warning','Student dashboard not checked yet. Start Abeka in the updated Windows app to check its dashboard automatically. Open Grades & To-Do if a check cannot be confirmed. Existing missed work can then be discovered.'));
    for(const source of data.sources){const stale=!source.last_good||Date.now()-Date.parse(source.last_good)>36*3600000;coverage.append(node('p',stale||!source.recognized?'cloud-assessment-warning':'cloud-note',`${source.source==='permissions'?'Parent-imported permissions':'Student dashboard'}: ${!source.recognized?(source.capture_state==='unavailable'?'dashboard unavailable; open Grades & To-Do to try again':'layout not recognized; older evidence retained'):stale?'needs a fresh check':'last recognized check'} · ${source.last_good?new Date(source.last_good).toLocaleString():'no recognized check yet'}${source.term&&source.term!==data.term?' · Different school year: '+source.term:''}`));}
    for(const year of data.terms||[])if(year.term!==data.term)coverage.append(button(`Review ${year.term} · ${year.attention_count} need review`,()=>{term.value=year.term;clearImport();void load();}));
    const query=search.value.toLowerCase(),selected=data.entries.filter(e=>{
      if(query&&!`${e.course} ${e.title}`.toLowerCase().includes(query))return false;
      if(filter.value==='attention')return contract.needsAttention(e.state);
      if(filter.value==='finished')return ['submitted','graded','parent-complete'].includes(e.state);
      if(filter.value==='unverified')return ['listed','marked-complete','needs-review'].includes(e.state);
      return true;
    });
    for(const entry of selected.slice(0,limit)){
      const article=node('article','cloud-assessment-row'),title=node('h3','',entry.title);article.append(node('p','cloud-note',entry.course),title,node('strong',contract.needsAttention(entry.state)?'cloud-assessment-warning':'',states[entry.state]||'Unknown'));
      const due=entry.facts.todo?.dueDate,overdue=['outstanding','locked','in-progress','needs-work'].includes(entry.state)&&due<today();if(due)article.append(node('p',overdue?'cloud-assessment-warning':'cloud-note',`${overdue?'Overdue · ':''}Abeka date: ${due}`));
      if(entry.facts.grades?.grade)article.append(node('p','','Grade: '+entry.facts.grades.grade));
      if(entry.facts.permissions?.permission)article.append(node('p','cloud-note','Parent permission: '+entry.facts.permissions.permission));
      article.append(node('p','cloud-note','Last evidence: '+new Date(entry.lastSeen).toLocaleString()));
      if(entry.facts.permissions)article.append(node('p','cloud-note','Includes a parent-imported permissions list. A missing item does not establish completion.'));
      const actions=node('div','cloud-actions');for(const [decision,label] of [['parent-complete','Parent: confirm completed'],['needs-work','Parent: needs more work']]){
        const action=button(label,()=>void review(entry,decision));action.disabled=busy;actions.append(action);
      }article.append(actions);rows.append(article);
    }
    if(!selected.length)rows.append(node('p','cloud-note',data.entries.length?'No recorded assessments match this filter. Check coverage above.':'No assessments recorded for this school year. This does not prove they were taken.'));
    more.hidden=selected.length<=limit;
  }
  async function load(){if(busy||!student.value||!active||!details.open)return;const version=++generation,child=student.value;busy=true;freeze();message.textContent='Checking assessment history…';
    try{contract.term(term.value);const result=await request('abeka-assessments-list',{studentId:child,term:term.value});if(version!==generation||child!==student.value||!details.open)return;data=result;limit=50;message.textContent='';render();}
    catch(e){message.textContent=e.message;}finally{busy=false;freeze();render();}
  }
  async function review(entry,decision){if(busy||!data)return;const child=student.value,schoolYear=data.term;busy=true;freeze();render();message.textContent='Saving parent review…';
    try{await request('abeka-assessments-review',{studentId:child,term:schoolYear,key:entry.key,lastSeen:entry.lastSeen,decision,confirmation:true});busy=false;await load();message.textContent='Parent review saved. Abeka’s grade and permissions were not changed.';}
    catch(e){message.textContent=e.message;}finally{busy=false;freeze();render();}
  }
  file.onchange=async()=>{pendingImport=null;confirm.checked=false;freeze();preview.replaceChildren();const selected=file.files?.[0];if(!selected)return;const version=generation;
    try{if(selected.size>512*1024)throw Error('Choose a summary smaller than 512 KB.');const parsed=JSON.parse(await selected.text());if(version!==generation)return;const value=contract.normalize({...parsed,term:term.value});if(value.source!=='permissions'||!value.recognized)throw Error('Choose an Abeka parent permissions summary.');pendingImport=value;importId=crypto.randomUUID();preview.append(node('p','',`${value.records.length} listed assessments · ${term.value}`));for(const row of value.records.slice(0,15))preview.append(node('p','cloud-note',`${row.course} · ${row.title} · ${states[row.status]}`));if(value.records.length>15)preview.append(node('p','cloud-note','The remaining listed assessments will be included.'));}
    catch(e){message.textContent=e.message||'The summary could not be read.';}freeze();
  };
  confirm.onchange=freeze;
  async function importSummaryFile(){if(busy||!pendingImport||!confirm.checked)return;busy=true;freeze();try{await request('abeka-assessments-import',{id:importId,studentId:student.value,snapshot:pendingImport,confirmation:true});clearImport();busy=false;await load();message.textContent='Parent permissions imported. Future listed quizzes are not treated as overdue.';}catch(e){message.textContent=e.message;}finally{busy=false;freeze();}}
  for(const control of [student,term])control.onchange=()=>{if(control===student)term.value=getSnapshot()?.abekaAssessments?.children?.find(s=>s.student_id===student.value)?.term||getSnapshot()?.abekaAssessments?.term||term.value;generation++;data=null;clearImport();render();void load();};
  filter.onchange=search.oninput=()=>{limit=50;render();};details.ontoggle=()=>{if(details.open)void load();else generation++;};
  function update(isActive=active){active=isActive;if(!active)generation++;const snapshot=getSnapshot();root.hidden=!familyUsesAbeka(snapshot);if(root.hidden)return;
    const current=student.value,roster=(snapshot.students||[]).filter(s=>!s.archived_at);
    if(!busy&&JSON.stringify([...student.options].map(o=>o.value))!==JSON.stringify(roster.map(s=>s.id))){student.replaceChildren(...roster.map(s=>{const o=node('option','',s.name);o.value=s.id;return o;}));if(roster.some(s=>s.id===current))student.value=current;else{generation++;data=null;clearImport();render();}}
    const overview=snapshot.abekaAssessments;const counts=overview?.children||[],total=counts.reduce((n,r)=>n+Number(r.attention_count||0),0),stale=roster.some(s=>{const r=counts.find(c=>c.student_id===s.id);return !r?.last_good||!r.recognized||Date.now()-Date.parse(r.last_good)>36*3600000;});
    summary.textContent=overview?.available===false?'Assessment reporting is unavailable. Previously saved history is retained.':`${total?total+' assessment'+(total===1?' needs':'s need')+' your review.':'No outstanding assessments reported yet.'}${stale?' Some children need a fresh assessment check.':''} Missing data does not mean complete.`;summary.className=total||stale||overview?.available===false?'cloud-assessment-summary cloud-assessment-warning':'cloud-assessment-summary';
    children.replaceChildren(...roster.map(s=>{const row=counts.find(r=>r.student_id===s.id),fresh=row?.last_good&&row.recognized&&Date.now()-Date.parse(row.last_good)<=36*3600000,b=button(`${s.name} · ${row?.attention_count?row.attention_count+' need review':fresh?'No issues reported':'Needs a fresh check'}`,()=>{student.value=s.id;term.value=row?.term||overview?.term||term.value;generation++;data=null;clearImport();details.open=true;void load();});return b;}));
    if(!term.value)term.value=counts.find(r=>r.student_id===student.value)?.term||overview?.term||(()=>{const d=new Date(),y=d.getFullYear()-(d.getMonth()<7?1:0);return y+'-'+(y+1);})();freeze();
  }
  return {update};
}
