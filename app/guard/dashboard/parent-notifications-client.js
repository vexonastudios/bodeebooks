const markerKey = 'bodeeguard-phone-notifications';
const reminderKey = 'bodeeguard-notification-reminder';
export async function notificationRequest(operation, subscription, accountUserId, details = {}) {
  const response = await fetch('/guard/dashboard/bridge/', { method:'POST', cache:'no-store', credentials:'same-origin',
    signal:AbortSignal.timeout(12000), keepalive:operation==='view'&&details.studentId===null, headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'phone-notifications',operation,accountUserId,...details,...(subscription?{subscription}:{})}) });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Notifications could not be updated. Try again.');
  return data;
}
const savedMarker = browser => {try{return JSON.parse(browser.localStorage.getItem(markerKey)||'null');}catch{return null;}};
const clearMarker = browser => {try{browser.localStorage.removeItem(markerKey);}catch{/* Optional reminder. */}};
async function registration(browser) {
  let timer;
  try{return await Promise.race([browser.navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Please reopen BodeeGuard and try again.')),8000);})]);}
  finally{clearTimeout(timer);}
}
export async function stopParentPhoneNotifications({browser=window,userId=savedMarker(browser)?.userId,request=notificationRequest}={}) {
  if(!browser.navigator.serviceWorker){clearMarker(browser);return;}
  const worker=await browser.navigator.serviceWorker.getRegistration?.();
  const sub=await worker?.pushManager?.getSubscription();
  if(sub){
    const json=sub.toJSON();
    // Both paths are attempted: the browser can invalidate an endpoint while the API is offline.
    const results=await Promise.allSettled([sub.unsubscribe(),userId?request('unsubscribe',json,userId):Promise.resolve()]);
    const stoppedLocally=results[0].status==='fulfilled'&&results[0].value===true;
    const stoppedOnServer=Boolean(userId)&&results[1].status==='fulfilled';
    if(!stoppedLocally&&!stoppedOnServer)throw Error('Could not stop this device’s alerts. Turn off notifications in browser settings.');
  }
  clearMarker(browser);
  browser.navigator.serviceWorker.controller?.postMessage({type:'bodeeguard-notifications-stop'});
}
export function defaultNotificationLabel(browser=window) {
  const ua=browser.navigator.userAgent;
  return /iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android phone':/Windows/.test(ua)?/Edg\//.test(ua)?'Windows · Edge':/Chrome\//.test(ua)?'Windows · Chrome':'Windows browser':/Mac/.test(ua)?'Mac browser':'Parent device';
}
/** @param {{userId:string,browser?:Window,request?:typeof notificationRequest,onChange?:(value:any)=>void}} options */
export function createParentNotifications({userId,browser=window,request=notificationRequest,onChange=()=>{}}) {
  const nav=browser.navigator,ios=/iPhone|iPad|iPod/.test(nav.userAgent)||nav.platform==='MacIntel'&&nav.maxTouchPoints>1;
  const standalone=browser.matchMedia('(display-mode: standalone)').matches||nav.standalone;
  const supported=Boolean(browser.Notification&&browser.PushManager&&nav.serviceWorker&&(!ios||standalone));
  const desktopApp=Boolean(standalone&&!ios&&!/Android/.test(nav.userAgent));
  let reminder=null;try{reminder=JSON.parse(browser.localStorage.getItem(reminderKey)||'null');}catch{/* Optional reminder. */}
  let state={supported,desktopApp,ready:false,permission:browser.Notification?.permission||'default',setupDismissed:Boolean(reminder?.userId===userId&&reminder.until>Date.now()),enabled:false,busy:false,message:'',iosInstall:Boolean(ios&&!standalone),attention:'',devices:[],unread:[],deviceId:null};
  let publicKey=null,pending=false,disposed=false,lastCheck=0;
  const marker=()=>savedMarker(browser);
  const publish=value=>{state={...state,...value};if(!disposed)onChange(state);};
  const call=(operation,sub,details={})=>{if(disposed)throw Error('The parent account changed. Reopen notification settings.');return request(operation,sub,userId,details);};
  const saveMarker=(deviceId,renewed=Date.now())=>{if(disposed)return;try{browser.localStorage.setItem(markerKey,JSON.stringify({userId,deviceId,renewed}));}catch{/* Browser permission remains available. */}};
  function update(data) {
    publish({...('devices' in data?{devices:data.devices}:{}),...('unread' in data?{unread:data.unread}:{}),...('deviceId' in data?{deviceId:data.deviceId}: {})});
  }
  async function run(work) {
    if(pending||disposed)return;
    pending=true;publish({busy:true,message:''});
    try{await work();}catch(error){publish({message:error.message||'Please try again.',...(desktopApp?{attention:'Notification settings could not be confirmed. Open settings to check this computer.'}:{})});}
    finally{pending=false;publish({busy:false});}
  }
  function matchingKey(sub) {
    const expected=Uint8Array.from(browser.atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
    const actual=sub?.options?.applicationServerKey?new Uint8Array(sub.options.applicationServerKey):null;
    return {expected,matches:Boolean(actual&&actual.length===expected.length&&actual.every((v,i)=>v===expected[i]))};
  }
  async function status(sub) {
    const data=await call('status',sub?.toJSON());update(data);
    publicKey=data.supported&&/^[A-Za-z0-9_-]{87}$/.test(data.publicKey)?data.publicKey:null;
    publish({ready:Boolean(publicKey)});
    return data.devices?.find(item=>item.id===data.deviceId);
  }
  async function check(force=false) {
    if(browser.document.hidden||pending||disposed)return;
    if(supported){
      const stored=marker(),worker=await registration(browser),sub=await worker.pushManager.getSubscription();
      if(stored&&stored.userId!==userId){if(sub)await sub.unsubscribe();clearMarker(browser);publish({enabled:false,attention:''});return;}
      const permission=browser.Notification.permission,permitted=permission==='granted';
      publish({permission});
      if(stored&&!permitted)publish({enabled:false,attention:'Notifications are blocked. Allow alerts in your browser or device settings, then reconnect here.'});
      else if(stored&&!sub)publish({enabled:false,attention:'Notifications need attention. Reconnect this device to receive child messages.'});
      if(!force&&Date.now()-lastCheck<300000)return;lastCheck=Date.now();
      await run(async()=>{
        const device=await status(sub);
        if(!publicKey){publish({enabled:false,attention:stored?'Notification delivery is unavailable. Your messages are still saved.':'',message:'Message notifications are not available right now.'});return;}
        if(!stored){
          // Restore only an existing, permitted subscription that the server
          // confirms belongs to this signed-in parent. Never enroll on load.
          if(sub&&permitted&&device&&!device.revokedAt&&matchingKey(sub).matches){
            const result=await call('renew',sub.toJSON());update(result);saveMarker(result.deviceId);
            publish({enabled:true,attention:device.lastFailure==='permanent'||device.lastFailure==='exhausted'?'Recent alerts could not be delivered. Use Send test notification to check this device.':''});return;
          }
          if(sub&&(!device||device.revokedAt))await sub.unsubscribe();
          publish({enabled:false,attention:permission==='denied'&&desktopApp?'Notifications are blocked for this computer. Allow BodeeGuard in your browser settings, then reconnect here.':''});return;
        }
        if(!device||device.revokedAt){
          if(sub)await sub.unsubscribe();clearMarker(browser);
          publish({enabled:false,attention:device?.revokedReason==='remote'?'Alerts on this device were turned off remotely.':'This device’s notification registration expired. Enable alerts again.'});return;
        }
        if(!sub||!permitted)return;
        if(!matchingKey(sub).matches){publish({enabled:false,attention:'Notifications need attention. Reconnect this device after the service update.'});return;}
        publish({enabled:true,attention:device.lastFailure==='permanent'||device.lastFailure==='exhausted'?'Recent alerts could not be delivered. Use Send test notification to check this device.':''});
        saveMarker(device.id,stored.renewed);
        if(Date.now()-stored.renewed>=86400000){const result=await call('renew',sub.toJSON());update(result);saveMarker(result.deviceId);}
      });
    }else if(force||Date.now()-lastCheck>=300000){lastCheck=Date.now();await run(async()=>update(await call('unread')));}
  }
  return {
    state:()=>state,
    dismissSetup(){
      try{browser.localStorage.setItem(reminderKey,JSON.stringify({userId,until:Date.now()+7*86400000}));}catch{/* Optional reminder. */}
      publish({setupDismissed:true});
    },
    load:()=>check(true).catch(error=>publish({busy:false,message:error.message||'Reopen BodeeGuard and try again.',attention:marker()||desktopApp?'This device needs attention. Reopen notification settings to reconnect.':''})),
    renew:()=>check().catch(error=>publish({busy:false,message:error.message||'Reopen BodeeGuard and try again.',attention:marker()||desktopApp?'This device needs attention. Reopen notification settings to reconnect.':''})),
    enable(label=defaultNotificationLabel(browser)) {
      if(!supported||pending||disposed||!publicKey)return Promise.resolve();
      const permission=browser.Notification.requestPermission(); // Must be in the parent's click.
      return run(async()=>{
        const resultPermission=await permission;publish({permission:resultPermission});
        if(resultPermission!=='granted'){publish({message:'Allow BodeeGuard notifications in your browser or device settings to receive alerts.'});return;}
        const manager=(await registration(browser)).pushManager;let sub=await manager.getSubscription();
        if(sub&&(!state.enabled||marker()?.userId!==userId||!matchingKey(sub).matches)){await sub.unsubscribe();sub=null;}
        sub=sub||await manager.subscribe({userVisibleOnly:true,applicationServerKey:matchingKey(null).expected});
        const result=await call('subscribe',sub.toJSON(),{label});update(result);saveMarker(result.deviceId);
        publish({enabled:true,attention:'',message:'Message notifications are on for this device.'});
      });
    },
    disable(){this.dismissSetup();return run(async()=>{await stopParentPhoneNotifications({browser,userId,request});publish({enabled:false,attention:'',deviceId:null,message:'Message notifications are off for this device.'});try{update(await call('devices'));}catch{/* Local removal succeeded even while offline. */}});},
    revoke(deviceId){return run(async()=>{
      update(await call('revoke',null,{deviceId}));
      if(deviceId===state.deviceId){await stopParentPhoneNotifications({browser,userId,request});publish({enabled:false,deviceId:null,attention:''});}
      publish({message:'Alerts are off for that device. It cannot reconnect automatically.'});
    });},
    rename(deviceId,label){return run(async()=>{update(await call('rename',null,{deviceId,label}));publish({message:'Device name saved.'});});},
    test(){return run(async()=>{
      const sub=await(await registration(browser)).pushManager.getSubscription();
      if(!sub||marker()?.userId!==userId)throw Error('Enable notifications on this device first.');
      await call('test',sub.toJSON());publish({message:'Test accepted by the notification service. Check your device for the alert.'});
    });},
    async refreshUnread(){if(disposed||browser.document.hidden)return;update(await call('unread'));},
    async read(studentId,messageId){if(disposed||browser.document.hidden)return;const result=await call('read',null,{studentId,messageId});update(result);return result;},
    async view(studentId,viewId){
      // Presence cannot enroll a device or change another parent's registration.
      const stored=marker(),deviceId=state.deviceId||stored?.deviceId;
      if(!state.enabled||stored?.userId!==userId||!/^[a-f0-9]{64}$/.test(deviceId||'')||disposed&&studentId!==null)return false;
      // A queued final clear can finish after React disposes the old account.
      // The API still authenticates this captured account and its own device.
      await request('view',null,userId,{deviceId,viewId,studentId});return true;
    },
    dispose(){disposed=true;},
  };
}
