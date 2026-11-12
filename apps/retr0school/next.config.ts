import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The diploma art route reads this font from disk at runtime.
  outputFileTracingIncludes: {
    "/api/diploma/[track]/[account]": ["./assets/fonts/PressStart2P-Regular.ttf"],
    "/d/[account]": ["./assets/fonts/PressStart2P-Regular.ttf"],
  },
  serverExternalPackages: [
    "shiki",
    "@shikijs/core",
    "@shikijs/engine-javascript",
    "@shikijs/langs",
    "@shikijs/themes",
  ],
};

export default nextConfig;
