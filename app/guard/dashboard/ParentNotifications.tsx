"use client";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, Send, X, Smartphone, Save, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createParentNotifications, defaultNotificationLabel, stopParentPhoneNotifications } from "./parent-notifications-client.js";
import { createConversationPresence } from "./conversation-presence.js";
import styles from "./workspace.module.css";
import NotificationReply, { type NotificationDraft } from "./NotificationReply";
type Device={id:string;label:string;messagePreview?:boolean;revokedAt:string|null;lastAcceptedAt:string|null;lastFailure:string|null};
type Unread={studentId:string;count:number;sequence:string};
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
export default function ParentNotifications() {
  const { userId,isLoaded }=useAuth(),previousUser=useRef<string|null>(null);
  const client=useRef<ReturnType<typeof createParentNotifications>|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const [open,setOpen]=useState(false),[dismissed,setDismissed]=useState(''),[label,setLabel]=useState('This device');
  const [replies,setReplies]=useState<NotificationDraft[]>([]);
  const [state,setState]=useState({supported:false,desktopApp:false,windows:false,ready:false,permission:'default',setupDismissed:false,enabled:false,busy:true,message:'',iosInstall:false,attention:'',devices:[] as Device[],unread:[] as Unread[],deviceId:null as string|null});
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  useEffect(()=>{
    if(!isLoaded)return;
    if(previousUser.current&&!userId)void stopParentPhoneNotifications({userId:previousUser.current}).catch(()=>{});
    previousUser.current=userId||null;
  },[isLoaded,userId]);
  useEffect(()=>{
    if(!userId)return;
    void Promise.resolve().then(()=>setLabel(defaultNotificationLabel()));
    const frame=()=>document.querySelector<HTMLIFrameElement>('iframe[title="BodeeGuard Parent Dashboard"]')?.contentWindow;
    const query = new URLSearchParams(location.search).get('conversation');
    let unread:Unread[]=[],pendingMessage:string|null=validId(query)?query:null,checkingUnread=false,checkAgain=false;
    const reading=new Set<string>();
    const sendUnread=()=>{
      frame()?.postMessage({type:'bodeeguard-unread',items:unread},location.origin);
      navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-notifications-unread',totalUnread:unread.reduce((sum,item)=>sum+item.count,0)});
    };
    let notificationEnabled=false,lastView=0;
    const askView=()=>frame()?.postMessage({type:'bodeeguard-conversation-view-request'},location.origin);
    const controller=createParentNotifications({userId,onChange:value=>{
      setState(value);if(value.unread!==unread){unread=value.unread;sendUnread();}
      if(value.enabled!==notificationEnabled){notificationEnabled=value.enabled;presence?.refresh();askView();}
    }});client.current=controller;
    const presence=createConversationPresence({
      send:(studentId,viewId)=>{askView();return controller.view(studentId,viewId);},
      isVisible:()=>!document.hidden&&document.hasFocus()&&Date.now()-lastView<25000
    });
    const refreshUnread=async()=>{
      if(checkingUnread){checkAgain=true;return;}checkingUnread=true;
      try{await controller.refreshUnread();}catch{/* Keep the last counts while offline. */}
      finally{checkingUnread=false;if(checkAgain){checkAgain=false;void refreshUnread();}}
    };
    const request=(event:MessageEvent)=>{
      if(event.origin!==location.origin||event.source!==frame())return;
      if(event.data?.type==='bodeeguard-messages-ready'){
        askView();sendUnread();if(pendingMessage!==null)frame()?.postMessage({type:'bodeeguard-open-messages',studentId:pendingMessage},location.origin);
        navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-replies-resume',accountUserId:userId});
      }
      if(event.data?.type==='bodeeguard-conversation-view'&&(event.data.studentId===null||validId(event.data.studentId))){lastView=Date.now();presence?.set(event.data.studentId);}
      if(event.data?.type==='bodeeguard-message-opened')pendingMessage=null;
      if(event.data?.type==='bodeeguard-message-hint')void refreshUnread();
      if(event.data?.type==='bodeeguard-conversation-read'&&validId(event.data.studentId)&&validId(event.data.messageId)&&!document.hidden){
        const key=event.data.studentId+event.data.messageId;if(reading.has(key))return;reading.add(key);
        void controller.read(event.data.studentId,event.data.messageId).then(result=>{
          if(result)navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-conversation-read',studentId:result.studentId,throughSequence:result.throughSequence,totalUnread:result.unread.reduce((sum:number,item:Unread)=>sum+item.count,0)});
        }).catch(()=>reading.delete(key));
      }
      if(event.data?.type==='bodeeguard-phone-notifications'){setOpen(true);void controller.load();}
    };
    const notification=(event:MessageEvent)=>{
      if(event.source!==navigator.serviceWorker?.controller)return;
      if(event.data?.type==='bodeeguard-message-hint'){void refreshUnread();return;}
      if(event.data?.type==='bodeeguard-reply-draft'){
        const draft=event.data.draft;
        if(draft?.accountUserId===userId&&validId(draft.studentId)&&validId(draft.replyId)&&Number.isFinite(draft.createdAt)&&Date.now()-draft.createdAt<86400000&&typeof draft.pendingReply==='string'&&draft.pendingReply.length<=10000){
          setReplies(items=>items.some(item=>item.replyId===draft.replyId)?items:[...items,draft]);
        }
        return;
      }
      if(event.data?.type==='bodeeguard-notifications-attention'){void controller.load();return;}
      if(event.data?.type!=='bodeeguard-open-messages')return;
      pendingMessage=validId(event.data.studentId)?event.data.studentId:'';
      // A warm notification must survive reauthentication just like a cold launch.
      const destination = new URL(window.location.href);
      if (pendingMessage) destination.searchParams.set('conversation', pendingMessage);
      else destination.searchParams.delete('conversation');
      destination.hash = 'messages' + (pendingMessage ? '/' + pendingMessage : '');
      window.history.replaceState(window.history.state, '', destination.pathname + destination.search + destination.hash);
      frame()?.postMessage({type:'bodeeguard-open-messages',studentId:pendingMessage},location.origin);
    };
    const visible=()=>{presence?.refresh();if(!document.hidden){askView();void controller.renew().catch(()=>{});navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-replies-resume',accountUserId:userId});}};
    const hidden=()=>presence?.set(null);
    const blur=()=>presence?.refresh();
    window.addEventListener('message',request);document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);
    window.addEventListener('focus',visible);window.addEventListener('blur',blur);
    window.addEventListener('pagehide',hidden);window.addEventListener('pageshow',visible);
    navigator.serviceWorker?.addEventListener('message',notification);visible();
    return()=>{presence?.dispose();controller.dispose();client.current=null;window.removeEventListener('message',request);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);window.removeEventListener('focus',visible);window.removeEventListener('blur',blur);window.removeEventListener('pagehide',hidden);window.removeEventListener('pageshow',visible);navigator.serviceWorker?.removeEventListener('message',notification);};
  },[userId]);
  const openSettings=()=>{setOpen(true);void client.current?.load();};
  const enableHere=()=>void client.current?.enable(label).then(()=>setOpen(true));
  const suggestSetup=state.desktopApp&&state.supported&&state.ready&&!state.enabled&&!state.busy&&!state.setupDismissed&&state.permission!=='denied'&&!state.attention;
  const reply = replies.find(item=>item.accountUserId===userId);
  return <>
    {reply&&<NotificationReply key={reply.replyId} draft={reply} done={()=>setReplies(items=>items.filter(item=>item.replyId!==reply.replyId))} />}
    {!open&&suggestSetup&&<aside className={styles.notificationSetup} aria-label="Desktop message notifications">
      <Bell size={22} aria-hidden="true"/><div><strong>Get alerts from your kids</strong><span>Enable message notifications on this computer.</span></div>
      <button type="button" onClick={enableHere}>Enable notifications</button>
      <button type="button" onClick={()=>client.current?.dismissSetup()}>Not now</button>
    </aside>}
    {!open&&state.attention&&dismissed!==state.attention&&<aside className={styles.notificationWarning} role="status">
      <AlertTriangle size={20} aria-hidden="true"/><span>{state.attention}</span><button type="button" onClick={openSettings}>Review</button>
      <button type="button" aria-label="Dismiss notification reminder" onClick={()=>setDismissed(state.attention)}><X size={18}/></button>
    </aside>}
    {open&&<dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="phone-notifications-title" onCancel={event=>{if(state.busy)event.preventDefault();else setOpen(false);}}>
      <section className={[styles.installCard,styles.notificationCard].join(' ')}>
        <div className={styles.notificationHeading}><Bell size={26} aria-hidden="true"/><h2 id="phone-notifications-title">Message notifications</h2></div>
        <p>Get desktop or phone alerts when your children send messages. Choose whether alerts show your child’s name and a message preview.</p>
        {state.desktopApp&&<p className={styles.notificationHint}>Installing BodeeGuard and enabling alerts are separate steps. This computer needs its own notification permission, even if alerts already work on your phone.</p>}
        <p className={styles.notificationHint}>Chrome and Edge on Windows can offer a quick reply in the alert. On other devices, tap the notification to open that child’s conversation. Replies require your parent sign-in. Test alerts have no reply button.</p>
        {state.attention&&<p className={styles.notificationAttention} role="status">{state.attention}</p>}
        {state.iosInstall?<p>Add BodeeGuard to your Home Screen and open that icon to enable phone alerts.</p>:!state.supported?<p>Use Chrome or Edge on desktop, Chrome on Android, or the Home Screen app on iPhone for notifications.</p>:<>
          <p className={styles.notificationStatus}>{state.enabled?'On for this device':'Off for this device'}</p>
          {!state.enabled&&<label className={styles.notificationLabel}>Device name<input maxLength={60} value={label} onChange={event=>setLabel(event.target.value)} autoComplete="off"/></label>}
          {state.enabled&&<label className={styles.notificationPreview}>
            <input type="checkbox" checked={state.devices.find(device=>device.id===state.deviceId)?.messagePreview===true} disabled={state.busy} onChange={event=>void client.current?.setPreview(event.target.checked)}/>
            <span>Show child name and message preview<small>For this device. Names and message text may also appear on its lock screen.</small></span>
          </label>}
          <div className={styles.notificationActions}>
            <button type="button" disabled={state.busy||!state.enabled&&!state.ready} onClick={()=>void(state.enabled?client.current?.disable():client.current?.enable(label))}>
              {state.enabled?<BellOff size={18}/>:<Bell size={18}/>} {state.enabled?'Turn off':'Enable notifications'}
            </button>
            {state.enabled&&<button type="button" disabled={state.busy} onClick={()=>void client.current?.test()}><Send size={18}/>Send test notification</button>}
          </div>
        </>}
        <p role="status" aria-live="polite">{state.busy?'Updating notification settings…':state.message}</p>
        {state.windows&&<section className={styles.notificationWindows} aria-label="Windows notification settings">
          <strong>No alert after sending a test?</strong>
          <a className={styles.notificationSettingsLink} href="ms-settings:notifications">Open Windows notification settings</a>
          <p className={styles.notificationHint}>Turn on Notifications at the top of that page. Then allow notification banners for BodeeGuard or the browser that installed it, and turn off Do not disturb.</p>
          <p className={styles.notificationHint}>If the shortcut does not open, go to Windows Settings → System → Notifications.</p>
        </section>}
        {state.desktopApp&&<details className={styles.installSteps}>
          <summary>If the test alert does not appear</summary>
          <p>Allow notifications for guard.bodeebooks.com in the browser that installed this app. In Windows Settings → System → Notifications, allow BodeeGuard or that browser and turn off Do not disturb.</p>
          <p>Keep BodeeGuard open or minimized while checking. Alerts while the app is closed depend on your browser’s background settings.</p>
          <a href="https://support.microsoft.com/en-us/windows/experience/notifications-and-do-not-disturb-in-windows" target="_blank" rel="noopener noreferrer">Windows notification help</a>
        </details>}
        <h3 className={styles.notificationSubheading}><Smartphone size={18}/>Your notification devices</h3>
        <p className={styles.notificationHint}>Turn off an old or lost device here. This list is for your parent account.</p>
        <div className={styles.notificationDevices}>
          {state.devices.filter(device=>!device.revokedAt).map(device=><form key={device.id} className={styles.notificationDevice} onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void client.current?.rename(device.id,String(data.get('label')||''));}}>
            <label className={styles.notificationLabel}>{device.id===state.deviceId?'This device':'Device name'}<input name="label" defaultValue={device.label} maxLength={60} required aria-label={'Name for '+device.label}/></label>
            <small>{device.lastFailure?'Recent delivery needs attention':device.lastAcceptedAt?'Last alert accepted '+new Date(device.lastAcceptedAt).toLocaleString():'No alert accepted yet'}</small>
            <div className={styles.notificationActions}><button type="submit" disabled={state.busy}><Save size={16}/>Save name</button><button type="button" disabled={state.busy} onClick={()=>void client.current?.revoke(device.id)}><BellOff size={16}/>Turn off device</button></div>
          </form>)}
          {!state.devices.some(device=>!device.revokedAt)&&<p>No notification devices connected to your account.</p>}
        </div>
        <p className={styles.notificationHint}>Service acceptance does not confirm the device displayed an alert. Focus, silent mode and browser or device settings control presentation.</p>
        <button type="button" disabled={state.busy} onClick={()=>setOpen(false)}><X size={18}/>Close</button>
      </section>
    </dialog>}
  </>;
}
