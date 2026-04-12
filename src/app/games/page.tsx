import type { Metadata } from "next";

import { GameCard } from "@/components/cards";
import { games } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Games",
  description:
    "Kid-friendly Bodee Books games for reading, typing, number play, and family learning."
};

export default function GamesPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Games area</p>
            <h1 className="page-header__title">Playful practice for growing readers.</h1>
            <p className="page-header__copy">
              Explore quick games for reading, typing, memory, and number
              confidence, with more family-friendly challenges on the way.
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
