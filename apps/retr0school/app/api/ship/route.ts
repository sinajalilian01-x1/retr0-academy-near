import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ShipError, loadShip, saveShip, verifyShip } from "@/lib/ship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

/** GET /api/ship?account=alice.near -> { ship: ShipRecord | null } */
export async function GET(request: Request) {
  const account = new URL(request.url).searchParams.get("account") ?? "";
  return NextResponse.json({ ship: await loadShip(account) }, { headers: noStore });
}

/** POST { student, contract } -> verifies on chain and stores the record. */
export async function POST(request: Request) {
  const limit = await rateLimit(`ship:${clientIp(request)}`, 12, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: `Too many tries. Wait ${limit.retryAfterSec}s.` }, { status: 429, headers: noStore });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  try {
    const record = await verifyShip(String(body.student ?? ""), String(body.contract ?? ""));
    const stored = await saveShip(record);
    return NextResponse.json({ ship: record, stored }, { headers: noStore });
  } catch (error) {
    if (error instanceof ShipError) return NextResponse.json({ error: error.message }, { status: error.status, headers: noStore });
    console.error("ship", error);
    return NextResponse.json({ error: "Couldn't reach NEAR RPC right now. Try again in a moment." }, { status: 502, headers: noStore });
  }
}
