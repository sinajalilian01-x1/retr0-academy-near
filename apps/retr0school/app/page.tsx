import { HomeHero } from "@/components/home-hero";
import { TrackGrid, type TrackCardData } from "@/components/track-grid";
import { getFoundationTracks, getCourseTracks, getLessons } from "@/lib/content";
import Link from "next/link";
import { ArrowRight, Award, Lock } from "lucide-react";

function toCard(track: { slug: string; title: string; description: string; icon: string; color: string }): TrackCardData {
  const lessons = getLessons(track.slug);
  return {
    slug: track.slug,
    title: track.title,
    description: track.description,
    icon: track.icon,
    color: track.color,
    lessonCount: lessons.length,
    slugs: lessons.map((lesson) => lesson.slug),
  };
}

export default function HomePage() {
  const featured = getCourseTracks().map(toCard);
  const foundations = getFoundationTracks().map(toCard);

  return (
    <main id="content">
      <section className="mx-auto max-w-page px-5 py-12 md:px-8 lg:py-20">
        <HomeHero />
        <div id="courses" className="mt-12 grid items-start gap-10 md:grid-cols-2 lg:mt-16 lg:gap-12">
          <div>
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-highlight uppercase">NEAR Developer path</p>
          <TrackGrid tracks={featured} numbered />
          <Link
            href="/near/quiz"
            data-testid="track-card-exam"
            className="mt-3 flex items-center gap-3 border-2 border-accent bg-accent-soft px-4 py-3.5 text-ink shadow-sm hover:border-highlight"
          >
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-highlight font-pixel text-[0.55rem] text-highlight" aria-hidden>
              {featured.length + 1}
            </span>
            <span className="flex-1 font-semibold">Final exam → NEAR Developer Certificate</span>
            <Award className="h-4 w-4 text-highlight" aria-hidden />
          </Link>
          <Link
            href="/advanced"
            data-testid="track-card-advanced"
            className="mt-3 flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3.5 text-ink shadow-sm hover:border-accent"
          >
            <Lock className="h-4 w-4 shrink-0 text-accent-text" aria-hidden />
            <span className="flex-1 font-semibold">Advanced NEAR</span>
            <span className="text-sm font-medium text-highlight">Holders</span>
            <ArrowRight className="h-4 w-4 text-accent-text" aria-hidden />
          </Link>
          </div>
          <div>
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-muted uppercase">Foundations · HTML, CSS &amp; JavaScript</p>
          <TrackGrid tracks={foundations} />
          </div>
        </div>
      </section>
      <section id="about" className="border-t border-line">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <h2 className="font-pixel text-title text-highlight">About Retr0 Academy</h2>
          <div className="max-w-lesson text-muted">
            <p>
              Retr0 Academy is a Web3 development school on NEAR. Follow the NEAR Developer path through fundamentals,
              smart contracts, tokens, and dApp frontends, with animated diagrams and examples you can edit in the
              Playground. Pass the server-graded final exam to mint a soulbound NEAR Developer Certificate on NEAR
              testnet, which unlocks the Advanced NEAR deep dives. HTML, CSS, and JavaScript, basic and advanced, are
              there as supporting courses.
            </p>
            <p className="mt-4">
              Designed by Sina Jalilian. Lesson progress and quiz scores stay on this device until you choose to mint a diploma on chain.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
