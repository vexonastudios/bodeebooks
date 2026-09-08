import { setupCloudLegacyActivation } from './cloud-legacy-activation.js';
import { setupCloudLegacyTyping } from './cloud-legacy-typing.js';
import { setupCloudLegacyDaily } from './cloud-legacy-daily.js';
import { setupCloudLegacyPractice } from './cloud-legacy-practice.js';
import { setupCloudLegacySpelling } from './cloud-legacy-spelling.js';
import { setupCloudLegacyGeography } from './cloud-legacy-geography.js';
export function setupCloudLegacyArchive({root,endpoint='/guard/dashboard/legacy/',onApplied}) {
  if(!root)return {setActive(){}};
  let selected=null,busy=false,stopped=false,generation=0,archive=null;
  const node=(tag,text='',className='')=>{const el=document.createElement(tag);el.textContent=text;el.className=className;return el;};
  const button=(text,fn)=>{const el=node('button',text,'btn btn-secondary');el.type='button';el.onclick=()=>Promise.resolve().then(fn).catch(error=>message(error.message));return el;};
  const status=node('p','','cloud-note');status.role='status';
  const choose=document.createElement('input');choose.type='file';choose.multiple=true;choose.setAttribute('webkitdirectory','');choose.setAttribute('aria-label','Sanitized Admin transfer folder');
  const start=button('Upload / resume archive',transfer);start.disabled=true;
  const pause=button('Pause transfer',()=>{stopped=true;message('Pausing after the current parts finish. Resume the same folder to continue.');});pause.disabled=true;
  const list=node('div'),viewer=node('div'),activationRoot=node('div');activationRoot.id='cloud-legacy-activation';activationRoot.hidden=true;
  root.append(node('h2','Transfer and original records'),node('p','Choose a prepared Admin transfer folder. You can pause and resume without uploading verified parts again. Passwords, browser sessions and pending device commands stay in the private local backup.'),choose,start,pause,status,button('Refresh saved transfers',refresh),list,viewer);
  root.append(activationRoot);const activation=setupCloudLegacyActivation({root:activationRoot,request,onApplied});
  const typingRoot=node('div');typingRoot.id='cloud-legacy-typing';typingRoot.hidden=true;root.append(typingRoot);const typingTransfer=setupCloudLegacyTyping({root:typingRoot,request,onApplied});
  const dailyRoot=node('div');dailyRoot.id='cloud-legacy-daily';dailyRoot.hidden=true;root.append(dailyRoot);const dailyTransfer=setupCloudLegacyDaily({root:dailyRoot,request,onApplied});
  const practiceRoot=node('div');practiceRoot.id='cloud-legacy-practice';practiceRoot.hidden=true;root.append(practiceRoot);const practiceTransfer=setupCloudLegacyPractice({root:practiceRoot,request,onApplied});
  const geographyRoot=node('div');geographyRoot.id='cloud-legacy-geography';geographyRoot.hidden=true;root.append(geographyRoot);const geographyTransfer=setupCloudLegacyGeography({root:geographyRoot,request,onApplied});
  const spellingRoot=node('div');spellingRoot.id='cloud-legacy-spelling';spellingRoot.hidden=true;root.append(spellingRoot);const spellingTransfer=setupCloudLegacySpelling({root:spellingRoot,request,onApplied});
  function message(text){status.textContent=text;}
  const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
  async function request(action,input={}) {
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(28000),headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'The transfer could not be confirmed. Resume the same folder.');return data;
  }
  choose.addEventListener('change',async()=>{
    selected=null;start.disabled=true;const current=++generation;
    try{
      const files=[...choose.files];if(!files.length)return;
      const paths=new Map();let prefix;
      for(const file of files){const relative=file.webkitRelativePath,slash=relative.indexOf('/');if(slash<1)throw new Error('Choose the prepared package folder.');prefix??=relative.slice(0,slash+1);if(!relative.startsWith(prefix))throw new Error('Choose one package folder.');const key=relative.slice(prefix.length);if(paths.has(key))throw new Error('The folder contains duplicate paths.');paths.set(key,file);}
      if(paths.has('INCOMPLETE'))throw new Error('This package did not finish preparing. Keep the original backup.');
      const file=paths.get('manifest.json');if(!file||file.size>2500000)throw new Error('Choose the sanitized package, not the raw Admin backup.');
      const manifest=JSON.parse(await file.text());if(manifest.purpose!=='bodeeguard-sanitized-archive'||manifest.version!==1||!Array.isArray(manifest.chunks)||manifest.chunks.length>20000)throw new Error('This is not a supported transfer package.');
      const expected=new Set(['manifest.json','LOCAL-RECONCILIATION.json']);
      for(const chunk of manifest.chunks){const key=`chunks/${chunk.sha256}.blob`;expected.add(key);if(!/^[a-f0-9]{64}$/.test(chunk.sha256)||paths.get(key)?.size!==chunk.bytes)throw new Error('A transfer part is missing or has changed. Prepare the package again.');}
      if([...paths.keys()].some(key=>!expected.has(key)))throw new Error('This folder contains unlisted files. Choose the prepared package folder.');
      if(current!==generation)return;selected={manifest,paths};start.disabled=false;
      message(`${manifest.tables.reduce((n,t)=>n+t.exportedRows,0).toLocaleString()} original records and ${manifest.files.length.toLocaleString()} files selected. ${manifest.source.rehearsalOnly?'This is a rehearsal copy; the current installation remains authoritative.':'This archive must be reconciled before switching the family.'}`);
    }catch(error){message(error.message);}
  });
  async function group(items,fn){let index=0;const workers=Array.from({length:Math.min(3,items.length)},async()=>{while(index<items.length&&!stopped){const item=items[index++];try{await fn(item);}catch(error){stopped=true;throw error;}}});const results=await Promise.allSettled(workers);const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;}
  async function transfer(){
    if(busy||!selected)return;busy=true;stopped=false;start.disabled=true;choose.disabled=true;pause.disabled=false;
    try{
      const saved=await request('create',{manifest:selected.manifest});if(saved.status==='withdrawn')throw new Error('This transfer was withdrawn. Keep its local backup for reconciliation.');
      let completed=0;
      for(;;){if(stopped)break;const state=await request('status',{id:saved.id});
        if(state.missing.length){await group(state.missing,async part=>{const file=selected.paths.get(`chunks/${part.sha256}.blob`);if(!file)throw new Error('The matching transfer part is missing.');const bytes=new Uint8Array(await file.arrayBuffer());if(await digest(bytes)!==part.sha256)throw new Error('A local transfer part failed its checksum. Prepare the package again.');let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));await request('put',{id:saved.id,sha256:part.sha256,data:btoa(binary)});completed++;message(`Uploading original records and files… ${completed} parts confirmed this session.`);});continue;}
        if(state.unverified.length){await group(state.unverified,async key=>{await request('verify',{id:saved.id,key});completed++;message(`Checking restored records and file checksums… ${completed} steps confirmed this session.`);});continue;}
        if(stopped)break;await request('complete',{id:saved.id});message('Archive verified. Original records and files are available below. Reconciliation and the final family switch are still pending.');break;
      }
      if(stopped)message('Transfer paused. Verified progress is retained; resume with the same folder.');await refresh();
    }finally{busy=false;start.disabled=!selected;choose.disabled=false;pause.disabled=true;}
  }
  async function refresh(){
    const data=await request('list');list.replaceChildren();
    if(!data.archives.length)list.append(node('p','No original Admin archive has been transferred yet.'));
    for(const item of data.archives){const card=node('div','','cloud-panel');card.append(node('h3',`${item.rehearsalOnly?'Rehearsal archive':'Original Admin archive'} · ${item.status}`),node('p',`${item.rows.toLocaleString()} records · ${item.files.toLocaleString()} files · ${new Date(item.createdAt).toLocaleString()}`));
      if(item.status==='verified')card.append(button('Open original records',()=>open(item.id)));
      if(item.status==='verified')card.append(button('Review profiles and balances',()=>{activationRoot.hidden=false;return activation.open(item.id);}));
      if(item.status==='verified')card.append(button('Review original Typing history',()=>{typingRoot.hidden=false;return typingTransfer.open(item.id);}));
      if(item.status==='verified')card.append(button('Review original daily history',()=>{dailyRoot.hidden=false;return dailyTransfer.open(item.id);}));
      if(item.status==='verified')card.append(button('Review original Logic and Words history',()=>{practiceRoot.hidden=false;return practiceTransfer.open(item.id);}));
      if(item.status==='verified')card.append(button('Review original Spelling history',()=>{spellingRoot.hidden=false;return spellingTransfer.open(item.id);}));
      if(item.status==='verified')card.append(button('Review original Geography history',()=>{geographyRoot.hidden=false;return geographyTransfer.open(item.id);}));
      if(item.status==='uploading')card.append(node('p','Choose the same local package above to resume.'));
      list.append(card);
    }
  }
  async function open(id){
    const current=++generation,data=await request('browse',{id});if(current!==generation)return;archive=data;viewer.replaceChildren();
    viewer.append(node('h3','Original Admin records'),node('p',`This archive preserves original IDs, timestamps and relationships. ${archive.foreignKeyIssues} pre-existing missing references are retained. Archived commands cannot run. Profile and balance transfers have separate reviews and receipts below.`));
    const select=document.createElement('select');select.className='admin-input';select.setAttribute('aria-label','Original record category');
    for(const table of archive.manifest.tables){if(!table.exportedRows)continue;const option=node('option',`${table.name.replaceAll('_',' ')} (${table.exportedRows.toLocaleString()})`);option.value=table.name;select.append(option);}
    const rows=node('div'),pageLabel=node('p');let page=0;
    const previous=button('Previous records',()=>{page--;return show();}),next=button('Next records',()=>{page++;return show();});
    async function show(){const table=archive.manifest.tables.find(t=>t.name===select.value);if(!table)return;previous.disabled=page===0;next.disabled=page+1>=table.parts.length;
      const selectedTable=select.value,selectedPage=page,data=await request('records',{id,table:selectedTable,part:page});if(current!==generation||select.value!==selectedTable||page!==selectedPage)return;
      rows.replaceChildren();pageLabel.textContent=`${archive.categories[selectedTable]} · page ${page+1} of ${table.parts.length}`;
      for(const row of data.rows){const detail=document.createElement('details'),values=row.values;detail.append(node('summary',String(values.title||values.name||values.student_id||values.id||values.key||'Original record')));const fields=node('dl');
        for(const [key,value]of Object.entries(values)){fields.append(node('dt',key.replaceAll('_',' ')),node('dd',value===null?'':String(value)));}detail.append(fields);rows.append(detail);}
    }
    select.onchange=()=>{page=0;show().catch(error=>message(error.message));};viewer.append(select,pageLabel,previous,next,rows,node('h3','Original saved files'));
    const filter=document.createElement('input');filter.placeholder='Find a saved file or folder';filter.setAttribute('aria-label','Find original files');filter.className='admin-input';const fileList=node('div'),fileMore=button('More files',()=>{filePage++;showFiles();});let filePage=0;
    function showFiles(){const matches=archive.manifest.files.filter(file=>file.path.toLowerCase().includes(filter.value.toLowerCase()));fileList.replaceChildren();for(const file of matches.slice(filePage*50,filePage*50+50)){const line=node('p');line.append(node('span',`${file.path} · ${(file.size/1024).toFixed(0)} KB `),button('Download',()=>download(id,file)));fileList.append(line);}fileMore.disabled=(filePage+1)*50>=matches.length;}
    filter.oninput=()=>{filePage=0;showFiles();};viewer.append(filter,fileList,fileMore);showFiles();await show();
  }
  async function download(id,file){const chunks=[];for(const part of file.parts){const data=await request('downloadPart',{id,sha256:part.sha256}),bytes=Uint8Array.from(atob(data.data),c=>c.charCodeAt(0));if(await digest(bytes)!==part.sha256)throw new Error('Downloaded part checksum mismatch.');chunks.push(bytes);}
    const blob=new Blob(chunks,{type:'application/octet-stream'});if(blob.size!==file.size||await digest(await blob.arrayBuffer())!==file.sha256)throw new Error('The restored file did not match its checksum.');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.path.split('/').at(-1);link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  return {setActive(active){if(active)refresh().catch(error=>message(error.message));}};
}
