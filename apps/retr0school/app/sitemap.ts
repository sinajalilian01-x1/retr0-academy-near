import type { MetadataRoute } from "next";
import { getLessons, getListedTracks } from "@/lib/content";
import { getGuides } from "@/lib/guides";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://retr0school-near.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const tracks = getListedTracks();
  const pages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/playground`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/diploma`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/verify`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/leaderboard`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/proof`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/advanced`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/near`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/near/quiz`, changeFrequency: "weekly", priority: 0.7 },
    ...getGuides().map((g) => ({ url: `${SITE}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
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
