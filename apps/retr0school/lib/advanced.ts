import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Bonus lessons for diploma holders. Kept outside content/ so they are not a regular public track. */
const DIR = path.join(process.cwd(), "content-advanced");

export type AdvancedLesson = { slug: string; title: string; description: string; order: number; body: string };

export function getAdvancedLessons(): AdvancedLesson[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => /^\d{2}-[a-z0-9-]+\.mdx$/.test(f))
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
      return {
        slug: f.slice(3, -4),
        title: String(data.title),
        description: String(data.description),
        order: Number(data.order),
        body: content,
      };
    })
    .sort((a, b) => a.order - b.order);
}
