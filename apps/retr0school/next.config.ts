import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: [
    "shiki",
    "@shikijs/core",
    "@shikijs/engine-javascript",
    "@shikijs/langs",
    "@shikijs/themes",
  ],
};

export default nextConfig;
