export function node(tag, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
const icons = {
  'Your children':'users', School:'school', 'Calendar & school hours':'calendar-days', 'On-time rewards & late coins':'coins', 'Daily activities':'sun', 'Learning tools':'blocks', 'Starter content':'library', 'Parent controls':'shield-check', Ready:'circle-check',
  'Daily Verse':'book-open', 'Brain Teaser':'lightbulb', Music:'music', Videos:'video', 'Typing School':'keyboard', 'Logic Lab':'brain', 'Confused Words':'spell-check', Geography:'globe',
  Spelling:'spell-check', 'Science Spelling':'flask-conical', Vocabulary:'book-a', 'Poem Memorization':'book-open-text', Poems:'book-open-text', Quizzes:'list-checks',
  'Reading Log':'book-open', Notebook:'notebook-pen', Spanish:'languages', Piano:'piano', 'Art Studio':'palette', Artwork:'palette', Worksheets:'printer',
  'Learning Videos':'clapperboard', 'Math Coach':'sigma', 'Coloring Studio':'palette', Messages:'message-circle', Screenshots:'camera', Rewards:'coins', 'AI limits':'sigma', 'Image generation':'image-plus',
  'Family defaults':'users', 'Child setup':'user-round-cog', 'Your choices':'list-checks', 'No online school':'book-open', 'Abeka Academy':'school', 'Bob Jones / BJU Press':'school'
};
function iconFor(text) {
  return icons[text] || (/^Back/.test(text) ? 'arrow-left' : /^(Save and next|Next)/.test(text) ? 'arrow-right' : /^Finish/.test(text) ? 'circle-check' : /^Save/.test(text) ? 'save' : /download/i.test(text) ? 'download' : /password/i.test(text) ? 'key-round' : /^(Add|Enter)/.test(text) ? 'plus' : /^(Close|Skip)/.test(text) ? 'x' : /preview|View page/i.test(text) ? 'eye' : /school/i.test(text) ? 'school' : /child|children|’s setup/i.test(text) ? 'user-round' : 'settings-2');
}
export function decorateSetup(root) {
  for (const element of root.querySelectorAll('h2,h3,button,a,summary,.setup-choice strong,.setup-child-activity strong,.setup-child>strong,.setup-tour-row>strong')) {
    if (element.querySelector('svg,i[data-lucide]')) continue;
    const icon = node('i', '', 'setup-icon'); icon.setAttribute('aria-hidden', 'true'); icon.dataset.lucide = iconFor(element.textContent.trim()); element.prepend(icon);
  }
  window.lucide?.createIcons();
}
export function setupField(title, name, value = '', type = 'text') {
  const label = node('label', '', 'setup-field'), input = node('input'); input.name = name; input.type = type; input.value = value;
  label.append(node('span', title), input); return { label, input };
}
export function lockControls(root) {
  const controls=[...root.querySelectorAll('button,input,select')].map(element=>[element,element.disabled]);
  controls.forEach(([element])=>{element.disabled=true;});
  return ()=>controls.forEach(([element,disabled])=>{element.disabled=disabled;});
}
export function inlineChildren({ host, getSnapshot, mutate, onError }) {
  const list = node('div'), editor = node('div', '', 'setup-inline-fields');
  const name = setupField('Child’s name', 'childName'), grade = setupField('Grade (optional)', 'childGrade');
  name.input.maxLength = 80; grade.input.maxLength = 30;
  const add = node('button', 'Add child', 'btn btn-primary'); add.type = 'button';
  let pending = null;
  const renderList = () => { list.replaceChildren(); for (const child of getSnapshot().students.filter(s => !s.archived_at)) list.append(node('p', `${child.name}${child.grade ? ` · Grade ${child.grade}` : ''}`, 'setup-child')); };
  function save() {
    if (pending) return pending;
    if (!name.input.value.trim() && !grade.input.value.trim()) return Promise.resolve();
    name.input.required = true;
    if (!name.input.reportValidity()) return Promise.reject(Error('Enter your child’s name.'));
    add.disabled = true; name.input.disabled=true; grade.input.disabled=true;
    pending = (async () => {
      await mutate('add-student', { name: name.input.value.trim(), grade: grade.input.value.trim() });
      name.input.value = ''; grade.input.value = ''; name.input.required = false; renderList();
    })().finally(() => { pending = null; add.disabled = false; name.input.disabled=false; grade.input.disabled=false; });
    return pending;
  }
  add.onclick = () => { if (!name.input.value.trim()) { name.input.required = true; name.input.reportValidity(); return; } void save().catch(onError); };
  editor.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); add.click(); } });
  editor.append(name.label, grade.label, add); renderList(); host.append(list, editor); return save;
}
export function inlineSchool({ host, student, getSnapshot, mutate, onError }) {
  const section = node('section', '', 'setup-child setup-school-form'); section.append(node('h3', student.name));
  const providerLabel = node('label', '', 'setup-field'), select = node('select'); select.name = `school-${student.id}`;
  for (const [value, title] of [['','Choose a school'],['abeka','Abeka Academy'],['bju','Bob Jones / BJU Press'],['custom','Another school website'],['none','No online school']]) { const option=node('option',title); option.value=value; select.append(option); }
  select.value = student.main_school?.provider || ''; providerLabel.append(node('span', 'Main school'), select);
  const linked = getSnapshot().rules?.subjects?.find(row => row.id === student.main_school?.subjectId);
  const defaults = { abeka:'https://academy.abeka.com/', bju:'https://homeschoolhub.com/auth' };
  const title = setupField('School name', 'schoolTitle', linked?.title || ''), url = setupField('School website', 'schoolUrl', linked?.url || defaults[select.value] || '', 'url');
  url.input.maxLength = 2048; title.input.maxLength = 120;
  const saveButton = node('button', 'Save school', 'btn btn-secondary'); saveButton.type='button';
  const status = node('span', '', 'setup-inline-status'); status.setAttribute('role','status');
  let dirty = false, pending = null;
  function update(reset = false) {
    const online = !!select.value && select.value !== 'none';
    title.label.hidden = select.value !== 'custom'; title.input.disabled = title.label.hidden;
    url.label.hidden = !online; url.input.disabled = !online; url.input.required = online;
    if (reset) url.input.value = defaults[select.value] || '';
  }
  select.onchange = () => { dirty=true; status.textContent=''; update(true); };
  section.addEventListener('input', () => { dirty=true; status.textContent=''; });
  function save() {
    if (pending) return pending;
    if (!dirty) return Promise.resolve();
    if (!select.value) return Promise.reject(Error(`Choose ${student.name}’s school, or No online school.`));
    if (!url.input.reportValidity()) return Promise.reject(Error('Enter the school website.'));
    const change={ studentId:student.id, revision:getSnapshot().rules.revision, provider:select.value, title:title.input.disabled?null:title.input.value, url:url.input.disabled?null:url.input.value };
    saveButton.disabled=true; select.disabled=true; title.input.disabled=true; url.input.disabled=true;
    pending=(async()=>{
      await mutate('setup-school', change);
      dirty=false; status.textContent='Saved';
    })().finally(()=>{pending=null; saveButton.disabled=false; select.disabled=false; update();});
    return pending;
  }
  saveButton.onclick=()=>void save().catch(onError); update(); section.append(providerLabel,title.label,url.label,saveButton,status); host.append(section); return save;
}
// Reuse working dashboard controls in a guide substep; keep the guide and its
// exact DOM (including drafts and scroll position) mounted for the return.
export function setupSections({ dialog, body, footer, navigate }) {
  let restore = null;
  dialog.addEventListener('cancel', event => { if (restore) { event.preventDefault(); event.stopImmediatePropagation(); restore(); } }, true);
  return { active: () => !!restore, open(tab, callback) {
    if (restore) return;
    const panel=document.getElementById(`tab-${tab}`); if(!panel)throw Error('This setup section is unavailable.');
    const previousTab=document.querySelector('.nav-item[aria-current="page"]')?.dataset.tab || 'overview';
    const placeholder=document.createComment('setup section location'); panel.before(placeholder);
    const saved=document.createDocumentFragment(),scroll=body.scrollTop; while(body.firstChild)saved.append(body.firstChild);
    const controls=node('footer','','setup-subfooter'),back=node('button','Back to setup','btn btn-primary'); back.type='button'; controls.append(back);
    footer.hidden=true; footer.after(controls); dialog.classList.add('setup-section-open'); dialog.dataset.setupSection=tab;
    restore=()=>{
      placeholder.replaceWith(panel); body.replaceChildren(saved); controls.remove(); footer.hidden=false; dialog.classList.remove('setup-section-open'); delete dialog.dataset.setupSection; restore=null;
      navigate(previousTab); body.scrollTop=scroll; footer.querySelector('button:not(:disabled)')?.focus();
    };
    back.onclick=restore;
    try { navigate(tab); panel.classList.add('setup-embedded-panel'); body.append(panel); body.scrollTop=0; callback?.(); decorateSetup(controls); }
    catch(error) { restore(); throw error; }
    const oldRestore=restore; restore=()=>{ panel.classList.remove('setup-embedded-panel'); oldRestore(); }; back.onclick=restore;
  } };
}
