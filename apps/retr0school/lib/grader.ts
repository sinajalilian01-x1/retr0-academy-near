import "server-only";

import crypto from "node:crypto";
import { ACCOUNT_RE, DIPLOMA_CONTRACT } from "@/lib/near";

/**
 * Off-chain quiz grader. The answer key and the ed25519 signing seed live only in server env vars:
 *   NEAR_QUIZ_ANSWER_KEY  e.g. "2,0,3,1,..." (index of the correct option per question)
 *   NEAR_ATTESTOR_SEED    32-byte ed25519 seed, hex
 * The contract stores only the matching public key and verifies the signature before minting.
 */
const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
export const ATTESTATION_TTL_MS = 15 * 60 * 1000;

export class GraderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function answerKey(): number[] {
  const raw = process.env.NEAR_QUIZ_ANSWER_KEY;
  if (!raw) throw new GraderError("Grader is not configured", 503);
  return raw.split(",").map((n) => Number(n.trim()));
}

function signingKey() {
  const seedHex = process.env.NEAR_ATTESTOR_SEED;
  if (!seedHex || !/^[0-9a-f]{64}$/i.test(seedHex)) throw new GraderError("Grader is not configured", 503);
  return crypto.createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, Buffer.from(seedHex, "hex")]),
    format: "der",
    type: "pkcs8",
  });
}

/** Must match `attestation_message` in contracts/diploma/src/lib.rs byte for byte. */
export function attestationMessage(accountId: string, track: string, score: number, maxScore: number, expiresAtMs: number) {
  return `retr0school-diploma|v1|${DIPLOMA_CONTRACT}|${accountId}|${track}|${score}|${maxScore}|${expiresAtMs}`;
}

export type Attestation = {
  account_id: string;
  track: string;
  score: number;
  max_score: number;
  expires_at_ms: number;
  signature: string; // base64, 64 bytes
};

export type GradeResult = {
  score: number;
  max_score: number;
  passed: boolean;
  attestation: Attestation | null;
};

export function grade(input: { track: unknown; answers: unknown; accountId?: unknown }, passScore: number): GradeResult {
  if (input.track !== "near") throw new GraderError("Unknown track");
  const key = answerKey();
  const answers = input.answers;
  if (!Array.isArray(answers) || answers.length !== key.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a < 10)) {
    throw new GraderError(`Send exactly ${key.length} answers`);
  }
  const score = answers.filter((a, i) => a === key[i]).length;
  const passed = score >= passScore;
  let attestation: Attestation | null = null;
  if (passed && input.accountId !== undefined && input.accountId !== null && input.accountId !== "") {
    const accountId = String(input.accountId).toLowerCase();
    if (!ACCOUNT_RE.test(accountId)) throw new GraderError("Invalid NEAR account id");
    const expiresAtMs = Date.now() + ATTESTATION_TTL_MS;
    const message = attestationMessage(accountId, "near", score, key.length, expiresAtMs);
    const signature = crypto.sign(null, Buffer.from(message, "utf8"), signingKey()).toString("base64");
    attestation = { account_id: accountId, track: "near", score, max_score: key.length, expires_at_ms: expiresAtMs, signature };
  }
  return { score, max_score: key.length, passed, attestation };
}
