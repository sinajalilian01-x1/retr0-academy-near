"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { isLessonDone, toggleLesson, useProgress } from "@/lib/progress";
import type { LessonSummary, QuizScore, Track } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LessonNav({
  track,
  lessons,
  current,
  quizScore,
  onNavigate,
}: {
  track: Track;
  lessons: LessonSummary[];
  current: string;
  quizScore?: QuizScore;
  onNavigate?: () => void;
}) {
  const progress = useProgress();

  return (
    <nav aria-label="Lessons" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-eyebrow text-muted uppercase">{track.title}</p>
        <Link
          href={`/${track.slug}`}
          aria-current={current === "overview" ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "mt-2 block rounded-md px-2 py-1.5 text-sm",
            current === "overview" ? "bg-accent text-accent-ink" : "text-muted hover:bg-sunken",
          )}
        >
          Overview
        </Link>
      </div>
      <ol className="flex flex-col gap-1">
        {lessons.map((lesson, index) => {
          const done = isLessonDone(progress, track.slug, lesson.slug);
          const active = current === lesson.slug;
          return (
            <li key={lesson.slug} className="flex items-start gap-1">
              <button
                type="button"
                data-testid={`lesson-check-${lesson.slug}`}
                data-complete={done ? "true" : "false"}
                aria-pressed={done}
                aria-label={done ? `Mark ${lesson.title} as not done` : `Mark ${lesson.title} as done`}
                className={cn("mt-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md", done ? "text-good" : "text-faint")}
                onClick={() => toggleLesson(track.slug, lesson.slug)}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
              </button>
              <Link
                href={`/${track.slug}/${lesson.slug}`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-sm",
                  active ? "bg-accent text-accent-ink" : "text-ink hover:bg-sunken",
                )}
              >
                <span className={cn("mr-2", active ? "text-accent-ink" : "text-faint")}>{String(index + 1).padStart(2, "0")}</span>
                {lesson.title}
              </Link>
            </li>
          );
        })}
      </ol>
      <Link
        href={`/${track.slug}/quiz`}
        aria-current={current === "quiz" ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          "rounded-md px-2 py-2 text-sm",
          current === "quiz" ? "bg-accent text-accent-ink" : "text-ink hover:bg-sunken",
        )}
      >
        Quiz
        {quizScore ? (
          <span className="ml-2 text-muted">
            {quizScore.correct}/{quizScore.total}
          </span>
        ) : null}
      </Link>
    </nav>
  );
}
