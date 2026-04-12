import type { Metadata } from "next";

import { BookCard } from "@/components/cards";
import { printedBooks } from "@/data/site-content";

export const metadata: Metadata = {
  title: "Books",
  description:
    "Featured Bodee Books print titles, collector editions, and stories for family bookshelves."
};

export default function BooksPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="page-header">
          <div>
            <p className="section-heading__eyebrow">Printed catalog</p>
            <h1 className="page-header__title">A growing shelf of stories worth keeping.</h1>
            <p className="page-header__copy">
              Explore featured print titles, collector editions, and more stories
              joining the Bodee Books shelf over time.
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
