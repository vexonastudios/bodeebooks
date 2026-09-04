import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleHelp, CreditCard, Download, ExternalLink, FileText, KeyRound, Laptop, Monitor, ReceiptText, RotateCcw, ShieldCheck, Trash2, UserRound, WalletCards, Wifi } from "lucide-react";
import { changeBodeeGuardReleaseChannel, openBodeeGuardBilling, removeBodeeGuardComputer, renameBodeeGuardComputer, resumeBodeeGuardSubscription, scheduleBodeeGuardCancellation, startBodeeGuardTrial, subscribeToBodeeGuard } from "../actions";
import SubmitButton from "../SubmitButton";
import { manageBodeeGuardBetaInvitation } from "../actions";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "BodeeGuard Parent Account" };

type BodeeGuardDevice = {
  id: string;
  deviceRole?: "parent" | "child";
  computerName: string;
  platform: string;
  appVersion: string;
  lastSeenAt: string;
  revokedAt: string | null;
  releaseChannel?: "beta" | "stable";
};

type BodeeGuardAccount = {
  releaseOperator?: boolean;
  billingMode: "stripe" | "complimentary";
  entitlementStatus: "inactive" | "trial" | "active" | "grace";
  releaseChannel: "beta" | "stable";
  release?: { version: string; notesUrl: string; downloadUrl: string } | null;
  deviceLimits?: { parent: number; child: number };
  enrollment?: {
    customerLaunchOpen: boolean;
    betaInvited: boolean;
    canChooseBeta: boolean;
    canStartTrial: boolean;
    canSubscribe: boolean;
    reason: string | null;
  };
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  trialEligible: boolean | null;
  billing: {
    available: boolean;
    trialEligible: boolean;
    plan: {
      name: string;
      amount: number;
      currency: string;
      interval: string;
      intervalCount: number;
    } | null;
    subscription: {
      status: string;
      trialEndsAt: string | null;
      currentPeriodEndsAt: string | null;
      cancelAtPeriodEnd: boolean;
    } | null;
    paymentMethod: {
      brand: string;
      last4: string;
      expMonth: number | null;
      expYear: number | null;
    } | null;
    invoices: Array<{
      number: string | null;
      status: string;
      amountPaid: number;
      amountDue: number;
      currency: string;
      createdAt: string | null;
      hostedInvoiceUrl: string | null;
      invoicePdfUrl: string | null;
    }>;
  } | null;
  devices: BodeeGuardDevice[];
};

function readableDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

function trialDaysRemaining(value: string | null) {
  if (!value) return null;
  const milliseconds = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(milliseconds)) return null;
  return Math.max(0, Math.ceil(milliseconds / (24 * 60 * 60 * 1000)));
}

function readableLastSeen(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function readableMoney(amount: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function readableCardBrand(value: string) {
  const brand = value.trim().toLowerCase();
  return brand === "amex" ? "American Express"
    : brand === "mastercard" ? "Mastercard"
      : brand === "visa" ? "Visa"
        : brand === "discover" ? "Discover"
          : brand.charAt(0).toUpperCase() + brand.slice(1);
}

function readableBillingStatus(value: string) {
  return value === "trialing" ? "Free trial"
    : value === "active" ? "Active"
      : value === "past_due" ? "Payment past due"
        : value === "unpaid" ? "Payment required"
          : value === "paused" ? "Paused"
            : value.replaceAll("_", " ");
}

function nonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parentDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return "Parent";

  const publicMetadata = user.publicMetadata as Record<string, unknown>;
  const unsafeMetadata = user.unsafeMetadata as Record<string, unknown>;
  const externalAccountName = user.externalAccounts
    .map(account => [account.firstName, account.lastName].map(nonEmptyText).filter(Boolean).join(" "))
    .find(Boolean);

  return [
    user.fullName,
    user.firstName,
    publicMetadata.displayName,
    publicMetadata.name,
    unsafeMetadata.displayName,
    unsafeMetadata.name,
    externalAccountName,
    user.username,
  ].map(nonEmptyText).find(Boolean) || "Parent";
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

export default async function GuardAccountPage({ searchParams }: { searchParams: Promise<{ billingError?: string; checkout?: string; computerRemoved?: string; computerRenamed?: string; download?: string; subscription?: string; trial?: string; channel?: string; invitation?: string }> }) {
  const session = await auth.protect();
  const user = await currentUser();
  const name = parentDisplayName(user);
  const token = await session.getToken();
  const account = token ? await loadBodeeGuardAccount(token) : null;
  const params = await searchParams;
  if (!account) return (
    <div className={styles.portalPage}><div className={`container ${styles.narrowShell}`}>
      <section className={styles.activationCard}><ShieldCheck size={29} /><h1>Welcome, {name}.</h1>
        <p>You are signed in. We cannot load your family account right now, so we cannot confirm your subscription or connected computers.</p>
        <p>Your existing family data is preserved. Please refresh in a moment or <Link href="/feedback">contact support</Link> if this continues.</p>
        <Link className={styles.portalButton} href="/guard/account/">Try again</Link>
      </section></div></div>
  );
  const customerLaunchOpen = Boolean(account.enrollment?.customerLaunchOpen);
  const isComplimentary = account?.billingMode === "complimentary";
  const isTrial = account?.entitlementStatus === "trial";
  const isSubscribed = account && account.entitlementStatus !== "inactive";
  const canConnectComputers = Boolean(isComplimentary || isSubscribed);
  const activeDevices = account?.devices.filter(device => !device.revokedAt) || [];
  const parentDevices = activeDevices.filter(device => device.deviceRole !== "child");
  const childDevices = activeDevices.filter(device => device.deviceRole === "child");
  const billing = account?.billing || null;
  const trialEligible = account.trialEligible === true;
  const paidSubscription = billing?.subscription || null;
  const paymentMethod = billing?.paymentMethod || null;
  const invoices = billing?.invoices || [];
  const cancellationScheduled = Boolean(isSubscribed && !isTrial && (paidSubscription?.cancelAtPeriodEnd ?? account?.cancelAtPeriodEnd ?? false));
  const billingPeriodEnd = paidSubscription?.currentPeriodEndsAt || account?.currentPeriodEndsAt || null;
  const trialEnd = paidSubscription?.trialEndsAt || account?.trialEndsAt || null;
  const remainingTrialDays = isTrial ? trialDaysRemaining(trialEnd) : null;
  const installerAvailable = Boolean(canConnectComputers && account.release);
  const canStartTrial = account.enrollment?.canStartTrial === true;
  const canSubscribe = account.enrollment?.canSubscribe === true;
  const channelLabel = account.releaseChannel === "beta" ? (isComplimentary ? "Family Beta" : "Beta") : "Stable";
  const statusLabel = isComplimentary ? "Complimentary Family Beta"
    : account?.entitlementStatus === "trial" ? "Free trial active"
    : account?.entitlementStatus === "active" ? "Subscription active"
      : account?.entitlementStatus === "grace" ? "Payment needs attention"
        : canStartTrial || canSubscribe
          ? canStartTrial ? "Ready for your 30-day trial" : "Ready to subscribe"
          : "Parent account ready · No billing";
  const statusDate = account?.entitlementStatus === "trial" ? readableDate(trialEnd)
    : account?.entitlementStatus === "grace" ? readableDate(account.graceEndsAt)
      : readableDate(billingPeriodEnd);

  return (
    <div className={styles.portalPage}>
      <div className={`container ${styles.portalShell}`}>
        <header className={styles.portalHeader}>
          <div><span><ShieldCheck size={15} /> BodeeGuard account</span><h1>Welcome, {name}.</h1><p>Sign in once here to manage your family. Child computers install from your home network and do not need a Bodee Books or Clerk sign-in.</p></div>
        </header>
        {(params.billingError || params.checkout || params.channel || params.computerRemoved === "1" || params.computerRenamed === "1" || params.subscription || params.trial === "started") && (
          <aside className={params.billingError ? styles.errorNotice : styles.successNotice} role="status">
            {params.billingError
              || (params.trial === "started" ? "Your 30-day BodeeGuard trial has started. No card was requested or stored, and the trial will end without a charge."
                : params.checkout === "success" ? "You returned from checkout. Your confirmed subscription status is shown below; if payment is still processing, refresh in a moment."
                : params.checkout === "canceled" ? "You left checkout. No new subscription was confirmed here. You can return whenever you are ready."
                : params.channel === "beta" ? "Beta updates selected. Your connected computers will switch when they next check in."
                : params.channel === "stable" ? "Stable updates selected. Computers already running a newer Beta will keep it until Stable catches up; they will not be downgraded."
                : params.subscription === "canceled" ? `Cancellation scheduled. Your family keeps full access${billingPeriodEnd ? ` through ${readableDate(billingPeriodEnd)}` : " through the paid period"}.`
                  : params.subscription === "resumed" ? "Your BodeeGuard subscription will continue normally."
                    : params.computerRenamed === "1" ? "That computer now has its new family-friendly name."
                      : "That computer has been removed from your family account.")}
          </aside>
        )}
        {params.download && (
          <aside className={styles.errorNotice} role="status">
            {params.download === "access"
              ? "A BodeeGuard trial or subscription must be active before downloading the Windows installer."
              : "The Windows installer is not available on this account's release channel yet. Nothing was installed; please try again after the next BodeeGuard release."}
          </aside>
        )}
        <div className={styles.portalGrid}>
          <section className={`${styles.portalCard} ${styles.billingCard}`}>
            <div className={styles.cardIcon}><CreditCard size={22} /></div>
            <span className={styles.statusPill}>{statusLabel}</span>
            <h2>BodeeGuard Family</h2>
            {isComplimentary ? (
              <>
                <p><strong>No subscription charge.</strong> Your family uses the complete licensed system on the Family Beta channel so activation, device controls, and new releases can be tested during real school days before customer promotion.</p>
                <div className={styles.complimentaryNote}><ShieldCheck size={16} /> Full access · Beta updates · No billing required</div>
              </>
            ) : isTrial ? (
              <p><strong>Your complete trial is active with no card on file.</strong> {remainingTrialDays === null ? "Your trial remains active" : remainingTrialDays === 0 ? "The trial ends today" : `${remainingTrialDays} ${remainingTrialDays === 1 ? "day" : "days"} left`}; use BodeeGuard through {readableDate(trialEnd) || "the trial end date"}. It ends without a charge; subscribe afterward only if your family chooses to continue.</p>
            ) : isSubscribed ? (
              <p><strong>Your family subscription is active.</strong> {account.entitlementStatus === "grace" ? "A payment needs attention. Please review billing below before the grace period ends." : cancellationScheduled ? "Renewal is canceled. Your family keeps access through the end date shown below." : "Your plan renews monthly. You can manage payments or cancel the next renewal below."}</p>
            ) : account.trialEligible === null ? (
              <p>We are checking your billing history. Please refresh shortly; we will not start another trial or subscription until your account status is confirmed.</p>
            ) : (
              customerLaunchOpen || canStartTrial || canSubscribe || account?.hasBillingAccount ? (
                trialEligible ? (
                  <p><strong>30 days completely free with no card required.</strong> Protect up to 2 parent/admin computers and 10 child computers. When the trial ends, you decide whether to subscribe for $19.99 per month.</p>
                ) : (
                  <p><strong>$19.99 per month.</strong> A free trial is no longer available for this account. Subscribe when you are ready to continue, with up to 2 parent/admin computers and 10 child computers.</p>
                )
              ) : (
                <p><strong>Your parent account is ready and free.</strong> Family trials will open when the Windows installer is ready. The 30-day trial requires no card and ends without a charge.</p>
              )
            )}
            {!isComplimentary && statusDate && <p className={styles.statusDate}><CalendarClock size={15} /> {cancellationScheduled ? "Access ends" : account?.entitlementStatus === "trial" ? "Trial ends" : "Current period ends"} {statusDate}{isTrial && remainingTrialDays !== null ? ` · ${remainingTrialDays} ${remainingTrialDays === 1 ? "day" : "days"} left` : ""}</p>}
            {!isComplimentary && isTrial ? (
              <div className={styles.complimentaryNote}><ShieldCheck size={16} /> No payment method · No automatic charge · Trial ends {readableDate(trialEnd) || "after 30 days"}</div>
            ) : !isComplimentary && (isSubscribed || paidSubscription) ? (
              <form action={openBodeeGuardBilling}><button className={styles.portalButton} type="submit">Manage billing <ArrowRight size={16} /></button></form>
            ) : !isComplimentary && (canStartTrial || canSubscribe) ? (
              <>
                <form action={canStartTrial ? startBodeeGuardTrial : subscribeToBodeeGuard}><SubmitButton className={styles.portalButton} pendingLabel={canStartTrial ? "Starting your trial…" : "Opening secure checkout…"}>{canStartTrial ? "Start 30-day trial — no card" : "Subscribe for $19.99/month"} <ArrowRight size={16} /></SubmitButton></form>
                {trialEligible && <p className={styles.downloadHint}><ShieldCheck size={14} /> No trial code, checkout, or payment information is needed. The trial simply ends after 30 days unless you later choose to subscribe.</p>}
              </>
            ) : !isComplimentary ? (
              <div className={styles.launchHold}><ShieldCheck size={16} /><span><strong>No payment is needed yet.</strong> {account.enrollment?.reason || "Your account will show the trial button here when family enrollment opens."}</span></div>
            ) : null}
          </section>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><Laptop size={22} /></div>
            <span className={styles.stepPill}>First computer</span>
            <h2>{canConnectComputers ? "Install the parent computer" : "Your next setup step"}</h2>
            {canConnectComputers ? (
              <>
                <p>Download BodeeGuard here once and install it on the Windows computer that will manage your family.</p>
                {installerAvailable ? (
                  <a className={styles.portalButton} href="/guard/download/windows"><Download size={17} /> Download for Windows</a>
                ) : (
                  <span className={styles.portalButtonUnavailable} aria-disabled="true"><CalendarClock size={17} /> {channelLabel} installer being prepared</span>
                )}
                <p className={styles.downloadHint}><ShieldCheck size={14} /> {installerAvailable ? "Only the parent computer needs this website sign-in." : "This download will turn on automatically when the verified installer is published."}</p>
              </>
            ) : (
              <p>{canStartTrial ? "Start your 30-day trial here first. Then install and pair the parent computer once; use its home-network installer for the children." : canSubscribe ? "Choose Subscribe to restore your family access. Your current installations and local records do not need to be replaced." : "Your trial clock has not started. This page will guide you through setup when your installer and family enrollment are ready."}</p>
            )}
          </section>
          <section className={styles.portalCard}>
            <div className={styles.cardIcon}><UserRound size={22} /></div>
            <h2>Parent identity</h2>
            <p className={styles.identity}>{user?.primaryEmailAddress?.emailAddress || "Signed in with Clerk"}</p>
            <p>Your sign-in stays with Clerk. BodeeGuard child computers never receive or store this password.</p>
          </section>
        </div>
        <section className={styles.setupSection}>
          <div className={styles.sectionHeadingRow}><div><span className={styles.kicker}><ShieldCheck size={15} /> Software updates</span>
            <h2>{channelLabel} updates{account.release ? ` · Version ${account.release.version}` : ""}</h2>
            <p>{isComplimentary ? "Your family receives new versions first and tests the same account activation and device controls as other families. Your access remains complimentary."
              : account.releaseChannel === "beta" ? "Your family has chosen early updates. Beta versions may have issues that are still being tested; you can return to Stable below. Your trial dates and subscription price stay the same."
                : "Stable is the recommended channel for school days. Your family receives updates after Beta testing and a separate release approval."}</p>
            {account.release && <Link className={styles.stepAction} href={account.release.notesUrl} target="_blank" rel="noreferrer">What changed in {account.release.version} <ExternalLink size={14} /></Link>}
          </div></div>
          {!isComplimentary && account.releaseChannel === "beta" && <form action={changeBodeeGuardReleaseChannel}>
            <input type="hidden" name="channel" value="stable" /><p className={styles.channelExplanation}>Returning to Stable stops future Beta updates. A newer installed Beta stays in place until Stable catches up; your data is preserved.</p>
            <SubmitButton className={styles.secondaryPortalButton}>Return to Stable updates</SubmitButton>
          </form>}
          {!isComplimentary && account.releaseChannel === "stable" && account.enrollment?.betaInvited && (
            account.enrollment.canChooseBeta ? <form action={changeBodeeGuardReleaseChannel} className={styles.betaChoice}>
              <input type="hidden" name="channel" value="beta" />
              <label><input type="checkbox" name="betaConsent" required /> I want my family to receive early Beta updates and understand they may contain unfinished fixes.</label>
              <SubmitButton className={styles.secondaryPortalButton}>Join invited Family Beta</SubmitButton>
            </form> : <p className={styles.channelExplanation}>Your family is invited to Beta. Enrollment will appear here when the installer for invited families is ready. Your trial has not started just by receiving an invitation.</p>
          )}
          {!isComplimentary && !account.enrollment?.betaInvited && <p className={styles.channelExplanation}>Beta testing is by invitation. <Link href="/feedback">Contact us</Link> if your family would like to help test new versions.</p>}
        </section>
        <section className={styles.billingSection}>
          <div className={styles.sectionHeadingRow}>
            <div>
              <span className={styles.kicker}><ReceiptText size={15} /> Subscription & billing</span>
              <h2>{isComplimentary ? "Your complimentary family access" : "Your BodeeGuard plan"}</h2>
              <p>{isComplimentary ? "This household is an internal, activation-enabled Family Beta account and will never be sent to Stripe." : "Review your plan, next billing date, payment method, receipts, and cancellation status in one place."}</p>
            </div>
            {!isComplimentary && account?.hasBillingAccount && !isTrial && (
              <form action={openBodeeGuardBilling}>
                <button className={styles.secondaryPortalButton} type="submit"><WalletCards size={16} /> Secure billing portal</button>
              </form>
            )}
          </div>

          {!isComplimentary && account?.hasBillingAccount && billing?.available === false && (
            <div className={styles.billingWarning}><AlertTriangle size={18} /><span><strong>Live billing details are temporarily unavailable.</strong> Your BodeeGuard access and family computers are unaffected. Use the secure billing portal or refresh this page shortly.</span></div>
          )}

          <div className={styles.billingSummaryGrid}>
            <div className={styles.billingMetric}>
              <span>Plan</span>
              <strong>{isComplimentary ? "BodeeGuard Family Beta" : billing?.plan?.name || "BodeeGuard Family"}</strong>
              <small>{isComplimentary ? "$0 · Complimentary" : `${readableMoney(billing?.plan?.amount ?? 1999, billing?.plan?.currency || "usd")} / ${billing?.plan?.interval || "month"}`}</small>
            </div>
            <div className={styles.billingMetric}>
              <span>Status</span>
              <strong>{isComplimentary ? "Full access" : paidSubscription ? readableBillingStatus(paidSubscription.status) : isSubscribed ? statusLabel : "Not subscribed"}</strong>
              <small>{cancellationScheduled ? "Cancellation scheduled" : isComplimentary ? "No expiration or renewal charge" : isTrial ? remainingTrialDays === null ? "Trial active · no card or automatic renewal" : `${remainingTrialDays} ${remainingTrialDays === 1 ? "day" : "days"} remaining · no card or automatic renewal` : account.entitlementStatus === "grace" ? "Review payment before the grace period ends" : isSubscribed ? "Renews automatically unless canceled" : account.trialEligible === null ? "Billing history temporarily unavailable" : canStartTrial ? "One 30-day card-free trial is available" : canSubscribe ? "Choose a paid subscription to continue" : account.enrollment?.reason || "Enrollment is being prepared"}</small>
            </div>
            <div className={styles.billingMetric}>
              <span>{cancellationScheduled ? "Access through" : isTrial ? "Trial access ends" : !isSubscribed && billingPeriodEnd ? "Previous access ended" : "Next billing date"}</span>
              <strong>{isComplimentary ? "No billing date" : readableDate(isTrial ? trialEnd : billingPeriodEnd) || "Not scheduled"}</strong>
              <small>{isComplimentary ? "This account is never charged" : isTrial ? "Nothing is charged on this date" : cancellationScheduled ? "No additional renewal charge" : "Billing is processed securely by Stripe"}</small>
            </div>
            <div className={styles.billingMetric}>
              <span>Payment method</span>
              <strong>{isComplimentary || isTrial ? "None required" : paymentMethod ? `${readableCardBrand(paymentMethod.brand)} •••• ${paymentMethod.last4}` : account?.hasBillingAccount ? "Not available" : "Not collected"}</strong>
              <small>{paymentMethod?.expMonth && paymentMethod?.expYear ? `Expires ${String(paymentMethod.expMonth).padStart(2, "0")}/${paymentMethod.expYear}` : isComplimentary ? "No Stripe customer exists" : isTrial ? "No card is stored for this trial" : "Add or update securely through Stripe"}</small>
            </div>
          </div>

          {!isComplimentary && cancellationScheduled && (
            <div className={styles.cancellationBanner}>
              <CalendarClock size={20} />
              <div><strong>Your subscription is set to end{billingPeriodEnd ? ` on ${readableDate(billingPeriodEnd)}` : " after the current paid period"}.</strong><p>Your family keeps full access until then. You can keep BodeeGuard by resuming before that date.</p></div>
              <form action={resumeBodeeGuardSubscription}><SubmitButton className={styles.resumeButton}><RotateCcw size={15} /> Keep my subscription</SubmitButton></form>
            </div>
          )}

          {!isComplimentary && isSubscribed && !isTrial && !cancellationScheduled && (
            <details className={styles.cancelPanel}>
              <summary>Need to cancel BodeeGuard?</summary>
              <div><p>Cancellation stops the next renewal. Your children keep full access through {readableDate(billingPeriodEnd) || "the end of the current billing period"}; BodeeGuard will not shut off immediately. Your local family records are preserved after access ends.</p><form action={scheduleBodeeGuardCancellation}><SubmitButton className={styles.cancelButton} pendingLabel="Scheduling cancellation…">Cancel at the end of my billing period</SubmitButton></form></div>
            </details>
          )}

          <div className={styles.paymentHistory}>
            <div className={styles.paymentHeading}><div><FileText size={18} /><span><strong>Payment history</strong><small>Stripe receipts and downloadable invoices</small></span></div>{!isComplimentary && !isTrial && account?.hasBillingAccount && <form action={openBodeeGuardBilling}><SubmitButton>View all in Stripe <ExternalLink size={13} /></SubmitButton></form>}</div>
            {isComplimentary ? (
              <div className={styles.emptyPayments}><ShieldCheck size={18} /><span>No payments will appear here because this is a permanently complimentary Family Beta account.</span></div>
            ) : invoices.length ? (
              <div className={styles.invoiceList}>
                {invoices.map((invoice, index) => (
                  <article className={styles.invoiceRow} key={`${invoice.number || "invoice"}-${invoice.createdAt || index}`}>
                    <div><strong>{invoice.number || "BodeeGuard invoice"}</strong><span>{readableDate(invoice.createdAt)} · {invoice.status.replaceAll("_", " ")}</span></div>
                    <strong>{readableMoney(invoice.amountPaid || invoice.amountDue, invoice.currency)}</strong>
                    <div className={styles.invoiceActions}>
                      {invoice.hostedInvoiceUrl && <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">Receipt <ExternalLink size={12} /></a>}
                      {invoice.invoicePdfUrl && <a href={invoice.invoicePdfUrl} target="_blank" rel="noreferrer">PDF <Download size={12} /></a>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyPayments}><CheckCircle2 size={18} /><span>{isTrial ? "No payment is due. The trial ends without a charge; subscribe afterward only if you choose to continue." : "No completed BodeeGuard payments are on this account yet."}</span></div>
            )}
          </div>

          <div className={styles.billingHelp}><CircleHelp size={18} /><span><strong>Billing question?</strong> Trial families provide no card. If you later subscribe, payment details are handled by Stripe and BodeeGuard never stores your full card number. For account help, <Link href="/feedback">contact us through Feedback</Link>.</span></div>
        </section>
        {canConnectComputers && (
          <section className={styles.setupSection}>
            <div className={styles.setupHeading}>
              <span className={styles.kicker}><Wifi size={15} /> Simple home setup</span>
              <h2>One parent sign-in. Then use your home network.</h2>
              <p>Do not sign in to bodeebooks.com on every child computer. Install and approve the parent computer first; it securely supplies BodeeGuard to the rest of the family over your LAN.</p>
            </div>
            <ol className={styles.setupSteps}>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>1</span>
                <div><strong>Pair the parent computer</strong><p>Open BodeeGuard there, choose <b>Settings → BodeeGuard Account</b>, and approve the short code it shows.</p><Link className={styles.stepAction} href="/guard/activate"><KeyRound size={15} /> Enter pairing code</Link></div>
              </li>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>2</span>
                <div><strong>Open the local installer on each child</strong><p>Keep the parent computer awake with BodeeGuard running. Connect every computer to the same home network, then open:</p><code className={styles.lanAddress}>http://bodeeguard.local:3737/install</code><p>If that address does not open, use the alternative local address shown in the parent dashboard. Guest Wi-Fi may block connections between computers.</p></div>
              </li>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>3</span>
                <div><strong>Choose Kid Computer</strong><p>Run the downloaded installer, select <b>Kid Computer</b>, and use Auto-Scan to find the parent. No website account or parent password is entered on the child.</p></div>
              </li>
            </ol>
          </section>
        )}
        <section className={styles.computersSection}>
          <div className={styles.computersHeading}>
            <div><span className={styles.kicker}><Monitor size={15} /> Household computers</span><h2>{activeDevices.length ? `${parentDevices.length} of ${account.deviceLimits?.parent || 2} parent · ${childDevices.length} of ${account.deviceLimits?.child || 10} child computers` : "No computers connected yet"}</h2><p className={styles.channelExplanation}>This list shows account activation and update check-ins. See live school activity in your local parent dashboard. Removing a computer does not cancel your subscription.</p></div>
            {canConnectComputers && <Link className={styles.secondaryPortalButton} href="/guard/activate">Approve pairing code</Link>}
          </div>
          {activeDevices.length ? (
            <div className={styles.computerList}>
              {activeDevices.map(device => (
                <article className={styles.computerRow} key={device.id}>
                  <div className={styles.computerIcon}>{device.deviceRole === "child" ? <Laptop size={20} /> : <Monitor size={20} />}</div>
                  <div><strong>{device.computerName || "BodeeGuard computer"}<small className={styles.deviceRole}>{device.deviceRole === "child" ? "Child" : "Parent / admin"}</small></strong><span>{device.platform} · BodeeGuard {device.appVersion || "version unavailable"} · {device.releaseChannel === "beta" ? "Beta" : "Stable"} · Last check-in {readableLastSeen(device.lastSeenAt)}</span></div>
                  <div className={styles.computerActions}>
                    <form className={styles.renameComputer} action={renameBodeeGuardComputer}>
                      <input type="hidden" name="deviceId" value={device.id} />
                      <label className={styles.visuallyHidden} htmlFor={`computer-name-${device.id}`}>Family name for {device.computerName || "this computer"}</label>
                      <input id={`computer-name-${device.id}`} name="computerName" defaultValue={device.computerName || ""} maxLength={80} required />
                      <button type="submit">Save name</button>
                    </form>
                    <details className={styles.removeComputer}>
                      <summary><Trash2 size={14} /> Remove…</summary>
                      <div><p>This computer will lose BodeeGuard access and must be deliberately paired again.</p><form action={removeBodeeGuardComputer}><input type="hidden" name="deviceId" value={device.id} /><button className={styles.removeButton} type="submit">Yes, remove computer</button></form></div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyComputers}><CheckCircle2 size={21} /><span>{canConnectComputers ? installerAvailable ? "Begin with the Windows download and the three setup steps above. The parent computer appears after its code is approved; child computers then enroll through it over your home network." : "Your account is ready. The first parent computer will appear here after your installer is available, installed, and paired." : "Connected-computer controls will appear here after your BodeeGuard access is active. No parent password is ever copied to a child computer."}</span></div>
          )}
        </section>
        {account.releaseOperator && <section className={styles.setupSection}>
          <span className={styles.kicker}><ShieldCheck size={15} /> Owner-only release controls</span>
          <h2>Invite a family to Beta</h2>
          <p>Ask the parent to create and verify their BodeeGuard account first. Invite that email below, then send them the account-page link. This saves an invitation; it does not send an email, start their trial, charge them, or make their account permanently free.</p>
          <p>The parent must choose Beta themselves. They can start their 30-day card-free trial only when a verified customer-capable Beta installer is available.</p>
          {params.invitation && <p role="status" className={styles.channelExplanation}>{params.invitation === "saved" ? "Invitation saved. Tell this parent to open bodeebooks.com/guard/account/ and look under Software updates." : "Invitation removed. Existing Beta participation is unchanged; the parent can select Stable to stop future Beta updates."}</p>}
          <form action={manageBodeeGuardBetaInvitation} className={styles.betaInvitationForm}>
            <label>Verified parent email<input type="email" name="email" required maxLength={254} placeholder="parent@example.com" /></label>
            <label>Action<select name="operation"><option value="invite">Invite to Beta</option><option value="remove-invitation">Remove invitation</option></select></label>
            <SubmitButton className={styles.secondaryPortalButton} pendingLabel="Saving invitation…">Save Beta invitation</SubmitButton>
          </form>
        </section>}
      </div>
    </div>
  );
}
