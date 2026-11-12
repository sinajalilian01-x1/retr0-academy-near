"use client";

import Link from "next/link";
import { isLessonDone, useProgress } from "@/lib/progress";
import type { LessonSummary } from "@/lib/types";

export function OverviewLessons({ track, lessons }: { track: string; lessons: LessonSummary[] }) {
  const progress = useProgress();

  return (
    <ol className="mt-8 flex flex-col gap-3">
      {lessons.map((lesson, index) => {
        const done = isLessonDone(progress, track, lesson.slug);
        return (
          <li key={lesson.slug}>
            <Link
              href={`/${track}/${lesson.slug}`}
              className="flex flex-col gap-1 rounded-lg border border-line bg-elevated px-4 py-4 shadow-sm hover:shadow-md sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="font-mono text-sm text-faint">{String(index + 1).padStart(2, "0")}</span>
              <span className="flex-1">
                <span className="block font-medium text-ink">{lesson.title}</span>
                <span className="mt-1 block text-sm text-muted">{lesson.description}</span>
              </span>
              <span className={done ? "text-sm text-good" : "text-sm text-faint"}>{done ? "Done" : `${lesson.readingMinutes} min`}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
