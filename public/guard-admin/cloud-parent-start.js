import { inlineChildren, inlineSchool, setupSections, lockControls, decorateSetup } from './cloud-setup-controls.js?v=20261124-calendar';
import { familyPlanCards, templateFromCards, applyFamilyPlan, dailyPlanCards, planCardKey, saveDailyPlan } from './cloud-daily-plan-model.js';
import { showPlanPreview } from './cloud-daily-plan.js';
import { familyReadiness, nextSetupStep, canFinishSetup, hasWorkingComputer } from './cloud-parent-readiness.js?v=20261104-daily-controls1';
import { setupPassword } from './cloud-setup-password.js?v=20261124-password-fields';
import { createFamilyPrompt } from './cloud-family-prompt.js?v=20261109-microphone';
import { activityAccent } from './cloud-activity-colors.js';

const steps = [
  {id:0,title:'Parent password & children'}, {id:1,title:'Add school websites (optional)'},
  {id:4,title:'Choose their activities'}, {id:7,title:'Connect your child’s computer'}
];
const node = (tag,text='',cls='') => { const el=document.createElement(tag);el.textContent=text;el.className=cls;return el; };
const button = (text,fn,primary=false) => { const el=node('button',text,`btn ${primary?'btn-primary':'btn-secondary'}`);el.type='button';el.onclick=()=>void fn();return el; };
const link = (text,href) => {const el=node('a',text,'btn btn-secondary');el.href=href;return el;};
export function setupParentStart({endpoint,getSnapshot,mutate:mutateRequest,navigate,refresh=async()=>{}}) {
  const mutate=(action,data)=>mutateRequest(action,data,{notify:false});
  const style=node('link');style.rel='stylesheet';style.href='/guard-admin/cloud-parent-setup.css?v=20261124-connect-devices';document.head.append(style);
  const dialog=node('dialog','','parent-setup-dialog parent-start-dialog');dialog.setAttribute('aria-labelledby','parent-start-title');
  const frame=node('div','','setup-frame'),header=node('header'),title=node('h2'),progress=node('p','','setup-progress');title.id='parent-start-title';
  const body=node('div','','setup-body'),error=node('p','','setup-error'),footer=node('footer');error.setAttribute('role','alert');
  const later=button('Save and close',()=>save(true)),back=button('Back',()=>move(-1)),next=button('Continue',()=>move(1),true);
  const nextLabel=next.firstChild;
  const dismiss=button('Close',()=>{if(!busy&&!promptBusy)dialog.close();});dismiss.classList.add('setup-dismiss');
  dismiss.setAttribute('aria-label','Close setup without saving');dismiss.title='Saved changes are kept. Unsaved edits will be discarded.';
  header.append(progress,title,dismiss);footer.append(later,back,next);frame.append(header,body,error,footer);dialog.append(frame);document.body.append(dialog);
  const sections=setupSections({dialog,body,footer,navigate,onReturn:()=>{resetActivityStep();render();}});
  let state=null,index=0,busy=false,started=false,previousFocus=null,pending=[],draft=null;
  let activityView='picker',activityNotice='';
  let choreChoice=null,choreRequest=null,promptBusy=false,unlockPrompt=null,manualChildren=null,passwordControl=null,unlockPassword=null;
  let manualEditor=null;
  const familyPrompt=createFamilyPrompt({getSnapshot,
    previewDraft:input=>request('preview-family-prompt',input),
    confirmDraft:async input=>{const result=await request('confirm-family-prompt',input);await refresh();return result;},
    onBusy:value=>{promptBusy=value;if(value){unlockPrompt=lockControls(footer);dismiss.disabled=true;body.querySelector('.setup-parent-password')?.setAttribute('inert','');if(manualChildren)manualChildren.inert=true;}else{unlockPrompt?.();unlockPrompt=null;dismiss.disabled=false;body.querySelector('.setup-parent-password')?.removeAttribute('inert');if(manualChildren)manualChildren.inert=false;status();}},
    onSaved:()=>{manualEditor?.refresh();updateWelcome();},
    onManualEntry:()=>{if(manualChildren){manualChildren.open=true;manualEditor?.open();}}
  });
  const children=()=>getSnapshot()?.students.filter(child=>!child.archived_at)||[];
  const overview = document.getElementById('tab-overview');
  const launch=button('Family setup',()=>open(),true);launch.id='parent-start-guide';
  (document.querySelector('#overview-actions')||document.querySelector('#tab-overview .tab-header'))?.append(launch);
  const settingsLaunch=button('Family setup',()=>open());const settingsIcon=node('i');settingsIcon.setAttribute('data-lucide','users');settingsIcon.setAttribute('aria-hidden','true');settingsLaunch.prepend(settingsIcon);(document.querySelector('#tab-settings .settings-header-actions')||document.querySelector('#tab-settings .tab-header'))?.append(settingsLaunch);
  const welcome=node('section','','cloud-panel parent-start-welcome');welcome.hidden=true;
  document.querySelector('#tab-overview .tab-header')?.after(welcome);
  async function request(action,data={}) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action,...data})});
    const value=await response.json();if(!response.ok)throw Error(value.error||'Setup could not be saved.');return value;
  }
  function setupRows() {return familyReadiness(getSnapshot(),state);}
  function canFinish() {return canFinishSetup(getSnapshot(),state);}
  function updateWelcome() {
    const snapshot=getSnapshot();
    if (overview) overview.dataset.familyDashboardActive = String(hasWorkingComputer(snapshot, state));
    if(!snapshot||!state){welcome.hidden=true;return;}
    const nextStep=nextSetupStep(snapshot,state);
    welcome.hidden=!nextStep;
    if(!nextStep)return;
    const ready=canFinish();
    welcome.replaceChildren(node('h2',!children().length?'Start with the essentials':ready?'Your family setup is ready to finish':'A few setup steps remain'),
      node('p',!children().length?'Set your parent password, add your children, choose their school and activities, then connect their Windows computer.':ready
        ?'Finish setup for the computers you have connected. You can connect the remaining children later from Family setup.'
        :'Next: '+nextStep.label+'. Review the remaining steps below; your saved choices are kept.'),
      button(!children().length?'Set up my family':ready?'Review & finish setup':'Review remaining steps',()=>open(nextStep.step),true));
  }
  function status() {
    progress.textContent=`Step ${index+1} of ${steps.length}`;back.disabled=index===0;
    if (index === 3) {
      nextLabel.textContent = canFinish() ? 'Finish setup & hide reminder'
        : hasWorkingComputer(getSnapshot(), state) ? 'Done for now' : 'Save & finish later';
    } else if (index === 0 && manualEditor?.hasDraft()) {
      nextLabel.textContent = 'Save child & continue';
    } else if(index===2&&activityView==='overview')nextLabel.textContent='Continue to computer setup';
    else if(index===2&&activityView==='review')nextLabel.textContent=planSaveLabel();
    else if(index===2)nextLabel.textContent=draft?.childOnly&&!draft.dirty?'Done':'Review choices';
    else nextLabel.textContent='Continue';
  }
  async function open(startAt) {
    if(busy||promptBusy||dialog.open||!getSnapshot())return;
    busy=true;launch.disabled=settingsLaunch.disabled=true;previousFocus=document.activeElement;
    try {
      state=await request('get-setup');
      choreChoice=state.chores?.chosen?state.chores.enabled:null;choreRequest=null;
      index=Number.isInteger(startAt)?startAt:state.completed?(nextSetupStep(getSnapshot(),state)?.step??0):Math.max(0,steps.findIndex(step=>step.id>=state.step));
      // Pairing returns directly to the computer checklist. Missing activity plan
      // choices remain visible there and never become complete just by opening it.
      if(startAt===3)index=children().length?3:0;
      if(!getSnapshot().parentPassword?.configured)index=0;
      resetActivityStep();render();dialog.showModal();updateWelcome();
    }catch(failure){state=null;title.textContent='Family setup';progress.textContent='';body.replaceChildren(button('Try again',()=>{dialog.close();void open(startAt);}),button('Close',()=>dialog.close()));error.textContent=failure.message;footer.hidden=true;dialog.showModal();}
    finally{busy=false;launch.disabled=settingsLaunch.disabled=false;}
  }
  async function persist(target=index,complete=false) {
    const unlock=lockControls(body);
    try {
      for(const commit of pending)await commit();
      if(choresChanged()){
        choreRequest ||= {operation:'settings',requestId:crypto.randomUUID(),revision:state.chores?.revision||0,enabled:choreChoice};
        const saved=await request('chores',choreRequest);state.chores={enabled:saved.enabled,revision:saved.revision,chosen:true};choreRequest=null;
        window.dispatchEvent(new Event('cloud-chores-setting-saved'));
      }
      state=await request('save-setup',{revision:state.revision,guideVersion:2,catalogVersion:state.catalog.version,step:steps[target].id,
        completed:complete||state.completed,features:state.features,contentChoices:state.contentChoices});
      updateWelcome();
    }finally{unlock();}
  }
  function choresChanged(){return choreChoice!==null&&(!state.chores?.chosen||choreChoice!==state.chores.enabled);}
  async function save(close=false) {
    if(busy||promptBusy||!state)return false;
    if(draft?.dirty){error.textContent='Review and save your activity choices first, or cancel your edits.';return false;}
    busy=true;const unlock=lockControls(footer);error.textContent='';
    try{await persist();if(close)dialog.close();return true;}
    catch(failure){error.textContent=failure.message;return false;}
    finally{busy=false;unlock();status();}
  }
  async function move(direction) {
    if(busy||promptBusy)return;
    if(index===2&&direction<0&&activityView==='review'){
      if(draft.saved)showActivityOverview();else{activityView='picker';render();}
      return;
    }
    if(index===2&&direction<0&&draft?.dirty){error.textContent='Review and save your activity choices first, or discard them.';return;}
    if(index===2&&direction<0&&draft?.fromOverview){showActivityOverview();return;}
    busy=true;const unlock=lockControls(footer);body.inert=true;error.textContent='';
    try {
      for(const commit of pending)await commit();
      if(direction>0&&!getSnapshot().parentPassword?.configured)throw Error('Save your parent password above before continuing. You can also save and close.');
      if(direction>0&&index===0&&!children().length)throw Error('Add at least one child to continue. You can also save and close.');
      if(index===2&&direction>0&&activityView!=='overview'){
        if(activityView==='picker'){
          if(draft.childOnly&&!draft.dirty){showActivityOverview();return;}
          checkAudience();activityView='review';render();return;
        }
        await savePlan();
        if(state.step!==steps[index].id||(!draft.childOnly&&choresChanged()))await persist(index);
        const audience=draft.audience;
        if(draft.saved){
          if(audience==='default')activityNotice='Family default saved.';
          else if(audience==='all')activityNotice='Shared activities applied to all children.';
          else activityNotice='Activities saved for '+recipients().map(child=>child.name).join(', ')+'.';
        }
        showActivityOverview();return;
      }
      if (index === 3 && direction > 0) {
        const finishing = canFinish();
        if (finishing) {
          await refresh();
          if (!canFinish()) {
            render();
            throw Error('A setup check changed. Review the next action below before finishing.');
          }
        }
        await persist(index, finishing);
        dialog.close();
        navigate('overview');
        return;
      }
      const target=Math.max(0,Math.min(3,index+direction));await persist(target);
      index=target;resetActivityStep();render();
    }catch(failure){error.textContent=failure.message;}
    finally{busy=false;body.inert=false;unlock();status();}
  }
  async function section(tab){if(!await save())return;try{sections.open(tab);}catch(failure){error.textContent=failure.message;}}
  function resetActivityStep() {
    draft=null;activityNotice='';activityView='picker';
    if(index!==2)return;
    const {rules}=getSnapshot();
    if(rules.dailyPlanTemplate||rules.subjects.some(s=>!s.isSchoolPortal&&s.assignments?.some(a=>a.dailyPlan)))activityView='overview';
  }
  function showActivityOverview() {
    draft=null;activityView='overview';render();title.tabIndex=-1;title.focus({preventScroll:true});
  }
  function ensureDraft() {
    if(draft)return;
    const captured=structuredClone(getSnapshot()),cards=familyPlanCards(captured);
    // New families choose extras deliberately; opening this screen does not save anything.
    const fresh=!captured.rules.dailyPlanTemplate&&!captured.rules.subjects.some(s=>!s.isSchoolPortal);
    for(const card of cards.filter(c=>!c.portal)){
      if(fresh||card.enabled!==true&&state.features[card.module]===false){card.previousPlacement=card.placement==='blocked'?card.previousPlacement||'anytime':card.placement;card.placement='blocked';}
    }
    draft={captured,familyCards:cards,cards:structuredClone(cards),fresh,dirty:fresh,
      audience:fresh?'all':'default',selected:new Set(),choices:new Map(),roster:children().map(({id,name})=>({id,name}))};
  }
  function recipients() {
    return draft.roster.filter(child=>draft.audience==='all'||draft.audience===child.id||
      (draft.audience==='selected'&&draft.selected.has(child.id)));
  }
  function planSaveLabel() {
    if(draft.saved)return 'Continue';
    if(draft.audience==='all')return 'Apply to all children';
    if(draft.audience==='default')return draft.dirty?'Save family default':'Continue';
    const targets=recipients();
    return targets.length===1?'Save for '+targets[0].name:'Apply to '+targets.length+' children';
  }
  function checkAudience() {
    if(draft.audience!=='default'&&!recipients().length)throw Error('Choose at least one child to receive these activities.');
    const currentIds=new Set(children().map(child=>child.id));
    if(draft.roster.length!==currentIds.size||draft.roster.some(child=>!currentIds.has(child.id))||
      draft.captured.rules.revision!==getSnapshot().rules.revision)
      throw Error('Your family or plan changed. Cancel your edits and reopen the activities to see the latest choices.');
  }
  function setAllowed(card,allowed) {
    if(card.placement!=='blocked')card.previousPlacement=card.placement;
    card.placement=allowed?card.previousPlacement||'anytime':'blocked';
    card.accessChanged=true;
  }
  function setChoice(card,allowed) {
    setAllowed(card,allowed);
    const key=planCardKey(card);
    if(draft.childOnly&&allowed===card.initiallyAllowed){
      draft.choices.delete(key);card.accessChanged=false;
    }else draft.choices.set(key,allowed);
    draft.dirty=!draft.childOnly||draft.firstChildPlan||draft.choices.size>0;status();
  }
  async function changeAudience(value,fromOverview=false) {
    if(busy)return;
    ensureDraft();
    busy=true;const unlock=lockControls(footer);body.inert=true;error.textContent='';
    try {
      const child=draft.roster.find(child=>child.id===value);
      let cards;
      if(child){
        body.querySelector('.setup-audience-note').textContent='Loading activities for '+child.name+'…';
        const details=await request('daily-plan',{studentId:child.id});
        if(details.rulesRevision!==draft.captured.rules.revision)throw Error('The plan changed. Discard activity changes to load the latest plan.');
        // A built-in with a planOnly override for a sibling still uses this child's
        // regular feature and time settings until they receive an assignment.
        const {rules,schoolActivities=[]}=draft.captured;
        const subjects=rules.subjects.filter(subject=>!subject.planOnly||
          !schoolActivities.some(activity=>activity.url===subject.url)||
          !Array.isArray(subject.assignments)||subject.assignments.some(item=>item.studentId===child.id));
        cards=dailyPlanCards({...draft.captured,rules:{...rules,subjects}},details,child.id);
      }else cards=structuredClone(draft.familyCards);
      for(const card of cards.filter(card=>!card.portal)){
        if(fromOverview&&child)card.initiallyAllowed=card.placement!=='blocked';
        const key=planCardKey(card);
        if(draft.choices.has(key))setAllowed(card,draft.choices.get(key));
      }
      draft.audience=value;draft.cards=cards;
      if(fromOverview){draft.fromOverview=true;draft.childOnly=!!child;}
      activityView='picker';
      draft.firstChildPlan=!!child&&!draft.captured.rules.subjects.some(subject=>subject.assignments?.some(a=>a.studentId===value&&a.dailyPlan));
      draft.dirty=draft.firstChildPlan||draft.choices.size>0||value==='all'||value==='selected'||value==='default'&&draft.fresh;
      render();
    }catch(failure){
      if(fromOverview)showActivityOverview();else render();
      error.textContent=failure.message;
    }
    finally{
      busy=false;body.inert=false;unlock();
      const focusTarget=body.querySelector('#setup-activity-audience, .setup-child-activities-title');
      (focusTarget||[...body.querySelectorAll('[data-activity-child]')].find(item=>item.dataset.activityChild===value))?.focus();
    }
  }
  function audienceNote() {
    const names=recipients().map(child=>child.name).join(', ');
    if(draft.audience==='all')return (names?names+'. ':'')+'These choices also become your family default.';
    if(draft.audience==='default')return 'Save a reusable plan. Each child keeps their current activities.';
    if(draft.audience==='selected')return names?'These children will receive the same plan: '+names+'.':'Choose the children who will receive the same plan.';
    return 'You’re editing '+names+'’s activities only.';
  }
  function audiencePicker() {
    const group=node('div','','setup-activity-audience'),label=node('label','Who gets these activities?'),select=node('select');
    select.id='setup-activity-audience';label.htmlFor=select.id;
    select.add(new Option('All children','all'));
    for(const child of draft.roster)select.add(new Option(child.name+' only',child.id));
    if(draft.roster.length>2)select.add(new Option('Choose several children…','selected'));
    select.add(new Option('Family default only','default'));
    select.value=draft.audience;select.onchange=()=>void changeAudience(select.value);
    const note=node('p',audienceNote(),'setup-audience-note');note.id='setup-audience-note';note.setAttribute('aria-live','polite');
    select.setAttribute('aria-describedby',note.id);group.append(label,select);
    if(draft.audience==='selected'){
      const choices=node('fieldset','','setup-audience-children');choices.append(node('legend','Choose children'));
      for(const child of draft.roster){
        const row=node('label','','setup-choice'),input=node('input');input.type='checkbox';input.checked=draft.selected.has(child.id);
        input.onchange=()=>{if(input.checked)draft.selected.add(child.id);else draft.selected.delete(child.id);note.textContent=audienceNote();error.textContent='';};
        row.append(input,node('span',child.name));choices.append(row);
      }
      group.append(choices);
    }
    group.append(note);body.append(group);
  }
  async function savePlan() {
    if(draft.saved||!draft.dirty)return;
    checkAudience();
    const {audience,captured,cards}=draft;
    const targets=recipients().map(child=>child.id);
    if(draft.roster.some(child=>child.id===audience)){
      const changes=cards.filter(card=>!card.portal&&(draft.firstChildPlan||card.accessChanged))
        .map(card=>({...card,accessChanged:true}));
      if(changes.length)await mutate('save-subjects',saveDailyPlan(captured,audience,changes));
    }else{
      const template=templateFromCards(cards.map(card=>({...card,accessChanged:true})));
      const activities={...template,activities:template.activities.filter(entry=>entry.key!=='school')};
      const payload=targets.length&&activities.activities.length?applyFamilyPlan(captured,activities,targets):{revision:captured.rules.revision,subjects:captured.rules.subjects};
      if(audience!=='selected')payload.dailyPlanTemplate=template;
      await mutate('save-subjects',payload);
    }
    draft.saved=true;draft.dirty=false;
  }
  function discardDraft(){
    if(draft.fromOverview||draft.saved){showActivityOverview();return;}
    draft=null;activityView='picker';ensureDraft();draft.dirty=false;draft.audience='default';render();
  }
  function activityOverview() {
    title.textContent='Activities by child';
    const panel=node('section','','setup-activity-overview');
    const notice=node('p',activityNotice,'setup-audience-note');notice.setAttribute('role','status');
    panel.append(notice,node('p','Choose a child to adjust their activities, or continue to computer setup.','setup-copy'));
    const list=node('div','','setup-activity-children');
    for(const child of children()){
      const edit=button('Edit '+child.name+'’s activities',()=>changeAudience(child.id,true));
      edit.dataset.activityChild=child.id;list.append(edit);
    }
    panel.append(list,button('Edit activities for everyone',()=>changeAudience('all',true)));
    const games=getSnapshot().rules.subjects.filter(s=>s.url==='app://games'&&s.active!==false);
    if(games.some(s=>!s.assignments||s.assignments.some(a=>a.active!==false&&children().some(child=>child.id===a.studentId))))
      panel.append(button('Choose games for each child',()=>section('family-games')));
    body.append(panel);
  }
  function activityPicker() {
    ensureDraft();
    if(draft.childOnly){
      const childTitle=node('h3',recipients()[0].name+'’s activities','setup-child-activities-title');
      childTitle.tabIndex=-1;body.append(childTitle);
    }else audiencePicker();
    const setMinimal=()=>{for(const card of draft.cards.filter(c=>!c.portal))setChoice(card,false);render();};
    body.append(button('Start with school only',setMinimal));
    const common=new Set(['typing','spelling','vocabulary','poems','logic']);
    const grid=node('div','','parent-start-activities'),extras=node('details','','parent-start-more');extras.append(node('summary','More learning, media & creative activities'));
    const extraGrid=node('div','','parent-start-activities');extras.append(extraGrid);
    for(const card of draft.cards.filter(c=>!c.portal)){
      const row=node('label','','parent-start-activity'),input=node('input'),words=node('span');input.type='checkbox';input.checked=card.placement!=='blocked';
      row.style.setProperty('--activity-accent',activityAccent(card));words.append(node('strong',card.title));
      if(card.preset==='quizlet')words.append(node('small','Optional · sign in on the child’s computer'));
      input.onchange=()=>setChoice(card,input.checked);
      row.append(input,words);(common.has(card.module)?grid:extraGrid).append(row);
    }
    body.append(grid,extras);
    const advanced=node('details');advanced.append(node('summary','Goals, hours & individual plans'),button('Open Daily Plan',()=>section('daily-plan')),node('p','School means required work. Open after school means earned activities. Not allowed hides an activity.','setup-copy'));body.append(advanced);
    body.append(button(draft.fromOverview?'Cancel edits':'Discard activity changes',discardDraft));
  }
  function reviewPlan() {
    ensureDraft();title.textContent='Review activity choices';
    const targets=recipients();
    const audience=draft.audience==='default'?'Family default only':targets.map(child=>child.name).join(', ');
    const scope=node('section','','setup-activity-audience');scope.append(node('h3',audience));
    if(draft.audience==='all')scope.append(node('p','This replaces each child’s activity choices and sets your family default. You can customize a child next, before computer setup.'));
    else if(draft.audience==='default')scope.append(node('p','Each child keeps their current activities.'));
    else if(draft.audience==='selected')scope.append(node('p','These children will receive the same activity plan.'));
    else scope.append(node('p','Only this child’s activity choices will be saved.'));
    scope.append(button(draft.childOnly?'Edit activities':'Change who gets these activities',()=>move(-1)));body.append(scope);
    const summary=node('div','','parent-start-plan-summary');
    if(draft.childOnly&&!draft.firstChildPlan){
      for(const allowed of [true,false]){
        const changed=draft.cards.filter(card=>draft.choices.get(planCardKey(card))===allowed);
        if(!changed.length)continue;
        const row=node('div');row.append(node('strong',allowed?'Turn on':'Turn off'),node('p',changed.map(card=>card.title).join(', ')));summary.append(row);
      }
    }else for(const [placement,label]of [['school','Must finish'],['after_school','After school'],['anytime','No school requirement'],['scheduled','At chosen times'],['blocked','Not allowed']]){
      const cards=draft.cards.filter(c=>c.placement===placement);if(!cards.length)continue;
      const row=node(placement==='blocked'?'details':'div');row.append(node(placement==='blocked'?'summary':'strong',`${label} · ${cards.length}`),node('p',cards.map(c=>c.title).join(', ')));summary.append(row);
    }
    body.append(summary,button('Preview these activities',()=>showPlanPreview(draft.cards,audience,dialog)),button(draft.fromOverview?'Cancel edits':'Discard activity changes',discardDraft));
  }
  async function previewChild(child) {
    if(busy)return;busy=true;error.textContent='';
    try{
      const captured=structuredClone(getSnapshot()),details=await request('daily-plan',{studentId:child.id});
      if(details.rulesRevision!==captured.rules.revision)throw Error('The plan changed. Refresh and try the preview again.');
      showPlanPreview(dailyPlanCards(captured,details,child.id),child.name,dialog);
    }catch(failure){error.textContent=failure.message;}finally{busy=false;}
  }
  function connectionGuide(hasComputer) {
    const guide=node('details','','parent-start-more setup-connection-guide');
    guide.open=!hasComputer;
    guide.append(node('summary',hasComputer?'Connect another Windows computer':'Install and connect the child app'));
    const stepsList=node('ol','','setup-device-steps');
    function addStep(device,iconName){
      const item=node('li'),heading=node('strong',device),icon=node('i','','setup-icon');
      icon.dataset.lucide=iconName;icon.setAttribute('aria-hidden','true');heading.prepend(icon);
      item.append(heading);stepsList.append(item);return item;
    }
    const phone=addStep('On your phone','smartphone');
    // These parent actions must navigate the top frame on a user gesture in the dashboard sandbox.
    const download=link('Get a download code','/guard/account/?setup=connect#parent-download-code');
    download.target='_top';
    phone.append(node('p','In your parent account, tap Create download code. Keep it on your phone.'),download);

    const pc=addStep('On your child’s Windows computer','laptop');
    const install=node('p','Visit ');
    install.append(node('strong','guard.bodeebooks.com/install'),'. Enter the download code from your phone, then download and run the installer.');
    pc.append(install,node('p','Once installed, open BodeeGuard. Leave its pairing code on the screen.'));

    const approveStep=addStep('Back on your phone','smartphone');
    const approve=link('Enter pairing code','/guard/activate/?setup=1');approve.target='_top';
    approveStep.append(node('p','Enter the pairing code from the child app. Approve the computer, then choose the child who uses it.'),approve);
    guide.append(stepsList);
    return guide;
  }
  function readiness() {
    if(!getSnapshot().parentPassword?.configured){
      body.append(node('p','Set your parent password before connecting or assigning a computer. Already paired computers can stay open while you finish this step.','setup-copy'),button('Set parent password',()=>{index=0;render();},true));
      return;
    }
    const rows=setupRows();
    const summary=node('section','','setup-readiness-summary');
    const deferred=rows.filter(row=>row.connectLater),finishable=canFinish();
    const working = hasWorkingComputer(getSnapshot(), state);
    summary.dataset.ready=String(finishable);
    summary.append(node('h3',finishable?'You can finish setup':working?'You can use your dashboard':rows.length?'What’s left to do':'Connect your family'),
      node('p',!finishable&&working?'Choose Done for now to use your dashboard. You can revisit these checks under Settings → Family setup.':!finishable&&rows.length?'Complete the steps marked below. Save & finish later keeps your choices.':rows.length
        ?'Choose Finish setup & hide reminder below. Your choices stay saved, and Family setup remains available whenever you need it.'
        :'Add a child to begin.','setup-copy'),node('p','Computers do not have to stay online to finish setup. A paused school day does not undo setup.','setup-copy'));
    if(deferred.length&&finishable)summary.append(node('p',deferred.map(row=>row.child.name).join(', ')+': no computer assigned yet. You can finish now and connect them later from Family setup. Their profiles and choices stay saved.','setup-copy'));
    const devices=(getSnapshot().devices||[]).filter(device=>!device.revoked_at);
    const connections=connectionGuide(devices.length>0);
    if(!devices.length)body.append(connections);
    body.append(summary);
    body.append(button('Check again',async()=>{if(busy)return;busy=true;try{for(const commit of pending)await commit();await refresh();render();}catch(failure){error.textContent=failure.message;}finally{busy=false;}}));
    const unassigned=devices.filter(device=>!device.student_id);
    for(const device of unassigned){
      const row=node('section','','setup-child setup-computer-assignment'),field=node('label','','setup-field'),select=node('select');
      row.append(node('h3',device.computer_name || 'Child computer'),node('p','Computer approved. On your phone, choose the child and tap Save student.'));
      field.append(node('span','Who uses this computer?'));
      const prompt=node('option','Choose a child');prompt.value='';select.append(prompt);
      for(const child of children()){const option=node('option',child.name);option.value=child.id;select.append(option);}
      const notice=node('p','','setup-copy');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
      const saveStudent=button('Save student',async()=>{
        if(!select.value||busy)return;busy=true;select.disabled=saveStudent.disabled=true;notice.textContent='Saving student…';
        try{await mutate('assign-student',{deviceId:device.id,studentId:select.value});render();}
        catch(failure){notice.textContent=failure.message;select.disabled=false;saveStudent.disabled=false;}
        finally{busy=false;}
      },true);
      saveStudent.disabled=true;
      select.onchange=()=>{saveStudent.disabled=!select.value;notice.textContent=select.value?'Not saved yet. Tap Save student to assign this computer.':'';};
      pending.push(()=>{if(select.value)throw Error(`Tap Save student for ${device.computer_name || 'this computer'} first, or clear your selection.`);});
      field.append(select);row.append(field,saveStudent,notice);body.append(row);
    }
    if(devices.length)body.append(connections);

    for(const row of rows){
      const card=node('section','','setup-child parent-start-readiness');card.dataset.ready=String(row.ready);
      const later=row.connectLater&&finishable;
      card.append(node('h3',row.child.name),node('strong',row.ready?'Setup checks complete':later?'Connect a computer when you’re ready':'Setup still needs attention'));
      if(row.device){
        const connection=row.connected?'Online now': 'Not connected right now';
        card.append(node('p',(row.device.computer_name||'Assigned computer')+' · '+connection+(row.device.locked?' · School paused':''),'setup-device-status'));
        if(row.ready&&!row.connected)card.append(node('p','This computer has already confirmed its setup. It can be offline while you finish the guide.','setup-copy'));
        if(row.ready&&row.controlsPending)card.append(node('p','Your latest control changes are waiting for this computer to sync. Its initial setup is already confirmed.','setup-copy'));
      }
      const details=node('details','','setup-check-details');details.open=!row.ready&&!later;details.append(node('summary',row.ready?'View completed checks':later?'View setup steps':'Required setup checks'));
      const checks=node('ul');for(const check of row.checks){const item=node('li',check.label);item.dataset.done=String(check.done);item.dataset.check=check.id;const icon=node('i');icon.dataset.lucide=check.done?'circle-check':'circle';icon.setAttribute('aria-hidden','true');item.prepend(icon);checks.append(item);}details.append(checks);card.append(details);
      if(later)card.append(node('p','No computer is assigned to this child yet. This does not stop you finishing setup for the rest of your family.','setup-copy'));
      const editChildActivities=async()=>{if(busy)return;await move(-1);if(index===2)await changeAudience(row.child.id,true);};
      if(row.next){
        const action=node('div','','setup-next-action');action.append(node('strong',(later?'When you’re ready: ':'Next: ')+row.next.action),node('p',row.next.detail));
        if(row.next.id==='activities')action.append(button(row.next.action,editChildActivities));
        else if(row.next.step<3)action.append(button(row.next.action,()=>{index=row.next.step;render();}));
        else if(row.next.id==='computer'){
          if(unassigned.length)action.append(button('Assign a connected computer',()=>{const target=body.querySelector('.setup-computer-assignment');target.scrollIntoView({block:'start',behavior:'smooth'});target.querySelector('select')?.focus();}));
          else action.append(button('Show connection steps',()=>{
            connections.open=true;
            connections.querySelector('summary').focus();
            connections.scrollIntoView({block:'start'});
          }));
        }
        card.append(action);
      }
      if(row.child.main_school?.provider&&row.child.main_school.provider!=='none'){
        const schoolCheck=node('details','','setup-first-lesson');schoolCheck.append(node('summary','Before the first lesson'),node('p','On this child’s computer, open their school, sign in, and check that a lesson opens. Website sign-in cannot be checked here and does not keep the setup reminder visible.','setup-copy'));card.append(schoolCheck);
      }
      card.append(button('Preview child activities',()=>previewChild(row.child)));
      if(row.next?.id!=='activities')card.append(button('Edit activity choices',editChildActivities));
      body.append(card);
    }
    body.append(node('p','After saving a student, keep BodeeGuard open on that computer. Tap Check again to see when it confirms the assignment and parent controls.','setup-copy'));
    body.append(button('Review Daily Plan',()=>section('daily-plan')));
  }
  function choreOptions(){
    const section=node('fieldset','','setup-chores');section.append(node('legend','Chores & Routines for the whole family'),node('p','Turn this on to assign chores to individual children.'));
    for(const [value,label]of [[true,'Use Chores & Routines'],[false,'Skip for now']]){
      const row=node('label','','setup-choice'),input=node('input');input.type='radio';input.name='family-start-chores';input.checked=choreChoice===value;
      input.onchange=()=>{choreChoice=value;choreRequest=null;};row.append(input,node('span',label));section.append(row);
    }
    body.append(section);
  }
  function render() {
    passwordControl?.clear();passwordControl=null;familyPrompt.unmount();manualChildren=null;manualEditor=null;footer.hidden=false;pending=[];body.replaceChildren();error.textContent='';title.textContent=steps[index].title;status();
    if(index===0){
      passwordControl=setupPassword({host:body,getSnapshot,mutate,refresh,
        onBusy:value=>{busy=value;if(value){unlockPassword=lockControls(footer);dismiss.disabled=true;body.querySelector('.family-prompt')?.setAttribute('inert','');if(manualChildren)manualChildren.inert=true;}else{unlockPassword?.();unlockPassword=null;dismiss.disabled=false;body.querySelector('.family-prompt')?.removeAttribute('inert');if(manualChildren)manualChildren.inert=false;status();}},
        onSaved:()=>{error.textContent='';updateWelcome();decorateSetup(dialog);}});
      pending.push(()=>passwordControl?.validate());
      familyPrompt.mount(body);pending.push(()=>familyPrompt.flush());
      manualChildren=node('details','','setup-manual-children');manualChildren.append(node('summary','Add children one at a time'));
      const manualHost=node('div');manualChildren.append(manualHost);body.append(manualChildren);
      manualEditor=inlineChildren({host:manualHost,getSnapshot,mutate,onError:failure=>{error.textContent=failure.message;},
        onDraftChange:()=>{if(!busy&&!promptBusy){error.textContent='';status();}}});
      pending.push(manualEditor);
    }
    else if(index===1){
      const roster=children(),pickers=[];
      const options={host:body,getSnapshot,mutate,refresh,searchSites:input=>request('find-school-sites',input),
        onChange:()=>{error.textContent='';},onError:failure=>{error.textContent=failure.message;},
        onWrite:(writing,active)=>{
          busy=writing;footer.inert=writing;dismiss.disabled=writing;
          for(const item of body.children)if(item!==active)item.inert=writing;
        },
        afterWrite:()=>pickers.forEach(picker=>picker.refreshList())
      };
      if(roster.length>1)pickers.push(inlineSchool({...options,students:roster}));
      for(const student of roster)pickers.push(inlineSchool({...options,student,quickAbeka:roster.length===1}));
      pending.push(...pickers);
      const calendar=button('Set school calendar',()=>section('calendar'));
      const icon=node('i','','setup-icon');icon.dataset.lucide='calendar-days';icon.setAttribute('aria-hidden','true');calendar.prepend(icon);
      body.append(calendar);
    }else if(index===2){
      if(activityView==='overview')activityOverview();
      else if(activityView==='review')reviewPlan();
      else activityPicker();
    }
    else { readiness(); body.append(node('p','If you enabled Family Games, choose Access & game time next to a child, or Settings for all children, then review individual games. Games are allowed until you turn them off.','setup-note'),button('Choose games for each child',()=>section('family-games'))); }
    if(index===2&&!draft?.childOnly||index===3&&!state.chores?.chosen&&!state.completed)choreOptions();
    body.scrollTop=0;decorateSetup(dialog);
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy&&!promptBusy)dialog.close();});
  dialog.addEventListener('close',()=>{passwordControl?.clear();familyPrompt.unmount();updateWelcome();if(previousFocus?.isConnected)previousFocus.focus();});
  return {open,update(){
    updateWelcome();
    if(started||!getSnapshot())return;started=true;
    const setupLink=new URL(location.href).searchParams.get('setup');
    if(!children().length||setupLink==='1'||setupLink==='connect')void open(setupLink==='connect'?3:undefined);
    else void request('get-setup').then(value=>{if(!dialog.open)state=value;updateWelcome();}).catch(()=>{});
  }};
}
