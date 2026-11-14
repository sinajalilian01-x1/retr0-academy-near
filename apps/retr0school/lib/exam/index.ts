import "server-only";

import crypto from "node:crypto";
import { loadBank, loadPracticeBank } from "@/lib/exam/bank";
import { EXAM, letterGrade } from "@/lib/exam/config";
import { runTask } from "@/lib/exam/runner";
import type { ExamPaper, ExamResult, ExamTopic, PublicQuestion, PublicTask } from "@/lib/exam/types";
import { claimOnce } from "@/lib/once";
import { openToken, sealToken, signToken, verifyToken } from "@/lib/server-secret";

/** Sealed (encrypted) so the client cannot see which shuffled option is correct. */
type ExamSession = { v: 1; n: string; q: string[]; p: number[][]; t: string[]; s: number; e: number; practice: boolean };
/**
 * Signed pass (R1 C-01): v2 carries a unique id (`n`, the attempt nonce) and, when the learner was connected
 * at grading time, the account (`a`). A pass without `a` is bound to the first account it is exchanged for,
 * atomically, so one exam pass can only ever produce attestations for one account.
 */
export type PassClaim = { v: 2; score: number; max: number; grade: string; iat: number; exp: number; n: string; a?: string };


function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function startExam(opts: { practice?: boolean } = {}): ExamPaper {
  const bank = opts.practice ? loadPracticeBank() : loadBank();
  const topics: ExamTopic[] = ["fundamentals", "contracts", "tokens", "dapp", "advanced"];
  const per = bank.practice ? 1 : EXAM.questionsPerTopic;
  const picked = shuffle(topics.flatMap((topic) => shuffle(bank.questions.filter((q) => q.topic === topic)).slice(0, per)));
  const perms = picked.map((q) => shuffle(q.options.map((_, i) => i)));
  const questions: PublicQuestion[] = picked.map((q, i) => ({
    id: q.id,
    topic: q.topic,
    question: q.question,
    code: q.code,
    lang: q.lang,
    options: perms[i].map((orig) => q.options[orig]),
  }));
  const tasks: PublicTask[] = bank.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    prompt: t.prompt,
    starter: t.starter,
    fn: t.fn,
    points: t.points,
    visibleTests: t.tests.filter((x) => !x.hidden).map(({ name, args, expected }) => ({ name, args, expected })),
    hiddenCount: t.tests.filter((x) => x.hidden).length,
  }));
  const startedAt = Date.now();
  const expiresAt = startedAt + EXAM.durationMs;
  const session: ExamSession = {
    v: 1,
    n: crypto.randomBytes(12).toString("base64url"),
    q: picked.map((q) => q.id),
    p: perms,
    t: tasks.map((t) => t.id),
    s: startedAt,
    e: expiresAt,
    practice: bank.practice,
  };
  const maxScore = questions.length + tasks.reduce((sum, t) => sum + t.points, 0);
  return {
    token: sealToken("exam", session),
    startedAt,
    expiresAt,
    questions,
    tasks,
    maxScore,
    passScore: Math.ceil((maxScore * EXAM.passPercent) / 100),
    practice: bank.practice,
  };
}

export class ExamError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export type GradeOptions = {
  /** Already validated, lowercased account id to bind the pass to (optional). */
  accountId?: string | null;
  /** Active failed-attempt cooldown for this caller (cookie or IP), enforced at grade time too (R1 C-02). */
  cooldownUntil?: number;
};

export async function gradeExam(token: unknown, answers: unknown, code: unknown, opts: GradeOptions = {}): Promise<ExamResult> {
  const session = openToken<ExamSession>("exam", token);
  if (!session || session.v !== 1) throw new ExamError("Invalid or tampered exam session. Start a new attempt.");
  const now = Date.now();
  if (now > session.e + EXAM.graceMs) throw new ExamError("Time is up: this attempt expired. Start a new attempt.", 410);
  if (!session.practice && opts.cooldownUntil && opts.cooldownUntil > now) {
    throw new ExamError(`Cooldown after a failed attempt: you can submit again after ${new Date(opts.cooldownUntil).toISOString().slice(11, 16)} UTC.`, 429);
  }
  // Atomic single use (R1 C-29): exactly one concurrent submission of an attempt is graded.
  const used = await claimOnce(`exam-used:${session.n}`, "1");
  if (!used.claimed) throw new ExamError("This attempt was already submitted.", 409);

  const bank = session.practice ? loadPracticeBank() : loadBank();
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const given = answers && typeof answers === "object" ? (answers as Record<string, unknown>) : {};
  const byTopic: ExamResult["mcq"]["byTopic"] = {};
  let correct = 0;
  session.q.forEach((id, i) => {
    const q = byId.get(id);
    if (!q) throw new ExamError("Exam bank changed. Start a new attempt.", 409);
    const choice = given[id];
    const ok = Number.isInteger(choice) && session.p[i][choice as number] === q.answer;
    if (ok) correct++;
    byTopic[q.topic] ??= { correct: 0, total: 0 };
    byTopic[q.topic].total++;
    if (ok) byTopic[q.topic].correct++;
  });

  const sources = code && typeof code === "object" ? (code as Record<string, unknown>) : {};
  const tasks = [];
  for (const id of session.t) {
    const task = bank.tasks.find((t) => t.id === id);
    if (task) tasks.push(await runTask(task, sources[id]));
  }
  const score = correct + tasks.reduce((s, t) => s + t.earned, 0);
  const max = session.q.length + tasks.reduce((s, t) => s + t.points, 0);
  const percent = Math.floor((score * 100) / Math.max(1, max));
  const passed = percent >= EXAM.passPercent;
  const grade = passed ? letterGrade(score, max) : null;
  const passToken =
    passed && !session.practice
      ? signToken("pass", {
          v: 2,
          score,
          max,
          grade: grade ?? "B",
          iat: now,
          exp: now + EXAM.passTokenTtlMs,
          n: session.n,
          ...(opts.accountId ? { a: opts.accountId } : {}),
        } satisfies PassClaim)
      : null;
  return {
    score,
    max_score: max,
    pass_score: Math.ceil((max * EXAM.passPercent) / 100),
    percent,
    passed,
    grade,
    practice: session.practice,
    // Per-question correctness is not returned (R1 C-02): with stable option texts it was an answer oracle.
    mcq: { correct, total: session.q.length, byTopic },
    tasks,
    durationSec: Math.round((now - session.s) / 1000),
    passToken,
    cooldownUntil: passed || session.practice ? null : now + EXAM.cooldownMs,
  };
}

export function readPassToken(token: unknown): PassClaim | null {
  const claim = verifyToken<PassClaim>("pass", token);
  if (!claim || claim.v !== 2 || typeof claim.n !== "string" || claim.exp < Date.now()) return null;
  if (claim.max !== EXAM.maxScore || claim.score < EXAM.passScore) return null;
  return claim;
}

/**
 * Bind a pass to exactly one account (R1 C-01). Returns true when `accountId` may receive an attestation
 * for this pass: it is the account in the token, or the first (and therefore only) account it was claimed for.
 */
export async function bindPass(claim: PassClaim, accountId: string): Promise<boolean> {
  if (claim.a) return claim.a === accountId;
  const r = await claimOnce(`pass-bind:${claim.n}`, accountId);
  return r.claimed || r.existing === accountId;
}

/** Signed cooldown marker kept in an HttpOnly cookie. */
export function cooldownCookie(until: number) {
  return signToken("cooldown", { until });
}
export function readCooldown(value: string | undefined): number | null {
  const c = verifyToken<{ until: number }>("cooldown", value);
  return c && c.until > Date.now() ? c.until : null;
}
