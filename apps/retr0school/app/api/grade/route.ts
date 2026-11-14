import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { EXAM } from "@/lib/exam/config";
import { ExamError, bindPass, cooldownCookie, gradeExam, readCooldown, readPassToken } from "@/lib/exam";
import { getIpCooldown, setIpCooldown } from "@/lib/exam/cooldown";
import { GraderError, attest, normalizeAccount } from "@/lib/grader";
import { OnceUnavailableError } from "@/lib/once";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { ServerSecretError } from "@/lib/server-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Final exam grading and mint attestations. Answers and hidden tests never leave the server.
 *   POST { track: "near", examToken, answers: {questionId: optionIndex}, code: {taskId: source}, accountId? }
 *     -> ExamResult (+ attestation when passed and accountId is given; the pass is then bound to that account)
 *   POST { track: "near", passToken, accountId }
 *     -> { attestation } for a previously passed exam (lets the learner connect a wallet later).
 *        A pass is bound to one account: the one in the token, or the first account it is exchanged for (R1 C-01).
 * The attestation is an ed25519 signature that the diploma contract (diploma.hlpok1lad.tg on mainnet) verifies before minting.
 */
export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || body.track !== "near") return NextResponse.json({ error: "Unknown track" }, { status: 400 });
  let remaining = -1;
  const noStore = { "cache-control": "no-store" };

  try {
    if (body.passToken !== undefined) {
      const limit = await rateLimit(`attest:${ip}`, 20, 10 * 60 * 1000);
      if (!limit.ok) return NextResponse.json({ error: "Too many requests", retryAfterSec: limit.retryAfterSec }, { status: 429 });
      const claim = readPassToken(body.passToken);
      if (!claim) return NextResponse.json({ error: "Exam pass expired or invalid. Take the final exam again." }, { status: 403 });
      const accountId = normalizeAccount(body.accountId);
      if (!(await bindPass(claim, accountId))) {
        return NextResponse.json({ error: "This exam pass is already linked to a different account. Each pass can mint for one account only." }, { status: 403, headers: noStore });
      }
      return NextResponse.json({ attestation: attest(accountId, claim.score, claim.max), score: claim.score, max_score: claim.max, grade: claim.grade }, { headers: noStore });
    }

    const limit = await rateLimit(`grade:${ip}`, 6, 10 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "Too many submissions", retryAfterSec: limit.retryAfterSec }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
    remaining = limit.remaining;

    // Validate the account before the attempt is burned, so a typo can't cost a passing attempt (R1 C-29).
    const accountId = typeof body.accountId === "string" && body.accountId ? normalizeAccount(body.accountId) : null;
    const jar = await cookies();
    const cooldownUntil = Math.max(readCooldown(jar.get("r0_exam_cd")?.value) ?? 0, await getIpCooldown(ip));

    const result = await gradeExam(body.examToken, body.answers, body.code, { accountId, cooldownUntil });
    const attestation = result.passed && !result.practice && accountId ? attest(accountId, result.score, result.max_score) : null;
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
    if (error instanceof ExamError || error instanceof GraderError || error instanceof OnceUnavailableError || error instanceof ServerSecretError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "x-ratelimit-remaining": String(remaining) } });
    }
    console.error(error);
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
