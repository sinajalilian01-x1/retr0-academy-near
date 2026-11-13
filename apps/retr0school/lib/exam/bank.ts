import "server-only";

import crypto from "node:crypto";
import encrypted from "@/exam/bank.enc.json";
import sample from "@/exam/bank.sample.json";
import type { ExamTopic } from "@/lib/exam/types";

export type BankQuestion = { id: string; topic: ExamTopic; question: string; code: string | null; lang: string | null; options: string[]; answer: number; explanation: string };
export type BankTest = { name: string; args: unknown[]; expected: unknown; hidden: boolean };
export type BankTask = { id: string; title: string; fn: string; points: number; prompt: string; starter: string; tests: BankTest[] };
export type Bank = { version: number; questions: BankQuestion[]; tasks: BankTask[]; practice: boolean };

let cached: Bank | null = null;

/**
 * The real bank (67 questions, answer key, hidden tests) is committed only in encrypted form and
 * decrypted with EXAM_BANK_KEY on the server. Without the key the app falls back to a small public
 * practice bank that can never issue a diploma attestation.
 */
export function loadBank(): Bank {
  if (cached) return cached;
  const key = process.env.EXAM_BANK_KEY;
  if (key && /^[0-9a-f]{64}$/i.test(key)) {
    const e = encrypted as { iv: string; tag: string; data: string };
    const d = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), Buffer.from(e.iv, "base64"));
    d.setAuthTag(Buffer.from(e.tag, "base64"));
    const plain = Buffer.concat([d.update(Buffer.from(e.data, "base64")), d.final()]).toString("utf8");
    cached = { ...(JSON.parse(plain) as Omit<Bank, "practice">), practice: false };
  } else {
    cached = { ...(sample as unknown as Omit<Bank, "practice">), practice: true };
  }
  return cached;
}
