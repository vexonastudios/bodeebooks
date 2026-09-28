// Each window owns a short server lease, independently of other phones/tabs.
// Serialize requests so a slow heartbeat cannot overwrite a later chat close.
/** @param {{send:(studentId:string|null,viewId:string)=>Promise<boolean>,isVisible:()=>boolean,browser?:Window}} options */
export function createConversationPresence({send,isVisible,browser=window}) {
  const viewId=browser.crypto.randomUUID();
  let selected=null,lastSent,working=false,again=false,disposed=false,timer,inFlight;
  function refresh() {
    browser.clearTimeout(timer);
    if(working){again=true;return;}
    const next=disposed||!isVisible()?null:selected;
    if(next===null&&lastSent===null)return;
    working=true;inFlight=next;
    void (async()=>{
      try{lastSent=await send(next,viewId)?next:undefined;}
      catch{lastSent=undefined;} // The server lease expires if this page goes offline.
      finally{
        working=false;
        if(again){again=false;refresh();}
        else if(!disposed&&selected&&isVisible())timer=browser.setTimeout(refresh,15000);
      }
    })();
  }
  return {
    set(studentId){if(selected===studentId&&(working?inFlight===studentId:lastSent===studentId))return;selected=studentId;refresh();},
    refresh,
    dispose(){disposed=true;selected=null;refresh();}
  };
}
