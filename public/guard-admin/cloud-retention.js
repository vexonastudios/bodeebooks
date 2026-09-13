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
  const backups = setupRecoveryBackups({ endpoint, root });
  return { setActive(value) { active = value; backups.setActive(value); if (active){void load();void loadPrivacy();} } };
}

function setupRecoveryBackups({ endpoint, root }) {
  const section = document.createElement('section'); section.className = 'cloud-panel'; section.id = 'cloud-recovery-backups';
  section.innerHTML = `<h3><i data-lucide="hard-drive-download"></i> Computer backups &amp; recovery</h3>
    <p>Keep private recovery copies of your children’s writing and planners in Cloudflare. Saving and reminders still work locally. Backups do not submit papers for grading.</p>
    <p>Parent settings and profiles are already saved with your family account and apply again when you connect a replacement computer. School logins, Windows passwords, device credentials and playback positions are excluded.</p>
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><label><input type="checkbox" data-enabled disabled> Back up writing and planners</label>
    <button type="button" class="btn btn-primary" data-save disabled><i data-lucide="save"></i> Save</button>
    <button type="button" class="btn btn-secondary" data-refresh><i data-lucide="refresh-cw"></i> Refresh backups</button></div>
    <p>Changed work backs up about every 15 minutes while BodeeGuard is open and connected. Keep up to seven recent versions and one from each of seven saved dates. The last good copy stays until you remove it. Family allowance: 256 MB.</p>
    <p role="status" data-status></p><div data-list style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px"></div>`;
  root.append(section);
  const note = section.querySelector('[data-status]'), enabled = section.querySelector('[data-enabled]'), save = section.querySelector('[data-save]'), refresh = section.querySelector('[data-refresh]'), list = section.querySelector('[data-list]');
  let state = null, busy = false, active = false;
  const request = async (operation, data = {}) => {
    const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'recovery-backups', operation, ...data }) });
    const result = await response.json(); if (!response.ok) throw Error(result.error || 'Recovery could not finish.'); return result;
  };
  const text = (tag, value, parent) => { const node = document.createElement(tag); node.textContent = value; parent.append(node); return node; };
  async function perform(operation, data, message) {
    if (busy) return; busy = true; save.disabled = true; refresh.disabled = true;
    try { state = await request(operation, data); render(); note.textContent = message || ''; }
    catch (error) { note.textContent = error.message; }
    finally { busy = false; enabled.disabled = !state; save.disabled = !state; refresh.disabled = false; }
  }
  function render() {
    enabled.checked = state.settings.enabled; list.replaceChildren();
    if (!state.backups.length) text('p', state.settings.enabled ? 'No successful backup yet. Leave the child’s updated BodeeGuard open and connected. Local work is not protected by a cloud copy until a backup appears here.' : 'Backups are off. Turn them on above to protect local writing and planners.', list);
    for (const backup of state.backups) {
      const devices = state.devices.filter(device => device.student_id === backup.studentId);
      const card = document.createElement('article'); card.className = 'cloud-panel'; list.append(card);
      text('h4', backup.studentName || devices[0]?.student_name || 'Saved child work', card);
      text('p', `${new Date(backup.createdAt).toLocaleString()} · ${backup.documents} notes · ${backup.assignments} assignments · ${(backup.size / 1024).toFixed(0)} KB`, card);
      const target = document.createElement('select'); target.className = 'admin-input'; target.setAttribute('aria-label', 'Computer to restore onto'); card.append(target);
      for (const device of devices) { const option = document.createElement('option'); option.value = device.id; option.textContent = device.name; target.append(option); }
      if (!devices.length) text('p', 'Connect a computer to this child before restoring.', card);
      const buttons = document.createElement('div'); buttons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px'; card.append(buttons);
      const restore = text('button', 'Restore copies', buttons); restore.type = 'button'; restore.className = 'btn btn-primary'; restore.disabled = !devices.length;
      restore.addEventListener('click', () => { if (busy || !confirm('Restore this writing and planner as copies on the selected child’s computer? Existing work and current parent controls stay in place.')) return; void perform('restore', { id: backup.id, deviceId: target.value }, 'Recovery requested. It will run when the child returns to the dashboard and closes Writing and the planner. Refresh here to check completion.'); });
      const download = text('button', 'Download backup', buttons); download.type = 'button'; download.className = 'btn btn-secondary';
      download.addEventListener('click', async () => {
        if (busy) return; download.disabled = true;
        try {
          const result = await request('download', { id: backup.id });
          const response = await fetch(result.url, { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw Error('Backup download could not finish.');
          const data = await response.arrayBuffer();
          if (data.byteLength !== backup.size || data.byteLength > 2 * 1024 * 1024) throw Error('Backup size did not match.');
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2, '0')).join('');
          if (digest !== result.sha256) throw Error('Backup verification failed.');
          const url = URL.createObjectURL(new Blob([data], { type: 'application/gzip' })), link = document.createElement('a');
          link.href = url; link.download = `BodeeGuard-work-${backup.id}.json.gz`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
          note.textContent = 'Backup download started. Keep this file private; it contains the child’s writing and planner.';
        } catch (error) { note.textContent = error.message; } finally { download.disabled = false; }
      });
      const remove = text('button', 'Remove', buttons); remove.type = 'button'; remove.className = 'btn btn-secondary';
      remove.addEventListener('click', () => { if (busy || !confirm('Permanently remove this cloud recovery copy? Local work is unchanged.')) return; void perform('remove', { id: backup.id }, 'Recovery copy removed.'); });
    }
    for (const restore of state.restores) text('p', `${state.devices.find(device => device.id === restore.device_id)?.student_name || 'Child'}: ${restore.state === 'applied' ? `recovered ${new Date(restore.completed_at).toLocaleString()}` : 'recovery waiting for the selected computer’s dashboard'}.`, list);
    window.lucide?.createIcons?.();
  }
  save.addEventListener('click', () => state && perform('settings', { revision: state.settings.revision, enabled: enabled.checked }, enabled.checked ? 'Recovery backups enabled. The next connected child session will prepare a backup.' : 'Automatic backups disabled. Existing recovery copies remain available.'));
  refresh.addEventListener('click', () => perform('list'));
  return { setActive(value) { active = value; if (active && !document.hidden && !state) void perform('list'); } };
}
