import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readCooldown, startExam } from "@/lib/exam";
import { getIpCooldown } from "@/lib/exam/cooldown";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const practice = new URL(request.url).searchParams.get("mode") === "practice";
  if (practice) {
    // Guest path: a 5-question public paper with no prerequisites, no cooldown and no certificate.
    const limit = await rateLimit(`practice:${ip}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "Too many practice papers. Try again later.", retryAfterSec: limit.retryAfterSec }, { status: 429 });
    return NextResponse.json(startExam({ practice: true }), { headers: { "cache-control": "no-store" } });
  }
  const limit = await rateLimit(`start:${ip}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many exam starts. Try again later.", retryAfterSec: limit.retryAfterSec }, { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  }
  const jar = await cookies();
  const until = Math.max(readCooldown(jar.get("r0_exam_cd")?.value) ?? 0, await getIpCooldown(ip));
  if (until > Date.now()) {
    return NextResponse.json({ error: "Cooldown after a failed attempt.", cooldownUntil: until }, { status: 429 });
  }
  try {
    return NextResponse.json(startExam(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Exam is not available right now." }, { status: 503 });
  }
}
