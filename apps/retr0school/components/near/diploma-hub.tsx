"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DiplomaFlow } from "@/components/near/diploma-flow";
import { ShareButton, shareUrlFor } from "@/components/near/share-button";
import { VerifyForm } from "@/components/near/verify-form";
import { useNearWallet } from "@/components/near/wallet-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tab = "mint" | "verify" | "share";

const TABS: { id: Tab; label: string; testId: string }[] = [
  { id: "mint", label: "Mint", testId: "diploma-tab-mint" },
  { id: "verify", label: "Verify", testId: "diploma-tab-verify" },
  { id: "share", label: "Share", testId: "diploma-tab-share" },
];

function tabFromLocation(): Tab {
  const hash = window.location.hash.replace("#", "");
  if (hash === "verify" || hash === "share" || hash === "mint") return hash;
  if (new URLSearchParams(window.location.search).get("account")) return "verify";
  return "mint";
}

function SharePanel() {
  const { diploma, accountId } = useNearWallet();
  const [lookup, setLookup] = useState(accountId ?? "");

  useEffect(() => {
    if (accountId && !lookup) setLookup(accountId);
  }, [accountId, lookup]);

  return (
    <div className="mt-8 max-w-2xl" id="share">
      {diploma ? (
        <div className="flex flex-col gap-4">
          <p className="text-muted">
            Your diploma is live on NEAR testnet. Share the public page, or post it on X with the on-chain art card.
          </p>
          <p className="text-sm">
            Public page:{" "}
            <Link className="font-mono text-info underline underline-offset-4" href={`/d/${encodeURIComponent(diploma.owner_id)}`}>
              {shareUrlFor(diploma.owner_id)}
            </Link>
          </p>
          <ShareButton accountId={diploma.owner_id} score={diploma.score} maxScore={diploma.max_score} />
        </div>
      ) : (
        <p className="text-muted">
          Mint your diploma first, then come back here to share it. You can also open anyone&apos;s public diploma page
          below.
        </p>
      )}
      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const id = lookup.trim().toLowerCase();
          if (id) window.location.href = `/d/${encodeURIComponent(id)}`;
        }}
      >
        <label htmlFor="share-account" className="sr-only">
          NEAR account id
        </label>
        <Input
          id="share-account"
          data-testid="share-input"
          placeholder="learner.testnet"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" data-testid="share-open">
          Open share page
        </Button>
      </form>
    </div>
  );
}

export function DiplomaHub() {
  const [tab, setTab] = useState<Tab>("mint");

  useEffect(() => {
    const apply = () => setTab(tabFromLocation());
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  function go(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.hash = next;
    history.replaceState(null, "", url);
  }

  return (
    <div className="mt-8">
      <div role="tablist" aria-label="Diploma actions" className="flex flex-wrap gap-2 border-b-2 border-line pb-3">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={item.testId}
              className={cn(
                "rounded-md border-2 px-4 py-2 text-sm font-medium",
                selected ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-ink",
              )}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2">
        {tab === "mint" ? (
          <div id="mint">
            <DiplomaFlow />
          </div>
        ) : null}
        {tab === "verify" ? (
          <div id="verify">
            <VerifyForm />
          </div>
        ) : null}
        {tab === "share" ? <SharePanel /> : null}
      </div>
    </div>
  );
}
