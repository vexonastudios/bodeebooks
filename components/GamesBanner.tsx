import Link from "next/link";
import { Gamepad2, Play } from "lucide-react";
import styles from "./GamesBanner.module.css";

export default function GamesBanner() {
  const games = [
    {
      title: "Harvest Dash",
      category: "FARM RUN",
      players: "1-2 PLAYERS",
      desc: "Race out from the farmhouse, clear every field, and hit the correct answer blocks to keep the harvest moving.",
      color: "#e6601b", // orange-ish
      bg: "linear-gradient(180deg, #4ea3f2 0%, #2b7bc4 100%)", // blue sky
      iconUrl: "https://img.icons8.com/color/96/farm-house.png",
    },
    {
      title: "Duck Hunt Duel",
      category: "SHOOTER",
      players: "1-2 PLAYERS",
      desc: "Same duck. Two triggers. Race your opponent to shoot the same targets first in real time!",
      color: "#369d6f", // green
      bg: "linear-gradient(180deg, #1b3d2b 0%, #0d2116 100%)", // dark green
      iconUrl: "https://img.icons8.com/color/96/duck.png",
    },
    {
      title: "Spelling Bee",
      category: "SPELLING",
      players: "2-6 PLAYERS",
      desc: "Step up to the mic! Listen to the AI narrator dictate words and race to type them correctly for the highest score.",
      color: "#e6601b", // orange
      bg: "linear-gradient(180deg, #452187 0%, #2a0b5c 100%)", // purple
      iconUrl: "https://img.icons8.com/color/96/microphone.png",
    },
    {
      title: "Connect 4 Duel",
      category: "STRATEGY",
      players: "1-2 PLAYERS",
      desc: "Line up four of your chips vertically, horizontally, or diagonally. Play local multiplayer or against the bot!",
      color: "#3a56e4", // blue
      bg: "linear-gradient(180deg, #0f3d99 0%, #061e4f 100%)", // dark blue
      iconUrl: "https://img.icons8.com/color/96/connect4.png",
    }
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Play Educational Games</h2>
          <p className={styles.subtitle}>Test your typing and knowledge against AI or friends.</p>
        </div>
        <a href="https://typingflyinggame.vercel.app/" target="_blank" rel="noopener noreferrer" className={styles.viewAll}>
          View Games Hub <Gamepad2 size={16} />
        </a>
      </div>

      <div className={styles.grid}>
        {games.map((game) => (
          <a key={game.title} href="https://typingflyinggame.vercel.app/" target="_blank" rel="noopener noreferrer" className={styles.card}>
            <div className={styles.cardVisual} style={{ background: game.bg }}>
               <img src={game.iconUrl} alt={game.title} className={styles.cardIcon} />
            </div>
            <div className={styles.cardContent}>
              <div className={styles.badges}>
                <span className={styles.badge} style={{ color: game.color, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.3)" }}>
                  {game.category}
                </span>
                <span className={styles.badge} style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(0,0,0,0.3)" }}>
                  {game.players}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{game.title}</h3>
              <p className={styles.cardDesc}>{game.desc}</p>
              <div className={styles.playButton} style={{ backgroundColor: game.color }}>
                Play Now <Play size={12} fill="white" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
