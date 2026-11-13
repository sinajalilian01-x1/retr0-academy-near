import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { FinalExam } from "@/components/exam/final-exam";

export const metadata: Metadata = pageMeta("/near/quiz", "NEAR Developer final exam", "A timed, server-graded final exam: 25 questions from a 60+ question bank plus 3 auto-graded coding tasks. Pass with 80% to mint a soulbound NEAR Developer Certificate.");

export default function NearExamPage() {
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-8 md:px-8 md:py-12">
      <p className="text-sm text-muted">
        <Link href="/near" className="text-info underline underline-offset-4">
          NEAR Developer path
        </Link>{" "}
        · Final exam
      </p>
      <h1 className="mt-2 font-pixel text-title">NEAR Developer final exam</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        The certificate is earned, not given. This exam covers everything in the NEAR Developer path, at the level of real code
        review. Pass it to mint your soulbound NEAR Developer Certificate on NEAR mainnet.
      </p>
      <FinalExam />
    </main>
  );
}
