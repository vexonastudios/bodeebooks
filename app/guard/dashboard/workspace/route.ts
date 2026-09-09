import { auth, currentUser } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
import workspace from "../generated/workspace.json";
import mediaPanels from "../generated/media.json";
import { dashboardNotice } from "../dashboardNotice";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'; script-src 'self' https://www.youtube.com https://s.ytimg.com; connect-src 'self' wss://bodeeguard-cloud-assets.james-7f8.workers.dev https://www.youtube.com https://noembed.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://bodeeguard-cloud-assets.james-7f8.workers.dev; media-src blob: https://bodeeguard-cloud-assets.james-7f8.workers.dev; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
};
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function notice(message: string, status: number) {
  return new Response(dashboardNotice(message, status), { status, headers });
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
    const html = Object.entries(mediaPanels).reduce((html,[id,panel]) => html.replace(new RegExp(`<section class="tab-content" id="tab-${id}"[\\s\\S]*?<\\/section>`),panel),workspace.html)
      .replace('<h2>Computer setup &amp; offline recovery</h2><p>Assign students and save a recovery code for each cloud test computer from Overview. The code must be confirmed on that computer before school starts.</p>', '<h2>Computers &amp; Parent password</h2><p>Assign a child to each computer in Overview. Set one Parent password for your family; it also works offline.</p>')



      .replace(/(<div id="admin-badge-name"[^>]*>)[\s\S]*?(<\/div>)/, (_match, start, end) => `${start}${escapeHtml(name)}${end}`)
      .replace(/<section class="tab-content" id="tab-coloring-studio"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-coloring-studio" aria-label="Coloring Studio"><div id="cloud-coloring-studio"></div></section>')
      .replace(/<section class="tab-content" id="tab-math-coach"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-math-coach" aria-label="Math Coach"><div id="cloud-math-coach"></div></section>')
      .replace('</head>', '<link rel="stylesheet" href="/guard-admin/media-learning-videos.css"><link rel="stylesheet" href="/guard-admin/media-family-watch.css"><script src="/guard-admin/media-defaults.js"></script><script type="module" src="/guard-admin/cloud-media-admin.js"></script><link rel="stylesheet" href="/guard-admin/cloud-coloring-studio.css"><link rel="stylesheet" href="/guard-admin/cloud-math-coach.css"><link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width: 900px), (pointer: coarse) and (max-width: 1180px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>')
      .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    return new Response(html, { headers });
  } catch (error) {
    return notice(error instanceof CloudApiError ? error.message : "BodeeGuard is temporarily unavailable.", error instanceof CloudApiError ? error.status : 503);
  }
}
