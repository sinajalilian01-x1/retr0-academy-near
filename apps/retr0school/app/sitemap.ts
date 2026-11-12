import type { MetadataRoute } from "next";
import { getLessons, getTracks } from "@/lib/content";

const SITE = "https://w3hschool.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const tracks = getTracks();
  const pages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/tryit`, changeFrequency: "monthly", priority: 0.6 },
  ];

  for (const track of tracks) {
    pages.push({ url: `${SITE}/${track.slug}`, changeFrequency: "weekly", priority: 0.8 });
    for (const lesson of getLessons(track.slug)) {
      pages.push({
        url: `${SITE}/${track.slug}/${lesson.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
    pages.push({ url: `${SITE}/${track.slug}/quiz`, changeFrequency: "monthly", priority: 0.5 });
  }

  return pages;
}
