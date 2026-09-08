import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  async headers() {
    return [{ source: "/guard-parent-sw.js", headers: [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Service-Worker-Allowed", value: "/" }
    ] }];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
