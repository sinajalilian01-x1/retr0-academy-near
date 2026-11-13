import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { getCourseTracks } from "@/lib/content";

export const metadata: Metadata = pageMeta("/near", "NEAR Developer path", "Four NEAR courses, a hard server-graded final exam, and a soulbound NEAR Developer Certificate on NEAR mainnet.");

export default function NearDiplomaPage() {
  const courses = getCourseTracks();
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Capstone · on-chain certificate</p>
      <h1 className="mt-3 font-pixel text-title">NEAR Developer path</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Work through the four NEAR courses and pass each course quiz. Then take the final exam: 25 randomized code-reading
        questions and 3 coding tasks, graded on the server, 80% to pass. Passing lets you mint a soulbound NEAR Developer
        Certificate that unlocks Advanced NEAR.
      </p>
      <ol className="mt-8 flex max-w-xl flex-col gap-3">
        {courses.map((course, index) => (
          <li key={course.slug}>
            <Link
              href={`/${course.slug}`}
              className="flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3 text-ink hover:border-accent"
            >
              <span className="font-mono text-sm text-faint">{String(index + 1).padStart(2, "0")}</span>
              <span className="font-semibold">{course.title}</span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/near/quiz"
          data-testid="hero-start-near"
          className="inline-flex h-12 items-center rounded-md border-2 border-ink bg-accent px-5 text-base font-medium text-accent-ink shadow-md hover:bg-accent-hover"
        >
          Take the final exam
        </Link>
        <Link
          href="/diploma"
          className="inline-flex h-12 items-center rounded-md border-2 border-line bg-elevated px-5 text-base font-medium text-ink shadow-sm hover:border-cyan"
        >
          Mint your certificate
        </Link>
      </div>
    </main>
  );
}
