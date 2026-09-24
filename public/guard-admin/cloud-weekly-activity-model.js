import { localDate } from './cloud-records-model.js';
export const shiftDate=(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10);
export function weekStart(timeZone,at=Date.now()){
 const today=localDate(timeZone,at);return shiftDate(today,-((new Date(today).getUTCDay()+6)%7));
}
export function timeLabel(seconds){
 const value=Math.max(0,Math.floor(Number(seconds)||0));if(!value)return '0m';if(value<60)return '<1m';
 const minutes=Math.floor(value/60);return minutes>=60?Math.floor(minutes/60)+'h '+(minutes%60)+'m':minutes+'m';
}
export function weeklyTotals(report){
 const dates=Array.from({length:7},(_,day)=>shiftDate(report.start,day));const activities=new Map(),daily=dates.map(()=>0);
 for(const row of report.rows){
  const day=dates.indexOf(row.date),seconds=Number(row.seconds);if(day<0||!Number.isFinite(seconds)||seconds<=0)continue;
  if(!activities.has(row.key))activities.set(row.key,{...row,days:dates.map(()=>0),total:0});
  const activity=activities.get(row.key);activity.days[day]+=seconds;activity.total+=seconds;daily[day]+=seconds;
 }
 return {dates,daily,total:daily.reduce((sum,value)=>sum+value,0),activities:[...activities.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label))};
}
