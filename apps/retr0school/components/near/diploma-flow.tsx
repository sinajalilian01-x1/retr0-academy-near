"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiplomaCard } from "@/components/near/diploma-card";
import { ShareButton } from "@/components/near/share-button";
import { useNearWallet, type Attestation } from "@/components/near/wallet-provider";
import { examStore, type StoredPass } from "@/lib/exam/client";
import { EXAM } from "@/lib/exam/config";
import { DIPLOMA_CONTRACT, explorerAccount, explorerTx, verifyDiploma } from "@/lib/near";

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <li className="rounded-md border-2 border-line bg-elevated p-5">
      <p className="flex items-center gap-3 font-pixel text-[0.65rem] uppercase tracking-wide text-ink">
        <span
          className={done ? "inline-flex h-6 w-6 items-center justify-center bg-good text-canvas" : "inline-flex h-6 w-6 items-center justify-center border-2 border-line"}
          aria-hidden
        >
          {done ? "✓" : n}
        </span>
        {title}
      </p>
      <div className="mt-3 text-sm text-muted">{children}</div>
    </li>
  );
}

export function DiplomaFlow() {
  const { accountId, connect, mintDiploma, diploma, holderChecked, refreshDiploma } = useNearWallet();
  const [pass, setPass] = useState<StoredPass | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPass(examStore.pass());
    // Browser wallets may redirect back with ?transactionHashes=...
    const hash = new URLSearchParams(window.location.search).get("transactionHashes");
    if (hash) setTxHash(hash.split(",").pop() ?? null);
  }, []);

  const passed = Boolean(pass && pass.max === EXAM.maxScore && pass.score >= EXAM.passScore);
  const busy = status !== null;

  async function onMint() {
    if (!pass || !accountId) return;
    setError(null);
    try {
      setStatus("Grading on the server…");
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ track: "near", passToken: pass.passToken, accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed");
      if (!data.attestation) throw new Error("No attestation returned. Take the final exam again.");
      setStatus("Waiting for your wallet…");
      const result = await mintDiploma(data.attestation as Attestation);
      if (result.txHash) setTxHash(result.txHash);
      setStatus("Reading your diploma from chain…");
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        if (await verifyDiploma(accountId)) break;
      }
      await refreshDiploma();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message.includes("already holds") ? "This account already holds a NEAR Developer Certificate." : message);
    } finally {
      setStatus(null);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
      <ol className="flex flex-col gap-4">
        <Step n={1} title="Pass the final exam" done={passed}>
          {pass ? (
            <p>
              You passed: <strong className="text-ink">{pass.score}/{pass.max}</strong>, grade {pass.grade}. The signed pass is valid for 7 days.
            </p>
          ) : (
            <p>
              Take the <Link className="text-info underline underline-offset-4" href="/near/quiz">final exam</Link>: 25 randomized
              questions and 3 coding tasks, graded on the server. You need {EXAM.passScore}/{EXAM.maxScore} ({EXAM.passPercent}%).
            </p>
          )}
        </Step>
        <Step n={2} title="Connect a NEAR wallet" done={Boolean(accountId)}>
          {accountId ? (
            <p>
              Connected as{" "}
              <a className="font-mono text-info underline underline-offset-4" href={explorerAccount(accountId)} target="_blank" rel="noopener">
                {accountId}
              </a>
            </p>
          ) : (
            <>
              <p>MyNearWallet or Meteor on NEAR mainnet. Minting costs a tiny storage deposit (0.02 NEAR, unused part refunded) plus gas.</p>
              <Button type="button" className="mt-3" onClick={connect} data-testid="diploma-connect">
                Connect wallet
              </Button>
            </>
          )}
        </Step>
        <Step n={3} title="Mint your certificate NFT" done={Boolean(diploma)}>
          {diploma ? (
            <p>Minted. Your NEAR Developer Certificate lives on NEAR mainnet and is soulbound to your account. Advanced NEAR is unlocked.</p>
          ) : (
            <>
              <p>
                The grader signs your exam score for <em>your</em> account (ed25519). <code className="font-mono">mint_diploma</code> on{" "}
                <code className="font-mono">{DIPLOMA_CONTRACT}</code> checks that signature on chain, then mints. 0.02 NEAR covers
                storage; the unused part is refunded.
              </p>
              <Button
                type="button"
                className="mt-3"
                data-testid="diploma-mint"
                disabled={!passed || !accountId || busy || !holderChecked}
                onClick={onMint}
              >
                {status ?? "Mint certificate"}
              </Button>
            </>
          )}
          {error ? (
            <p role="alert" className="mt-3 break-words text-danger">
              {error}
            </p>
          ) : null}
        </Step>
      </ol>
      <div className="flex flex-col gap-4">
        {diploma ? (
          <>
            <DiplomaCard diploma={diploma} />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <ShareButton accountId={diploma.owner_id} score={diploma.score} maxScore={diploma.max_score} />
              {txHash ? (
                <a data-testid="diploma-tx" className="font-medium text-info underline underline-offset-4" href={explorerTx(txHash)} target="_blank" rel="noopener">
                  View mint transaction ↗
                </a>
              ) : null}
              <Link className="font-medium text-info underline underline-offset-4" href={`/verify?account=${encodeURIComponent(diploma.owner_id)}`}>
                Public verify link
              </Link>
              <Link className="font-medium text-info underline underline-offset-4" href="/advanced">
                Open Advanced NEAR →
              </Link>
            </div>
          </>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-md border-2 border-dashed border-line p-8 text-center text-sm text-muted">
            {accountId && !holderChecked ? "Checking the chain for your certificate…" : "Your certificate will appear here after you mint it."}
          </div>
        )}
      </div>
    </div>
  );
}
