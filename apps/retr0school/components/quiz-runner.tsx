"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { NEAR_PASS_SCORE, NEAR_TRACK, saveNearAnswers } from "@/lib/near";
import { Button } from "@/components/ui/button";
import { saveQuiz, useProgress } from "@/lib/progress";
import type { QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizRunner({ track, questions }: { track: string; questions: QuizQuestion[] }) {
  const progress = useProgress();
  const saved = progress.quizzes[track];
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
  const serverGraded = track === NEAR_TRACK;
  const [serverScore, setServerScore] = useState<number | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  function choose(questionIndex: number, optionIndex: number) {
    setAnswers((current) => current.map((value, index) => (index === questionIndex ? optionIndex : value)));
    setError(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (answers.some((answer) => answer == null)) {
      setError(true);
      return;
    }
    setError(false);
    if (serverGraded) {
      // The NEAR answer key is secret: the grading function scores the quiz.
      setGrading(true);
      setGradeError(null);
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ track, answers }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Grading failed");
        saveQuiz(track, data.score, data.max_score);
        saveNearAnswers(answers as number[]);
        setServerScore(data.score);
        setSubmitted(true);
      } catch (e) {
        setGradeError(e instanceof Error ? e.message : String(e));
      } finally {
        setGrading(false);
      }
      return;
    }
    const correct = answers.filter((answer, index) => answer === questions[index].answer).length;
    saveQuiz(track, correct, questions.length);
    setSubmitted(true);
  }

  const correctCount = serverGraded
    ? (serverScore ?? 0)
    : answers.filter((answer, index) => answer === questions[index].answer).length;
  const showExplanations = !serverGraded || correctCount >= NEAR_PASS_SCORE;

  return (
    <form onSubmit={onSubmit} className="mt-8">
      {saved && !submitted ? (
        <p data-testid="quiz-saved" className="mb-6 rounded-md border border-line bg-sunken px-4 py-3 text-sm text-ink">
          Saved score: {saved.correct} out of {saved.total}.
        </p>
      ) : null}
      {questions.map((question, questionIndex) => (
        <fieldset key={question.question} disabled={submitted}>
          <legend className="text-lg text-ink">
            {questionIndex + 1}. {question.question}
          </legend>
          <div className="flex flex-col gap-2">
            {question.options.map((option, optionIndex) => {
              const selected = answers[questionIndex] === optionIndex;
              const isAnswer = question.answer === optionIndex;
              const tone = submitted && !serverGraded
                ? isAnswer
                  ? "border-good bg-good-soft"
                  : selected
                    ? "border-danger bg-danger-soft"
                    : "border-line bg-elevated"
                : selected
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-elevated";
              return (
                <label
                  key={option}
                  data-testid={`quiz-${questionIndex}-${optionIndex}`}
                  className={cn("flex cursor-pointer gap-3 rounded-md border-2 p-3", tone)}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    className="mt-1 h-4 w-4"
                    checked={selected}
                    onChange={() => choose(questionIndex, optionIndex)}
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          {submitted && showExplanations ? (
            <p data-testid="quiz-explanation" className="mt-3 text-sm text-muted">
              {question.explanation}
            </p>
          ) : null}
        </fieldset>
      ))}
      {error ? (
        <p role="alert" data-testid="quiz-error" className="mb-4 text-sm text-danger">
          Choose an answer for every question.
        </p>
      ) : null}
      {submitted && track === NEAR_TRACK ? (
        correctCount >= NEAR_PASS_SCORE ? (
          <div data-testid="near-diploma-cta" className="mb-6 rounded-md border-2 border-good bg-good-soft p-4">
            <p className="font-pixel text-[0.7rem] uppercase tracking-wide text-ink">Passed. Your diploma is waiting.</p>
            <p className="mt-2 text-sm text-ink">
              Connect a NEAR testnet wallet and mint a soulbound diploma NFT. The grader signs your score and the contract verifies that signature on chain. Holders unlock Advanced NEAR.
            </p>
            <Link
              href="/diploma"
              className="mt-3 inline-flex h-10 items-center rounded-md border-2 border-ink bg-accent px-4 text-sm font-medium text-accent-ink shadow-md hover:bg-accent-hover"
            >
              Mint my diploma →
            </Link>
          </div>
        ) : (
          <p data-testid="near-diploma-locked" className="mb-6 text-sm text-muted">
            You need {NEAR_PASS_SCORE} of {questions.length} to unlock the on-chain diploma. The answer key stays secret on the
            grading server, so review the lessons and try again.
          </p>
        )
      ) : null}
      {submitted ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p data-testid="quiz-score" className="font-display text-2xl tracking-display">
            You got {correctCount} out of {questions.length}.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setServerScore(null);
              setAnswers(questions.map(() => null));
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          {gradeError ? (
            <p role="alert" className="mb-4 text-sm text-danger">
              {gradeError}
            </p>
          ) : null}
          <Button type="submit" data-testid="quiz-submit" disabled={grading}>
            {grading ? "Grading…" : "Score my quiz"}
          </Button>
        </>
      )}
    </form>
  );
}
