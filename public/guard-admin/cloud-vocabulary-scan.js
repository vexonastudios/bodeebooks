import { createSpellingPhotoTray } from './cloud-spelling-photos.js?v=20260928-vocabulary1';
// Local photos only; no list is assigned until the parent saves the reviewed terms.
export function createVocabularyPhotoScan({input,status,onBusy,onResult,hasTerms=()=>false}) {
  let pending=null,review=null,running=false,preparing=false,enabled=false,locked=false,epoch=0,controller=null,reported=false;
  const actions=document.createElement('div');actions.className='vocabulary-scan-recovery';
  const make=(text,fn)=>{const el=document.createElement('button');el.type='button';el.className='btn btn-secondary';el.textContent=text;el.onclick=fn;actions.append(el);return el;};
  const retry=make('Retry this photo scan',()=>void request()),discard=make('Cancel scan',()=>{reset();status.textContent='Scan canceled. Your entered words are kept.';});
  status.after(actions);
  const preview=document.createElement('section');preview.className='vocabulary-scan-preview';preview.hidden=true;preview.setAttribute('aria-label','Latest vocabulary scan');actions.after(preview);
  const heading=document.createElement('h3'),words=document.createElement('p'),source=document.createElement('details'),summary=document.createElement('summary'),photos=document.createElement('div'),help=document.createElement('p'),choices=document.createElement('div');
  summary.textContent='View the photos used for this scan';source.append(summary,photos);choices.className='vocabulary-scan-choices';preview.append(heading,words,source,help,choices);
  const choice=(label,mode)=>{const el=document.createElement('button');el.type='button';el.className='btn btn-secondary';el.textContent=label;el.onclick=()=>apply(mode);choices.append(el);return el;};
  const replace=choice('Replace current words','replace'),append=choice('Add to current words','append');
  const tray=createSpellingPhotoTray({input,status,prefix:'vocabulary',onBusy(value){preparing=value;update();},onScan:async(images,prompt)=>{clearPreview();pending={id:crypto.randomUUID(),images,prompt};await request();}});
  function clearPreview(){review=null;preview.hidden=true;photos.replaceChildren();words.textContent='';source.open=false;}
  function showPreview(result,images){
    heading.textContent='Words from this scan';words.textContent=result.terms.map(term=>term.word).join(' · ');
    photos.replaceChildren(...images.map((page,index)=>{const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=`data:${page.mime};base64,${page.data}`;image.alt='Photo sent for vocabulary scan, page '+(index+1);caption.textContent='Page '+(index+1);figure.append(image,caption);return figure;}));
    help.textContent=review?'Your current words below have not changed. Choose whether this scan replaces them or adds another page.':'These are the words returned from these photos. Review the editable list below before saving.';
    preview.hidden=false;choices.hidden=!review;
  }
  function apply(mode){
    if(!review||locked)return;
    const result=review;review=null;
    const message=onResult(result,{mode});choices.hidden=true;help.textContent='Review the editable list below. Nothing is assigned until you save.';update();status.textContent=message;
  }
  function update(){
    tray.setState({busy:running,enabled,locked:locked||!!pending||!!review});
    retry.hidden=!pending;discard.hidden=!pending&&!preparing&&!review;retry.disabled=running||locked;discard.disabled=locked;
    replace.disabled=append.disabled=locked||running;
    const active=running||preparing||!!pending||!!review;
    if(reported!==active){reported=active;onBusy(active);}
  }
  function reset(){epoch++;controller?.abort();controller=null;pending=null;running=false;preparing=false;clearPreview();tray.reset();update();}
  async function request(){
    if(!pending||running||locked)return;
    const generation=epoch,saved=pending;running=true;controller=new AbortController();update();status.textContent='Reading words, definitions and examples…';
    const timeout=setTimeout(()=>controller?.abort(),55000);
    try{
      const response=await fetch('/guard/dashboard/vocabulary-scan/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});
      const result=await response.json();if(generation!==epoch)return;
      if(!response.ok){const error=new Error(result.error||'The scan could not finish.');error.status=response.status;throw error;}
      if(result.id!==saved.id||!Array.isArray(result.terms))throw Error('The scan reply could not be verified. Retry this same scan.');
      pending=null;running=false;preparing=false;controller=null;tray.reset();
      review=result.terms.length&&hasTerms()?result:null;showPreview(result,saved.images);
      if(review){update();status.textContent='Scan ready. Choose Replace current words or Add to current words.';preview.scrollIntoView({block:'nearest'});}
      else{const message=onResult(result,{mode:'append'});update();status.textContent=message;}
    }catch(error){
      if(generation!==epoch)return;
      if(error.status>=400&&error.status<500&&error.status!==409)pending=null;
      status.textContent=error.name==='AbortError'?'The scan is taking longer than expected. Retry this photo scan to check its result.':error.message;
    }finally{clearTimeout(timeout);if(generation===epoch){running=false;controller=null;update();}}
  }
  update();
  return{reset,setState(value){enabled=value.enabled;locked=value.locked;update();}};
}
