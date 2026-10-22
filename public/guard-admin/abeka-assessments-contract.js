'use strict';
/* global document, alert, location */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BodeeAbekaAssessments=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const sources=['todo','grades','permissions'];
  const statuses=['outstanding','marked-complete','locked','in-progress','submitted','graded','listed'];
  function text(value,max=160){if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f<>]/.test(value))throw Error('Invalid assessment text.');return value.normalize('NFKC').replace(/\s+/g,' ').trim();}
  function term(value){if(!/^20\d{2}-20\d{2}$/.test(value)||Number(value.slice(5))!==Number(value.slice(0,4))+1)throw Error('Choose a school year such as 2026-2027.');return value;}
  function normalize(input){
    if(!input||input.version!==1||!['student-dashboard','permissions'].includes(input.source)||typeof input.recognized!=='boolean'||!Array.isArray(input.records)||input.records.length>500||!Array.isArray(input.sections)||input.sections.length>3)throw Error('A supported Abeka assessment summary is required.');
    const sections=[...new Set(input.sections)];if(sections.some(s=>!sources.includes(s))||input.source==='permissions'&&sections.some(s=>s!=='permissions')||input.source==='student-dashboard'&&sections.includes('permissions'))throw Error('Invalid assessment source.');
    const year=input.recognized?term(input.term):null;
    if(input.recognized&&!sections.length||!input.recognized&&input.records.length)throw Error('Assessment coverage is not recognized.');
    const records=input.records.map(row=>{
      if(!row||Object.keys(row).some(k=>!['course','title','source','status','dueDate','grade','permission'].includes(k)))throw Error('Unsupported assessment fields.');
      const course=text(row.course,120),title=text(row.title,180);if(!course||!title||!sections.includes(row.source)||!statuses.includes(row.status)||!(/\b(?:quiz|test|exam)\b/i.test(title)))throw Error('Invalid assessment entry.');
      if(row.source==='grades'&&!['graded','submitted'].includes(row.status)||row.source==='permissions'&&!['listed','in-progress'].includes(row.status)||row.source==='todo'&&!['outstanding','marked-complete','locked','in-progress'].includes(row.status))throw Error('Invalid assessment evidence.');
      const result={course,title,source:row.source,status:row.status};
      if(row.dueDate){if(!/^20\d{2}-\d{2}-\d{2}$/.test(row.dueDate)||new Date(row.dueDate).toISOString().slice(0,10)!==row.dueDate)throw Error('Invalid assessment date.');result.dueDate=row.dueDate;}
      if(row.grade){result.grade=text(row.grade,32);if(row.source!=='grades'||!/^(?:Grade Pending|(?:100|\d{1,2})(?:\.\d{1,2})?\s*%\s*[A-F]?[+-]?)$/i.test(result.grade))throw Error('Invalid assessment grade.');}
      if(row.permission){if(row.source!=='permissions'||!['locked','unlocked'].includes(row.permission))throw Error('Invalid assessment permission.');result.permission=row.permission;}
      return result;
    });
    if(input.reason&&!['unavailable','unsupported'].includes(input.reason))throw Error('Invalid coverage state.');
    return {version:1,source:input.source,recognized:input.recognized,term:year,sections,records,...(!input.recognized?{reason:input.reason||'unsupported'}:{})};
  }
  function key(row){return [row.course,row.title].map(v=>v.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()).join('|');}
  function reviewBasis(entry){return Object.fromEntries(sources.filter(s=>entry.facts?.[s]).map(s=>[s,JSON.stringify([entry.facts[s].status,entry.facts[s].grade||''])]));}
  function state(entry){
    const f=entry.facts||{},todo=f.todo,grade=f.grades,permission=f.permissions,parent=f.parent;
    const latest=Math.max(0,...Object.values(f).filter(Boolean).map(v=>Date.parse(v.at)||0));
    if(parent?.status==='needs-work')return 'needs-work';
    if(parent&&Date.parse(parent.at)>=latest)return parent.status;
    if(parent?.status==='parent-complete'){
      const basis=reviewBasis(entry),changed=['todo','permissions'].some(s=>f[s]&&Date.parse(f[s].at)>Date.parse(parent.at)&&(s==='todo'||f[s].status==='in-progress')&&basis[s]!==parent.basis?.[s]);
      if(changed)return 'needs-review';
      return grade&&Date.parse(grade.at)>Date.parse(parent.at)?grade.status:'parent-complete';
    }
    const blocked=[todo,permission].filter(v=>v&&['locked','in-progress'].includes(v.status));
    if(grade){if(blocked.some(v=>Date.parse(v.at)>=Date.parse(grade.at)))return 'needs-review';return grade.status;}
    if(todo?.status==='locked')return 'locked';
    if(blocked.length)return 'in-progress';
    if(todo)return todo.status;
    return 'listed';
  }
  function merge(entries,records,at){
    const result=JSON.parse(JSON.stringify(entries||{}));
    for(const row of records){const id=key(row),entry=result[id]||{course:row.course,title:row.title,firstSeen:at,facts:{}};
      if(entry.facts[row.source]&&Date.parse(entry.facts[row.source].at)>Date.parse(at))continue;
      entry.facts[row.source]={...row,at};entry.lastSeen=Object.values(entry.facts).map(v=>v.at).sort().at(-1);entry.state=state(entry);result[id]=entry;
    }
    if(Object.keys(result).length>1500||JSON.stringify(result).length>1500000)throw Error('Assessment history needs parent review before more entries can be saved.');
    return result;
  }
  function needsAttention(value){return ['outstanding','marked-complete','locked','in-progress','needs-review','needs-work'].includes(value);}
  // Serialized read-only reader: no form values, answers, cookies, tokens or requests.
  function readDocument(doc){
    const clean=v=>String(v||'').replace(/\s+/g,' ').trim(),records=[],sections=[];
    const headings=[...doc.querySelectorAll('h1,h2,h3,h4')];
    const result={version:1,source:'student-dashboard',recognized:false,term:null,sections,records};
    const end=clean((doc.body||doc).textContent).match(/Grade\s+\d+\s*[-–]\s*Ending on\s+\d{1,2}\/\d{1,2}\/(20\d{2})/i);
    if(end)result.term=(Number(end[1])-1)+'-'+end[1];
    const assessment=/\b(?:quiz|test|exam)\b/i;
    const split=label=>{const m=label.match(/^(.+?)\s+[-–]\s+(.+)$/);return m&&assessment.test(m[2])?{course:clean(m[1]),title:clean(m[2])}:null;};
    const permissionHeading=headings.find(h=>clean(h.textContent)==='Assessment Permissions');
    if(permissionHeading){
      result.source='permissions';sections.push('permissions');
      const items=[...doc.querySelectorAll('.assessmentItem')];if(items.length>500)return {...result,sections:[],records:[]};
      for(const li of items){const a=li.querySelector('a.AssessmentLocked,a.AssessmentUnlocked'),panel=li.closest('.ui-accordion-content'),header=panel?.previousElementSibling;
        if(!a||!header?.classList.contains('assessmentClass'))continue;
        const title=clean(a.textContent),course=clean(header.textContent);if(!assessment.test(title)||!course)continue;
        records.push({course,title,source:'permissions',status:/\(In Progress\)/i.test(li.textContent)?'in-progress':'listed',permission:a.classList.contains('AssessmentUnlocked')?'unlocked':'locked'});
      }
      result.recognized=!!items.length&&records.length===items.length;return result;
    }
    function panel(label){const heading=headings.find(h=>label.test(clean(h.textContent)));if(!heading)return null;let p=heading.parentElement;for(let i=0;p&&i<5;i++,p=p.parentElement){if(p.querySelector('.checklistContainer,table,.alert-info')&&!([...p.querySelectorAll('h1,h2,h3,h4')].some(h=>/My Recent Grades|My To[–-]Do List/i.test(clean(h.textContent))&&!label.test(clean(h.textContent)))))return p;}return null;}
    const todo=panel(/My To[–-]Do List/),grades=panel(/^My Recent Grades/);
    if(todo){
      sections.push('todo');
      for(const h of todo.querySelectorAll('h3,h4')){const course=clean(h.textContent);let list=h.nextElementSibling;
        if(!list?.matches('.checklistContainer'))continue;const rows=[...list.querySelectorAll('.dailyLesson')];
        for(const li of rows){let label=clean(li.querySelector('[id="lblAssignment"]')?.textContent);if(!assessment.test(label)||/^Lesson\s+\d/i.test(label))continue;
          const date=clean(li.querySelector('.taskDate')?.textContent).match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+([A-Z][a-z]{2})\s+(\d{1,2})/);let dueDate;
          if(date&&result.term){const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],m=months.indexOf(date[1]);if(m>=0){const y=Number(result.term.slice(0,4))+(m<7?1:0);dueDate=y+'-'+String(m+1).padStart(2,'0')+'-'+date[2].padStart(2,'0');}}
          const checked=li.querySelector('input[type="checkbox"]')?.checked===true||!!li.querySelector('.fa-check-square-o,.fa-check-square,.fa-square-check');
          records.push({course,title:label.replace(/\s*\(Lesson\s+\d+\)\s*$/i,''),source:'todo',status:checked?'marked-complete':'outstanding',...(dueDate?{dueDate}:{})});
        }
      }
      const warning=clean(todo.textContent),re=/You opened\s+(.+?)\s+but (?:didn't|did not) submit it[\s\S]*?now locked\./gi;let match;
      while((match=re.exec(warning))){const m=match[1].match(/^(.*?)\s+((?:(?:Vocabulary\/Spelling|Reading|Content|Literature|Grammar)\s+)?(?:Quiz|Test|Exam)\s+.+)$/i);if(m){
        const original=clean(m[1]),base=s=>s.toLowerCase().replace(/\s*\d{1,2}$/,'').replace(/[^a-z]/g,''),grade=s=>s.match(/\d{1,2}$/)?.[0];
        const candidates=[...todo.querySelectorAll('h3.myEventsSubhead')].map(h=>clean(h.textContent)).filter(name=>base(name)===base(original)&&(!grade(original)||!grade(name)||grade(original)===grade(name)));
        records.push({course:candidates.length===1?candidates[0]:original,title:clean(m[2]),source:'todo',status:'locked'});
      }}
    }
    if(grades){const table=[...grades.querySelectorAll('table')].find(t=>{const cells=t.querySelector('tr')?.children;return cells?.length===2&&clean(cells[0].textContent)==='Assignment'&&clean(cells[1].textContent)==='Grade';});if(table){sections.push('grades');for(const tr of table.querySelectorAll('tr')){const cells=tr.querySelectorAll('td');if(cells.length!==2)continue;const row=split(clean(cells[0].textContent)),grade=clean(cells[1].textContent);if(row&&/^(?:Grade Pending|(?:100|\d{1,2})(?:\.\d{1,2})?\s*%\s*[A-F]?[+-]?)$/i.test(grade))records.push({...row,source:'grades',status:/Grade Pending/i.test(grade)?'submitted':'graded',grade});}}}
    result.recognized=!!result.term&&!!sections.length&&records.length<=500;return result.recognized?result:{...result,records:[]};
  }
  function bookmarklet(){return 'javascript:('+function(reader){if(location.protocol!=='https:'||location.hostname!=='athome.abeka.com'||location.pathname!=='/Account/Students/AssessmentPermissions.aspx'){alert('Open Abeka Assessment Permissions with a student selected, then try again.');return;}const data=reader(document);if(data.source!=='permissions'||!data.recognized){alert('The assessment layout was not recognized. Nothing was exported.');return;}const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='abeka-assessment-summary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}.toString()+')('+readDocument.toString()+');';}
  return {normalize,term,key,state,merge,needsAttention,reviewBasis,readDocument,bookmarklet};
});
