import Link from "next/link";

import type { GameCardData, PrintedBook } from "@/data/site-content";
import { type AudiobookEntry, getAudiobookPath } from "@/lib/youtube";

import { AudiobookPosterLink } from "@/components/audiobook-poster-link";

export function AudiobookCard({ item }: { item: AudiobookEntry }) {
  const detailHref = item.videoId ? getAudiobookPath(item) : null;

  return (
    <article className="card card--media">
      {detailHref ? (
        <AudiobookPosterLink
          href={detailHref}
          thumbnailUrl={
            item.thumbnailUrl || `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
          }
          title={item.title}
        />
      ) : (
        <div className="media-placeholder">
          <p className="media-placeholder__badge">Fallback</p>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
        </div>
      )}

      <div className="card__body">
        <p className="card__meta">{item.publishedLabel}</p>
        {detailHref ? (
          <Link className="card__title-link" href={detailHref}>
            <h3 className="card__title">{item.title}</h3>
          </Link>
        ) : (
          <h3 className="card__title">{item.title}</h3>
        )}
        <p className="card__copy">{item.summary}</p>
        {detailHref ? (
          <Link className="text-link" href={detailHref}>
            Open audiobook page
          </Link>
        ) : (
          <a className="text-link" href={item.href} rel="noreferrer" target="_blank">
            Visit the YouTube channel
          </a>
        )}
      </div>
    </article>
  );
}

export function BookCard({ book }: { book: PrintedBook }) {
  return (
    <article className="card">
      <div className="card__body">
        <p className="card__meta">
          {book.format} / {book.availability}
        </p>
        <h3 className="card__title">{book.title}</h3>
        <p className="card__copy">by {book.author}</p>
        <p className="card__copy">{book.blurb}</p>
        {book.href ? (
          <a className="text-link" href={book.href} rel="noreferrer" target="_blank">
            View current listing
          </a>
        ) : (
          <span className="inline-note">More print titles are on the way.</span>
        )}
      </div>
    </article>
  );
}

export function GameCard({ game }: { game: GameCardData }) {
  return (
    <article className="card">
      <div className="card__body">
        <div className="pill-row">
          <span className="pill">{game.status}</span>
          <span className="pill pill--soft">{game.audience}</span>
        </div>
        <h3 className="card__title">{game.title}</h3>
        <p className="card__copy">{game.description}</p>
        <p className="card__meta">Focus: {game.focus}</p>
        {game.href ? (
          <a className="text-link" href={game.href}>
            Open game
          </a>
        ) : (
          <span className="inline-note">More playful challenges are coming soon.</span>
        )}
      </div>
    </article>
  );
}
