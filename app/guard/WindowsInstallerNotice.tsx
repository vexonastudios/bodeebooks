import { Info } from "lucide-react";
import Link from "next/link";
import styles from "./windows-installer-notice.module.css";

export default function WindowsInstallerNotice() {
  return <aside className={styles.notice} role="note" aria-label="Windows installer notice">
    <Info size={18} aria-hidden="true" />
    <div>
      <p>If Windows says “Windows protected your PC” when you open the installer from this site, choose <strong>More info</strong>, then <strong>Run anyway</strong> if offered. <Link href="/feedback">Get installation help</Link></p>
      <details><summary>Why does Windows show a warning?</summary><p>This installer does not yet have a verified Windows publisher. Use the download from BodeeGuard’s official site.</p></details>
    </div>
  </aside>;
}
