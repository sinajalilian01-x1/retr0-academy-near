import "server-only";

import crypto from "node:crypto";
import { kvGet, kvSet } from "@/lib/rate-limit";
import { ACCOUNT_RE, type NearNetwork, networkOf, viewCall } from "@/lib/near";
import { EMPTY_CODE_HASH, viewAccount } from "@/lib/near-account";
import { deriveKey, legacyDeriveKey } from "@/lib/server-secret";

/**
 * Ship-to-chain final project records.
 * The diploma contract is not changed (existing certificates stay untouched). Instead the server verifies on chain that
 *   - the contract account exists and has Wasm deployed (code_hash is not the empty hash), and
 *   - it is the student's own account or a sub-account of it (only the parent account can create a sub-account),
 * Mainnet accounts are checked on mainnet; `.testnet` accounts on testnet (practice, labelled as such).
 * then stores a record signed with a server HMAC in Vercel Blob (ships/<student>.json). /verify re-checks the code on chain live.
 */
export type ShipRecord = {
  student: string;
  contract: string;
  code_hash: string;
  greeting: string | null;
  verified_at: string;
  sig: string;
  /** Not part of the signature (older records have none); always derived from the account id. */
  network?: NearNetwork;
};

export class ShipError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function signWith(key: Buffer, r: Omit<ShipRecord, "sig">) {
  return crypto.createHmac("sha256", key).update(`${r.student}|${r.contract}|${r.code_hash}|${r.verified_at}`).digest("base64url");
}
function sign(r: Omit<ShipRecord, "sig">) {
  return signWith(deriveKey("ship-v1"), r);
}
/** Current key, or the pre-R1 key for records stored before the secret split (R1 C-06); never signs new records. */
function sigValid(r: ShipRecord) {
  const ok = (s: string) => s.length === r.sig.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(r.sig));
  if (ok(sign(r))) return true;
  const legacy = legacyDeriveKey("ship-v1");
  return legacy ? ok(signWith(legacy, r)) : false;
}

/** Signed message a mainnet student must sign (NEP-413) to link a contract (R1 C-05). Mirrors the client. */
export function shipProofMessage(student: string, contract: string) {
  return `Link ${contract} to ${student} on Retr0 Academy`;
}

export function isOwnedBy(contract: string, student: string) {
  return contract === student || contract.endsWith(`.${student}`);
}

export async function verifyShip(studentRaw: string, contractRaw: string): Promise<ShipRecord> {
  const student = studentRaw.trim().toLowerCase();
  const contract = contractRaw.trim().toLowerCase();
  if (!ACCOUNT_RE.test(student)) throw new ShipError("Your account id doesn't look like a NEAR account.");
  // R1 C-05: a top-level account like `near` would "own" every .near account; require a named account.
  if (!student.includes(".") && !/^[0-9a-f]{64}$/.test(student)) throw new ShipError("Use a named account like you.near or you.testnet.");
  if (!ACCOUNT_RE.test(contract)) throw new ShipError("The contract id doesn't look like a NEAR account.");
  if (!isOwnedBy(contract, student)) {
    throw new ShipError(`${contract} must be ${student} itself or a sub-account like hello.${student}, so the chain proves you created it.`);
  }
  const net = networkOf(student);
  const [studentAcct, acct] = await Promise.all([viewAccount(student, net), viewAccount(contract, net)]);
  if (!studentAcct) throw new ShipError(`${student} does not exist on ${net}.`, 404);
  if (!acct) throw new ShipError(`${contract} does not exist on ${net} yet. Create it first (step 1).`, 404);
  if (acct.code_hash === EMPTY_CODE_HASH) throw new ShipError(`${contract} exists but has no contract code. Deploy your Wasm (step 3) and try again.`, 422);
  const greeting = await viewCall<unknown>(contract, "get_greeting", {}, net).then(
    (v) => (typeof v === "string" ? v.slice(0, 140) : null),
    () => null,
  );
  const base = { student, contract, code_hash: acct.code_hash, greeting, verified_at: new Date().toISOString() };
  return { ...base, sig: sign(base), network: net };
}

const blobPath = (student: string) => `ships/${student}.json`;

/**
 * R1 C-05: mainnet records require a NEP-413 proof from the student (checked by the route), so they may be
 * replaced by the student. Testnet practice records can't be wallet-signed on this mainnet site, so a stranger
 * may not replace an existing one: overwrite only re-verifies the same contract or replaces one whose code is gone.
 */
export async function canWriteShip(record: ShipRecord, proven: boolean): Promise<boolean> {
  if (proven) return true;
  const existing = await loadShip(record.student);
  if (!existing) return true;
  if (existing.contract === record.contract) return true;
  return (await liveShipStatus(existing)) === "gone";
}

export async function saveShip(record: ShipRecord) {
  await kvSet(`ship:${record.student}`, record, 60 * 60 * 24 * 30);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return "cache";
  const { put } = await import("@vercel/blob");
  await put(blobPath(record.student), JSON.stringify(record), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return "blob";
}

function valid(r: unknown, student: string): r is ShipRecord {
  if (!r || typeof r !== "object") return false;
  const x = r as ShipRecord;
  return x.student === student && typeof x.contract === "string" && typeof x.sig === "string" && sigValid(x) && isOwnedBy(x.contract, student);
}

export async function loadShip(studentRaw: string): Promise<ShipRecord | null> {
  const student = studentRaw.trim().toLowerCase();
  if (!ACCOUNT_RE.test(student)) return null;
  const cached = await kvGet<ShipRecord>(`ship:${student}`);
  if (valid(cached, student)) return { ...cached, network: networkOf(student) };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(blobPath(student));
    const res = await fetch(`${meta.url}?v=${Date.parse(String(meta.uploadedAt)) || Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const rec = (await res.json()) as unknown;
    if (!valid(rec, student)) return null;
    await kvSet(`ship:${student}`, rec, 60 * 10);
    return { ...rec, network: networkOf(student) };
  } catch {
    return null;
  }
}

/** Live re-check for /verify: is the contract still deployed with code? */
export async function liveShipStatus(record: ShipRecord): Promise<"live" | "changed" | "gone" | "unknown"> {
  try {
    const acct = await viewAccount(record.contract, networkOf(record.student));
    if (!acct || acct.code_hash === EMPTY_CODE_HASH) return "gone";
    return acct.code_hash === record.code_hash ? "live" : "changed";
  } catch {
    return "unknown";
  }
}
