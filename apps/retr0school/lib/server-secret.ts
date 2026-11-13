import "server-only";

import crypto from "node:crypto";

let devSeed: Buffer | null = null;

/**
 * Purpose-specific HMAC keys derived from the grader seed, so no extra secrets are needed.
 * Without NEAR_ATTESTOR_SEED (local clone, practice mode) a random per-process seed is used: sessions
 * and cookies still work and cannot be forged, but nothing can be attested for minting.
 */
export function deriveKey(label: string): Buffer {
  const hex = process.env.NEAR_ATTESTOR_SEED;
  let seed: Buffer;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) seed = Buffer.from(hex, "hex");
  else seed = devSeed ??= crypto.randomBytes(32);
  return crypto.createHmac("sha256", seed).update(`retr0-academy|${label}`).digest();
}

const b64u = (b: Buffer) => b.toString("base64url");

/** Compact signed token: base64url(json).base64url(hmac). Integrity only, not secrecy. */
export function signToken(label: string, payload: unknown): string {
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const mac = b64u(crypto.createHmac("sha256", deriveKey(label)).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyToken<T>(label: string, token: unknown): T | null {
  if (typeof token !== "string" || token.length > 20000) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", deriveKey(label)).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Encrypted token (AES-256-GCM) for payloads the client must not read, e.g. option shuffles. */
export function sealToken(label: string, payload: unknown): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", deriveKey(`seal|${label}`), iv);
  const data = Buffer.concat([c.update(JSON.stringify(payload), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map(b64u).join(".");
}

export function openToken<T>(label: string, token: unknown): T | null {
  if (typeof token !== "string" || token.length > 20000) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", deriveKey(`seal|${label}`), iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}
