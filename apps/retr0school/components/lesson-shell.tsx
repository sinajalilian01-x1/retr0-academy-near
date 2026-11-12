"use client";

import type { ReactNode } from "react";
import { LessonDrawer } from "@/components/lesson-drawer";
import { LessonNav } from "@/components/lesson-nav";
import { useProgress } from "@/lib/progress";
import type { LessonSummary, Track } from "@/lib/types";

export function LessonShell({
  track,
  lessons,
  current,
  children,
}: {
  track: Track;
  lessons: LessonSummary[];
  current: string;
  children: ReactNode;
}) {
  const progress = useProgress();
  const quizScore = progress.quizzes[track.slug];

  return (
    <div className="lesson-grid">
      <aside className="hidden border-r border-line lg:block">
        <div className="lesson-sidebar px-4 py-6">
          <span className="mb-4 block h-1.5 w-12 rounded-full bg-accent" />
          <LessonNav track={track} lessons={lessons} current={current} quizScore={quizScore} />
        </div>
      </aside>
      <div className="min-w-0">
        <LessonDrawer track={track} lessons={lessons} current={current} />
        {children}
      </div>
    </div>
  );
}
