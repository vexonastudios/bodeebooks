"use client";
import {useEffect,useState,useCallback} from "react";
import {Bell,RefreshCw,Clock,CheckCircle,AlertTriangle} from "lucide-react";
import styles from "./admin.module.css";
type Snapshot={asOf:string;configured:boolean;retryCoordinator:boolean;queue:{pending:number;retrying:number;oldest:string|null;expired:number};outcomes:{outcome:string;count:number}[];families:{family:string;pending:number;oldest:string}[]};
export default function NotificationsPanel(){
  const [data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const refresh=useCallback(async(signal?:AbortSignal)=>{
    if(document.hidden)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/guard/admin/bridge/",{method:"POST",credentials:"same-origin",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"notifications"})});
      const result=await response.json();if(!response.ok)throw Error(result.error||"Notification health could not load.");
      if(!signal?.aborted)setData(result);
    }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:"Try again.");}
    finally{if(!signal?.aborted)setBusy(false);}
  },[]);
  useEffect(()=>{const controller=new AbortController();void refresh(controller.signal);return()=>controller.abort();},[refresh]);
  const total=(outcome:string)=>data?.outcomes.find(row=>row.outcome===outcome)?.count||0;
  return <section>
    <div className={styles.sectionHead}><div><h2><Bell size={22}/> Phone notification health</h2><p>Retry work runs while a family has pending alerts. Refresh to check again.</p></div><button disabled={busy} onClick={()=>void refresh()}><RefreshCw size={17}/> {busy?"Checking…":"Refresh"}</button></div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {data&&<>
      {(!data.configured||!data.retryCoordinator)&&<p role="alert" className={styles.error}>Notification signing or the retry coordinator is not configured.</p>}
      <div className={styles.stats}>{[
        {label:"Pending alerts",value:data.queue.pending,detail:data.queue.oldest?"Oldest saved "+new Date(data.queue.oldest).toLocaleString():"No alerts waiting",Icon:Clock},
        {label:"Provider accepted · 24 hours",value:total("sent"),detail:"Does not confirm phone display or reading",Icon:CheckCircle},
        {label:"Waiting for retry",value:data.queue.retrying,detail:"Includes active delivery attempts",Icon:RefreshCw},
        {label:"Delivery failures · 24 hours",value:total("permanent")+total("exhausted"),detail:"Permanent rejection or retry limit reached",Icon:AlertTriangle},
      ].map(({label,value,detail,Icon})=><article key={label}><Icon size={22}/><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></article>)}</div>
      <div className={styles.columns}>
        <section className={styles.panel}><h2>Delivery detail · 24 hours</h2>{[
          ["Retry attempts",total("retry")],["Messages grouped into another alert",total("grouped")],["Read before delivery",total("read")],["Expired browser endpoints",total("gone")],["Expired jobs awaiting cleanup",data.queue.expired],
        ].map(([label,value])=><div key={label} className={styles.metricRow}><span>{label}</span><strong>{value}</strong></div>)}<p>Metrics begin with this deployment and are retained for 35 days. Messages remain in the family conversation if a phone alert fails.</p></section>
        <section className={styles.panel}><h2>Families with pending alerts</h2>{data.families.length?data.families.map(row=><div key={row.family} className={styles.metricRow}><span>Family {row.family}<small> · oldest {new Date(row.oldest).toLocaleString()}</small></span><strong>{row.pending}</strong></div>):<p>No alerts waiting.</p>}<p>Up to 50 families. Message content and notification keys are excluded.</p></section>
      </div><p className={styles.updated}>Updated {new Date(data.asOf).toLocaleString()}</p>
    </>}
  </section>;
}
