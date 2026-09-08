import { auth, currentUser } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
import workspace from "../generated/workspace.json";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; media-src blob:; frame-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
};
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function notice(message: string, status: number) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BodeeGuard dashboard</title><body><h1>BodeeGuard Parent Dashboard</h1><p>${escapeHtml(message)}</p><a href="/guard/account/" target="_top">Back to parent account</a></body></html>`, { status, headers });
}
export async function GET(request: Request) {
  if (!(await auth()).isAuthenticated) return notice("Please sign in to your parent account again.", 401);
  if (request.headers.get("sec-fetch-dest") === "document") {
    // The outer page maintains Clerk session renewal for long school days.
    return Response.redirect(new URL("/guard/dashboard/", request.url), 307);
  }
  try {
    // Server-side household/complimentary Beta gate before serving the shell.
    await cloudApi();
    const user = await currentUser();
    const name = user?.firstName?.trim() || user?.fullName?.trim() || "Parent account";
    const html = workspace.html
      .replace(/<section class="tab-content" id="tab-music"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-music"><div class="tab-header"><h1>Music</h1></div><p class="cloud-note">Review the music your children can play. Hide any item to remove access.</p><div id="cloud-music-library"></div></section>')
      .replace(/<section class="tab-content" id="tab-videos"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-videos"><div class="tab-header"><h1>Videos</h1></div><p class="cloud-note">Review the videos your children can watch. Hide any item to remove access.</p><div id="cloud-video-library"></div></section>')
      .replace(/<section class="tab-content" id="tab-learning-videos"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-learning-videos"><div class="tab-header"><h1>Learning Videos</h1></div><p class="cloud-note">Your approved lessons, organized by folder.</p><div id="cloud-learning-videos"></div></section>')
      .replace(/(<div id="admin-badge-name"[^>]*>)[\s\S]*?(<\/div>)/, (_match, start, end) => `${start}${escapeHtml(name)}${end}`)
      .replace(/<section class="tab-content" id="tab-coloring-studio"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-coloring-studio" aria-label="Coloring Studio"><div id="cloud-coloring-studio"></div></section>')
      .replace(/<section class="tab-content" id="tab-math-coach"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-math-coach" aria-label="Math Coach"><div id="cloud-math-coach"></div></section>')
      .replace('</head>', '<link rel="stylesheet" href="/guard-admin/cloud-coloring-studio.css"><link rel="stylesheet" href="/guard-admin/cloud-math-coach.css"><link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width: 900px), (pointer: coarse) and (max-width: 1180px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
      .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    return new Response(html, { headers });
  } catch (error) {
    return notice(error instanceof CloudApiError ? error.message : "Cloud management could not be reached. Your current installation and family records are unchanged.", error instanceof CloudApiError ? error.status : 503);
  }
}
