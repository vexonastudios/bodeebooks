import type { Metadata } from "next";
import Image from "next/image";
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
  title: "BodeeGuard – The Windows Learning Environment for Families",
  description:
    "BodeeGuard is the digital bodyguard for a child’s school day, turning Windows into a focused homeschool environment for lessons, accountability, learning tools, and parent-controlled recreation.",
  alternates: { canonical: "https://www.bodeebooks.com/guard/" },
};

const features = [
  {
    icon: GraduationCap,
    title: "Video homeschool, without wandering",
    copy: "Children can use Abeka, BJU Press, and other approved online-school platforms inside a focused workspace instead of an unrestricted browser or desktop.",
  },
  {
    icon: TimerReset,
    title: "Real school-day accountability",
    copy: "See which child is working, what module is active, how long it has been used, and whether the day’s required schoolwork is actually complete.",
  },
  {
    icon: BookOpenCheck,
    title: "Learning tools are built in",
    copy: "Use Science Spelling Lab, Geography Mastery, quizzes, worksheets, learning videos, audiobooks, and parent-reviewed grading without sending children elsewhere.",
  },
  {
    icon: MessageCircleMore,
    title: "One parent command center",
    copy: "Manage every child, send messages, review progress, adjust access, lock a computer, or close BodeeGuard remotely from the parent dashboard.",
  },
  {
    icon: Gamepad2,
    title: "Fun is earned and bounded",
    copy: "Family games, music, and recreational videos follow the rules you choose. School can unlock rewards, while timers and schedules prevent endless play.",
  },
  {
    icon: Wifi,
    title: "Designed for real family computers",
    copy: "Local safeguards keep working through internet interruptions, with protected sign-out, Wi-Fi recovery, LAN coordination, printing, and secure automatic updates.",
  },
];

const schoolDay = [
  {
    title: "The child sees a learning computer",
    copy: "A clear, full-screen home for school, assignments, learning tools, messages, and the activities you have approved—not the whole Windows desktop.",
  },
  {
    title: "BodeeGuard keeps the day on track",
    copy: "It organizes school portals and lessons, records meaningful activity, protects required work, and explains why something is locked instead of simply failing.",
  },
  {
    title: "The parent remains in control",
    copy: "You set schedules and limits, review school progress and quiz results, approve exceptions, and decide when games or entertainment become available.",
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
            <div className={styles.brandLockup}>
              <Image className={styles.brandLogo} src="/bodeeguard-logo.png" alt="BodeeGuard shield logo" width={74} height={74} priority />
              <div><strong>BodeeGuard</strong><span>A bodyguard for the school day</span></div>
            </div>
            <span className={styles.eyebrow}><ShieldCheck size={15} /> Focus protected · Learning stays open</span>
            <h1>Put a bodyguard between school time and <span>digital distractions.</span></h1>
            <p className={styles.lead}>
              BodeeGuard is a child-focused learning environment built on top of Windows. Like a digital bodyguard for school, it keeps children inside the lessons, tools, and activities their parents chose—away from unrelated apps, wandering websites, and easy shortcuts that replace real work.
            </p>
            <div className={styles.platformPills} aria-label="Supported online school platforms">
              <span>Abeka</span>
              <span>BJU Press</span>
              <span>Other online curricula</span>
            </div>
            <GuardAuthActions />
            <p className={styles.reassurance}><CheckCircle2 size={15} /> It guards the learning environment—not the child. Parents set the boundaries, and children always see what is available and why.</p>
          </div>

          <div className={styles.heroVisual} aria-label="BodeeGuard family computer overview">
            <div className={styles.glowOne} />
            <div className={styles.glowTwo} />
            <div className={styles.deviceFrame}>
              <div className={styles.deviceTop}>
                <span className={styles.brandMark}><Image className={styles.miniLogo} src="/bodeeguard-logo.png" alt="" width={24} height={24} /> BodeeGuard</span>
                <span className={styles.safeStatus}><span /> Family online</span>
              </div>
              <div className={styles.deviceBody}>
                <div className={styles.miniSidebar}>
                  <span className={styles.activeRail} />
                  <span /><span /><span /><span /><span />
                </div>
                <div className={styles.dashboardMock}>
                  <div className={styles.welcomeLine}>Good morning, student</div>
                  <div className={styles.mockTitle}>Your homeschool day</div>
                  <div className={styles.progressCard}>
                    <div><GraduationCap size={22} /><strong>Video school progress</strong></div>
                    <span>3 of 5 lessons complete</span>
                    <div className={styles.progressTrack}><i /></div>
                  </div>
                  <div className={styles.mockCards}>
                    <div><BookOpenCheck size={21} /><strong>School &amp; practice</strong><small>Ready now</small></div>
                    <div><Gamepad2 size={21} /><strong>Family games</strong><small>After schoolwork</small></div>
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles.floatingCard} ${styles.parentCard}`}><LockKeyhole size={18} /><span><strong>Attention protected</strong><small>School tools stay available</small></span></div>
            <div className={`${styles.floatingCard} ${styles.rewardCard}`}><Sparkles size={18} /><span><strong>Progress rewarded</strong><small>Fun follows your rules</small></span></div>
          </div>
        </div>
      </section>

      <section className={`container ${styles.definitionSection}`}>
        <div className={styles.definitionCard}>
          <div className={styles.definitionIcon}><Image src="/bodeeguard-logo.png" alt="" width={50} height={50} /></div>
          <div>
            <span>What is BodeeGuard?</span>
            <h2>A bodyguard for focus, accountability, and the school day.</h2>
            <p>
              BodeeGuard does not treat children as the problem. It guards the boundaries around their school computer: lessons stay accessible, unrelated apps and websites stay out, and answer-site shortcuts cannot quietly replace real work. Approved homeschool portals, practice, parent messages, progress, rewards, and recreation all live under one clear set of family rules.
            </p>
          </div>
        </div>
      </section>

      <section className={`container ${styles.featureSection}`}>
        <div className={styles.sectionHeading}>
          <span>School, accountability, and rewards</span>
          <h2>More than a blocker. It runs the homeschool computer.</h2>
          <p>BodeeGuard is designed around the whole school day—from opening a video lesson to checking progress, practicing difficult material, and earning controlled recreation afterward.</p>
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

      <section className={styles.daySection}>
        <div className={`container ${styles.dayInner}`}>
          <div className={styles.sectionHeading}>
            <span>A clearer school day</span>
            <h2>Children know what to do. Parents know what happened.</h2>
          </div>
          <div className={styles.dayGrid}>
            {schoolDay.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
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
          <span>A Windows computer with a purpose</span>
          <h2>Give children freedom inside a space built for school.</h2>
          <p>Create the parent account that will manage your family’s BodeeGuard computers, then start a 14-day free trial. The public Windows installer is the next release step.</p>
        </div>
        <GuardAuthActions />
      </section>
    </div>
  );
}
