import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com"
      }
    ]
  },
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
