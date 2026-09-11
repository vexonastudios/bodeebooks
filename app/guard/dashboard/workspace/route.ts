import { auth, currentUser } from "@clerk/nextjs/server";
import { cloudApi, CloudApiError } from "../cloud-api";
import workspace from "../generated/workspace.json";
import mediaPanels from "../generated/media.json";
import { dashboardNotice } from "../dashboardNotice";
import { dashboardLoading } from "../dashboardLoading";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'none'; script-src 'self' https://www.youtube.com https://s.ytimg.com; connect-src 'self' wss://bodeeguard-cloud-assets.james-7f8.workers.dev https://www.youtube.com https://noembed.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' blob: https://fonts.gstatic.com; worker-src 'self'; img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://bodeeguard-cloud-assets.james-7f8.workers.dev; media-src blob: https://bodeeguard-cloud-assets.james-7f8.workers.dev; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'",
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
      .replace('<main class="main-content">', `<main class="main-content cloud-startup-loading" aria-busy="true">${dashboardLoading}`)
      .replace('</head>', '<link rel="stylesheet" href="/guard-admin/cloud-dashboard-loading.css?v=20260910-loading1"></head>')
      .replace('</head>', '<link id="cloud-subject-editor-style" rel="stylesheet" href="/guard-admin/cloud-school-editor.css?v=20260910-wide1"></head>')
      .replace('</head>', '<link rel="stylesheet" href="/guard-admin/cloud-student-profile.css?v=20260910-photos1"><link rel="stylesheet" href="/guard-admin/cloud-screenshots.css?v=20260910-cards1"></head>')
      .replace('/guard-admin/cloud-games.css"', '/guard-admin/cloud-games.css?v=20260910-windows1"')
      .replace(/<section class="tab-content" id="tab-family-games"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-family-games" aria-label="Family Games"><div id="cloud-family-games"></div></section>')
      .replace(/<button\b(?=[^>]*data-tab="science-spelling")[\s\S]*?<\/button>/, '')
      .replace(/<section class="tab-content" id="tab-science-spelling"[\s\S]*?<\/section>/, '')
      .replace(/(<div id="admin-badge-name"[^>]*>)[\s\S]*?(<\/div>)/, (_match, start, end) => `${start}${escapeHtml(name)}${end}`)
      .replace(/<section class="tab-content" id="tab-coloring-studio"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-coloring-studio" aria-label="Coloring Studio"><div id="cloud-coloring-studio"></div></section>')
      .replace(/<section class="tab-content" id="tab-math-coach"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-math-coach" aria-label="Math Coach"><div id="cloud-math-coach"></div></section>')
      .replace('<script type="module" src="/guard-admin/cloud-workspace.js"></script>', '<script type="module" src="/guard-admin/cloud-workspace.js?v=20260910-windows1"></script>')
      .replace(/<section class="tab-content" id="tab-documents"[\s\S]*?<\/section>/, '<section class="tab-content" id="tab-documents" aria-label="Documents"></section>')
      .replace('</head>', '<link rel="stylesheet" href="/guard-admin/cloud-documents.css?v=20260910-documents1"><link rel="stylesheet" href="/guard-admin/media-learning-videos.css"><link rel="stylesheet" href="/guard-admin/media-family-watch.css"><script src="/guard-admin/media-defaults.js"></script><script type="module" src="/guard-admin/cloud-media-admin.js?v=20260910-visible1"></script><link rel="stylesheet" href="/guard-admin/cloud-coloring-studio.css"><link rel="stylesheet" href="/guard-admin/cloud-math-coach.css?v=20260910b"><link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width: 900px), (pointer: coarse) and (max-width: 1180px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css?v=20260910-plan1"><link rel="stylesheet" href="/guard-admin/cloud-spelling-photos.css?v=20260910-prompt1"></head>')
      .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    return new Response(html, { headers });
  } catch (error) {
    return notice(error instanceof CloudApiError ? error.message : "BodeeGuard is temporarily unavailable.", error instanceof CloudApiError ? error.status : 503);
  }
}
