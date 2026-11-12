"use client";

import Link from "next/link";
import { useNearWallet } from "@/components/near/wallet-provider";

/** Header badge shown when the connected wallet holds a NEAR diploma. */
export function HolderBadge() {
  const { diploma } = useNearWallet();
  if (!diploma) return null;
  return (
    <Link
      href={`/d/${encodeURIComponent(diploma.owner_id)}`}
      data-testid="holder-badge"
      title={`Diploma holder: ${diploma.score}/${diploma.max_score}`}
      className="hidden items-center gap-1.5 border-2 px-2 py-1 font-pixel text-[0.55rem] uppercase tracking-wide sm:inline-flex"
      style={{ borderColor: "#00EC97", color: "#00EC97", boxShadow: "0 0 8px rgba(0,236,151,0.55)" }}
    >
      <span aria-hidden="true">★</span> Holder
    </Link>
  );
}
