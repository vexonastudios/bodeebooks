export function setupWhiteNoise({ endpoint }) {
  const root=document.getElementById('cloud-white-noise');let active=false, loaded=false, busy=false, upload=null, previewUrl=null;
  const node=(tag,text='',cls='')=>{const el=document.createElement(tag);el.textContent=text;el.className=cls;return el;};
  const button=(text,icon)=>{const el=node('button','','btn btn-secondary');el.type='button';const mark=node('i');mark.dataset.lucide=icon;mark.setAttribute('aria-hidden','true');el.append(mark,node('span',text));return el;};
  const heading=node('div','','tab-header'), title=node('h1','White Noise'), refresh=button('Refresh','refresh-cw');heading.append(title,refresh);
  const note=node('p','Calm MP3 tracks for school and study. Enabled by default, with no school prerequisites or music-time limits.','cloud-note');
  const status=node('p','','cloud-note');status.setAttribute('role','status');
  const children=node('div','','white-noise-children'), library=node('div','','white-noise-library');
  const uploadPanel=node('section','','cloud-panel'), form=node('form','','white-noise-upload');
  const titleLabel=node('label','Track name'), titleInput=node('input');titleInput.required=true;titleInput.maxLength=100;titleInput.className='admin-input';titleLabel.append(titleInput);
  const fileLabel=node('label','MP3 file · up to 32 MB'), file=node('input');file.type='file';file.accept='.mp3,audio/mpeg';file.required=true;fileLabel.append(file);
  const scopeLabel=node('label','Library'), scope=node('select');scope.className='admin-input';scope.append(new Option('My family only','family'),new Option('Shared with every family','shared'));scopeLabel.append(scope);scopeLabel.hidden=true;
  const localPreview=node('audio');localPreview.controls=true;localPreview.hidden=true;localPreview.preload='metadata';localPreview.setAttribute('aria-label','Preview selected MP3');
  const progress=node('progress');progress.max=100;progress.hidden=true;progress.setAttribute('aria-label','MP3 upload progress');
  const submit=button('Upload MP3','upload');submit.type='submit';form.append(titleLabel,fileLabel,scopeLabel,localPreview,progress,submit);uploadPanel.append(node('h2','Add a calm track'),form);
  root.append(heading,note,status,node('h2','Children'),children,uploadPanel,node('h2','Available tracks'),library);
  async function call(command) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'white-noise',...command}),signal:AbortSignal.timeout(30000)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'White Noise could not be updated.');return data;
  }
  function clearPreview(){localPreview.pause();localPreview.removeAttribute('src');localPreview.load();localPreview.hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;}
  file.addEventListener('change',()=>{clearPreview();upload=null;const selected=file.files[0];if(!selected)return;if(!/\.mp3$/i.test(selected.name)||selected.size<128||selected.size>33554432){status.textContent='Choose an MP3 up to 32 MB.';file.value='';return;}if(!titleInput.value)titleInput.value=selected.name.replace(/\.mp3$/i,'').slice(0,100);previewUrl=URL.createObjectURL(selected);localPreview.src=previewUrl;localPreview.hidden=false;});
  const refreshIcons=()=>window.lucide?.createIcons();
  async function load(){
    if(busy)return;busy=true;refresh.disabled=true;
    try {
      const value=await call({operation:'list'});loaded=true;scopeLabel.hidden=!value.canManageShared;children.replaceChildren();library.replaceChildren();
      for(const child of value.students){const label=node('label','','white-noise-child'), toggle=node('input');toggle.type='checkbox';toggle.checked=child.enabled;toggle.setAttribute('aria-label','White Noise for '+child.name);label.append(toggle,node('span',child.name));children.append(label);
        toggle.addEventListener('change',async()=>{toggle.disabled=true;try{await call({operation:'enabled',studentId:child.id,enabled:toggle.checked});status.textContent='White Noise '+(toggle.checked?'enabled':'disabled')+' for '+child.name+'.';}catch(error){toggle.checked=!toggle.checked;status.textContent=error.message;}finally{toggle.disabled=false;}});}
      for(const track of value.tracks){const card=node('article','','cloud-panel white-noise-track'), description=node('p',track.scope==='shared'?'Shared BodeeGuard library':'Private family track','cloud-note'), play=button('Preview','play'), audio=node('audio');audio.controls=true;audio.preload='none';audio.hidden=true;audio.setAttribute('aria-label',track.title);
        play.addEventListener('click',async()=>{play.disabled=true;try{const receipt=await call({operation:'preview',id:track.id});const url=new URL(receipt.url);if(url.origin!=='https://bodeeguard-cloud-assets.james-7f8.workers.dev'||!url.pathname.startsWith('/v1/download/'))throw Error('Invalid audio preview.');for(const other of library.querySelectorAll('audio'))if(other!==audio)other.pause();audio.src=url.href;audio.hidden=false;await audio.play();}catch(error){status.textContent=error.message;}finally{play.disabled=false;}});
        card.append(node('h3',track.title),description,play,audio);
        if(track.scope==='family'||value.canManageShared){const remove=button('Remove','trash-2');remove.addEventListener('click',async()=>{if(!window.confirm('Remove “'+track.title+'” from '+(track.scope==='shared'?'every family’s shared library':'your family library')+'?'))return;remove.disabled=true;try{await call({operation:'remove',id:track.id});await load();}catch(error){status.textContent=error.message;remove.disabled=false;}});card.append(remove);}library.append(card);}
      if(!value.tracks.length)library.append(node('p','Upload your first MP3 above. Shared tracks will appear here for every family.','cloud-note'));
      refreshIcons();
    }catch(error){status.textContent=error.message;}finally{busy=false;refresh.disabled=false;}
  }
  function sendFile(url, selected){return new Promise((resolve,reject)=>{const target=new URL(url);if(target.origin!=='https://bodeeguard-cloud-assets.james-7f8.workers.dev'||!target.pathname.startsWith('/v1/white-noise-upload/')){reject(Error('Invalid upload destination.'));return;}const xhr=new XMLHttpRequest();xhr.open('PUT',target.href);xhr.timeout=180000;xhr.setRequestHeader('Content-Type','audio/mpeg');xhr.upload.onprogress=event=>{if(event.lengthComputable){progress.value=event.loaded/event.total*100;status.textContent='Uploading MP3 · '+Math.round(progress.value)+'%';}};xhr.onerror=xhr.ontimeout=()=>reject(Error('The upload was interrupted. Press Upload MP3 to retry.'));xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('The MP3 upload was rejected. Check the file and retry.'));xhr.send(selected);});}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;const selected=file.files[0];if(!selected)return;busy=true;submit.disabled=true;file.disabled=true;titleInput.disabled=true;scope.disabled=true;progress.hidden=false;progress.value=0;
    try {
      if(!upload || upload.title!==titleInput.value.trim() || upload.scope!==scope.value){const bytes=await selected.arrayBuffer(), digest=await crypto.subtle.digest('SHA-256',bytes);upload={id:crypto.randomUUID(),title:titleInput.value.trim(),scope:scope.value,size:selected.size,sha256:[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')};}
      status.textContent='Preparing MP3 upload…';const ticket=await call({operation:'begin',...upload});await sendFile(ticket.uploadUrl,selected);await call({operation:'finish',id:upload.id});
      status.textContent='MP3 added. Children can find it in White Noise.';clearPreview();form.reset();upload=null;busy=false;await load();
    }catch(error){status.textContent=error.message;}finally{busy=false;submit.disabled=false;file.disabled=false;titleInput.disabled=false;scope.disabled=false;progress.hidden=true;}
  });
  refresh.addEventListener('click',()=>void load());
  return {setActive(value){active=value;if(active&&!loaded)void load();if(!active){localPreview.pause();library.querySelectorAll('audio').forEach(audio=>audio.pause());}}};
}
