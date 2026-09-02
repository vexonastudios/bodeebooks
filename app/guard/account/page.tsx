import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CreditCard, Laptop, Monitor, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { openBodeeGuardBilling, removeBodeeGuardComputer, startBodeeGuardTrial } from "../actions";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "BodeeGuard Parent Account" };

type BodeeGuardDevice = {
  id: string;
  computerName: string;
  platform: string;
  appVersion: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

type BodeeGuardAccount = {
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  devices: BodeeGuardDevice[];
};

function readableDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

function readableLastSeen(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

async function loadBodeeGuardAccount(token: string): Promise<BodeeGuardAccount | null> {
  const apiBase = process.env.BODEEGUARD_COMMERCIAL_API_URL?.replace(/\/$/, "");
  if (!apiBase) return null;
  try {
    const response = await fetch(`${apiBase}/v1/account`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json() as BodeeGuardAccount;
  } catch {
    return null;
  }
}

export default async function GuardAccountPage({ searchParams }: { searchParams: Promise<{ billingError?: string; checkout?: string; computerRemoved?: string }> }) {
  const session = await auth.protect();
  const user = await currentUser();
  const name = user?.firstName || user?.fullName || "Parent";
  const token = await session.getToken();
  const account = token ? await loadBodeeGuardAccount(token) : null;
  const params = await searchParams;
  const isSubscribed = account && account.entitlementStatus !== "inactive";
  const activeDevices = account?.devices.filter(device => !device.revokedAt) || [];
  const statusLabel = account?.entitlementStatus === "trial" ? "Free trial active"
    : account?.entitlementStatus === "active" ? "Subscription active"
      : account?.entitlementStatus === "grace" ? "Payment needs attention"
        : "Ready for your free trial";
  const statusDate = account?.entitlementStatus === "trial" ? readableDate(account.trialEndsAt)
    : account?.entitlementStatus === "grace" ? readableDate(account.graceEndsAt)
      : readableDate(account?.currentPeriodEndsAt || null);

  return (
    <div className={styles.portalPage}>
      <div className={`container ${styles.portalShell}`}>
        <header className={styles.portalHeader}>
          <div><span><ShieldCheck size={15} /> BodeeGuard account</span><h1>Welcome, {name}.</h1><p>This parent account will own your family subscription and approve every protected computer.</p></div>
        </header>
        {(params.billingError || params.checkout === "success" || params.computerRemoved === "1") && (
          <aside className={params.billingError ? styles.errorNotice : styles.successNotice} role="status">
            {params.billingError || (params.checkout === "success" ? "Your BodeeGuard subscription is connected. Stripe may take a few seconds to update the status below." : "That computer has been removed from your family account.")}
          </aside>
        )}
        <div className={styles.portalGrid}>
          <section className={`${styles.portalCard} ${styles.billingCard}`}>
            <div className={styles.cardIcon}><CreditCard size={22} /></div>
            <span className={styles.statusPill}>{statusLabel}</span>
            <h2>BodeeGuard Family</h2>
            <p><strong>$19.99 per month</strong> after a 14-day free trial. Protect up to 2 parent/admin computers and 10 child computers.</p>
            {statusDate && <p className={styles.statusDate}><CalendarClock size={15} /> {account?.cancelAtPeriodEnd ? "Access ends" : account?.entitlementStatus === "trial" ? "Trial ends" : "Current period ends"} {statusDate}</p>}
            {isSubscribed || account?.hasBillingAccount ? (
              <form action={openBodeeGuardBilling}><button className={styles.portalButton} type="submit">Manage billing <ArrowRight size={16} /></button></form>
            ) : (
              <form action={startBodeeGuardTrial}><button className={styles.portalButton} type="submit">Start 14-day free trial <ArrowRight size={16} /></button></form>
            )}
          </section>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><Laptop size={22} /></div>
            <h2>Connect a computer</h2>
            <p>Open BodeeGuard on the computer, choose <strong>Settings → BodeeGuard Account</strong>, and enter the short code it displays.</p>
            <Link className={styles.portalButton} href="/guard/activate">Enter pairing code <ArrowRight size={16} /></Link>
          </section>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><UserRound size={22} /></div>
            <h2>Parent identity</h2>
            <p className={styles.identity}>{user?.primaryEmailAddress?.emailAddress || "Signed in with Clerk"}</p>
            <p>Your sign-in stays with Clerk. BodeeGuard child computers never receive or store this password.</p>
          </section>
        </div>
        <section className={styles.computersSection}>
          <div className={styles.computersHeading}>
            <div><span className={styles.kicker}><Monitor size={15} /> Household computers</span><h2>{activeDevices.length ? `${activeDevices.length} connected` : "No computers connected yet"}</h2></div>
            <Link className={styles.secondaryPortalButton} href="/guard/activate">Connect a computer</Link>
          </div>
          {activeDevices.length ? (
            <div className={styles.computerList}>
              {activeDevices.map(device => (
                <article className={styles.computerRow} key={device.id}>
                  <div className={styles.computerIcon}><Monitor size={20} /></div>
                  <div><strong>{device.computerName || "BodeeGuard computer"}</strong><span>{device.platform} · BodeeGuard {device.appVersion || "version unavailable"} · Last seen {readableLastSeen(device.lastSeenAt)}</span></div>
                  <form action={removeBodeeGuardComputer}>
                    <input type="hidden" name="deviceId" value={device.id} />
                    <button className={styles.removeButton} type="submit" aria-label={`Remove ${device.computerName || "computer"}`}><Trash2 size={15} /> Remove</button>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyComputers}><CheckCircle2 size={21} /><span>Install BodeeGuard on a Windows computer, then approve its short pairing code here. Parent passwords are never copied to child computers.</span></div>
          )}
        </section>
        {!account && <aside className={styles.notice}><strong>Your secure parent account is ready.</strong><span>The live subscription service is temporarily unavailable. You can still sign in; billing and computer status will appear automatically when it reconnects.</span></aside>}
      </div>
    </div>
  );
}
