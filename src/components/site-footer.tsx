import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__title">{siteConfig.name}</p>
          <p className="site-footer__copy">
            A growing home for classic stories, family listening, featured books,
            and playful learning for curious kids.
          </p>
        </div>

        <div className="site-footer__links">
          <Link href="/audiobooks">Audiobooks</Link>
          <Link href="/books">Books</Link>
          <Link href="/games">Games</Link>
          <a href={siteConfig.youtubeUrl} rel="noreferrer" target="_blank">
            YouTube
          </a>
        </div>
      </div>
    </footer>
  );
}
