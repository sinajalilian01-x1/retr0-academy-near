"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="content" className="mx-auto max-w-lesson px-5 py-20 md:px-8">
      <p className="text-sm font-medium tracking-eyebrow text-accent-text uppercase">Something went wrong</p>
      <h1 className="mt-3 font-display text-title tracking-display">This page could not be shown.</h1>
      <p className="mt-4 text-muted">Your lesson progress is still saved in this browser.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
      >
        Try again
      </button>
    </main>
  );
}
