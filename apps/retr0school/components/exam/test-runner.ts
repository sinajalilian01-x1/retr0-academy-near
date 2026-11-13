// Runs the learner's code against the VISIBLE tests in a throwaway Web Worker (practice only;
// the real grading runs on the server in a QuickJS sandbox with hidden tests).
import type { PublicTest } from "@/lib/exam/types";

export type LocalResult = { name: string; pass: boolean; detail: string };

export function runVisibleTests(code: string, fn: string, tests: PublicTest[]): Promise<LocalResult[]> {
  const worker = `self.onmessage = (e) => {
    const { code, fn, tests } = e.data;
    const out = [];
    let f;
    try { f = new Function(code + "\\n;return typeof " + fn + " === 'function' ? " + fn + " : undefined;")(); }
    catch (err) { postMessage(tests.map((t) => ({ name: t.name, pass: false, detail: String(err) }))); return; }
    if (!f) { postMessage(tests.map((t) => ({ name: t.name, pass: false, detail: fn + " is not defined" }))); return; }
    for (const t of tests) {
      try {
        const got = JSON.stringify(f(...t.args));
        const want = JSON.stringify(t.expected);
        out.push({ name: t.name, pass: got === want, detail: got === want ? "ok" : "expected " + want + ", got " + got });
      } catch (err) { out.push({ name: t.name, pass: false, detail: String(err) }); }
    }
    postMessage(out);
  };`;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([worker], { type: "text/javascript" }));
    const w = new Worker(url);
    const timer = setTimeout(() => {
      w.terminate();
      resolve(tests.map((t) => ({ name: t.name, pass: false, detail: "timed out (infinite loop?)" })));
    }, 1500);
    w.onmessage = (e) => {
      clearTimeout(timer);
      w.terminate();
      URL.revokeObjectURL(url);
      resolve(e.data as LocalResult[]);
    };
    w.postMessage({ code, fn, tests });
  });
}
