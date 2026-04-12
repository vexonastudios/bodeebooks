import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <p className="site-footer__title">{siteConfig.name}</p>
          <p className="site-footer__copy">
            Built for a GitHub to Vercel publishing flow with room for audiobooks,
            books, and game releases to grow side by side.
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
