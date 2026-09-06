// One application and identity store, with a separate address for parent work.
export const GUARD_ORIGIN = "https://guard.bodeebooks.com";
export const BOOKS_ORIGIN = "https://www.bodeebooks.com";
export const isGuardHost = (host: string | null) => host?.toLowerCase() === "guard.bodeebooks.com";
const appRoute = /^\/(?:account|activate|dashboard|sign-in|sign-up)(?:\/|$)|^\/download\/windows(?:\/|$)/;
const pageRoute = /^\/(?:account|activate|dashboard)\/?$|^\/(?:sign-in|sign-up)(?:\/|$)|^\/download\/windows\/?$/;

export function guardReturnPath(value: string | null, fallback = "/dashboard/") {
  if (!value || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, GUARD_ORIGIN);
    if (![GUARD_ORIGIN, BOOKS_ORIGIN, "https://bodeebooks.com"].includes(url.origin) || url.username || url.password) return fallback;
    const pathname = url.pathname.replace(/^\/guard(?=\/|$)/, "");
    if (!pageRoute.test(pathname) || /^\/sign-(?:in|up)(?:\/|$)/.test(pathname)) return fallback;
    return pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function guardRoute(value: string, method = "GET", redirectLegacy = false): { kind: "rewrite" | "redirect"; url: string } | null {
  const url = new URL(value), read = method === "GET" || method === "HEAD";
  const guard = url.origin === GUARD_ORIGIN;
  const books = [BOOKS_ORIGIN, "https://bodeebooks.com"].includes(url.origin);
  const legacyPath = url.pathname.replace(/^\/guard(?=\/|$)/, "");
  const legacyPage = legacyPath !== url.pathname && pageRoute.test(legacyPath);
  if (read && ((guard && legacyPage) || (books && redirectLegacy && legacyPage))) {
    const destination = new URL(legacyPath + url.search, GUARD_ORIGIN);
    if (destination.searchParams.has("redirect_url")) destination.searchParams.set("redirect_url", guardReturnPath(destination.searchParams.get("redirect_url")));
    return { kind: "redirect", url: destination.href };
  }
  if (!guard) return null; // Do not rewrite the bookstore, preview hosts or lookalikes.
  if (read && (url.pathname === "/guard" || url.pathname === "/guard/")) return { kind: "redirect", url: BOOKS_ORIGIN + "/guard/" + url.search };
  if (url.pathname === "/") url.pathname = "/guard/dashboard/";
  else if (appRoute.test(url.pathname)) url.pathname = "/guard" + url.pathname;
  else return null;
  // POSTs are rewritten within the SAME origin, never redirected across hosts.
  // Every destination retains its own Clerk/household/CSRF checks.
  return { kind: "rewrite", url: url.href };
}
