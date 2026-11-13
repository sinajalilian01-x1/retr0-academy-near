import type { Metadata } from "next";
import Link from "next/link";
import { getCourseTracks } from "@/lib/content";

export const metadata: Metadata = {
  title: "NEAR diploma quiz",
  description: "Finish the Web3 courses, then take the NEAR diploma quiz and mint a soulbound diploma NFT on testnet.",
};

export default function NearDiplomaPage() {
  const courses = getCourseTracks();
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Capstone · on-chain diploma</p>
      <h1 className="mt-3 font-pixel text-title">NEAR diploma</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        The diploma quiz covers accounts, access keys, gas and storage, view versus change calls, wallets, NEP-141
        tokens, NEP-171 NFTs, and Chain Signatures. Work through the courses first, then take the quiz and mint on
        testnet.
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
          Take the diploma quiz
        </Link>
        <Link
          href="/diploma"
          className="inline-flex h-12 items-center rounded-md border-2 border-line bg-elevated px-5 text-base font-medium text-ink shadow-sm hover:border-cyan"
        >
          Mint your diploma
        </Link>
      </div>
    </main>
  );
}
