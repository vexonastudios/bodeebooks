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
    if(fresh) { panel=node('details','cloud-panel'); panel.id='family-school-setup'; document.getElementById('students-list').before(panel); }
    const unfinished=children.filter(s=>!s.main_school).length;
    if(fresh) panel.open=!children.length || unfinished>0;
    const summary=node('summary','',unfinished ? `Set up school · ${unfinished} ${unfinished===1?'child':'children'} to finish` : 'Your children’s schools');
    panel.replaceChildren(summary);
    if(!children.length) panel.append(node('p','','Add a child, then choose their main school.'),button('Add child',()=>document.getElementById('add-student-btn').click()));
    for(const student of children) {
      const label=providers.find(p=>p.value===student.main_school?.provider)?.label || 'Choose a main school';
      const row=node('div','cloud-main-school-row');
      const change=button(student.main_school?'Change school':'Choose school',()=>edit(student)); change.dataset.cloudMutation='true';
      row.append(node('strong','',student.name),node('span','',label),change); panel.append(row);
    }
  }
  return {edit,render};
}
