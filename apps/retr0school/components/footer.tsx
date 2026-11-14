"use client";

import { useState } from "react";
import Link from "next/link";
import { clearProgress } from "@/lib/progress";

export function Footer({ tracks }: { tracks: { slug: string; title: string }[] }) {
  const [cleared, setCleared] = useState(false);

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="flex items-center gap-2 font-pixel text-xs leading-relaxed text-accent-text">
              Retr0 Academy
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            </p>
            <p className="mt-1 max-w-lesson text-sm text-muted">
              A Web3 developer school on NEAR, built at NEAR HACKATHON. Designed by Sina Jalilian. Progress stays in this browser.
            </p>
          </div>
          <button
            type="button"
            className="self-start text-sm text-muted underline decoration-line underline-offset-4"
            onClick={() => {
              clearProgress();
              setCleared(true);
            }}
          >
            {cleared ? "Progress cleared" : "Reset progress on this browser"}
          </button>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/" className="text-muted hover:text-ink">
            Home
          </Link>
          <Link href="/#courses" className="text-muted hover:text-ink">
            Learn
          </Link>
          {tracks.map((track) => (
            <Link key={track.slug} href={`/${track.slug}`} className="text-muted hover:text-ink">
              {track.title}
            </Link>
          ))}
          <Link href="/near/quiz" className="text-muted hover:text-ink">
            Final exam
          </Link>
          <Link href="/verify" className="text-muted hover:text-ink">
            Verify a developer
          </Link>
          <Link href="/leaderboard" className="text-muted hover:text-ink">
            Leaderboard
          </Link>
          <Link href="/proof" className="text-muted hover:text-ink">
            Mainnet proof
          </Link>
          <Link href="/playground" className="text-muted hover:text-ink">
            Playground
          </Link>
          <a href="https://code-e-near.vercel.app" className="text-muted hover:text-ink" target="_blank" rel="noopener">
            Code E ↗
          </a>
          <Link href="/#about" className="text-muted hover:text-ink">
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
