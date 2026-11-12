"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiplomaCard } from "@/components/near/diploma-card";
import { useNearWallet } from "@/components/near/wallet-provider";
import { useProgress } from "@/lib/progress";
import {
  DIPLOMA_CONTRACT,
  NEAR_PASS_SCORE,
  NEAR_TRACK,
  explorerAccount,
  explorerTx,
  readNearAnswers,
  verifyDiploma,
  type Verification,
} from "@/lib/near";

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
  const { ready, accountId, connect, mintDiploma } = useNearWallet();
  const progress = useProgress();
  const quiz = progress.quizzes[NEAR_TRACK];
  const [answers, setAnswers] = useState<number[] | null>(null);
  const [diploma, setDiploma] = useState<Verification | null>(null);
  const [checking, setChecking] = useState(false);
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAnswers(readNearAnswers());
    // Browser wallets may redirect back with ?transactionHashes=...
    const hash = new URLSearchParams(window.location.search).get("transactionHashes");
    if (hash) setTxHash(hash.split(",").pop() ?? null);
  }, []);

  const refresh = useCallback(async () => {
    if (!accountId) {
      setDiploma(null);
      return;
    }
    setChecking(true);
    try {
      setDiploma(await verifyDiploma(accountId));
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  }, [accountId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const passed = Boolean(quiz && quiz.correct >= NEAR_PASS_SCORE && answers);

  async function onMint() {
    if (!answers) return;
    setMinting(true);
    setError(null);
    try {
      const result = await mintDiploma(NEAR_TRACK, answers);
      if (result.txHash) setTxHash(result.txHash);
      // Give the RPC a moment, then read the credential back from chain.
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const v = await verifyDiploma(accountId!);
        if (v) {
          setDiploma(v);
          break;
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message.includes("already holds") ? "This account already holds a NEAR diploma." : message);
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
      <ol className="flex flex-col gap-4">
        <Step n={1} title="Pass the NEAR quiz" done={passed}>
          {quiz ? (
            <p>
              Your score: <strong className="text-ink">{quiz.correct}/{quiz.total}</strong>. You need {NEAR_PASS_SCORE}.{" "}
              {!passed ? (
                <Link className="text-info underline underline-offset-4" href="/near/quiz">
                  Try the quiz again
                </Link>
              ) : null}
            </p>
          ) : (
            <p>
              Take the <Link className="text-info underline underline-offset-4" href="/near/quiz">NEAR quiz</Link>. Your
              answers stay in this browser until you mint.
            </p>
          )}
        </Step>
        <Step n={2} title="Connect a testnet wallet" done={Boolean(accountId)}>
          {accountId ? (
            <p>
              Connected as{" "}
              <a className="font-mono text-info underline underline-offset-4" href={explorerAccount(accountId)} target="_blank" rel="noopener">
                {accountId}
              </a>
            </p>
          ) : (
            <>
              <p>MyNearWallet or Meteor on testnet. No account yet? Create one free at testnet.mynearwallet.com.</p>
              <Button type="button" className="mt-3" disabled={!ready} onClick={connect} data-testid="diploma-connect">
                Connect wallet
              </Button>
            </>
          )}
        </Step>
        <Step n={3} title="Mint your diploma NFT" done={Boolean(diploma)}>
          {diploma ? (
            <p>Minted. Your diploma lives on NEAR testnet and is soulbound to your account.</p>
          ) : (
            <>
              <p>
                Calls <code className="font-mono">mint_diploma</code> on <code className="font-mono">{DIPLOMA_CONTRACT}</code> with your
                answers and 0.02 NEAR for storage (the unused part is refunded). The contract grades the quiz on chain.
              </p>
              <Button
                type="button"
                className="mt-3"
                data-testid="diploma-mint"
                disabled={!passed || !accountId || minting || checking}
                onClick={onMint}
              >
                {minting ? "Waiting for wallet…" : "Mint diploma"}
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
            <div className="flex flex-wrap gap-3 text-sm">
              {txHash ? (
                <a data-testid="diploma-tx" className="font-medium text-info underline underline-offset-4" href={explorerTx(txHash)} target="_blank" rel="noopener">
                  View mint transaction ↗
                </a>
              ) : null}
              <Link className="font-medium text-info underline underline-offset-4" href={`/verify?account=${encodeURIComponent(diploma.owner_id)}`}>
                Public verify link
              </Link>
              <a className="font-medium text-info underline underline-offset-4" href={explorerAccount(diploma.owner_id)} target="_blank" rel="noopener">
                Account on explorer ↗
              </a>
            </div>
          </>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-md border-2 border-dashed border-line p-8 text-center text-sm text-muted">
            {checking ? "Checking the chain for your diploma…" : "Your diploma will appear here after you mint it."}
          </div>
        )}
      </div>
    </div>
  );
}
