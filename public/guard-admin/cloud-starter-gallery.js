import {node,decorateSetup} from './cloud-setup-controls.js';

export function artworkCollection({section,items,selected,onChange,request}) {
  if(!items.length){section.append(node('p','No drawings in this collection yet.','setup-copy'));return;}
  const cache=new Map(),checks=new Map();
  const preview=(item,size='thumbnail')=>{
    const key=item.id+size;
    if(!cache.has(key))cache.set(key,request('preview-starter',{itemId:item.id,size}).then(file=>`data:${file.mime};base64,${file.data}`).catch(error=>{cache.delete(key);throw error;}));
    return cache.get(key);
  };
  function choose(id,value){value?selected.add(id):selected.delete(id);checks.get(id).checked=value;onChange();}
  const browse=node('button','Browse artwork full screen','btn btn-secondary');browse.type='button';browse.onclick=()=>open(0);section.append(browse);
  const details=node('details','','starter-artwork'),summary=node('summary',`See all ${items.length} drawings`),grid=node('div','','starter-artwork-grid');details.append(summary,grid);section.append(details);
  let loaded=false;
  const loaders=[];
  items.forEach((item,index)=>{
    const card=node('div','','starter-artwork-card'),button=node('button','','starter-artwork-preview'),img=node('img');button.type='button';button.setAttribute('aria-label',`Preview ${item.title}`);img.alt=item.title;button.append(img);button.onclick=()=>open(index);
    const label=node('label'),check=node('input');check.type='checkbox';check.checked=selected.has(item.id);check.onchange=()=>choose(item.id,check.checked);checks.set(item.id,check);label.append(check,node('span',item.title));card.append(button,label);grid.append(card);
    loaders.push(async()=>{try{img.src=await preview(item);}catch{button.append(node('span','Preview unavailable — open to retry'));}});
  });
  details.addEventListener('toggle',()=>{if(!details.open||loaded)return;loaded=true;const queue=[...loaders];for(let i=0;i<3;i++)void(async()=>{while(queue.length)await queue.shift()();})();});
  function open(index){
    const dialog=node('dialog','','starter-gallery'),header=node('header'),heading=node('h2'),close=node('button','Close','btn btn-secondary');close.type='button';close.onclick=()=>dialog.close();header.append(heading,close);
    const stage=node('div','','starter-gallery-stage'),image=node('img'),status=node('p','','starter-gallery-status');status.setAttribute('role','status');
    const previous=node('button','←','btn btn-secondary'),next=node('button','→','btn btn-secondary');previous.type=next.type='button';previous.setAttribute('aria-label','Previous drawing');next.setAttribute('aria-label','Next drawing');stage.append(previous,image,status,next);
    const footer=node('footer'),label=node('label'),check=node('input');check.type='checkbox';label.append(check,node('span','Include this drawing'));footer.append(label,node('span','← → Browse · Esc Close'));dialog.append(header,stage,footer);document.body.append(dialog);
    let generation=0;const priorFocus=document.activeElement;
    async function render(){const item=items[index],token=++generation;heading.textContent=`${index+1} / ${items.length} · ${item.title}`;image.removeAttribute('src');image.alt=item.title;status.textContent='Loading drawing…';check.checked=selected.has(item.id);previous.disabled=index===0;next.disabled=index===items.length-1;
      try{const src=await preview(item,'full');if(token!==generation||!dialog.open)return;image.src=src;status.textContent='';}catch{if(token===generation)status.textContent='Could not load this drawing. Use an arrow to try again.';}
    }
    const move=amount=>{index=Math.max(0,Math.min(items.length-1,index+amount));void render();};previous.onclick=()=>move(-1);next.onclick=()=>move(1);check.onchange=()=>choose(items[index].id,check.checked);
    dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();move(event.key==='ArrowLeft'?-1:1);}});
    dialog.addEventListener('close',()=>{generation++;dialog.remove();priorFocus?.isConnected&&priorFocus.focus();});dialog.showModal();decorateSetup(header);void render();
  }
}
