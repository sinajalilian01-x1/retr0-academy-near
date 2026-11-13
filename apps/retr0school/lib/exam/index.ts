import "server-only";

import crypto from "node:crypto";
import { loadBank, loadPracticeBank } from "@/lib/exam/bank";
import { EXAM, letterGrade } from "@/lib/exam/config";
import { runTask } from "@/lib/exam/runner";
import type { ExamPaper, ExamResult, ExamTopic, PublicQuestion, PublicTask } from "@/lib/exam/types";
import { kvGet, kvSet } from "@/lib/rate-limit";
import { openToken, sealToken, signToken, verifyToken } from "@/lib/server-secret";

/** Sealed (encrypted) so the client cannot see which shuffled option is correct. */
type ExamSession = { v: 1; n: string; q: string[]; p: number[][]; t: string[]; s: number; e: number; practice: boolean };
export type PassClaim = { v: 1; score: number; max: number; grade: string; iat: number; exp: number; n: string };


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

export async function gradeExam(token: unknown, answers: unknown, code: unknown): Promise<ExamResult> {
  const session = openToken<ExamSession>("exam", token);
  if (!session || session.v !== 1) throw new ExamError("Invalid or tampered exam session. Start a new attempt.");
  const now = Date.now();
  if (now > session.e + EXAM.graceMs) throw new ExamError("Time is up: this attempt expired. Start a new attempt.", 410);
  if (await kvGet(`used:${session.n}`)) throw new ExamError("This attempt was already submitted.", 409);
  await kvSet(`used:${session.n}`, 1, Math.ceil((session.e + EXAM.graceMs - now) / 1000) + 60);

  const bank = session.practice ? loadPracticeBank() : loadBank();
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const given = answers && typeof answers === "object" ? (answers as Record<string, unknown>) : {};
  const byTopic: ExamResult["mcq"]["byTopic"] = {};
  const perQuestion: ExamResult["perQuestion"] = [];
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
    perQuestion.push({ id, correct: ok });
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
      ? signToken("pass", { v: 1, score, max, grade: grade ?? "B", iat: now, exp: now + EXAM.passTokenTtlMs, n: session.n } satisfies PassClaim)
      : null;
  return {
    score,
    max_score: max,
    pass_score: Math.ceil((max * EXAM.passPercent) / 100),
    percent,
    passed,
    grade,
    practice: session.practice,
    mcq: { correct, total: session.q.length, byTopic },
    perQuestion,
    tasks,
    durationSec: Math.round((now - session.s) / 1000),
    passToken,
    cooldownUntil: passed || session.practice ? null : now + EXAM.cooldownMs,
  };
}

export function readPassToken(token: unknown): PassClaim | null {
  const claim = verifyToken<PassClaim>("pass", token);
  if (!claim || claim.v !== 1 || claim.exp < Date.now()) return null;
  if (claim.max !== EXAM.maxScore || claim.score < EXAM.passScore) return null;
  return claim;
}

/** Signed cooldown marker kept in an HttpOnly cookie. */
export function cooldownCookie(until: number) {
  return signToken("cooldown", { until });
}
export function readCooldown(value: string | undefined): number | null {
  const c = verifyToken<{ until: number }>("cooldown", value);
  return c && c.until > Date.now() ? c.until : null;
}
