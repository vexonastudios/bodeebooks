"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const subscribe = () => () => {};
// Private parent routes never load bookstore analytics or transmit pairing,
// billing or authentication query strings. Public books stay statically rendered.
export default function PublicSiteAnalytics() {
  const pathname = usePathname();
  const onBooks = useSyncExternalStore(subscribe,
    () => ["www.bodeebooks.com", "bodeebooks.com"].includes(window.location.hostname), () => false);
  if (!onBooks || /^\/guard(?:\/|$)/.test(pathname || "")) return null;
  return <>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-JLFF3WR5NW" strategy="afterInteractive" />
    <Script id="google-analytics" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-JLFF3WR5NW');
    `}</Script>
    <Script src="/bodee-analytics.js" strategy="afterInteractive" />
  </>;
}
