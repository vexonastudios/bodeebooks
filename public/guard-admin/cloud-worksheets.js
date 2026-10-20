import { openWorksheetPdf, worksheetPdfPages } from './cloud-worksheet-pdf.js';
const CHUNK=1048576,el=id=>document.getElementById(id),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const base64=bytes=>{let value='';for(let offset=0;offset<bytes.length;offset+=16384)value+=String.fromCharCode(...bytes.subarray(offset,offset+16384));return btoa(value);};
async function request(action,body={}){const response=await fetch('/guard/dashboard/worksheets/',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(28000),body:JSON.stringify({action,...body})}),data=await response.json();if(!response.ok)throw Error(data.error||'Worksheets could not be reached.');return data;}
async function manifestFor(worksheetId,mime,bytes){const parts=[];for(let offset=0;offset<bytes.length;offset+=CHUNK){const chunk=bytes.subarray(offset,offset+CHUNK);parts.push({sha256:await digest(chunk),bytes:chunk.length});}return{worksheetId,mime,size:bytes.length,sha256:await digest(bytes),parts};}
async function imageFor(worksheetId){const result=await request('file',{worksheetId,view:'manifest'}),m=result.manifest;if(!m||m.worksheetId!==worksheetId||!['image/png','image/jpeg','image/webp'].includes(m.mime)||!Number.isInteger(m.size)||m.size<1||m.size>12*CHUNK||!/^[a-f0-9]{64}$/.test(m.sha256)||!Array.isArray(m.parts)||m.parts.length!==Math.ceil(m.size/CHUNK))throw Error('The worksheet image could not be verified.');const bytes=new Uint8Array(m.size);let offset=0;for(const[position,part]of m.parts.entries()){if(part.bytes!==Math.min(CHUNK,m.size-offset)||!/^[a-f0-9]{64}$/.test(part.sha256))throw Error('The worksheet parts are invalid.');const received=await request('file',{worksheetId,view:'part',position});if(received.worksheetId!==worksheetId||received.position!==position||received.sha256!==part.sha256||typeof received.data!=='string'||received.data.length>1398104)throw Error('The worksheet part belongs to another page.');const chunk=Uint8Array.from(atob(received.data),c=>c.charCodeAt(0));if(chunk.length!==part.bytes||await digest(chunk)!==part.sha256)throw Error('A worksheet part was damaged.');bytes.set(chunk,offset);offset+=chunk.length;}if(await digest(bytes)!==m.sha256)throw Error('The complete worksheet was damaged.');return new Blob([bytes],{type:m.mime});}
export function setupCloudWorksheets(){
  let active=false,busy=false,epoch=0,offset=0,rows=[],upload=null,pending=null,selectedFile=null,previewUrl=null,lastLoaded=0,loading=null,dialog=null,fullUrl=null,fullEpoch=0;const thumbnails=new Map(),inflight=new Map(),urls=new Set(),message=text=>{el('worksheet-admin-status').textContent=text;},uploadMessage=text=>{el('worksheet-upload-status').textContent=text;};
  let pdfSource=null,pdfPage=1,batch=null;
  function controls(){const frozen=busy||!!pending;for(const control of el('tab-worksheets').querySelectorAll('input,textarea,button,select'))control.disabled=frozen;el('worksheet-edit-retry').hidden=!pending;el('worksheet-edit-retry').disabled=busy;el('worksheet-upload-cancel').hidden=!upload&&!batch&&!selectedFile&&!pdfSource;el('worksheet-upload-cancel').disabled=frozen;el('worksheet-upload-cancel').textContent=upload||batch?'Leave upload for later':'Clear file';
    let pageCount=0;if(pdfSource)try{pageCount=worksheetPdfPages(el('worksheet-pdf-pages').value,pdfSource.numPages).length;}catch{/* Selection errors appear when the parent edits the range. */}
    el('worksheet-upload-submit').textContent=batch?'Resume remaining pages':upload?'Resume this upload':pdfSource?'Add '+pageCount+' worksheet'+(pageCount===1?'':'s'):'Add worksheet';el('worksheet-upload-submit').disabled=frozen||!selectedFile||!!pdfSource&&!pageCount;
    for(const id of ['title','category','description','active'])el('worksheet-upload-'+id).disabled=frozen||!!upload||!!batch;
    el('worksheet-upload-file').disabled=frozen||!!batch;el('worksheet-pdf-controls').hidden=!pdfSource;el('worksheet-pdf-page').disabled=frozen||!!batch;el('worksheet-pdf-pages').disabled=frozen||!!upload||!!batch;el('worksheet-pdf-previous').disabled=frozen||!!batch||pdfPage<=1;el('worksheet-pdf-next').disabled=frozen||!!batch||pdfPage>=(pdfSource?.numPages||1);
    el('worksheet-page-previous').disabled=frozen||offset===0;el('worksheet-page-next').disabled=frozen||offset+12>=rows.length;}
  function uploadPreview(blob){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);el('worksheet-upload-preview').src=previewUrl;el('worksheet-upload-preview').hidden=false;el('worksheet-upload-prompt').hidden=true;}
  async function pdfPreview(page){const rendered=await pdfSource.render(page);selectedFile={bytes:rendered.bytes,mime:rendered.mime,pageNumber:page};pdfPage=page;el('worksheet-pdf-page').value=String(page);if(upload&&!batch)el('worksheet-pdf-pages').value=String(page);uploadPreview(rendered.blob);}
  function closePdf(){const source=pdfSource;pdfSource=null;pdfPage=1;batch=null;if(source)void source.close().catch(()=>{});el('worksheet-pdf-page').replaceChildren();el('worksheet-pdf-pages').value='';el('worksheet-pdf-controls').hidden=true;}
  const previewKey=row=>[row.id,row.image_sha256||row.revision,row.size].join(':');
  function clear(){for(const url of urls)URL.revokeObjectURL(url);urls.clear();thumbnails.clear();}
  function prune(){const keep=new Set(rows.filter(row=>row.state==='ready').map(previewKey));for(const[key,url]of thumbnails){if(keep.has(key))continue;URL.revokeObjectURL(url);urls.delete(url);thumbnails.delete(key);}}
  async function thumbnailFor(row){
    const key=previewKey(row);if(thumbnails.has(key))return thumbnails.get(key);if(inflight.has(key))return inflight.get(key);
    const promise=(async()=>{const result=await request('file',{worksheetId:row.id,view:'preview'});
      if(result.worksheetId!==row.id||result.mime!=='image/webp'||!Number.isInteger(result.size)||result.size<1||result.size>262144||typeof result.data!=='string'||result.data.length>349528||!/^[a-f0-9]{64}$/.test(result.sha256)||row.image_sha256&&result.sourceSha256!==row.image_sha256)throw Error('The worksheet preview could not be verified.');
      const bytes=Uint8Array.from(atob(result.data),c=>c.charCodeAt(0));if(bytes.length!==result.size||await digest(bytes)!==result.sha256)throw Error('The worksheet preview was damaged.');
      if(!rows.some(saved=>previewKey(saved)===key))throw Error('That worksheet changed. Refresh the library.');
      const url=URL.createObjectURL(new Blob([bytes],{type:result.mime}));thumbnails.set(key,url);urls.add(url);
      while(thumbnails.size>48){const oldest=thumbnails.keys().next().value,oldUrl=thumbnails.get(oldest);thumbnails.delete(oldest);urls.delete(oldUrl);URL.revokeObjectURL(oldUrl);}return url;
    })();inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
  }
  function closeFull(){fullEpoch++;dialog?.close();dialog?.remove();dialog=null;if(fullUrl)URL.revokeObjectURL(fullUrl);fullUrl=null;}
  async function openFull(row){
    closeFull();const generation=fullEpoch;dialog=document.createElement('dialog');dialog.className='worksheet-full-dialog';dialog.setAttribute('aria-labelledby','worksheet-full-title');
    const title=document.createElement('h2');title.id='worksheet-full-title';title.textContent=row.title;
    const close=document.createElement('button');close.type='button';close.className='btn btn-secondary';close.textContent='Close';close.onclick=closeFull;
    const content=document.createElement('div');content.className='worksheet-full-content';content.textContent='Opening full-size worksheet…';content.setAttribute('aria-live','polite');
    dialog.append(title,close,content);dialog.addEventListener('cancel',event=>{event.preventDefault();closeFull();});document.body.append(dialog);dialog.showModal();close.focus();
    try{const blob=await imageFor(row.id);if(generation!==fullEpoch||!active)return;fullUrl=URL.createObjectURL(blob);const image=document.createElement('img');image.src=fullUrl;image.alt=row.title;content.replaceChildren(image);}
    catch(error){if(generation===fullEpoch&&dialog)content.textContent=error.message+' Close and try again.';}
  }
  function reset(){upload=null;selectedFile=null;closePdf();el('worksheet-upload-file').value='';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;el('worksheet-upload-preview').removeAttribute('src');el('worksheet-upload-preview').hidden=true;el('worksheet-upload-prompt').hidden=false;el('worksheet-upload-title').value='';el('worksheet-upload-category').value='General';el('worksheet-upload-description').value='';el('worksheet-upload-active').checked=true;controls();}
  function resume(row){if(busy||pending)return;reset();upload={worksheetId:row.id,metadata:{title:row.title,category:row.category,description:row.description,active:row.active,display_order:row.display_order}};for(const key of ['title','category','description'])el('worksheet-upload-'+key).value=row[key];el('worksheet-upload-active').checked=row.active;uploadMessage('Choose the original image, or the same page of the original PDF, to resume. Verified parts are retained.');el('worksheet-upload-file').scrollIntoView({block:'center'});controls();}
  async function render(){const generation=++epoch;const visible=rows.slice(offset,offset+12);el('worksheet-admin-grid').innerHTML=visible.map(w=>`<article class="worksheet-admin-card${w.active?'':' is-hidden'}" data-worksheet-id="${escape(w.id)}"><div class="worksheet-admin-preview">${w.state==='ready'?'<button type="button" class="worksheet-preview-open" aria-label="Open full-size '+escape(w.title)+'">'+(thumbnails.has(previewKey(w))?'<img decoding="async" src="'+thumbnails.get(previewKey(w))+'" alt="Preview of '+escape(w.title)+'">':'<span>Loading preview…</span>')+'<span class="worksheet-preview-hint">Open full size</span></button>':'Upload unfinished'}</div><div class="worksheet-admin-card-body"><div class="worksheet-admin-card-meta"><span class="worksheet-admin-source">${w.source_kind==='bundled'?'BodeeGuard starter':w.origin==='cloud'?'Family upload':'Transferred worksheet'}</span><span class="worksheet-admin-visibility${w.active?'':' hidden'}">${w.state!=='ready'?'Awaiting original image':w.active?'Shown to children':'Hidden'}</span></div><div class="worksheet-edit-fields"><label><span>Name</span><input data-field="title" maxlength="120" value="${escape(w.title)}"></label><label><span>Category</span><input data-field="category" maxlength="40" value="${escape(w.category)}"></label><label><span>Description</span><textarea data-field="description" maxlength="300">${escape(w.description)}</textarea></label><label class="worksheet-visible-toggle"><input data-field="active" type="checkbox" ${w.active?'checked':''}><span>Show to children</span></label></div><div class="worksheet-admin-actions">${w.state==='ready'?'<button class="worksheet-card-save">Save changes</button><button class="worksheet-card-remove">'+(w.active?'Hide':'Show')+'</button>':'<button class="worksheet-card-resume">Resume upload…</button>'}</div></div></article>`).join('')||'<div class="worksheet-admin-empty">No worksheets have been added yet.</div>';message(rows.filter(w=>w.active&&w.state==='ready').length+' shown to children · '+rows.length+' total');controls();
    let next=0;async function worker(){while(next<visible.length){const w=visible[next++];if(generation!==epoch||!active)return;if(w.state!=='ready'||thumbnails.has(previewKey(w)))continue;const card=[...el('worksheet-admin-grid').children].find(c=>c.dataset.worksheetId===w.id);try{const url=await thumbnailFor(w);if(generation!==epoch||!active)return;const button=card.querySelector('.worksheet-preview-open');button.innerHTML='<img decoding="async" src="'+url+'" alt="Preview of '+escape(w.title)+'"><span class="worksheet-preview-hint">Open full size</span>';}
      catch{if(generation!==epoch||!active)return;if(card.isConnected){const box=card.querySelector('.worksheet-admin-preview');box.querySelector('.worksheet-preview-open span').textContent='Preview unavailable';const retry=document.createElement('button');retry.type='button';retry.className='worksheet-preview-retry';retry.textContent='Retry preview';box.append(retry);}}}}
    await Promise.all([worker(),worker(),worker()]);
  }
  async function load(){if(loading)return loading;loading=(async()=>{try{const result=await request('list');if(!active)return;const changed=JSON.stringify(rows)!==JSON.stringify(result.worksheets);rows=result.worksheets;lastLoaded=Date.now();if(offset>=rows.length)offset=0;prune();if(changed||!el('worksheet-admin-grid').children.length)void render();}catch(error){message(error.message);}finally{controls();}})();try{await loading;}finally{loading=null;}}
  async function edit(change){if(busy)return;pending=change;busy=true;controls();try{const result=await request('command',pending);if(result.saved!==true||result.id!==pending.id||result.worksheet?.id!==pending.worksheetId)throw Error('The saved reply did not match this worksheet. Retry the saved edit.');pending=null;await load();}catch(error){message(error.message+' Keep this page open and retry the saved edit.');}finally{busy=false;controls();}}
  el('worksheet-upload-file').onchange=async()=>{
    if(busy||pending||batch)return;
    const file=el('worksheet-upload-file').files?.[0];selectedFile=null;closePdf();
    if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;el('worksheet-upload-preview').hidden=true;el('worksheet-upload-prompt').hidden=false;
    if(!file){controls();return;}busy=true;controls();
    try{
      if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
        uploadMessage('Opening PDF on this device…');pdfSource=await openWorksheetPdf(file);
        const picker=el('worksheet-pdf-page');for(let page=1;page<=pdfSource.numPages;page++){const option=document.createElement('option');option.value=String(page);option.textContent='Page '+page+' of '+pdfSource.numPages;picker.append(option);}
        el('worksheet-pdf-pages').value=upload?'1':pdfSource.numPages===1?'1':'1-'+Math.min(50,pdfSource.numPages);
        await pdfPreview(1);
        uploadMessage(upload?'Choose the PDF page used for this unfinished upload, then resume.':'PDF ready. Preview its pages and choose which to add. Each selected page becomes one JPG worksheet.');
      }else{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size||file.size>12*CHUNK)throw Error('Choose a PNG, JPG or WebP image up to 12 MB, or a PDF up to 20 MB.');
        const bitmap=await createImageBitmap(file);try{if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000)throw Error('Use a worksheet image with at most 40 million pixels.');}finally{bitmap.close();}
        selectedFile={bytes:new Uint8Array(await file.arrayBuffer()),mime:file.type};uploadPreview(file);
        uploadMessage(upload?'Original image selected. Resume when ready.':'Preview ready. Name the page, then add it.');
      }
      if(!upload&&!el('worksheet-upload-title').value.trim())el('worksheet-upload-title').value=file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').slice(0,120);
    }catch(error){selectedFile=null;closePdf();uploadMessage(error.message);}
    finally{busy=false;controls();}
  };
  async function browsePdf(page){if(busy||pending||batch||!pdfSource)return;busy=true;controls();try{await pdfPreview(page);uploadMessage('Previewing PDF page '+page+'. Choose the pages to add below.');}catch(error){uploadMessage(error.message);}finally{busy=false;controls();}}
  el('worksheet-pdf-previous').onclick=()=>void browsePdf(pdfPage-1);el('worksheet-pdf-next').onclick=()=>void browsePdf(pdfPage+1);el('worksheet-pdf-page').onchange=()=>void browsePdf(Number(el('worksheet-pdf-page').value));
  el('worksheet-pdf-pages').oninput=()=>{try{const pages=worksheetPdfPages(el('worksheet-pdf-pages').value,pdfSource.numPages);uploadMessage(pages.length+' page'+(pages.length===1?'':'s')+' selected. Each will be saved as a JPG worksheet.');}catch(error){uploadMessage(error.message);}controls();};
  function uploadMetadata(){return {title:el('worksheet-upload-title').value.trim(),category:el('worksheet-upload-category').value,description:el('worksheet-upload-description').value,active:el('worksheet-upload-active').checked,display_order:100};}
  async function saveUpload(label=''){
    const manifest=await manifestFor(upload.worksheetId,selectedFile.mime,selectedFile.bytes),begun=await request('upload',{...manifest,...upload,kind:'begin'});
    if(begun.worksheetId!==upload.worksheetId||begun.manifest.sha256!==manifest.sha256)throw Error('This upload belongs to another image.');
    if(!begun.ready)for(const[position,part]of manifest.parts.entries()){
      if(begun.storedParts.includes(position))continue;uploadMessage(label+'Saving image part '+(position+1)+' of '+manifest.parts.length+'…');
      const result=await request('upload',{worksheetId:upload.worksheetId,kind:'put',position,data:base64(selectedFile.bytes.subarray(position*CHUNK,position*CHUNK+part.bytes))});
      if(!result.stored||result.position!==position||result.sha256!==part.sha256)throw Error('A part reply was lost. Resume this upload.');
    }
    const result=await request('upload',{worksheetId:upload.worksheetId,kind:'complete'});
    if(!result.saved||!result.ready||result.worksheetId!==upload.worksheetId)throw Error('The final upload reply was lost. Resume this upload.');
  }
  el('worksheet-upload-submit').onclick=async()=>{
    if(busy||pending||!selectedFile)return;
    if(!upload&&!batch){
      const metadata=uploadMetadata();if(!metadata.title){uploadMessage('Give this worksheet a name.');return;}
      if(pdfSource){let pages;try{pages=worksheetPdfPages(el('worksheet-pdf-pages').value,pdfSource.numPages);}catch(error){uploadMessage(error.message);return;}
        batch={index:0,items:pages.map(page=>{const suffix=pdfSource.numPages>1?' · Page '+page:'';return {page,worksheetId:crypto.randomUUID(),metadata:{...metadata,title:metadata.title.slice(0,120-suffix.length)+suffix}};})};
      }else upload={worksheetId:crypto.randomUUID(),metadata};
    }
    busy=true;controls();
    try{
      if(batch){
        while(batch.index<batch.items.length){
          const item=batch.items[batch.index],label='PDF page '+item.page+' ('+(batch.index+1)+' of '+batch.items.length+'). ';
          upload={worksheetId:item.worksheetId,metadata:item.metadata};
          if(selectedFile.pageNumber!==item.page){uploadMessage(label+'Converting to JPG…');await pdfPreview(item.page);}
          await saveUpload(label);upload=null;batch.index++;
        }
        const count=batch.items.length;reset();uploadMessage(count+' worksheet'+(count===1?'':'s')+' added to the family library from your PDF.');
      }else{await saveUpload();reset();uploadMessage('Worksheet added to the family library.');}
      await load();
    }catch(error){uploadMessage((batch?batch.index+' page'+(batch.index===1?'':'s')+' added. ':'')+error.message+' The upload remains available to resume.');await load();}
    finally{busy=false;controls();}
  };
  el('worksheet-upload-cancel').onclick=()=>{if(!busy&&!pending){const started=!!upload||!!batch;reset();uploadMessage(started?'Pages already added stay in your library. Any unfinished image parts can be resumed from the library.':'File cleared. Choose an image or PDF to add.');void load();}};
  el('worksheet-edit-retry').onclick=()=>{if(pending)void edit(pending);};el('worksheet-admin-refresh').onclick=async()=>{await load();if(active)void render();};el('worksheet-page-previous').onclick=()=>{offset=Math.max(0,offset-12);void render();};el('worksheet-page-next').onclick=()=>{offset+=12;void render();};
  el('worksheet-admin-grid').onclick=event=>{if(busy||pending)return;const card=event.target.closest('[data-worksheet-id]'),row=rows.find(w=>w.id===card?.dataset.worksheetId);if(!row)return;if(event.target.closest('.worksheet-preview-retry')){void render();return;}if(event.target.closest('.worksheet-preview-open')){void openFull(row);return;}if(event.target.closest('.worksheet-card-resume')){resume(row);return;}const hide=event.target.closest('.worksheet-card-remove');if(!hide&&!event.target.closest('.worksheet-card-save'))return;const metadata=hide?{title:row.title,category:row.category,description:row.description,active:!row.active,display_order:row.display_order}:{title:card.querySelector('[data-field="title"]').value,category:card.querySelector('[data-field="category"]').value,description:card.querySelector('[data-field="description"]').value,active:card.querySelector('[data-field="active"]').checked,display_order:row.display_order};void edit({id:crypto.randomUUID(),worksheetId:row.id,revision:row.revision,metadata});};
  window.addEventListener('pagehide',()=>{clear();closeFull();closePdf();});window.addEventListener('beforeunload',event=>{if(pending||busy||batch||upload){event.preventDefault();event.returnValue='';}});controls();return{setActive(value){if(active===value)return;active=value;if(value){if(rows.length)void render();if(!lastLoaded||Date.now()-lastLoaded>30000)void load();}else{epoch++;closeFull();}}};
}
