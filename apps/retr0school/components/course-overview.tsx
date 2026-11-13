"use client";

import Link from "next/link";
import { isLessonDone, useProgress } from "@/lib/progress";
import type { LessonSummary, Track } from "@/lib/types";

export function CourseOverview({ track, lessons }: { track: Track; lessons: LessonSummary[] }) {
  const progress = useProgress();
  const done = lessons.filter((lesson) => isLessonDone(progress, track.slug, lesson.slug)).length;
  const quiz = progress.quizzes[track.slug];
  const firstUndone = lessons.find((lesson) => !isLessonDone(progress, track.slug, lesson.slug)) ?? lessons[0];
  const startHref = firstUndone ? `/${track.slug}/${firstUndone.slug}` : `/${track.slug}`;
  const startLabel = done === 0 ? "Start the course" : done === lessons.length ? "Review the course" : "Continue";

  return (
    <div>
      {track.level ? (
        <p className="text-sm font-medium tracking-eyebrow text-highlight uppercase">
          Course · {track.level}
        </p>
      ) : (
        <p className="text-sm font-medium tracking-eyebrow text-highlight uppercase">Course</p>
      )}
      <h1 className="mt-2 font-pixel text-title">{track.title}</h1>
      <p className="mt-3 text-lead text-muted">{track.overview ?? track.description}</p>

      <div className="mt-6">
        <p className="text-sm text-muted">
          {done} of {lessons.length} lessons complete
          {quiz ? ` · quiz ${quiz.correct}/${quiz.total}` : ""}
        </p>
        <div className="mt-2 h-2 w-full max-w-md border-2 border-line bg-sunken" aria-hidden>
          <div
            className="h-full bg-accent"
            style={{ width: `${lessons.length ? Math.round((done / lessons.length) * 100) : 0}%` }}
          />
        </div>
      </div>

      {track.youWillBuild ? (
        <section className="mt-8">
          <h2 className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-highlight">What you will build</h2>
          <p className="mt-2 text-muted">{track.youWillBuild}</p>
        </section>
      ) : null}

      {track.prerequisites.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-highlight">Prerequisites</h2>
          <ul className="mt-2 list-disc pl-5 text-muted">
            {track.prerequisites.map((item) => (
              <li key={item} className="mt-1">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8">
        <Link
          href={startHref}
          data-testid="course-start"
          className="inline-flex h-12 items-center rounded-md border-2 border-ink bg-accent px-5 text-base font-medium text-accent-ink shadow-md hover:bg-accent-hover"
        >
          {startLabel}
        </Link>
      </div>

      <h2 className="mt-10 font-pixel text-[0.65rem] uppercase tracking-eyebrow text-highlight">Lessons</h2>
      <ol className="mt-4 flex flex-col gap-3">
        {lessons.map((lesson, index) => {
          const complete = isLessonDone(progress, track.slug, lesson.slug);
          return (
            <li key={lesson.slug}>
              <Link
                href={`/${track.slug}/${lesson.slug}`}
                data-testid={`course-lesson-${lesson.slug}`}
                className="flex flex-col gap-1 rounded-lg border-2 border-line bg-elevated px-4 py-4 shadow-sm hover:border-accent sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="font-mono text-sm text-faint">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex-1">
                  <span className="block font-medium text-ink">{lesson.title}</span>
                  <span className="mt-1 block text-sm text-muted">{lesson.description}</span>
                </span>
                <span className={complete ? "text-sm text-good" : "text-sm text-faint"}>
                  {complete ? "Done" : `${lesson.readingMinutes} min`}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
