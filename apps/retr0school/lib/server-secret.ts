import "server-only";

import crypto from "node:crypto";

let devSeed: Buffer | null = null;

/**
 * Purpose-specific HMAC/AES keys for sessions, pass tokens, cookies and record signatures.
 *
 * Security (R1 C-06): the root is a dedicated R0_SESSION_SECRET (32-byte hex), separate from every ed25519
 * attestor seed. A leaked testnet seed can no longer forge pass tokens that the server would exchange for
 * mainnet attestations. In production a missing or malformed secret fails closed (no random per-process
 * fallback that silently breaks sessions across instances); locally a random per-process root is used.
 */
export class ServerSecretError extends Error {
  status = 503;
  constructor() {
    super("Server is not configured");
  }
}

function root(): Buffer {
  const hex = process.env.R0_SESSION_SECRET;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, "hex");
  if (process.env.VERCEL_ENV === "production" || process.env.R0_REQUIRE_SECRET === "1") throw new ServerSecretError();
  return (devSeed ??= crypto.randomBytes(32));
}

export function deriveKey(label: string): Buffer {
  return crypto.createHmac("sha256", root()).update(`retr0-academy|${label}`).digest();
}

/**
 * Read-only key for records signed before R1 (ship records in Blob were HMAC'd under the old root).
 * Only used to keep verifying existing records; nothing new is ever signed with it. Returns null when unset.
 */
export function legacyDeriveKey(label: string): Buffer | null {
  const hex = process.env.NEAR_ATTESTOR_SEED;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) return null;
  return crypto.createHmac("sha256", Buffer.from(hex, "hex")).update(`retr0-academy|${label}`).digest();
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
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", deriveKey(label)).update(body).digest();
  if (!/^[A-Za-z0-9_-]{43}$/.test(mac)) return null;
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
