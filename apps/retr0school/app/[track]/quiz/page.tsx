import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonShell } from "@/components/lesson-shell";
import { PrevNext } from "@/components/prev-next";
import { QuizRunner } from "@/components/quiz-runner";
import { getLessons, getQuiz, getTrack, getListedTracks, neighbors, nextTrack, toSummary } from "@/lib/content";

type Props = { params: Promise<{ track: string }> };

export function generateStaticParams() {
  return getListedTracks().map((track) => ({ track: track.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track) return { title: "Not found" };
  return { title: `${track.title} quiz`, description: `Check what you remember from the ${track.title} track.` };
}

export default async function QuizPage({ params }: Props) {
  const { track: slug } = await params;
  const track = getTrack(slug);
  if (!track) notFound();
  const lessons = getLessons(slug).map(toSummary);
  const questions = getQuiz(slug);
  const { prev, next } = neighbors(slug, "quiz");
  const following = nextTrack(slug);

  return (
    <main id="content">
      <LessonShell track={track} lessons={lessons} current="quiz">
        <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
          <p className="text-sm text-muted">{track.title} · {questions.length} questions</p>
          <h1 className="mt-2 font-pixel text-title">{track.title} quiz</h1>
          <p className="mt-3 text-lead text-muted">
            Answer every question, then score the quiz. The result is saved in this browser.
          </p>
          <QuizRunner track={track.slug} questions={questions} />
          <div className="mt-10 border-t border-line pt-6">
            <PrevNext prev={prev} next={next} />
            {following ? (
              <p className="mt-6 text-sm text-muted">
                Next track:{" "}
                <Link href={`/${following.slug}`} className="font-medium text-info underline underline-offset-4">
                  {following.title}
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-sm text-muted">
                That was the last track.{" "}
                <Link href="/playground" className="font-medium text-info underline underline-offset-4">
                  Keep going in the Playground, or take the NEAR diploma quiz.
                </Link>
              </p>
            )}
          </div>
        </article>
      </LessonShell>
    </main>
  );
}
