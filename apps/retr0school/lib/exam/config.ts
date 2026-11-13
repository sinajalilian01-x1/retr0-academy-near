/** Final exam rules. MAX_SCORE and PASS_SCORE must match set_track("near", ..., 40, 32) on chain. */
export const EXAM = {
  questionsPerTopic: 5, // 5 topics x 5 = 25 multiple-choice questions, 1 point each
  taskPoints: 5, // 3 coding tasks x 5 tests = 15 points
  durationMs: 40 * 60 * 1000,
  graceMs: 90 * 1000,
  cooldownMs: 30 * 60 * 1000,
  passPercent: 80,
  maxScore: 40,
  passScore: 32,
  passTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Core courses whose quizzes must be completed before the exam unlocks. */
export const EXAM_PREREQS = ["fundamentals", "contracts", "tokens", "dapp"] as const;

export function letterGrade(score: number, max: number) {
  const pct = Math.floor((score * 100) / Math.max(1, max));
  return pct >= 95 ? "A+" : pct >= 90 ? "A" : pct >= 80 ? "B" : null;
}
