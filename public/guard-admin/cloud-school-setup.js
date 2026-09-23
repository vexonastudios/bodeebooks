import { profileIcon } from './cloud-student-profile.js?v=20260910-photos1';
const providers = [
  {value:'',label:'Choose an option'}, {value:'abeka',label:'Abeka Academy'},
  {value:'bju',label:'Bob Jones / BJU Press'}, {value:'custom',label:'Another school website'},
  {value:'none',label:'No online school'}
];
const defaults = {abeka:'https://academy.abeka.com/',bju:'https://homeschoolhub.com/auth'};
export function studentSchoolSites(snapshot, studentId) {
  return snapshot.rules.subjects.filter(s => s.isSchoolPortal && (!Array.isArray(s.assignments)
    || s.assignments.some(a => a.studentId === studentId && a.active !== false)));
}
export function setupMainSchool({getSnapshot,editor,field,selectField,node,button,mutate}) {
  function edit(student, linked = null) {
    const snapshot=structuredClone(getSnapshot()), empty=!studentSchoolSites(snapshot,student.id).length;
    const initial=linked?.portalProvider || '';
    const provider=selectField('School provider','provider',providers.filter(p=>empty&&!linked || p.value!=='none'),initial);
    const name=field('Name on the dashboard','title',linked?.title || '');
    name.querySelector('input').placeholder='For example, Math or BJU lessons';
    const website=field('School website','url',linked?.url || defaults[initial] || '',{type:'url',maxLength:2048});
    const select=provider.querySelector('select'); select.required=true;
    function update(reset=false) {
      const value=select.value, online=value && value!=='none';
      website.hidden=!online; website.querySelector('input').disabled=!online; website.querySelector('input').required=!!online;
      name.hidden=!online; name.querySelector('input').disabled=!online;
      if(reset) {
        website.querySelector('input').value=defaults[value] || '';
        name.querySelector('input').value=value==='custom' ? '' : providers.find(p=>p.value===value)?.label || '';
      }
    }
    select.addEventListener('change',()=>update(true)); update();
    editor(`${linked?'Edit':'Add'} school website for ${student.name}`,[provider,name,website,
      node('p','cloud-note',linked?'Changes apply only to this child. Their Daily Plan choices are kept.':'This adds a separate school card for this child. New sites are required Mon–Fri; weekends are optional. Change required days or make a site optional in Daily Plan.'),
      node('p','cloud-note','School completion uses supported provider results or your parent review. Adding a website does not automatically verify its lessons.')],
      form=>mutate('setup-school',{studentId:student.id,revision:snapshot.rules.revision,
        operation:form.get('provider')==='none'?'primary':linked?'edit':'add',subjectId:linked?.id,
        provider:form.get('provider'),title:form.get('title'),url:form.get('url')}));
  }
  function remove(student, site) {
    const revision=getSnapshot().rules.revision;
    editor(`Remove ${site.title} for ${student.name}?`,[
      node('p','cloud-note','Save to remove this website from this child’s dashboard and required schoolwork. Saved work and other children’s school websites are kept. You can allow the site again in Daily Plan.')
    ],()=>mutate('setup-school',{operation:'remove',studentId:student.id,subjectId:site.id,revision}));
  }
  function render() {
    const snapshot=getSnapshot(), children=snapshot.students.filter(s=>!s.archived_at);
    let panel=document.getElementById('family-school-setup');
    const fresh=!panel;
    if(fresh) { panel=node('details','cloud-panel'); panel.id='family-school-setup'; (document.querySelector('.cloud-students-section-heading') || document.getElementById('students-list')).before(panel); }
    const unfinished=children.filter(s=>!s.main_school&&!studentSchoolSites(snapshot,s.id).length).length;
    if(fresh) panel.open=!children.length || unfinished>0;
    const summary=node('summary','cloud-schools-heading'),heading=node('span','cloud-schools-title','Your children’s schools');
    heading.prepend(profileIcon('graduation-cap'));
    const badge=node('span','cloud-schools-count',unfinished ? `${unfinished} to set up` : `${children.length} ${children.length===1?'child':'children'}`); badge.dataset.pending=String(unfinished>0);
    const chevron=profileIcon('chevron-down');chevron.classList.add('cloud-schools-chevron');summary.append(heading,badge,chevron);
    const content=node('div','cloud-schools-body'),grid=node('div','cloud-schools-grid');
    content.append(node('p','cloud-schools-description','Add every website each child uses for school—for example, BJU for lessons and another site for math. Each gets its own dashboard card and Daily Plan settings.'),grid);
    panel.replaceChildren(summary,content);
    if(!children.length) { const add=button('Add child',()=>document.getElementById('add-student-btn').click()); add.prepend(profileIcon('user-round-plus')); content.append(node('p','cloud-school-empty','Add your first child to choose their school.'),add); }
    for(const student of children) {
      const sites=studentSchoolSites(snapshot,student.id);
      const row=node('article','cloud-main-school-row');row.dataset.studentId=student.id;row.dataset.pending=String(!student.main_school&&!sites.length);
      const identity=node('div','cloud-school-child');identity.append(profileIcon('user-round'),node('strong','',student.name));
      identity.append(node('span','cloud-school-site-count',`${sites.length} ${sites.length===1?'website':'websites'}`));
      const list=node('ul','cloud-school-sites');list.setAttribute('aria-label',`${student.name}’s school websites`);
      for (const site of sites) {
        const item=node('li','cloud-school-site');item.dataset.subjectId=site.id;
        const choice=node('div','cloud-school-choice'),symbol=node('span','cloud-school-symbol');symbol.append(profileIcon('school'));
        const info=node('div','cloud-school-info');
        let host;try{host=new URL(site.url).hostname;}catch{host='School website';}
        info.append(node('strong','',site.title),node('span','cloud-school-host',host));choice.append(symbol,info);
        if(site.active===false) info.append(node('span','cloud-school-label','Not allowed · see Daily Plan'));
        const actions=node('div','cloud-school-site-actions');
        for(const [label,icon,callback] of [['Edit','pencil',()=>edit(student,site)],['Remove','minus',()=>remove(student,site)]]) {
          const action=button(label,callback);action.dataset.cloudMutation='true';action.prepend(profileIcon(icon));
          action.setAttribute('aria-label',`${label} ${site.title} for ${student.name}`);actions.append(action);
        }
        item.append(choice,actions);list.append(item);
      }
      if(!sites.length) row.append(identity,node('p','cloud-school-empty',student.main_school?.provider==='none'?'No online school websites. Add one whenever you need it.':'No school websites added yet.'));
      else row.append(identity,list);
      const add=button('Add school website',()=>edit(student));add.dataset.cloudMutation='true';add.classList.add('cloud-school-change');add.prepend(profileIcon('plus'));add.setAttribute('aria-label',`Add school website for ${student.name}`);
      row.append(add);grid.append(row);
    }
    window.lucide?.createIcons();
  }
  function open(studentId) {
    render();
    const panel=document.getElementById('family-school-setup');
    panel.open=true;
    panel.scrollIntoView({block:'start'});
    const row=Array.from(panel.querySelectorAll('.cloud-main-school-row')).find(el=>el.dataset.studentId===studentId);
    if(row) { row.scrollIntoView({block:'center'});row.querySelector('.cloud-school-change').focus({preventScroll:true}); }
    else panel.querySelector('summary').focus();
  }
  return {edit,render,open};
}
