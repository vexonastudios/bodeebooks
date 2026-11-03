import {commonSchoolMatches,schoolWebsite,schoolProvider} from './cloud-school-directory.js?v=20261103-schools1';
const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
const button=(text,fn,primary=false)=>{const el=node('button',text,'btn '+(primary?'btn-primary':'btn-secondary'));el.type='button';el.onclick=fn;return el;};
function field(text,name,max){const label=node('label','','setup-field'),input=node('input');input.name=name;input.maxLength=max;label.append(node('span',text),input);return {label,input};}
const sitesFor=(snapshot,id)=>(snapshot.rules?.subjects||[]).filter(site=>site.isSchoolPortal&&site.active!==false&&(!Array.isArray(site.assignments)||site.assignments.some(a=>a.studentId===id&&a.active!==false)));

export function inlineSchool({host,student,getSnapshot,mutate,onError,onChange=()=>{},searchSites,refresh=async()=>{}}){
  const section=node('section','','setup-child setup-school-form'),heading=node('div','','setup-school-heading');
  const count=node('span','','setup-school-count');heading.append(node('h3',student.name),count);
  const list=node('div','','setup-school-list'),editor=node('div','','setup-school-editor'),notice=node('p','','setup-note');
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const add=button('Add school website',()=>open());
  section.append(heading,list,add,editor,notice);host.append(section);
  let pending=null,editing=null,dirty=false,generation=0;
  const query=field('Find a school or curriculum','schoolSearch',100);query.input.placeholder='Try Abeka, IXL, math, or grammar';query.input.type='search';
  const results=node('div','','setup-school-results'),lookupStatus=node('p','','setup-note');lookupStatus.setAttribute('role','status');
  const online=button('Look up online',()=>void search());
  const searchRow=node('div','','setup-school-search');searchRow.append(query.label,online);
  const searchHint=node('p','Common sites appear as you type. Online lookup searches the Wikidata directory using only the name you enter.','setup-note');
  const manual=button('Paste a website instead',()=>{review.hidden=false;url.input.focus();});
  const review=node('div','','setup-school-review'),title=field('Name on the child’s dashboard (optional)','schoolTitle',120),url=field('Website to open','schoolUrl',2048);
  title.input.placeholder='For example, Math or Grammar';url.input.placeholder='https://school.example.com';url.input.inputMode='url';url.input.autocapitalize='none';url.input.spellcheck=false;
  const preview=node('a','Preview website ↗','setup-school-preview');preview.target='_blank';preview.rel='noopener noreferrer';preview.hidden=true;
  const approval=node('p','Check this is the right school and student sign-in page. Adding it gives this child access; search results are suggestions, not approvals.','setup-note');
  const saveButton=button('Add website',()=>void save().catch(report),true),cancel=button('Cancel — add later',()=>{reset();add.focus();});
  const actions=node('div','','setup-school-actions');actions.append(saveButton,cancel);
  review.append(title.label,url.label,preview,approval);
  const fallback=node('a','Search the web in a new tab ↗','setup-school-web-search');fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.hidden=true;
  editor.append(searchRow,searchHint,results,lookupStatus,fallback,manual,review,actions);
  function report(error){notice.textContent=error.message;notice.dataset.error='true';onError?.(error);}
  function renderList(){
    const sites=sitesFor(getSnapshot(),student.id);count.textContent=sites.length?`${sites.length} website${sites.length===1?'':'s'} added`:'Optional';list.replaceChildren();
    if(!sites.length)list.append(node('p','No websites added yet. You can continue and add them later.','setup-note'));
    for(const site of sites){
      const row=node('div','','setup-school-site'),info=node('div'),controls=node('div','','setup-school-actions');
      info.append(node('strong',site.title),node('span',site.url,'setup-school-address'));
      const edit=button('Edit',()=>{if(!canReplace())return;open(site);}),remove=button('Remove',()=>void removeSite(site).catch(report));
      edit.setAttribute('aria-label',`Edit ${site.title} for ${student.name}`);remove.setAttribute('aria-label',`Remove ${site.title} from ${student.name}`);
      controls.append(edit,remove);row.append(info,controls);list.append(row);
    }
    add.textContent=sites.length?'Add another school website':'Add school website';
  }
  function canReplace(){if(pending)return false;if(dirty){report(Error(`Add or save ${student.name}’s website first, or choose Cancel to discard the draft.`));return false;}return true;}
  function previewAddress(){try{preview.href=schoolWebsite(url.input.value);preview.hidden=false;}catch{preview.removeAttribute('href');preview.hidden=true;}}
  function reset(){generation++;editing=null;dirty=false;query.input.value=title.input.value=url.input.value='';editor.hidden=true;add.hidden=false;review.hidden=true;lookupStatus.textContent='';fallback.hidden=true;online.disabled=false;onChange();}
  function open(site=null){
    if(!canReplace())return;reset();editing=site;editor.hidden=false;add.hidden=true;notice.textContent='';delete notice.dataset.error;
    saveButton.textContent=site?'Save website':'Add website';searchRow.hidden=searchHint.hidden=manual.hidden=!!site;
    if(site){review.hidden=false;title.input.value=site.title;url.input.value=site.url;results.replaceChildren();previewAddress();url.input.focus();}
    else{renderResults(commonSchoolMatches().slice(0,4));query.input.focus();}
  }
  function renderResults(rows){
    results.replaceChildren();
    for(const row of rows.slice(0,14)){
      let address;try{address=schoolWebsite(row.url);}catch{continue;}
      const item=node('div','','setup-school-result'),info=node('div');info.append(node('strong',row.title),node('span',address,'setup-school-address'),node('small',row.source==='Wikidata'?'Online directory · '+(row.description||'Check the address'):'Common school site'));
      const choose=button('Use this site',()=>{
        if(dirty&&!editing){report(Error('Add this website or cancel the draft before choosing another.'));return;}
        title.input.value=row.title;url.input.value=address;dirty=true;review.hidden=false;previewAddress();lookupStatus.textContent='Review the address below, then choose Add website.';review.scrollIntoView({block:'nearest'});saveButton.focus();
      });choose.setAttribute('aria-label','Use '+row.title);item.append(info,choose);results.append(item);
    }
  }
  function localResults(){generation++;online.disabled=false;lookupStatus.textContent='';fallback.hidden=true;renderResults(commonSchoolMatches(query.input.value));}
  query.input.oninput=localResults;
  query.input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();void search();}};
  for(const input of [title.input,url.input])input.oninput=()=>{dirty=true;notice.textContent='';delete notice.dataset.error;onChange();previewAddress();};
  async function search(){
    const name=query.input.value.trim();if(name.length<2){lookupStatus.textContent='Enter at least two letters, or choose a common site.';return;}
    const ticket=++generation;online.disabled=true;lookupStatus.textContent='Looking for website addresses…';
    fallback.href='https://www.google.com/search?q='+encodeURIComponent(name+' official school website');fallback.hidden=false;
    try{
      if(!searchSites)throw Error('Online lookup is unavailable here. Choose a common site, search the web, or paste a website.');
      const response=await searchSites({query:name});if(ticket!==generation||!section.isConnected)return;
      const local=commonSchoolMatches(name),seen=new Set(local.map(row=>row.url));
      const found=(response.results||[]).filter(row=>!seen.has(row.url));renderResults([...local,...found]);
      lookupStatus.textContent=found.length?'Online matches are suggestions. Check the website before adding it.':'No additional websites found in the directory. Try a fuller name, search the web, or paste the student sign-in link.';
    }catch(error){if(ticket===generation&&section.isConnected)lookupStatus.textContent=error.message;}
    finally{if(ticket===generation)online.disabled=false;}
  }
  async function write(change){
    generation++;const controls=[...section.querySelectorAll('button,input')].map(el=>[el,el.disabled]);controls.forEach(([el])=>el.disabled=true);
    try{await mutate('setup-school',{studentId:student.id,revision:getSnapshot().rules.revision,...change},{notify:false});}
    catch(error){await refresh().catch(()=>{});throw error;}
    finally{controls.forEach(([el,disabled])=>el.disabled=disabled);online.disabled=false;renderList();}
  }
  function save(){
    if(pending)return pending;
    let address;try{address=schoolWebsite(url.input.value);}catch(error){return Promise.reject(error);}
    const label=title.input.value.trim()||new URL(address).hostname.replace(/^www\./,'');
    if(!editing&&sitesFor(getSnapshot(),student.id).some(site=>site.title===label&&site.url===address)){reset();notice.textContent='This website is already added.';return Promise.resolve();}
    pending=(async()=>{
      await write({operation:editing?'edit':'add',subjectId:editing?.id,provider:schoolProvider(address),title:label,url:address});
      reset();notice.textContent=`${label} saved for ${student.name}. You can add another website or continue.`;delete notice.dataset.error;
    })().finally(()=>pending=null);return pending;
  }
  function removeSite(site){
    if(!canReplace())return Promise.resolve();
    pending=(async()=>{await write({operation:'remove',subjectId:site.id});reset();notice.textContent=`${site.title} removed from ${student.name}.`;delete notice.dataset.error;})().finally(()=>pending=null);return pending;
  }
  reset();renderList();
  // Continue does not turn a search selection into permission without approval.
  return ()=>pending||(dirty?Promise.reject(Error(`Choose Add website or Save website for ${student.name}, or Cancel to add it later.`)):Promise.resolve());
}
