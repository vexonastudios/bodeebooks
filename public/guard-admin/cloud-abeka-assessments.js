import './abeka-assessments-contract.js';
import {familyUsesAbeka,ABEKA_ASSESSMENT_URL} from './cloud-abeka-parent.js';

export function setupAbekaAssessments({getSnapshot,endpoint,node,button}){
  const root=document.getElementById('cloud-abeka-assessments');if(!root)return {update(){}};
  const contract=window.BodeeAbekaAssessments,details=node('details','cloud-assessment-disclosure'),open=node('summary','cloud-assessment-toggle');
  const heading=node('span','cloud-assessment-heading','Abeka quizzes & tests'),summary=node('span','cloud-assessment-summary'),badge=node('span','cloud-assessment-badge');
  const symbol=node('span','cloud-assessment-symbol'),mark=node('i','');mark.dataset.lucide='clipboard-list';mark.setAttribute('aria-hidden','true');symbol.append(mark);
  const copy=node('span','cloud-assessment-copy'),affordance=node('span','cloud-assessment-affordance','View details');copy.append(heading,summary);affordance.setAttribute('aria-hidden','true');open.append(symbol,copy,badge,affordance);
  const body=node('div','cloud-assessment-body'),children=node('div','cloud-assessment-children');children.setAttribute('aria-label','Assessment reports by child');
  const intro=node('p','cloud-note','Saved observations from Abeka. A to-do list date shows when an item was scheduled. Completion is unverified until a submission, grade or parent confirmation is recorded.');
  const help=node('details','cloud-assessment-help'),helpTitle=node('summary','','How automatic checks work');
  help.append(helpTitle,node('p','cloud-note','When a child opens Abeka in an updated BodeeGuard Windows app, it checks the student dashboard automatically and syncs the report here. If a report is missing, open Grades & To-Do in that child’s Abeka session.'));
  help.append(node('p','cloud-note','The date next to a quiz comes from Abeka’s My To-Do List. Abeka shows the month and day. Refresh saved report reloads the last information received. For the latest status, open Grades & To-Do in the child’s Abeka account.'));
  const student=node('select','admin-input'),studentLabel=node('label','','Child');studentLabel.append(student);
  const term=node('input','admin-input');term.type='text';term.maxLength=9;term.pattern='20[0-9]{2}-20[0-9]{2}';const termLabel=node('label','','School year');termLabel.append(term);
  const filter=node('select','admin-input');filter.setAttribute('aria-label','Assessment filter');for(const [value,label] of [['all','All saved assessments'],['finished','Recorded results'],['followup','Recorded locks & parent flags'],['unverified','Completion unverified']]){const option=node('option','',label);option.value=value;filter.append(option);}
  const search=node('input','admin-input');search.type='search';search.placeholder='Find a course, quiz or test';search.setAttribute('aria-label','Find an assessment');
  const filterLabel=node('label','','Show');filterLabel.append(filter);const searchLabel=node('label','','Search');searchLabel.append(search);
  const controls=node('div','cloud-assessment-controls'),refresh=button('Refresh saved report',()=>void load());controls.append(studentLabel,termLabel,filterLabel,searchLabel,refresh);
  const message=node('p','cloud-note');message.setAttribute('role','status');const coverage=node('div','cloud-assessment-coverage'),rows=node('div','cloud-assessment-rows'),more=button('Show 50 more',()=>{limit+=50;render();});
  const importDetails=node('details','cloud-assessment-import'),importSummary=node('summary','','Accredited students: import parent permissions');
  const link=node('a','btn btn-secondary','Open Abeka Assessment Permissions');link.href=ABEKA_ASSESSMENT_URL;link.target='_top';link.referrerPolicy='no-referrer';
  const exportLink=node('a','btn btn-secondary','Save Abeka assessment summary');exportLink.href=contract.bookmarklet();exportLink.draggable=true;
  const instructions=node('p','cloud-note','One-time setup on a desktop: drag “Save Abeka assessment summary” to your bookmarks bar. In Abeka’s parent account, open Assessment Permissions and select one child, then use that bookmark to download a summary. Return here, choose that same child and school year, and review the file before importing. BodeeGuard cannot read your separate Abeka login automatically.');
  const file=node('input','admin-input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Abeka assessment summary file');
  const preview=node('div','cloud-assessment-preview'),confirm=node('input');confirm.type='checkbox';const confirmation=node('label','cloud-assessment-confirm');confirmation.append(confirm,document.createTextNode('I confirm this summary belongs to the child and school year selected above.'));
  const saveImport=button('Import reviewed summary',()=>void importSummaryFile());saveImport.disabled=true;
  importDetails.append(importSummary,instructions,link,exportLink,file,preview,confirmation,saveImport,node('p','cloud-note','Permissions show listed or in-progress assessments, including future work. Locked permission alone is not an overdue quiz. Disappearing items are never marked complete automatically. No Abeka passwords, answers or permissions are changed.'));
  body.append(intro,children,controls,message,coverage,rows,more,help,importDetails);details.append(open,body);root.append(details);
  let data=null,busy=false,generation=0,active=true,limit=50,pendingImport=null,importId=null,observedKey='';
  const desktop=()=>!window.matchMedia('(max-width: 900px), (pointer: coarse) and (max-width: 1180px)').matches;
  const historyKey=()=>JSON.stringify(getSnapshot()?.abekaAssessments?.children?.find(s=>s.student_id===student.value)||null);
  const states={
    outstanding:'On Abeka’s to-do list · completion unverified',
    'marked-complete':'Checked on Abeka’s to-do list · submission unverified',
    locked:'Abeka reported a locked assessment',
    'in-progress':'Abeka reported work in progress',
    submitted:'Abeka recorded a submission · grade pending',
    graded:'Abeka recorded a grade',
    listed:'Listed in parent permissions · completion unverified',
    'needs-review':'Saved reports disagree',
    'parent-complete':'Parent confirmed complete',
    'needs-work':'Parent flagged for more work'
  };
  const recordedResult=state=>['submitted','graded','parent-complete'].includes(state);
  const followUp=state=>['locked','needs-work'].includes(state);
  const listDate=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
  async function request(action,input){const r=await fetch(action==='abeka-assessments-import'?endpoint.replace(/bridge\/?$/,'assessment-import/'):endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});const value=await r.json();if(!r.ok)throw Error(value.error||'Assessment review is unavailable. Try Refresh.');return value;}
  function freeze(){student.disabled=term.disabled=refresh.disabled=busy;for(const child of children.children){child.disabled=busy;child.setAttribute('aria-pressed',String(child.dataset.studentId===student.value));}saveImport.disabled=busy||!pendingImport||!confirm.checked;rows.setAttribute('aria-busy',String(busy));}
  function clearImport(){pendingImport=null;importId=null;confirm.checked=false;file.value='';preview.replaceChildren();freeze();}
  function render(){
    rows.replaceChildren();coverage.replaceChildren();if(!data){more.hidden=true;return;}
    for(const year of data.terms||[])if(year.term!==data.term)coverage.append(button(`View saved report for ${year.term}`,()=>{term.value=year.term;generation++;data=null;clearImport();render();void load();}));
    const childName=student.selectedOptions[0]?.textContent||'this child';
    if(!data.entries.length&&!data.sources.length){const empty=node('div','cloud-assessment-empty');empty.append(node('h3','',`No assessment report from ${childName} yet`),node('p','cloud-note','Reports arrive automatically after Abeka’s student dashboard is checked in the Windows app. Open Grades & To-Do there, then refresh this saved report.'));rows.append(empty);more.hidden=true;return;}
    if(!data.sources.some(s=>s.source==='student-dashboard'))coverage.append(node('p','cloud-assessment-warning','No student-dashboard check received. Any imported permissions below are only a partial view. Open Grades & To-Do in the child’s Abeka session to check automatically.'));
    for(const source of data.sources){
      const name=source.source==='permissions'?'Parent permissions':'Student dashboard';
      const lastGood=source.last_good?new Date(source.last_good).toLocaleString():null;
      const failed=!source.recognized;
      const state=source.capture_state==='unavailable'?'unavailable':'layout not recognized';
      const coverageLine=failed
        ? [name+' check '+state+(source.last_seen?' on '+new Date(source.last_seen).toLocaleString():''),lastGood?'Last successful check on '+lastGood:'No successful check recorded'].join('. ')
        : name+(lastGood?' last checked on '+lastGood:' · check time unavailable');
      const year=source.term&&source.term!==data.term?' · School year '+source.term:'';
      coverage.append(node('p',failed?'cloud-assessment-warning':'cloud-note',coverageLine+year));
    }
    const query=search.value.toLowerCase(),selected=data.entries.filter(e=>{
      if(query&&!`${e.course} ${e.title}`.toLowerCase().includes(query))return false;
      if(filter.value==='followup')return followUp(e.state);
      if(filter.value==='finished')return recordedResult(e.state);
      if(filter.value==='unverified')return !recordedResult(e.state);
      return true;
    });
    selected.sort((a,b)=>b.lastSeen.localeCompare(a.lastSeen)||a.course.localeCompare(b.course)||a.title.localeCompare(b.title));
    for(const entry of selected.slice(0,limit)){
      const article=node('article','cloud-assessment-row'),title=node('h3','',entry.title);article.append(node('p','cloud-note',entry.course),title,node('strong',entry.state==='needs-work'?'cloud-assessment-warning':'',states[entry.state]||'Unknown'));
      const date=entry.facts.todo?.dueDate;
      if(date)article.append(node('p','cloud-note','Abeka to-do list date: '+listDate.format(new Date(date+'T00:00:00Z'))));
      if(entry.facts.grades?.grade)article.append(node('p','','Grade: '+entry.facts.grades.grade));
      if(entry.facts.permissions?.permission)article.append(node('p','cloud-note','Parent permission: '+entry.facts.permissions.permission));
      article.append(node('p','cloud-note','Record last updated: '+new Date(entry.lastSeen).toLocaleString()));
      if(entry.facts.permissions)article.append(node('p','cloud-note','Includes a parent-imported permissions list. A missing item does not establish completion.'));
      const actions=node('div','cloud-actions');for(const [decision,label] of [['parent-complete','Parent: confirm completed'],['needs-work','Parent: needs more work']]){
        const action=button(label,()=>void review(entry,decision));action.disabled=busy;actions.append(action);
      }article.append(actions);rows.append(article);
    }
    if(!selected.length)rows.append(node('p','cloud-assessment-empty',data.entries.length?'No recorded assessments match this filter. Try All saved assessments.':`No assessments recorded for ${data.term}. See the check coverage above; an empty list does not prove the work is complete.`));
    more.hidden=selected.length<=limit;
  }
  async function load(){if(busy||!student.value||!active||root.hidden||!details.open||!desktop())return;const version=++generation,child=student.value,schoolYear=term.value,key=historyKey();observedKey=key;busy=true;freeze();message.textContent='Loading saved assessment report…';
    try{contract.term(schoolYear);const result=await request('abeka-assessments-list',{studentId:child,term:schoolYear});if(version!==generation||child!==student.value||schoolYear!==term.value||!active||!details.open)return;data=result;limit=50;message.textContent='';render();}
    catch(e){if(version===generation)message.textContent=e.message;}finally{busy=false;freeze();render();if(active&&!root.hidden&&details.open&&desktop()&&(version!==generation||key!==historyKey()))void load();}
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
  filter.onchange=search.oninput=()=>{limit=50;render();};details.ontoggle=()=>{affordance.textContent=details.open?'Hide details':'View details';if(details.open)void load();else generation++;};
  function update(isActive=active){const wasActive=active;active=isActive;if(!active)generation++;const snapshot=getSnapshot();root.hidden=!familyUsesAbeka(snapshot);if(root.hidden)return;
    const current=student.value,roster=(snapshot.students||[]).filter(s=>!s.archived_at);
    if(!busy&&JSON.stringify([...student.options].map(o=>o.value))!==JSON.stringify(roster.map(s=>s.id))){student.replaceChildren(...roster.map(s=>{const o=node('option','',s.name);o.value=s.id;return o;}));if(roster.some(s=>s.id===current))student.value=current;else{generation++;data=null;clearImport();render();}}
    const overview=snapshot.abekaAssessments,counts=overview?.children||[];
    const saved=row=>Boolean(row?.last_good||row?.updated_at);
    const received=counts.some(saved);
    summary.textContent=overview?.available===false?'Saved reports are temporarily unavailable.':'View saved to-do lists, submissions and grades by child.';
    badge.textContent=overview?.available===false?'Unavailable':received?'Saved reports':'No reports yet';
    children.replaceChildren(...roster.map(s=>{
      const row=counts.find(r=>r.student_id===s.id);
      const status=row?.recognized===false?'Last check unavailable':saved(row)?'Saved report':'No report yet';
      const b=button(s.name+' · '+status,()=>{student.value=s.id;term.value=row?.term||overview?.term||term.value;generation++;data=null;clearImport();render();details.open=true;void load();});
      b.dataset.studentId=s.id;return b;
    }));
    if(!term.value)term.value=counts.find(r=>r.student_id===student.value)?.term||overview?.term||(()=>{const d=new Date(),y=d.getFullYear()-(d.getMonth()<7?1:0);return y+'-'+(y+1);})();freeze();
    // Existing dashboard pushes refresh an open report only when its saved
    // evidence changes. A closed accordion and mobile add no history requests.
    const key=historyKey(),changed=observedKey!==key;observedKey=key;if(active&&details.open&&(changed||!wasActive))void load();
  }
  return {update};
}
