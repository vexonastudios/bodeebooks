// Photos are prepared locally and sent only when the parent chooses Scan.
export function createSpellingPhotoTray({input,status,onScan,onBusy}) {
  const make=(tag,cls,text='')=>{const el=document.createElement(tag);el.className=cls;el.textContent=text;return el;};
  const icon=name=>{const el=make('i','');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
  const button=(label,glyph,fn)=>{const el=make('button','btn btn-secondary');el.type='button';el.append(icon(glyph),document.createTextNode(label));el.onclick=fn;return el;};
  const root=make('section','spelling-photo-tray'),actions=make('div','spelling-photo-actions'),pages=make('div','spelling-photo-pages');
  root.setAttribute('aria-label','Spelling photos');
  const title=make('strong','','Scan a spelling list'),hint=make('p','','Add up to 6 photos. All pages become one list to review.');
  input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.hidden=true;input.removeAttribute('capture');
  const camera=make('input','');camera.type='file';camera.accept=input.accept;camera.setAttribute('capture','environment');camera.hidden=true;
  const choose=button('Add photos','images',()=>input.click()),take=button('Take photo','camera',()=>camera.click());
  const scan=button('Scan photos together','scan-text',()=>void scanPages());scan.classList.replace('btn-secondary','btn-primary');
  const box=input.closest('.spelling-scan-box');
  if(box){box.before(root);box.hidden=true;}else input.before(root);
  document.getElementById('spelling-list-student')?.closest('.form-group')?.after(root);
  root.append(title,hint,actions,pages,scan,camera);actions.append(take,choose);
  let selected=[],busy=false,enabled=false,locked=false,preparing=false,epoch=0;
  const notice=message=>{status.textContent=message;status.className='spelling-scan-status';};
  function render(){
    pages.replaceChildren();
    selected.forEach((page,index)=>{
      const item=make('figure','spelling-photo-page'),image=make('img','');image.src=page.url;image.alt='Page '+(index+1);
      const remove=button('Remove page '+(index+1),'x',()=>{if(busy||locked||preparing)return;URL.revokeObjectURL(page.url);selected.splice(index,1);render();});
      remove.disabled=busy||locked||preparing;
      item.append(image,make('figcaption','','Page '+(index+1)),remove);pages.append(item);
    });
    const frozen=busy||locked||preparing||!enabled;
    choose.disabled=take.disabled=frozen||selected.length===6;
    input.disabled=camera.disabled=frozen;
    scan.disabled=frozen||!selected.length;
    scan.textContent=preparing?'Preparing photos…':busy?'Scanning…':`Scan ${selected.length||''} photo${selected.length===1?'':'s'} together`;
    window.lucide?.createIcons();
  }
  function add(files){
    if(busy||locked||preparing||!enabled)return;
    const incoming=Array.from(files||[]);
    if(incoming.length+selected.length>6){notice('Add up to 6 photos for one scan.');return;}
    if(incoming.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>20*1024*1024)){notice('Choose JPEG, PNG or WebP photos up to 20 MB each.');return;}
    for(const file of incoming)selected.push({file,url:URL.createObjectURL(file)});
    render();if(incoming.length)notice(`${selected.length} page${selected.length===1?'':'s'} ready. Add another page or scan them together.`);
  }
  input.addEventListener('change',()=>{add(input.files);input.value='';});
  camera.addEventListener('change',()=>{add(camera.files);camera.value='';});
  async function prepare(page,budget){
    const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('A photo could not be opened. Try a JPEG photo.'));image.src=page.url;});
    if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>40000000)throw Error('Crop very large photos to the printed words first.');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    for(const edge of [2200,1800,1400]){
      const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
      canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
      ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [.86,.74,.62]){const data=canvas.toDataURL('image/jpeg',quality).split(',')[1];if(data.length<=budget)return {mime:'image/jpeg',data};}
    }
    throw Error('Crop the photos closer to the printed words so they fit in one scan.');
  }
  async function scanPages(){
    if(busy||locked||preparing||!enabled||!selected.length)return;
    const generation=epoch;preparing=true;onBusy(true);render();notice('Preparing photos…');
    try{
      const images=[];const budget=Math.min(2700000,Math.floor(3400000/selected.length));
      for(const page of selected){images.push(await prepare(page,budget));if(generation!==epoch)return;}
      preparing=false;await onScan(images);
    }catch(error){if(generation===epoch)notice(error.message);}
    finally{if(generation===epoch){preparing=false;onBusy(false);render();}}
  }
  render();
  return {
    setState(value){busy=value.busy;enabled=value.enabled;locked=value.locked;render();},
    reset(){epoch++;for(const page of selected)URL.revokeObjectURL(page.url);selected=[];preparing=false;locked=false;render();},
    focus(){root.scrollIntoView({block:'start',behavior:'smooth'});(take.disabled?root:take).focus();}
  };
}
