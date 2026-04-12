export type PrintedBook = {
  title: string;
  author: string;
  format: string;
  availability: string;
  blurb: string;
  href?: string;
};

export type GameCardData = {
  title: string;
  audience: string;
  status: string;
  focus: string;
  description: string;
  href?: string;
};

export type FallbackAudiobook = {
  title: string;
  summary: string;
  publishedLabel: string;
  href: string;
};

export const featureStats = [
  {
    value: "Free audiobooks",
    label: "Settle in with full-length listens pulled from the latest Bodee Books releases."
  },
  {
    value: "Books to explore",
    label: "Browse featured print titles and a growing shelf of stories for young readers."
  },
  {
    value: "Games for kids",
    label: "Jump between reading, typing, and number games built for playful practice."
  }
] as const;

export const printedBooks: PrintedBook[] = [
  {
    title: "At Aboukir and Acre",
    author: "G. A. Henty",
    format: "Paperback",
    availability: "Available now",
    blurb:
      "A historical adventure set during Napoleon's Egyptian campaign, positioned here as the first featured print title in the new catalog.",
    href: "https://bodeebooks.com/at-aboukir-and-acre-a-story-of-napoleons-invasion-of-egypt/"
  },
  {
    title: "Collector Editions",
    author: "Bodee Books",
    format: "Paperback and hardcover",
    availability: "Coming soon",
    blurb:
      "Beautiful print editions and keepsake releases will join the shelf as the Bodee Books catalog grows."
  },
  {
    title: "Young Reader Favorites",
    author: "Curated classics",
    format: "Family reading shelf",
    availability: "Coming soon",
    blurb:
      "More family-friendly print titles are on the way, with room for classics, adventures, and beginner-friendly reads."
  }
];

export const games: GameCardData[] = [
  {
    title: "Learning to Read Lab",
    audience: "Ages 4-8",
    status: "Early reading",
    focus: "Phonics and word recognition",
    description:
      "A playful reading area for sound-first practice, simple matching, and confidence-building early literacy activities."
  },
  {
    title: "Typing Test WPM",
    audience: "Kids and adults",
    status: "Typing practice",
    focus: "Speed, rhythm, and accuracy",
    description:
      "A cleaner version of the current typing trainer with stronger visuals, progress feedback, and room for custom passages."
  },
  {
    title: "Roman Numeral Quest",
    audience: "Elementary and middle school",
    status: "Number puzzle",
    focus: "Number fluency",
    description:
      "A fast-recall practice game where players decode, build, and race through Roman numeral challenges."
  },
  {
    title: "Story Memory Match",
    audience: "Family play",
    status: "Memory game",
    focus: "Pattern recall",
    description:
      "A lightweight matching game lane that fits naturally beside the reading and audiobook side of the brand."
  }
];

export const fallbackAudiobooks: FallbackAudiobook[] = [
  {
    title: "Channel Spotlight",
    summary:
      "When YouTube responds normally, the newest audiobook releases appear here automatically from the Bodee Books channel.",
    publishedLabel: "Fallback content",
    href: "https://www.youtube.com/@bodeebooks"
  },
  {
    title: "Free Audiobook Premiere Lane",
    summary:
      "This fallback keeps the page populated even if the public feed is temporarily unavailable during a build or request.",
    publishedLabel: "Resilient rendering",
    href: "https://www.youtube.com/@bodeebooks"
  },
  {
    title: "Always-On Catalog Hook",
    summary:
      "The site is designed to keep pointing visitors toward the channel and the audiobook library even when upstream fetches fail.",
    publishedLabel: "Graceful degradation",
    href: "https://www.youtube.com/@bodeebooks"
  }
];
