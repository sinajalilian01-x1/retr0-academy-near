// Browser-side storage for the final exam. Nothing here is trusted by the server.
import type { ExamPaper } from "@/lib/exam/types";

export type StoredPass = { passToken: string; score: number; max: number; grade: string; at: number };
export type StoredAttempt = { paper: ExamPaper; answers: Record<string, number>; code: Record<string, string> };

const PASS_KEY = "r0-exam-pass";
const ATTEMPT_KEY = "r0-exam-attempt";
const COOLDOWN_KEY = "r0-exam-cooldown";

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const examStore = {
  pass: () => read<StoredPass>(localStorage, PASS_KEY),
  savePass: (p: StoredPass) => localStorage.setItem(PASS_KEY, JSON.stringify(p)),
  attempt: () => read<StoredAttempt>(sessionStorage, ATTEMPT_KEY),
  saveAttempt: (a: StoredAttempt) => sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(a)),
  clearAttempt: () => sessionStorage.removeItem(ATTEMPT_KEY),
  cooldown: () => {
    const until = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    return until > Date.now() ? until : null;
  },
  saveCooldown: (until: number) => localStorage.setItem(COOLDOWN_KEY, String(until)),
};
