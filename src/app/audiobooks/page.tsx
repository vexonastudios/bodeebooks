import type { Metadata } from "next";

import { AudiobookCard } from "@/components/cards";
import { getLatestAudiobooks } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Audiobooks",
  description:
    "Browse the latest Bodee Books audiobooks, from classic adventures to family-friendly listens."
};

export default async function AudiobooksPage() {
  const audiobookFeed = await getLatestAudiobooks(9);

  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Featured audiobooks</p>
            <h1 className="page-header__title">Press play on your next favorite story.</h1>
            <p className="page-header__copy">
              Browse the latest Bodee Books listens, then open any story page for a
              cleaner listening view, a quick summary, and a player ready when you are.
            </p>
          </div>
        </header>

        <div className="grid grid--3">
          {audiobookFeed.items.map((item) => (
            <AudiobookCard item={item} key={item.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
