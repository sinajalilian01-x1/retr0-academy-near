import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://w3hschool.vercel.app/sitemap.xml",
    host: "https://w3hschool.vercel.app",
  };
}
