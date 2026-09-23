import { inlineChildren, inlineSchool, setupSections, lockControls, decorateSetup } from './cloud-setup-controls.js';
import { familyPlanCards, templateFromCards, applyFamilyPlan, dailyPlanCards } from './cloud-daily-plan-model.js';
import { showPlanPreview } from './cloud-daily-plan.js';
import { familyReadiness, nextSetupStep } from './cloud-parent-readiness.js';
import { activityAccent } from './cloud-activity-colors.js';

const steps = [
  {id:0,title:'Add your children'}, {id:1,title:'Choose their school'},
  {id:4,title:'Choose their activities'}, {id:7,title:'Connect & check readiness'}
];
const node = (tag,text='',cls='') => { const el=document.createElement(tag);el.textContent=text;el.className=cls;return el; };
const button = (text,fn,primary=false) => { const el=node('button',text,`btn ${primary?'btn-primary':'btn-secondary'}`);el.type='button';el.onclick=()=>void fn();return el; };
const link = (text,href) => {const el=node('a',text,'btn btn-secondary');el.href=href;return el;};
export function setupParentStart({endpoint,getSnapshot,mutate,navigate,refresh=async()=>{}}) {
  const style=node('link');style.rel='stylesheet';style.href='/guard-admin/cloud-parent-setup.css';document.head.append(style);
  const dialog=node('dialog','','parent-setup-dialog parent-start-dialog');dialog.setAttribute('aria-labelledby','parent-start-title');
  const frame=node('div','','setup-frame'),header=node('header'),title=node('h2'),progress=node('p','','setup-progress');title.id='parent-start-title';
  const body=node('div','','setup-body'),error=node('p','','setup-error'),footer=node('footer');error.setAttribute('role','alert');
  const later=button('Save and close',()=>save(true)),back=button('Back',()=>move(-1)),next=button('Continue',()=>move(1),true);
  header.append(progress,title);footer.append(later,back,next);frame.append(header,body,error,footer);dialog.append(frame);document.body.append(dialog);
  const sections=setupSections({dialog,body,footer,navigate,onReturn:()=>{draft=null;render();}});
  let state=null,index=0,busy=false,started=false,previousFocus=null,pending=[],draft=null,reviewing=false;
  const children=()=>getSnapshot()?.students.filter(child=>!child.archived_at)||[];
  const launch=button('Family setup',()=>open(),true);launch.id='parent-start-guide';
  (document.querySelector('#overview-actions')||document.querySelector('#tab-overview .tab-header'))?.append(launch);
  const settingsLaunch=button('Family setup',()=>open());document.querySelector('#tab-settings .tab-header')?.append(settingsLaunch);
  const welcome=node('section','','cloud-panel parent-start-welcome');welcome.hidden=true;
  document.querySelector('#tab-overview .tab-header')?.after(welcome);
  async function request(action,data={}) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action,...data})});
    const value=await response.json();if(!response.ok)throw Error(value.error||'Setup could not be saved.');return value;
  }
  function updateWelcome() {
    const snapshot=getSnapshot();if(!snapshot)return;
    const nextStep=nextSetupStep(snapshot,state);
    welcome.hidden=!nextStep;
    if(!nextStep)return;
    welcome.replaceChildren(node('h2',children().length?'Continue family setup':'Start with the essentials'),
      node('p',children().length?`Next: ${nextStep.label}. Your saved choices are kept.`:'Add your children, choose their school and activities, then connect their Windows computer.'),
      button(children().length?'Continue setup':'Set up my family',()=>open(nextStep.step),true));
  }
  function status() {
    progress.textContent=`Step ${index+1} of ${steps.length}`;back.disabled=index===0;
    next.textContent=index===3?'Save choices & close':index===2?(reviewing?'Save plan & continue':'Review choices'):'Continue';
  }
  async function open(startAt) {
    if(busy||dialog.open||!getSnapshot())return;
    busy=true;launch.disabled=settingsLaunch.disabled=true;previousFocus=document.activeElement;
    try {
      state=await request('get-setup');
      index=Number.isInteger(startAt)?startAt:state.completed?(nextSetupStep(getSnapshot(),state)?.step??0):Math.max(0,steps.findIndex(step=>step.id>=state.step));
      draft=null;reviewing=false;render();dialog.showModal();updateWelcome();
    }catch(failure){state=null;title.textContent='Family setup';progress.textContent='';body.replaceChildren(button('Try again',()=>{dialog.close();void open(startAt);}),button('Close',()=>dialog.close()));error.textContent=failure.message;footer.hidden=true;dialog.showModal();}
    finally{busy=false;launch.disabled=settingsLaunch.disabled=false;}
  }
  async function persist(target=index,complete=false) {
    const unlock=lockControls(body);
    try {
      for(const commit of pending)await commit();
      state=await request('save-setup',{revision:state.revision,guideVersion:2,catalogVersion:state.catalog.version,step:steps[target].id,
        completed:complete||state.completed,features:state.features,contentChoices:state.contentChoices});
      updateWelcome();
    }finally{unlock();}
  }
  async function save(close=false) {
    if(busy||!state)return false;
    if(draft?.dirty){error.textContent='Review and save your activity choices first, or use Discard activity changes.';return false;}
    busy=true;const unlock=lockControls(footer);error.textContent='';
    try{await persist();if(close)dialog.close();return true;}
    catch(failure){error.textContent=failure.message;return false;}
    finally{busy=false;unlock();status();}
  }
  async function move(direction) {
    if(busy)return;
    if(index===2&&direction<0&&reviewing){reviewing=false;render();return;}
    if(index===2&&direction<0&&draft?.dirty){error.textContent='Review and save your activity choices first, or discard them.';return;}
    busy=true;const unlock=lockControls(footer);error.textContent='';
    try {
      for(const commit of pending)await commit();
      if(direction>0&&index===0&&!children().length)throw Error('Add at least one child to continue. You can also save and close.');
      if(direction>0&&index===1&&children().some(child=>!child.main_school?.provider))throw Error('Choose a school for each child, or select No online school.');
      if(index===2&&direction>0){
        if(!reviewing){reviewing=true;render();return;}
        await savePlan();
      }
      if(index===3&&direction>0){await persist(index,true);dialog.close();navigate('overview');return;}
      const target=Math.max(0,Math.min(3,index+direction));await persist(target);index=target;render();
    }catch(failure){error.textContent=failure.message;}
    finally{busy=false;unlock();status();}
  }
  async function section(tab){if(!await save())return;try{sections.open(tab);}catch(failure){error.textContent=failure.message;}}
  function ensureDraft() {
    if(draft)return;
    const captured=structuredClone(getSnapshot()),cards=familyPlanCards(captured);
    // New families choose extras deliberately; opening this screen does not save anything.
    const fresh=!captured.rules.dailyPlanTemplate&&!captured.rules.subjects.some(s=>!s.isSchoolPortal);
    for(const card of cards.filter(c=>!c.portal)){
      if(fresh||card.enabled!==true&&state.features[card.module]===false){card.previousPlacement=card.placement==='blocked'?card.previousPlacement||'anytime':card.placement;card.placement='blocked';}
    }
    draft={captured,cards,dirty:fresh,selected:new Set(fresh?children().map(c=>c.id):[])};
  }
  async function savePlan() {
    if(!draft)return;
    if(!draft.dirty&&!draft.selected.size)return;
    if(draft.captured.rules.revision!==getSnapshot().rules.revision)throw Error('The plan changed in another window. Discard activity changes and review the latest plan.');
    const template=templateFromCards(draft.cards.map(card=>({...card,accessChanged:true})));
    const payload=draft.selected.size?applyFamilyPlan(draft.captured,template,[...draft.selected]):{revision:draft.captured.rules.revision,subjects:draft.captured.rules.subjects};
    await mutate('save-subjects',{...payload,dailyPlanTemplate:template});
    draft=null;reviewing=false;
  }
  function discardDraft(){draft=null;reviewing=false;ensureDraft();draft.dirty=false;draft.selected.clear();render();}
  function activityPicker() {
    ensureDraft();
    const setMinimal=()=>{for(const card of draft.cards.filter(c=>!c.portal)){if(card.placement!=='blocked')card.previousPlacement=card.placement;card.placement='blocked';card.accessChanged=true;}draft.dirty=true;render();};
    body.append(node('p','Start with school only, then add anything else you want. You can change this later.','setup-copy'),button('Start with school only',setMinimal));
    const common=new Set(['typing','spelling','vocabulary','poems','logic']);
    const grid=node('div','','parent-start-activities'),extras=node('details','','parent-start-more');extras.append(node('summary','More learning, media & creative activities'));
    const extraGrid=node('div','','parent-start-activities');extras.append(extraGrid);
    for(const card of draft.cards.filter(c=>!c.portal)){
      const row=node('label','','parent-start-activity'),input=node('input'),words=node('span');input.type='checkbox';input.checked=card.placement!=='blocked';
      row.style.setProperty('--activity-accent',activityAccent(card));words.append(node('strong',card.title));
      if(card.preset==='quizlet')words.append(node('small','Optional · sign in on the child’s computer'));
      input.onchange=()=>{if(card.placement!=='blocked')card.previousPlacement=card.placement;card.placement=input.checked?card.previousPlacement||'anytime':'blocked';card.accessChanged=true;draft.dirty=true;};
      row.append(input,words);(common.has(card.module)?grid:extraGrid).append(row);
    }
    body.append(grid,extras,node('p','Next, review the plan and choose which children receive it. Nothing here changes their access until you save.','setup-copy'));
    const advanced=node('details');advanced.append(node('summary','Goals, hours & individual plans'),button('Open Daily Plan',()=>section('daily-plan')),node('p','School means required work. Open after school means earned activities. Not allowed hides an activity.','setup-copy'));body.append(advanced);
    body.append(button('Discard activity changes',discardDraft));
  }
  function reviewPlan() {
    ensureDraft();title.textContent='Review your family plan';
    body.append(node('p','Save this as your family plan. Choose who receives it below; other children keep their individual choices. Future family edits also need to be applied.','setup-copy'));
    const summary=node('div','','parent-start-plan-summary');
    for(const [placement,label]of [['school','Must finish'],['after_school','After school'],['anytime','No school requirement'],['scheduled','At chosen times'],['blocked','Not allowed']]){
      const cards=draft.cards.filter(c=>c.placement===placement);if(!cards.length)continue;
      const row=node(placement==='blocked'?'details':'div');row.append(node(placement==='blocked'?'summary':'strong',`${label} · ${cards.length}`),node('p',cards.map(c=>c.title).join(', ')));summary.append(row);
    }
    body.append(summary,button('Preview these activities',()=>showPlanPreview(draft.cards,'Family',dialog)),node('h3','Apply to these children'));
    for(const child of children()){
      const label=node('label','','setup-choice'),input=node('input');input.type='checkbox';input.checked=draft.selected.has(child.id);
      input.onchange=()=>input.checked?draft.selected.add(child.id):draft.selected.delete(child.id);label.append(input,node('span',child.name));body.append(label);
    }
    body.append(node('p','No children selected means only the reusable family plan is saved. Applying replaces the selected children’s activity choices; their schools and saved work are kept.','setup-copy'),button('Discard activity changes',discardDraft));
  }
  async function previewChild(child) {
    if(busy)return;busy=true;error.textContent='';
    try{
      const captured=structuredClone(getSnapshot()),details=await request('daily-plan',{studentId:child.id});
      if(details.rulesRevision!==captured.rules.revision)throw Error('The plan changed. Refresh and try the preview again.');
      showPlanPreview(dailyPlanCards(captured,details,child.id),child.name,dialog);
    }catch(failure){error.textContent=failure.message;}finally{busy=false;}
  }
  function readiness() {
    const rows=familyReadiness(getSnapshot(),state);
    body.append(node('p','Your choices can be saved before a computer is connected. These checks confirm connection and parent controls. Check the child’s screen to confirm the latest activities and school sign-in.','setup-copy'));
    const connections=node('details','','parent-start-more');connections.open=rows.some(row=>!row.devices.length);
    connections.append(node('summary','Connect a Windows computer'),node('p','On the child’s Windows computer, download and install BodeeGuard. Choose Get pairing code. You can approve that code from this phone or any signed-in parent browser.','setup-copy'));
    const download=link('Get Windows installer','/guard/account/?setup=connect#child-setup-heading'),approve=link('Approve pairing code','/guard/activate/?setup=1');
    for(const anchor of [download,approve]){anchor.target='_blank';anchor.rel='noopener';}
    connections.append(download,approve,node('p','This setup stays open. Return here after approving the code.','setup-copy'));body.append(connections);
    const unassigned=(getSnapshot().devices||[]).filter(device=>!device.revoked_at&&!device.student_id);
    for(const device of unassigned){
      const row=node('label','','setup-field'),select=node('select');row.append(node('span',`Who uses ${device.computer_name || 'this computer'}?`));
      const prompt=node('option','Choose a child');prompt.value='';select.append(prompt);
      for(const child of children()){const option=node('option',child.name);option.value=child.id;select.append(option);}
      select.onchange=async()=>{if(!select.value||busy)return;busy=true;select.disabled=true;try{await mutate('assign-student',{deviceId:device.id,studentId:select.value});render();}catch(failure){error.textContent=failure.message;select.disabled=false;}finally{busy=false;}};
      row.append(select);body.append(row);
    }
    for(const row of rows){
      const card=node('section','','setup-child parent-start-readiness');card.append(node('h3',row.child.name),node('strong',row.ready?'Computer ready for your first school check':'Setup still needs attention'));
      const checks=node('ul');for(const check of row.checks){const item=node('li',check.label);item.dataset.done=String(check.done);const icon=node('i');icon.dataset.lucide=check.done?'circle-check':'circle';icon.setAttribute('aria-hidden','true');item.prepend(icon);checks.append(item);}card.append(checks);
      if(row.next&&row.next.step<3)card.append(button(row.next.step===1?'Choose school':'Choose activities',()=>{index=row.next.step;render();}));
      if(row.devices.some(d=>d.locked))card.append(node('p','School is paused. Resume it from parent controls when you are ready.','setup-copy'));
      if(row.devices.some(d=>!d.recovery_configured))card.append(node('p','Finish parent recovery setup in the child app before starting school.','setup-copy'));
      if(row.child.main_school?.provider&&row.child.main_school.provider!=='none')card.append(node('p','First school check: open the school on this child’s computer, sign in, and confirm a lesson opens. Website sign-in cannot be verified from here.','setup-copy'));
      card.append(button('Preview child activities',()=>previewChild(row.child)));body.append(card);
    }
    body.append(button('Check again',async()=>{if(busy)return;busy=true;try{await refresh();render();}catch(failure){error.textContent=failure.message;}finally{busy=false;}}),button('Review Daily Plan',()=>section('daily-plan')));
  }
  function render() {
    footer.hidden=false;pending=[];body.replaceChildren();error.textContent='';title.textContent=steps[index].title;status();
    if(index===0){body.append(node('p','Add everyone now. Start with one family plan, then adjust only what each child needs.','setup-copy'));pending.push(inlineChildren({host:body,getSnapshot,mutate,onError:failure=>{error.textContent=failure.message;}}));}
    else if(index===1){
      body.append(node('p','Choose a school for each child. You will sign into school later on the child’s computer.','setup-copy'));
      for(const child of children())pending.push(inlineSchool({host:body,student:child,getSnapshot,mutate,onError:failure=>{error.textContent=failure.message;}}));
      const optional=node('details');optional.append(node('summary','School hours and days off (optional)'),button('School calendar',()=>section('calendar')));body.append(optional);
    }else if(index===2){if(reviewing)reviewPlan();else activityPicker();}
    else readiness();
    body.scrollTop=0;decorateSetup(dialog);
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!state)dialog.close();else void save(true);});
  dialog.addEventListener('close',()=>{updateWelcome();if(previousFocus?.isConnected)previousFocus.focus();});
  return {open,update(){
    updateWelcome();
    if(started||!getSnapshot())return;started=true;
    const setupLink=new URL(location.href).searchParams.get('setup');
    if(!children().length||setupLink==='1'||setupLink==='connect')void open(setupLink==='connect'?3:undefined);
    else void request('get-setup').then(value=>{if(!dialog.open)state=value;updateWelcome();}).catch(()=>{});
  }};
}
