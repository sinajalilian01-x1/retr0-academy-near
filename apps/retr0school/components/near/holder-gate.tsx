"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNearWallet } from "@/components/near/wallet-provider";

/**
 * Shows children only when the connected wallet holds a NEAR diploma (checked on chain with verify_diploma).
 * Otherwise shows a locked teaser.
 */
export function HolderGate({ title, children }: { title: string; children: ReactNode }) {
  const { ready, accountId, connect, diploma, holderChecked } = useNearWallet();
  if (diploma) return <div data-testid="holder-unlocked">{children}</div>;

  const checking = Boolean(accountId) && !holderChecked;
  return (
    <div data-testid="holder-locked" className="relative mt-8 overflow-hidden rounded-md border-2 border-dashed border-line bg-elevated p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_3px,var(--w3h-line)_3px_4px)]" />
      <div className="relative flex flex-col items-start gap-3">
        <p className="inline-flex items-center gap-2 font-pixel text-[0.65rem] uppercase tracking-wide text-ink">
          <Lock className="h-4 w-4" aria-hidden /> Holders only
        </p>
        <p className="text-ink">
          <strong>{title}</strong> is part of Advanced NEAR, unlocked by the on-chain Retr0 Academy diploma.
        </p>
        <p className="text-sm text-muted">
          {checking
            ? "Checking the chain for your diploma…"
            : accountId
              ? `${accountId} does not hold a NEAR diploma yet.`
              : "Connect a NEAR testnet wallet that holds a diploma to unlock."}
        </p>
        <div className="flex flex-wrap gap-3">
          {!accountId ? (
            <Button type="button" onClick={connect} disabled={!ready} data-testid="gate-connect">
              Connect wallet
            </Button>
          ) : null}
          <Link
            href="/diploma"
            className="inline-flex h-10 items-center rounded-md border-2 border-line bg-elevated px-4 text-sm font-medium text-ink shadow-sm hover:border-cyan"
          >
            Earn the diploma →
          </Link>
        </div>
      </div>
    </div>
  );
}
