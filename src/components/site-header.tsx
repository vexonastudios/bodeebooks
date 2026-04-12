import Link from "next/link";

import { siteConfig } from "@/lib/site-config";

const navItems = [
  { href: "/audiobooks", label: "Audiobooks" },
  { href: "/books", label: "Books" },
  { href: "/games", label: "Games" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/">
          <span className="brand__eyebrow">Stories to hear, read, and play</span>
          <span className="brand__name">{siteConfig.name}</span>
        </Link>

        <nav aria-label="Primary" className="site-nav">
          {navItems.map((item) => (
            <Link className="site-nav__link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <a
            className="button button--ghost"
            href={siteConfig.youtubeUrl}
            rel="noreferrer"
            target="_blank"
          >
            YouTube Channel
          </a>
        </nav>
      </div>
    </header>
  );
}
