import { safeDecode } from "@/lib/utils";
import { diplomaArt } from "@/lib/diploma-art";
import { ACCOUNT_RE, networkOf, verifyDiploma } from "@/lib/near";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ track: string; account: string }> };

/** PNG diploma art for any account. Used as the NFT `media` and as the share card image. */
export async function GET(request: Request, { params }: Ctx) {
  // R1 C-08: each render fans out to NEAR RPC, so cap it per client (crawlers/wallets fetch it a few times at most).
  const limit = await rateLimit(`diploma-png:${clientIp(request)}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return new Response("Too many requests", { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } });
  const { track, account: raw } = await params;
  const account = safeDecode(raw).replace(/\.png$/, "").toLowerCase();
  if (!ACCOUNT_RE.test(account) || !/^[a-z0-9-]{1,32}$/.test(track)) {
    return new Response("Bad request", { status: 400 });
  }
  const diploma = await verifyDiploma(account, track, networkOf(account)).catch(() => null);
  return diplomaArt(diploma, account);
}
