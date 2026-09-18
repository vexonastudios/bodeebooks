"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { useGuardSignOut } from './GuardSignOut';
import Link from "next/link";
import { ArrowRight, Clock3, LogIn, LogOut } from "lucide-react";
import styles from "@/app/guard/guard.module.css";

export default function GuardAuthActions() {
  const {leave,error,leaving}=useGuardSignOut();
  return (
    <div className={styles.authActions}>
      <Show when="signed-out">
        <span className={styles.comingSoonButton}>
          <Clock3 size={17} /> Parent accounts coming soon
        </span>
        <Link className={styles.secondaryButton} href="/guard/sign-in">
          <LogIn size={17} /> Parent sign in
        </Link>
        <span className={styles.accountNote}>BodeeGuard is in private family testing. New parent registration and the public Windows download are not open yet.</span>
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
