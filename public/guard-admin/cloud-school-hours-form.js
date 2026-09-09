import { node, setupField, decorateSetup } from './cloud-setup-controls.js';

// The onboarding step and Calendar editor use the same fields and save format.
export function schoolHoursForm(schedule) {
  const current = { enabled:false, timeZone:'America/Chicago', days:[1,2,3,4,5], start:'08:00', end:'15:00', breaks:[], exceptions:[], ...schedule };
  const attendance = { enabled:false, graceMinutes:10, requiredActiveSeconds:120, coinsPerLateMinute:1, maxPenaltyCoins:30, onTimeBonusCoins:5, ...current.attendance };
  const form = node('div', '', 'school-hours-form'); form.onsubmit = event => event.preventDefault();
  const toggle = (name, title, checked) => { const label=node('label','','school-hours-toggle'),input=node('input'); input.type='checkbox'; input.name=name; input.checked=checked; label.append(input,node('span',title)); return {label,input}; };
  const enabled=toggle('enabled','Use a school calendar',current.enabled); form.append(enabled.label);
  const zoneLabel=node('label','','setup-field'),zone=node('select'); zone.name='timeZone';
  for(const value of new Set([current.timeZone,Intl.DateTimeFormat().resolvedOptions().timeZone,'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'])) { const option=node('option',value.replaceAll('_',' '));option.value=value;zone.append(option); }
  zone.value=current.timeZone;zoneLabel.append(node('span','School time zone'),zone);form.append(zoneLabel);
  const days=node('fieldset','','school-hours-days');days.append(node('legend','School days'));
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,index)=>days.append(toggle(`day-${index}`,name,current.days.includes(index)).label));form.append(days);
  for(const [name,title,type] of [['start','School starts','time'],['end','School ends','time'],['termStart','First school date (optional)','date'],['termEnd','Last school date (optional)','date']]) {
    const field=setupField(title,name,current[name]||'',type);field.input.required=type==='time';form.append(field.label);
  }
  const coins=node('fieldset','','school-hours-coins');coins.append(node('legend','On-time rewards & late coins'));
  const late=toggle('attendanceEnabled','Lose coins when school starts late',attendance.enabled);coins.append(late.label);
  coins.append(node('p','Check in after 2 minutes of schoolwork. Holidays and days off never cost coins.','school-hours-note'));
  const options=node('div','','school-hours-options');
  for(const [name,title,max]of [['graceMinutes','Grace period (minutes)',120],['coinsPerLateMinute','Coins per late minute',20],['maxPenaltyCoins','Maximum coins lost per day',500],['onTimeBonusCoins','On-time bonus coins',100]]) {
    const field=setupField(title,name,attendance[name],'number');field.input.min='0';field.input.max=String(max);field.input.step='1';field.input.required=true;options.append(field.label);
  }
  coins.append(options,node('p','Changes start tomorrow. Turn off anytime. Parents can excuse a late start and return its coins.','school-hours-note'));form.append(coins);
  function update() { late.input.disabled=!enabled.input.checked;options.querySelectorAll('input').forEach(input=>input.disabled=!enabled.input.checked||!late.input.checked); }
  enabled.input.addEventListener('change',update);late.input.addEventListener('change',update);update();decorateSetup(coins);
  return {form,read() {
    const controls=[...form.querySelectorAll('input,select')];
    if(controls.some(input=>!input.reportValidity()))throw Error('Check the highlighted school settings.');
    const values=new FormData();for(const input of controls)if(!input.disabled&&(input.type!=='checkbox'||input.checked))values.append(input.name,input.value);
    const result={...current,enabled:enabled.input.checked,timeZone:zone.value,days:[0,1,2,3,4,5,6].filter(day=>values.has(`day-${day}`)),start:values.get('start'),end:values.get('end'),termStart:values.get('termStart')||null,termEnd:values.get('termEnd')||null,
      attendance:{...attendance,enabled:enabled.input.checked&&late.input.checked}};
    for(const name of ['graceMinutes','coinsPerLateMinute','maxPenaltyCoins','onTimeBonusCoins'])if(values.has(name))result.attendance[name]=Number(values.get(name));
    return window.BODEE_CLOUD_SCHEDULE.normalizeCloudSchoolSchedule(result);
  }};
}

export function inlineSchoolHours({host,getSnapshot,mutate}) {
  const captured=structuredClone(getSnapshot()),fields=schoolHoursForm(captured.rules.schedule);let dirty=false;
  fields.form.addEventListener('input',()=>{dirty=true;});fields.form.addEventListener('change',()=>{dirty=true;});host.append(fields.form);
  return async()=>{if(!dirty)return;const schedule=fields.read();await mutate('save-subjects',{subjects:captured.rules.subjects,schedule,revision:captured.rules.revision});captured.rules=structuredClone(getSnapshot().rules);dirty=false;};
}
