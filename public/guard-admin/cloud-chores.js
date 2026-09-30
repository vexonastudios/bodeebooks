const node = (tag, text = '', cls = '') => { const el=document.createElement(tag);el.textContent=text;el.className=cls;return el; };
const button = (label, action, cls='btn btn-secondary') => {const el=node('button',label,cls);el.type='button';el.onclick=()=>void action();return el;};
const targets = [['videos','Videos'],['games','Games & reward websites'],['music','Music'],['audiobooks','Audiobooks']];
const names = {submitted:'Waiting for approval',upcoming:'Upcoming',overdue:'Overdue',returned:'Please try again',open:'To do',approved:'Done',excused:'Excused',finished:'Schedule finished'};

export function setupCloudChores({endpoint,navigate}) {
  const root=document.getElementById('tab-chores');if(!root)return {setActive(){},refresh(){}};
  const css=node('link');css.rel='stylesheet';css.href='/guard-admin/cloud-chores.css';document.head.append(css);
  let data=null,busy=false,view='today',request=null,lastRead=0,active=false;
  const status=node('p','','chore-status');status.setAttribute('role','status');
  const tools=node('div','','chore-actions'),tabs=node('div','','chore-actions'),list=node('div','','chore-list');
  const settings=node('section','','cloud-panel chore-settings'),choice=node('p');
  const toggle=button('Set up chores',()=>data?.enabled?disable():change({operation:'settings',revision:data?.revision||0,enabled:true}),'btn btn-primary');
  settings.append(node('h2','Chores & Routines'),choice,toggle,button('Open chores',()=>navigate('chores')));
  document.querySelector('#tab-settings .tab-header')?.after(settings);
  const summary=button('Chores & Routines',()=>navigate('chores'),'cloud-panel chore-summary');summary.hidden=true;
  document.querySelector('#overview-grid')?.before(summary);
  const refresh=button('Refresh',()=>load(true));
  const retry=button('Retry saved change',()=>change(request));retry.hidden=true;
  const discard=button('Refresh without retrying',()=>{request=null;retry.hidden=discard.hidden=true;return load(true);});discard.hidden=true;
  tools.append(button('Add chore',()=>editor(), 'btn btn-primary'),button('Temporary chore exception',()=>exception()),refresh);
  for(const [id,label] of [['today','Today'],['pending','Needs approval'],['schedule','Schedule'],['history','History']]){
    const tab=button(label,()=>{view=id;render();});tab.dataset.view=id;tabs.append(tab);
  }
  root.replaceChildren(node('h1','Chores & Routines'),node('p','Chores are separate from school goals. Only the rewards you select pause while a required chore is unfinished.'),tools,status,retry,discard,tabs,list);
  const nav=document.querySelector('.sidebar [data-tab="chores"]');
  function updateCards(){
    for(const card of document.querySelectorAll('.monitor-card[data-student-id]')){
      let badge=card.querySelector('.chore-child-summary');
      if(!data?.enabled){badge?.remove();continue;}
      const rows=data.items.filter(r=>r.studentId===card.dataset.studentId&&r.date&&r.date<=data.date);
      const waiting=rows.filter(r=>r.status==='submitted').length;
      if(!badge){badge=button('',()=>navigate('chores'),'btn btn-secondary chore-child-summary');card.querySelector('.monitor-card-top')?.after(badge);}
      badge.textContent=`Chores: ${rows.length} remaining${waiting?` · ${waiting} awaiting approval`:''}`;
    }
  }
  function showVisibility(){
    const enabled=data?.enabled===true;
    if(nav)nav.hidden=!enabled;summary.hidden=!enabled;tools.hidden=tabs.hidden=!enabled;
    choice.textContent=enabled?'Chores are on for your family. School completion and its coins stay separate.':'Optional: assign chores, reward completion, and require chores before entertainment. Chores are currently off.';
    toggle.textContent=enabled?'Turn chores off':'Use Chores & Routines';
    let mobile=document.querySelector('#tab-mobile-more .chore-mobile-entry');
    if(!mobile){const menu=document.querySelector('#tab-mobile-more .more-list');if(menu){mobile=button('Chores & Routines',()=>navigate('chores'),'mobile-more-item chore-mobile-entry');menu.append(mobile);}}
    if(mobile)mobile.hidden=!enabled;
    window.dispatchEvent(new CustomEvent('cloud-chores-updated',{detail:{enabled}}));
  }
  function render(){
    if(!data)return;showVisibility();updateCards();list.replaceChildren();
    summary.textContent=`Chores · ${data.items.filter(r=>r.status==='submitted').length} waiting for approval · ${data.items.filter(r=>r.blocking).length} requiring attention`;
    for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.view===view));
    if(!data.enabled){list.append(node('p','Enable Chores & Routines in Settings to get started.'),button('Open Settings',()=>navigate('settings')));return;}
    const old=(data.computers||[]).filter(c=>c.studentId&&c.protocol!==1);
    if(old.length)list.append(node('p',`Update required for chore restrictions: ${old.map(c=>c.name).join(', ')}. These computers have not confirmed support for pausing entertainment.`, 'chore-warning'));
    const rows=view==='history'?data.history.filter(r=>['approved','excused'].includes(r.status)):data.items.filter(r=>view==='schedule'||view==='pending'&&r.status==='submitted'||view==='today'&&r.date&&r.date<=data.date);
    if(!rows.length)list.append(node('p',view==='pending'?'Nothing is waiting for approval.':view==='history'?'Completed and excused chores will appear here.':'No chores in this view.'));
    for(const row of rows){
      const card=node('article','','cloud-panel chore-card'),def=row.definition,child=data.students.find(s=>s.id===row.studentId)?.name||'Child';
      card.append(node('h2',`${child} · ${def.title}`),node('strong',names[row.status]||row.status),node('p',`${row.date||'Finished'} · ${def.startTime}${def.dueTime?`–${def.dueTime}`:''} · ${data.timeZone} · +${def.coins} coins when done${def.missedCoins?` · up to −${def.missedCoins} if not checked off by the deadline`:''}`));
      if(row.penaltyAssessed)card.append(node('p',row.penaltyRefunded?'Missed check-in deduction refunded.':row.penaltyAmount?`${row.penaltyAmount} coins deducted for the missed check-in.`:'Missed check-in recorded; no coins were available to deduct.'));
      if(def.instructions)card.append(node('p',def.instructions,'chore-instructions'));if(row.note)card.append(node('p',row.note));
      if(def.targets.length)card.append(node('p',`${def.targets.map(t=>targets.find(v=>v[0]===t)?.[1]).join(', ')} pause at ${def.blockFrom==='due'?def.dueTime:def.startTime} until ${def.approvalRequired?'approved':'done'}.`));
      if(row.nextDefinition)card.append(node('p','Future changes are saved. The current chore keeps its original requirements.'));
      const actions=node('div','','chore-actions');
      const decide=(operation,note)=>change({operation,id:row.id,date:row.date,revision:row.revision,...(note?{note}:{})});
      if(view!=='history'){
        if(row.available){actions.append(button(row.status==='submitted'?'Approve':'Mark done',()=>decide('approve'),'btn btn-primary'));
          if(row.status==='submitted')actions.append(button('Send back',()=>noteDialog('Send chore back','Explain what still needs doing.',note=>decide('return',note))));
          actions.append(button(row.penaltyAmount>0&&!row.penaltyRefunded?'Excuse & refund this date':'Excuse this date',()=>decide('excuse')));
          if(row.date<data.date)actions.append(button('Excuse missed dates through today',()=>noteDialog('Excuse missed dates','This forgives outstanding chore dates through today and refunds any missed check-in deduction for the current occurrence.',()=>decide('excuse-through-today'))));
        }
        if(row.date)actions.append(button('Edit',()=>editor(row)));
        actions.append(button('Stop assigning',()=>noteDialog('Stop this chore','This removes unfinished restrictions and stops future repeats. Earned coins stay unchanged.',()=>decide('archive'))));
      }
      if(row.penaltyAmount>0&&!row.penaltyRefunded)actions.append(button('Refund missed deduction',()=>noteDialog('Refund missed deduction',`Return ${row.penaltyAmount} coins to ${child}? This is useful when the chore was done but not checked off.`,()=>change({operation:'refund',id:row.id,date:row.date}))));
      card.append(actions);list.append(card);
    }
  }
  async function call(input){const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chores',...input}),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Chores could not be loaded.');return result;}
  async function load(force=false){if(busy||!force&&Date.now()-lastRead<(data?.enabled?30000:300000))return;busy=true;refresh.disabled=toggle.disabled=true;try{data=await call({operation:'list'});lastRead=Date.now();status.textContent='';render();}catch(error){status.textContent=error.message;}finally{busy=false;refresh.disabled=toggle.disabled=false;}}
  async function change(input){
    if(!input)return false;
    if(busy){status.textContent='Chores are refreshing. Please try again shortly.';return false;}
    if(request&&input!==request){status.textContent='Retry your saved change or refresh first.';return false;}
    request=input.requestId?input:{...input,requestId:crypto.randomUUID()};busy=true;root.setAttribute('aria-busy','true');
    try{data=await call(request);request=null;lastRead=Date.now();status.textContent='Saved. Connected computers will receive the change.';retry.hidden=discard.hidden=true;render();return true;}
    catch(error){status.textContent=error.message;retry.hidden=discard.hidden=false;return false;}
    finally{busy=false;root.removeAttribute('aria-busy');}
  }
  function dialog(title){const el=node('dialog','','chore-dialog'),form=node('form');form.append(node('h2',title));el.append(form);document.body.append(el);el.addEventListener('close',()=>el.remove());return {el,form};}
  function field(form,label,type,value){const wrap=node('label',label),input=node(type==='textarea'?'textarea':type==='select'?'select':'input');if(input.tagName==='INPUT')input.type=type;input.className='admin-input';if(type!=='select')input.value=value??'';wrap.append(input);form.append(wrap);return input;}
  function check(form,label,value){const wrap=node('label','','chore-check'),input=node('input');input.type='checkbox';input.checked=value;wrap.append(input,node('span',label));form.append(wrap);return input;}
  function finishDialog(el,form,save,label='Save'){
    const error=node('p');error.setAttribute('role','alert');const actions=node('div','','chore-actions'),submit=node('button',label,'btn btn-primary');submit.type='submit';actions.append(button('Cancel',()=>el.close()),submit);form.append(error,actions);
    form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{if(await save())el.close();else error.textContent=status.textContent;}catch(failure){error.textContent=failure.message;}finally{submit.disabled=false;}};el.showModal();
  }
  function noteDialog(title,copy,save){const {el,form}=dialog(title);form.append(node('p',copy));const note=field(form,'Note (optional)','textarea','');note.maxLength=300;finishDialog(el,form,()=>save(note.value),'Confirm');}
  function disable(){noteDialog('Turn chores off','Chore restrictions stop when each computer receives the update. Assignments, history and earned coins stay saved.',()=>change({operation:'settings',revision:data.revision,enabled:false}));}
  function editor(row=null){
    if(!data?.enabled)return;const {el,form}=dialog(row?'Edit chore':'Add chore'),def=row?.nextDefinition||row?.definition;
    const title=field(form,'Chore','text',def?.title||'');title.required=true;title.maxLength=100;
    const instructions=field(form,'Instructions (optional)','textarea',def?.instructions||'');instructions.maxLength=1000;
    let scope;if(row){scope=field(form,'Apply changes to','select');scope.append(new Option('Future repeats after the current chore','future'));if(row.status!=='submitted')scope.append(new Option('Current unfinished chore and future repeats','current'));form.append(node('p','Submitted work keeps its original reward and approval rule. Current edits can immediately change restrictions.'));}
    const children=[];if(!row){form.append(node('h3','Who does this chore?'));for(const child of data.students)children.push([child.id,check(form,child.name,false)]);}
    const dates=node('div','','chore-fields');form.append(dates);
    const start=field(dates,'Start date','date',def?.startDate||data.date);start.required=true;
    const end=field(dates,'Last date (optional)','date',def?.endDate||'');
    form.append(node('p','Repeat on these weekdays, or leave all unchecked for a one-time chore.'));
    const days=node('div','','chore-actions');form.append(days);const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>check(days,d,def?.days.includes(i)||false));
    const times=node('div','','chore-fields');form.append(times);const from=field(times,'Available at','time',def?.startTime||'16:00'),due=field(times,'Due at (optional)','time',def?.dueTime||'18:00');from.required=true;
    const block=field(form,'Pause selected rewards starting at','select');block.append(new Option('Chore start time','start'),new Option('Due time','due'));block.value=def?.blockFrom||'start';
    form.append(node('p','Rewards remain paused after the deadline until this chore is resolved. Leave every reward unchecked for a chore that only earns coins. School and messaging stay available.'));
    const rewards=targets.map(([id,label])=>[id,check(form,label,def?def.targets.includes(id):['videos','games'].includes(id))]);
    const coins=field(form,'Coins for completion','number',def?.coins??20);coins.min='0';coins.max='10000';coins.required=true;
    const missedCoins=field(form,'Coins to deduct if not checked off by the deadline (optional)','number',def?.missedCoins??0);missedCoins.min='0';missedCoins.max='10000';missedCoins.required=true;
    form.append(node('p','0 means no deduction. A missed check-in is assessed once after the due time, even if the chore was done but not checked off. The balance never goes below zero, and you can refund a deduction.'));
    const approval=check(form,'Parent approval required',def?.approvalRequired??true);
    finishDialog(el,form,()=>{if(Number(missedCoins.value)>0&&!due.value)throw Error('Set a due time to deduct coins for a missed check-in.');return change({operation:row?'edit':'create',...(row?{id:row.id,revision:row.revision,editScope:scope.value}:{studentIds:children.filter(([,c])=>c.checked).map(([id])=>id)}),definition:{title:title.value,instructions:instructions.value,startDate:start.value,endDate:end.value||null,days:weekdays.flatMap((c,i)=>c.checked?[i]:[]),startTime:from.value,dueTime:due.value||null,blockFrom:block.value,targets:rewards.filter(([,c])=>c.checked).map(([id])=>id),coins:Number(coins.value),missedCoins:Number(missedCoins.value),approvalRequired:approval.checked}});});
  }
  function exception(){if(!data?.enabled)return;const {el,form}=dialog('Temporary chore exception');form.append(node('p','Allow selected entertainment despite chores. Chores remain unfinished and no coins are awarded. School, time budgets and other parent locks still apply.'));
    const child=field(form,'Child','select');for(const s of data.students)child.append(new Option(s.name,s.id));
    const rewards=targets.map(([id,label])=>[id,check(form,label,['videos','games'].includes(id))]);
    const minutes=field(form,'Minutes (0 cancels the exception)','number',30);minutes.min='0';minutes.max='120';minutes.required=true;
    finishDialog(el,form,()=>change({operation:'exception',studentId:child.value,minutes:Number(minutes.value),targets:rewards.filter(([,c])=>c.checked).map(([id])=>id)}));
  }
  window.addEventListener('cloud-chores-setting-saved',()=>void load(true));
  return {setActive(value){active=value;if(value)void load(true);},refresh(force=false){updateCards();return load(force||active);}};
}
