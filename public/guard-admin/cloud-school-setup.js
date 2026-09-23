import { profileIcon } from './cloud-student-profile.js?v=20260910-photos1';
const providers = [
  {value:'',label:'Choose an option'}, {value:'abeka',label:'Abeka Academy'},
  {value:'bju',label:'Bob Jones / BJU Press'}, {value:'custom',label:'Another school website'},
  {value:'none',label:'No online school'}
];
const defaults = {abeka:'https://academy.abeka.com/',bju:'https://homeschoolhub.com/auth'};
export function setupMainSchool({getSnapshot,editor,field,selectField,node,button,mutate}) {
  function edit(student) {
    const snapshot=structuredClone(getSnapshot()), linked=snapshot.rules.subjects.find(s=>s.id===student.main_school?.subjectId);
    const initial=student.main_school?.provider || '';
    const provider=selectField('Main school','provider',providers,initial);
    const name=field('School name','title',linked?.title || '');
    const website=field('School website','url',linked?.url || defaults[initial] || '',{type:'url',maxLength:2048});
    const select=provider.querySelector('select'); select.required=true;
    function update(reset=false) {
      const value=select.value, online=value && value!=='none';
      website.hidden=!online; website.querySelector('input').disabled=!online; website.querySelector('input').required=!!online;
      name.hidden=value!=='custom'; name.querySelector('input').disabled=value!=='custom';
      if(reset) website.querySelector('input').value=defaults[value] || '';
    }
    select.addEventListener('change',()=>update(true)); update();
    editor(`${student.name}’s main school`,[provider,name,website,node('p','cloud-note','The school link appears on this child’s dashboard. You can change it later.')],
      form=>mutate('setup-school',{studentId:student.id,revision:snapshot.rules.revision,provider:form.get('provider'),title:form.get('title'),url:form.get('url')}));
  }
  function render() {
    const snapshot=getSnapshot(), children=snapshot.students.filter(s=>!s.archived_at);
    let panel=document.getElementById('family-school-setup');
    const fresh=!panel;
    if(fresh) { panel=node('details','cloud-panel'); panel.id='family-school-setup'; (document.querySelector('.cloud-students-section-heading') || document.getElementById('students-list')).before(panel); }
    const unfinished=children.filter(s=>!s.main_school).length;
    if(fresh) panel.open=!children.length || unfinished>0;
    const summary=node('summary','cloud-schools-heading'),heading=node('span','cloud-schools-title','Your children’s schools');
    heading.prepend(profileIcon('graduation-cap'));
    const badge=node('span','cloud-schools-count',unfinished ? `${unfinished} to set up` : `${children.length} ${children.length===1?'child':'children'}`); badge.dataset.pending=String(unfinished>0);
    const chevron=profileIcon('chevron-down');chevron.classList.add('cloud-schools-chevron');summary.append(heading,badge,chevron);
    const content=node('div','cloud-schools-body'),grid=node('div','cloud-schools-grid');
    content.append(node('p','cloud-schools-description','Choose Abeka, Bob Jones / BJU, or another school website. Daily Plan controls required work and activity access.'),grid);
    panel.replaceChildren(summary,content);
    if(!children.length) { const add=button('Add child',()=>document.getElementById('add-student-btn').click()); add.prepend(profileIcon('user-round-plus')); content.append(node('p','cloud-school-empty','Add your first child to choose their school.'),add); }
    for(const student of children) {
      const linked=snapshot.rules.subjects.find(s=>s.id===student.main_school?.subjectId);
      const label=student.main_school?.provider==='custom' && linked?.title || providers.find(p=>p.value===student.main_school?.provider)?.label || 'School not chosen';
      const row=node('article','cloud-main-school-row');row.dataset.pending=String(!student.main_school);
      const identity=node('div','cloud-school-child');identity.append(profileIcon('user-round'),node('strong','',student.name));
      const choice=node('div','cloud-school-choice'),symbol=node('span','cloud-school-symbol');symbol.append(profileIcon(student.main_school?.provider==='none'?'book-open':'school'));
      const info=node('div','cloud-school-info');info.append(node('span','cloud-school-label','School website'),node('strong','',label));choice.append(symbol,info);
      const change=button(student.main_school?'Change school':'Choose school',()=>edit(student)); change.dataset.cloudMutation='true';change.classList.add('cloud-school-change');change.prepend(profileIcon(student.main_school?'pencil':'plus'));change.setAttribute('aria-label',`${student.main_school?'Change':'Choose'} school for ${student.name}`);
      row.append(identity,choice,change); grid.append(row);
    }
    window.lucide?.createIcons();
  }
  function open(studentId) {
    render();
    const panel=document.getElementById('family-school-setup');
    panel.open=true;
    panel.scrollIntoView({block:'start'});
    const student=getSnapshot().students.find(s=>s.id===studentId&&!s.archived_at);
    if(student) edit(student);
    else panel.querySelector('summary').focus();
  }
  return {edit,render,open};
}
