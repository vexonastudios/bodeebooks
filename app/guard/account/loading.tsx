import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import styles from "../portal.module.css";
import accountStyles from "./account.module.css";

export default function AccountLoading() {
  return (
    <div className={`${styles.portalPage} ${accountStyles.page}`}>
      <div className={accountStyles.shell}>
        <Link className={accountStyles.backLink} href="/guard/dashboard/" prefetch={false}>
          <ArrowLeft size={17} /> Back to dashboard
        </Link>
        <header className={accountStyles.header}>
          <span className={accountStyles.headerIcon}><ShieldCheck size={24} /></span>
          <div><h1>Parent account</h1><p>Getting your account ready.</p></div>
        </header>
        <section className={accountStyles.loadingPanel} role="status" aria-live="polite" aria-busy="true">
          <strong>Loading your account…</strong>
          <p>Your plan, computers and setup options will appear here.</p>
          <div className={accountStyles.loadingRows} aria-hidden="true"><span /><span /><span /></div>
        </section>
      </div>
    </div>
  );
}
