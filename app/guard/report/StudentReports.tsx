'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bug,CheckCircle2,ChevronRight,RefreshCw,Send,ShieldCheck,X} from 'lucide-react';
import {request,RequestError} from './report-client';
import type {BugReport,ReportDetail} from './types';
import {SavedReportPhotos} from './ReportPhotos';
import SetupDetails from './SetupDetails';
import styles from './report.module.css';
export default function StudentReports({onForwarded}:{onForwarded:()=>void}){
 const [reports,setReports]=useState<BugReport[]>([]),[detail,setDetail]=useState<ReportDetail|null>(null),[filter,setFilter]=useState<'pending'|'dismissed'>('pending');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[note,setNote]=useState(''),[hasMore,setHasMore]=useState(false);
 const [pending,setPending]=useState<{id:string;decision:'forwarded'|'dismissed'}|null>(null);
 const attempt=useRef<Record<string,unknown>|null>(null),working=useRef(false),loadVersion=useRef(0);
 const frozen=Boolean(pending);
 const load=useCallback(async()=>{const version=++loadVersion.current;try{const result=await request<{reports:BugReport[];hasMore:boolean}>({action:'student-list',reviewState:filter});if(version===loadVersion.current){setReports(result.reports);setHasMore(result.hasMore);}}catch(e){if(version===loadVersion.current)setError(e instanceof Error?e.message:'Could not load student reports.');}},[filter]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[load]);
 async function run(task:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{working.current=false;setBusy(false);}}
 async function review(report:BugReport,decision:'forwarded'|'dismissed',parentNote=''){
  if(pending&&(pending.id!==report.id||pending.decision!==decision))return;
  await run(async()=>{
   loadVersion.current++;setNotice('');
   const body=attempt.current||{action:'review',id:report.id,eventId:crypto.randomUUID(),revision:report.revision,decision,note:parentNote};attempt.current=body;setPending({id:report.id,decision});
   try{await request(body);}catch(e){
    if(e instanceof RequestError&&e.status>=400&&e.status<500&&e.status!==408&&e.status!==429){attempt.current=null;setPending(null);if(e.status===409||e.status===404){await load();if(detail?.report.id===report.id)setDetail(await request<ReportDetail>({action:'detail',id:report.id}));}}
    throw e;
   }
   attempt.current=null;setPending(null);if(detail?.report.id===report.id){setDetail(null);setNote('');}
   setNotice(decision==='forwarded'?'Sent to BodeeGuard. You can follow it in Your reports below.':'Dismissed. You can find it under Dismissed if you need it later.');await load();onForwarded();
  });
 }
 const canAct=(report:BugReport,decision:'forwarded'|'dismissed')=>!busy&&(!pending||pending.id===report.id&&pending.decision===decision);

 return <section className={styles.childInbox} aria-label="Reports from children" id="student-reports">
  <div className={styles.sectionTitle}><h2><Bug size={21}/> Reports from children</h2><button type="button" aria-label="Refresh student reports" disabled={busy||frozen} onClick={()=>void load()}><RefreshCw size={18}/></button></div>
  <p className={styles.childIntro}><ShieldCheck size={17}/> These stay within your family until you send them to BodeeGuard. Sending shares the child’s report, any screenshot, and app and computer details with support.</p>
  <div className={styles.actions}>{(['pending','dismissed'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} disabled={busy||frozen} onClick={()=>{setFilter(value);setDetail(null);setNote('');setError('');}}>{value==='pending'?'Needs your review':'Dismissed'}</button>)}</div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.success}><CheckCircle2 size={18}/>{notice}</p>}
  {!reports.length?<p className={styles.childIntro}>{filter==='pending'?'No student reports are waiting for review.':'No dismissed student reports.'}</p>:<div className={styles.childRows}>{reports.map(report=><article className={styles.childReportCard} key={report.id}>
   <button type="button" className={styles.reportRow} disabled={busy||frozen} onClick={()=>void run(async()=>{setDetail(await request<ReportDetail>({action:'detail',id:report.id}));setNote('');setNotice('');})}><span><strong>{report.context.students[0]?.name||'Your child'}</strong><span>{report.description.slice(0,150)}</span><small>{new Date(report.createdAt).toLocaleString()}</small></span><ChevronRight size={18}/></button>
   <div className={styles.childCardActions}>{filter==='pending'&&<button type="button" aria-label={'Dismiss '+(report.context.students[0]?.name||'your child')+'’s report'} disabled={!canAct(report,'dismissed')} onClick={()=>void review(report,'dismissed',detail?.report.id===report.id?note:'')}><X size={16}/>{pending?.id===report.id&&pending.decision==='dismissed'?(busy?'Dismissing…':'Retry dismissal'):'Dismiss'}</button>}<button type="button" className={styles.childSend} aria-label={'Send '+(report.context.students[0]?.name||'your child')+'’s report to BodeeGuard'} disabled={!canAct(report,'forwarded')} onClick={()=>void review(report,'forwarded',detail?.report.id===report.id?note:'')}><Send size={16}/>{pending?.id===report.id&&pending.decision==='forwarded'?(busy?'Sending…':'Retry sending'):'Send to BodeeGuard'}</button></div>
  </article>)}</div>}
  {hasMore&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{const page=await request<{reports:BugReport[];hasMore:boolean}>({action:'student-list',reviewState:filter,offset:reports.length});setReports(value=>[...value,...page.reports]);setHasMore(page.hasMore);})}>Load earlier student reports</button>}
  {detail&&<div className={styles.childReview}><h3>{detail.report.context.students[0]?.name||'Your child'} reported a problem</h3><p className={styles.description}>{detail.report.description}</p><SavedReportPhotos photos={detail.photos}/>
   <details className={styles.details}><summary><ShieldCheck size={17}/> Included app and computer details</summary><SetupDetails setup={detail.report.context}/></details>
   <label className={styles.field}>Your note <small>Optional</small><textarea rows={3} maxLength={3000} disabled={busy||frozen} value={note} onChange={event=>setNote(event.target.value)} placeholder="Add anything that will help us understand the problem."/></label>
   <p className={styles.childIntro}>Sending shares the screenshot and setup details above with BodeeGuard support.</p>
   <div className={styles.actions}><button type="button" disabled={!canAct(detail.report,'dismissed')} onClick={()=>void review(detail.report,'dismissed',note)}><X size={17}/>{pending?.id===detail.report.id&&pending.decision==='dismissed'?(busy?'Dismissing…':'Retry dismissal'):'Dismiss'}</button><button type="button" className={styles.primary} disabled={!canAct(detail.report,'forwarded')} onClick={()=>void review(detail.report,'forwarded',note)}><Send size={17}/>{pending?.id===detail.report.id&&pending.decision==='forwarded'?(busy?'Sending…':'Retry sending'):'Send to BodeeGuard'}</button></div>
  </div>}
 </section>;
}
