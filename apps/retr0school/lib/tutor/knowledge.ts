import "server-only";

import { getAdvancedLessons } from "@/lib/advanced";
import { getLessons, getListedTracks } from "@/lib/content";
import { getGuides } from "@/lib/guides";

/**
 * Retr0 Tutor knowledge base: every public lesson, split into sections.
 * Never includes quiz.json files, the final-exam bank, or holder-locked Advanced NEAR lessons.
 */
export type Chunk = {
  href: string;
  lessonTitle: string;
  trackTitle: string;
  heading: string;
  text: string;
  terms: Map<string, number>;
  length: number;
};

const STOP = new Set(
  "a an and are as at be but by can do does for from how i if in into is it its me my of on or so that the their them then there these this to was we what when where which who why will with you your yours not no use using used get make".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_]+(?:[-.][a-z0-9_]+)*/g) ?? [])
    .flatMap((t) => (t.includes("-") || t.includes(".") ? [t, ...t.split(/[-.]/)] : [t]))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Turn a <TryIt ... /> block into a short "Example" code block. Scans template literals so a `/>` inside code does not end it. */
function flattenTryIt(body: string): string {
  let out = "";
  let i = 0;
  while (true) {
    const start = body.indexOf("<TryIt", i);
    if (start < 0) break;
    out += body.slice(i, start);
    let j = start;
    let inTick = false;
    while (j < body.length) {
      const ch = body[j];
      if (ch === "`") inTick = !inTick;
      else if (!inTick && ch === "/" && body[j + 1] === ">") break;
      j++;
    }
    const block = body.slice(start, j);
    const parts: string[] = [];
    for (const m of block.matchAll(/(html|css|js)=\{`([\s\S]*?)`\}/g)) {
      const code = m[2].trim();
      if (code) parts.push(`${m[1].toUpperCase()}:\n${code.length > 700 ? code.slice(0, 700) + "\n…" : code}`);
    }
    if (parts.length) out += `\nExample:\n\`\`\`\n${parts.join("\n")}\n\`\`\`\n`;
    i = j + 2;
  }
  return out + body.slice(i);
}

function clean(body: string): string {
  return flattenTryIt(body)
    .replace(/^import .*$/gm, "")
    .replace(/^## Sources[\s\S]*$/m, "")
    .replace(/<Anim[^>]*\/>/g, "")
    .replace(/<\/?(Note|Tip|Warning|Anim|CodeSample|TryItLauncher|CodeEStarter)[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function split(body: string): { heading: string; text: string }[] {
  const sections: { heading: string; text: string }[] = [];
  let heading = "";
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text.length > 40) sections.push({ heading, text: text.length > 2600 ? text.slice(0, 2600) + "…" : text });
    buf = [];
  };
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    const m = !inFence && /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[2].trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return sections;
}

function count(tokens: string[]) {
  const map = new Map<string, number>();
  for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
  return map;
}

let cached: { chunks: Chunk[]; df: Map<string, number>; avg: number } | null = null;

function build() {
  if (cached) return cached;
  const chunks: Chunk[] = [];
  const push = (href: string, lessonTitle: string, trackTitle: string, description: string, body: string, tags: string[]) => {
    for (const s of split(clean(body))) {
      const heading = s.heading || lessonTitle;
      const tokens = tokenize(`${lessonTitle} ${lessonTitle} ${heading} ${heading} ${tags.join(" ")} ${description} ${s.text}`);
      chunks.push({ href, lessonTitle, trackTitle, heading, text: s.text, terms: count(tokens), length: tokens.length });
    }
  };
  for (const track of getListedTracks()) {
    for (const lesson of getLessons(track.slug)) {
      push(`/${track.slug}/${lesson.slug}`, lesson.title, track.title, lesson.description, lesson.body, lesson.tags);
    }
  }
  for (const lesson of getAdvancedLessons()) {
    if (lesson.locked) continue;
    push(`/advanced/${lesson.slug}`, lesson.title, "Advanced NEAR", lesson.description, lesson.body, []);
  }
  for (const guide of getGuides()) {
    push(`/guides/${guide.slug}`, guide.title, "Guides", guide.description, guide.body, guide.tags);
  }
  const df = new Map<string, number>();
  for (const c of chunks) for (const t of c.terms.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avg = chunks.reduce((n, c) => n + c.length, 0) / Math.max(1, chunks.length);
  cached = { chunks, df, avg };
  return cached;
}

/** BM25 over lesson sections. The page the learner is on gets a boost. */
export function retrieve(query: string, currentPath: string | null, k = 4): Chunk[] {
  const { chunks, df, avg } = build();
  const q = [...new Set(tokenize(query))];
  const N = chunks.length;
  const scored = chunks.map((c) => {
    let score = 0;
    for (const t of q) {
      const tf = c.terms.get(t);
      if (!tf) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (c.length / avg)));
    }
    if (currentPath && c.href === currentPath) score = score * 1.6 + 1.5;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked: Chunk[] = [];
  const perLesson = new Map<string, number>();
  for (const { c, score } of scored) {
    if (score <= 0.5 || picked.length >= k) break;
    const n = perLesson.get(c.href) ?? 0;
    // Guides are long single docs, so they may contribute one more section than a lesson.
    if (n >= (c.href.startsWith("/guides/") ? 3 : 2)) continue;
    perLesson.set(c.href, n + 1);
    picked.push(c);
  }
  return picked;
}

/** Title of the lesson at a path, for "you are on …" context. */
export function lessonAt(path: string | null): { title: string; trackTitle: string } | null {
  if (!path) return null;
  const hit = build().chunks.find((c) => c.href === path);
  return hit ? { title: hit.lessonTitle, trackTitle: hit.trackTitle } : null;
}
