"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeRedirectUnlock, useNearWallet } from "@/components/near/wallet-provider";

/**
 * Locked teaser for Advanced NEAR. The lesson body is only rendered by the server after it has verified a
 * NEP-413 signature, the key's full access on chain, and verify_diploma (see app/api/holder). This component
 * just collects that signature.
 */
export function HolderGate({ title, children }: { title: string; children?: ReactNode }) {
  const router = useRouter();
  const { ready, accountId, connect, diploma, holderChecked, unlockAdvanced } = useNearWallet();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    completeRedirectUnlock()
      .then((holder) => holder && router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [router]);

  async function onUnlock() {
    setError(null);
    setStatus("Waiting for your wallet signature…");
    try {
      const holder = await unlockAdvanced();
      if (holder) {
        setStatus("Verified on chain. Loading…");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    }
  }

  if (children) return <div data-testid="holder-unlocked">{children}</div>;

  const checking = Boolean(accountId) && !holderChecked;
  return (
    <div data-testid="holder-locked" className="relative mt-8 overflow-hidden rounded-md border-2 border-dashed border-line bg-elevated p-6 md:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_3px,var(--w3h-line)_3px_4px)]" />
      <div className="relative flex flex-col items-start gap-3">
        <p className="inline-flex items-center gap-2 font-pixel text-[0.65rem] uppercase tracking-wide text-ink">
          <Lock className="h-4 w-4" aria-hidden /> Holders only
        </p>
        <p className="text-ink">
          <strong>{title}</strong> is part of Advanced NEAR, unlocked by the on-chain NEAR Developer Certificate. The lesson is
          rendered on the server only after you prove you own a holder account.
        </p>
        <p className="text-sm text-muted">
          {checking
            ? "Checking the chain for your certificate…"
            : accountId
              ? diploma
                ? `${accountId} holds a certificate. Sign a free message (no transaction, no gas) to unlock.`
                : `${accountId} does not hold a NEAR Developer Certificate yet.`
              : "Connect a NEAR testnet wallet that holds a certificate to unlock."}
        </p>
        <div className="flex flex-wrap gap-3">
          {!accountId ? (
            <Button type="button" onClick={connect} disabled={!ready} data-testid="gate-connect">
              Connect wallet
            </Button>
          ) : diploma ? (
            <Button type="button" onClick={onUnlock} disabled={Boolean(status)} data-testid="gate-unlock">
              {status ?? "Unlock with signature"}
            </Button>
          ) : null}
          <Link
            href="/near/quiz"
            className="inline-flex h-10 items-center rounded-md border-2 border-line bg-elevated px-4 text-sm font-medium text-ink shadow-sm hover:border-cyan"
          >
            Take the final exam →
          </Link>
        </div>
        {error ? (
          <p role="alert" className="break-words text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
