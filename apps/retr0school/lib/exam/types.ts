export type ExamTopic = "fundamentals" | "contracts" | "tokens" | "dapp" | "advanced";

export const TOPIC_LABELS: Record<ExamTopic, string> = {
  fundamentals: "Web3 & NEAR fundamentals",
  contracts: "Smart contracts (Rust)",
  tokens: "Tokens & NFTs",
  dapp: "dApp frontends & JS",
  advanced: "Advanced NEAR",
};

/** What the client sees for one question. No answer, options already shuffled. */
export type PublicQuestion = { id: string; topic: ExamTopic; question: string; code: string | null; lang: string | null; options: string[] };
export type PublicTest = { name: string; args: unknown[]; expected: unknown };
export type PublicTask = { id: string; title: string; prompt: string; starter: string; fn: string; points: number; visibleTests: PublicTest[]; hiddenCount: number };

export type ExamPaper = {
  token: string;
  startedAt: number;
  expiresAt: number;
  questions: PublicQuestion[];
  tasks: PublicTask[];
  maxScore: number;
  passScore: number;
  practice: boolean;
};

export type TaskResult = { id: string; title: string; points: number; earned: number; tests: { name: string; pass: boolean; hidden: boolean; error?: string }[] };

export type ExamResult = {
  score: number;
  max_score: number;
  pass_score: number;
  percent: number;
  passed: boolean;
  grade: string | null;
  practice: boolean;
  mcq: { correct: number; total: number; byTopic: Record<string, { correct: number; total: number }> };
  tasks: TaskResult[];
  durationSec: number;
  passToken: string | null;
  cooldownUntil: number | null;
};
