import { describe, expect, it } from "vitest";
import { earnedPoints, runTask, sameValue } from "@/lib/exam/runner";
import type { BankTask } from "@/lib/exam/bank";

const task: BankTask = {
  id: "t",
  title: "sum",
  fn: "sum",
  points: 5,
  prompt: "",
  starter: "",
  tests: [
    { name: "a", args: [[1, 2]], expected: 3, hidden: false },
    { name: "b", args: [[5]], expected: 5, hidden: false },
    { name: "h1", args: [[2, 2, 2]], expected: 6, hidden: true },
    { name: "h2", args: [[]], expected: 0, hidden: true },
    { name: "h3", args: [[10, -1]], expected: 9, hidden: true },
  ],
};

describe("exam runner (R1 C-12)", () => {
  it("scores a real solution fully", async () => {
    const r = await runTask(task, "function sum(xs){ return xs.reduce((a,b)=>a+b,0); }");
    expect(r.earned).toBe(5);
  });

  it("supports const arrow functions", async () => {
    const r = await runTask(task, "const sum = (xs) => xs.reduce((a,b)=>a+b,0);");
    expect(r.earned).toBe(5);
  });

  it("ignores a learner-shadowed JSON.stringify", async () => {
    const cheat = `
      const exp = [3, 5, 6, 0, 9]; let i = 0;
      JSON.stringify = () => String(exp[i++]);
      function sum(){ return "nope"; }`;
    const r = await runTask(task, cheat);
    expect(r.tests.every((t) => !t.pass)).toBe(true);
    expect(r.earned).toBe(0);
  });

  it("gives no points for hardcoding only the visible examples", async () => {
    const hard = `function sum(xs){ if (xs.length===2 && xs[0]===1) return 3; if (xs.length===1 && xs[0]===5) return 5; return -1; }`;
    const r = await runTask(task, hard);
    expect(r.tests.filter((t) => !t.hidden).every((t) => t.pass)).toBe(true);
    expect(r.earned).toBe(0);
  });

  it("rejects objects with toJSON tricks and non-plain values", () => {
    expect(sameValue({ toJSON: () => 3 }, 3)).toBe(false);
    expect(sameValue(NaN, NaN)).toBe(false);
    expect(sameValue({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
  });

  it("times out infinite loops", async () => {
    const r = await runTask({ ...task, tests: task.tests.slice(0, 1) }, "function sum(){ while(true){} }");
    expect(r.tests[0].pass).toBe(false);
    expect(r.tests[0].error).toBe("timed out");
  });

  it("partial credit when hidden tests pass", () => {
    expect(earnedPoints(5, [{ pass: true, hidden: false }, { pass: true, hidden: false }, { pass: true, hidden: true }, { pass: false, hidden: true }, { pass: false, hidden: true }])).toBe(3);
  });
});
