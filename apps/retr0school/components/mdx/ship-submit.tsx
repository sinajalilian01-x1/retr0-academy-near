"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNearWallet } from "@/components/near/wallet-provider";

type Ship = { student: string; contract: string; code_hash: string; greeting: string | null; verified_at: string };

/** Final-project submission: the server checks the contract on chain and links it to the student's verify page. */
export function ShipSubmit() {
  const wallet = useNearWallet();
  const [student, setStudent] = useState("");
  const [contract, setContract] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "ok"; ship: Ship } | { kind: "error"; message: string }>({ kind: "idle" });
  const me = student || wallet.accountId || "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/ship", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ student: me, contract: contract || me }),
      });
      const data = (await res.json()) as { ship?: Ship; error?: string };
      if (!res.ok || !data.ship) throw new Error(data.error || "Verification failed");
      setState({ kind: "ok", ship: data.ship });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="not-prose my-6 border-2 border-ink bg-elevated p-5 shadow-md" data-testid="ship-submit">
      <p className="flex items-center gap-2 font-pixel text-[0.65rem] leading-relaxed text-highlight">
        <Rocket className="h-4 w-4" aria-hidden /> Submit your shipped contract
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm text-muted">
          Your testnet account
          <Input
            data-testid="ship-student"
            placeholder="you.testnet"
            value={me}
            onChange={(e) => setStudent(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Contract account (your account or a sub-account like hello.you.testnet)
          <Input
            data-testid="ship-contract"
            placeholder={me ? `hello.${me}` : "hello.you.testnet"}
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" data-testid="ship-verify" disabled={!me || state.kind === "busy"}>
            {state.kind === "busy" ? "Checking the chain…" : "Verify on chain"}
          </Button>
          <span className="text-xs text-faint">Free, no wallet signature needed: we only read the chain.</span>
        </div>
      </form>
      <div aria-live="polite">
        {state.kind === "error" ? (
          <p role="alert" data-testid="ship-error" className="mt-4 border-2 border-danger bg-danger-soft p-3 text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.kind === "ok" ? (
          <div data-testid="ship-ok" className="mt-4 border-2 border-good bg-good-soft p-3 text-sm text-ink">
            <p className="font-semibold">
              Shipped! <span className="font-mono">{state.ship.contract}</span> has code on testnet.
            </p>
            {state.ship.greeting ? <p className="mt-1 font-mono text-xs">get_greeting() → “{state.ship.greeting}”</p> : null}
            <p className="mt-2">
              It now shows on your public page:{" "}
              <Link className="text-info underline underline-offset-4" href={`/verify/${encodeURIComponent(state.ship.student)}`}>
                /verify/{state.ship.student}
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
