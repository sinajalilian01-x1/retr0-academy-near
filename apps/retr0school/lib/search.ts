import type { SearchEntry } from "@/lib/types";

export function searchLessons(entries: SearchEntry[], query: string): SearchEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return entries
    .map((entry) => {
      const title = entry.title.toLowerCase();
      const haystack = `${title} ${entry.description} ${entry.tags.join(" ")} ${entry.trackTitle} ${entry.text}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (!haystack.includes(term)) return { entry, score: 0 };
        score += title.includes(term) ? 5 : 1;
        if (entry.tags.some((tag) => tag.toLowerCase().includes(term))) score += 2;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((item) => item.entry);
}
