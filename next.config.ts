import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  // Public build identity, frozen into both the loaded client and release route.
  env: { NEXT_PUBLIC_GUARD_RELEASE: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "local" },
  async headers() {
    return [{ source: "/guard-parent-sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" }
    ] }, { source: "/guard-parent.webmanifest", headers: [
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
    ] }, { source: "/guard-admin/:path*", headers: [
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" }
    ] }, { source: "/guard-admin/family-games/v1/:file*", headers: [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
    ] }];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
