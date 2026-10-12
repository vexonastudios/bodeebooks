// No network work while hidden or after two minutes without interaction.
// The interval only reads local state; returning to the page refreshes if stale.
export function startStaffRefresh(refresh:()=>void,{win=window,doc=document,now=Date.now,interval=setInterval,cancel=clearInterval}:{win?:Window;doc?:Document;now?:()=>number;interval?:typeof setInterval;cancel?:typeof clearInterval}={}){
  let lastActivity=now(),lastCheck=now();
  const check=()=>{const time=now();if(doc.visibilityState!=='visible'||!doc.hasFocus()||time-lastActivity>=120000||time-lastCheck<60000)return;lastCheck=time;refresh();};
  const activity=()=>{lastActivity=now();check();};
  const visible=()=>{if(doc.visibilityState==='visible')activity();};
  const events=['pointermove','pointerdown','keydown','scroll'];
  for(const event of events)win.addEventListener(event,activity,{passive:true});
  win.addEventListener('focus',activity);doc.addEventListener('visibilitychange',visible);
  const timer=interval(check,60000);
  return()=>{cancel(timer);for(const event of events)win.removeEventListener(event,activity);win.removeEventListener('focus',activity);doc.removeEventListener('visibilitychange',visible);};
}
