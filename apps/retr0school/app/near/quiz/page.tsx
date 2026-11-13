import type { Metadata } from "next";
import Link from "next/link";
import { QuizRunner } from "@/components/quiz-runner";
import { getQuiz } from "@/lib/content";
import { NEAR_TRACK } from "@/lib/near";

export const metadata: Metadata = {
  title: "NEAR diploma quiz",
  description: "Pass the NEAR diploma quiz, then mint a soulbound diploma NFT on testnet.",
};

export default function NearQuizPage() {
  const questions = getQuiz(NEAR_TRACK);
  return (
    <main id="content" className="mx-auto w-full max-w-lesson px-5 py-8 md:px-8 md:py-12">
      <p className="text-sm text-muted">
        <Link href="/near" className="text-info underline underline-offset-4">
          NEAR diploma
        </Link>{" "}
        · {questions.length} questions
      </p>
      <h1 className="mt-2 font-pixel text-title">NEAR diploma quiz</h1>
      <p className="mt-3 text-lead text-muted">
        Answer every question, then score the quiz. A passing score lets you mint the soulbound diploma NFT. The answer
        key never leaves the grading server.
      </p>
      <QuizRunner track={NEAR_TRACK} questions={questions} />
      <p className="mt-10 text-sm text-muted">
        After you pass, go to the{" "}
        <Link href="/diploma" className="font-medium text-info underline underline-offset-4">
          diploma page
        </Link>{" "}
        to mint.
      </p>
    </main>
  );
}
