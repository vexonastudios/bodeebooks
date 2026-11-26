'use client';
import Link from 'next/link';
import {useAuth} from '@clerk/nextjs';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,Bug,CheckCircle2,ChevronRight,Clock,ImagePlus,ListFilter,Mic,RefreshCw,Send,ShieldCheck,Square,Trash2} from 'lucide-react';
import {areas,statuses,type BugReport,type ReportDetail,type Setup} from './types';
import SetupDetails from './SetupDetails';
import {PhotoPicker,SavedReportPhotos,type DraftPhoto} from './ReportPhotos';
import styles from './report.module.css';
import {request,RequestError} from './report-client';
import StudentReports from './StudentReports';

const blank=()=>({description:'',area:'general',studentIds:[] as string[],occurredAt:'',includeSetup:true,inputKind:'typed'});
type Draft=ReturnType<typeof blank>;
function clientInfo(release:string){
  const ua=navigator.userAgent;
  const browser=ua.match(/(?:Edg|Chrome|Firefox|Version)\/[\d.]+/)?.[0]||'Unknown';
  const platform=/Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS / iPadOS':/Windows/.test(ua)?'Windows':/Mac/.test(ua)?'Mac':'Other';
  return {browser,platform,displayMode:matchMedia('(display-mode: standalone)').matches?'standalone':'browser',
    viewport:{width:innerWidth,height:innerHeight},timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,release};
}
export default function ReportForm({release}:{release:string}){
  const {userId}=useAuth();
  const [draft,setDraft]=useState<Draft>(blank),[setup,setSetup]=useState<Setup|null>(null),[voiceAvailable,setVoiceAvailable]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [reports,setReports]=useState<BugReport[]>([]),[hasMore,setHasMore]=useState(false),[detail,setDetail]=useState<ReportDetail|null>(null),[reply,setReply]=useState('');
  const [focusTarget,setFocusTarget]=useState('');
  const [pending,setPending]=useState<Record<string,unknown>|null>(null),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[clip,setClip]=useState<Blob|null>(null),[clipUrl,setClipUrl]=useState('');
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),alive=useRef(true),restored=useRef('');
  const [replyFrozen,setReplyFrozen]=useState(false);
  const [storageLimited,setStorageLimited]=useState(false);
  const [showEarlier,setShowEarlier]=useState(false);
  const [photos,setPhotos]=useState<DraftPhoto[]>([]),[replyPhotos,setReplyPhotos]=useState<DraftPhoto[]>([]),[photoBusy,setPhotoBusy]=useState(false);
  const sending=useRef(false),replyAttempt=useRef<Record<string,unknown>|null>(null);
  const draftKey=userId?'guard-bug-draft-v1:'+userId:'';
  const change=(patch:Partial<Draft>)=>setDraft(value=>({...value,...patch}));
  const stop=useCallback(()=>{if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());if(timer.current)clearInterval(timer.current);},[]);
  useEffect(()=>{alive.current=true;const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return()=>{alive.current=false;document.removeEventListener('visibilitychange',hidden);stop();};},[stop]);
  // Blob URLs are external resources; synchronize the audio element and release on replacement.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{if(!clip){setClipUrl('');return;}const url=URL.createObjectURL(clip);setClipUrl(url);return()=>URL.revokeObjectURL(url);},[clip]);
  useEffect(()=>{
    if(!draftKey||restored.current===draftKey)return;
    let canceled=false;
    queueMicrotask(()=>{
      if(canceled)return;
      let next=blank(),nextPending:Record<string,unknown>|null=null,nextPhotos:DraftPhoto[]=[];
      try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(saved?.draft&&typeof saved.draft.description==='string'&&Array.isArray(saved.draft.studentIds)){next={...next,...saved.draft};nextPending=saved.pending||null;nextPhotos=(saved.pending?.photos||saved.photos||[]).filter((p:DraftPhoto)=>typeof p?.data==='string'&&p.data.length<=682668&&typeof p.id==='string').slice(0,3);}}catch{/* Storage may be unavailable. */}
      restored.current=draftKey;setDraft(next);setShowEarlier(Boolean(next.occurredAt));setPending(nextPending);setPhotos(nextPhotos);
    });
    return()=>{canceled=true;};
  },[draftKey]);
  useEffect(()=>{if(!draftKey||restored.current!==draftKey)return;let limited=false;try{sessionStorage.setItem(draftKey,JSON.stringify({draft,pending,...(!pending?{photos}:{})}));}catch{limited=true;}const task=setTimeout(()=>setStorageLimited(limited),0);return()=>clearTimeout(task);},[draft,draftKey,pending,photos]);
  useEffect(()=>{if(!draft.description&&!recording&&!pending&&!clip&&!photos.length&&!replyPhotos.length&&!reply)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[draft.description,recording,pending,clip,photos.length,replyPhotos.length,reply]);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const results=await Promise.allSettled([request<{setup:Setup;voiceAvailable:boolean}>({action:'context'}),request<{reports:BugReport[];hasMore:boolean}>({action:'list'})]);
    if(!alive.current)return;
    if(results[0].status==='fulfilled'){setSetup(results[0].value.setup);setVoiceAvailable(results[0].value.voiceAvailable);}else setError(results[0].reason.message);
    if(results[1].status==='fulfilled'){setReports(results[1].value.reports);setHasMore(results[1].value.hasMore);}
    else setError(results[1].reason.message);
    setLoading(false);
  },[]);
  useEffect(()=>{const task=setTimeout(()=>void load(),0);return()=>clearTimeout(task);},[load]);
  const work=useCallback(async(task:()=>Promise<void>)=>{if(sending.current)return;sending.current=true;setBusy(true);setError('');try{await task();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Please retry.');}finally{sending.current=false;if(alive.current)setBusy(false);}},[]);
  const openReport=useCallback((id:string,linkedEvent?:string)=>work(async()=>{
    const opened=await request<ReportDetail>({action:'detail',id});
    if(!alive.current)return;
    const unread=opened.report.unreadReplyId||opened.report.unreadResolutionId;
    const eventId=linkedEvent||unread;
    const hasNote=opened.events.some(event=>event.id===eventId&&event.role==='staff'&&event.note.trim());
    setDetail(opened);
    setFocusTarget(hasNote?'report-event-'+eventId:'report-heading');
    replyAttempt.current=null;setReplyFrozen(false);setReply('');setReplyPhotos([]);
    if(unread&&unread===eventId){
      await request({action:'read-update',id,eventId:unread});
      if(alive.current)setReports(rows=>rows.map(row=>
        row.id===id&&(row.unreadReplyId===unread||row.unreadResolutionId===unread)
          ?{...row,unreadReplyId:null,unreadResolutionId:null}:row));
    }
  }),[work]);
  useEffect(()=>{
    const openLinkedReply=()=>{
      const match=/^#support-update\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i.exec(window.location.hash);
      if(match)void openReport(match[1],match[2]);
    };
    const timer=setTimeout(openLinkedReply,0);
    window.addEventListener('hashchange',openLinkedReply);
    return()=>{clearTimeout(timer);window.removeEventListener('hashchange',openLinkedReply);};
  },[openReport]);
  useEffect(()=>{
    const target=focusTarget&&document.getElementById(focusTarget);
    if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'center'});}
  },[focusTarget,detail?.report.id]);
  async function record(){
    await work(async()=>{
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error('Recording is unavailable in this browser. Please type your report.');
      const media=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!alive.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      try{
        const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));
        if(!mimeType)throw Error('This browser cannot record a supported audio format. Please type your report.');
        const instance=new MediaRecorder(media,{mimeType,audioBitsPerSecond:32000});recorder.current=instance;
        const chunks:Blob[]=[];let bytes=0;setSeconds(0);setClip(null);setNotice('');
        instance.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);bytes+=e.data.size;if(bytes>2*1024*1024)stop();}};
        instance.onerror=()=>{stop();if(alive.current)setError('The recording was interrupted. Try again or type your report.');};
        instance.onstop=()=>{media.getTracks().forEach(track=>track.stop());if(timer.current)clearInterval(timer.current);if(!alive.current)return;setRecording(false);const blob=new Blob(chunks,{type:instance.mimeType});if(blob.size>2*1024*1024)setError('That recording is too large. Try a shorter recording.');else if(blob.size)setClip(blob);};
        instance.start(500);setRecording(true);const start=Date.now();timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-start)/1000);setSeconds(elapsed);if(elapsed>=90)stop();},500);
      }catch(e){media.getTracks().forEach(track=>track.stop());throw e;}
    });
  }
  async function transcribe(){if(!clip)return;await work(async()=>{
    const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('The recording could not be read.'));reader.readAsDataURL(clip);});
    const result=await request<{text:string}>({action:'voice',consent:true,data,mime:clip.type});
    if(!alive.current)return;
    setDraft(value=>({...value,description:[value.description,result.text].filter(Boolean).join('\n\n'),inputKind:'voice'}));
    setClip(null);setNotice('Transcript added below. Please check it before sending.');
  });}
  async function submit(){
    await work(async()=>{
      const payload=pending||{action:'submit',...draft,photos,id:crypto.randomUUID(),occurredAt:draft.occurredAt?new Date(draft.occurredAt).toISOString():null,browser:clientInfo(release)};
      setPending(payload);
      try{
        const result=await request<{report:BugReport}>(payload);setPending(null);setDraft(blank());setShowEarlier(false);setPhotos([]);setClip(null);setNotice('Report received · '+result.report.reference+' · '+new Date(result.report.createdAt).toLocaleString());
        setReports(value=>[result.report,...value.filter(r=>r.id!==result.report.id)]);setDetail(null);
      }catch(e){if(e instanceof RequestError&&e.status>=400&&e.status<500&&![401,408,409,429].includes(e.status))setPending(null);throw e;}
    });
  }
  const selectedSetup=setup?{...setup,students:setup.students.filter(s=>!draft.studentIds.length||draft.studentIds.includes(s.id)),devices:setup.devices?.filter(d=>!draft.studentIds.length||!!d.studentId&&draft.studentIds.includes(d.studentId)),recentErrors:setup.recentErrors?.filter(e=>!draft.studentIds.length||setup.devices?.some(d=>d.id===e.deviceId&&d.studentId&&draft.studentIds.includes(d.studentId)))}:null;
  return <main className={styles.page}><div className={styles.shell}>
    <Link href="/guard/dashboard/" className={styles.back}><ArrowLeft size={18}/> Dashboard</Link>
    <header className={styles.header}><span className={styles.mark}><Bug size={28}/></span><div><h1>Report a bug</h1></div></header>
    {error&&<div role="alert" className={styles.error}>{error} <Link href="/guard/sign-in/?redirect_url=%2Fguard%2Freport%2F">Sign in</Link></div>}
    {storageLimited&&<p role="status" className={styles.hint}>This browser could not save a temporary draft. Keep this page open until your report is received.</p>}
    {notice&&<div role="status" className={styles.success}><CheckCircle2 size={20}/>{notice}</div>}
    <div className={styles.layout}><section className={styles.card}>
      <form onSubmit={e=>{e.preventDefault();void submit();}}>
        <h2><label htmlFor="bug-description">What happened?</label></h2>
        <textarea id="bug-description" rows={4} disabled={busy||photoBusy||!!pending||recording} value={draft.description} onChange={e=>change({description:e.target.value})} placeholder="What were you doing when the problem occurred?" required minLength={10} maxLength={6000}/>
        <div className={styles.voice}>
          {recording?<button type="button" className={styles.recording} onClick={stop}><Square size={18}/> Stop · {seconds}s / 90s</button>:<button type="button" disabled={busy||photoBusy||!!pending||!!clip||!voiceAvailable} onClick={()=>void record()}><Mic size={18}/> Record instead</button>}
          {voiceAvailable&&<small>Up to 90 seconds</small>}
        </div>
        {clip&&<div className={styles.clip}><audio controls src={clipUrl}/><p>This sends your recording to OpenAI to create an editable transcript. BodeeGuard saves your final report text, not the audio.</p><div className={styles.actions}><button type="button" disabled={busy||!!pending} onClick={()=>void transcribe()}><Mic size={18}/> Transcribe with OpenAI</button><button type="button" disabled={busy} onClick={()=>setClip(null)}><Trash2 size={18}/> Discard</button></div></div>}
        <fieldset disabled={busy||photoBusy||!!pending||recording}>

          <details className={styles.details}><summary><ImagePlus size={19} aria-hidden="true"/><span>Add photos</span><small className={styles.summaryMeta}>{photos.length ? photos.length+' attached' : 'Optional'}</small></summary><PhotoPicker photos={photos} onChange={setPhotos} disabled={busy||photoBusy||!!pending||recording} onBusy={setPhotoBusy}/></details>
          <details className={styles.details}><summary><ListFilter size={19} aria-hidden="true"/><span>Add report details<small className={styles.summaryHint}>Area, child and time</small></span><small className={styles.summaryMeta}>Optional</small></summary>
          <label className={styles.field}>Which area?<select value={draft.area} onChange={e=>change({area:e.target.value})}>{areas.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
          <div className={styles.when}><Clock size={17}/><span>Date and time are recorded automatically when you send.</span><button type="button" aria-expanded={showEarlier} onClick={()=>{setShowEarlier(value=>!value);if(showEarlier)change({occurredAt:''});}}>{showEarlier?'Use submission time':'Happened earlier?'}</button></div>
          {showEarlier&&<label className={styles.field}>When did it happen? <small>Your local date and time</small><input type="datetime-local" value={draft.occurredAt} onChange={e=>change({occurredAt:e.target.value})} required/></label>}
          {!!setup?.students.length&&<div className={styles.children}><span>Who was affected?</span><div>{setup.students.map(s=><label key={s.id}><input type="checkbox" checked={draft.studentIds.includes(s.id)} onChange={e=>change({studentIds:e.target.checked?[...draft.studentIds,s.id]:draft.studentIds.filter(id=>id!==s.id)})}/>{s.name}</label>)}</div></div>}
          </details>
          <label className={styles.consent}><input type="checkbox" checked={draft.includeSetup} onChange={e=>change({includeSetup:e.target.checked})}/><span><strong>Include setup details</strong><small>App versions, computers, school provider and recent errors.</small></span></label>
          {draft.includeSetup&&<details className={styles.details}><summary><ShieldCheck size={17}/> Preview attached setup</summary>{selectedSetup?<SetupDetails setup={selectedSetup}/>:<p>{loading?'Loading setup…':'Setup preview unavailable. Retry loading, or uncheck setup details to send text only.'}</p>}<small>Parent browser, screen size, time zone and website version are included when you send.</small></details>}
        </fieldset>
        {pending&&<p className={styles.hint}>This report is ready to retry. We’ll reuse its reference to prevent a duplicate.</p>}
        <button className={styles.primary} type="submit" disabled={busy||photoBusy||recording||!!clip||!pending&&(draft.description.trim().length<10||draft.description.length>6000||draft.includeSetup&&!setup)}><Send size={18}/>{busy?'Working…':pending?'Retry sending':'Send report'}</button>
        <p className={styles.footnote}>Support will post updates in Your reports. Leave out passwords.</p>
      </form>
    </section>
    <aside className={styles.history}><StudentReports onForwarded={()=>void load()}/><div id="your-reports" className={styles.sectionTitle}><h2>Your reports</h2><button aria-label="Refresh reports" disabled={busy||loading} onClick={()=>void load()}><RefreshCw size={18}/></button></div>
      {!detail&&(loading&&!reports.length?<p>Loading reports…</p>:!reports.length?<div className={styles.empty}><Bug size={25}/><p>No reports sent yet.</p></div>:reports.map(r=><button className={styles.reportRow} key={r.id} disabled={busy||photoBusy} onClick={()=>void openReport(r.id)}><span><strong>{r.description.slice(0,95)}</strong><small>{r.reference} · Sent {new Date(r.createdAt).toLocaleString()}</small><span className={styles.badge} data-status={r.status}>{r.unreadReplyId?'New reply':r.unreadResolutionId?'New · Resolved':statuses[r.status]}</span>{r.origin==='child'&&<small>{r.autoForwarded?'Automatically sent from ':'From '}{r.context.students.find(s=>s.id===r.studentId)?.name||'your child'}</small>}</span><ChevronRight size={18}/></button>))}
      {!detail&&hasMore&&<button disabled={busy} onClick={()=>void work(async()=>{const page=await request<{reports:BugReport[];hasMore:boolean}>({action:'list',offset:reports.length});setReports(value=>[...value,...page.reports]);setHasMore(page.hasMore);})}>Load earlier reports</button>}
      {detail&&<section className={styles.detail}><button type="button" disabled={busy||photoBusy||replyFrozen} onClick={()=>{setDetail(null);setFocusTarget('');if(location.hash.startsWith('#support-update/'))history.replaceState(history.state,'',location.pathname+location.search+'#your-reports');void load();}}>Back to reports</button><h3 id="report-heading" tabIndex={-1}>{detail.report.reference}</h3><p className={styles.description}>{detail.report.description}</p><span className={styles.badge}>{detail.report.status==='resolved'?'Resolved by BodeeGuard support':statuses[detail.report.status]}</span>
        <SavedReportPhotos photos={detail.photos?.filter(p=>!p.eventId)}/>
        {detail.events.filter(e=>e.note||detail.photos?.some(p=>p.eventId===e.id)).map(e=><article key={e.id} id={'report-event-'+e.id} tabIndex={-1}><small>{e.role==='staff'?'BodeeGuard support':'Your family'} · {new Date(e.createdAt).toLocaleString()}</small><p className={styles.description}>{e.note}</p><SavedReportPhotos photos={detail.photos?.filter(p=>p.eventId===e.id)}/></article>)}
        <label className={styles.field}>Add more details<textarea rows={3} maxLength={3000} disabled={busy||replyFrozen} value={reply} onChange={e=>setReply(e.target.value)}/></label>
        <PhotoPicker photos={replyPhotos} onChange={setReplyPhotos} disabled={busy||photoBusy||replyFrozen} onBusy={setPhotoBusy} followup/>
        <button disabled={busy||photoBusy||!reply.trim()&&!replyPhotos.length} onClick={()=>void work(async()=>{const body=replyAttempt.current||{action:'reply',id:detail.report.id,revision:detail.report.revision,eventId:crypto.randomUUID(),note:reply,photos:replyPhotos};replyAttempt.current=body;setReplyFrozen(true);try{await request(body);}catch(e){if(e instanceof RequestError&&e.status===409){replyAttempt.current=null;setReplyFrozen(false);setDetail(await request<ReportDetail>({action:'detail',id:detail.report.id}));}else if(e instanceof RequestError&&e.status>=400&&e.status<500&&![401,408,429].includes(e.status)){replyAttempt.current=null;setReplyFrozen(false);}throw e;}replyAttempt.current=null;setReplyFrozen(false);setReply('');setReplyPhotos([]);setDetail(await request<ReportDetail>({action:'detail',id:detail.report.id}));void load();})}><Send size={16}/> Add details</button>
        <details className={styles.details}><summary><Clock size={16}/> Setup saved with this report</summary><SetupDetails setup={detail.report.context}/></details>
      </section>}
    </aside></div>
  </div></main>;
}
