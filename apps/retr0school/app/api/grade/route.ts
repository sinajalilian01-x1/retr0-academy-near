import { NextResponse } from "next/server";
import { GraderError, grade } from "@/lib/grader";
import { NEAR_PASS_SCORE } from "@/lib/near";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { track: "near", answers: number[], accountId?: string }
 * -> { score, max_score, passed, attestation | null }
 * The attestation is an ed25519 signature the diploma contract verifies before minting.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  try {
    const result = grade({ track: body.track, answers: body.answers, accountId: body.accountId }, NEAR_PASS_SCORE);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof GraderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
