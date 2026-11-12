import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonShell } from "@/components/lesson-shell";
import { OverviewLessons } from "@/components/overview-lessons";
import { getLessons, getTrack, getTracks, toSummary } from "@/lib/content";

type Props = { params: Promise<{ track: string }> };

export function generateStaticParams() {
  return getTracks().map((track) => ({ track: track.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track) return { title: "Not found" };
  return { title: track.title, description: track.description };
}

export default async function TrackPage({ params }: Props) {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();
  const lessons = getLessons(slug).map(toSummary);

  return (
    <main id="content">
      <LessonShell track={track} lessons={lessons} current="overview">
        <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
          <p className="text-sm font-medium tracking-eyebrow text-highlight uppercase">Course</p>
          <h1 className="mt-2 font-pixel text-title">{track.title}</h1>
          <p className="mt-3 text-lead text-muted">{track.description}</p>
          <OverviewLessons track={track.slug} lessons={lessons} />
          <Link
            href={`/${track.slug}/quiz`}
            className="mt-8 inline-flex rounded-md border-2 border-ink bg-accent px-4 py-3 text-sm font-medium text-accent-ink shadow-sm hover:bg-accent-hover"
          >
            Take the {track.title} quiz
          </Link>
        </article>
      </LessonShell>
    </main>
  );
}
