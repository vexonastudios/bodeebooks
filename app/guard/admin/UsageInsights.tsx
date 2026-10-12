"use client";
import {useState} from "react";
import {Activity,BarChart3,Database,ShieldCheck,TriangleAlert,Users} from "lucide-react";
import type {ResourceUsage,UsageCounters,UsageWatch} from "./types";
import styles from "./admin.module.css";
const count=(value:number)=>value.toLocaleString(undefined,{maximumFractionDigits:1});
const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value/1e6);
const average=(value:number,total:number)=>total?count(value/total):'—';
const metricLabels={requests:'API requests',dbQueries:'Database queries',transferBytes:'API transfer (MiB)',aiCostMicros:'AI spending (USD)'};
const divisor=(key:string)=>key==='aiCostMicros'?1e6:key==='transferBytes'?1024**2:1;
const display=(key:string,value:number)=>key==='aiCostMicros'?money(value):key==='transferBytes'?`${count(value/1024**2)} MiB`:count(value);
type Metric=keyof typeof metricLabels;
function WatchLimits({watch,budgets,busy,refresh}:{watch:UsageWatch;budgets:NonNullable<ResourceUsage['insights']>['budgets'];busy:boolean;refresh:()=>void}){
  const [draft,setDraft]=useState(()=>Object.fromEntries(Object.entries(metricLabels).map(([key])=>[key,watch.limits[key as Metric]?String(watch.limits[key as Metric]!/divisor(key)):'']))),[saving,setSaving]=useState(false),[error,setError]=useState('');
  async function save(event:React.FormEvent){
    event.preventDefault();setSaving(true);setError('');
    try{
      const limits=Object.fromEntries(Object.entries(draft).filter(([,value])=>value.trim()).map(([key,value])=>[key,Math.round(Number(value)*divisor(key))]));
      if(Object.values(limits).some(value=>!Number.isSafeInteger(value)||value<=0||value>1e12))throw Error('Enter positive limits, or leave a field blank.');
      const response=await fetch('/guard/admin/bridge/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'usage-limits',limits,revision:watch.revision})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'The limits could not be saved.');refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:'The limits could not be saved.');}finally{setSaving(false);}
  }
  return <section className={styles.panel} aria-label="Daily watch limits"><h2><ShieldCheck size={20}/> Daily watch limits</h2><p>Across all families, midnight to midnight UTC. Warn at 80% and 100%; these warnings never block children or parent controls.</p>
    <div className={styles.watchGrid}>{budgets.map(budget=><article key={budget.metric} data-state={budget.state}><span>{metricLabels[budget.metric]}</span><strong>{budget.used===null?'Unknown':display(budget.metric,budget.used)}</strong><small>of {display(budget.metric,budget.limit)} / day</small><strong className={styles.watchState}>{({near:'Near limit',exceeded:'Limit exceeded',within:'Below limit',unknown:'No reading',partial:'Partial reading'})[budget.state]}</strong>{budget.used!==null&&<meter min={0} max={budget.limit} value={Math.min(budget.used,budget.limit)} aria-label={`${metricLabels[budget.metric]} daily usage`}/>}</article>)}</div>
    {!budgets.length&&<p>No watch limits set yet. Choose thresholds below; these are usage targets, not your provider’s billing allowances.</p>}
    <details className={styles.watchEditor}><summary>Configure shared staff limits</summary><form onSubmit={event=>void save(event)}><div className={styles.watchFields}>{Object.entries(metricLabels).map(([key,label])=><label key={key}>{label}<input type="number" min={key==='aiCostMicros'||key==='transferBytes'?'0.01':'1'} step={key==='aiCostMicros'||key==='transferBytes'?'0.01':'1'} value={draft[key]} placeholder="No warning limit" onChange={event=>setDraft({...draft,[key]:event.target.value})} disabled={saving}/></label>)}</div><p>Blank turns that warning off. Saved for all staff members. Warnings are evaluated when you open or refresh usage; no background scans or emails.</p>{error&&<p className={styles.error} role="alert">{error}</p>}<button className={styles.primary} disabled={saving||busy} type="submit">{saving?'Saving…':'Save watch limits'}</button></form></details>
  </section>;
}
const series={requests:{label:'Requests',value:(row:UsageCounters)=>row.requests,format:count},dbQueries:{label:'DB queries',value:(row:UsageCounters)=>row.dbQueries,format:count},transfer:{label:'API transfer',value:(row:UsageCounters)=>(row.requestBytes+row.responseBytes)/1024**2,format:(value:number)=>`${count(value)} MiB`},errors:{label:'Server errors',value:(row:UsageCounters)=>row.serverErrors,format:count},duration:{label:'Mean response',value:(row:UsageCounters)=>row.requests?row.durationMs/row.requests:0,format:(value:number)=>`${count(value)} ms`},ai:{label:'AI spending',value:(row:UsageCounters)=>row.aiCostMicros,format:money}};
export function UsageTrends({data}:{data:ResourceUsage}){
  const [metric,setMetric]=useState<keyof typeof series>('dbQueries'),selected=series[metric];
  const start=data.from.slice(0,10),end=data.asOf.slice(0,10),points=[];
  for(let day=Date.parse(`${start}T00:00:00Z`);day<=Date.parse(`${end}T00:00:00Z`)&&points.length<32;day+=86400000){const date=new Date(day).toISOString().slice(0,10);points.push({date,row:data.daily.find(row=>row.date===date)});}
  const max=Math.max(1,...points.map(point=>point.row?selected.value(point.row):0));
  return <section className={styles.panel}><div className={styles.sectionHead}><div><h2><BarChart3 size={20}/> Daily trends</h2><p>UTC dates. Today is still in progress; missing counters are shown as unknown.</p></div></div>
    <div className={styles.trendTabs} role="group" aria-label="Trend metric">{Object.entries(series).map(([key,item])=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key as keyof typeof series)}>{item.label}</button>)}</div>
    <div className={styles.dailyChart} aria-label={`${selected.label} by UTC date`}>{points.map(({date,row})=><div key={date} data-partial={date===end||data.firstTracked?.slice(0,10)===date} title={`${date}: ${row?selected.format(selected.value(row)):'Unknown'}${date===end?' · In progress':''}`}><strong>{row?selected.format(selected.value(row)):'—'}</strong><span style={{height:row?Math.max(3,selected.value(row)/max*120):3}} data-missing={!row}/><small>{date.slice(5)}</small></div>)}</div>
    <details><summary>Daily figures</summary><div className={styles.usageTable}><table><caption>Daily usage figures in UTC</caption><thead><tr><th>Date (UTC)</th><th>Active families</th><th>Requests</th><th>DB queries</th><th>5xx errors</th><th>API transfer</th><th>AI spending</th></tr></thead><tbody>{points.map(({date,row})=><tr key={date}><th scope="row">{date}{date===end&&<small>In progress</small>}{data.firstTracked?.slice(0,10)===date&&<small>Tracking began this day</small>}</th><td>{row?.activeFamilies??'—'}</td><td>{row?count(row.requests):'Unknown'}</td><td>{row?count(row.dbQueries):'—'}</td><td>{row?count(row.serverErrors):'—'}</td><td>{row?display('transferBytes',row.requestBytes+row.responseBytes):'—'}</td><td>{row?money(row.aiCostMicros):'—'}</td></tr>)}</tbody></table></div></details>
  </section>;
}
export default function UsageInsights({data,busy,refresh}:{data:ResourceUsage;busy:boolean;refresh:()=>void}){
  const info=data.insights;if(!info)return null;
  const n=info.normalized,c=info.comparison;
  return <>
    <div className={styles.usageContext}><span><ShieldCheck size={17}/> Hourly counters · no extra child tracking calls</span><a href="/guard/admin/health/">Open service health & incidents →</a></div>
    <div className={styles.stats}>{[{label:'Active families',value:count(n.activeFamilies),detail:'Families with recorded activity in this range',Icon:Users},{label:'Requests / active family',value:average(n.requests,n.activeFamilies),detail:'This range · excludes system / unattributed traffic',Icon:Activity},{label:'DB queries / request',value:average(data.totals.dbQueries,data.totals.requests),detail:'App queries, not Cloudflare rows read',Icon:Database},{label:'Mean API response',value:data.totals.requests?`${average(data.totals.durationMs,data.totals.requests)} ms`:'—',detail:`${count(data.totals.aborted)} interrupted requests`,Icon:Activity}].map(({label,value,detail,Icon})=><article key={label}><Icon size={20}/><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
    {(info.signals.length>0||data.truncated)&&<section className={styles.panel}><h2><TriangleAlert size={20}/> Needs attention</h2>{info.signals.map(signal=><div key={signal.id} className={styles.usageWarning}><TriangleAlert size={20}/><div><strong>{signal.title}</strong><p>{signal.detail}</p></div></div>)}{data.truncated&&<p>Totals are partial. Comparisons and watch-limit status cannot establish that usage is normal.</p>}</section>}
    <section className={styles.panel}><h2>Is usage becoming more efficient?</h2>{c?<><p>Completed day {c.date} against {c.baselineDays} earlier observed days (up to seven). Family averages account for changes in the number of active families.</p><div className={styles.comparisonGrid}>{[{label:'Queries / request',value:c.queriesPerRequest},{label:'Requests / active family',value:c.requestsPerActiveFamily},{label:'DB queries / active family',value:c.dbQueriesPerActiveFamily}].map(({label,value})=><article key={label}><span>{label}</span><strong>{value.current===null?'—':count(value.current)}</strong><small>Earlier average: {value.baseline===null?'—':count(value.baseline)}</small><b>{value.current!==null&&value.baseline!==null&&value.baseline>0?`${value.current>value.baseline?'+':''}${count((value.current/value.baseline-1)*100)}%`:'Not comparable'}</b></article>)}</div></>:<p>Needs yesterday and at least three earlier complete days with counters. Today’s partial activity is never compared with a full day.</p>}
    {info.recommendations.length>0&&<p>Worth investigating: {info.recommendations.map(row=>`${row.feature.replaceAll('-',' ')} (${count(row.queriesPerRequest)} queries/request; ${count(row.dbQueries)} queries)`).join('; ')}. High query counts are a lead to investigate, not proof of a fault.</p>}</section>
    {!data.family&&data.watch&&<WatchLimits key={data.watch.revision} watch={data.watch} budgets={info.budgets} busy={busy} refresh={refresh}/>}
  </>;
}
