import "server-only";

import crypto from "node:crypto";
import { ACCOUNT_RE, DIPLOMA_CONTRACT } from "@/lib/near";

/**
 * Off-chain attestation signer for the final exam (graded in lib/exam). The ed25519 seed lives only
 * in a server env var:
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

/** Sign a mint attestation for a passed final exam. The contract re-checks the pass mark. */
export function attest(accountIdRaw: unknown, score: number, maxScore: number): Attestation {
  const accountId = String(accountIdRaw ?? "").toLowerCase();
  if (!ACCOUNT_RE.test(accountId)) throw new GraderError("Invalid NEAR account id");
  const expiresAtMs = Date.now() + ATTESTATION_TTL_MS;
  const message = attestationMessage(accountId, "near", score, maxScore, expiresAtMs);
  const signature = crypto.sign(null, Buffer.from(message, "utf8"), signingKey()).toString("base64");
  return { account_id: accountId, track: "near", score, max_score: maxScore, expires_at_ms: expiresAtMs, signature };
}
