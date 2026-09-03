import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Laptop,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "@/app/guard/auth.module.css";

type GuardAccountEntryProps = {
  mode: "sign-up" | "sign-in";
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#0b77d5",
    colorText: "#0b1830",
    colorTextSecondary: "#5a6c80",
    colorBackground: "#ffffff",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
  elements: {
    rootBox: styles.clerkRoot,
    cardBox: styles.clerkCardBox,
    card: styles.clerkCard,
    headerTitle: styles.clerkTitle,
    headerSubtitle: styles.clerkSubtitle,
    formButtonPrimary: styles.clerkPrimaryButton,
    footer: styles.clerkFooter,
  },
};

const setupSteps = [
  { number: "1", title: "Parent account", detail: "Create and verify your secure login" },
  { number: "2", title: "Review your trial", detail: "See the price and first billing date" },
  { number: "3", title: "Connect computers", detail: "Install and approve each family PC" },
];

export default function GuardAccountEntry({ mode }: GuardAccountEntryProps) {
  const isSignUp = mode === "sign-up";

  return (
    <div className={styles.authPage}>
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />
      <div className={`container ${styles.authShell}`}>
        <header className={styles.authTopbar}>
          <Link href="/guard" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to BodeeGuard
          </Link>
          <Link href={isSignUp ? "/guard/sign-in" : "/guard/sign-up"} className={styles.switchLink}>
            {isSignUp ? "Already created your web account? Sign in" : "First visit to the parent website? Create your account"}
            <ArrowRight size={15} />
          </Link>
        </header>

        {isSignUp && (
          <ol className={styles.progressSteps} aria-label="BodeeGuard setup progress">
            {setupSteps.map((step, index) => (
              <li className={index === 0 ? styles.currentStep : undefined} key={step.number} aria-current={index === 0 ? "step" : undefined}>
                <span>{step.number}</span>
                <div><strong>{step.title}</strong><small>{step.detail}</small></div>
              </li>
            ))}
          </ol>
        )}

        <div className={styles.authGrid}>
          <section className={styles.contextPanel}>
            <span className={styles.eyebrow}><ShieldCheck size={15} /> For parents and guardians</span>
            <h1>{isSignUp ? "Create the account that manages your family’s learning computers." : "Welcome back to your BodeeGuard parent dashboard."}</h1>
            <p className={styles.lead}>
              {isSignUp
                ? "This is the parent control account—not a child login. You will use it to manage the subscription and approve every BodeeGuard computer in your home."
                : "Sign in to review your plan, approve a computer, manage connected devices, or continue setting up your family."}
            </p>

            <div className={styles.benefitList}>
              <div><span><LockKeyhole size={18} /></span><p><strong>Your password stays with Clerk</strong><small>It is never copied to a child computer or stored inside BodeeGuard.</small></p></div>
              <div><span><Laptop size={18} /></span><p><strong>Approve computers safely</strong><small>Each installation connects with a short-lived pairing code and its own revocable credential.</small></p></div>
              <div><span><Users size={18} /></span><p><strong>Built for a whole household</strong><small>The standard plan supports 2 parent/admin computers and up to 10 child computers.</small></p></div>
            </div>

            {isSignUp && (
              <aside className={styles.planCard} aria-label="BodeeGuard trial details">
                <div>
                  <span className={styles.planLabel}>What happens after signup</span>
                  <strong>30 days of full BodeeGuard access</strong>
                  <p>No card is required. When day 30 arrives, choose whether to subscribe for $19.99 per month; otherwise the trial simply ends.</p>
                </div>
                <ul>
                  <li><Check size={15} /> No charge—or trial code—for creating this account</li>
                  <li><Check size={15} /> No card and no automatic trial-end charge</li>
                  <li><Check size={15} /> Subscribe only after making a deliberate choice</li>
                </ul>
              </aside>
            )}
          </section>

          <section className={styles.formPanel} aria-label={isSignUp ? "Create parent account" : "Parent sign in"}>
            <div className={styles.formHeading}>
              <span>{isSignUp ? "Step 1 of 3" : "Secure parent access"}</span>
              <h2>{isSignUp ? "Create your secure login" : "Sign in to BodeeGuard"}</h2>
              <p>{isSignUp ? "Use the email address the parent or guardian will keep access to." : "Sign in only if you have already created and verified an account on this parent website."}</p>
            </div>

            {!isSignUp && (
              <aside className={styles.firstWebAccountNote}>
                <ShieldCheck size={18} />
                <div>
                  <strong>Already use BodeeGuard on your family computers?</strong>
                  <p>The Windows app did not automatically create a web login. On your first visit here, create the parent account once—even if your family has used BodeeGuard for a long time.</p>
                  <Link href="/guard/sign-up">Create my parent web account <ArrowRight size={14} /></Link>
                </div>
              </aside>
            )}

            {isSignUp ? (
              <SignUp
                appearance={clerkAppearance}
                fallbackRedirectUrl="/guard/account"
                path="/guard/sign-up"
                routing="path"
                signInUrl="/guard/sign-in"
              />
            ) : (
              <SignIn
                appearance={clerkAppearance}
                fallbackRedirectUrl="/guard/account"
                path="/guard/sign-in"
                routing="path"
                signUpUrl="/guard/sign-up"
              />
            )}

            <div className={styles.securityNote}>
              <ShieldCheck size={17} />
              <p><strong>Parent-only account.</strong> Children use the protected BodeeGuard application and do not need this login.</p>
            </div>
            {isSignUp && (
              <div className={styles.nextNote}>
                <CreditCard size={17} />
                <p><strong>Next:</strong> After email verification, your account page starts the card-free trial. No card is sent to Stripe; secure payment checkout appears only if you deliberately subscribe later.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
