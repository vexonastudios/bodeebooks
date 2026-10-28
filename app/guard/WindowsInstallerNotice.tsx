import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import styles from "./windows-installer-notice.module.css";

export default function WindowsInstallerNotice() {
  return <aside className={styles.notice} role="note" aria-label="Windows installer notice">
    <AlertTriangle size={20} aria-hidden="true" />
    <div><strong>Early-access Windows download</strong><p>This release does not yet have a verified Windows publisher. Windows may show “Unknown publisher”, warn, or prevent installation. Download only from this official BodeeGuard site. If setup is blocked, <Link href="/feedback">get help</Link> and include the message Windows shows.</p></div>
  </aside>;
}
