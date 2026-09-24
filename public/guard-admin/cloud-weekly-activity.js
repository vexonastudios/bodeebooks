import { weekStart,shiftDate,timeLabel,weeklyTotals } from './cloud-weekly-activity-model.js';
import { activityAccent } from './cloud-activity-colors.js';
const node=(tag,className='',text='')=>{const el=document.createElement(tag);el.className=className;el.textContent=text;return el;};
const icon=name=>{const el=node('i');el.dataset.lucide=/^[a-z][a-z0-9-]*$/.test(name)?name:'book-open';el.setAttribute('aria-hidden','true');return el;};
const formatDate=date=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date));
function button(text,glyph,action){const el=node('button','btn btn-secondary');el.type='button';el.append(icon(glyph),node('span','',text));el.addEventListener('click',action);return el;}
export function setupWeeklyActivity({endpoint,getSnapshot}){
 let active=true,start='',currentWeek='',zone='',report=null,busy=false,generation=0,controller=null,loadedKey='';
 const cache=new Map();
 const root=node('details','cloud-weekly');root.id='cloud-weekly-activity';
 const summary=node('summary'),intro=node('div');intro.append(node('strong','','Weekly activity time'),node('span','','See each child’s daily totals and time by activity.'));
 summary.append(icon('chart-no-axes-combined'),intro,icon('chevron-down'));root.append(summary);
 document.getElementById('overview-grid').after(root);
 const body=node('div','weekly-body'),toolbar=node('div','weekly-toolbar'),childLabel=node('label','','Child'),child=node('select');child.id='weekly-child';childLabel.htmlFor=child.id;childLabel.append(child);
 const navigation=node('div','weekly-navigation'),range=node('strong');range.id='weekly-range';
 const previous=button('Previous week','chevron-left',()=>{start=shiftDate(start,-7);load();});previous.id='weekly-previous';
 const next=button('Next week','chevron-right',()=>{if(start<currentWeek){start=shiftDate(start,7);load();}});next.id='weekly-next';
 const thisWeek=button('This week','calendar-days',()=>{start=currentWeek;load();});thisWeek.id='weekly-current';
 const refresh=button('Refresh time','refresh-cw',()=>load(true));refresh.id='weekly-refresh';
 navigation.append(previous,range,next,thisWeek);toolbar.append(childLabel,navigation,refresh);
 const status=node('p','weekly-status');status.id='weekly-status';status.setAttribute('role','status');
 const results=node('div');results.id='weekly-results';
 const note=node('p','weekly-note','Time recorded in BodeeGuard. Offline time appears after syncing. Media counts playback; games count play time. Activities can overlap, so these totals are not total computer screen time.');
 body.append(toolbar,status,results,note);root.append(body);
 function controls(){previous.disabled=!child.value;next.disabled=!child.value||start>=currentWeek;thisWeek.disabled=!child.value||start===currentWeek;refresh.disabled=!child.value||busy;const end=start?shiftDate(start,6):'';range.textContent=start?formatDate(start)+(start.slice(0,4)!==end.slice(0,4)?', '+start.slice(0,4):'')+' – '+formatDate(end)+', '+end.slice(0,4):'';root.setAttribute('aria-busy',String(busy));}
 function cancel(){generation++;controller?.abort();controller=null;busy=false;controls();}
 function render(){
  results.replaceChildren();const totals=weeklyTotals(report);
  status.textContent=report.truncated?'Some records could not fit in this report. The totals below are partial.':report.studentName+' · '+report.timeZone+' · Updated '+new Date(report.generatedAt).toLocaleTimeString([],{timeZone:report.timeZone,hour:'numeric',minute:'2-digit'});
  if(!totals.activities.length){results.append(node('p','weekly-empty','No activity recorded for this week yet. Time appears here after the child’s computer syncs.'));return;}
  const metrics=node('div','weekly-metrics');
  for(const [label,value]of [['Recorded activity',timeLabel(totals.total)],['Days with activity',totals.daily.filter(n=>n>0).length+' of 7'],['Most used',totals.activities[0].label]]){const metric=node('div');metric.append(node('span','',label),node('strong','',value));metrics.append(metric);}results.append(metrics);
  const chart=node('div','weekly-chart');chart.setAttribute('aria-label','Daily activity totals');const max=Math.max(...totals.daily,1);
  totals.dates.forEach((date,index)=>{
   const column=node('div','weekly-day'),track=node('div','weekly-bar-track'),bar=node('div','weekly-bar');bar.style.height=(totals.daily[index]/max*100)+'%';bar.setAttribute('aria-hidden','true');
   for(const activity of totals.activities)if(activity.days[index]){const part=node('span');part.style.flex=String(activity.days[index]);part.style.backgroundColor=activityAccent(activity);bar.append(part);}
   track.append(bar);column.append(node('strong','',timeLabel(totals.daily[index])),track,node('span','',new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(date))),node('small','',formatDate(date)));chart.append(column);
  });results.append(chart);
  const wrap=node('div','weekly-table-wrap'),table=node('table','weekly-table'),caption=node('caption','','Time by activity and day'),head=node('thead'),heading=node('tr'),rows=node('tbody');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Weekly activity detail; scroll to see every day');
  for(const label of ['Activity','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Week']){const th=node('th','',label);th.scope='col';heading.append(th);}head.append(heading);table.append(caption,head,rows);
  for(const activity of totals.activities){const tr=node('tr'),name=node('th');name.scope='row';name.style.setProperty('--activity-accent',activityAccent(activity));const title=node('span','weekly-activity-name');title.append(icon(activity.icon||'book-open'),node('span','',activity.label));name.append(title);tr.append(name);for(const amount of [...activity.days,activity.total])tr.append(node('td','',timeLabel(amount)));rows.append(tr);}
  const foot=node('tfoot'),totalRow=node('tr'),totalTitle=node('th','','Total');totalTitle.scope='row';totalRow.append(totalTitle);for(const amount of [...totals.daily,totals.total])totalRow.append(node('td','',timeLabel(amount)));foot.append(totalRow);table.append(foot);wrap.append(table);results.append(wrap);window.lucide?.createIcons();
 }
 async function load(force=false){
  cancel();report=null;results.replaceChildren();if(!active||!root.open||!child.value||!start){status.textContent=child.value?'':'Add a child to see weekly activity.';return;}
  const key=[child.value,start,zone].join('|'),cached=cache.get(key);loadedKey=key;
  if(!force&&cached&&Date.now()-cached.at<60000){report=cached.report;render();return;}
  const turn=generation,studentId=child.value,end=shiftDate(start,6);controller=new AbortController();const request=controller,timeout=setTimeout(()=>request.abort(),15000);
  busy=true;controls();status.textContent='Loading this child’s week…';
  try{
   const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:request.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'weekly-activity',studentId,start,end})});
   const data=await response.json();if(turn!==generation)return;
   if(!response.ok)throw Error(data.error||'Weekly activity could not load.');
   if(data.studentId!==studentId||data.start!==start||data.end!==end||!Array.isArray(data.rows))throw Error('The report did not match this child and week.');
   report=data;cache.set(key,{at:Date.now(),report});if(cache.size>8)cache.delete(cache.keys().next().value);render();
  }catch(error){if(turn===generation){loadedKey='';status.textContent=(error.name==='AbortError'?'The request timed out.':error.message)+' Select Refresh time to try again.';}}
  finally{clearTimeout(timeout);if(turn===generation){busy=false;controls();}}
 }
 function update(){
  const snapshot=getSnapshot();if(!snapshot)return;
  const prior=child.value,oldZone=zone;zone=snapshot.activityTimeZone||snapshot.rules?.schedule?.timeZone||'America/Chicago';
  const nextCurrent=weekStart(zone,Date.parse(snapshot.serverTime)||Date.now());if(!start||start===currentWeek||oldZone&&oldZone!==zone)start=nextCurrent;currentWeek=nextCurrent;
  const students=[...snapshot.students].sort((a,b)=>Number(!!a.archived_at)-Number(!!b.archived_at));
  child.replaceChildren(...students.map(student=>{const option=node('option','',student.name+(student.archived_at?' (archived)':''));option.value=student.id;return option;}));
  if(students.some(student=>student.id===prior))child.value=prior;
  controls();if(root.open&&active&&loadedKey!==[child.value,start,zone].join('|'))load();
 }
 child.addEventListener('change',()=>load());root.addEventListener('toggle',()=>{if(root.open)load();else cancel();});
 return {update,setActive(value){active=value;if(!active)cancel();else if(root.open)load();}};
}
