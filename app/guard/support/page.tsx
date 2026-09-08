import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./support.module.css";

export const metadata = { title: "BodeeGuard support reports", robots: { index: false, follow: false } };
type Report = { id: string; receivedAt: string; component: string; code: string; version: string; osVersion: string; stage: string; windowsError: number; errorType: string; location: string };
export default async function Support({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const session = await auth();
  if (!session.isAuthenticated) redirect("/guard/sign-in?redirect_url=%2Fguard%2Fsupport%2F");
  const { reference = "" } = await searchParams;
  const token = await session.getToken();
  const api = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!api || !token) return <main className={styles.page}>Support reports are temporarily unavailable.</main>;
  let response: Response;
  try { response = await fetch(`${api}/v1/operator/diagnostics?reference=${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000)
  }); } catch { return <main className={styles.page}>Reports could not be loaded. Refresh to retry.</main>; }
  if ([401, 403].includes(response.status)) redirect("/guard/account/");
  if (!response.ok) return <main className={styles.page}>Reports could not be loaded. Check the reference or refresh.</main>;
  const { reports } = await response.json() as { reports: Report[] };
  return <main className={styles.page}>
    <Link href="/guard/account/">← Account</Link><h1>Support reports</h1>
    <p>Latest 100 reports · Last 30 days · Owner access</p>
    <form><label htmlFor="reference">Report reference</label><input id="reference" name="reference" defaultValue={reference} placeholder="BG-…" maxLength={40} /><button>Find reports</button><Link href="/guard/support/">Show latest</Link></form>
    {!reports.length && <p>No reports found.</p>}
    {reports.map(report => <article key={report.id}>
      <strong>BG-{report.id.replaceAll("-", "").slice(0, 12)}</strong>
      <span>{new Date(report.receivedAt).toISOString().replace("T", " ").slice(0, 19)} UTC</span>
      <h2>{report.code.replaceAll("_", " ")}</h2>
      <p>{report.component} · App {report.version} · Windows {report.osVersion}</p>
      <p>Stage: <code>{report.stage}</code>{report.windowsError ? ` · Windows error: ${report.windowsError}` : ""}{report.errorType !== "none" ? ` · ${report.errorType}` : ""}</p>
      {report.location !== "unknown" && <p><code>{report.location}</code></p>}
      <small>Client-reported diagnostic; account identity is not verified.</small>
    </article>)}
  </main>;
}
