"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import styles from "@/app/guard/guard.module.css";

export default function GuardAuthActions() {
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
        <UserButton />
      </Show>
    </div>
  );
}
