import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { guardRoute, GUARD_ORIGIN } from "./shared/guard-domain";

export default clerkMiddleware((_auth, request) => {
  const route = guardRoute(request.url, request.method, process.env.BODEEGUARD_APP_REDIRECTS_ENABLED === "true");
  if (!route) return NextResponse.next();
  const response = route.kind === "rewrite" ? NextResponse.rewrite(route.url) : NextResponse.redirect(route.url, 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}, request => new URL(request.url).origin === GUARD_ORIGIN ? {
  signInUrl: GUARD_ORIGIN + "/sign-in/",
  signUpUrl: GUARD_ORIGIN + "/sign-up/",
} : {});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
