import "server-only";

import crypto from "node:crypto";
import { ACCOUNT_RE, RPC_URLS, verifyDiploma } from "@/lib/near";
import { signToken, verifyToken } from "@/lib/server-secret";

export const HOLDER_COOKIE = "r0_holder";
export const HOLDER_TTL_MS = 12 * 60 * 60 * 1000;
export const NEP413_MESSAGE = "Unlock Advanced NEAR on Retr0 Academy";
export const NEP413_RECIPIENT = "retr0-academy";
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

function ed25519Verify(publicKey: string, data: Buffer, signature: Buffer) {
  if (!publicKey.startsWith("ed25519:")) return false;
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

/** Verifies a NEP-413 signed message, key ownership, and on-chain diploma. Returns the account id. */
export async function proveHolder(input: Record<string, unknown>): Promise<string> {
  const accountId = String(input.accountId ?? "").toLowerCase();
  const publicKey = String(input.publicKey ?? "");
  const signature = Buffer.from(String(input.signature ?? ""), "base64");
  const nonce = Buffer.from(String(input.nonce ?? ""), "base64");
  const callbackUrl = typeof input.callbackUrl === "string" ? input.callbackUrl : null;
  if (!ACCOUNT_RE.test(accountId)) throw new HolderError("Invalid account id");
  if (nonce.length !== 32) throw new HolderError("Nonce must be 32 bytes");
  const issuedAt = Number(nonce.readBigUInt64BE(0));
  if (!(Date.now() - issuedAt < NONCE_MAX_AGE_MS && issuedAt - Date.now() < 60_000)) throw new HolderError("Signature expired, try again");

  const candidates = [nep413Hash(NEP413_MESSAGE, nonce, NEP413_RECIPIENT, null)];
  if (callbackUrl) candidates.push(nep413Hash(NEP413_MESSAGE, nonce, NEP413_RECIPIENT, callbackUrl));
  if (!candidates.some((h) => ed25519Verify(publicKey, h, signature))) throw new HolderError("Bad signature", 401);
  if (!(await isFullAccessKey(accountId, publicKey))) throw new HolderError("That key is not a full-access key of this account", 401);
  const diploma = await verifyDiploma(accountId).catch(() => null);
  if (!diploma?.valid) throw new HolderError(`${accountId} does not hold a NEAR Developer Certificate`, 403);
  return accountId;
}
