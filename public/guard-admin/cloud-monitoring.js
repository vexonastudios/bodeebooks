import { connectionState, todaySeconds, subjectProgress, assignmentFor } from './cloud-workspace-model.js';

const mediaTypes = [['music','Music','music'],['video','Video','video'],['audiobook','Audiobooks','headphones']];
const colors = ['#a78bfa','#34d399','#38bdf8','#f472b6','#fbbf24','#818cf8'];
const seconds = value => Math.max(0, Math.floor(Number(value) || 0));
export function clockTime(value) {
  if (value == null) return '—';
  const n=seconds(value);return `${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
}
const duration = value => value < 60 ? '<1m' : value < 3600 ? `${Math.floor(value/60)}m` : `${Math.floor(value/3600)}h ${Math.floor(value/60)%60}m`;
export function monitoringChildren(snapshot) {
  const now=Date.parse(snapshot.serverTime),subjects=snapshot.rules?.subjects||[];
  return snapshot.students.filter(s=>!s.archived_at).map((student,index)=>{
    const devices=snapshot.devices.filter(d=>d.student_id===student.id).sort((a,b)=>(Date.parse(b.last_seen_at)||0)-(Date.parse(a.last_seen_at)||0));
    const device=devices.find(d=>connectionState(d,now)==='Connected')||devices[0];
    const online=!!device&&connectionState(device,now)==='Connected';
    const current=online?subjects.find(s=>s.id===device.current_subject):null;
    const goals=subjects.filter(s=>s.active!==false&&assignmentFor(s,student.id)?.active!==false&&assignmentFor(s,student.id)).map(subject=>{
      const progress=subjectProgress(snapshot,student.id,subject.id);
      const claim=snapshot.monitoring?.completions?.find(c=>c.student_id===student.id&&c.subject_id===subject.id);
      const portal=subject.isSchoolPortal===true;
      const elapsed=progress?.seconds??0,goal=progress?.goalMinutes??30;
      const complete=portal ? !!claim?.completed&&['provider','parent','legacy-saved'].includes(claim.source)
        : goal>0&&elapsed>=goal*60||!!claim?.completed&&(goal<=0||elapsed>=Math.ceil(goal*48));
      return {id:subject.id,label:subject.title,icon:subject.icon||'book-open',url:subject.url,seconds:elapsed,complete,
        required:!subject.isReward&&(subject.accessTier||'school')==='school'};
    });
    const media=Object.fromEntries(mediaTypes.map(([kind])=>[kind,snapshot.monitoring?.media?.find(row=>row.studentId===student.id&&row.kind===kind)||{seconds:0,unlocked:false}]));
    const activity=goals.filter(g=>g.seconds>0).map(g=>({...g}));
    for(const [kind,label,icon]of mediaTypes){const used=seconds(media[kind].seconds);if(!used)continue;
      const existing=activity.find(row=>row.url===`app://${({video:'videos',audiobook:'audiobooks'})[kind]||kind}`);
      if(existing)existing.seconds=Math.max(existing.seconds,used);else activity.push({label,icon,seconds:used});
    }
    activity.sort((a,b)=>b.seconds-a.seconds);
    const required=goals.filter(g=>g.required);
    return {student,devices,device,online,current,media,activity,goals,color:colors[index%colors.length],
      total:todaySeconds(snapshot,student.id),currentSeconds:current?goals.find(g=>g.id===current.id)?.seconds:null,
      done:required.filter(g=>g.complete).length,required:required.length,
      courses:(snapshot.portalProgress||[]).filter(p=>p.student_id===student.id).flatMap(p=>p.courses)};
  });
}
function node(tag,className='',text=''){const el=document.createElement(tag);el.className=className;el.textContent=text;return el;}
function icon(name){const el=node('i');el.dataset.lucide=/^[a-z][a-z0-9-]*$/.test(name)?name:'book-open';el.setAttribute('aria-hidden','true');return el;}
function button(label,glyph,callback,className='monitor-control'){
  const el=node('button',className);el.type='button';el.append(icon(glyph),node('span','',label));el.onclick=()=>callback(el);return el;
}
function ring(model){
  const box=node('div','monitor-completion-ring'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 36 36');
  for(const [cls,dash]of [['ring-bg',null],['ring-fill',model.required?`${100*model.done/model.required} 100`:'0 100']]){
    const circle=document.createElementNS(svg.namespaceURI,'circle');
    for(const [k,v]of Object.entries({cx:18,cy:18,r:15.9,class:cls,...(dash?{'stroke-dasharray':dash,'stroke-dashoffset':25,stroke:model.color}:{})}))circle.setAttribute(k,v);
    svg.append(circle);
  }
  box.title=`${model.done} of ${model.required} subject goals completed`;box.append(svg,node('span','ring-label',`${model.done}/${model.required}`));return box;
}
export function setupMonitoring({getSnapshot,mutate,navigate,openMessages,showError,mobile}){
  const grid=document.getElementById('overview-grid');
  const stats=node('div','command-center cloud-monitor-stats');stats.id='cloud-monitor-stats';grid.before(stats);
  const assistant=node('form','cloud-overview-assistant');
  const input=node('input');input.placeholder='Ask about settings, activities or your dashboard…';input.setAttribute('aria-label','Ask BodeeGuard');input.maxLength=1500;
  const title=node('div','cloud-overview-assistant-title');title.append(icon('sparkles'),node('strong','','Ask BodeeGuard'));
  const ask=node('button','btn btn-primary','Ask');ask.type='submit';assistant.append(title,input,ask);stats.before(assistant);
  assistant.onsubmit=event=>{event.preventDefault();document.getElementById('parent-assistant-launcher').click();const target=document.getElementById('parent-assistant-input');target.value=input.value;target.dispatchEvent(new Event('input',{bubbles:true}));target.focus();if(input.value.trim())document.getElementById('parent-assistant-form').requestSubmit();};
  async function run(control,callback,notice){
    control.disabled=true;
    try{await callback();if(notice)showError(notice,false);}catch(error){showError(error.message,true);}
    finally{if(control.isConnected)control.disabled=false;}
  }
  function mediaControl(model,kind,label,glyph){
    const row=node('div','monitor-media-action');row.dataset.media=kind;
    const unlocked=model.media[kind].unlocked;
    const change=extra=>mutate('media',{path:`/api/${kind==='audiobook'?'audiobooks':kind}/quick-control`,method:'POST',requestId:crypto.randomUUID(),body:{student_id:model.student.id,...extra}});
    const main=button(unlocked?`${label} unlocked`:kind==='audiobook'?'Bypass Audiobooks':`Unlock ${label}`,unlocked?'lock-open':glyph,
      el=>run(el,()=>change({operation:'override',unlocked:!unlocked}),'Saved. The child receives the change when connected.'),'monitor-media-main');
    main.dataset.cloudMutation='true';main.title=unlocked?'Restore the usual school and schedule requirements':'Bypass school and schedule requirements for today. The daily time limit still applies.';
    const menu=node('details','monitor-media-time-menu'),summary=node('summary');summary.append(icon('plus'));summary.setAttribute('aria-label',`Add ${label.toLowerCase()} time for ${model.student.name}`);
    const options=node('div','monitor-media-time-popover');options.append(node('strong','',`Extra ${label.toLowerCase()} time today`));
    for(const minutes of [15,30,60]){const add=button(`+${minutes} minutes`,'clock-plus',el=>run(el,async()=>{await change({operation:'extra-time',minutes});menu.open=false;}),'btn btn-secondary');add.dataset.cloudMutation='true';options.append(add);}
    menu.append(summary,options);row.append(main,menu);return row;
  }
  function render(){
    const snapshot=getSnapshot();if(!snapshot)return;
    mobile()?.update(snapshot);
    const models=monitoringChildren(snapshot);grid.replaceChildren();stats.replaceChildren();
    const online=snapshot.devices.filter(d=>connectionState(d,Date.parse(snapshot.serverTime))==='Connected').length;
    for(const [glyph,value,total,label]of [['activity',models.filter(m=>m.online&&m.current&&!m.device.locked).length,models.length,'Studying'],['laptop',online,snapshot.devices.length,'Computers connected'],['circle-check',models.reduce((n,m)=>n+m.done,0),models.reduce((n,m)=>n+m.required,0),'Subject goals done']]){
      const stat=node('div','cc-stat'),copy=node('div','cc-stat-body'),count=node('span','cc-stat-value',String(value));count.append(node('span','cc-of',` / ${total}`));copy.append(count,node('span','cc-stat-label',label));stat.append(icon(glyph),copy);stats.append(stat);
    }
    const asOf=node('div','cloud-monitor-asof');asOf.append(node('strong','',new Date(snapshot.serverTime).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})),node('span','','Last refreshed'));stats.append(asOf);
    for(const model of models){
      const {student,device}=model;
      const card=node('article',`monitor-card cloud-monitor-card ${model.online?'monitor-card--active':'monitor-card--idle'}`);card.dataset.studentId=student.id;
      const top=node('div','monitor-card-top'),identity=node('div','monitor-card-identity'),avatar=node('span','monitor-avatar',student.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('').toUpperCase());avatar.style.setProperty('--child-color',model.color);
      const names=node('div','monitor-name-status');names.append(node('h2','monitor-name',student.name),node('p',`monitor-status-badge ${model.online?'active':'idle'}`,!device?'No computer connected':device.locked?'School paused':model.online?model.current?.title||'Dashboard':'Not connected'));
      identity.append(avatar,names);top.append(identity,ring(model));card.append(top);
      const clocks=node('div','monitor-timer-row');
      for(const [label,time,cls]of [['School today',model.total,''],['Subject today',model.currentSeconds,' monitor-timer-current']]){const box=node('div','monitor-timer-box');box.append(node('span','monitor-timer-label',label),node('span','monitor-timer-value'+cls,clockTime(time)));clocks.append(box);}
      clocks.title='Received school time and today’s time in the current subject. Values stay fixed until refresh.';card.append(clocks);
      const activity=node('div','monitor-activity-section'),head=node('div','monitor-activity-heading');head.append(node('span','','Used today'),node('span','','Module time'));activity.append(head);
      const list=node('div','monitor-activity-list');
      for(const item of model.activity){const row=node('div','monitor-activity-row');row.append(icon(item.icon),node('span','monitor-activity-name',item.label));if(item.complete)row.append(node('span','monitor-activity-done','✓'));row.append(node('span','monitor-activity-time',duration(item.seconds)));list.append(row);}
      if(!model.activity.length)list.append(node('p','monitor-activity-empty','No activity received today.'));activity.append(list);card.append(activity);
      if(model.courses.length){const lessons=node('div','cloud-abeka-courses');lessons.setAttribute('aria-label',"Today's Abeka lessons");for(const c of model.courses)lessons.append(node('span',`cloud-abeka-course${c.completed?' complete':''}`,`${c.completed?'✓':'○'} ${c.courseName}`));card.append(lessons);}
      const actions=node('div','cloud-monitor-actions');
      const shot=button('Snap Screen','camera',el=>run(el,async()=>{await mutate('request-screenshot',{studentId:student.id});navigate('screenshots');}),'monitor-control monitor-control--screenshot');shot.disabled=!device;shot.dataset.requiresDevice=String(!!device);shot.dataset.cloudMutation='true';actions.append(shot);
      for(const args of mediaTypes)actions.append(mediaControl(model,...args));
      const pair=node('div','monitor-student-actions');
      const pause=button(device?.locked?'Resume school':'Pause school',device?.locked?'play':'lock-keyhole',el=>run(el,()=>mutate('set-school-pause',{deviceId:device.id,locked:!device.locked})),'monitor-student-action monitor-student-action--lock');pause.disabled=!device;pause.dataset.requiresDevice=String(!!device);pause.dataset.cloudMutation='true';
      pair.append(pause,button('Message','send',()=>openMessages(student.id),'monitor-student-action monitor-student-action--message'));actions.append(pair);card.append(actions);
      if(!device){const connect=button('Connect a computer','laptop',()=>navigate('settings'),'monitor-connect-link');card.append(connect);}
      mobile()?.decorateCard(card,student.id,model);grid.append(card);
    }
    if(!models.length)grid.append(node('p','cloud-panel','Add your children in Students to see them here.'));
    window.lucide?.createIcons();
  }
  return {render};
}
