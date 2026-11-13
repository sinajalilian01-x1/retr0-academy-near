import "server-only";

import crypto from "node:crypto";
import { kvGet, kvSet } from "@/lib/rate-limit";
import { ACCOUNT_RE, viewCall } from "@/lib/near";
import { EMPTY_CODE_HASH, viewAccount } from "@/lib/near-account";
import { deriveKey } from "@/lib/server-secret";

/**
 * Ship-to-chain final project records.
 * The diploma contract is not changed (existing certificates stay untouched). Instead the server verifies on chain that
 *   - the contract account exists and has Wasm deployed (code_hash is not the empty hash), and
 *   - it is the student's own account or a sub-account of it (only the parent account can create a sub-account),
 * then stores a record signed with a server HMAC in Vercel Blob (ships/<student>.json). /verify re-checks the code on chain live.
 */
export type ShipRecord = {
  student: string;
  contract: string;
  code_hash: string;
  greeting: string | null;
  verified_at: string;
  sig: string;
};

export class ShipError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function sign(r: Omit<ShipRecord, "sig">) {
  return crypto.createHmac("sha256", deriveKey("ship-v1")).update(`${r.student}|${r.contract}|${r.code_hash}|${r.verified_at}`).digest("base64url");
}

export function isOwnedBy(contract: string, student: string) {
  return contract === student || contract.endsWith(`.${student}`);
}

export async function verifyShip(studentRaw: string, contractRaw: string): Promise<ShipRecord> {
  const student = studentRaw.trim().toLowerCase();
  const contract = contractRaw.trim().toLowerCase();
  if (!ACCOUNT_RE.test(student)) throw new ShipError("Your account id doesn't look like a NEAR account.");
  if (!ACCOUNT_RE.test(contract)) throw new ShipError("The contract id doesn't look like a NEAR account.");
  if (!student.endsWith(".testnet") || !contract.endsWith(".testnet")) throw new ShipError("Use testnet accounts (ending in .testnet).");
  if (!isOwnedBy(contract, student)) {
    throw new ShipError(`${contract} must be ${student} itself or a sub-account like hello.${student}, so the chain proves you created it.`);
  }
  const [studentAcct, acct] = await Promise.all([viewAccount(student), viewAccount(contract)]);
  if (!studentAcct) throw new ShipError(`${student} does not exist on testnet.`, 404);
  if (!acct) throw new ShipError(`${contract} does not exist on testnet yet. Create it first (step 1).`, 404);
  if (acct.code_hash === EMPTY_CODE_HASH) throw new ShipError(`${contract} exists but has no contract code. Deploy your Wasm (step 3) and try again.`, 422);
  const greeting = await viewCall<unknown>(contract, "get_greeting").then(
    (v) => (typeof v === "string" ? v.slice(0, 140) : null),
    () => null,
  );
  const base = { student, contract, code_hash: acct.code_hash, greeting, verified_at: new Date().toISOString() };
  return { ...base, sig: sign(base) };
}

const blobPath = (student: string) => `ships/${student}.json`;

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
  return x.student === student && typeof x.contract === "string" && typeof x.sig === "string" && sign({ ...x, sig: undefined } as never) === x.sig && isOwnedBy(x.contract, student);
}

export async function loadShip(studentRaw: string): Promise<ShipRecord | null> {
  const student = studentRaw.trim().toLowerCase();
  if (!ACCOUNT_RE.test(student)) return null;
  const cached = await kvGet<ShipRecord>(`ship:${student}`);
  if (valid(cached, student)) return cached;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { head } = await import("@vercel/blob");
    const meta = await head(blobPath(student));
    const res = await fetch(`${meta.url}?v=${Date.parse(String(meta.uploadedAt)) || Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const rec = (await res.json()) as unknown;
    if (!valid(rec, student)) return null;
    await kvSet(`ship:${student}`, rec, 60 * 10);
    return rec;
  } catch {
    return null;
  }
}

/** Live re-check for /verify: is the contract still deployed with code? */
export async function liveShipStatus(record: ShipRecord): Promise<"live" | "changed" | "gone" | "unknown"> {
  try {
    const acct = await viewAccount(record.contract);
    if (!acct || acct.code_hash === EMPTY_CODE_HASH) return "gone";
    return acct.code_hash === record.code_hash ? "live" : "changed";
  } catch {
    return "unknown";
  }
}
