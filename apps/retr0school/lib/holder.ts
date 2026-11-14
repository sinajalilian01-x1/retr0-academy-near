import "server-only";

import crypto from "node:crypto";
import { ACCOUNT_RE, RPC_URLS, verifyDiploma } from "@/lib/near";
import { claimOnce } from "@/lib/once";
import { allowedHosts } from "@/lib/security/origin";
import { signToken, verifyToken } from "@/lib/server-secret";

export const HOLDER_COOKIE = "r0_holder";
export const HOLDER_TTL_MS = 12 * 60 * 60 * 1000;
export const NEP413_MESSAGE = "Unlock Advanced NEAR on Retr0 Academy";
/** Legacy recipient, no longer accepted (R1 C-07): signatures must name this site's host as recipient. */
export const NEP413_LEGACY_RECIPIENT = "retr0-academy";
const NONCE_MAX_AGE_MS = 10 * 60 * 1000;

type HolderClaim = { a: string; exp: number };

export function holderCookieValue(accountId: string) {
  return signToken("holder", { a: accountId, exp: Date.now() + HOLDER_TTL_MS } satisfies HolderClaim);
}

/** Returns the diploma-holding account proven by the cookie, or null. */
export function readHolder(value: string | undefined): string | null {
  const c = verifyToken<HolderClaim>("holder", value);
  return c && c.exp > Date.now() && ACCOUNT_RE.test(c.a) ? c.a : null;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(s: string): Buffer {
  let n = BigInt(0);
  for (const ch of s) {
    const i = B58.indexOf(ch);
    if (i < 0) throw new Error("bad base58");
    n = n * BigInt(58) + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > BigInt(0)) {
    bytes.unshift(Number(n % BigInt(256)));
    n /= BigInt(256);
  }
  for (const ch of s) {
    if (ch !== "1") break;
    bytes.unshift(0);
  }
  return Buffer.from(bytes);
}

function borshString(s: string) {
  const b = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length);
  return Buffer.concat([len, b]);
}

/** sha256( u32le(2^31 + 413) || borsh{ message, nonce[32], recipient, callbackUrl: Option<String> } ) */
export function nep413Hash(message: string, nonce: Buffer, recipient: string, callbackUrl?: string | null) {
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(2 ** 31 + 413);
  const cb = callbackUrl ? Buffer.concat([Buffer.from([1]), borshString(callbackUrl)]) : Buffer.from([0]);
  const payload = Buffer.concat([tag, borshString(message), nonce, borshString(recipient), cb]);
  return crypto.createHash("sha256").update(payload).digest();
}

/** ed25519:<base58 of 32 bytes> is 43-44 base58 chars; checked before any decoding (R1 C-18). */
export const PUBLIC_KEY_RE = /^ed25519:[1-9A-HJ-NP-Za-km-z]{43,44}$/;

function ed25519Verify(publicKey: string, data: Buffer, signature: Buffer) {
  if (!PUBLIC_KEY_RE.test(publicKey)) return false;
  const raw = base58Decode(publicKey.slice(8));
  if (raw.length !== 32 || signature.length !== 64) return false;
  const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), raw]), format: "der", type: "spki" });
  return crypto.verify(null, data, key, signature);
}

async function isFullAccessKey(accountId: string, publicKey: string) {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "k",
          method: "query",
          params: { request_type: "view_access_key", finality: "final", account_id: accountId, public_key: publicKey },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      if (json.error || json.result?.error) return false;
      return json.result?.permission === "FullAccess";
    } catch {
      // try the next RPC
    }
  }
  throw new Error("RPC unavailable");
}

export class HolderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** The recipient a NEP-413 signature must name: this site's own host (R1 C-07). */
export function recipientAllowed(recipient: string, env: Record<string, string | undefined> = process.env) {
  if (allowedHosts(env).has(recipient.toLowerCase())) return true;
  const dev = env.VERCEL_ENV !== "production" && env.VERCEL_ENV !== "preview";
  return dev && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(recipient);
}

/**
 * Verify that the caller controls `accountId`: a fresh NEP-413 signature over `message`, naming this site as
 * recipient, made with a full-access key of the account on chain. The nonce is burned atomically so a captured
 * signature cannot be replayed (R1 C-07). Returns the lowercased account id.
 */
export async function verifyAccountSignature(input: Record<string, unknown>, message: string): Promise<string> {
  const accountId = String(input.accountId ?? "").toLowerCase();
  const publicKey = String(input.publicKey ?? "");
  const sigB64 = String(input.signature ?? "");
  const nonceB64 = String(input.nonce ?? "");
  const recipient = String(input.recipient ?? "");
  const callbackUrl = typeof input.callbackUrl === "string" && input.callbackUrl.length <= 500 ? input.callbackUrl : null;
  if (!ACCOUNT_RE.test(accountId)) throw new HolderError("Invalid account id");
  if (!PUBLIC_KEY_RE.test(publicKey)) throw new HolderError("Invalid public key");
  if (sigB64.length > 200 || nonceB64.length > 100) throw new HolderError("Bad signature");
  if (!recipientAllowed(recipient)) throw new HolderError("Signature was made for a different site", 401);
  const signature = Buffer.from(sigB64, "base64");
  const nonce = Buffer.from(nonceB64, "base64");
  if (nonce.length !== 32) throw new HolderError("Nonce must be 32 bytes");
  const issuedAt = Number(nonce.readBigUInt64BE(0));
  if (!(Date.now() - issuedAt < NONCE_MAX_AGE_MS && issuedAt - Date.now() < 60_000)) throw new HolderError("Signature expired, try again");

  const candidates = [nep413Hash(message, nonce, recipient, null)];
  if (callbackUrl) candidates.push(nep413Hash(message, nonce, recipient, callbackUrl));
  if (!candidates.some((h) => ed25519Verify(publicKey, h, signature))) throw new HolderError("Bad signature", 401);
  if (!(await isFullAccessKey(accountId, publicKey))) throw new HolderError("That key is not a full-access key of this account", 401);
  const burned = await claimOnce(`nep413:${nonce.toString("hex")}`, accountId);
  if (!burned.claimed) throw new HolderError("This signature was already used. Sign again.", 401);
  return accountId;
}

/** Verifies a NEP-413 signed message, key ownership, and on-chain diploma. Returns the account id. */
export async function proveHolder(input: Record<string, unknown>): Promise<string> {
  const accountId = await verifyAccountSignature(input, NEP413_MESSAGE);
  const diploma = await verifyDiploma(accountId).catch(() => null);
  if (!diploma?.valid) throw new HolderError(`${accountId} does not hold a NEAR Developer Certificate`, 403);
  return accountId;
}
