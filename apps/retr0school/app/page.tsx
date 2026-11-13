import { HomeHero } from "@/components/home-hero";
import { TrackGrid, type TrackCardData } from "@/components/track-grid";
import { getLessons, getTracks } from "@/lib/content";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const tracks: TrackCardData[] = getTracks().map((track) => {
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
  });
  const featured = tracks.filter((track) => track.slug === "near" || track.slug === "web3");
  const foundations = tracks.filter((track) => track.slug === "html" || track.slug === "css" || track.slug === "javascript");

  return (
    <main id="content">
      <section className="mx-auto grid max-w-page items-start gap-12 px-5 py-12 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.8fr)] lg:gap-16 lg:py-24">
        <HomeHero />
        <div id="courses" className="lg:pt-4">
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-highlight uppercase">Web3 tracks</p>
          <TrackGrid tracks={featured} />
          <Link
            href="/advanced"
            data-testid="track-card-advanced"
            className="mt-3 flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3.5 text-ink shadow-sm hover:border-accent"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="flex-1 font-semibold">Advanced NEAR</span>
            <span className="text-sm font-medium text-highlight">Open + holders</span>
            <ArrowRight className="h-4 w-4 text-accent-text" aria-hidden />
          </Link>
          <p className="mt-8 mb-3 text-sm font-medium tracking-eyebrow text-muted uppercase">Foundations</p>
          <TrackGrid tracks={foundations} compact />
        </div>
      </section>
      <section id="about" className="border-t border-line">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <h2 className="font-pixel text-title text-highlight">About Retr0 Academy</h2>
          <div className="max-w-lesson text-muted">
            <p>
              Retr0 Academy is a Web3 development school on NEAR. Learn to ship on-chain work: accounts, smart
              contracts, tokens, and frontends, with examples you can edit in the Playground and a soulbound diploma NFT
              on NEAR testnet. HTML, CSS, and JavaScript stay available as optional foundations.
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
