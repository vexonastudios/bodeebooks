import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDown, ArrowRight, BookOpen, CalendarCheck, Check, Gamepad2, GraduationCap, Laptop, MessageCircle, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import GuardAuthActions from "@/components/GuardAuthActions";
import TourScreenshot from "./TourScreenshot";
import styles from "./guard.module.css";

const title = "BodeeGuard — A focused school day. Your family’s rules.";
const description = "See inside BodeeGuard: Abeka lessons in a focused Windows workspace, parent controls from your phone, built-in learning tools, Bible study and family games.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "https://www.bodeebooks.com/guard/" },
  openGraph: { title, description, url: "https://www.bodeebooks.com/guard/", type: "website", images: [{ url: "/guard-tour/parent.webp", width: 2000, height: 993, alt: "BodeeGuard parent dashboard with a fictional family" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/guard-tour/parent.webp"] },
};

const questions = [
  ["What is BodeeGuard?", "BodeeGuard is a managed learning environment for a child’s Windows computer. It brings approved school websites, learning activities and recreation into one workspace, with the parent choosing what is available and when."],
  ["Do I need to install it on my own computer?", "Only your child’s Windows computer needs the child app. You can manage your family from a browser on your computer or phone, and add the parent dashboard to your phone’s home screen."],
  ["Does it replace our homeschool curriculum?", "No. Keep using your curriculum and school accounts. BodeeGuard helps organize access and adds its own learning tools. Third-party school subscriptions and accounts, such as Abeka, are separate."],
  ["Can my children have different rules?", "Yes. Set a family default, then adjust individual children’s activities, required schoolwork, schedules and time limits. You can also send messages and grant extra time from the parent dashboard."],
  ["Does the parent dashboard need to stay open?", "No. The child app applies the rules you have saved. The parent dashboard pauses routine checks when idle and refreshes when you return. Remote changes reach a child computer when it reconnects."],
  ["Can we try it before subscribing?", "Creating a parent account is free. The 30-day trial requires no card and creates no automatic charge. You choose whether to subscribe afterward; your parent account shows the available plan and setup steps."],
];

export default function GuardPage() {
  return <div className={styles.guardPage}>
    <section className={styles.hero} aria-labelledby="guard-title">
      <div className={styles.container}>
        <div className={styles.productBar}>
          <a className={styles.brand} href="#guard-title"><Image src="/guard-icons/bodeeguard-parent-192.png" alt="" width={42} height={42} /><strong>BodeeGuard</strong></a>
          <a href="#tour" className={styles.textLink}>Take a look inside <ArrowDown size={16} /></a>
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><ShieldCheck size={16} /> Made for the homeschool day</p>
            <h1 id="guard-title">Their school day.<br /><em>Your family’s rules.</em></h1>
            <p className={styles.lead}>Bring Abeka lessons, learning tools and family activities into one focused Windows workspace. Choose what opens on your children’s computers—and stay connected from yours.</p>
            <GuardAuthActions />
            <div className={styles.platforms}><span><Laptop size={17} /> Child app for Windows</span><span><Smartphone size={17} /> Parents on phone or browser</span></div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.screenEyebrow}><span /> Your family, at a glance <span className={styles.sampleBadge}>Sample family</span></div>
            <TourScreenshot image="parent" title="Parent dashboard" priority alt="Parent dashboard showing Alex, Emma and Noah, their lesson progress, recorded activity and access controls." />
            <div className={styles.heroCaption}><ShieldCheck size={21} /><p><strong>Involved, without hovering.</strong><br />Check progress, adjust time and send encouragement.</p></div>
          </div>
        </div>
      </div>
    </section>

    <nav className={styles.tourNav} aria-label="Explore BodeeGuard"><div className={styles.container}>
      <a href="#abeka">Abeka lessons</a><a href="#child">The child’s day</a><a href="#parents">Parent controls</a><a href="#bible">Bible & memory</a><a href="#family-time">Family time</a><a href="#get-started">Getting started <ArrowRight size={14} /></a>
    </div></nav>

    <section id="tour" className={`${styles.section} ${styles.intro}`}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>A look inside the app</p>
        <h2>Less guessing.<br />More room for learning.</h2>
        <p className={styles.sectionLead}>Schoolwork, healthy boundaries and a little family fun belong together. Here’s how BodeeGuard brings them into the same day.</p>
        <p className={styles.sampleNote}>Explore real screens from the school day. BodeeGuard family examples use fictional names, messages and progress. Select any screenshot to see it larger.</p>
        <div className={styles.pillars}>
          {[{icon:GraduationCap,title:"A place to focus",copy:"Approved school websites and built-in learning activities."},{icon:CalendarCheck,title:"Rules that fit your family",copy:"Required work, time limits and individual daily plans."},{icon:MessageCircle,title:"A parent close by",copy:"Messages, progress and controls from your phone."}].map(({icon:Icon,title,copy})=><div key={title}><Icon size={25} /><h3>{title}</h3><p>{copy}</p></div>)}
        </div>
      </div>
    </section>

    <section id="abeka" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><GraduationCap size={16} /> Made for Abeka school days</p><h2>Your Abeka lessons.<br />A more focused school day.</h2></div><p>Keep the curriculum you chose. Children open Abeka inside BodeeGuard, with their school tools close by and your family’s access rules still in place.</p></div>
        <div className={styles.abekaLesson}><TourScreenshot image="abeka" title="Abeka lesson player" sourceNote="Abeka lesson view · personal details omitted" alt="Abeka Algebra 1 lesson 26 title screen, with playback controls and Previous and Next lesson navigation." caption="An Abeka Algebra 1 lesson, with familiar playback controls and lesson navigation." /></div>
        <div className={styles.abekaFeatures}>
          <article><span>01</span><h3>Keep lessons within reach.</h3><p>Move between Video Lessons and Grades &amp; To-Do from the school toolbar. Open notes or message a parent without leaving the learning workspace.</p></article>
          <article><span>02</span><h3>See more than time on a tab.</h3><p>The parent dashboard shows reported Abeka lesson progress alongside school activity time. An open page and a completed lesson are different things.</p></article>
          <article><span>03</span><h3>Make it part of the daily plan.</h3><p>Combine Abeka with spelling, typing and other required work. Choose how school completion, schedules and time limits govern access to recreation.</p></article>
        </div>
        <p className={styles.abekaNote}>Use your existing Abeka account and enrollment; curriculum is purchased separately. <a href="https://www.abeka.com/resources/samplevideos.aspx">Explore Abeka’s public lesson samples ↗</a></p>
      </div>
    </section>

    <section id="child" className={`${styles.section} ${styles.softSection}`}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / The child’s workspace</p><h2>A clear start to every day.</h2></div><p>A personal dashboard brings the next assignment, required schoolwork, chores and approved activities into view. Children can make it their own with themes.</p></div>
        <TourScreenshot image="child" title="The child’s day" alt="Alex’s child dashboard with a planner, schoolwork summary, Abeka Academy, Typing School, Spelling and Bible." caption="One home for the school day, with progress and the activities you allow." />
        <div className={styles.miniFeatures}><span><Check size={18} /> School websites in one workspace</span><span><Check size={18} /> Assignments, chores and rewards</span><span><Check size={18} /> Spelling, typing, math and more</span></div>
      </div>
    </section>

    <section id="parents" className={styles.section}>
      <div className={`${styles.container} ${styles.parentGrid}`}>
        <div className={styles.parentCopy}><p className={styles.eyebrow}>02 / Your parent dashboard</p><h2>You don’t have to be<br />at their desk.</h2><p className={styles.sectionLead}>Open BodeeGuard on your phone to see who’s connected, review reported activity and manage each child’s access.</p>
          <ul className={styles.checkList}><li><Check /> See activity time and reported lesson progress.</li><li><Check /> Unlock music, videos, audiobooks or games.</li><li><Check /> Add time or lock a connected computer.</li><li><Check /> Request a screen capture when you need context.</li></ul>
          <p className={styles.finePrint}>Activity time and lesson completion are shown separately. Remote commands require a connected child computer.</p>
        </div>
        <TourScreenshot image="parent-mobile" phone title="Parent controls on your phone" alt="Mobile parent dashboard with fictional children Alex, Emma and Noah, completion rings and quick controls." caption="The same family controls, sized for your phone." />
      </div>
      <div className={`${styles.container} ${styles.planning}`}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A plan for each child</p><h2>School first. Then what?</h2></div><p>You decide. Set a family default, adjust it for each child, and organize activities into schoolwork, after-school access, scheduled time or always-available tools.</p></div>
        <TourScreenshot image="plan" title="Daily plan" alt="Daily Plan for Alex, with School, Open after school, Certain days and times, No school requirement and Not allowed columns." caption="Move activities between groups, then set the days and limits that work for your family." />
      </div>
    </section>

    <section id="bible" className={`${styles.section} ${styles.bibleSection}`}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><BookOpen size={16} /> 03 / Time in the Word</p><h2>A Bible they can<br />make part of their day.</h2></div><p>The Berean Standard Bible is always available. Read a chapter, follow a plan, explore a topic or practice a verse—with a calm reading view and a plain-white option.</p></div>
        <TourScreenshot image="bible-reader" title="Bible reader" alt="The Berean Standard Bible reader open to Genesis 1, with chapter navigation, highlighting and notes." caption="Read, highlight and keep your place in the Berean Standard Bible." />
        <div className={styles.bibleGrid}>
          <article><TourScreenshot image="bible-topics" title="Bible topics" alt="Bible Topics search for Sad returning the topic Sorrow." /><h3>Start with what’s on their mind.</h3><p>Search thousands of topics using familiar words—like “sad”—and follow the references into Scripture.</p></article>
          <article><TourScreenshot image="bible-memory" title="Scripture memory" alt="Scripture memory practice for Genesis 1:1, with read, hide words, first letters and type from memory steps." /><h3>Learn it. Hide it. Remember it.</h3><p>Build a memory-verse collection, practice with hints and try typing a passage from memory.</p></article>
          <article><TourScreenshot image="bible-plan" title="Bible reading plans" alt="Horner reading plan with ten reading lists and a daily progress indicator." /><h3>A rhythm they can return to.</h3><p>Keep a place in a reading plan, including the Horner plan, and mark chapters as they go.</p></article>
        </div>
      </div>
    </section>

    <section id="family-time" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>04 / Still a family computer</p><h2>Room for connection.<br />Room for fun.</h2></div><p>Encourage a child with a message. Approve something to listen to. Make space for a family game—with the boundaries you choose.</p></div>
        <div className={styles.familyGrid}>
          <article><TourScreenshot image="messages" title="Family messages" alt="A sample conversation with Alex asking to unlock audiobooks and a parent action to approve access." /><div className={styles.cardCopy}><MessageCircle size={22} /><h3>A little encouragement goes a long way.</h3><p>Send messages and voice notes. When a child asks to unlock media, the parent can act right in the conversation.</p></div></article>
          <article><TourScreenshot image="games" title="Family Game Room" alt="Family Game Room with The Lesson Village, Family Paintball Showdown, Rally Rascals, Conquering of Canaan, Mountain Rush and Critter County Hunting." /><div className={styles.cardCopy}><Gamepad2 size={22} /><h3>Playtime has a place, too.</h3><p>Choose from board games and downloadable adventures. Supported multiplayer games bring siblings together on the same home Wi-Fi, within parent-set access and time limits.</p></div></article>
        </div>
        <div className={styles.moreTools}><Sparkles size={25} /><div><h3>And there’s more to explore.</h3><p>Art & Coloring Studio, Math Coach, spelling, vocabulary, typing, poems, worksheets, learning videos and a parent-approved media library—all part of the same workspace.</p></div></div>
      </div>
    </section>

    <section id="get-started" className={`${styles.section} ${styles.setupSection}`}>
      <div className={styles.container}><p className={styles.eyebrow}>From your phone to their computer</p><h2>Start with your family.<br />Build a day that fits.</h2>
        <ol className={styles.steps}><li><span>01</span><h3>Create your parent account</h3><p>Add your children and choose their school websites and activities.</p></li><li><span>02</span><h3>Connect their Windows PC</h3><p>Install the child app, approve its pairing code and assign the computer to a child.</p></li><li><span>03</span><h3>Set the daily rhythm</h3><p>Choose schoolwork, schedules and time limits. Adjust things as your family goes.</p></li></ol>
        <div className={styles.startCta}><div><h3>Ready to take a closer look?</h3><p>Your parent account walks you through the setup.</p></div><GuardAuthActions /></div>
      </div>
    </section>

    <section className={`${styles.section} ${styles.faqSection}`}><div className={styles.container}><p className={styles.eyebrow}>A few helpful answers</p><h2>Before you get started.</h2><div className={styles.faqGrid}>{questions.map(([question,answer])=><details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div><a className={styles.textLink} href="https://guard.bodeebooks.com/">Already a BodeeGuard parent? Open your dashboard <ArrowRight size={17} /></a></div></section>
  </div>;
}
