import type { Metadata } from "next";
import {
  ShieldCheck,
  Gamepad2,
  BanIcon,
  Globe,
  Users,
  Brain,
  Calculator,
  Keyboard,
  Swords,
  Trophy,
  Target,
  Tractor,
  Mic,
  Grid3X3,
  Play,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import styles from "./page.module.css";
import FaqAccordion from "./FaqAccordion";

/* ── SEO Metadata ─────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Free Games for Kids — No Ads, Safe & Clean",
  description:
    "100% free, ad-free games for kids. Typing, math, spelling, chess, pool & more — safe for homeschool families. No sign-up, no downloads. Play instantly in your browser.",
  keywords: [
    "free games for kids no ads",
    "safe games for kids",
    "ad-free educational games",
    "clean games for kids",
    "homeschool games free",
    "free typing games for homeschoolers",
    "educational games no ads no sign up",
    "family safe browser games for kids",
    "gameschooling resources",
    "free math games for kids",
    "free spelling games for kids",
    "chess for kids free",
    "multiplayer games for families",
    "browser games no download",
    "Christian family games online",
    "clean educational games for children",
  ],
  alternates: {
    canonical: "https://bodeebooks.com/free-games-for-kids/",
  },
  openGraph: {
    title: "Free Games for Kids — No Ads, Safe & Clean | Bodee Books",
    description:
      "13+ free, ad-free browser games for kids. Math, typing, spelling, chess, pool & more. Perfect for homeschool families. No sign-up needed.",
    url: "https://bodeebooks.com/free-games-for-kids/",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bodee Books Free Games for Kids — Ad-Free & Safe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Games for Kids — No Ads, Safe & Clean | Bodee Books",
    description:
      "13+ free, ad-free browser games for kids. Math, typing, spelling, chess & more. No sign-up. Play instantly.",
  },
};

/* ── FAQ Data ─────────────────────────────────────────── */

const faqs = [
  {
    q: "Are these games really 100% free?",
    a: "Yes — every game is completely free to play, right now and forever. There are no subscriptions, no premium tiers, no in-app purchases, and no hidden costs. Just open your browser and play.",
  },
  {
    q: "Are there any ads in the games?",
    a: "Zero. None. We believe kids deserve a distraction-free experience. There are no banner ads, no video ads, no pop-ups, and no sponsored content anywhere on the site. We never have and never will run ads.",
  },
  {
    q: "Do my kids need to create an account or sign up?",
    a: "No account or sign-up is required to play any game. We do offer an optional profile system so kids can track their own progress, but it's entirely local to your device — we don't collect any personal information.",
  },
  {
    q: "Is the content appropriate for children?",
    a: "Absolutely. Every game is designed to be family-friendly and wholesome. There is no violence, no inappropriate language, and no questionable themes. We're a family ourselves and we built these games for our own kids first.",
  },
  {
    q: "Can my kids play these games as part of our homeschool day?",
    a: "Yes! Many of our games are specifically educational — covering math (Math Tower, Math Race, Math Ascent), spelling (Spelling Bee), typing (Sky Typer Squadron, Harvest Dash), and strategy (Chess, Connect 4). They make excellent supplemental activities for homeschool families practicing gameschooling.",
  },
  {
    q: "What devices do these games work on?",
    a: "All games run directly in your web browser — no downloads or apps needed. They work on any computer (Windows, Mac, Chromebook). Most games are optimized for keyboard play, making them ideal for desktop or laptop use.",
  },
  {
    q: "Can multiple kids play together?",
    a: "Yes! Most of our games support 2 or more players on the same computer using shared or split keyboard controls. Spelling Bee supports up to 6 players! They're perfect for siblings, co-ops, or family game nights.",
  },
  {
    q: "Is there a play timer or parental controls?",
    a: "Yes. Our built-in play timer lets you set time limits for each session. When time is up, the game pauses. It's a simple, no-fuss way to manage screen time without needing third-party software.",
  },
];

/* ── Game Data ────────────────────────────────────────── */

type GameCategory = {
  name: string;
  icon: React.ElementType;
  iconBg: string;
  games: GameInfo[];
};

type GameInfo = {
  title: string;
  category: string;
  players: string;
  desc: string;
  color: string;
  bg: string;
  Icon: React.ElementType;
  url: string;
};

const categories: GameCategory[] = [
  {
    name: "Educational",
    icon: Brain,
    iconBg: "#e0e7ff",
    games: [
      {
        title: "Spelling Bee",
        category: "SPELLING",
        players: "2–6 Players",
        desc: "Listen to AI-narrated words and race to type them correctly. Perfect for building vocabulary and spelling accuracy.",
        color: "#e6601b",
        bg: "linear-gradient(180deg, #452187 0%, #2a0b5c 100%)",
        Icon: Mic,
        url: "https://games.bodeebooks.com/spelling",
      },
      {
        title: "Math Tower",
        category: "MATH",
        players: "2–3 Players",
        desc: "Answer multiple-choice math problems to build your tower. Wrong answers destroy blocks — strategy meets arithmetic!",
        color: "#06b6d4",
        bg: "linear-gradient(180deg, #0e4a5c 0%, #062b36 100%)",
        Icon: Calculator,
        url: "https://games.bodeebooks.com/tower",
      },
      {
        title: "Math Race",
        category: "MATH",
        players: "1–3 Players",
        desc: "Rapid-fire buzzer-style math competition. Compete head-to-head or challenge yourself in solo time-trial mode.",
        color: "#a855f7",
        bg: "linear-gradient(180deg, #3b0f7a 0%, #1e0541 100%)",
        Icon: Calculator,
        url: "https://games.bodeebooks.com/math-race",
      },
      {
        title: "Math Ascent",
        category: "MATH",
        players: "1 Player",
        desc: "Master your times tables! Race a UFO rival, build streaks, and launch your rocket by typing correct answers.",
        color: "#a78bfa",
        bg: "linear-gradient(180deg, #2e1065 0%, #1e0a4a 100%)",
        Icon: Calculator,
        url: "https://games.bodeebooks.com/math-ascent",
      },
      {
        title: "Harvest Dash",
        category: "TYPING",
        players: "1–2 Players",
        desc: "Race from the farmhouse, clear every field, and hit the correct answer blocks. Typing meets endless-runner fun!",
        color: "#e6601b",
        bg: "linear-gradient(180deg, #4ea3f2 0%, #2b7bc4 100%)",
        Icon: Tractor,
        url: "https://games.bodeebooks.com/runner",
      },
      {
        title: "Sky Typer Squadron",
        category: "TYPING",
        players: "2 Players",
        desc: "Team up as Pilot and Gunner! One flies with arrow keys while the other types enemy words to fire. Co-op at its best.",
        color: "#3b82f6",
        bg: "linear-gradient(180deg, #1e3a5f 0%, #0c1e33 100%)",
        Icon: Keyboard,
        url: "https://games.bodeebooks.com/sky-typer",
      },
    ],
  },
  {
    name: "Strategy & Classic",
    icon: Trophy,
    iconBg: "#fef3c7",
    games: [
      {
        title: "Chess Duel",
        category: "STRATEGY",
        players: "2 Players",
        desc: "Full chess with move helpers! Click a piece to see all legal moves. Learn check, checkmate, castling, en passant, and more.",
        color: "#d4a017",
        bg: "linear-gradient(180deg, #3d2b0a 0%, #1a1200 100%)",
        Icon: Grid3X3,
        url: "https://games.bodeebooks.com/chess",
      },
      {
        title: "Connect 4 Duel",
        category: "STRATEGY",
        players: "1–2 Players",
        desc: "Line up four chips vertically, horizontally, or diagonally. Play local multiplayer, against the bot, or in training mode.",
        color: "#3a56e4",
        bg: "linear-gradient(180deg, #0f3d99 0%, #061e4f 100%)",
        Icon: Grid3X3,
        url: "https://games.bodeebooks.com/connect4",
      },
      {
        title: "8-Ball Pool",
        category: "BILLIARDS",
        players: "2 Players",
        desc: "Realistic ball physics, trajectory guides, and full 8-ball rules. Learn angles, power, and collision reactions.",
        color: "#14b8a6",
        bg: "linear-gradient(180deg, #064e3b 0%, #022c22 100%)",
        Icon: Target,
        url: "https://games.bodeebooks.com/pool",
      },
      {
        title: "Bug Match",
        category: "MEMORY",
        players: "1–2 Players",
        desc: "Flip leaves and find matching bugs! Three grid sizes from easy 4×4 to a tough 6×6 bug hunt. Great for younger kids.",
        color: "#65a30d",
        bg: "linear-gradient(180deg, #2d5016 0%, #1a2e0a 100%)",
        Icon: Brain,
        url: "https://games.bodeebooks.com/bug-match",
      },
    ],
  },
  {
    name: "Action & Sports",
    icon: Swords,
    iconBg: "#fee2e2",
    games: [
      {
        title: "Duck Hunt Duel",
        category: "SHOOTER",
        players: "1–2 Players",
        desc: "Same duck, two triggers. Race your opponent to shoot targets first in real time! A clean, classic arcade experience.",
        color: "#369d6f",
        bg: "linear-gradient(180deg, #1b3d2b 0%, #0d2116 100%)",
        Icon: Target,
        url: "https://games.bodeebooks.com/duel",
      },
      {
        title: "Nerf Arena",
        category: "FPS",
        players: "2 Players",
        desc: "Split-screen first-person Nerf duel! Navigate the arena and tag your opponent with foam darts. Safe, silly, fun.",
        color: "#ef4444",
        bg: "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)",
        Icon: Target,
        url: "https://games.bodeebooks.com/nerf",
      },
      {
        title: "Foosball Frenzy",
        category: "SPORTS",
        players: "2 Players",
        desc: "Slide rods, kick the ball, and score goals! Full foosball table physics with 4 rods per side. First to 10 wins!",
        color: "#22c55e",
        bg: "linear-gradient(180deg, #14532d 0%, #052e16 100%)",
        Icon: Trophy,
        url: "https://games.bodeebooks.com/foosball",
      },
      {
        title: "Abrams Tank Assault",
        category: "CO-OP",
        players: "2 Players",
        desc: "Team up in a single tank! One player drives and navigates while the other aims the turret and fires. Cooperative play at its finest.",
        color: "#4ade80",
        bg: "linear-gradient(180deg, #1a3a2a 0%, #0a1e14 100%)",
        Icon: Swords,
        url: "https://games.bodeebooks.com/tank",
      },
    ],
  },
];

/* ── FAQ JSON-LD Schema ───────────────────────────────── */

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
};

/* ── Page Component ───────────────────────────────────── */

export default function FreeGamesForKidsPage() {
  const totalGames = categories.reduce((sum, c) => sum + c.games.length, 0);

  return (
    <>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroEyebrow}>
            <ShieldCheck size={14} />
            100% Free · Zero Ads · Family Safe
          </div>
          <h1 className={styles.heroTitle}>
            Free Games for Kids —{" "}
            <span className={styles.heroAccent}>No Ads, Ever</span>
          </h1>
          <p className={styles.heroDesc}>
            Tired of &ldquo;free&rdquo; games full of pop-up ads and in-app
            purchases? We built something better. {totalGames} clean,
            family-safe browser games — typing, math, spelling, chess, and more.
            No sign-up needed. Just play.
          </p>
          <a
            href="https://games.bodeebooks.com/"
            className={styles.heroCta}
            id="hero-play-now"
          >
            <Gamepad2 size={18} />
            Start Playing — It&apos;s Free
          </a>

          <div className={styles.trustBar}>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>🚫</span> Zero Ads
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>🔒</span> No Sign-Up
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>💯</span> 100% Free
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>🌐</span> Browser-Based
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>👨‍👩‍👧‍👦</span> Family Multiplayer
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Parents Trust Us ── */}
      <section className={`${styles.section}`}>
        <div className="container">
          <div className={styles.sectionEyebrow}>
            <ShieldCheck size={14} />
            Built for Families
          </div>
          <h2 className={styles.sectionTitle}>
            Why Homeschool Parents Choose Our Games
          </h2>
          <p className={styles.sectionDesc}>
            We&apos;re not a gaming company — we&apos;re a family. We built
            these games for our own kids and share them freely because every
            child deserves safe, clean entertainment.
          </p>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <BanIcon size={24} color="#dc2626" />
              </div>
              <h3 className={styles.whyTitle}>Truly Ad-Free</h3>
              <p className={styles.whyDesc}>
                No banner ads, no video ads, no pop-ups, no sponsored content.
                Ever. Your kids see games — nothing else.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <ShieldCheck size={24} color="#369d6f" />
              </div>
              <h3 className={styles.whyTitle}>Clean & Safe Content</h3>
              <p className={styles.whyDesc}>
                Every game is family-friendly. No violence, no inappropriate
                language, no questionable themes. Safe for all ages.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Brain size={24} color="#7c3aed" />
              </div>
              <h3 className={styles.whyTitle}>Actually Educational</h3>
              <p className={styles.whyDesc}>
                Math, spelling, typing, strategy — our games reinforce real
                skills. Perfect gameschooling supplements for your curriculum.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Users size={24} color="#2563eb" />
              </div>
              <h3 className={styles.whyTitle}>Play Together</h3>
              <p className={styles.whyDesc}>
                Most games support 2+ players on one computer. Siblings can
                compete head-to-head — no extra devices needed.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <Globe size={24} color="#0891b2" />
              </div>
              <h3 className={styles.whyTitle}>Nothing to Install</h3>
              <p className={styles.whyDesc}>
                Open your browser and play. No apps to download, no accounts to
                create, no software to update. Works on any computer.
              </p>
            </div>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>⏱️</div>
              <h3 className={styles.whyTitle}>Built-In Play Timer</h3>
              <p className={styles.whyDesc}>
                Set time limits for each session. When time&apos;s up, the game
                pauses. Simple screen-time management, built right in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Game Showcase ── */}
      <section className={styles.section} style={{ background: "var(--bg-subtle)" }}>
        <div className="container">
          <div className={styles.sectionEyebrow}>
            <Gamepad2 size={14} />
            All {totalGames} Games
          </div>
          <h2 className={styles.sectionTitle}>
            Browse Our Free Game Collection
          </h2>
          <p className={styles.sectionDesc}>
            Every game below is completely free, has zero ads, and runs right in
            your browser. Click any game to start playing instantly.
          </p>

          {categories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.name}>
                <div className={styles.categoryHeader}>
                  <div
                    className={styles.categoryIcon}
                    style={{ background: cat.iconBg }}
                  >
                    <CatIcon size={18} />
                  </div>
                  <h3 className={styles.categoryName}>{cat.name}</h3>
                  <span className={styles.categoryCount}>
                    {cat.games.length} games
                  </span>
                </div>
                <div className={styles.gameGrid}>
                  {cat.games.map((game) => {
                    const GameIcon = game.Icon;
                    return (
                      <a
                        key={game.title}
                        href={game.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.gameCard}
                        id={`game-${game.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div
                          className={styles.cardVisual}
                          style={{ background: game.bg }}
                        >
                          <GameIcon
                            size={48}
                            color="white"
                            className={styles.cardIcon}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.cardBadges}>
                            <span
                              className={`${styles.cardBadge} ${styles.cardBadgeCategory}`}
                            >
                              {game.category}
                            </span>
                            <span className={styles.cardBadge}>
                              {game.players}
                            </span>
                          </div>
                          <h4 className={styles.cardTitle}>{game.title}</h4>
                          <p className={styles.cardDesc}>{game.desc}</p>
                          <div
                            className={styles.cardPlay}
                            style={{ backgroundColor: game.color }}
                          >
                            Play Now <Play size={12} fill="white" />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.ctaBanner}>
        <div className={`container ${styles.ctaInner}`}>
          <h2 className={styles.ctaTitle}>
            Ready for Ad-Free Family Game Time?
          </h2>
          <p className={styles.ctaDesc}>
            {totalGames} games. Zero ads. No sign-up. Just clean, safe fun.
          </p>
          <a
            href="https://games.bodeebooks.com/"
            className={styles.ctaButton}
            id="cta-play-now"
          >
            <Gamepad2 size={20} />
            Go to the Game Hub
            <ExternalLink size={14} />
          </a>
          <p className={styles.ctaNote}>
            Free forever · No account needed · Works on any computer
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <div className="container">
          <div className={styles.sectionEyebrow}>
            <ShieldCheck size={14} />
            Common Questions
          </div>
          <h2 className={styles.sectionTitle}>
            Frequently Asked Questions
          </h2>
          <p className={styles.sectionDesc}>
            Everything parents want to know before letting their kids play.
          </p>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>
    </>
  );
}
