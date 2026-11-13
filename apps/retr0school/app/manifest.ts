import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Retr0 Academy on NEAR",
    short_name: "Retr0 Academy",
    description: "Practical tutorials for HTML, CSS, JavaScript, and Web3.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0b1a",
    theme_color: "#ff3fa4",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
