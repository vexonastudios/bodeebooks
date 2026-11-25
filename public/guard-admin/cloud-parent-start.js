import { inlineChildren, inlineSchool, setupField, setupSections, lockControls, decorateSetup } from './cloud-setup-controls.js?v=20261125-first-day';
import { editSchedule } from './cloud-workspace-model.js';
import { dailyPlanCards } from './cloud-daily-plan-model.js';
import { showPlanPreview } from './cloud-daily-plan.js';
import { familyReadiness, nextSetupStep, canFinishSetup, hasWorkingComputer } from './cloud-parent-readiness.js?v=20261125-first-day';
import { setupPassword } from './cloud-setup-password.js?v=20261124-password-fields';
import { createFamilyPrompt } from './cloud-family-prompt.js?v=20261109-microphone';
import { loadFamilyActivities, familyActivityUpdate } from './cloud-family-activities.js?v=20261125-family-activities';
import { computerHandoff } from './cloud-computer-handoff.js?v=20261125-computer-handoff';
import { activityAccent } from './cloud-activity-colors.js';

const steps = [
  {id:0,title:'Parent password & children'}, {id:1,title:'Add school websites (optional)'},
  {id:4,title:'Activities for all children'}, {id:7,title:'Connect your child’s computer'}
];
const node = (tag,text='',cls='') => { const el=document.createElement(tag);el.textContent=text;el.className=cls;return el; };
const button = (text,fn,primary=false) => { const el=node('button',text,`btn ${primary?'btn-primary':'btn-secondary'}`);el.type='button';el.onclick=()=>void fn();return el; };
export function setupParentStart({endpoint,getSnapshot,mutate:mutateRequest,navigate,refresh=async()=>{}}) {
  const connection=computerHandoff({node,button});
  const mutate=(action,data)=>mutateRequest(action,data,{notify:false});
  const style=node('link');style.rel='stylesheet';style.href='/guard-admin/cloud-parent-setup.css?v=20261125-computer-handoff';document.head.append(style);
  const dialog=node('dialog','','parent-setup-dialog parent-start-dialog');dialog.setAttribute('aria-labelledby','parent-start-title');
  const frame=node('div','','setup-frame'),header=node('header'),title=node('h2'),progress=node('p','','setup-progress');title.id='parent-start-title';
  const body=node('div','','setup-body'),error=node('p','','setup-error'),footer=node('footer');error.setAttribute('role','alert');
  const later=button('Save and close',()=>save(true)),back=button('Back',()=>move(-1)),next=button('Continue',()=>move(1),true);
  const nextLabel=next.firstChild;
  const dismiss=button('Close',()=>{if(!busy&&!promptBusy){sections.close();dialog.close();}});dismiss.classList.add('setup-dismiss');
  dismiss.setAttribute('aria-label','Close setup without saving');dismiss.title='Saved changes are kept. Unsaved edits will be discarded.';
  header.append(progress,title,dismiss);footer.append(later,back,next);frame.append(header,body,error,footer);dialog.append(frame);document.body.append(dialog);
  const sections=setupSections({dialog,body,footer,navigate,onReturn:()=>{draft=null;render();}});
  let state=null,index=0,busy=false,started=false,previousFocus=null,pending=[],draft=null;
  let returningActivities=null;
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
    const ready=nextStep.step===3&&canFinish();
    welcome.replaceChildren(node('h2',!children().length?'Start with the essentials':ready?'Your family setup is ready to finish':'A few setup steps remain'),
      node('p',!children().length?'Set your parent password, add your children, choose their school and activities, then connect their Windows computer.':ready
        ?'Finish setup for the computers you have connected. You can connect the remaining children later from Family setup.'
        :'Next: '+nextStep.label+'. Review the remaining steps below; your saved choices are kept.'),
      button(!children().length?'Set up my family':ready?'Review & finish setup':'Review remaining steps',()=>open(),true));
  }
  function status() {
    progress.textContent=`Step ${index+1} of ${steps.length}`;back.disabled=index===0;
    if (index === 3) {
      nextLabel.textContent = canFinish() ? 'Finish setup & hide reminder'
        : hasWorkingComputer(getSnapshot(), state) ? 'Done for now' : 'Save & finish later';
    } else if (index === 0 && manualEditor?.hasDraft()) {
      nextLabel.textContent = 'Save child & continue';
    } else if(index===2)nextLabel.textContent='Save & continue';
    else nextLabel.textContent='Continue';
    const waitingForComputer=index===3&&!getSnapshot().devices?.some(device=>!device.revoked_at);
    later.hidden=waitingForComputer;
    next.classList.toggle('btn-primary',!waitingForComputer);next.classList.toggle('btn-secondary',waitingForComputer);
    next.disabled=later.disabled=index===2&&!draft?.model;
  }
  async function open(startAt) {
    if(busy||promptBusy||dialog.open||!getSnapshot())return;
    busy=true;launch.disabled=settingsLaunch.disabled=true;previousFocus=document.activeElement;
    try {
      state=await request('get-setup');
      choreChoice=state.chores?.enabled ?? false;choreRequest=null;
      index=Number.isInteger(startAt)?startAt:(nextSetupStep(getSnapshot(),state)?.step??0);
      // Pairing returns directly to the computer checklist. Missing activity plan
      // choices remain visible there and never become complete just by opening it.
      if(startAt===3)index=children().length?3:0;
      if(!getSnapshot().parentPassword?.configured)index=0;
      returningActivities=null;draft=null;render();dialog.showModal();updateWelcome();
    }catch(failure){state=null;title.textContent='Family setup';progress.textContent='';body.replaceChildren(button('Try again',()=>{dialog.close();void open(startAt);}),button('Close',()=>dialog.close()));error.textContent=failure.message;footer.hidden=true;dialog.showModal();}
    finally{busy=false;launch.disabled=settingsLaunch.disabled=false;}
  }
  async function persist(target=index,complete=false) {
    const unlock=lockControls(body);
    try {
      for(const commit of pending)await commit();
      if(index>=2&&choresChanged()){
        choreRequest ||= {operation:'settings',requestId:crypto.randomUUID(),revision:state.chores?.revision||0,enabled:choreChoice};
        const saved=await request('chores',choreRequest);state.chores={enabled:saved.enabled,revision:saved.revision,chosen:true};choreRequest=null;
        window.dispatchEvent(new Event('cloud-chores-setting-saved'));
      }
      state=await request('save-setup',{revision:state.revision,guideVersion:2,catalogVersion:state.catalog.version,step:steps[target].id,
        completed:complete||state.completed,features:state.features,contentChoices:state.contentChoices});
      updateWelcome();
    }finally{unlock();}
  }
  function choresChanged(){return choreChoice!==null&&choreChoice!==(state.chores?.enabled ?? false);}
  async function save(close=false) {
    if(busy||promptBusy||!state)return false;
    busy=true;const unlock=lockControls(footer);error.textContent='';
    body.inert=true;
    try{if(index===2)await savePlan();await persist();if(close)dialog.close();return true;}
    catch(failure){await navigationError(failure);return false;}
    finally{busy=false;body.inert=false;unlock();status();}
  }
  async function move(direction) {
    if(busy||promptBusy)return;
    if(index===2&&direction<0){
      returningActivities=new Map(draft?.model?.choices || returningActivities);
      index=1;draft=null;render();title.tabIndex=-1;title.focus({preventScroll:true});return;
    }
    busy=true;const unlock=lockControls(footer);body.inert=true;error.textContent='';
    try {
      for(const commit of pending)await commit();
      if(direction>0&&!getSnapshot().parentPassword?.configured)throw Error('Save your parent password above before continuing. You can also save and close.');
      if(direction>0&&index===0&&!children().length)throw Error('Add at least one child to continue. You can also save and close.');
      if(index===2&&direction>0)await savePlan();
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
      index=target;draft=null;render();title.tabIndex=-1;title.focus({preventScroll:true});
    }catch(failure){await navigationError(failure);}
    finally{busy=false;body.inert=false;unlock();status();}
  }
  async function section(tab){if(!await save())return;try{sections.open(tab);}catch(failure){error.textContent=failure.message;}}
  async function navigationError(failure) {
    if(index===2&&draft?.model){
      // Either write may have succeeded even when its reply did not arrive.
      returningActivities=new Map(draft.model.choices);
      try{
        await refresh();
        const latest=await request('get-setup');
        if(choreRequest&&latest.chores?.revision!==choreRequest.revision)choreRequest=null;
        state=latest;
      }catch{/* Keep the original error and allow another retry. */}
      draft=null;render();draft.notice=failure.message;
    }
    error.textContent=failure.message;
  }
  async function savePlan() {
    if(!draft?.model)throw Error('Wait for the activity choices to load.');
    if(draft.saved)return;
    const payload=familyActivityUpdate(draft.model,getSnapshot());
    if(payload)await mutate('save-subjects',payload);
    draft.saved=true;
  }
  function activityPicker() {
    if(!draft){
      const pendingDraft={};
      draft=pendingDraft;
      loadFamilyActivities(structuredClone(getSnapshot()),state,id=>request('daily-plan',{studentId:id})).then(model=>{
        if(draft!==pendingDraft)return;
        for(const [module,enabled] of returningActivities||[]){
          if(model.values.has(module)&&model.values.get(module)!==enabled)model.choices.set(module,enabled);
        }
        returningActivities=null;draft.model=model;render();
      }).catch(failure=>{
        if(draft!==pendingDraft)return;
        draft.failure=failure.message;render();
      });
    }
    if(!draft.model){
      if(draft.failure){
        error.textContent=draft.failure;
        body.append(button('Reload activity choices',()=>{draft=null;render();}));
      }else{
        const loading=node('p','Loading your family’s activities…','setup-copy');
        loading.setAttribute('role','status');body.append(loading);
      }
      return;
    }
    const model=draft.model;
    const intro=node('p',model.fresh?'Activities start on for every child. Uncheck any your family wants to turn off.':'Changes here apply to every child. You can adjust one child later in Daily Plan.','setup-copy');
    const panel=node('div','','setup-family-activities');panel.append(intro);
    const creative=['notebook','art-studio','coloring-studio','piano'];
    const media=['games','music','audiobooks','videos','learning-videos'];
    const groups=[
      ['Learning & practice',model.defaults.filter(card=>!creative.includes(card.module)&&!media.includes(card.module))],
      ['Writing & creativity',model.defaults.filter(card=>creative.includes(card.module))],
      ['Games & media',model.defaults.filter(card=>media.includes(card.module))]
    ];
    for(const [heading,cards] of groups){
      if(!cards.length)continue;
      const group=node('fieldset','','setup-activity-group'),grid=node('div','','parent-start-activities');
      group.append(node('legend',heading),grid);
      for(const card of cards){
        const row=node('label','','parent-start-activity'),input=node('input'),words=node('span');
        const initial=model.values.get(card.module);
        input.type='checkbox';input.name=card.module;
        input.checked=model.choices.get(card.module) ?? initial===true;
        input.indeterminate=initial===null&&!model.choices.has(card.module);
        row.style.setProperty('--activity-accent',activityAccent(card));
        words.append(node('strong',card.title));
        if(card.module==='spelling')words.append(node('small','Grade-level practice or your own lists'));
        const mixed=node('small','On for some children');mixed.hidden=!input.indeterminate;
        if(initial===null)words.append(mixed);
        input.onchange=()=>{
          error.textContent='';draft.notice='';
          if(input.checked===initial)model.choices.delete(card.module);
          else model.choices.set(card.module,input.checked);
          mixed.hidden=true;
        };
        row.append(input,words);grid.append(row);
      }
      panel.append(group);
    }
    body.append(panel);choreOptions();if(draft.notice)error.textContent=draft.notice;
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
    const connections=connection.render(devices.length>0);
    const unassigned=devices.filter(device=>!device.student_id);
    const hasPrimaryTask=!devices.length||unassigned.length>0;
    const checklist=node(hasPrimaryTask?'details':'div','','setup-connection-status');
    if(hasPrimaryTask)checklist.append(node('summary','Connection status & setup details'));
    if(!devices.length)body.append(connections);
    const checkAgain=button('Check again',async()=>{
      if(busy)return;
      busy=true;
      try {
        for(const commit of pending)await commit();
        await refresh();
        if(!dialog.open||index!==3)return;
        render();
        const assignment=body.querySelector('.setup-computer-assignment select');
        if(assignment)assignment.focus();
        else {
          const statusPanel=body.querySelector('.setup-connection-status');
          if(!statusPanel)return;
          if(statusPanel.tagName==='DETAILS')statusPanel.open=true;
          statusPanel.querySelector('.setup-refresh-connection')?.focus();
        }
      } catch(failure){error.textContent=failure.message;}finally{busy=false;}
    });
    checkAgain.classList.add('setup-refresh-connection');checklist.append(summary,checkAgain);
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
    body.append(checklist);
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
      const editFamilyActivities=()=>move(-1);
      if(row.next){
        const action=node('div','','setup-next-action');action.append(node('strong',(later?'When you’re ready: ':'Next: ')+row.next.action),node('p',row.next.detail));
        if(row.next.id==='activities')action.append(button('Choose family activities',editFamilyActivities));
        else if(row.next.step<3)action.append(button(row.next.action,()=>{index=row.next.step;render();}));
        else if(row.next.id==='computer'){
          if(unassigned.length)action.append(button('Assign a connected computer',()=>{const target=body.querySelector('.setup-computer-assignment');target.scrollIntoView({block:'start',behavior:'smooth'});target.querySelector('select')?.focus();}));
          else if(devices.length)action.append(button('Show connection steps',()=>{
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
      checklist.append(card);
    }
    if(devices.length)checklist.append(node('p','After saving a student, keep BodeeGuard open on that computer. Tap Check again to see when it confirms the assignment and parent controls.','setup-copy'));
    const activities=node('details','','setup-extra-options');
    activities.append(node('summary','Activity settings'),button('Review Daily Plan',()=>section('daily-plan')),
      button('Choose games for each child',()=>section('family-games')));
    (hasPrimaryTask?checklist:body).append(activities);
  }
  function schoolStartDate(){
    const panel=node('div','','setup-child setup-school-start');
    let savedStart=getSnapshot().rules.schedule?.termStart||'';
    const {label,input}=setupField('First day of school (optional)','setupTermStart',savedStart,'date');
    const today=button('Use today',()=>{
      const zone=getSnapshot().rules.schedule?.timeZone||window.BODEE_CLOUD_SCHEDULE.DEFAULT_CLOUD_SCHOOL_SCHEDULE.timeZone;
      input.value=window.BODEE_CLOUD_SCHEDULE.cloudSchoolDateParts(zone,Date.now()).localDate;
      input.focus();
    });
    const row=node('div','','school-hours-first-date');row.append(label,today);
    const calendar=button('More calendar settings',()=>section('calendar'));
    const icon=node('i','','setup-icon');icon.dataset.lucide='calendar-days';icon.setAttribute('aria-hidden','true');calendar.prepend(icon);
    panel.append(row,calendar);body.append(panel);
    pending.push(async()=>{
      if(input.validity.badInput)throw Error('Enter a complete first school day or leave it blank.');
      if(input.value===savedStart)return;
      const snapshot=getSnapshot(),current=snapshot.rules.schedule;
      if((current?.termStart||'')!==savedStart && (current?.termStart||'')!==input.value){
        savedStart=current?.termStart||'';input.value=savedStart;
        throw Error('The first school day changed elsewhere. Check the updated date before continuing.');
      }
      if((current?.termStart||'')!==input.value){
        const calendar=window.BODEE_CLOUD_SCHEDULE;
        const schedule=calendar.planCloudSchoolSchedule({...calendar.DEFAULT_CLOUD_SCHOOL_SCHEDULE,...current,termStart:input.value||null});
        await mutate('save-subjects',editSchedule(snapshot,schedule));
      }
      savedStart=input.value;
    });
  }
  function choreOptions(){
    const row=node('label','','setup-chores'),words=node('span');
    const input=node('input');input.type='checkbox';input.name='family-start-chores';input.checked=choreChoice===true;
    input.onchange=()=>{choreChoice=input.checked;choreRequest=null;};
    words.append(node('strong','Chores & routines'),node('small','Assign jobs and reminders to individual children.'));
    row.append(words,input);body.append(row);
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
      schoolStartDate();
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
    }else if(index===2){
      activityPicker();
    }
    else readiness();
    body.scrollTop=0;decorateSetup(dialog);
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy&&!promptBusy)dialog.close();});
  dialog.addEventListener('close',()=>{connection.clear();draft=null;passwordControl?.clear();familyPrompt.unmount();updateWelcome();if(previousFocus?.isConnected)previousFocus.focus();});
  return {open,update(){
    updateWelcome();
    if(started||!getSnapshot())return;started=true;
    const setupLink=new URL(location.href).searchParams.get('setup');
    if(!children().length||setupLink==='1'||setupLink==='connect')void open(setupLink==='connect'?3:undefined);
    else void request('get-setup').then(value=>{if(!dialog.open)state=value;updateWelcome();}).catch(()=>{});
  }};
}
