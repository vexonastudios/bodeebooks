export function setupApprovedApps({endpoint}) {
  const root=document.getElementById('tab-apps');if(!root)return {setActive(){}};
  const node=(tag,text='',cls='')=>{const element=document.createElement(tag);element.textContent=text;element.className=cls;return element;};
  const iconButton=(text,icon)=>{const button=node('button','','btn btn-secondary');button.type='button';const mark=node('i');mark.dataset.lucide=icon;button.append(mark,node('span',text));return button;};
  const style=document.createElement('link');style.rel='stylesheet';style.href='/guard-admin/cloud-approved-apps.css';document.head.append(style);
  const header=node('div','','tab-header'),refresh=iconButton('Refresh apps','refresh-cw');header.append(node('h1','App Launcher'),refresh);
  const instructions=node('div','','cloud-panel cloud-apps-setup');instructions.append(node('h2','Add programs from each child’s computer'),node('p','On the child’s BodeeGuard, open Apps → Find installed apps. Then choose that computer below and approve its programs. A parent can also choose an EXE on the child’s computer.','cloud-note'),node('p','Each computer keeps its own installation path. Programs are already installed locally; this page does not download installers.','cloud-note'));
  const label=node('label','Child’s computer'),select=node('select','','admin-select');select.setAttribute('aria-label','Child’s computer');label.append(select);
  const warning=node('p','Approving a desktop app permits its own features, including file access, internet access and any scripting tools it contains. BodeeGuard’s school website filtering does not filter that app. Approve only programs you trust.','cloud-apps-notice');
  const status=node('p','','cloud-note');status.setAttribute('role','status');const list=node('div','','cloud-apps-grid');root.replaceChildren(header,instructions,label,warning,status,list);
  let data={computers:[],apps:[]},loaded=false,busy=false;
  async function call(input){const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approved-apps',...input}),signal:AbortSignal.timeout(30000)});const result=await response.json();if(!response.ok)throw Error(result.error||'App Launcher is unavailable.');return result;}
  function render(){list.replaceChildren();const computer=data.computers.find(item=>item.id===select.value);if(!computer)return;
    const apps=data.apps.filter(app=>app.device_id===computer.id&&app.student_id===computer.student_id);
    status.textContent=apps.length?`${apps.filter(app=>app.approved).length} approved · ${apps.length} found on ${computer.computer_name}`:'No apps reported yet. Open Apps → Find installed apps on this child’s updated BodeeGuard.';
    for(const app of apps){const card=node('article','','cloud-panel cloud-app-card'+(app.approved?' approved':'')),heading=node('h2',app.name),file=node('p',app.executable,'cloud-note'),publisher=node('p',app.signature_valid?(app.publisher||'Verified Windows signature'):'No valid Windows publisher signature','cloud-note'),toggle=iconButton(app.approved?'Approved — turn off':'Approve for this computer',app.approved?'circle-check':'plus');
      toggle.disabled=!app.signature_valid&&!app.approved;card.append(heading,file,publisher,toggle);list.append(card);
      toggle.onclick=async()=>{toggle.disabled=true;try{const result=await call({operation:'approve',id:app.id,deviceId:computer.id,studentId:computer.student_id,sha256:app.sha256,revision:app.revision,approved:!app.approved});app.approved=result.approved;app.revision=result.revision;render();}catch(error){status.textContent=error.message;toggle.disabled=false;}};
    }
    window.lucide?.createIcons();
  }
  async function load(){if(busy)return;busy=true;refresh.disabled=true;status.textContent='Loading apps…';try{const previous=select.value;data=await call({operation:'list'});loaded=true;select.replaceChildren(...data.computers.map(item=>new Option(`${item.student_name} · ${item.computer_name}`,item.id)));if(data.computers.some(item=>item.id===previous))select.value=previous;render();if(!data.computers.length)status.textContent='Connect a child’s Windows computer first.';}catch(error){status.textContent=error.message;}finally{busy=false;refresh.disabled=false;}}
  select.onchange=render;refresh.onclick=()=>void load();window.lucide?.createIcons();return {setActive(active){if(active&&!loaded)void load();}};
}
