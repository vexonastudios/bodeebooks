export function setupCloudRetention({ endpoint }) {
  const root = document.createElement('section'); root.className = 'cloud-panel'; root.id = 'cloud-history-retention';
  root.innerHTML = `<h2><i data-lucide="history"></i> History &amp; privacy</h2>
    <p>Choose when cloud messages and saved BodeeGuard tutor replies expire. School records, grades, submitted documents and kept screenshots stay saved.</p>
    <form><label><input name="enabled" type="checkbox"> Automatically remove expired history</label>
    <label>Keep messages for <select name="messageDays" class="admin-input"><option value="30">30 days</option><option value="90">90 days</option><option value="180">6 months</option><option value="365">1 year</option><option value="">Until I remove them</option></select></label>
    <label>Keep detailed school activity for <select name="schoolEventDays" class="admin-input"><option value="30">30 days</option><option value="90">90 days</option><option value="180">6 months</option><option value="365">1 year</option></select></label>
    <p>Daily school totals and reports stay saved. Archived school dates keep their original dates if your time zone changes. Built-in tutor replies expire after 30 days when cleanup is enabled; the separate Math Coach always keeps 30 days. Attachments expire with their last message; unattached message uploads expire after seven days. Settings changes have a seven-day grace period.</p>
    <button class="btn btn-primary" type="submit" disabled><i data-lucide="save"></i> Save history settings</button><p role="status"></p></form>`;
  document.getElementById('tab-settings')?.append(root);
  const form = root.querySelector('form'), status = root.querySelector('[role="status"]'), save = root.querySelector('button');
  let policy = null, busy = false, active = false;
  async function request(action, data = {}) {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const value = await response.json(); if (!response.ok) throw Error(value.error || 'History settings could not be loaded.'); return value.policy;
  }
  function render() {
    form.elements.enabled.checked = policy.enabled; form.elements.messageDays.value = policy.messageDays === null ? '' : String(policy.messageDays);
    form.elements.schoolEventDays.value=String(policy.schoolEventDays||90);
    status.textContent = policy.enabled ? `Automatic cleanup begins ${new Date(policy.effectiveAt).toLocaleDateString()}.` : 'Automatic history cleanup is off.';
  }
  async function load() {
    if (!active || document.hidden || busy || policy) return;
    busy = true;
    try { policy = await request('get-retention'); render(); }
    catch (error) { status.textContent = error.message; }
    finally { busy = false; save.disabled = !policy; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !policy) return; busy = true; save.disabled = true;
    try {
      policy = await request('save-retention', { revision: policy.revision, enabled: form.elements.enabled.checked, schoolEventDays:Number(form.elements.schoolEventDays.value), messageDays: form.elements.messageDays.value === '' ? null : Number(form.elements.messageDays.value) }); render();
    } catch (error) { status.textContent = `${error.message} Reopen Settings before retrying.`; policy = null; }
    finally { busy = false; save.disabled = !policy; }
  });
  const privacy=document.createElement('div');privacy.innerHTML=`<h3>Export or remove family data</h3><p>Export school records, conversations and saved files. Download each part when prompted to continue the export.</p><button type="button" class="btn btn-secondary" data-export><i data-lucide="download"></i> Export family data</button><div data-downloads></div>
    <details><summary>Remove family data</summary><p>Removal starts after 30 days and can be cancelled before then. It removes cloud school records, submitted work, media, profiles and Math Coach history, and disconnects enrolled computers. Local drafts and playback positions stay on the computers. Billing records and your subscription are separate; this does not cancel billing.</p><label>Type DELETE FAMILY DATA <input class="admin-input" data-confirm autocomplete="off"></label><button type="button" class="btn btn-secondary" data-delete>Schedule removal</button><button type="button" class="btn btn-secondary" data-cancel hidden>Cancel removal</button></details><p role="status" data-privacy-status></p>`;root.append(privacy);
  const note=privacy.querySelector('[data-privacy-status]'),download=privacy.querySelector('[data-export]'),remove=privacy.querySelector('[data-delete]'),cancel=privacy.querySelector('[data-cancel]');
  let removal=null,exporting=false;const exportURLs=new Set();
  window.addEventListener('pagehide',()=>{for(const url of exportURLs)URL.revokeObjectURL(url);});
  const privacyRequest=async(action,data={})=>{const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...data})});const result=await response.json();if(!response.ok)throw Error(result.error||'Privacy request could not finish.');return result;};
  const showRemoval=()=>{remove.disabled=!removal||!['none','cancelled','scheduled'].includes(removal.status);cancel.hidden=removal?.status!=='scheduled';note.textContent=removal?.status==='scheduled'?`Removal scheduled for ${new Date(removal.executeAfter).toLocaleDateString()}.`:removal&&['running','objects','complete'].includes(removal.status)?`Removal: ${removal.status==='complete'?'complete':'in progress'}.`:'';};
  const loadPrivacy=async()=>{if(removal||document.hidden)return;try{removal=await privacyRequest('privacy-status');showRemoval();}catch(error){note.textContent=error.message;}};
  remove.disabled=true;
  remove.addEventListener('click',async()=>{if(!removal)return;remove.disabled=true;try{removal=await privacyRequest('privacy-delete',{revision:removal.revision,confirmation:privacy.querySelector('[data-confirm]').value});showRemoval();}catch(error){note.textContent=error.message;remove.disabled=false;}});
  cancel.addEventListener('click',async()=>{if(!removal)return;cancel.disabled=true;try{removal=await privacyRequest('privacy-cancel',{revision:removal.revision});showRemoval();}catch(error){note.textContent=error.message;}finally{cancel.disabled=false;}});
  download.addEventListener('click',async()=>{
    if(exporting)return;exporting=true;download.disabled=true;let chunks=[],bytes=0,part=0,pages=0;const objects=new Set(),links=privacy.querySelector('[data-downloads]');
    for(const url of exportURLs)URL.revokeObjectURL(url);exportURLs.clear();links.replaceChildren();
    const savePart=async(pause=false)=>{if(!chunks.length)return;const link=document.createElement('a');link.href=URL.createObjectURL(new Blob(chunks,{type:'application/x-ndjson'}));exportURLs.add(link.href);link.download=`BodeeGuard-family-data-${++part}.jsonl`;link.textContent=`Download export part ${part}`;link.className='btn btn-secondary';links.append(link);chunks=[];bytes=0;if(pause){note.textContent=`Download part ${part} to continue preparing the export.`;await new Promise(resolve=>link.addEventListener('click',()=>{const url=link.href;setTimeout(()=>{URL.revokeObjectURL(url);exportURLs.delete(url);link.removeAttribute('href');link.textContent=`Part ${part} download started`;resolve();},1000);},{once:true}));}};
    const append=value=>{chunks.push(value);bytes+=value.byteLength||new TextEncoder().encode(value).length;};
    const base64=buffer=>{let text='';for(let i=0;i<buffer.length;i+=8192)text+=String.fromCharCode(...buffer.subarray(i,i+8192));return btoa(text);};
    try{let cursor={};for(;;){const page=await privacyRequest('privacy-export',cursor);note.textContent=`Preparing export (${++pages} batches)…`;
      for(const object of page.objects||[]){if(objects.has(object.key))continue;const response=await fetch(object.url,{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('A saved file could not be exported. Retry the export.');const data=new Uint8Array(await response.arrayBuffer());append(JSON.stringify({object:object.key,data:base64(data)})+'\n');objects.add(object.key);}
      if(page.data)append(Uint8Array.from(atob(page.data),char=>char.charCodeAt(0)));
      if(page.hostedMath)for(const record of page.hostedMath)append(JSON.stringify({table:'hosted_math',record})+'\n');
      if(bytes>=32*1024*1024&&(!page.next?.chunk)&&!page.done)await savePart(true);if(page.done){await savePart();break;}cursor=page.next;
    }note.textContent=`Export ready. Download the remaining part above and keep all ${part} parts. The files contain private family records.`;}catch(error){note.textContent=`Export incomplete: ${error.message} Previously completed parts remain available.`;}finally{exporting=false;download.disabled=false;}
  });
  return { setActive(value) { active = value; if (active){void load();void loadPrivacy();} } };
}
