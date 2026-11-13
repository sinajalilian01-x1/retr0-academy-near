import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseOverview } from "@/components/course-overview";
import { LessonShell } from "@/components/lesson-shell";
import { getLessons, getListedTracks, getTrack, toSummary } from "@/lib/content";

type Props = { params: Promise<{ track: string }> };

export function generateStaticParams() {
  return getListedTracks().map((track) => ({ track: track.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track || !track.listed) return { title: "Not found" };
  return { title: track.title, description: track.description };
}

export default async function TrackPage({ params }: Props) {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track || !track.listed) notFound();
  const lessons = getLessons(slug).map(toSummary);

  return (
    <main id="content">
      <LessonShell track={track} lessons={lessons} current="overview">
        <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
          <CourseOverview track={track} lessons={lessons} />
          <Link
            href={`/${track.slug}/quiz`}
            data-testid="course-quiz"
            className="mt-8 inline-flex rounded-md border-2 border-ink bg-accent px-4 py-3 text-sm font-medium text-accent-ink shadow-sm hover:bg-accent-hover"
          >
            {`Take the ${track.title} quiz`}
          </Link>
        </article>
      </LessonShell>
    </main>
  );
}
