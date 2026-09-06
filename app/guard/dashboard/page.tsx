import type { Metadata } from "next";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BookOpen, LayoutDashboard, Monitor, Settings, Users } from "lucide-react";
import { cloudApi, type CloudDashboard } from "./cloud-api";
import { addCloudStudent, saveCloudSubjects } from "./actions";
import LiveComputers from "./LiveComputers";
import SubmitButton from "../SubmitButton";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "BodeeGuard Family Dashboard", robots: { index: false, follow: false } };

export default async function FamilyDashboard({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const session = await auth();
  if (!session.isAuthenticated) redirect("/guard/sign-in?redirect_url=%2Fguard%2Fdashboard%2F");
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  let snapshot: CloudDashboard | null = null;
  let error = "";
  try { snapshot = await cloudApi<CloudDashboard>(); }
  catch (failure) { error = failure instanceof Error ? failure.message : "Cloud management is not available yet."; }
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      {/* Existing BodeeGuard identity, shared with the Windows application. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Link href="/guard/account" className={styles.brand}><img src="/bodeeguard-logo.png" width="48" height="48" alt="" /><span>BodeeGuard<small>Family dashboard</small></span></Link>
      <nav aria-label="Family dashboard"><a href="#overview"><LayoutDashboard size={19} />Overview</a><a href="#computers"><Monitor size={19} />Computers</a><a href="#students"><Users size={19} />Students</a><a href="#school"><BookOpen size={19} />School</a><Link href="/guard/account"><Settings size={19} />Account & billing</Link></nav>
      <p>PRIVATE CLOUD BETA</p>
    </aside>
    <main className={styles.main} id="overview">
      <header className={styles.header}><div><p className={styles.eyebrow}>YOUR FAMILY, CONNECTED</p><h1>{user?.firstName ? `${user.firstName}’s family dashboard` : "Your family dashboard"}</h1></div><Link className={styles.secondary} href="/guard/activate">Approve a computer</Link></header>
      <p className={styles.intro}>Manage your children’s cloud-connected computers from here. The parent dashboard does not need to stay open.</p>
      <div className={styles.warning}>Private migration preview. Existing LAN computers and their records are unchanged. The isolated Electron test app is not yet the protected child installer. Messages, uploaded media, grading, games, printing, and history import are not connected to this dashboard yet.</div>
      {(error || params.error) && <p className={styles.warning} role="alert">{error || params.error}</p>}
      {params.saved && <p className={styles.notice} role="status">Saved. Computer changes take effect when the child’s app connects and confirms them.</p>}
      {snapshot ? <>
        <section id="computers" className={styles.section}><h2>Family computers</h2><p>Updates every 30 seconds while this page is visible. “Not connected” refers to BodeeGuard’s cloud connection, not necessarily the child’s Wi-Fi.</p><LiveComputers key={snapshot.serverTime} initial={snapshot} /></section>
        <section id="students" className={styles.section}><h2>Students</h2><div className={styles.chips}>{snapshot.students.map(student => <span key={student.id}>{student.name}{student.grade ? ` · ${student.grade}` : ""}</span>)}</div>
          <form action={addCloudStudent} className={styles.inlineForm}><label>Child’s first name or nickname<input name="name" required maxLength={80} /></label><label>Grade (optional)<input name="grade" maxLength={30} /></label><SubmitButton className={styles.button} pendingLabel="Adding…">Add child</SubmitButton></form>
        </section>
        <section id="school" className={styles.section}><h2>School links</h2><p>These parent-approved school websites are shared with your cloud-connected child computers. No curriculum passwords are uploaded here.</p>
          <form action={saveCloudSubjects}><input type="hidden" name="revision" value={snapshot.rules.revision} />
            {snapshot.rules.subjects.map(subject => <div className={styles.subjectRow} key={subject.id}><input type="hidden" name="subjectId" value={subject.id} /><label>Subject<input name="subjectTitle" required defaultValue={subject.title} maxLength={80} /></label><label>School website<input name="subjectUrl" type="url" required defaultValue={subject.url} /></label><label className={styles.checkbox}><input type="checkbox" name="removeSubject" value={subject.id} />Remove</label></div>)}
            <div className={styles.subjectRow}><label>New subject<input name="newTitle" placeholder="Abeka Academy" maxLength={80} /></label><label>School website<input name="newUrl" type="url" placeholder="https://…" /></label></div>
            <SubmitButton className={styles.button} pendingLabel="Saving…">Save school links</SubmitButton>
          </form>
        </section>
      </> : <Link className={styles.button} href="/guard/account">Back to parent account</Link>}
    </main>
  </div>;
}
