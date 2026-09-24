"use client";
import { useAuth } from "@clerk/nextjs";
import { Bell, BellOff, Send, X, Smartphone, Save, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createParentNotifications, defaultNotificationLabel, stopParentPhoneNotifications } from "./parent-notifications-client.js";
import styles from "./workspace.module.css";
import NotificationReply, { type NotificationDraft } from "./NotificationReply";
type Device={id:string;label:string;revokedAt:string|null;lastAcceptedAt:string|null;lastFailure:string|null};
type Unread={studentId:string;count:number;sequence:string};
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
export default function ParentNotifications() {
  const { userId,isLoaded }=useAuth(),previousUser=useRef<string|null>(null);
  const client=useRef<ReturnType<typeof createParentNotifications>|null>(null),dialog=useRef<HTMLDialogElement>(null);
  const [open,setOpen]=useState(false),[dismissed,setDismissed]=useState(''),[label,setLabel]=useState('This device');
  const [replies,setReplies]=useState<NotificationDraft[]>([]);
  const [state,setState]=useState({supported:false,enabled:false,busy:true,message:'',iosInstall:false,attention:'',devices:[] as Device[],unread:[] as Unread[],deviceId:null as string|null});
  useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
  useEffect(()=>{
    if(!isLoaded)return;
    if(previousUser.current&&!userId)void stopParentPhoneNotifications({userId:previousUser.current}).catch(()=>{});
    previousUser.current=userId||null;
  },[isLoaded,userId]);
  useEffect(()=>{
    if(!userId)return;
    setLabel(defaultNotificationLabel());
    const frame=()=>document.querySelector<HTMLIFrameElement>('iframe[title="BodeeGuard Parent Dashboard"]')?.contentWindow;
    const query = new URLSearchParams(location.search).get('conversation');
    let unread:Unread[]=[],pendingMessage:string|null=validId(query)?query:null,checkingUnread=false,checkAgain=false;
    const reading=new Set<string>();
    const sendUnread=()=>{
      frame()?.postMessage({type:'bodeeguard-unread',items:unread},location.origin);
      navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-notifications-unread',totalUnread:unread.reduce((sum,item)=>sum+item.count,0)});
    };
    const controller=createParentNotifications({userId,onChange:value=>{setState(value);if(value.unread!==unread){unread=value.unread;sendUnread();}}});client.current=controller;
    const refreshUnread=async()=>{
      if(checkingUnread){checkAgain=true;return;}checkingUnread=true;
      try{await controller.refreshUnread();}catch{/* Keep the last counts while offline. */}
      finally{checkingUnread=false;if(checkAgain){checkAgain=false;void refreshUnread();}}
    };
    const request=(event:MessageEvent)=>{
      if(event.origin!==location.origin||event.source!==frame())return;
      if(event.data?.type==='bodeeguard-messages-ready'){
        sendUnread();if(pendingMessage!==null)frame()?.postMessage({type:'bodeeguard-open-messages',studentId:pendingMessage},location.origin);
        navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-replies-resume',accountUserId:userId});
      }
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
      frame()?.postMessage({type:'bodeeguard-open-messages',studentId:pendingMessage},location.origin);
    };
    const visible=()=>{if(!document.hidden){void controller.renew().catch(()=>{});navigator.serviceWorker?.controller?.postMessage({type:'bodeeguard-replies-resume',accountUserId:userId});}};
    window.addEventListener('message',request);document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);
    navigator.serviceWorker?.addEventListener('message',notification);visible();
    return()=>{controller.dispose();client.current=null;window.removeEventListener('message',request);document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);navigator.serviceWorker?.removeEventListener('message',notification);};
  },[userId]);
  const openSettings=()=>{setOpen(true);void client.current?.load();};
  const reply = replies.find(item=>item.accountUserId===userId);
  return <>
    {reply&&<NotificationReply key={reply.replyId} draft={reply} done={()=>setReplies(items=>items.filter(item=>item.replyId!==reply.replyId))} />}
    {!open&&state.attention&&dismissed!==state.attention&&<aside className={styles.notificationWarning} role="status">
      <AlertTriangle size={20} aria-hidden="true"/><span>{state.attention}</span><button type="button" onClick={openSettings}>Review</button>
      <button type="button" aria-label="Dismiss notification reminder" onClick={()=>setDismissed(state.attention)}><X size={18}/></button>
    </aside>}
    {open&&<dialog ref={dialog} className={styles.installBackdrop} aria-labelledby="phone-notifications-title" onCancel={event=>{if(state.busy)event.preventDefault();else setOpen(false);}}>
      <section className={[styles.installCard,styles.notificationCard].join(' ')}>
        <div className={styles.notificationHeading}><Bell size={26} aria-hidden="true"/><h2 id="phone-notifications-title">Message notifications</h2></div>
        <p>Get desktop or phone alerts when your children send messages. Message contents stay off your lock screen.</p>
        <p className={styles.notificationHint}>Chrome and Edge on Windows can offer a quick reply in the alert. On other devices, tap the notification to open that child’s conversation. Replies require your parent sign-in.</p>
        {state.attention&&<p className={styles.notificationAttention} role="status">{state.attention}</p>}
        {state.iosInstall?<p>Add BodeeGuard to your Home Screen and open that icon to enable phone alerts.</p>:!state.supported?<p>Use Chrome or Edge on desktop, Chrome on Android, or the Home Screen app on iPhone for notifications.</p>:<>
          <p className={styles.notificationStatus}>{state.enabled?'On for this device':'Off for this device'}</p>
          {!state.enabled&&<label className={styles.notificationLabel}>Device name<input maxLength={60} value={label} onChange={event=>setLabel(event.target.value)} autoComplete="off"/></label>}
          <div className={styles.notificationActions}>
            <button type="button" disabled={state.busy} onClick={()=>void(state.enabled?client.current?.disable():client.current?.enable(label))}>
              {state.enabled?<BellOff size={18}/>:<Bell size={18}/>} {state.enabled?'Turn off':'Enable notifications'}
            </button>
            {state.enabled&&<button type="button" disabled={state.busy} onClick={()=>void client.current?.test()}><Send size={18}/>Send test notification</button>}
          </div>
        </>}
        <p role="status" aria-live="polite">{state.busy?'Updating notification settings…':state.message}</p>
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
