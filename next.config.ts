import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async headers() {
    return [{ source: "/guard-parent-sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" }
    ] }, { source: "/guard-admin/family-games/v1/:file*", headers: [
      { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
    ] }];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
