import type { Metadata } from "next";

import { BookCard } from "@/components/cards";
import { printedBooks } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Books",
  description:
    "Printed books and future catalog structure for the Bodee Books migration."
};

export default function BooksPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Printed catalog</p>
            <h1 className="page-header__title">A print shelf that can grow without redesigning the site.</h1>
            <p className="page-header__copy">
              The printed books area stays simple for now, but the new structure is
              ready for spotlight titles, collector editions, and future series.
            </p>
          </div>
        </header>

        <div className="grid grid--3">
          {printedBooks.map((book) => (
            <BookCard book={book} key={book.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
