import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HOLDER_COOKIE, HOLDER_TTL_MS, HolderError, holderCookieValue, proveHolder, readHolder } from "@/lib/holder";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Who is unlocked on this browser (server-verified). */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ holder: readHolder(jar.get(HOLDER_COOKIE)?.value) }, { headers: { "cache-control": "no-store" } });
}

/** POST a NEP-413 signature { accountId, publicKey, signature, nonce, callbackUrl? } to unlock Advanced NEAR. */
export async function POST(request: Request) {
  const limit = await rateLimit(`holder:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON" }, { status: 400 });
  }
  try {
    const accountId = await proveHolder(body);
    const res = NextResponse.json({ holder: accountId });
    res.cookies.set(HOLDER_COOKIE, holderCookieValue(accountId), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(HOLDER_TTL_MS / 1000),
    });
    return res;
  } catch (error) {
    if (error instanceof HolderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Could not verify right now" }, { status: 502 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ holder: null });
  res.cookies.delete(HOLDER_COOKIE);
  return res;
}
