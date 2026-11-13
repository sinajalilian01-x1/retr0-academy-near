"use client";

import { Check } from "lucide-react";
import { isLessonDone, toggleLesson, useProgress } from "@/lib/progress";
import { cn } from "@/lib/utils";

export function LessonToolbar({
  track,
  slug,
  playgroundHref,
}: {
  track: string;
  slug: string;
  playgroundHref: string;
}) {
  const progress = useProgress();
  const done = isLessonDone(progress, track, slug);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="mark-complete"
          aria-pressed={done}
          onClick={() => toggleLesson(track, slug)}
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-md border-2 px-4 py-2 text-sm font-medium shadow-sm",
            done ? "border-good bg-good-soft text-good" : "border-line bg-elevated text-ink",
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          {done ? "Completed" : "Mark as done"}
        </button>
        <a
          href={playgroundHref}
          data-testid="open-in-playground"
          className="inline-flex items-center rounded-md border-2 border-ink bg-accent px-4 py-2 text-sm font-medium text-accent-ink shadow-md hover:bg-accent-hover"
        >
          Open in Playground
        </a>
      </div>
      <p className="text-sm text-muted">Saved in this browser.</p>
    </div>
  );
}
