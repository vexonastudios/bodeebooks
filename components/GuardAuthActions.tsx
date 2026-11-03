import { ArrowRight, LogIn } from "lucide-react";
import { GUARD_ORIGIN } from "@/shared/guard-domain";
import styles from "@/app/guard/guard.module.css";

export default function GuardAuthActions() {
  return (
    <div className={styles.authActions}>
      <a className={styles.primaryButton} href={`${GUARD_ORIGIN}/sign-up/`}>
        Create parent account <ArrowRight size={17} />
      </a>
      <a className={styles.secondaryButton} href={`${GUARD_ORIGIN}/account/`}>
        <LogIn size={17} /> Parent sign in
      </a>
      <span className={styles.accountNote}>Creating an account is free. Your free trial includes at least 30 days, requires no card and creates no automatic charge; subscribe afterward only if you choose.</span>
    </div>
  );
}
