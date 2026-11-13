import "server-only";

import { getQuickJS, shouldInterruptAfterDeadline } from "quickjs-emscripten";
import type { BankTask } from "@/lib/exam/bank";
import type { TaskResult } from "@/lib/exam/types";

/**
 * Runs learner code in a QuickJS WebAssembly sandbox: no fs, network, process or Node globals,
 * a 16 MB memory cap and a wall-clock deadline per test.
 */
export async function runTask(task: BankTask, source: unknown): Promise<TaskResult> {
  const QuickJS = await getQuickJS();
  const code = typeof source === "string" ? source.slice(0, 20000) : "";
  const tests: TaskResult["tests"] = [];
  for (const t of task.tests) {
    let pass = false;
    let error: string | undefined;
    if (code.trim()) {
      const program = `${code}\n;JSON.stringify(${task.fn}(...${JSON.stringify(t.args)}));`;
      try {
        const out = QuickJS.evalCode(program, {
          shouldInterrupt: shouldInterruptAfterDeadline(Date.now() + 400),
          memoryLimitBytes: 16 * 1024 * 1024,
        });
        pass = typeof out === "string" && out === JSON.stringify(t.expected);
        if (!pass && !t.hidden) error = `got ${String(out).slice(0, 120)}`;
      } catch (e) {
        const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
        error = msg === "interrupted" ? "timed out" : msg.slice(0, 160);
      }
    } else {
      error = "no code";
    }
    tests.push({ name: t.hidden ? "hidden test" : t.name, pass, hidden: t.hidden, ...(error && !t.hidden ? { error } : {}) });
  }
  const passed = tests.filter((t) => t.pass).length;
  const earned = Math.round((passed / Math.max(1, tests.length)) * task.points);
  return { id: task.id, title: task.title, points: task.points, earned, tests };
}
