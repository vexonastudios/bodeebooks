"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import styles from "@/app/guard/guard.module.css";

export default function GuardAuthActions() {
  return (
    <div className={styles.authActions}>
      <Show when="signed-out">
        <SignUpButton mode="modal" fallbackRedirectUrl="/guard/account">
          <button className={styles.primaryButton} type="button">
            Create parent account <ArrowRight size={17} />
          </button>
        </SignUpButton>
        <SignInButton mode="modal" fallbackRedirectUrl="/guard/account">
          <button className={styles.secondaryButton} type="button">
            <LogIn size={17} /> Parent sign in
          </button>
        </SignInButton>
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
