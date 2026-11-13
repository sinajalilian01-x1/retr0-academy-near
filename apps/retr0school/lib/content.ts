import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Lesson, LessonSummary, NavItem, QuizQuestion, SearchEntry, Track } from "@/lib/types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PREFERRED_ORDER = ["fundamentals", "contracts", "tokens", "dapp", "html", "css", "javascript", "html-advanced", "css-advanced", "js-advanced", "near"];
const LESSON_FILE = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.mdx$/;
const RESERVED_SLUGS = new Set(["quiz"]);

function fail(message: string): never {
  throw new Error(message);
}

export function toPlainText(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readingMinutes(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function getTrackSlugs() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const slugs = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(CONTENT_DIR, entry.name, "_track.json")))
    .map((entry) => entry.name);

  return slugs.sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a);
    const bi = PREFERRED_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function getTrack(slug: string): Track | null {
  const file = path.join(CONTENT_DIR, slug, "_track.json");
  if (!fs.existsSync(file)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail(`content/${slug}/_track.json is not valid JSON`);
  }
  if (!raw || typeof raw !== "object") fail(`content/${slug}/_track.json must be an object`);
  const data = raw as Record<string, unknown>;
  for (const key of ["title", "description", "icon", "color"] as const) {
    if (typeof data[key] !== "string" || !data[key].trim()) {
      fail(`content/${slug}/_track.json is missing a non-empty "${key}"`);
    }
  }
  const group = data.group === "foundations" || data.group === "diploma" || data.group === "web3" ? data.group : slug === "html" || slug === "css" || slug === "javascript" ? "foundations" : slug === "near" ? "diploma" : "web3";
  const prerequisites = Array.isArray(data.prerequisites) ? data.prerequisites.filter((item): item is string => typeof item === "string") : [];
  return {
    slug,
    title: (data.title as string).trim(),
    description: (data.description as string).trim(),
    icon: (data.icon as string).trim(),
    color: (data.color as string).trim(),
    group,
    listed: data.listed !== false,
    level: typeof data.level === "string" ? data.level.trim() : undefined,
    prerequisites,
    youWillBuild: typeof data.youWillBuild === "string" ? data.youWillBuild.trim() : undefined,
    overview: typeof data.overview === "string" ? data.overview.trim() : undefined,
  };
}

export function getTracks(): Track[] {
  return getTrackSlugs().map((slug) => {
    const track = getTrack(slug);
    if (!track) fail(`content/${slug}/_track.json could not be read`);
    return track;
  });
}

/** Courses shown in the Learn menu, homepage, and sitemap. The diploma quiz track is excluded. */
export function getListedTracks(): Track[] {
  return getTracks().filter((track) => track.listed);
}

export function getCourseTracks(): Track[] {
  return getListedTracks().filter((track) => track.group === "web3");
}

export function getFoundationTracks(): Track[] {
  return getListedTracks().filter((track) => track.group === "foundations");
}

export function getLessons(track: string): Lesson[] {
  const dir = path.join(CONTENT_DIR, track);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".mdx"));
  const lessons = files.map((name) => {
    const match = LESSON_FILE.exec(name);
    if (!match) {
      fail(
        `content/${track}/${name} must be named NN-slug.mdx, with a 2-digit order and a lowercase slug`,
      );
    }
    const fileOrder = Number(match[1]);
    const slug = match[2];
    if (RESERVED_SLUGS.has(slug)) fail(`content/${track}/${name} uses the reserved slug "${slug}"`);
    const full = path.join(dir, name);
    const parsed = matter(fs.readFileSync(full, "utf8"));
    const data = parsed.data as Record<string, unknown>;
    if (typeof data.title !== "string" || !data.title.trim()) {
      fail(`content/${track}/${name} is missing frontmatter title`);
    }
    if (typeof data.description !== "string" || !data.description.trim()) {
      fail(`content/${track}/${name} is missing frontmatter description`);
    }
    if (typeof data.order !== "number" || !Number.isInteger(data.order)) {
      fail(`content/${track}/${name} frontmatter order must be an integer`);
    }
    if (data.order !== fileOrder) {
      fail(`content/${track}/${name} filename order ${fileOrder} does not match frontmatter order ${data.order}`);
    }
    const tags = data.tags == null ? [] : data.tags;
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
      fail(`content/${track}/${name} tags must be an array of strings`);
    }
    const plainText = toPlainText(parsed.content);
    return {
      slug,
      title: data.title.trim(),
      description: data.description.trim(),
      order: data.order,
      tags,
      track,
      readingMinutes: readingMinutes(plainText),
      body: parsed.content,
      plainText,
    } satisfies Lesson;
  });

  const orders = new Set<number>();
  const slugs = new Set<string>();
  for (const lesson of lessons) {
    if (orders.has(lesson.order)) fail(`content/${track} has two lessons with order ${lesson.order}`);
    if (slugs.has(lesson.slug)) fail(`content/${track} has two lessons with slug ${lesson.slug}`);
    orders.add(lesson.order);
    slugs.add(lesson.slug);
  }

  return lessons.sort((a, b) => a.order - b.order);
}

export function getLesson(track: string, slug: string) {
  return getLessons(track).find((lesson) => lesson.slug === slug) ?? null;
}

export function toSummary(lesson: Lesson): LessonSummary {
  return {
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    order: lesson.order,
    tags: lesson.tags,
    track: lesson.track,
    readingMinutes: lesson.readingMinutes,
  };
}

export function getQuiz(track: string): QuizQuestion[] {
  const file = path.join(CONTENT_DIR, track, "quiz.json");
  if (!fs.existsSync(file)) fail(`content/${track}/quiz.json is missing`);
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail(`content/${track}/quiz.json is not valid JSON`);
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(`content/${track}/quiz.json must be a non-empty array`);
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") fail(`content/${track}/quiz.json item ${index} must be an object`);
    const question = item as Record<string, unknown>;
    if (typeof question.question !== "string" || !question.question.trim()) {
      fail(`content/${track}/quiz.json item ${index} is missing question`);
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.some((option) => typeof option !== "string")) {
      fail(`content/${track}/quiz.json item ${index} options must be an array of at least two strings`);
    }
    if (
      question.answer !== undefined &&
      (typeof question.answer !== "number" ||
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= question.options.length)
    ) {
      fail(`content/${track}/quiz.json item ${index} answer must be an index into options`);
    }
    if (typeof question.explanation !== "string" || !question.explanation.trim()) {
      fail(`content/${track}/quiz.json item ${index} is missing explanation`);
    }
    return {
      question: question.question.trim(),
      options: question.options,
      ...(typeof question.answer === "number" ? { answer: question.answer } : {}),
      explanation: question.explanation.trim(),
    };
  });
}

export function lessonSequence(track: string): NavItem[] {
  const lessons = getLessons(track);
  return [
    { href: `/${track}`, title: "Overview", key: "overview" },
    ...lessons.map((lesson) => ({
      href: `/${track}/${lesson.slug}`,
      title: lesson.title,
      key: lesson.slug,
    })),
    { href: `/${track}/quiz`, title: "Quiz", key: "quiz" },
  ];
}

export function neighbors(track: string, key: string) {
  const items = lessonSequence(track);
  const index = items.findIndex((item) => item.key === key);
  return {
    prev: index > 0 ? items[index - 1] : null,
    next: index >= 0 && index < items.length - 1 ? items[index + 1] : null,
  };
}

export function nextTrack(slug: string) {
  const tracks = getListedTracks();
  const index = tracks.findIndex((track) => track.slug === slug);
  return index >= 0 ? tracks[index + 1] ?? null : null;
}

export function getSearchIndex(): SearchEntry[] {
  return getListedTracks().flatMap((track) =>
    getLessons(track.slug).map((lesson) => ({
      href: `/${track.slug}/${lesson.slug}`,
      title: lesson.title,
      description: lesson.description,
      track: track.slug,
      trackTitle: track.title,
      tags: lesson.tags,
      text: `${lesson.plainText} ${lesson.tags.join(" ")}`,
    })),
  );
}
