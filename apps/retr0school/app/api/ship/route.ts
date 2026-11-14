import { NextResponse } from "next/server";
import { HolderError, verifyAccountSignature } from "@/lib/holder";
import { networkOf } from "@/lib/near";
import { OnceUnavailableError } from "@/lib/once";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ShipError, canWriteShip, loadShip, saveShip, shipProofMessage, verifyShip } from "@/lib/ship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/** GET /api/ship?account=alice.near -> { ship: ShipRecord | null } */
export async function GET(request: Request) {
  const account = new URL(request.url).searchParams.get("account") ?? "";
  return NextResponse.json({ ship: await loadShip(account) }, { headers: noStore });
}

/**
 * POST { student, contract, proof? } -> verifies on chain and stores the record.
 * Mainnet students must include a NEP-413 `proof` signed by `student` over shipProofMessage(student, contract) (R1 C-05).
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`ship:${clientIp(request)}`, 12, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: `Too many tries. Wait ${limit.retryAfterSec}s.` }, { status: 429, headers: noStore });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  try {
    const record = await verifyShip(String(body.student ?? ""), String(body.contract ?? ""));
    let proven = false;
    if (networkOf(record.student) === "mainnet") {
      const proof = body.proof && typeof body.proof === "object" ? (body.proof as Record<string, unknown>) : null;
      if (!proof) throw new ShipError("Sign with your wallet to prove you own this account.", 401);
      const signer = await verifyAccountSignature(proof, shipProofMessage(record.student, record.contract));
      if (signer !== record.student) throw new ShipError("The signature is from a different account.", 401);
      proven = true;
    }
    if (!(await canWriteShip(record, proven))) {
      throw new ShipError(`${record.student} already has a shipped contract on record. Only a contract whose code is gone can be replaced.`, 409);
    }
    const stored = await saveShip(record);
    return NextResponse.json({ ship: record, stored }, { headers: noStore });
  } catch (error) {
    if (error instanceof ShipError || error instanceof HolderError || error instanceof OnceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
    }
    console.error("ship", error);
    return NextResponse.json({ error: "Couldn't reach NEAR RPC right now. Try again in a moment." }, { status: 502, headers: noStore });
  }
}
