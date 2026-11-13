import Link from "next/link";
import { getListedTracks } from "@/lib/content";

export default function NotFound() {
  const tracks = getListedTracks();
  return (
    <main id="content" className="mx-auto max-w-lesson px-5 py-20 md:px-8">
      <p className="text-sm font-medium tracking-eyebrow text-accent-text uppercase">Missing page</p>
      <h1 className="mt-3 font-display text-title tracking-display">That page is not in the curriculum.</h1>
      <p className="mt-4 text-muted">The address does not match a track, a lesson, or the playground.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
          Back home
        </Link>
        {tracks.map((track) => (
          <Link key={track.slug} href={`/${track.slug}`} className="rounded-md border border-line bg-elevated px-4 py-2 text-sm">
            {track.title}
          </Link>
        ))}
      </div>
    </main>
  );
}
