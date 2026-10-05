import {decorateSetup,setupField} from './cloud-setup-controls.js';
const node=(tag,text='',cls='')=>{const el=document.createElement(tag);el.textContent=text;el.className=cls;return el;};
const key=name=>name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const button=(label,icon,fn,primary=false)=>{const el=node('button',label,'btn '+(primary?'btn-primary':'btn-secondary'));el.type='button';const mark=node('i','','setup-icon');mark.dataset.lucide=icon;mark.setAttribute('aria-hidden','true');el.prepend(mark);el.onclick=()=>void fn();return el;};
export function createFamilyPrompt({getSnapshot,previewDraft,confirmDraft,onBusy=()=>{},onSaved=()=>{}}){
  let host=null,description='',consent=false,draft=null,previewRequest=null,saveRequest=null,saved=false,pending=null,recognition=null,voiceTimer=null,voiceBase='',message='',failure=false;
  const updateStatus=(text,bad=false)=>{message=text;failure=bad;const status=host?.querySelector('.family-prompt-status');if(status){status.textContent=text;status.dataset.error=String(bad);}};
  function stopVoice(){clearTimeout(voiceTimer);voiceTimer=null;const active=recognition;recognition=null;if(active){active.onresult=active.onend=active.onerror=null;active.abort();}if(host){const voice=host.querySelector('[data-family-voice]');voice?.setAttribute('aria-pressed','false');if(voice)voice.lastChild.textContent='Speak instead';const textarea=host.querySelector('textarea');if(textarea)textarea.readOnly=false;}}
  function startVoice(){
    if(recognition){stopVoice();updateStatus('Voice stopped. Review the description before creating your draft.');return;}
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){updateStatus('Use your keyboard microphone to dictate, or type your description.');host?.querySelector('textarea')?.focus();return;}
    const current=new Speech();recognition=current;voiceBase=description.trim();current.lang=document.documentElement.lang||'en-US';current.continuous=true;current.interimResults=true;
    const textarea=host.querySelector('textarea'),voice=host.querySelector('[data-family-voice]');textarea.readOnly=true;voice.setAttribute('aria-pressed','true');voice.lastChild.textContent='Stop dictation';updateStatus('Listening… Names can be tricky—check the transcript when you finish.');
    current.onresult=event=>{if(recognition!==current)return;let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0].transcript+' ';description=[voiceBase,text.trim()].filter(Boolean).join(' ').slice(0,4000);textarea.value=description;previewRequest=null;};
    current.onerror=event=>{if(recognition!==current)return;stopVoice();updateStatus(event.error==='not-allowed'?'Microphone access was denied. Type instead or use your keyboard microphone.':'Dictation stopped. Your transcript is kept; you can type or try speaking again.',true);};
    current.onend=()=>{if(recognition!==current)return;stopVoice();updateStatus('Review the description, then create your draft.');};
    try{current.start();voiceTimer=setTimeout(()=>{stopVoice();updateStatus('Dictation stopped after one minute. Review the text or speak again.');},60000);}catch{stopVoice();updateStatus('Could not start dictation. Type instead or use your keyboard microphone.',true);}
  }
  function selected(){return(draft?.children||[]).filter(child=>child.selected);}
  async function run(work){if(pending)return;onBusy(true);pending=work();render();try{await pending;}finally{pending=null;onBusy(false);if(host?.isConnected)render();}}
  async function preview(){
    stopVoice();if(!description.trim()){updateStatus('Describe your children first.',true);return;}
    if(!consent){updateStatus('Check the OpenAI permission above to create a draft, or add children individually below.',true);return;}
    await run(async()=>{
      updateStatus('Creating your family draft…');previewRequest||={requestId:crypto.randomUUID(),prompt:description,consent:true};
      try{
        const value=await previewDraft(previewRequest),existing=(getSnapshot()?.students||[]).filter(c=>!c.archived_at);
        draft={children:value.children.map(child=>({...child,url:'',selected:!existing.some(c=>key(c.name)===key(child.name))})),notes:value.notes||[],rulesRevision:getSnapshot()?.rules?.revision||0};
        saveRequest=null;saved=false;updateStatus(value.children.length?'Check names, grades and schools below. Nothing has been saved yet.':'No children found. Add their names and try again.',!value.children.length);
      }catch(error){previewRequest=null;updateStatus(error.message||'Could not create a draft. Add children individually below or try again.',true);}
    });
  }
  async function confirm(){
    stopVoice();if(!selected().length){updateStatus('Select at least one new child to add.',true);return;}
    const existing=(getSnapshot()?.students||[]).filter(c=>!c.archived_at);
    if(selected().some(child=>existing.some(c=>key(c.name)===key(child.name)))&&!saveRequest){updateStatus('A selected child is already in your family. Deselect them before saving.',true);return;}
    if(selected().some(child=>!child.name.trim())){updateStatus('Every selected child needs a name.',true);return;}
    await run(async()=>{
      saveRequest||={requestId:crypto.randomUUID(),confirmed:true,rulesRevision:draft.rulesRevision,children:selected().map(({name,grade,provider,schoolName,url})=>({name,grade,provider,schoolName,url:provider==='custom'?url:''}))};
      updateStatus('Saving your reviewed family…');
      try{const result=await confirmDraft(saveRequest);saved=true;updateStatus(result.replayed?'Your family was already saved. The dashboard is refreshed.':result.createdCount+' children added. Continue to review their school choices.');onSaved();}
      catch(error){updateStatus((error.message||'Could not confirm the save.')+' Retry the same draft to check safely.',true);}
    });
  }
  function editDraft(){saveRequest=null;saved=false;}
  function render(){
    if(!host)return;host.replaceChildren();
    const intro=node('div','','family-prompt-heading');const icon=node('i','','setup-icon');icon.dataset.lucide='sparkles';const heading=node('h3','Tell us about your family');heading.prepend(icon);intro.append(heading);host.append(intro,node('p','Type or speak everyone’s names, grades and school programs. Review one draft, then add them together.','setup-copy'));
    const label=node('label','','setup-field');label.append(node('span','Your children and their school'));const textarea=node('textarea');textarea.rows=4;textarea.maxLength=4000;textarea.value=description;textarea.placeholder='Mia is in 3rd grade with Abeka. Jonah is in 5th grade with Bob Jones. June is in kindergarten; no online school yet.';textarea.disabled=Boolean(pending)||Boolean(saveRequest)||saved;textarea.oninput=()=>{description=textarea.value;previewRequest=null;if(draft){draft=null;host.querySelector('.family-prompt-review')?.remove();updateStatus('Description changed. Create a new draft before saving.');}};label.append(textarea);host.append(label);
    const permission=node('label','','setup-choice family-prompt-consent'),check=node('input');check.type='checkbox';check.checked=consent;check.disabled=Boolean(pending)||Boolean(saveRequest)||saved;check.onchange=()=>{consent=check.checked;previewRequest=null;};permission.append(check,node('span','Use OpenAI to read this description, including children’s names, grades and schools. Nothing is added until I review and confirm.'));host.append(permission);
    const tools=node('div','','family-prompt-actions'),voice=button('Speak instead','mic',startVoice);voice.dataset.familyVoice='';voice.setAttribute('aria-pressed',String(Boolean(recognition)));const create=button(draft?'Create a new draft':'Create family draft','sparkles',preview,true);voice.disabled=create.disabled=Boolean(pending)||Boolean(saveRequest)||saved;tools.append(voice,create);host.append(tools,node('p','Dictation uses your browser’s speech service. If unavailable, use the keyboard microphone or type. Your description stays in this tab until you ask OpenAI to create the draft.','family-prompt-privacy'));
    const status=node('p',message,'family-prompt-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.dataset.error=String(failure);host.append(status);
    if(draft&&!saved){
      const review=node('section','','family-prompt-review');review.append(node('h4','Review your children'),node('p','Select the children to add. Missing grades can be filled in later. Existing children are deselected to avoid duplicates.','setup-copy'));
      for(const note of draft.notes)review.append(node('p',note,'family-prompt-note'));
      draft.children.forEach((child,index)=>{
        const card=node('fieldset','','family-prompt-child');card.append(node('legend','Child '+(index+1)));
        const include=node('label','','family-prompt-include'),chosen=node('input');chosen.type='checkbox';chosen.checked=child.selected;chosen.disabled=Boolean(pending)||Boolean(saveRequest);chosen.onchange=()=>{child.selected=chosen.checked;editDraft();};include.append(chosen,node('span','Add this child'));card.append(include);
        const fields=node('div','','family-prompt-fields');
        for(const [title,name,max]of [['Name','name',80],['Grade','grade',30]]){const {label:field,input}=setupField(title,name,child[name]);input.maxLength=max;input.required=name==='name';if(name==='grade')input.placeholder='Optional';input.disabled=Boolean(pending)||Boolean(saveRequest);input.oninput=()=>{child[name]=input.value;editDraft();};fields.append(field);}
        const school=node('label','','setup-field');school.append(node('span','School program'));const select=node('select');select.setAttribute('aria-label','School program for child '+(index+1));
        for(const [value,title]of [['','Choose later'],['abeka','Abeka Academy'],['bju','BJU / Bob Jones'],['custom','Another school or curriculum'],['none','No online school']]){const option=node('option',title);option.value=value;select.append(option);}select.value=child.provider;select.disabled=Boolean(pending)||Boolean(saveRequest);select.onchange=()=>{child.provider=select.value;editDraft();render();};school.append(select);fields.append(school);
        if(child.provider==='custom'){for(const [title,name,max]of [['School name','schoolName',100],['School website (optional)','url',2048]]){const {label:field,input}=setupField(title,name,child[name],name==='url'?'url':'text');input.maxLength=max;input.disabled=Boolean(pending)||Boolean(saveRequest);input.oninput=()=>{child[name]=input.value;editDraft();};fields.append(field);}fields.append(node('p','No website? The school name is kept for the next step.','family-prompt-note'));}
        const match=(getSnapshot()?.students||[]).some(c=>!c.archived_at&&key(c.name)===key(child.name));if(match)card.append(node('p','Already in your family. Leave deselected or use a distinct name.','family-prompt-note'));
        card.append(fields);review.append(card);
      });
      const actions=node('div','','family-prompt-actions'),save=button(saveRequest?'Retry same save':'Confirm & add children','user-round-plus',confirm,true);save.disabled=Boolean(pending)||!selected().length;const change=button(saveRequest?'Edit draft instead':'Discard draft','x',()=>{if(pending)return;saveRequest=null;draft=null;description='';previewRequest=null;updateStatus('');render();});change.disabled=Boolean(pending);actions.append(save,change);review.append(actions);
      if(saveRequest)review.append(node('p','The last result was uncertain. Retry checks the same save without adding children twice. To change it, discard this draft and check your existing children first.','family-prompt-note'));host.append(review);
    }
    if(saved){const again=button('Add more children','user-round-plus',()=>{description='';draft=null;saveRequest=null;previewRequest=null;saved=false;updateStatus('');render();});host.append(again);}
    decorateSetup(host);
  }
  return {mount(container){stopVoice();host=node('section','','family-prompt');container.append(host);render();},unmount(){stopVoice();host?.remove();host=null;},async flush(){stopVoice();if(pending)await pending;if(draft&&!saved&&draft.children.length)throw Error('Confirm your family draft above, or discard it before continuing.');if(description.trim()&&!draft&&!saved)throw Error('Create and confirm a family draft, or clear the description to add children individually.');}};
}
