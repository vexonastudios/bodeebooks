import type { Metadata } from "next";
import {
  BookOpenCheck,
  CheckCircle2,
  Gamepad2,
  GraduationCap,
  Laptop,
  LockKeyhole,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wifi,
} from "lucide-react";
import GuardAuthActions from "@/components/GuardAuthActions";
import styles from "./guard.module.css";

export const metadata: Metadata = {
  title: "BodeeGuard – A Better Family Computer",
  description:
    "BodeeGuard turns a Windows computer into a parent-managed space for school, learning, family games, and safe communication.",
  alternates: { canonical: "https://www.bodeebooks.com/guard/" },
};

const features = [
  {
    icon: GraduationCap,
    title: "School stays first",
    copy: "Keep school tools available, track real learning time, and make room for breaks without losing the day’s progress.",
  },
  {
    icon: TimerReset,
    title: "Time that makes sense",
    copy: "Set limits, let earned time carry forward until it is used, and offer a fair warning before a game or video ends.",
  },
  {
    icon: Gamepad2,
    title: "Family games, your rules",
    copy: "Choose which games are available on which days, reward completed work, and manage every child from one place.",
  },
  {
    icon: MessageCircleMore,
    title: "Stay connected",
    copy: "Send messages, lock or close a computer remotely, and see clear explanations when an activity is unavailable.",
  },
  {
    icon: BookOpenCheck,
    title: "Built for learning",
    copy: "Learning videos, spelling practice, worksheets, quizzes, and online school portals live together in one calm interface.",
  },
  {
    icon: Wifi,
    title: "Works through real life",
    copy: "Local safeguards keep working through internet interruptions, with secure reconnection and device recovery tools for parents.",
  },
];

const steps = [
  "Create the parent account that owns your family’s subscription.",
  "Install BodeeGuard on the parent computer and each child computer.",
  "Approve each computer with a short pairing code—no account password is stored on the child’s device.",
];

export default function GuardPage() {
  return (
    <div className={styles.guardPage}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}><ShieldCheck size={15} /> BodeeGuard for Windows</span>
            <h1>A family computer should help children <span>grow.</span></h1>
            <p className={styles.lead}>
              BodeeGuard brings school, learning, communication, and carefully managed fun into one parent-controlled Windows experience.
            </p>
            <GuardAuthActions />
            <p className={styles.reassurance}><CheckCircle2 size={15} /> Parent controls remain yours. Children never need your account password.</p>
          </div>

          <div className={styles.heroVisual} aria-label="BodeeGuard family computer overview">
            <div className={styles.glowOne} />
            <div className={styles.glowTwo} />
            <div className={styles.deviceFrame}>
              <div className={styles.deviceTop}>
                <span className={styles.brandMark}><ShieldCheck size={18} /> BodeeGuard</span>
                <span className={styles.safeStatus}><span /> Family online</span>
              </div>
              <div className={styles.deviceBody}>
                <div className={styles.miniSidebar}>
                  <span className={styles.activeRail} />
                  <span /><span /><span /><span /><span />
                </div>
                <div className={styles.dashboardMock}>
                  <div className={styles.welcomeLine}>Good morning</div>
                  <div className={styles.mockTitle}>Today’s learning plan</div>
                  <div className={styles.progressCard}>
                    <div><GraduationCap size={22} /><strong>School progress</strong></div>
                    <span>3 of 5 complete</span>
                    <div className={styles.progressTrack}><i /></div>
                  </div>
                  <div className={styles.mockCards}>
                    <div><BookOpenCheck size={21} /><strong>Learning</strong><small>Always available</small></div>
                    <div><Gamepad2 size={21} /><strong>Family Games</strong><small>After school</small></div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.floatingCard} ${styles.parentCard}`}><LockKeyhole size={18} /><span><strong>Parent controlled</strong><small>Rules update securely</small></span></div>
            <div className={`${styles.floatingCard} ${styles.rewardCard}`}><Sparkles size={18} /><span><strong>Time earned</strong><small>Ready when they are</small></span></div>
          </div>
        </div>
      </section>

      <section className={`container ${styles.featureSection}`}>
        <div className={styles.sectionHeading}>
          <span>One protected place</span>
          <h2>Everything a family computer needs, without handing over the keys.</h2>
          <p>Designed around real homeschool days: flexible enough for parents, clear enough for children, and resilient when the network is not perfect.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, copy }) => (
            <article className={styles.featureCard} key={title}>
              <div className={styles.featureIcon}><Icon size={21} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.setupSection}>
        <div className={`container ${styles.setupGrid}`}>
          <div>
            <span className={styles.darkEyebrow}><Laptop size={15} /> Simple household setup</span>
            <h2>One parent account. Every family computer.</h2>
            <p>Your account approves devices and carries the family’s subscription. Each protected computer receives only the secure access it needs.</p>
          </div>
          <ol className={styles.steps}>
            {steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}
          </ol>
        </div>
      </section>

      <section className={`container ${styles.finalCta}`}>
        <div>
          <span>Built for families—not surveillance dashboards.</span>
          <h2>Make the computer serve the home.</h2>
          <p>Create your BodeeGuard parent account now. Subscription checkout and the public Windows installer are the next production steps.</p>
        </div>
        <GuardAuthActions />
      </section>
    </div>
  );
}
