/* global document, fetch, AbortSignal, crypto, structuredClone, window */
const names={math:'Math',spelling:'Spelling',vocabulary:'Vocabulary'};
export function setupChallengeSettings({endpoint,mutate}){
 const tab=document.getElementById('tab-economy');if(!tab)return{setActive(){},update(){}};
 const node=(tag,text='',cls='')=>{const el=document.createElement(tag);el.textContent=text;el.className=cls;return el;};
 const root=node('section','','settings-section cloud-challenge-settings');root.id='cloud-learning-challenges-settings';
 const title=node('h2','Learning challenges'),intro=node('p','Optional practice that earns coins immediately. Children can choose Math, Spelling, Vocabulary, or a mixed round.','settings-hint'),content=node('div'),notice=node('p','','challenge-admin-status');notice.setAttribute('role','status');
 const icon=node('i');icon.dataset.lucide='sparkles';title.prepend(icon);root.append(title,intro,notice,content);
 (tab.querySelector('.cloud-school-earnings')||tab.querySelector('.tab-header'))?.after(root);
 let active=false,busy=false,dirty=false,generation=0,data=null,selected='',retry=null;
 function field(form,label,name,type,value,min,max){const wrap=node('label',label,'challenge-admin-field'),input=node('input');input.type=type;input.name=name;if(type==='checkbox')input.checked=!!value;else{input.value=value;input.required=true;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;}wrap.append(input);form.append(wrap);return input;}
 function render(){
  content.replaceChildren();if(!data)return;
  const selector=node('select');selector.id='challenge-settings-child';for(const row of [{id:'',name:'Family defaults'},...data.students]){const option=node('option',row.name);option.value=row.id;selector.append(option);}selector.value=selected;
  const label=node('label','Settings for','challenge-admin-field');label.htmlFor=selector.id;label.append(selector);content.append(label);
  const form=node('form','','challenge-admin-form'),config=data.settings.children[selected]||data.settings.family;
  const inherit=selected?field(form,'Use family defaults','inherit','checkbox',!data.settings.children[selected]):null;
  const enabled=field(form,'Enable Earn coins challenges','enabled','checkbox',config.enabled),cap=field(form,'Maximum challenge coins per day','dailyCap','number',config.dailyCap,1,2000),rounds=field(form,'Maximum rounds per day','dailyRounds','number',config.dailyRounds,1,5),school=field(form,'Finish required schoolwork first','requireSchool','checkbox',config.requireSchool);
  const correctCoins=field(form,'Coins per independent answer','correctCoins','number',config.correctCoins,1,50),supportedCoins=field(form,'Coins per supported answer','supportedCoins','number',config.supportedCoins,0,50),completionBonus=field(form,'Bonus for finishing all corrections','completionBonus','number',config.completionBonus,0,50);
  const subjectBox=node('fieldset','','challenge-admin-wide');subjectBox.append(node('legend','Subjects and starting levels'));
  const subjects={},grades={};
  for(const [key,name]of Object.entries(names)){
    const row=node('div','','challenge-admin-subject'),choose=node('label',name),check=node('input');check.type='checkbox';check.name=key;check.checked=config.subjects.includes(key);choose.prepend(check);subjects[key]=check;
    const levelLabel=node('label','Starting level'),select=node('select');select.name=key+'Grade';select.setAttribute('aria-label',name+' starting level');
    for(const n of [null,...Array.from({length:13},(_,i)=>i)]){const option=node('option',n===null?'Use child’s grade':n===0?'Kindergarten':'Grade '+n);option.value=n===null?'':String(n);select.append(option);}select.value=config.grades[key]===null?'':String(config.grades[key]);grades[key]=select;levelLabel.append(select);row.append(choose,levelLabel);subjectBox.append(row);
  }
  form.append(subjectBox,node('p','Levels adjust within two grades of the starting level, separately for each subject. Assigned spelling and vocabulary lists are included when available.','settings-hint challenge-admin-wide'));
  form.append(node('p','An independent answer earns the full amount. Hints and successful later retries earn the supported amount. The completion bonus requires every correction to be finished correctly. Wrong answers never deduct coins. All earnings fit inside the daily cap.','settings-hint challenge-admin-wide'));
  form.append(node('p','Children choose 10 or 20 questions. Leaving and reopening resumes the same round. Limits reset at midnight in '+data.timeZone+'. School, chores, hours, and parent locks still apply to entertainment.','settings-hint challenge-admin-wide'));
  const save=node('button','Save challenge settings','btn btn-primary');save.type='submit';const status=node('p','','challenge-admin-status');status.setAttribute('role','status');form.append(save,status);
  function controls(){for(const input of form.querySelectorAll('input,select'))input.disabled=busy||!!inherit?.checked;if(inherit)inherit.disabled=busy;save.disabled=busy;selector.disabled=busy;}
  inherit?.addEventListener('change',()=>{if(inherit.checked){const family=data.settings.family;enabled.checked=family.enabled;cap.value=family.dailyCap;rounds.value=family.dailyRounds;school.checked=family.requireSchool;correctCoins.value=family.correctCoins;supportedCoins.value=family.supportedCoins;completionBonus.value=family.completionBonus;for(const s of Object.keys(names)){subjects[s].checked=family.subjects.includes(s);grades[s].value=family.grades[s]===null?'':String(family.grades[s]);}}controls();});
  form.addEventListener('input',()=>{dirty=true;status.textContent='Unsaved changes';});
  selector.addEventListener('change',()=>{if(dirty){selector.value=selected;status.textContent='Save these changes first, or use Discard changes below.';return;}selected=selector.value;render();});
  const discard=node('button','Discard changes','btn btn-secondary');discard.type='button';discard.addEventListener('click',()=>{if(!busy){dirty=false;retry=null;render();}});form.append(discard);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!active)return;
    const settings=structuredClone(data.settings),updated={correctCoins:Number(correctCoins.value),supportedCoins:Number(supportedCoins.value),completionBonus:Number(completionBonus.value),enabled:enabled.checked,dailyCap:Number(cap.value),dailyRounds:Number(rounds.value),requireSchool:school.checked,subjects:Object.keys(names).filter(s=>subjects[s].checked),grades:Object.fromEntries(Object.keys(names).map(s=>[s,grades[s].value===''?null:Number(grades[s].value)]))};
    if(!selected)settings.family=updated;else if(inherit.checked)delete settings.children[selected];else settings.children[selected]=updated;
    if(!(selected&&inherit?.checked)&&!updated.subjects.length){status.textContent='Choose at least one subject.';return;}
    const body={revision:data.revision,settings},key=JSON.stringify(body);if(retry?.key!==key)retry={key,id:crypto.randomUUID()};
    const epoch=generation;busy=true;controls();status.textContent='Saving…';
    try{const saved=await mutate('learning-challenges-save',{...body,id:retry.id});if(!active||generation!==epoch)return;data=saved;dirty=false;retry=null;busy=false;render();notice.textContent='Challenge settings saved. Limits and availability apply at the next check. Payout rates apply to new rounds.';}
    catch(error){if(active&&generation===epoch)status.textContent=error.message+' Your changes are still here.';}
    finally{busy=false;controls();}
  });content.append(form);controls();
  const history=node('details','','challenge-admin-history');history.append(node('summary','Recent challenge rounds'));
  if(!data.recent.length)history.append(node('p','A child’s first challenge will appear here.','settings-hint'));
  for(const row of data.recent){const child=data.students.find(s=>s.id===row.studentId),line=node('div','','cloud-panel');line.append(node('strong',(child?.name||'Archived child')+' · '+row.date+' · +'+row.coins+' coins'),node('p',(names[row.subject]||'Mixed practice')+' · '+row.correct+'/'+row.count+' without help · '+row.recovered+' corrected · '+row.status));history.append(line);}content.append(history);window.lucide?.createIcons();
 }
 async function load(){if(!active||busy||dirty)return;busy=true;const epoch=generation;notice.textContent='Loading challenge settings…';
  try{const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'learning-challenges-read'})}),result=await response.json();if(!response.ok)throw Error(result.error||'Could not load learning challenges.');if(!active||generation!==epoch)return;data=result;notice.textContent='';busy=false;render();}
  catch(error){if(active&&generation===epoch){notice.textContent=error.message;content.replaceChildren();const retryButton=node('button','Try again','btn btn-secondary');retryButton.type='button';retryButton.onclick=()=>load();content.append(retryButton);}}
  finally{busy=false;if(active&&generation!==epoch&&!dirty)void load();}
 }
 return{setActive(value){active=value;generation++;if(value)void load();},update(){if(active&&!dirty)void load();}};
}
