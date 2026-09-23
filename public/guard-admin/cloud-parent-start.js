import { inlineChildren, inlineSchool, setupSections, lockControls, decorateSetup } from './cloud-setup-controls.js';
import { familyPlanCards, templateFromCards, applyFamilyPlan } from './cloud-daily-plan-model.js';
import { activityAccent } from './cloud-activity-colors.js';

// Reuse the saved guide positions so existing family records remain readable.
const steps = [
  { id:0, title:'Add your children' }, { id:1, title:'Choose their school' },
  { id:4, title:'Choose their activities' }, { id:7, title:'Connect a computer' }
];
const node = (tag, text = '', cls = '') => { const el = document.createElement(tag); el.textContent = text; el.className = cls; return el; };
const button = (text, fn, primary = false) => { const el = node('button', text, `btn ${primary ? 'btn-primary' : 'btn-secondary'}`); el.type='button'; el.onclick=()=>void fn(); return el; };
export function setupParentStart({ endpoint, getSnapshot, mutate, navigate }) {
  const style=node('link'); style.rel='stylesheet'; style.href='/guard-admin/cloud-parent-setup.css'; document.head.append(style);
  const dialog=node('dialog','','parent-setup-dialog parent-start-dialog'); dialog.setAttribute('aria-labelledby','parent-start-title');
  const frame=node('div','','setup-frame'), header=node('header'), title=node('h2'), progress=node('p','','setup-progress'); title.id='parent-start-title';
  const body=node('div','','setup-body'), error=node('p','','setup-error'), footer=node('footer'); error.setAttribute('role','alert');
  const later=button('Save and close',()=>save(true)), back=button('Back',()=>move(-1)), next=button('Continue',()=>move(1),true);
  header.append(progress,title);footer.append(later,back,next);frame.append(header,body,error,footer);dialog.append(frame);document.body.append(dialog);
  const sections=setupSections({dialog,body,footer,navigate,onReturn:()=>render()});
  let state=null,index=0,busy=false,started=false,previousFocus=null,pending=[];
  const launch=button('Family setup',()=>open(),true); launch.id='parent-start-guide';
  (document.querySelector('#overview-actions') || document.querySelector('#tab-overview .tab-header'))?.append(launch);
  const settingsLaunch=button('Family setup',()=>open()); document.querySelector('#tab-settings .tab-header')?.append(settingsLaunch);
  const welcome=node('section','','cloud-panel parent-start-welcome'); welcome.hidden=true;
  welcome.append(node('h2','Start with the essentials'),node('p','Add your children, choose school and activities, then connect their Windows computer. You can explore the other tools later.'),button('Set up my family',()=>open(),true));
  document.querySelector('#tab-overview .tab-header')?.after(welcome);
  async function request(action,data={}) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({action,...data})});
    const value=await response.json();if(!response.ok)throw Error(value.error || 'Setup could not be saved.');return value;
  }
  const children=()=>getSnapshot()?.students.filter(child=>!child.archived_at)||[];
  function status() { progress.textContent=`Step ${index+1} of ${steps.length}`; back.disabled=index===0; next.textContent=index===3?'Finish setup':'Continue'; }
  async function open() {
    if(busy || dialog.open || !getSnapshot())return;
    busy=true;launch.disabled=settingsLaunch.disabled=true; previousFocus=document.activeElement;
    try { state=await request('get-setup');index=state.completed?0:Math.max(0,steps.findIndex(step=>step.id>=state.step));render();dialog.showModal(); }
    catch(failure) { state=null;title.textContent='Family setup';progress.textContent='';body.replaceChildren(button('Try again',()=>{dialog.close();void open();}),button('Close',()=>dialog.close()));error.textContent=failure.message;footer.hidden=true;dialog.showModal(); }
    finally {busy=false;launch.disabled=settingsLaunch.disabled=false;}
  }
  async function persist(target=index,complete=false) {
    // Never default-enable activities or approve libraries merely by viewing setup.
    for(const commit of pending)await commit();
    const unlock=lockControls(body);
    try {state=await request('save-setup',{revision:state.revision,guideVersion:2,catalogVersion:state.catalog.version,
      step:steps[target].id,completed:complete || state.completed,features:state.features,contentChoices:state.contentChoices});}
    finally{unlock();}
  }
  async function save(close=false) {
    if(busy||!state)return; busy=true;const unlock=lockControls(footer);error.textContent='';
    try {await persist();if(close)dialog.close();return true;}
    catch(failure){error.textContent=failure.message;return false;}
    finally{busy=false;unlock();status();}
  }
  async function move(direction) {
    if(busy)return;busy=true;const unlock=lockControls(footer);error.textContent='';
    try {
      // Save entered children/schools before validating the next step.
      for(const commit of pending)await commit();
      if(direction>0 && index===0 && !children().length)throw Error('Add at least one child to continue. You can also save and close.');
      if(direction>0 && index===1 && children().some(child=>!child.main_school?.provider))throw Error('Choose a school for each child, or select No online school.');
      if(index===3 && direction>0){await persist(index,true);welcome.hidden=true;dialog.close();navigate('overview');return;}
      const target=Math.max(0,Math.min(3,index+direction));await persist(target);index=target;render();
    }catch(failure){error.textContent=failure.message;}
    finally{busy=false;unlock();status();}
  }
  async function section(tab) {if(!await save())return;try{sections.open(tab);}catch(failure){error.textContent=failure.message;}}
  function detail(label,copy,fn) {const row=node('div','','parent-start-choice');row.append(node('strong',label),node('p',copy),button(label,fn));return row;}
  function activityPicker() {
    let captured=structuredClone(getSnapshot()),cards=familyPlanCards(captured),dirty=false;
    const common=new Set(['typing','spelling','vocabulary','poems','logic']);
    const grid=node('div','','parent-start-activities'),extras=node('details','','parent-start-more');
    extras.append(node('summary','More learning, media & creative activities'));const extraGrid=node('div','','parent-start-activities');extras.append(extraGrid);
    const notice=node('p','Changes here apply to all your children when you continue or save. Customize individual children afterward in Daily Plan.','setup-copy');
    for(const card of cards.filter(card=>!card.portal)){
      if(state.features[card.module]===false && card.placement!=='blocked'){card.previousPlacement=card.placement;card.placement='blocked';}
      const row=node('label','','parent-start-activity'),input=node('input'),words=node('span');input.type='checkbox';input.checked=card.placement!=='blocked';input.disabled=card.globallyDisabled===true;
      row.style.setProperty('--activity-accent',activityAccent(card));words.append(node('strong',card.title));
      if(card.preset==='quizlet')words.append(node('small','Optional · sign in on the child’s computer'));
      input.onchange=()=>{if(card.placement!=='blocked')card.previousPlacement=card.placement;card.placement=input.checked?card.previousPlacement||'anytime':'blocked';card.accessChanged=true;if(input.checked&&state.features[card.module]===false)state.features[card.module]=true;dirty=true;};
      row.append(input,words);(common.has(card.module)?grid:extraGrid).append(row);
    }
    body.append(grid,extras,notice);
    pending.push(async()=>{
      if(!dirty)return;
      const template=templateFromCards(cards),payload=applyFamilyPlan(captured,template,children().map(child=>child.id));
      await mutate('save-subjects',{...payload,dailyPlanTemplate:template});
      dirty=false;captured=structuredClone(getSnapshot());
    });
  }
  function render() {
    footer.hidden=false;pending=[];body.replaceChildren();error.textContent='';title.textContent=steps[index].title;status();
    if(index===0){
      body.append(node('p','Add everyone now. You can use one family plan and adjust it for each child.','setup-copy'));
      pending.push(inlineChildren({host:body,getSnapshot,mutate,onError:failure=>{error.textContent=failure.message;}}));
    }else if(index===1){
      body.append(node('p','Choose Abeka, BJU, another school website, or No online school. Sign into school websites later on the child’s computer.','setup-copy'));
      for(const child of children())pending.push(inlineSchool({host:body,student:child,getSnapshot,mutate,onError:failure=>{error.textContent=failure.message;}}));
      const optional=node('details');optional.append(node('summary','Optional: school hours and days off'),button('School calendar',()=>section('calendar')));body.append(optional);
    }else if(index===2){
      body.append(node('p','Keep the activities you want; uncheck anything your children should not have. Their school choices stay as you set them.','setup-copy'));
      activityPicker();
      const advanced=node('details');advanced.append(node('summary','Optional: goals, hours & individual plans'),button('Open Daily Plan',()=>section('daily-plan')),node('p','In Daily Plan, use School for required work, Open after school for earned activities, and Not allowed to hide an activity. Quizlet starts in Not allowed.','setup-copy'));body.append(advanced);
    }else{
      body.append(node('p','Install the Windows child app on the computer your child will use. Approve its pairing code in your account, then assign it to the right child.','setup-copy'));
      const account=node('a','Download & connect a computer','btn btn-primary');account.href='/guard/account/';account.target='_blank';account.rel='noopener';body.append(account);
      const count=(getSnapshot().devices||[]).filter(device=>!device.revoked_at && device.student_id).length;
      body.append(node('p',count?`${count} computer${count===1?' is':'s are'} already assigned. You can connect more later.`:'You can finish setup now and connect a computer later.','setup-copy'));
      body.append(node('h3','You can explore these later'),node('p','Music libraries, spelling lists, poems, rewards and reports are available from the dashboard when you need them.','setup-copy'));
      body.append(detail('Review Daily Plan','Check the family plan or customize one child.',()=>section('daily-plan')));
    }
    body.scrollTop=0;decorateSetup(dialog);
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(!state)dialog.close();else void save(true);});
  dialog.addEventListener('close',()=>previousFocus?.isConnected && previousFocus.focus());
  return {open, update(){
    welcome.hidden=children().length>0;
    if(started||!getSnapshot())return;started=true;
    // Existing families are not forced through another setup tour.
    if(!children().length)void open();
  }};
}
