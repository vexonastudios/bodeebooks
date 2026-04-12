import Link from "next/link";

import { AudiobookCard, BookCard, GameCard } from "@/components/cards";
import { SectionHeading } from "@/components/section-heading";
import { featureStats, games, printedBooks } from "@/data/site-content";
import { siteConfig } from "@/lib/site-config";
import { getLatestAudiobooks } from "@/lib/youtube";

export default async function HomePage() {
  const audiobookFeed = await getLatestAudiobooks(3);

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__panel">
            <p className="hero__eyebrow">Next.js redesign and migration starter</p>
            <h1 className="hero__title">Stories kids can hear, hold, and play with.</h1>
            <p className="hero__copy">
              This first build reframes Bodee Books as a living story studio:
              audiobook premieres from YouTube, a growing printed catalog, and a
              flexible games lane for reading and learning projects.
            </p>

            <div className="button-row">
              <Link className="button" href="/audiobooks">
                Explore audiobooks
              </Link>
              <Link className="button button--ghost" href="/games">
                Visit the games area
              </Link>
            </div>

            <p className="hero__feed-note">
              Audiobook source:{" "}
              <strong>
                {audiobookFeed.source === "youtube"
                  ? "Live YouTube feed"
                  : "Fallback cards while the feed reconnects"}
              </strong>
              . The site points at{" "}
              <a
                className="text-link"
                href={siteConfig.youtubeUrl}
                rel="noreferrer"
                target="_blank"
              >
                {siteConfig.youtubeHandle}
              </a>{" "}
              automatically.
            </p>
          </div>

          <aside className="hero__aside">
            <div>
              <h2 className="hero__aside-title">A structure built to keep growing</h2>
              <p className="hero__aside-copy">
                Instead of one crowded site, this app gives each lane its own shelf
                while still feeling like one brand.
              </p>
            </div>

            <div className="hero__feature-list">
              {featureStats.map((item) => (
                <div className="hero__feature" key={item.value}>
                  <span className="hero__feature-value">{item.value}</span>
                  <p className="hero__feature-label">{item.label}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            action={{ href: "/audiobooks", label: "See the full lane" }}
            description="The homepage now has a direct bridge between the brand and the latest YouTube uploads, so new releases have a place to land the moment they exist."
            eyebrow="Latest from YouTube"
            title="Audiobook premieres"
          />

          <div className="grid grid--3">
            {audiobookFeed.items.map((item) => (
              <AudiobookCard item={item} key={item.href} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            action={{ href: "/books", label: "Browse print titles" }}
            description="The print shelf is intentionally modest right now, but the catalog structure is ready for launches, reprints, and featured editions."
            eyebrow="Printed books"
            title="A shelf that can stay small or scale up"
          />

          <div className="grid grid--3">
            {printedBooks.map((book) => (
              <BookCard book={book} key={book.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            action={{ href: "/games", label: "Open the games area" }}
            description="Games are treated as a permanent part of the site architecture, not a side project. That makes it easier to add new learning experiments over time."
            eyebrow="Games for kids"
            title="A flexible play area for reading, typing, and number skills"
          />

          <div className="grid grid--2">
            {games.map((game) => (
              <GameCard game={game} key={game.title} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            description="This is the sequence that keeps the first migration practical: launch the new shell, keep audiobook discovery current, then port the games one by one."
            eyebrow="Migration rhythm"
            title="A clean path away from the old server"
          />

          <div className="roadmap">
            <article className="roadmap__step">
              <h3>1. Publish the brand shell</h3>
              <p>
                Launch the redesigned site on Vercel with the main sections, nav,
                and editorial positioning in place.
              </p>
            </article>
            <article className="roadmap__step">
              <h3>2. Let YouTube drive freshness</h3>
              <p>
                Use the public channel feed to keep audiobook releases current
                without hand-editing a new page for every upload.
              </p>
            </article>
            <article className="roadmap__step">
              <h3>3. Rebuild games in batches</h3>
              <p>
                Move each learning game into the new app when it is ready instead
                of waiting for a giant all-at-once migration.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
