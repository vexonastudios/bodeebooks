import type { GameCardData, PrintedBook } from "@/data/site-content";
import type { AudiobookEntry } from "@/lib/youtube";

function EmbeddedPlayer({ title, videoId }: { title: string; videoId: string }) {
  return (
    <div className="video-frame">
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
      />
    </div>
  );
}

export function AudiobookCard({ item }: { item: AudiobookEntry }) {
  return (
    <article className="card card--media">
      {item.videoId ? (
        <EmbeddedPlayer title={item.title} videoId={item.videoId} />
      ) : (
        <div className="media-placeholder">
          <p className="media-placeholder__badge">Fallback</p>
          <h3>{item.title}</h3>
          <p>{item.summary}</p>
        </div>
      )}

      <div className="card__body">
        <p className="card__meta">{item.publishedLabel}</p>
        <h3 className="card__title">{item.title}</h3>
        <p className="card__copy">{item.summary}</p>
        <a className="text-link" href={item.href} rel="noreferrer" target="_blank">
          Watch on YouTube
        </a>
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
          <span className="inline-note">Placeholder ready for the next print launch.</span>
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
          <span className="inline-note">Structured as a landing spot for the rebuild.</span>
        )}
      </div>
    </article>
  );
}
