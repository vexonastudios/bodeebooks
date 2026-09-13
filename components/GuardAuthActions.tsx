"use client";

import { Show, UserButton, useClerk, useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { stopParentPhoneNotifications } from "@/app/guard/dashboard/parent-notifications-client.js";
import Link from "next/link";
import { ArrowRight, LogIn, LogOut } from "lucide-react";
import styles from "@/app/guard/guard.module.css";

export default function GuardAuthActions() {
  const {signOut}=useClerk(),{userId}=useAuth();
  const [error,setError]=useState(''),[leaving,setLeaving]=useState(false);
  async function leave(){
    if(leaving)return;setLeaving(true);setError('');
    try{await stopParentPhoneNotifications({userId:userId||undefined});await signOut({redirectUrl:'/guard/sign-in/'});}
    catch{setError('Could not finish turning off phone alerts. Try again, or turn off BodeeGuard notifications in browser settings before signing out.');setLeaving(false);}
  }
  return (
    <div className={styles.authActions}>
      <Show when="signed-out">
        <Link className={styles.primaryButton} href="/guard/sign-up">
          Create parent account <ArrowRight size={17} />
        </Link>
        <Link className={styles.secondaryButton} href="/guard/sign-in">
          <LogIn size={17} /> Parent sign in
        </Link>
        <span className={styles.accountNote}>Creating an account is free. The 30-day trial requires no card and creates no automatic charge; subscribe afterward only if you choose.</span>
      </Show>
      <Show when="signed-in">
        <Link className={styles.primaryButton} href="/guard/account">
          Open parent account <ArrowRight size={17} />
        </Link>
        <UserButton appearance={{elements:{userButtonPopoverActionButton__signOut:{display:'none'}}}}>
          <UserButton.MenuItems><UserButton.Action label="Sign out of BodeeGuard" labelIcon={<LogOut size={16}/>} onClick={()=>void leave()}/></UserButton.MenuItems>
        </UserButton>
        {leaving&&<span role="status">Turning off this device’s alerts and signing out…</span>}
        {error&&<span role="alert">{error}</span>}
      </Show>
    </div>
  );
}
