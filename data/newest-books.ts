import booksData from "./books.json";

const newestSlugs = [
  "ted-scott-first-stop-honolulu",
  "lazy-robert",
  "falsely-accused-out-of-the-depths",
  "alone-in-london",
  "toby-tyler",
];

export const newestBooks = newestSlugs
  .map((slug) => booksData.find((book) => book.slug === slug))
  .filter((book) => book !== undefined);
