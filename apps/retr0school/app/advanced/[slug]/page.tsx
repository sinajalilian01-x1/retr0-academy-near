import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { HOLDER_COOKIE, readHolder } from "@/lib/holder";
import { HolderGate } from "@/components/near/holder-gate";
import { getAdvancedLessons } from "@/lib/advanced";
import { renderMdx } from "@/lib/mdx";
import { playgroundHrefForLesson } from "@/lib/code-e";

type Props = { params: Promise<{ slug: string }> };

// Rendered per request: locked lesson bodies are only sent after a server-side holder check.
export const dynamic = "force-dynamic";

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
  const holder = l.locked ? readHolder((await cookies()).get(HOLDER_COOKIE)?.value) : null;
  const unlocked = !l.locked || Boolean(holder);
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
        <p className="mt-2 text-sm text-muted" data-testid="advanced-access">
          {!l.locked ? "Open tutorial, no certificate required." : holder ? `Unlocked for ${holder} (verified on the server).` : "Certificate holders only."}
        </p>
        {unlocked ? (
        <p className="mt-4">
          <a
            href={playgroundHrefForLesson("advanced", l.body)}
            data-testid="open-in-playground"
            className="inline-flex h-10 items-center rounded-md border-2 border-ink bg-accent px-4 text-sm font-medium text-accent-ink shadow-md hover:bg-accent-hover"
          >
            Open in Playground
          </a>
        </p>
        ) : null}
        {l.locked && !unlocked ? (
          <HolderGate title={l.title} />
        ) : l.locked ? (
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
        ) : (
          <>
            <div className="lesson-prose mt-8">{renderMdx(l.body, l.title)}</div>
            {next ? (
              <p className="mt-10 border-t border-line pt-6 text-sm">
                Next:{" "}
                <Link className="font-medium text-info underline underline-offset-4" href={`/advanced/${next.slug}`}>
                  {next.title} →
                </Link>
              </p>
            ) : null}
          </>
        )}
      </article>
    </main>
  );
}
