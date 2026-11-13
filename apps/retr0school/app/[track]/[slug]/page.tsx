import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonShell } from "@/components/lesson-shell";
import { LessonToolbar } from "@/components/lesson-toolbar";
import { PrevNext } from "@/components/prev-next";
import { getLesson, getLessons, getTrack, getListedTracks, neighbors, toSummary } from "@/lib/content";
import { playgroundHrefForLesson } from "@/lib/code-e";
import { renderMdx } from "@/lib/mdx";

type Props = { params: Promise<{ track: string; slug: string }> };

export function generateStaticParams() {
  return getListedTracks().flatMap((track) =>
    getLessons(track.slug).map((lesson) => ({ track: track.slug, slug: lesson.slug })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track: trackSlug, slug } = await params;
  const lesson = getLesson(trackSlug, slug);
  if (!lesson) return { title: "Not found" };
  return pageMeta(`/${trackSlug}/${slug}`, lesson.title, lesson.description);
}

export default async function LessonPage({ params }: Props) {
  const { track: trackSlug, slug } = await params;
  const track = getTrack(trackSlug);
  const lesson = getLesson(trackSlug, slug);
  if (!track || !lesson) notFound();
  const lessons = getLessons(trackSlug).map(toSummary);
  const { prev, next } = neighbors(trackSlug, slug);

  return (
    <main id="content">
      <LessonShell track={track} lessons={lessons} current={slug}>
        <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
          <p className="text-sm text-muted">
            {track.title} · {lesson.readingMinutes} min read
          </p>
          <h1 className="mt-2 font-pixel text-title">{lesson.title}</h1>
          <p className="mt-3 text-lead text-muted">{lesson.description}</p>
          <div className="lesson-prose mt-8">{renderMdx(lesson.body, lesson.title)}</div>
          <div className="mt-10 border-t border-line pt-6">
            <LessonToolbar track={track.slug} slug={lesson.slug} playgroundHref={playgroundHrefForLesson(track.slug, lesson.body)} />
            <PrevNext prev={prev} next={next} />
          </div>
        </article>
      </LessonShell>
    </main>
  );
}
