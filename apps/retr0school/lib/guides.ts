import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** Background guides (not courses): extra grounded knowledge for the tutor, each with its own page. */
export type Guide = { slug: string; title: string; description: string; tags: string[]; updated: string; body: string };

const DIR = path.join(process.cwd(), "content-guides");
const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;

let cache: Guide[] | null = null;

export function getGuides(): Guide[] {
  if (cache) return cache;
  if (!fs.existsSync(DIR)) return (cache = []);
  cache = fs
    .readdirSync(DIR)
    .filter((f) => FILE.test(f))
    .sort()
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
      return {
        slug: f.replace(/\.mdx$/, ""),
        title: String(data.title ?? f),
        description: String(data.description ?? ""),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        updated: String(data.updated ?? ""),
        body: content,
      };
    });
  return cache;
}

export function getGuide(slug: string): Guide | null {
  return getGuides().find((g) => g.slug === slug) ?? null;
}
