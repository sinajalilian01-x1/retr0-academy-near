import Link from "next/link";
import { getCourseTracks, getFoundationTracks } from "@/lib/content";

export default function NotFound() {
  const path = getCourseTracks();
  const foundations = getFoundationTracks();
  return (
    <main id="content" className="mx-auto max-w-page px-5 py-16 md:px-8 md:py-20">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-accent-text">Error 404</p>
      <h1 className="mt-3 font-pixel text-title text-ink">That page is not in the curriculum.</h1>
      <p className="mt-4 max-w-lesson text-muted">The address does not match a course, a lesson, or a tool. Pick up the NEAR Developer path here:</p>
      <ol className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
        {path.map((track, i) => (
          <li key={track.slug}>
            <Link href={`/${track.slug}`} className="flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3 text-ink hover:border-accent">
              <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-accent font-pixel text-[0.55rem] text-accent-text" aria-hidden>{i + 1}</span>
              {track.title}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/near/quiz" className="flex items-center gap-3 border-2 border-accent bg-accent-soft px-4 py-3 text-ink hover:border-highlight">
            <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-highlight font-pixel text-[0.55rem] text-highlight" aria-hidden>{path.length + 1}</span>
            Final exam → Certificate
          </Link>
        </li>
      </ol>
      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/" className="border-2 border-ink bg-accent px-4 py-2 font-medium text-accent-ink shadow-md">Back home</Link>
        {foundations.map((track) => (
          <Link key={track.slug} href={`/${track.slug}`} className="border-2 border-line bg-elevated px-3 py-2 text-ink hover:border-accent">
            {track.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
