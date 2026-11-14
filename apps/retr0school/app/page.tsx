import type { Metadata } from "next";
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

export const metadata: Metadata = { alternates: { canonical: "/" } };

const HOW = [
  { title: "Learn the NEAR path", body: "Four courses with animated diagrams and examples that run live against NEAR testnet." },
  { title: "Pass the final exam", body: "25 random questions and 3 coding tasks, graded on the server with hidden tests. 80% to pass." },
  { title: "Mint your certificate", body: "The contract checks the grader's ed25519 signature, then mints a soulbound NFT with your score and grade." },
  { title: "Unlock Advanced NEAR", body: "Sign a free message with your wallet; the server checks your certificate on chain and opens the deep dives." },
];

export default function HomePage() {
  const featured = getCourseTracks().map(toCard);
  const foundations = getFoundationTracks().map(toCard);

  return (
    <main id="content">
      <section className="mx-auto max-w-page px-5 py-12 md:px-8 lg:py-20">
        <HomeHero />
        <div id="courses" className="mt-12 grid min-w-0 items-start gap-10 pr-40 md:grid-cols-2 md:pr-28 lg:mt-16 lg:gap-12">
          <div className="min-w-0">
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-muted uppercase">1 · Foundations: HTML, CSS &amp; JavaScript, then advanced</p>
          <TrackGrid tracks={foundations} />
          </div>
          <div className="min-w-0">
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-highlight uppercase">2 · NEAR Developer path</p>
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
          <Link
            href="/guides/perps-on-near"
            data-testid="track-card-perps"
            className="mt-3 flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3.5 text-ink shadow-sm hover:border-accent"
          >
            <span className="flex-1 font-semibold">Perps on NEAR</span>
            <span className="text-sm font-medium text-muted">Guide</span>
            <ArrowRight className="h-4 w-4 text-accent-text" aria-hidden />
          </Link>
          </div>
        </div>
      </section>
      <section id="how-it-works" className="border-t border-line" aria-labelledby="how-title">
        <div className="mx-auto max-w-page px-5 py-14 md:px-8">
          <h2 id="how-title" className="font-pixel text-[0.8rem] uppercase tracking-eyebrow text-highlight">How the certificate works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map((step, i) => (
              <li key={step.title} className="border-2 border-line bg-elevated p-4 shadow-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-accent font-pixel text-[0.55rem] text-accent-text" aria-hidden>{i + 1}</span>
                <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            No wallet yet?{" "}
            <Link href="/near/quiz" className="text-info underline underline-offset-4">Try a practice paper</Link>{" "}
            or{" "}
            <Link href="/verify/hlpok1lad.tg" className="text-info underline underline-offset-4">look up a real certificate</Link>{" "}
            without signing in.
          </p>
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
              mainnet, which unlocks the Advanced NEAR deep dives. HTML, CSS, and JavaScript, basic and advanced, are
              there as supporting courses.
            </p>
            <p className="mt-4">
              Designed by Sina Jalilian. Lesson progress and quiz scores stay on this device until you choose to mint your certificate on chain.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
