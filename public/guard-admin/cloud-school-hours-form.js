function node(tag, text = '', className = '') {
  const element = document.createElement(tag); element.textContent = text; element.className = className; return element;
}
function setupField(title, name, value, type) {
  const label = node('label', '', 'setup-field'), input = node('input');
  input.name = name; input.type = type; input.value = value;
  label.append(node('span', title), input); return { label, input };
}

// The onboarding step and Calendar editor use the same fields and save format.
export function schoolHoursForm(schedule, { startSetup = false, now = () => Date.now() } = {}) {
  const current = { enabled:false, timeZone:'America/Chicago', days:[1,2,3,4,5], start:'08:00', end:'15:00', breaks:[], exceptions:[], ...schedule };
  const attendance = { enabled:false, graceMinutes:10, requiredActiveSeconds:120, coinsPerLateMinute:1, maxPenaltyCoins:30, onTimeBonusCoins:5, ...current.attendance };
  const form = node('div', '', 'school-hours-form'); form.onsubmit = event => event.preventDefault();
  const toggle = (name, title, checked) => { const label=node('label','','school-hours-toggle'),input=node('input'); input.type='checkbox'; input.name=name; input.checked=checked; label.append(input,node('span',title)); return {label,input}; };
  const first = setupField('First day of school', 'termStart', current.termStart || '', 'date');
  const last = setupField('End date', 'termEnd', current.termEnd || '', 'date');
  const modeLabel = node('label', '', 'setup-field'), mode = node('select');
  mode.name = 'termEndMode';
  for (const [value, label] of [['open','Decide later'], ['count','Count school days'], ['date','Choose a date']]) {
    mode.add(new Option(label, value));
  }
  mode.value = current.schoolDayCount ? 'count' : current.termEnd ? 'date' : 'open';
  modeLabel.append(node('span', 'Last day of school'), mode);
  const count = setupField('Number of school days', 'schoolDayCount', current.schoolDayCount ?? '', 'number');
  count.input.min = '1'; count.input.step = '1';
  const countHint = node('p', 'For one Abeka lesson per school day, enter the lessons left as of your first day. Vacations and changes to school days update the estimate.', 'school-hours-note');
  const projected = node('p', '', 'school-hours-projection'); projected.setAttribute('role', 'status');
  const dates = node('fieldset', '', 'school-hours-dates');
  const today = node('button', 'Use today', 'btn btn-secondary'); today.type = 'button';
  dates.append(node('legend', 'School year'));
  const firstRow = node('div', '', 'school-hours-first-date'); firstRow.append(first.label, today);
  dates.append(firstRow, modeLabel, last.label, count.label, countHint, projected); form.append(dates);
  const enabled=toggle('enabled','Use these school days and hours',current.enabled || startSetup); form.append(enabled.label);
  const zoneLabel=node('label','','setup-field'),zone=node('select'); zone.name='timeZone';
  for(const value of new Set([current.timeZone,Intl.DateTimeFormat().resolvedOptions().timeZone,'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'])) { const option=node('option',value.replaceAll('_',' '));option.value=value;zone.append(option); }
  zone.value=current.timeZone;zoneLabel.append(node('span','School time zone'),zone);form.append(zoneLabel);
  today.onclick = () => {
    first.input.value = window.BODEE_CLOUD_SCHEDULE.cloudSchoolDateParts(zone.value, now()).localDate;
    first.input.dispatchEvent(new Event('input', { bubbles: true }));
    mode.focus();
  };
  const days=node('fieldset','','school-hours-days');days.append(node('legend','School days'));
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((name,index)=>days.append(toggle(`day-${index}`,name,current.days.includes(index)).label));form.append(days);
  for(const [name,title] of [['start','School start time'],['end','School end time']]) {
    const field=setupField(title,name,current[name],'time');field.input.required=true;form.append(field.label);
  }
  const coins=node('fieldset','','school-hours-coins');coins.append(node('legend','On-time rewards & late coins'));
  const late=toggle('attendanceEnabled','Use attendance coins',attendance.enabled);coins.append(late.label);
  coins.append(node('p','Children check in by doing schoolwork. They can earn coins for starting on time or lose coins after the grace period. Days off never cost coins.','school-hours-note'));
  const options=node('div','','school-hours-options');
  for(const [name,title,max]of [['graceMinutes','Grace period (minutes)',120],['requiredActiveSeconds','Schoolwork to check in (seconds)',900],['coinsPerLateMinute','Coins per late minute',20],['maxPenaltyCoins','Maximum coins lost per day',500],['onTimeBonusCoins','On-time bonus coins',100]]) {
    const field=setupField(title,name,attendance[name],'number');field.input.min=name==='requiredActiveSeconds'?'30':'0';field.input.max=String(max);field.input.step='1';field.input.required=true;options.append(field.label);
  }
  const preview=node('p','','school-hours-preview');preview.setAttribute('role','status');coins.append(preview);
  const effective=node('p','Coin changes start tomorrow. You can excuse a late start and return its coins.','school-hours-note');
  coins.append(options,effective);form.append(coins);
  function schoolDays() {
    return [0,1,2,3,4,5,6].filter(day => form.querySelector(`[name="day-${day}"]`).checked);
  }
  function update() {
    const counting = mode.value === 'count', fixed = mode.value === 'date';
    first.input.required = counting || fixed;
    last.label.hidden = last.input.disabled = !fixed;
    last.input.required = fixed;
    count.label.hidden = count.input.disabled = countHint.hidden = !counting;
    count.input.required = counting;
    last.input.min=first.input.value;
    projected.textContent = '';
    if (counting && first.input.value && count.input.value) {
      try {
        const plan = window.BODEE_CLOUD_SCHEDULE.planCloudSchoolSchedule({...current, termStart:first.input.value,
          schoolDayCount:count.input.valueAsNumber, days:schoolDays()});
        const finish = new Date(plan.termEnd + 'T12:00:00Z').toLocaleDateString(undefined, {dateStyle:'long', timeZone:'UTC'});
        projected.textContent = 'Projected last day · ' + finish;
      } catch (error) { projected.textContent = error.message; }
    }
    projected.hidden = !projected.textContent;
    late.input.disabled=!enabled.input.checked;
    const active=enabled.input.checked&&late.input.checked;
    options.hidden=!active; effective.hidden=!active; preview.hidden=!active;
    options.querySelectorAll('input').forEach(input=>input.disabled=!active);
    const get=name=>form.querySelector(`[name=${name}]`).value;
    preview.textContent=active ? `School starts at ${get('start')}, with ${get('graceMinutes')} minutes of grace. Check-in takes ${get('requiredActiveSeconds')} seconds of schoolwork. After grace, deduct ${get('coinsPerLateMinute')} coins per late minute, up to ${get('maxPenaltyCoins')} per day. An on-time start earns ${get('onTimeBonusCoins')} coins.` : '';
  }
  form.addEventListener('input',update);form.addEventListener('change',update);update();
  return {form,read() {
    update();
    const controls=[...form.querySelectorAll('input,select')];
    if(controls.some(input=>!input.reportValidity()))throw Error('Check the highlighted school settings.');
    const values=new FormData();for(const input of controls)if(!input.disabled&&(input.type!=='checkbox'||input.checked))values.append(input.name,input.value);
    const result={...current,enabled:enabled.input.checked,timeZone:zone.value,days:schoolDays(),start:values.get('start'),end:values.get('end'),termStart:values.get('termStart')||null,termEnd:values.get('termEnd')||null,
      schoolDayCount:mode.value==='count'?count.input.valueAsNumber:null,
      attendance:{...attendance,enabled:enabled.input.checked&&late.input.checked}};
    for(const name of ['graceMinutes','requiredActiveSeconds','coinsPerLateMinute','maxPenaltyCoins','onTimeBonusCoins'])if(values.has(name))result.attendance[name]=Number(values.get(name));
    return window.BODEE_CLOUD_SCHEDULE.planCloudSchoolSchedule(result);
  }};
}

export function inlineSchoolHours({host,getSnapshot,mutate}) {
  const captured=structuredClone(getSnapshot()),fields=schoolHoursForm(captured.rules.schedule);let dirty=false;
  fields.form.addEventListener('input',()=>{dirty=true;});fields.form.addEventListener('change',()=>{dirty=true;});host.append(fields.form);
  return async()=>{if(!dirty)return;const schedule=fields.read();await mutate('save-subjects',{subjects:captured.rules.subjects,schedule,revision:captured.rules.revision});captured.rules=structuredClone(getSnapshot().rules);dirty=false;};
}
