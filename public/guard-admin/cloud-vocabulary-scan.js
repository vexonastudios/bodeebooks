import { createSpellingPhotoTray } from './cloud-spelling-photos.js?v=20260928-vocabulary1';
// Local photos only; no list is assigned until the parent saves the reviewed terms.
export function createVocabularyPhotoScan({input,status,onBusy,onResult}) {
  let pending=null,running=false,preparing=false,enabled=false,locked=false,epoch=0,controller=null,reported=false;
  const actions=document.createElement('div');actions.className='vocabulary-scan-recovery';
  const make=(text,fn)=>{const el=document.createElement('button');el.type='button';el.className='btn btn-secondary';el.textContent=text;el.onclick=fn;actions.append(el);return el;};
  const retry=make('Retry this photo scan',()=>void request()),discard=make('Cancel scan',()=>{reset();status.textContent='Scan canceled. Your entered words are kept.';});
  status.after(actions);
  const tray=createSpellingPhotoTray({input,status,prefix:'vocabulary',onBusy(value){preparing=value;update();},onScan:async(images,prompt)=>{pending={id:crypto.randomUUID(),images,prompt};await request();}});
  function update(){
    tray.setState({busy:running,enabled,locked:locked||!!pending});
    retry.hidden=!pending;discard.hidden=!pending&&!preparing;retry.disabled=running||locked;discard.disabled=locked;
    const active=running||preparing||!!pending;
    if(reported!==active){reported=active;onBusy(active);}
  }
  function reset(){epoch++;controller?.abort();controller=null;pending=null;running=false;preparing=false;tray.reset();update();}
  async function request(){
    if(!pending||running||locked)return;
    const generation=epoch,saved=pending;running=true;controller=new AbortController();update();status.textContent='Reading words, definitions and examples…';
    const timeout=setTimeout(()=>controller?.abort(),55000);
    try{
      const response=await fetch('/guard/dashboard/vocabulary-scan/',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(saved)});
      const result=await response.json();if(generation!==epoch)return;
      if(!response.ok){const error=new Error(result.error||'The scan could not finish.');error.status=response.status;throw error;}
      if(result.id!==saved.id||!Array.isArray(result.terms))throw Error('The scan reply could not be verified. Retry this same scan.');
      const message=onResult(result);reset();status.textContent=message;
    }catch(error){
      if(generation!==epoch)return;
      if(error.status>=400&&error.status<500&&error.status!==409)pending=null;
      status.textContent=error.name==='AbortError'?'The scan is taking longer than expected. Retry this photo scan to check its result.':error.message;
    }finally{clearTimeout(timeout);if(generation===epoch){running=false;controller=null;update();}}
  }
  update();
  return{reset,setState(value){enabled=value.enabled;locked=value.locked;update();}};
}
