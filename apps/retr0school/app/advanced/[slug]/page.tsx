import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HolderGate } from "@/components/near/holder-gate";
import { getAdvancedLessons } from "@/lib/advanced";
import { renderMdx } from "@/lib/mdx";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAdvancedLessons().map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = getAdvancedLessons().find((x) => x.slug === slug);
  return l ? { title: `${l.title} · Advanced NEAR`, description: l.description } : { title: "Not found" };
}

export default async function AdvancedLessonPage({ params }: Props) {
  const { slug } = await params;
  const lessons = getAdvancedLessons();
  const i = lessons.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const l = lessons[i];
  const next = lessons[i + 1];
  return (
    <main id="content">
      <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
        <p className="text-sm text-muted">
          <Link href="/advanced" className="text-info underline underline-offset-4">
            Advanced NEAR
          </Link>{" "}
          · Lesson {l.order} of {lessons.length}
        </p>
        <h1 className="mt-2 font-pixel text-title">{l.title}</h1>
        <p className="mt-3 text-lead text-muted">{l.description}</p>
        <HolderGate title={l.title}>
          <div className="lesson-prose mt-8">{renderMdx(l.body, l.title)}</div>
          {next ? (
            <p className="mt-10 border-t border-line pt-6 text-sm">
              Next:{" "}
              <Link className="font-medium text-info underline underline-offset-4" href={`/advanced/${next.slug}`}>
                {next.title} →
              </Link>
            </p>
          ) : null}
        </HolderGate>
      </article>
    </main>
  );
}
