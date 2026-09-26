"use client";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { ArrowDownToLine, Download, FolderOpen, Keyboard, RotateCcw } from "lucide-react";
import styles from "./portal.module.css";
type Props = { href:string; label:string; version?:string; expiresAt?:string|null; secondary?:boolean };
export default function InstallerDownload({href,label,version,expiresAt,secondary=false}:Props) {
  const id=useId();
  const [requested,setRequested]=useState(false);
  const [cooldown,setCooldown]=useState(false);
  const [expired,setExpired]=useState(false);
  const retryTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pendingClick=useRef(false);
  useEffect(()=>()=>{if(retryTimer.current)clearTimeout(retryTimer.current);},[]);
  useEffect(()=>{
    if(!expiresAt)return;
    const timer=setTimeout(()=>setExpired(true),Math.max(0,Date.parse(expiresAt)-Date.now()));
    return()=>clearTimeout(timer);
  },[expiresAt]);
  function start(event:MouseEvent<HTMLAnchorElement>){
    if(expired || (expiresAt && Date.parse(expiresAt)<=Date.now())){event.preventDefault();setExpired(true);return;}
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
    if(pendingClick.current){event.preventDefault();return;}
    // Leave the actual attachment transfer with the browser. Native downloads
    // expose no page-level byte/completion signal; never invent a progress bar.
    pendingClick.current=true;setRequested(true);setCooldown(true);
    retryTimer.current=setTimeout(()=>{pendingClick.current=false;setCooldown(false);},5000);
  }
  return <div className={styles.installerDownload}>
    <a className={secondary?styles.secondaryPortalButton:styles.portalButton} href={href} rel="noreferrer" onClick={start} aria-disabled={cooldown||expired} aria-describedby={requested||expired?id:undefined}>
      {requested&&!cooldown&&!expired?<RotateCcw size={18}/>:<Download size={18}/>}
      {expired?"Refresh download above":cooldown?"Download requested":requested?"Try download again":label}
    </a>
    {(requested||expired)&&<div id={id} className={styles.downloadFeedback} role="status" aria-live="polite" aria-atomic="true">
      <div className={styles.downloadFeedbackHeading}><ArrowDownToLine size={24}/><div><strong>{requested?"Download requested":"This download link expired"}</strong>{version&&<span>BodeeGuard for Windows · Version {version}</span>}</div></div>
      {requested&&<>
        <p>Look for <strong>Downloads ↓</strong> at the top of your browser to see progress or a download notice.</p>
        <div className={styles.downloadShortcut}><Keyboard size={19}/><span>In Chrome or Edge on Windows, press <kbd>Ctrl</kbd> + <kbd>J</kbd> to see your downloads.</span></div>
        <p className={styles.downloadNext}><FolderOpen size={19}/><span>When it finishes, open the <strong>BodeeGuard installer (.exe)</strong> from Downloads to begin setup.</span></p>
        {!expired&&<p className={styles.downloadRetryHelp}>Nothing in Downloads? Check for a blocked-download notice before trying again.</p>}
      </>}
      {expired&&<p>{requested?"An existing download can continue. To request another copy,":"To get a fresh link,"} choose <strong>Get download</strong> above. You do not need another copy if the file is already in Downloads.</p>}
    </div>}
  </div>;
}
