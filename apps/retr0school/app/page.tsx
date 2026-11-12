import { HomeHero } from "@/components/home-hero";
import { TrackGrid, type TrackCardData } from "@/components/track-grid";
import { getLessons, getTracks } from "@/lib/content";

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

  return (
    <main id="content">
      <section className="mx-auto grid max-w-page items-start gap-12 px-5 py-12 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.8fr)] lg:gap-16 lg:py-24">
        <HomeHero />
        <div id="courses" className="lg:pt-4">
          <p className="mb-4 text-sm font-medium tracking-eyebrow text-highlight uppercase">Browse courses</p>
          <TrackGrid tracks={tracks} />
        </div>
      </section>
      <section id="about" className="border-t border-line">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <h2 className="font-pixel text-title text-highlight">About Retr0school</h2>
          <div className="max-w-lesson text-muted">
            <p>
              Retr0school is a beginner coding school for the web: short lessons in HTML, CSS, JavaScript, and Web3,
              with examples you can edit and run in the browser.
            </p>
            <p className="mt-4">
              Designed by Sina Jalilian. Nothing is uploaded. Lesson progress and quiz scores stay on this device.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
