import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bank } from "@/lib/exam/bank";

// A synthetic 40-point bank (25 MCQ + 3 tasks x 5 tests), so the real grading path runs without the encrypted bank.
const topics = ["fundamentals", "contracts", "tokens", "dapp", "advanced"] as const;
const bank: Bank = {
  version: 1,
  practice: false,
  questions: topics.flatMap((topic) =>
    Array.from({ length: 5 }, (_, i) => ({ id: `${topic}-${i}`, topic, question: `q ${topic} ${i}`, code: null, lang: null, options: ["right", "w1", "w2", "w3"], answer: 0, explanation: "" })),
  ),
  tasks: ["t1", "t2", "t3"].map((id) => ({
    id,
    title: id,
    fn: "double",
    points: 5,
    prompt: "",
    starter: "",
    tests: [
      { name: "v1", args: [1], expected: 2, hidden: false },
      { name: "v2", args: [2], expected: 4, hidden: false },
      { name: "h1", args: [3], expected: 6, hidden: true },
      { name: "h2", args: [10], expected: 20, hidden: true },
      { name: "h3", args: [-4], expected: -8, hidden: true },
    ],
  })),
};

vi.mock("@/lib/exam/bank", () => ({ loadBank: () => bank, loadPracticeBank: () => ({ ...bank, practice: true }) }));

const { startExam, gradeExam, readPassToken, bindPass } = await import("@/lib/exam");
const { openToken, signToken } = await import("@/lib/server-secret");
const { _resetOnceMemory } = await import("@/lib/once");

const SOLUTION = "function double(x){ return x * 2; }";

function correctAnswers(paper: ReturnType<typeof startExam>) {
  const session = openToken<{ p: number[][] }>("exam", paper.token)!;
  // option index whose original index is 0 ("right")
  return Object.fromEntries(paper.questions.map((q, i) => [q.id, session.p[i].indexOf(0)]));
}

describe("exam grading (R1 C-01, C-02, C-29)", () => {
  beforeEach(() => _resetOnceMemory());

  it("passes a correct attempt and does not return per-question correctness", async () => {
    const paper = startExam();
    expect(paper.maxScore).toBe(40);
    const code = Object.fromEntries(paper.tasks.map((t) => [t.id, SOLUTION]));
    const r = await gradeExam(paper.token, correctAnswers(paper), code);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(40);
    expect("perQuestion" in r).toBe(false);
    expect(r.passToken).toBeTruthy();
  });

  it("grades an attempt only once, even under concurrency", async () => {
    const paper = startExam();
    const code = Object.fromEntries(paper.tasks.map((t) => [t.id, SOLUTION]));
    const results = await Promise.allSettled([gradeExam(paper.token, correctAnswers(paper), code), gradeExam(paper.token, correctAnswers(paper), code)]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });

  it("enforces the failed-attempt cooldown at grade time", async () => {
    const paper = startExam();
    await expect(gradeExam(paper.token, {}, {}, { cooldownUntil: Date.now() + 60_000 })).rejects.toMatchObject({ status: 429 });
    // the attempt was not burned by the refusal
    const r = await gradeExam(paper.token, {}, {});
    expect(r.passed).toBe(false);
  });

  it("binds a pass to the account given at grading time", async () => {
    const paper = startExam();
    const code = Object.fromEntries(paper.tasks.map((t) => [t.id, SOLUTION]));
    const r = await gradeExam(paper.token, correctAnswers(paper), code, { accountId: "alice.near" });
    const claim = readPassToken(r.passToken)!;
    expect(claim.a).toBe("alice.near");
    expect(await bindPass(claim, "alice.near")).toBe(true);
    expect(await bindPass(claim, "mallory.near")).toBe(false);
  });

  it("binds an unbound pass to the first account it is exchanged for", async () => {
    const paper = startExam();
    const code = Object.fromEntries(paper.tasks.map((t) => [t.id, SOLUTION]));
    const r = await gradeExam(paper.token, correctAnswers(paper), code);
    const claim = readPassToken(r.passToken)!;
    expect(claim.a).toBeUndefined();
    const [a, b] = await Promise.all([bindPass(claim, "bob.near"), bindPass(claim, "carol.near")]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const winner = a ? "bob.near" : "carol.near";
    expect(await bindPass(claim, winner)).toBe(true); // idempotent retry for the same account
  });

  it("rejects legacy v1 and expired pass tokens", () => {
    const now = Date.now();
    expect(readPassToken(signToken("pass", { v: 1, score: 40, max: 40, grade: "A+", iat: now, exp: now + 1e6, n: "x" }))).toBeNull();
    expect(readPassToken(signToken("pass", { v: 2, score: 40, max: 40, grade: "A+", iat: now, exp: now - 1, n: "x" }))).toBeNull();
    expect(readPassToken(signToken("pass", { v: 2, score: 31, max: 40, grade: "B", iat: now, exp: now + 1e6, n: "x" }))).toBeNull();
  });

  it("hardcoded visible tests plus a perfect MCQ still fail", async () => {
    const paper = startExam();
    const hard = "function double(x){ return x === 1 ? 2 : x === 2 ? 4 : 0; }";
    const code = Object.fromEntries(paper.tasks.map((t) => [t.id, hard]));
    const r = await gradeExam(paper.token, correctAnswers(paper), code);
    expect(r.score).toBe(25);
    expect(r.passed).toBe(false);
  });
});
