import "server-only";

import crypto from "node:crypto";
import { deriveKey } from "@/lib/server-secret";

/**
 * Atomic set-if-absent markers (R1 C-01, C-03, C-07, C-29).
 *
 * The Vercel Runtime Cache has no compare-and-set, so single-use decisions that protect certificates
 * (exam attempt used, pass bound to one account, NEP-413 nonce burned) live in Vercel Blob with
 * allowOverwrite:false, which the Blob service enforces atomically: exactly one writer wins.
 * Blob names are HMACs of the key so markers are not enumerable or guessable.
 * Without a Blob token (local dev, tests) an in-process map is used. In production a Blob outage fails
 * closed: the request is refused rather than letting a marker silently go missing.
 */
export class OnceUnavailableError extends Error {
  status = 503;
  constructor() {
    super("Busy right now, please try again in a moment.");
  }
}

const memory = new Map<string, string>();

function blobName(key: string) {
  return `locks/v1/${crypto.createHmac("sha256", deriveKey("once")).update(key).digest("hex")}.txt`;
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Test hook. */
export function _resetOnceMemory() {
  memory.clear();
}

/**
 * Claim `key` for `value`. Returns { claimed: true } for the first caller, otherwise the value stored
 * by whoever claimed it first (so callers can allow idempotent retries by the same owner).
 */
export async function claimOnce(key: string, value: string): Promise<{ claimed: true } | { claimed: false; existing: string | null }> {
  if (!blobEnabled()) {
    if (process.env.VERCEL_ENV === "production") throw new OnceUnavailableError();
    if (memory.has(key)) return { claimed: false, existing: memory.get(key) ?? null };
    memory.set(key, value);
    return { claimed: true };
  }
  const { put, head } = await import("@vercel/blob");
  const name = blobName(key);
  try {
    await put(name, value, { access: "public", addRandomSuffix: false, allowOverwrite: false, contentType: "text/plain", cacheControlMaxAge: 60 });
    return { claimed: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(msg)) {
      console.error("once: blob put failed", msg.slice(0, 160));
      throw new OnceUnavailableError();
    }
  }
  try {
    const meta = await head(name);
    const res = await fetch(`${meta.url}?v=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return { claimed: false, existing: res.ok ? await res.text() : null };
  } catch {
    return { claimed: false, existing: null };
  }
}
