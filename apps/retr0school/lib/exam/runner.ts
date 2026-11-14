import "server-only";

import { getQuickJS, shouldInterruptAfterDeadline, type QuickJSContext, type QuickJSHandle } from "quickjs-emscripten";
import type { BankTask } from "@/lib/exam/bank";
import type { TaskResult } from "@/lib/exam/types";

/**
 * Runs learner code in a QuickJS WebAssembly sandbox: no fs, network, process or Node globals,
 * a 16 MB memory cap and a wall-clock deadline per test.
 *
 * Security (R1 C-12): the learner program is evaluated on its own, then the host looks up the function,
 * passes the arguments as handles and reads the return value back with the engine's native dump. Nothing
 * the learner can override inside the sandbox (JSON.stringify, toString, globals) takes part in deciding
 * pass/fail; the comparison happens in the host. Visible tests also only earn points when at least one
 * hidden test passes, so hardcoding the disclosed examples is worth nothing.
 */
const MEMORY_LIMIT = 16 * 1024 * 1024;
const TEST_DEADLINE_MS = 400;

/** Plain-data check: only JSON-compatible values can be compared and anything else fails. */
function canonical(value: unknown, depth = 0): string | null {
  if (depth > 32) return null;
  if (value === null) return "null";
  switch (typeof value) {
    case "number":
      return Number.isFinite(value) ? JSON.stringify(value) : null;
    case "string":
    case "boolean":
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) {
        const items = value.map((v) => canonical(v, depth + 1));
        return items.includes(null) ? null : `[${items.join(",")}]`;
      }
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return null;
      const keys = Object.keys(value as Record<string, unknown>).sort();
      const parts: string[] = [];
      for (const k of keys) {
        const c = canonical((value as Record<string, unknown>)[k], depth + 1);
        if (c === null) return null;
        parts.push(`${JSON.stringify(k)}:${c}`);
      }
      return `{${parts.join(",")}}`;
    }
    default:
      return null;
  }
}

export function sameValue(got: unknown, expected: unknown) {
  const a = canonical(got);
  return a !== null && a === canonical(expected);
}

type RunOutcome = { ok: true; value: unknown } | { ok: false; error: string };

function errorText(vm: QuickJSContext, handle: QuickJSHandle) {
  try {
    const e = vm.dump(handle) as unknown;
    if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
    return String(e);
  } catch {
    return "error";
  }
}

export async function runOne(code: string, fn: string, args: unknown[]): Promise<RunOutcome> {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + TEST_DEADLINE_MS));
  const vm = runtime.newContext();
  try {
    const loaded = vm.evalCode(code, "solution.js");
    if (loaded.error) {
      const msg = errorText(vm, loaded.error);
      loaded.error.dispose();
      return { ok: false, error: msg };
    }
    loaded.value.dispose();
    if (!/^[A-Za-z_$][\w$]*$/.test(fn)) return { ok: false, error: "bad task" };
    // Top-level `function f` and `const f` both work: resolve the binding with a bare identifier expression.
    const fnRes = vm.evalCode(`(typeof ${fn} === "function" ? ${fn} : undefined)`, "lookup.js");
    if (fnRes.error) {
      const msg = errorText(vm, fnRes.error);
      fnRes.error.dispose();
      return { ok: false, error: msg };
    }
    const fnHandle = fnRes.value;
    if (vm.typeof(fnHandle) !== "function") {
      fnHandle.dispose();
      return { ok: false, error: `${fn} is not defined` };
    }
    // A JSON literal is pure syntax: no learner-defined function runs while building the arguments.
    const argsRes = vm.evalCode(`(${JSON.stringify(args)})`, "args.js");
    if (argsRes.error) {
      argsRes.error.dispose();
      fnHandle.dispose();
      return { ok: false, error: "bad arguments" };
    }
    const argHandles = args.map((_, i) => vm.getProp(argsRes.value, i));
    const call = vm.callFunction(fnHandle, vm.undefined, ...argHandles);
    argHandles.forEach((h) => h.dispose());
    argsRes.value.dispose();
    fnHandle.dispose();
    if (call.error) {
      const msg = errorText(vm, call.error);
      call.error.dispose();
      return { ok: false, error: msg };
    }
    const value = vm.dump(call.value) as unknown;
    call.value.dispose();
    return { ok: true, value };
  } catch (e) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
    return { ok: false, error: msg };
  } finally {
    try {
      vm.dispose();
      runtime.dispose();
    } catch {
      /* already torn down after an interrupt */
    }
  }
}

export async function runTask(task: BankTask, source: unknown): Promise<TaskResult> {
  const code = typeof source === "string" ? source.slice(0, 20000) : "";
  const tests: TaskResult["tests"] = [];
  for (const t of task.tests) {
    let pass = false;
    let error: string | undefined;
    if (code.trim()) {
      const out = await runOne(code, task.fn, t.args);
      if (out.ok) {
        pass = sameValue(out.value, t.expected);
        if (!pass && !t.hidden) {
          let shown: string;
          try {
            shown = JSON.stringify(out.value) ?? String(out.value);
          } catch {
            shown = String(out.value);
          }
          error = `got ${shown.slice(0, 120)}`;
        }
      } else {
        error = /interrupted/i.test(out.error) ? "timed out" : out.error.slice(0, 160);
      }
    } else {
      error = "no code";
    }
    tests.push({ name: t.hidden ? "hidden test" : t.name, pass, hidden: t.hidden, ...(error && !t.hidden ? { error } : {}) });
  }
  return { id: task.id, title: task.title, points: task.points, earned: earnedPoints(task.points, tests), tests };
}

/** Visible tests are examples: they only count when the solution also passes at least one hidden test. */
export function earnedPoints(points: number, tests: { pass: boolean; hidden: boolean }[]) {
  const hiddenTotal = tests.filter((t) => t.hidden).length;
  const hiddenPassed = tests.filter((t) => t.hidden && t.pass).length;
  const counted = hiddenTotal > 0 && hiddenPassed === 0 ? tests.filter((t) => t.hidden && t.pass) : tests.filter((t) => t.pass);
  return Math.round((counted.length / Math.max(1, tests.length)) * points);
}
