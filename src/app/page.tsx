import Link from "next/link";

import { AudiobookCard, BookCard, GameCard } from "@/components/cards";
import { SectionHeading } from "@/components/section-heading";
import { featureStats, games, printedBooks } from "@/data/site-content";
import { getLatestAudiobooks } from "@/lib/youtube";

export default async function HomePage() {
  const audiobookFeed = await getLatestAudiobooks(3);

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__panel">
            <p className="hero__eyebrow">Audiobooks, books, and games for curious kids</p>
            <h1 className="hero__title">Classic stories and playful learning, all in one place.</h1>
            <p className="hero__copy">
              Discover free audiobooks, featured print titles, and kid-friendly
              games designed to build confidence, spark curiosity, and make story
              time feel a little more magical.
            </p>

            <div className="button-row">
              <Link className="button" href="/audiobooks">
                Explore audiobooks
              </Link>
              <Link className="button button--ghost" href="/games">
                Visit the games area
              </Link>
            </div>
          </div>

          <aside className="hero__aside">
            <div>
              <h2 className="hero__aside-title">Start with what your family loves most</h2>
              <p className="hero__aside-copy">
                Press play on a favorite audiobook, browse a featured book, or jump
                into a quick game made for practice and fun.
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
            description="Open a story page for each latest release, with a clear summary and a player that stays out of the way until listeners are ready."
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
            description="A growing bookshelf of print editions, classics, and family-friendly reads worth keeping close at hand."
            eyebrow="Printed books"
            title="Stories to hold onto"
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
            description="Quick games for reading, typing, and number confidence, with more playful challenges on the way."
            eyebrow="Games for kids"
            title="Practice that still feels like play"
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
            description="Whether you want a long listen, a print title, or a quick learning game, there is an easy place to begin."
            eyebrow="Start here"
            title="Listen, read, and play your way through Bodee Books"
          />

          <div className="roadmap">
            <article className="roadmap__step">
              <h3>1. Listen</h3>
              <p>
                Settle into full-length audiobooks, classics, and adventures ready
                to play with one tap.
              </p>
            </article>
            <article className="roadmap__step">
              <h3>2. Read</h3>
              <p>
                Explore featured print titles and keep an eye on a bookshelf that
                keeps growing.
              </p>
            </article>
            <article className="roadmap__step">
              <h3>3. Play</h3>
              <p>
                Build reading, typing, and number skills with games made to feel
                inviting instead of overwhelming.
              </p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
