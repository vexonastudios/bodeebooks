import {commonSchoolMatches,commonSchoolSites,schoolWebsite,schoolProvider} from './cloud-school-directory.js?v=20261103-schools1';
const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
const button=(text,fn,primary=false)=>{const el=node('button',text,'btn '+(primary?'btn-primary':'btn-secondary'));el.type='button';el.onclick=fn;return el;};
function icon(name){const el=node('i','','setup-icon');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;}
function field(text,name,max){const label=node('label','','setup-field'),input=node('input');input.name=name;input.maxLength=max;label.append(node('span',text),input);return {label,input};}
const sitesFor=(snapshot,id)=>(snapshot.rules?.subjects||[]).filter(site=>site.isSchoolPortal&&site.active!==false&&(!Array.isArray(site.assignments)||site.assignments.some(a=>a.studentId===id&&a.active!==false)));
const abeka=commonSchoolSites.find(site=>site.provider==='abeka');
function matchesAddress(site, address) {
  let existing;
  try { existing = new URL(site.url).href; } catch { return false; }
  if (existing === address) return true;
  // Older Abeka setups saved the student sign-in page instead of the portal root.
  return address === abeka.url && existing.toLowerCase() === 'https://academy.abeka.com/login.aspx';
}

export function inlineSchool({host,student,students=[student],quickAbeka=false,getSnapshot,mutate,onError,onChange=()=>{},onWrite=()=>{},afterWrite=()=>{},searchSites,refresh=async()=>{}}){
  const family=!student,target=family?'all children':student.name;
  const section=node('section','','setup-child setup-school-form'),heading=node('div','','setup-school-heading');
  if(family)section.classList.add('setup-school-family');else section.dataset.studentId=student.id;
  const who=node('h3',family?'All children':student.name);
  who.prepend(icon(family?'users':'user-round'));heading.append(who);
  const list=node('div','','setup-school-list'),editor=node('div','','setup-school-editor'),notice=node('p','','setup-note');
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const add=button(family?'Choose a website for all':'Add school website',()=>open());
  const addLabel=add.firstChild;add.prepend(icon(family?'search':'plus'));
  if(student)add.setAttribute('aria-label','Add school website for '+student.name);
  const shortcuts=node('div','','setup-school-actions');
  const preset=button(family?'Add Abeka to all':'Add Abeka',()=>void addPreset().catch(report),true);
  const presetLabel=preset.firstChild;preset.prepend(icon('graduation-cap'));
  if(family||quickAbeka)shortcuts.append(preset);
  shortcuts.append(add);heading.append(shortcuts);
  section.append(heading);if(student)section.append(list);section.append(editor,notice);host.append(section);
  let pending=null,editing=null,dirty=false,generation=0,suggestedTitle='';
  const url=field('School website address','schoolUrl',2048);
  url.input.placeholder='Type or paste a website';url.input.inputMode='url';url.input.autocapitalize='none';url.input.spellcheck=false;
  const title=field('Website name (optional)','schoolTitle',120);title.input.placeholder='e.g. Math';
  const lookup=node('details','','setup-school-lookup'),summary=node('summary','Look up by school name');
  summary.prepend(icon('search'));
  const query=field('School or curriculum name','schoolSearch',100);query.input.placeholder='e.g. Abeka Academy';query.input.type='search';
  const results=node('div','','setup-school-results'),lookupStatus=node('p','','setup-note');lookupStatus.setAttribute('role','status');
  const online=button('Search online',()=>void search());online.prepend(icon('search'));
  const searchRow=node('div','','setup-school-search');searchRow.append(query.label,online);
  const preview=node('a','Preview website ↗','setup-school-preview');preview.target='_blank';preview.rel='noopener noreferrer';preview.hidden=true;
  const saveLabel=family?'Add to all children':'Add website';
  const saveButton=button(saveLabel,()=>void save().catch(report),true),cancel=button('Cancel',()=>{reset();add.focus();});
  saveButton.prepend(icon('plus'));
  const actions=node('div','','setup-school-actions');actions.append(saveButton,cancel);
  const fallback=node('a','Search the web in a new tab ↗','setup-school-web-search');fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.hidden=true;
  lookup.append(summary,searchRow,results,lookupStatus,fallback);
  editor.append(url.label,preview,lookup,title.label,actions);
  function report(error){notice.textContent=error.message;notice.dataset.error='true';onError?.(error);}
  function renderList(){
    const snapshot=getSnapshot();
    if(family||quickAbeka){
      const done=students.every(child=>sitesFor(snapshot,child.id).some(site=>matchesAddress(site,abeka.url)));
      preset.disabled=done;
      const text=done?(family?'Abeka added to all':'Abeka added'):(family?'Add Abeka to all':'Add Abeka');
      presetLabel.textContent=text;
    }
    list.hidden=true;
    if(family)return;
    const sites=sitesFor(snapshot,student.id);list.replaceChildren();list.hidden=!sites.length;
    for(const site of sites){
      const row=node('div','','setup-school-site'),info=node('div'),controls=node('div','','setup-school-actions');
      info.append(node('strong',site.title),node('span',site.url,'setup-school-address'));
      const edit=button('Edit',()=>{if(!canReplace())return;open(site);}),remove=button('Remove',()=>void removeSite(site).catch(report));
      edit.setAttribute('aria-label',`Edit ${site.title} for ${student.name}`);remove.setAttribute('aria-label',`Remove ${site.title} from ${student.name}`);
      controls.append(edit,remove);row.append(info,controls);list.append(row);
    }
    const label=sites.length?'Add another school website':'Add school website';
    addLabel.textContent=label;
  }
  function canReplace(){if(pending)return false;if(dirty){report(Error(`Save the website for ${target} first, or choose Cancel.`));return false;}return true;}
  function previewAddress(){try{preview.href=schoolWebsite(url.input.value);preview.hidden=false;}catch{preview.removeAttribute('href');preview.hidden=true;}}
  function reset(){
    generation++;editing=null;dirty=false;suggestedTitle='';query.input.value=title.input.value=url.input.value='';
    editor.hidden=true;shortcuts.hidden=false;lookup.open=false;lookupStatus.textContent='';results.replaceChildren();
    fallback.hidden=true;online.disabled=false;url.input.removeAttribute('aria-invalid');
    notice.textContent='';delete notice.dataset.error;previewAddress();onChange();
  }
  function open(site=null){
    if(!canReplace())return;reset();editing=site;editor.hidden=false;shortcuts.hidden=true;
    saveButton.lastChild.textContent=site?'Save website':saveLabel;
    if(site){title.input.value=site.title;url.input.value=site.url;previewAddress();}
    url.input.focus();
  }
  function renderResults(rows){
    results.replaceChildren();
    for(const row of rows.slice(0,14)){
      let address;try{address=schoolWebsite(row.url);}catch{continue;}
      const item=node('div','','setup-school-result'),info=node('div');info.append(node('strong',row.title),node('span',address,'setup-school-address'),node('small',row.source==='Wikidata'?'Online directory · '+(row.description||'Check the address'):'Common school site'));
      const choose=button('Use this site',()=>{
        if(!title.input.value.trim()||title.input.value===suggestedTitle)title.input.value=row.title;
        suggestedTitle=row.title;url.input.value=address;lookup.open=false;generation++;
        updateDraft();url.input.focus();
      });choose.setAttribute('aria-label','Use '+row.title);item.append(info,choose);results.append(item);
    }
  }
  function localResults(){generation++;online.disabled=false;lookupStatus.textContent='';fallback.hidden=true;renderResults(query.input.value.trim()?commonSchoolMatches(query.input.value):[]);}
  lookup.ontoggle=()=>{
    if(lookup.open){
      if(document.activeElement===summary)query.input.focus();
    }else localResults();
  };
  query.input.oninput=localResults;
  query.input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();void search();}};
  function updateDraft(){
    dirty=url.input.value!==(editing?.url||'')||title.input.value!==(editing?.title||'');
    url.input.removeAttribute('aria-invalid');notice.textContent='';delete notice.dataset.error;onChange();previewAddress();
  }
  for(const input of [title.input,url.input])input.oninput=updateDraft;
  async function search(){
    const name=query.input.value.trim();if(name.length<2){lookupStatus.textContent='Enter at least two letters to search.';return;}
    const ticket=++generation;online.disabled=true;lookupStatus.textContent='Looking for website addresses…';
    fallback.href='https://www.google.com/search?q='+encodeURIComponent(name+' official school website');fallback.hidden=false;
    try{
      if(!searchSites)throw Error('Online lookup is unavailable here. Choose a common site, search the web, or paste a website.');
      const response=await searchSites({query:name});if(ticket!==generation||!section.isConnected)return;
      const local=commonSchoolMatches(name),seen=new Set(local.map(row=>row.url));
      const found=(response.results||[]).filter(row=>!seen.has(row.url));renderResults([...local,...found]);
      lookupStatus.textContent=results.childElementCount?'Choose a result to fill in the website address.':'No matches. Try another name or enter the website address above.';
    }catch(error){if(ticket===generation&&section.isConnected)lookupStatus.textContent=error.message;}
    finally{if(ticket===generation)online.disabled=false;}
  }
  async function write(task){
    generation++;const controls=[...section.querySelectorAll('button,input')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
    onWrite(true,section);
    try{await task();}
    catch(error){await refresh().catch(()=>{});throw error;}
    finally{controls.forEach(([el,disabled])=>el.disabled=disabled);online.disabled=false;renderList();afterWrite();onWrite(false,section);}
  }
  function changeSite(child,change){
    return mutate('setup-school',{studentId:child.id,revision:getSnapshot().rules.revision,...change},{notify:false});
  }
  function addPreset(){
    if(pending)return pending;
    title.input.value=abeka.title;url.input.value=abeka.url;
    return save(true);
  }
  function save(presetSelected=false){
    if(pending)return pending;
    let address;
    try{address=schoolWebsite(url.input.value);}catch(error){
      url.input.setAttribute('aria-invalid','true');url.input.focus();
      const value=url.input.value.trim();
      if(!value.includes('.')&&!value.includes(':'))return Promise.reject(Error('Enter an address like school.org, or choose “Look up by school name”.'));
      return Promise.reject(error);
    }
    const label=title.input.value.trim()||new URL(address).hostname.replace(/^www\./,'');
    function assigned(child){
      return sitesFor(getSnapshot(),child.id).some(site=>matchesAddress(site,address)&&(family||presetSelected||site.title===label));
    }
    pending=(async()=>{
      const change={provider:schoolProvider(address),title:label,url:address};
      if(!editing && students.every(assigned)){
        reset();notice.textContent='This website is already added.';delete notice.dataset.error;return;
      }
      try {
        await write(async()=>{
          if(editing){await changeSite(student,{...change,operation:'edit',subjectId:editing.id});return;}
          for(const child of students){
            if(assigned(child))continue;
            if(family)notice.textContent=`Adding ${label} for ${child.name}…`;
            await changeSite(child,{...change,operation:'add'});
          }
        });
      } catch(error) {
        if(!family)throw error;
        const saved=students.filter(assigned).length;
        if(saved<students.length)throw Error(`${label} is listed for ${saved} of ${students.length} children. Try again to finish. ${error.message}`);
      }
      reset();notice.textContent=`${label} saved for ${target}.`;delete notice.dataset.error;
    })().finally(()=>pending=null);return pending;
  }
  function removeSite(site){
    if(!canReplace())return Promise.resolve();
    pending=(async()=>{await write(()=>changeSite(student,{operation:'remove',subjectId:site.id}));reset();notice.textContent=`${site.title} removed from ${student.name}.`;delete notice.dataset.error;})().finally(()=>pending=null);return pending;
  }
  reset();renderList();
  // Continue does not turn a search selection into permission without approval.
  const commit=()=>pending||(dirty?Promise.reject(Error(`Choose ${editing?'Save website':saveLabel}, or Cancel to add it later.`)):Promise.resolve());
  commit.refreshList=renderList;
  return commit;
}
