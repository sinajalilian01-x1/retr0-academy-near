import { NextResponse } from "next/server";
import { getProof } from "@/lib/proof";

export const revalidate = 300;

/** Machine-readable mainnet proof (same data as /proof). */
export async function GET() {
  return NextResponse.json(await getProof(), { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
