const learning = [
  ['music','Music','Listen to music you approve.','music'],['videos','Videos','Watch entertainment you approve.','videos'],
  ['typing','Typing School','Keyboard lessons and speed tests.'],['logic','Logic Lab','Reasoning puzzles.'],['words','Confused Words','Practice commonly mixed-up words.'],
  ['geography','Geography','Maps and capital memory.'],['spelling','Spelling','Weekly word practice.','spelling'],['science-spelling','Science Spelling','Science terms and practice.','science-spelling'],
  ['vocabulary','Vocabulary','Learn and review word meanings.','vocabulary'],['poems','Poem Memorization','Practice and record poems.','poems'],['quizzes','Quizzes','Quizzes you assign.','quizzes'],
  ['reading','Reading Log','Track books and reading.'],['notebook','Notebook','Writing saved on the child’s computer.'],['spanish','Spanish','Built-in language practice.'],['piano','Piano','Play and record locally.'],
  ['art-studio','Art Studio','Drawing saved on the child’s computer.'],['worksheets','Worksheets','Print from your approved library.','worksheets'],['learning-videos','Learning Videos','Watch your approved lessons.','learning-videos'],
  ['math-coach','Math Coach','Show the help screen. Set parent permission and limits in Math Coach.','math-coach'],['coloring-studio','Coloring Studio','Show the studio. Set generation permission and limits in Coloring Studio.','coloring-studio']
];
const tour = [
  ['overview','Overview','See connected computers and current activity.'],['messages','Messages','Send a note, image or voice message.'],['screenshots','Screenshots','Request a screenshot when you need one. Unkept images expire after three days.'],
  ['students','Students','Add children and choose their school.'],['subjects','Subjects','Assign activities, school links and time goals to each child.'],['grades','Grades','Review work and save grades.'],
  ['calendar','Calendar / Schedule','Set school hours, days off and vacations.'],['math-coach','Math Coach','Approve access and set question limits.'],['learning-videos','Learning Videos','Review and arrange your lesson library.'],
  ['spelling','Spelling','Set weekly words.'],['science-spelling','Science Spelling','Assign science terms.'],['vocabulary','Vocabulary','Choose word lists.'],['poems','Poems','Assign poems and review recordings.'],['quizzes','Quizzes','Create and assign quizzes.'],['worksheets','Worksheets','Approve, upload and organize printable pages.'],
  ['music','Music','Review your approved music.'],['videos','Videos','Review your approved entertainment.'],['audiobooks','Audiobooks','Manage the listening library.'],['family-games','Family Games','Choose when children can play together.'],
  ['documents','Documents','Manage family files.'],['coloring-studio','Coloring Studio','Set image generation limits and review shared pages.'],['reports','Reports','Review study time and practice results.'],['browsing','Browsing Activity','Review reported school browsing.'],['economy','Economy','Choose rewards and coin settings.'],['apps','App Launcher','Manage allowed apps.'],['settings','Settings','Revisit setup and family settings.']
];
const titles = ['Your children','School and schedule','Daily activities','Learning tools','Starter content','Parent controls','Ready'];
function node(tag, text = '', className = '') { const result = document.createElement(tag); result.textContent = text; result.className = className; return result; }
export function setupParentGuide({ endpoint, getSnapshot, navigate, editSchool }) {
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = '/guard-admin/cloud-parent-setup.css'; document.head.append(style);
  const dialog = node('dialog', '', 'parent-setup-dialog'); dialog.setAttribute('aria-labelledby','parent-setup-title');
  const form = node('form'), header = node('header'), heading = node('h2','Set up your family'), progress = node('p','','setup-progress'); heading.id='parent-setup-title';
  const body = node('div','','setup-body'), error = node('p','','setup-error'), footer = node('footer'); error.setAttribute('role','alert');
  const back = action('Back', () => move(-1)), later = action('Save and close', () => saveAndClose()), next = action('Next', () => move(1),'btn btn-primary');
  header.append(progress,heading); footer.append(later,back,next); form.append(header,body,error,footer); form.onsubmit = event => event.preventDefault(); dialog.append(form); document.body.append(dialog);
  let state = null, loading = false, loaded = false, busy = false, previousFocus;
  const launch = action('Setup guide', () => open(), 'btn btn-secondary'); launch.id='parent-setup-guide'; document.getElementById('cloud-refresh')?.after(launch);
  const settings = document.getElementById('tab-settings'); const panel = node('section','','cloud-panel');
  panel.append(node('h2','Family setup'),node('p','Choose activities, review starter content, or take the dashboard tour.'),action('Open setup guide',()=>open(0),'btn btn-primary'),action('Activity switches',()=>open(2)),action('Starter content',()=>open(4)));
  settings?.querySelector('.tab-header')?.after(panel);
  dialog.addEventListener('cancel',event=>{event.preventDefault();void saveAndClose();});
  dialog.addEventListener('close',()=>{body.querySelectorAll('iframe').forEach(frame=>frame.remove());previousFocus?.focus();});
  function action(label, callback, className='btn btn-secondary') { const button=node('button',label,className); button.type='button'; button.onclick=()=>void callback(); return button; }
  async function request(action, data={}) {
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});
    const value=await response.json();if(!response.ok)throw Error(value.error||'Setup could not be saved.');return value;
  }
  async function open(step) {
    if(loading||busy)return; loading=true;launch.disabled=true;
    try { state=await request('get-setup');if(Number.isInteger(step))state.step=step;previousFocus=document.activeElement;render();dialog.showModal(); }
    catch(failure){launch.title=failure.message;launch.textContent='Retry setup guide';}
    finally{loading=false;launch.disabled=false;}
  }
  async function persist() {
    busy=true;error.textContent='';progress.textContent='Saving your choices…';form.querySelectorAll('button,input').forEach(control=>control.disabled=true);
    try{state=await request('save-setup',state);launch.textContent=state.completed?'Setup guide':'Continue setup';return true;}
    catch(failure){error.textContent=failure.message;return false;}
    finally{busy=false;progress.textContent=`Step ${state.step+1} of ${titles.length}`;form.querySelectorAll('button,input').forEach(control=>control.disabled=false);back.disabled=state.step===0;}
  }
  async function saveAndClose(){if(busy)return;if(await persist())dialog.close();}
  async function move(direction){if(busy)return;const before=state.step;
    if(direction===1&&before===6){state.completed=true;if(await persist())dialog.close();return;}
    state.step=Math.max(0,Math.min(6,state.step+direction));if(await persist())render();else state.step=before;
  }
  async function showSection(tab, callback){if(busy||!await persist())return;dialog.close();navigate(tab);callback?.();}
  function link(label,tab,callback){return action(label,()=>showSection(tab,callback),'btn btn-secondary setup-section-link');}
  function text(copy){body.append(node('p',copy,'setup-copy'));}
  function toggle(id,title,copy,tab){const row=node('label','','setup-choice'),input=document.createElement('input');input.type='checkbox';
    if(!(id in state.features))state.features[id]=true;
    input.checked=state.features[id];input.onchange=()=>{state.features[id]=input.checked;};
    const content=node('span');content.append(node('strong',title),node('small',copy));row.append(input,content);body.append(row);
    if(tab)body.append(link(`Set up ${title}`,tab));
  }
  function render(){body.replaceChildren();error.textContent='';heading.textContent=titles[state.step];progress.textContent=`Step ${state.step+1} of ${titles.length}`;back.disabled=state.step===0;next.textContent=state.step===6?'Finish setup':'Save and next';
    const snapshot=getSnapshot(),children=snapshot?.students||[];
    if(state.step===0){text('Add your children, then connect their computers. You can do one now and the others later.');
      children.forEach(child=>body.append(node('p',`${child.name}${child.grade?` · Grade ${child.grade}`:''}`,'setup-child')));
      body.append(link(children.length?'Manage children':'Add your first child','students',()=>document.getElementById('add-student-btn')?.click()));
      const account=node('a','Download the child app','btn btn-primary');account.href='/guard/account/';account.target='_top';body.append(account);
    }else if(state.step===1){text('Abeka, BJU, another website, or no online school. Choose separately for each child.');
      children.forEach(child=>{const row=node('div','','setup-child');row.append(node('strong',child.name),node('span',child.main_school?.provider?`School: ${child.main_school.provider}`:'No choice saved yet'),link('Choose school','overview',()=>editSchool(child)));body.append(row);});
      if(!children.length)body.append(link('Add a child first','students'));
      body.append(link('Set school hours and days off','calendar'),link('Assign subjects and time goals','subjects'));
    }else if(state.step===2){text('Built-in questions are ready to use. Choose whether your family sees each activity. You do not need to approve individual questions.');
      toggle('verse','Daily Verse','A Bible verse and question each day.');toggle('riddle','Brain Teaser','A daily thinking challenge.');
    }else if(state.step===3){text('Choose which tools are available to your family. Individual assignments and limits still apply.');learning.forEach(([id,title,copy,tab])=>toggle(id,title,copy,tab));
    }else if(state.step===4){text('Preview the BodeeGuard collections, then approve the ones you want. Skipped collections are not added.');
      for(const collection of state.catalog.collections){const section=node('section','','setup-collection');section.append(node('h3',collection.title));
        if(!collection.items.length){section.append(node('p','No starter collection published yet.','setup-copy'));body.append(section);continue;}
        const details=node('details'),summary=node('summary',`Preview ${collection.items.length} items`);details.append(summary);
        const selected=new Set(state.contentChoices[collection.id]?.decision==='approved'?state.contentChoices[collection.id].items:collection.items.map(item=>item.id));
        collection.items.forEach(item=>{const card=node('div','','setup-preview'),label=node('label','','setup-item'),check=node('input');check.type='checkbox';check.checked=selected.has(item.id);check.onchange=()=>{check.checked?selected.add(item.id):selected.delete(item.id);if(state.contentChoices[collection.id]?.decision==='approved')state.contentChoices[collection.id].items=[...selected];};
          label.append(check,node('strong',item.title));card.append(label,node('p',item.description||''));
          const previewHost=node('div'),previewButton=action(item.youtubeId?'Play preview':'View page',async()=>{
            if(previewHost.childElementCount){previewHost.replaceChildren();previewButton.textContent=item.youtubeId?'Play preview':'View page';return;}
            previewButton.disabled=true;
            try{if(item.youtubeId){const frame=node('iframe');frame.title=item.title;frame.sandbox='allow-scripts allow-same-origin';frame.allow='autoplay; encrypted-media; fullscreen';frame.src=`/guard-admin/cloud-learning-player.html#${new URLSearchParams({video:item.youtubeId,start:'0'})}`;previewHost.append(frame);}
              else{const file=await request('preview-starter',{itemId:item.id});if(!card.isConnected)return;const img=node('img');img.alt=item.title;img.src=`data:${file.mime};base64,${file.data}`;previewHost.append(img);}previewButton.textContent='Close preview';
            }catch(failure){error.textContent=failure.message;}finally{previewButton.disabled=false;}
          });card.append(previewButton,previewHost);details.append(card);
        });section.append(details);
        details.addEventListener('toggle',()=>{if(!details.open)details.querySelectorAll('iframe').forEach(frame=>frame.remove());});
        for(const [decision,label]of [['approved','Approve this collection'],['declined','Skip this collection']]){const row=node('label','','setup-choice'),input=document.createElement('input');input.type='radio';input.name=`starter-${collection.id}`;input.checked=state.contentChoices[collection.id]?.decision===decision;
          input.onchange=()=>{state.contentChoices[collection.id]={decision,version:state.catalog.version,items:decision==='approved'?[...selected]:[]};};row.append(input,node('span',label));section.append(row);}
        body.append(section);
      }
    }else if(state.step===5){text('Use one Parent password for every child. It also works offline.');
      body.append(link(snapshot?.parentPassword?.configured?'Change Parent password':'Set Parent password','overview',()=>document.querySelector('#family-parent-password button')?.click()));
      for(const [tab,title,copy]of [['messages','Messages','Your notes pop up while children work.'],['screenshots','Screenshots','Take one on demand. Unkept screenshots expire after three days.'],['economy','Rewards','Choose coin rewards and spending options.'],['math-coach','AI limits','Decide whether Math Coach is available and set its daily limit.'],['coloring-studio','Image generation','Set render limits and sharing approval.']]){const row=node('div','','setup-child');row.append(node('strong',title),node('p',copy),link('Show me',tab));body.append(row);}
    }else{text('Your choices are saved. You can reopen this guide from Settings whenever you like.');
      body.append(node('h3','Your choices'));
      body.append(node('p',`${Object.values(state.features).filter(Boolean).length} activities on · ${Object.values(state.contentChoices).filter(choice=>choice.decision==='approved').length} starter collections approved`));
      const details=node('details'),summary=node('summary','Tour every dashboard section');details.append(summary);
      for(const [tab,title,copy]of tour){if(!document.querySelector(`.nav-item[data-tab="${tab}"]`))continue;const row=node('div','','setup-tour-row');row.append(node('strong',title),node('p',copy),link('Show me',tab));details.append(row);}body.append(details);
    }
    body.scrollTop=0;
  }
  return { async startOnce(){if(loaded||loading||!getSnapshot())return;loaded=true;loading=true;
    try{state=await request('get-setup');if(!state.completed){previousFocus=document.activeElement;render();dialog.showModal();launch.textContent='Continue setup';}}
    catch{launch.textContent='Open setup guide';}finally{loading=false;}
  } };
}
