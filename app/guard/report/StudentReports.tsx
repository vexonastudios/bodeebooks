'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bug,CheckCircle2,ChevronDown,RefreshCw,Send,ShieldCheck,X} from 'lucide-react';
import {request,RequestError} from './report-client';
import type {BugReport,ReportDetail,Forwarding} from './types';
import {SavedReportPhotos} from './ReportPhotos';
import SetupDetails from './SetupDetails';
import styles from './report.module.css';
export default function StudentReports({onForwarded}:{onForwarded:()=>void}){
 const [reports,setReports]=useState<BugReport[]>([]),[detail,setDetail]=useState<ReportDetail|null>(null),[filter,setFilter]=useState<'pending'|'dismissed'>('pending');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[hasMore,setHasMore]=useState(false);
 const [forwarding,setForwarding]=useState<Forwarding|null>(null),[hasDismissed,setHasDismissed]=useState(false),[loaded,setLoaded]=useState(false);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [pending,setPending]=useState<{id:string;decision:'forwarded'|'dismissed'}|null>(null);
 const attempt=useRef<Record<string,unknown>|null>(null),working=useRef(false),loadVersion=useRef(0);
 const frozen=Boolean(pending);
 const load=useCallback(async()=>{const version=++loadVersion.current;try{const result=await request<{reports:BugReport[];hasMore:boolean;forwarding:Forwarding;hasDismissed:boolean}>({action:'student-list',reviewState:filter});if(version===loadVersion.current){setReports(result.reports);setHasMore(result.hasMore);setHasDismissed(result.hasDismissed);setForwarding(result.forwarding);setLoaded(true);}}catch(e){if(version===loadVersion.current)setError(e instanceof Error?e.message:'Could not load student reports.');}},[filter]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[load]);
 async function run(task:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{working.current=false;setBusy(false);}}
 async function changeForwarding(enabled:boolean){
   if(!forwarding)return;
   await run(async()=>{
     loadVersion.current++;
     try {
       const saved=await request<Forwarding>({action:'set-forwarding',enabled,revision:forwarding.revision});
       setForwarding(saved);
       setNotice(saved.enabled?'Future child reports will go directly to support.':'Future child reports will wait for your review.');
     } catch(error) {await load();throw error;}
   });
 }
 function showInbox(next:'pending'|'dismissed'){
   loadVersion.current++;setFilter(next);setReports([]);setLoaded(false);setHasMore(false);setDetail(null);setError('');setNotice('');
 }
 async function review(report:BugReport,decision:'forwarded'|'dismissed',parentNote=''){
  if(pending&&(pending.id!==report.id||pending.decision!==decision))return;
  await run(async()=>{
   loadVersion.current++;setNotice('');
   const body=attempt.current||{action:'review',id:report.id,eventId:crypto.randomUUID(),revision:report.revision,decision,note:parentNote};attempt.current=body;setPending({id:report.id,decision});
   try{await request(body);}catch(e){
    if(e instanceof RequestError&&e.status>=400&&e.status<500&&e.status!==408&&e.status!==429){attempt.current=null;setPending(null);if(e.status===409||e.status===404){await load();if(detail?.report.id===report.id)setDetail(await request<ReportDetail>({action:'detail',id:report.id}));}}
    throw e;
   }
   attempt.current=null;setPending(null);if(detail?.report.id===report.id)setDetail(null);
   setNotes(previous=>{const next={...previous};delete next[report.id];return next;});
   setNotice(decision==='forwarded'?'Sent to BodeeGuard. You can follow it in Your reports below.':'Dismissed. You can find it under View dismissed reports.');await load();onForwarded();
  });
 }
 const canAct=(report:BugReport,decision:'forwarded'|'dismissed')=>!busy&&(!pending||pending.id===report.id&&pending.decision===decision);

 return <section className={styles.childInbox} aria-label="Reports from children" id="student-reports">
  <div className={styles.sectionTitle}><h2><Bug size={21}/> Reports from children</h2><button type="button" aria-label="Refresh student reports" disabled={busy||frozen} onClick={()=>void load()}><RefreshCw size={18}/></button></div>
  <label className={styles.forwardChoice}><input type="checkbox" role="switch" checked={forwarding?.enabled===true} disabled={!forwarding||busy||frozen} onChange={event=>void changeForwarding(event.target.checked)}/><span><strong>Automatically send child reports to BodeeGuard</strong><small>Share future reports, screenshots and app and computer details with support. Turn this off to review each report yourself.</small></span></label>
  {filter==='dismissed'?<button type="button" className={styles.inboxLink} disabled={busy||frozen} onClick={()=>showInbox('pending')}>Back to pending reports</button>:hasDismissed&&<button type="button" className={styles.inboxLink} disabled={busy||frozen} onClick={()=>showInbox('dismissed')}>View dismissed reports</button>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}><CheckCircle2 size={18}/>{notice}</p>}
  {reports.length>0&&<h3>{filter==='pending'?'Waiting for your review':'Dismissed reports'}</h3>}
  {!reports.length?<p className={styles.childIntro}>{!loaded?(error?'':'Loading child reports…'):filter==='pending'?'No child reports need your review.':'No dismissed reports.'}</p>:<div className={styles.childRows}>{reports.map(report=>{
    const expanded=detail?.report.id===report.id;
    const child=report.context.students.find(s=>s.id===report.studentId)?.name||report.context.students[0]?.name||'Your child';
    const panelId='child-report-'+report.id;
    const note=notes[report.id]||'';
    return <article className={styles.childReportCard} key={report.id}>
      <button type="button" className={styles.reportRow} aria-expanded={expanded} aria-controls={panelId} disabled={busy||frozen}
        onClick={()=>void run(async()=>{
          if(expanded){setDetail(null);return;}
          setDetail(await request<ReportDetail>({action:'detail',id:report.id}));setNotice('');
        })}>
        <span><strong>{child}</strong><span>{expanded?detail.report.description:report.description.slice(0,150)}</span>
          <small><time dateTime={report.createdAt}>{new Date(report.createdAt).toLocaleString()}</time></small>
          <span className={styles.viewReport}>{expanded?'Hide details':'View report'}<ChevronDown size={15} aria-hidden="true"/></span>
        </span>
      </button>
      <div id={panelId} hidden={!expanded} className={styles.childReview}>{expanded&&<>
        <SavedReportPhotos photos={detail.photos}/>
        <details className={styles.details}><summary><ShieldCheck size={17} aria-hidden="true"/>Included app and computer details</summary><SetupDetails setup={detail.report.context}/></details>
        <label className={styles.field}>Your note (optional)<textarea rows={2} maxLength={3000} disabled={busy||frozen} value={note}
          onChange={event=>{const value=event.target.value;setNotes(previous=>({...previous,[report.id]:value}));}}/></label>
      </>}</div>
      <div className={styles.childCardActions}>
        {filter==='pending'&&<button type="button" aria-label={'Dismiss '+child+'’s report'} disabled={!canAct(report,'dismissed')} onClick={()=>void review(report,'dismissed',note)}>
          <X size={16}/>{pending?.id===report.id&&pending.decision==='dismissed'?(busy?'Dismissing…':'Retry dismissal'):'Dismiss'}
        </button>}
        <button type="button" className={styles.childSend} aria-label={'Send '+child+'’s report to BodeeGuard'} disabled={!canAct(report,'forwarded')} onClick={()=>void review(report,'forwarded',note)}>
          <Send size={16}/>{pending?.id===report.id&&pending.decision==='forwarded'?(busy?'Sending…':'Retry sending'):'Send to BodeeGuard'}
        </button>
      </div>
    </article>;
  })}</div>}
  {hasMore&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{const page=await request<{reports:BugReport[];hasMore:boolean}>({action:'student-list',reviewState:filter,offset:reports.length});setReports(value=>[...value,...page.reports]);setHasMore(page.hasMore);})}>Load earlier student reports</button>}
 </section>;
}
