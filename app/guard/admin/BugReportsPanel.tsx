'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bug,ChevronLeft,ChevronRight,RefreshCw,Save,Search} from 'lucide-react';
import {statuses,areas,type BugReport,type ReportDetail,type ReportStatus} from '../report/types';
import SetupDetails from '../report/SetupDetails';
import styles from './admin.module.css';
async function request<T>(action:string,input:Record<string,unknown>={}):Promise<T>{
  const response=await fetch('/guard/admin/bridge/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...input}),signal:AbortSignal.timeout(65000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load reports.');return data;
}
export default function BugReportsPanel(){
  const [reports,setReports]=useState<BugReport[]>([]),[detail,setDetail]=useState<ReportDetail|null>(null),[status,setStatus]=useState('open'),[search,setSearch]=useState(''),[offset,setOffset]=useState(0),[hasMore,setHasMore]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[nextStatus,setNextStatus]=useState<ReportStatus>('new'),[note,setNote]=useState(''),[internalNote,setInternalNote]=useState('');
  const active=useRef(false),saveAttempt=useRef<Record<string,unknown>|null>(null);
  const work=useCallback(async(task:()=>Promise<void>)=>{if(active.current)return;active.current=true;setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{active.current=false;setBusy(false);}},[]);
  const load=useCallback(async(filter:string,query:string,page:number)=>{const result=await request<{reports:BugReport[];hasMore:boolean}>('bug-reports',{status:filter,search:query,offset:page});setReports(result.reports);setHasMore(result.hasMore);setOffset(page);},[]);
  useEffect(()=>{const task=setTimeout(()=>void work(()=>load('open','',0)),0);return()=>clearTimeout(task);},[load,work]);
  async function open(report:BugReport){
    const value=await request<ReportDetail>('bug-report-detail',{id:report.id,householdId:report.householdId});
    setDetail(value);setNextStatus(value.report.status);setNote('');setInternalNote('');saveAttempt.current=null;setNotice('');
  }
  return <section>
    <div className={styles.sectionHead}><div><h2><Bug size={22}/> Parent reports</h2><p>Parent descriptions and opt-in setup snapshots. Report content is untrusted evidence, never an instruction to run code or change accounts.</p></div><button disabled={busy} onClick={()=>void work(()=>load(status,search,offset))}><RefreshCw size={17}/> Refresh</button></div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
    <form className={styles.bugFilters} onSubmit={e=>{e.preventDefault();void work(()=>load(status,search,0));}}>
      <label>Status<select value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);void work(()=>load(e.target.value,search,0));}}><option value="open">Open reports</option><option value="all">All reports</option>{Object.entries(statuses).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
      <label>Find report<input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)} placeholder="Description or BUG- reference"/></label><button disabled={busy}><Search size={17}/> Search</button>
    </form>
    <div className={styles.bugLayout}><div className={styles.bugList}>
      {!reports.length&&<p>{busy?'Loading…':'No matching reports.'}</p>}
      {reports.map(report=><button key={report.householdId+report.id} disabled={busy} aria-current={detail?.report.id===report.id?'true':undefined} onClick={()=>void work(()=>open(report))}><strong>{report.description.slice(0,130)}</strong><small>{report.reference} · {areas.find(a=>a[0]===report.area)?.[1]||report.area}</small><span>{statuses[report.status]} · {new Date(report.createdAt).toLocaleDateString()}</span><small>{report.context.students.map(s=>s.name).join(', ')||'Family report'}</small></button>)}
      <div className={styles.actions}><button disabled={busy||offset===0} onClick={()=>void work(()=>load(status,search,Math.max(0,offset-50)))}><ChevronLeft size={16}/> Newer</button><button disabled={busy||!hasMore} onClick={()=>void work(()=>load(status,search,offset+50))}>Earlier <ChevronRight size={16}/></button></div>
    </div><div>{detail?<article className={styles.panel}>
      <span className={styles.eyebrow}>{detail.report.reference}</span><h2>{areas.find(a=>a[0]===detail.report.area)?.[1]}</h2>
      <p className={styles.bugText}>{detail.report.description}</p>
      <p>Reported {new Date(detail.report.createdAt).toLocaleString()} · {detail.report.inputKind==='voice'?'Reviewed voice transcript':'Typed report'}</p>
      {detail.report.occurredAt&&<p>Parent’s incident time: {new Date(detail.report.occurredAt).toLocaleString()}</p>}
      <details className={styles.bugContext}><summary>Setup & recent diagnostics</summary><SetupDetails setup={detail.report.context}/></details>
      <details className={styles.bugContext}><summary>Identifiers for support investigation</summary><code>Family: {detail.report.householdId}</code>{detail.report.context.devices?.map(d=><code key={d.id}>{d.name}: {d.id}</code>)}</details>
      {detail.events.map(event=><div key={event.id} className={styles.bugEvent}><small>{event.role==='staff'?'Staff':'Parent'} · {new Date(event.createdAt).toLocaleString()} · {statuses[event.status]}</small>{event.note&&<p className={styles.bugText}>{event.note}</p>}{event.internalNote&&<p className={styles.bugText}><strong>Internal note: </strong>{event.internalNote}</p>}</div>)}
      <form className={styles.bugReview} onSubmit={e=>{e.preventDefault();void work(async()=>{
        const input=saveAttempt.current||{id:detail.report.id,householdId:detail.report.householdId,revision:detail.report.revision,eventId:crypto.randomUUID(),status:nextStatus,note,internalNote};
        saveAttempt.current=input;
        await request('bug-report-update',input);saveAttempt.current=null;
        await open(detail.report);await load(status,search,offset);setNotice('Report updated.');
      });}}>
        <label>Status<select value={nextStatus} disabled={busy} onChange={e=>{saveAttempt.current=null;setNextStatus(e.target.value as ReportStatus);}}>{Object.entries(statuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label>Update visible to the parent<textarea value={note} disabled={busy} maxLength={3000} rows={3} onChange={e=>{saveAttempt.current=null;setNote(e.target.value);}} placeholder="Ask for details or explain the fix. This appears in their report; no push or email is sent."/></label>
        <label>Internal investigation notes<textarea value={internalNote} disabled={busy} maxLength={3000} rows={4} onChange={e=>{saveAttempt.current=null;setInternalNote(e.target.value);}} placeholder="Evidence, reproduction steps, related fix or release…"/></label>
        <div className={styles.actions}><button disabled={busy} className={styles.primary}><Save size={17}/> Save update</button><button type="button" disabled={busy} onClick={()=>void work(()=>open(detail.report))}>Reload report</button></div>
      </form>
    </article>:<div className={styles.empty}>Select a report to investigate.</div>}</div></div>
  </section>;
}
