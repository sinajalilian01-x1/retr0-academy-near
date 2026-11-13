"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackPercent, useProgress } from "@/lib/progress";

export type TrackCardData = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessonCount: number;
  slugs: string[];
};

export function TrackGrid({ tracks, compact = false, numbered = false }: { tracks: TrackCardData[]; compact?: boolean; numbered?: boolean }) {
  const progress = useProgress();

  return (
    <ul className="flex flex-col gap-3">
      {tracks.map((track, index) => {
        const pct = trackPercent(progress, track.slug, track.slugs);
        return (
          <li key={track.slug}>
            <Link
              href={`/${track.slug}`}
              data-testid={`track-card-${track.slug}`}
              className={
                compact
                  ? "flex items-center gap-3 border-2 border-line bg-elevated px-4 py-2.5 text-ink shadow-sm hover:border-accent"
                  : "flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3.5 text-ink shadow-sm hover:border-accent"
              }
            >
              {numbered ? (
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-accent font-pixel text-[0.55rem] text-accent-text" aria-hidden>
                  {index + 1}
                </span>
              ) : (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden />
              )}
              <span className="flex-1 font-semibold">{track.title}</span>
              <span data-testid={`progress-${track.slug}`} className="text-sm font-medium text-highlight">
                {pct}%
              </span>
              <ArrowRight className="h-4 w-4 text-accent-text" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
