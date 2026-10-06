'use client';
/* eslint-disable @next/next/no-img-element -- Private local/authenticated image bytes must not enter the public image optimizer. */
import {useEffect,useId,useRef,useState} from 'react';
import {Camera,ImagePlus,LoaderCircle,Maximize2,Trash2,X} from 'lucide-react';
import type {ReportPhoto} from './types';
import styles from './photos.module.css';
export type DraftPhoto={id:string;data:string};
const maxBytes=500*1024;
export async function preparePhoto(file:File):Promise<DraftPhoto>{
  if(!file.type.startsWith('image/')||file.size>20*1024*1024)throw Error('Choose a photo or screenshot up to 20 MB.');
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file);}catch{throw Error('This photo format could not be opened. Try a screenshot or a JPEG photo.');}
  try{
    let edge=2400,blob:Blob|null=null;
    for(let attempt=0;attempt<5;attempt++){
      const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');if(!context)throw Error('This browser could not prepare the photo.');
      context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',attempt===0?.88:.78));
      if(blob&&blob.size<=maxBytes)break;edge=Math.round(edge*.8);
    }
    if(!blob||blob.size>maxBytes)throw Error('Crop the photo to the child’s screen and choose it again.');
    const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('The photo could not be read.'));reader.readAsDataURL(blob!);});
    return {id:crypto.randomUUID(),data};
  }finally{bitmap.close();}
}
function Preview({src,label,children}:{src:string;label:string;children?:React.ReactNode}){
  const dialog=useRef<HTMLDialogElement>(null);
  return <div className={styles.preview}>
    <button type="button" className={styles.thumbnail} aria-label={'Enlarge '+label} onClick={()=>dialog.current?.showModal()}><img src={src} alt={label}/><span><Maximize2 size={15}/> View photo</span></button>
    {children}
    <dialog ref={dialog} className={styles.lightbox} aria-label={label} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
      <button type="button" className={styles.close} aria-label="Close photo" onClick={()=>dialog.current?.close()}><X size={24}/></button><img src={src} alt={label}/><p>Pinch to zoom on your phone.</p>
    </dialog>
  </div>;
}
export function PhotoPicker({photos,onChange,disabled,onBusy,followup=false}:{photos:DraftPhoto[];onChange:(value:DraftPhoto[])=>void;disabled:boolean;onBusy:(value:boolean)=>void;followup?:boolean}){
  const camera=useId(),gallery=useId(),[error,setError]=useState(''),[working,setWorking]=useState(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function choose(input:HTMLInputElement){
    const files=Array.from(input.files||[]);input.value='';if(!files.length)return;
    if(files.length+photos.length>3){setError('Choose up to three photos per message. Remove a photo to replace it.');return;}
    setWorking(true);onBusy(true);setError('');
    try{const next=[];for(const file of files)next.push(await preparePhoto(file));if(mounted.current)onChange([...photos,...next]);}
    catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Please choose the photo again.');}
    finally{if(mounted.current){setWorking(false);onBusy(false);}}
  }
  const blocked=disabled||working||photos.length>=3;
  return <section className={styles.picker} aria-label={followup?'Add photos to your reply':'Attach photos'}>
    <h3><Camera size={20}/>{followup?'Add a photo':'Show us what happened'}</h3>
    <p>{followup?'A photo can help us understand the details.':'Take a photo of your child’s screen, especially the error message, or attach a screenshot.'}</p>
    <div className={styles.choices}>
      <label htmlFor={camera} className={styles.choice} aria-disabled={blocked}><Camera size={19}/> Take a photo<input id={camera} className={styles.file} type="file" accept="image/*" capture="environment" disabled={blocked} onChange={e=>void choose(e.currentTarget)}/></label>
      <label htmlFor={gallery} className={styles.choice} aria-disabled={blocked}><ImagePlus size={19}/> Choose photos<input id={gallery} className={styles.file} type="file" accept="image/*" multiple disabled={blocked} onChange={e=>void choose(e.currentTarget)}/></label>
    </div>
    <small>Optional · up to 3 photos. Keep the screen readable and leave out passwords or other private information.</small>
    {working&&<p role="status"><LoaderCircle size={16}/> Preparing photos…</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!!photos.length&&<div className={styles.grid}>{photos.map((photo,index)=><Preview key={photo.id} src={'data:image/jpeg;base64,'+photo.data} label={'Photo '+(index+1)}><button type="button" className={styles.remove} disabled={disabled||working} aria-label={'Remove photo '+(index+1)} onClick={()=>onChange(photos.filter(p=>p.id!==photo.id))}><Trash2 size={15}/> Remove</button></Preview>)}</div>}
    {!!photos.length&&<small>Review before sending. Photos are shared with BodeeGuard support with this report; they are not sent to AI.</small>}
  </section>;
}
function SavedPhoto({photo,staff,householdId,index}:{photo:ReportPhoto;staff:boolean;householdId?:string;index:number}){
  const [src,setSrc]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    const task=setTimeout(async()=>{
      setError('');setSrc('');
      try{
        const response=await fetch(staff?'/guard/admin/bridge/':'/guard/report/api/',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:staff?'bug-report-photo':'photo',id:photo.id,...(staff?{householdId}:{})}),signal:controller.signal});
        const result=await response.json();
        if(!response.ok||result.mime!=='image/jpeg'||typeof result.data!=='string'||result.data.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(result.data))throw Error('Photo unavailable. Please retry.');
        if(!controller.signal.aborted)setSrc('data:image/jpeg;base64,'+result.data);
      }catch{if(!controller.signal.aborted)setError('Photo could not be loaded.');}
    },0);
    return()=>{clearTimeout(task);controller.abort();};
  },[photo.id,staff,householdId,attempt]);
  if(error)return <div className={styles.photoError}><p>{error}</p><button type="button" onClick={()=>setAttempt(a=>a+1)}>Retry photo</button></div>;
  return src?<Preview src={src} label={'Attached photo '+(index+1)}/>:<p role="status" className={styles.loading}>Loading photo…</p>;
}
export function SavedReportPhotos({photos=[],staff=false,householdId}:{photos?:ReportPhoto[];staff?:boolean;householdId?:string}){
  if(!photos.length)return null;
  return <section className={styles.saved} aria-label="Attached photos"><h3><Camera size={18}/> Attached photos</h3><div className={styles.grid}>{photos.map((photo,index)=><SavedPhoto key={photo.id} photo={photo} staff={staff} householdId={householdId} index={index}/>)}</div></section>;
}
