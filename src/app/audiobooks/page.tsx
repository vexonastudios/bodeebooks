import type { Metadata } from "next";

import { AudiobookCard } from "@/components/cards";
import { getLatestAudiobooks } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Audiobooks",
  description:
    "Latest audiobook releases from the Bodee Books YouTube channel, surfaced automatically in the Next.js site."
};

export default async function AudiobooksPage() {
  const audiobookFeed = await getLatestAudiobooks(9);

  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Audiobook lane</p>
            <h1 className="page-header__title">New YouTube uploads belong here immediately.</h1>
            <p className="page-header__copy">
              This page is designed to become the always-current library shelf for
              audiobook launches. The cards below are fed from the public YouTube
              channel, then gracefully fall back if that upstream feed is temporarily
              unavailable.
            </p>
          </div>
        </header>

        <p className="page-note">
          Current source:{" "}
          <strong>
            {audiobookFeed.source === "youtube"
              ? "Live YouTube feed"
              : "Fallback content while feed access recovers"}
          </strong>
          .
        </p>

        <div className="grid grid--3">
          {audiobookFeed.items.map((item) => (
            <AudiobookCard item={item} key={item.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
