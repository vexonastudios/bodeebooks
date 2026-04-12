import type { Metadata } from "next";

import { GameCard } from "@/components/cards";
import { games } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Games",
  description:
    "A future-ready games area for learning to read, typing practice, Roman numerals, and other kid-friendly projects."
};

export default function GamesPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Games area</p>
            <h1 className="page-header__title">Reading games deserve their own destination.</h1>
            <p className="page-header__copy">
              Rather than hiding game ideas across the site, this lane gives them a
              visible home so new educational projects can ship one by one.
            </p>
          </div>
        </header>

        <div className="grid grid--2">
          {games.map((game) => (
            <GameCard game={game} key={game.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
