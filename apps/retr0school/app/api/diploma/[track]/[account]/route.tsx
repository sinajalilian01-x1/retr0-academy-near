import { diplomaArt } from "@/lib/diploma-art";
import { ACCOUNT_RE, verifyDiploma } from "@/lib/near";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ track: string; account: string }> };

/** PNG diploma art for any account. Used as the NFT `media` and as the share card image. */
export async function GET(_request: Request, { params }: Ctx) {
  const { track, account: raw } = await params;
  const account = decodeURIComponent(raw).replace(/\.png$/, "").toLowerCase();
  if (!ACCOUNT_RE.test(account) || !/^[a-z0-9-]{1,32}$/.test(track)) {
    return new Response("Bad request", { status: 400 });
  }
  const diploma = await verifyDiploma(account, track).catch(() => null);
  return diplomaArt(diploma, account);
}
