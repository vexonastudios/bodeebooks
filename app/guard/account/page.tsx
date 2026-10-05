import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { cookies } from "next/headers";
import ChildSetup from "./ChildSetup";
import InstallerShareLink from "./InstallerShareLink";
import InstallerDownload from "../InstallerDownload";
import PlanControls, {type AiAllowance} from "./PlanControls";
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, CalendarClock, CheckCircle2, CircleHelp, CreditCard, Download, ExternalLink, FileText, KeyRound, Laptop, Monitor, RotateCcw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { cloudAccountRelease, internalPilotRelease, type GuardAccountRelease } from "../../../shared/guard-cloud-release";
import { changeBodeeGuardReleaseChannel, openBodeeGuardBilling, removeBodeeGuardComputer, renameBodeeGuardComputer, resumeBodeeGuardSubscription, scheduleBodeeGuardCancellation, startBodeeGuardTrial, subscribeToBodeeGuard } from "../actions";
import SubmitButton from "../SubmitButton";
import { manageBodeeGuardBetaInvitation } from "../actions";
import styles from "../portal.module.css";
import accountStyles from "./account.module.css";
import AccountRetry from "../AccountRetry";
import GuardSignOut from "@/components/GuardSignOut";

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
  release?: GuardAccountRelease | null;
  deviceLimits?: { parent: number; child: number };
  familyPlan?: {canChange:boolean};
  aiAllowance?: AiAllowance|null;
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
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return await response.json() as BodeeGuardAccount;
  } catch {
    return null;
  }
}

export default async function GuardAccountPage({ searchParams }: { searchParams: Promise<{ billingError?: string; checkout?: string; computerRemoved?: string; computerRenamed?: string; download?: string; subscription?: string; trial?: string; channel?: string; invitation?: string; setup?: string }> }) {
  const session = await auth.protect();
  const user = await currentUser();
  const name = parentDisplayName(user);
  const token = await session.getToken();
  const account = token ? await loadBodeeGuardAccount(token) : null;
  const params = await searchParams;
  const setupCollapsed = (await cookies()).get("bg_child_setup_collapsed")?.value === "1";
  if (!account) return (
    <div className={styles.portalPage}><div className={`container ${styles.narrowShell}`}>
      <section className={styles.activationCard}><ShieldCheck size={29} /><h1>Let’s reconnect.</h1>
        <p>Your family account is temporarily unavailable. Please try again in a moment.</p>
        <AccountRetry className={styles.portalButton} />
      </section></div></div>
  );
  const customerLaunchOpen = Boolean(account.enrollment?.customerLaunchOpen);
  const isComplimentary = account?.billingMode === "complimentary";
  const isTrial = account?.entitlementStatus === "trial";
  const isSubscribed = account && account.entitlementStatus !== "inactive";
  const canConnectComputers = Boolean(isComplimentary || isSubscribed);
  const activeDevices = account?.devices.filter(device => !device.revokedAt) || [];
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
  const release = cloudAccountRelease(account) || internalPilotRelease(account, process.env.BODEEGUARD_INTERNAL_PILOT_INSTALLER_VERSION);
  const installerAvailable = Boolean(canConnectComputers && release);
  const canStartTrial = account.enrollment?.canStartTrial === true && Boolean(release);
  const canSubscribe = account.enrollment?.canSubscribe === true && Boolean(release);
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


  const computerLimit = account.deviceLimits?.child || 10;
  const planSummary = isComplimentary ? "Complimentary" : isTrial ? "Free trial" : isSubscribed ? "Family plan" : "Not active";
  const billingNeedsAttention = !isComplimentary && (account.entitlementStatus === "inactive" || account.entitlementStatus === "grace" || cancellationScheduled || (account.hasBillingAccount && billing?.available === false) || Boolean(params.billingError || params.checkout || params.subscription || params.trial));

  return (
    <div className={`${styles.portalPage} ${accountStyles.page}`}>
      <div className={accountStyles.shell}>
        <Link className={accountStyles.backLink} href="/guard/dashboard/"><ArrowLeft size={17} /> Back to dashboard</Link>
        <header className={accountStyles.header}>
          <span className={accountStyles.headerIcon}><ShieldCheck size={24} /></span>
          <div><h1>Parent account</h1><p>Welcome, {name}.</p></div>
          <span className={`${accountStyles.accessBadge} ${account.entitlementStatus === "grace" ? accountStyles.attentionBadge : ""}`}>{isComplimentary ? "Family Beta" : isTrial ? "Free trial" : isSubscribed ? "Active" : "Account ready"}</span>
        </header>
        {(params.billingError || params.checkout || params.channel || params.computerRemoved === "1" || params.computerRenamed === "1" || params.subscription || params.trial === "started") && (
          <aside className={params.billingError ? styles.errorNotice : styles.successNotice} role="status">
            {params.billingError
              || (params.trial === "started" ? "Your 30-day trial has started. No card or automatic charge."
                : params.checkout === "success" ? "Returned from checkout. Check Plan & billing for your confirmed status."
                : params.checkout === "canceled" ? "Checkout canceled. No new subscription was confirmed."
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
              : "The cloud student installer is not released on your account’s channel yet. Nothing was downloaded or installed. This page will offer it after release approval."}
          </aside>
        )}

        {!isComplimentary && account.entitlementStatus === "grace" && <aside className={styles.errorNotice} role="status"><strong>Payment needs attention.</strong> Review Plan & billing{statusDate ? ` before ${statusDate}` : ""} to keep family access.</aside>}
        {!isComplimentary && isTrial && <p className={accountStyles.trialNotice}><CalendarClock size={16} /> Trial ends {readableDate(trialEnd) || "after 30 days"} · No automatic charge</p>}
        <nav className={accountStyles.quickActions} aria-label="Account shortcuts">
          <Link className={accountStyles.dashboardAction} href="/guard/dashboard/" aria-label="Open family dashboard"><Monitor size={23} /><span><strong>Open dashboard</strong><small>Manage your family</small></span><ArrowRight size={18} /></Link>
          <Link className={accountStyles.setupAction} href={canConnectComputers ? "/guard/account/?setup=connect#child-setup" : "/guard/dashboard/?setup=1"}><Laptop size={23} /><span><strong>{canConnectComputers ? "Add a computer" : "Set up your family"}</strong><small>{canConnectComputers ? "Install & approve its code" : "Children, school & activities"}</small></span><ArrowRight size={18} /></Link>
        </nav>
        <dl className={accountStyles.snapshot} aria-label="Family account summary">
          <div><dt><CreditCard size={15} /> Plan</dt><dd>{planSummary}</dd></div>
          <div><dt><Laptop size={15} /> Computers</dt><dd>{childDevices.length} <span>/ {computerLimit}</span></dd></div>
          <div><dt><Download size={15} /> Child app</dt><dd>{release ? release.version : "Coming soon"}</dd></div>
        </dl>
        <div className={accountStyles.sections}>
          <details id="account-billing" className={accountStyles.section} open={billingNeedsAttention}>
            <summary className={accountStyles.sectionSummary}><span className={accountStyles.sectionIcon}><CreditCard size={20} /></span><span className={accountStyles.sectionLabel}><strong>Plan & billing</strong><small>{isComplimentary ? "Full access · No subscription charge" : statusLabel}</small></span><ChevronDown className={accountStyles.chevron} size={18} /></summary>
            <div className={accountStyles.panelBody}>
              {isComplimentary ? <p className={styles.complimentaryNote}><ShieldCheck size={16} /> Full family access. No subscription charge.</p> : <>
                <h2>BodeeGuard Family</h2>
                {isTrial ? <p>Your trial is active{remainingTrialDays === null ? "" : ` · ${remainingTrialDays} days left`}. It ends without a charge.</p>
                  : isSubscribed ? <p><strong>Your family subscription is active.</strong> {cancellationScheduled ? "Renewal is canceled; access continues through the date below." : account.entitlementStatus === "grace" ? "Please review your payment." : "Manage payments or renewal below."}</p>
                  : account.trialEligible === null ? <p>Billing history is temporarily unavailable. Refresh before starting a trial or subscription.</p>
                  : (customerLaunchOpen || canStartTrial || canSubscribe || account.hasBillingAccount) ? <p>{trialEligible ? "Try 30 days free. No card required." : "$19.99 per month. Subscribe to continue."}</p>
                  : <p>{account.enrollment?.reason || "Family enrollment is being prepared."}</p>}
                {!isComplimentary && statusDate && <p className={styles.statusDate}><CalendarClock size={15} /> {cancellationScheduled ? "Access ends" : isTrial ? "Trial ends" : "Current period ends"} {statusDate}</p>}
                {isTrial ? <p className={styles.complimentaryNote}><ShieldCheck size={16} /> No automatic charge · No card required</p>
                  : (isSubscribed || paidSubscription) ? <form action={openBodeeGuardBilling}><SubmitButton className={styles.portalButton}>Manage billing <ArrowRight size={16} /></SubmitButton></form>
                  : (canStartTrial || canSubscribe) ? <form action={canStartTrial ? startBodeeGuardTrial : subscribeToBodeeGuard}><SubmitButton className={styles.portalButton} pendingLabel={canStartTrial ? "Starting your trial…" : "Opening secure checkout…"}>{canStartTrial ? "Start 30-day trial — no card" : "Subscribe for $19.99/month"} <ArrowRight size={16} /></SubmitButton></form>
                  : <p className={styles.launchHold}><ShieldCheck size={16} /> No payment is needed yet.</p>}
          {!isComplimentary && account?.hasBillingAccount && billing?.available === false && (
            <div className={styles.billingWarning}><AlertTriangle size={18} /><span><strong>Live billing details are temporarily unavailable.</strong> Your BodeeGuard access and family computers are unaffected. Use Manage billing or refresh this page.</span></div>
          )}

          <div className={`${styles.billingSummaryGrid} ${accountStyles.billingMetrics}`}>
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

          <div className={styles.billingHelp}><CircleHelp size={18} /><span><strong>Billing question?</strong> Payment details stay with Stripe. For help, <Link href="/feedback">contact us through Feedback</Link>.</span></div>
              </>}
            </div>
          </details>
          <details id="account-computers" className={accountStyles.section} open={params.computerRemoved === "1" || params.computerRenamed === "1"}>
            <summary className={accountStyles.sectionSummary}><span className={accountStyles.sectionIcon}><Laptop size={20} /></span><span className={accountStyles.sectionLabel}><strong>Child computers</strong><small>{childDevices.length} connected · Names & device access</small></span><ChevronDown className={accountStyles.chevron} size={18} /></summary>
            <div className={accountStyles.panelBody}>
          <div className={styles.computersHeading}>
            <div><span className={styles.kicker}><Laptop size={15} /> Child computers</span><h2>{childDevices.length} of {account.deviceLimits?.child || 10} computers connected</h2><p className={styles.channelExplanation}>Manage school activity in your <Link href="/guard/dashboard/">family dashboard</Link>.</p></div>
            {canConnectComputers && <Link className={styles.secondaryPortalButton} href="/guard/activate">Approve pairing code</Link>}
          </div>
          <PlanControls limit={account.deviceLimits?.child || 10} connected={childDevices.length} canChange={account.familyPlan?.canChange === true} complimentary={isComplimentary} allowance={account.aiAllowance || null}/>
          {childDevices.length ? (
            <div className={styles.computerList}>
              {childDevices.map(device => (
                <article className={styles.computerRow} key={device.id}>
                  <div className={styles.computerIcon}><Laptop size={20} /></div>
                  <div><strong>{device.computerName || "Child computer"}</strong><span>{device.platform} · BodeeGuard {device.appVersion || "version unavailable"} · {device.releaseChannel === "beta" ? "Beta" : device.releaseChannel === "stable" ? "Stable" : "Channel unavailable"} · Last check-in {readableLastSeen(device.lastSeenAt)}</span></div>
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
            <div className={styles.emptyComputers}><CheckCircle2 size={21} /><span>{canConnectComputers ? "Approve a computer’s pairing code, then assign it to a child in your dashboard." : "Activate family access to connect your children’s computers."}</span></div>
          )}</div>
          </details>
        <ChildSetup key={params.setup === "connect" ? "connect" : "account"} initiallyCollapsed={params.setup !== "connect" && (setupCollapsed || childDevices.length > 0 || !canConnectComputers)} highlightDownload={childDevices.length === 0 && installerAvailable}>
          {canConnectComputers ? <>
            <p className={styles.channelExplanation}>Family setup: children → school → activities → connect a computer. <Link href="/guard/dashboard/?setup=1">Continue your saved family setup</Link>. </p>
            {installerAvailable && <InstallerShareLink />}
            <div className={styles.setupDownload}>
              {installerAvailable ? (
                <InstallerDownload href="/guard/download/windows" label="Download child app for Windows" version={release?.version} secondary />
              ) : (
                <span className={styles.portalButtonUnavailable} aria-disabled="true"><CalendarClock size={17} /> Cloud installer not released yet</span>
              )}
            </div>
            <p className={styles.channelExplanation}>Stay signed in on your own computer or phone. Install on the child’s PC, then approve its code here.</p>
            <ol className={styles.setupSteps}>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>1</span>
                <div><strong>Install</strong><p>Run the installer on your child’s PC. Open BodeeGuard to get its pairing code.</p></div>
              </li>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>2</span>
                <div><strong>Approve from your device</strong><p>On your own computer or phone, enter the code shown by the child app.</p><Link className={styles.stepAction} href="/guard/activate/"><KeyRound size={15} /> Enter code</Link></div>
              </li>
              <li className={styles.setupStep}>
                <span className={styles.stepNumber}>3</span>
                <div><strong>Check readiness</strong><p>Assign this computer to the child’s existing profile, check its connection and complete the Parent password setup if prompted.</p><Link className={styles.stepAction} href="/guard/dashboard/?setup=connect">Continue setup <ArrowRight size={15} /></Link></div>
              </li>
            </ol>
          </> : <p className={styles.channelExplanation}>{canStartTrial ? "Start your trial below, then download and connect your child’s computer here." : canSubscribe ? "Subscribe below to restore your family access. Your current installations and saved work do not need to be replaced." : "Setup will be available here when family enrollment opens."}</p>}
        </ChildSetup>

          <details id="account-updates" className={accountStyles.section} open={Boolean(params.channel)}>
            <summary className={accountStyles.sectionSummary}><span className={accountStyles.sectionIcon}><Download size={20} /></span><span className={accountStyles.sectionLabel}><strong>Software updates</strong><small>{channelLabel}{release ? ` · Version ${release.version}` : " · Installer not released yet"}</small></span><ChevronDown className={accountStyles.chevron} size={18} /></summary>
            <div className={accountStyles.panelBody}>
              <p>{isComplimentary ? "Early updates are included with your complimentary Family Beta access." : account.releaseChannel === "beta" ? "Early updates may still have issues. You can return to Stable below." : "Stable updates arrive after Beta testing."}</p>
            {release && (
              <details className={styles.releaseNotes}>
                <summary>What changed in {release.version}</summary>
                <div className={styles.releaseNotesBody}>
                  {release.notes?.title && <p className={styles.releaseNotesTitle}>{release.notes.title}</p>}
                  {release.notes?.sections?.length ? release.notes.sections.map((section, index) => (
                    <section className={styles.releaseNotesSection} key={`${section.heading}-${index}`}>
                      <h3>{section.heading}</h3>
                      {section.headline && <strong>{section.headline}</strong>}
                      {section.summary && <p>{section.summary}</p>}
                      {section.highlights.length > 0 && <ul>{section.highlights.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>}
                    </section>
                  )) : <p>Release details are being prepared. The installer is still verified before BodeeGuard offers it.</p>}
                </div>
              </details>
            )}
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
            </div>
          </details>
          <details className={accountStyles.section}>
            <summary className={accountStyles.sectionSummary}><span className={accountStyles.sectionIcon}><CircleHelp size={20} /></span><span className={accountStyles.sectionLabel}><strong>Help & account security</strong><small>Setup questions, sign-in & support</small></span><ChevronDown className={accountStyles.chevron} size={18} /></summary>
            <div className={`${accountStyles.panelBody} ${accountStyles.helpBody}`}>
              <div><strong>Do parents need an app?</strong><p>Use your dashboard in this browser. There is nothing for parents to install.</p></div>
              <div><strong>Can I close the dashboard?</strong><p>Yes. Your children’s school day keeps running on their computers.</p></div>
              <div><strong>Is my sign-in shared with my children?</strong><p>No. Your password stays with Clerk and is never stored on a child’s computer.</p></div>
              <Link className={styles.secondaryPortalButton} href="/feedback"><CircleHelp size={16} /> Get account help <ArrowRight size={16} /></Link>
            </div>
          </details>
        {account.releaseOperator && <details className={accountStyles.section} open={Boolean(params.invitation)}><summary className={accountStyles.sectionSummary}><span className={accountStyles.sectionIcon}><ShieldCheck size={20} /></span><span className={accountStyles.sectionLabel}><strong>Staff tools</strong><small>Beta invitations & product dashboard</small></span><ChevronDown className={accountStyles.chevron} size={18} /></summary><div className={accountStyles.panelBody}>
          <span className={styles.kicker}><ShieldCheck size={15} /> BodeeGuard staff</span>
          <p><Link className={styles.secondaryPortalButton} href="/guard/admin/"><ShieldCheck size={18} /> Open product dashboard</Link></p>
          <h2>Invite a family to Beta</h2>
          <p>Ask the parent to create and verify their BodeeGuard account first. Invite that email below, then send them the account-page link. This saves an invitation; it does not send an email, start their trial, charge them, or make their account permanently free.</p>
          <p>The parent must choose Beta themselves. They can start their 30-day card-free trial only when a verified customer-capable Beta installer is available.</p>
          {params.invitation && <p role="status" className={styles.channelExplanation}>{params.invitation === "saved" ? "Invitation saved. Tell this parent to open bodeebooks.com/guard/account/ and look under Software updates." : "Invitation removed. Existing Beta participation is unchanged; the parent can select Stable to stop future Beta updates."}</p>}
          <form action={manageBodeeGuardBetaInvitation} className={styles.betaInvitationForm}>
            <label>Verified parent email<input type="email" name="email" required maxLength={254} placeholder="parent@example.com" /></label>
            <label>Action<select name="operation"><option value="invite">Invite to Beta</option><option value="remove-invitation">Remove invitation</option></select></label>
            <SubmitButton className={styles.secondaryPortalButton} pendingLabel="Saving invitation…">Save Beta invitation</SubmitButton>
          </form>
        </div></details>}
        </div>
        <footer className={accountStyles.identity}>
          <div><UserRound size={19} /><span><small>Signed in as</small><strong>{user?.primaryEmailAddress?.emailAddress || name}</strong></span></div>
          <GuardSignOut className={accountStyles.signOut} compact />
        </footer>
      </div>
    </div>
  );
}
