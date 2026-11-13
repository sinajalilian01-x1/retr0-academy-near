import { NextResponse } from "next/server";
import { EXAM } from "@/lib/exam/config";
import { ExamError, cooldownCookie, gradeExam, readPassToken } from "@/lib/exam";
import { setIpCooldown } from "@/lib/exam/cooldown";
import { GraderError, attest } from "@/lib/grader";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Final exam grading and mint attestations. Answers and hidden tests never leave the server.
 *   POST { track: "near", examToken, answers: {questionId: optionIndex}, code: {taskId: source}, accountId? }
 *     -> full ExamResult (+ attestation when passed and accountId is given)
 *   POST { track: "near", passToken, accountId }
 *     -> { attestation } for a previously passed exam (lets the learner connect a wallet later)
 * The attestation is an ed25519 signature that diploma.retr0school.testnet verifies before minting.
 */
export async function POST(request: Request) {
  const res = await handle(request);
  return res;
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  if (body.track !== "near") return NextResponse.json({ error: "Unknown track" }, { status: 400 });
  let remaining = -1;
  const noStore = { "cache-control": "no-store" };

  try {
    if (body.passToken !== undefined) {
      const limit = await rateLimit(`attest:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.ok) return NextResponse.json({ error: "Too many requests", retryAfterSec: limit.retryAfterSec }, { status: 429 });
      const claim = readPassToken(body.passToken);
      if (!claim) return NextResponse.json({ error: "Exam pass expired or invalid. Take the final exam again." }, { status: 403 });
      return NextResponse.json({ attestation: attest(body.accountId, claim.score, claim.max), score: claim.score, max_score: claim.max, grade: claim.grade }, { headers: noStore });
    }

    const limit = await rateLimit(`grade:${ip}`, 6, 10 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "Too many submissions", retryAfterSec: limit.retryAfterSec }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });

    remaining = limit.remaining;
    const result = await gradeExam(body.examToken, body.answers, body.code);
    let attestation = null;
    if (result.passed && !result.practice && typeof body.accountId === "string" && body.accountId) {
      attestation = attest(body.accountId, result.score, result.max_score);
    }
    const res = NextResponse.json({ ...result, attestation }, { headers: noStore });
    if (result.cooldownUntil) {
      await setIpCooldown(ip, result.cooldownUntil);
      res.cookies.set("r0_exam_cd", cooldownCookie(result.cooldownUntil), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: Math.ceil(EXAM.cooldownMs / 1000),
      });
    }
    return res;
  } catch (error) {
    if (error instanceof ExamError || error instanceof GraderError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "x-ratelimit-remaining": String(remaining) } });
    }
    console.error(error);
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
