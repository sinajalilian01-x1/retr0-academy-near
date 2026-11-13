import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, getGuides } from "@/lib/guides";
import { renderMdx } from "@/lib/mdx";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getGuides().map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return { title: "Not found" };
  return pageMeta(`/guides/${guide.slug}`, guide.title, guide.description);
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  return (
    <main id="content">
      <article className="mx-auto max-w-lesson px-5 py-8 md:px-8 md:py-12">
        <p className="text-sm text-muted">Guide{guide.updated ? ` · updated ${guide.updated}` : ""}</p>
        <h1 className="mt-2 font-pixel text-title">{guide.title}</h1>
        <p className="mt-3 text-lead text-muted">{guide.description}</p>
        <div className="lesson-prose mt-8">{renderMdx(guide.body, guide.title)}</div>
      </article>
    </main>
  );
}
