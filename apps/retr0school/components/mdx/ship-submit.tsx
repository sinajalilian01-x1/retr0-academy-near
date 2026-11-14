"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shipProofMessage, takeRedirectProof, useNearWallet, type SignedProof } from "@/components/near/wallet-provider";

type Ship = { student: string; contract: string; code_hash: string; greeting: string | null; verified_at: string; network?: "mainnet" | "testnet" };

/** Final-project submission: the server checks the contract on chain and links it to the student's verify page. */
export function ShipSubmit() {
  const wallet = useNearWallet();
  const [student, setStudent] = useState("");
  const [contract, setContract] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "ok"; ship: Ship } | { kind: "error"; message: string }>({ kind: "idle" });
  const me = student || wallet.accountId || "";

  async function post(studentId: string, contractId: string, proof: SignedProof | null) {
    const res = await fetch("/api/ship", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ student: studentId, contract: contractId, ...(proof ? { proof } : {}) }),
    });
    const data = (await res.json()) as { ship?: Ship; error?: string };
    if (!res.ok || !data.ship) throw new Error(data.error || "Verification failed");
    setState({ kind: "ok", ship: data.ship });
  }

  // Redirect wallets (MyNearWallet) come back here with the signature in the URL hash.
  useEffect(() => {
    const back = takeRedirectProof("ship");
    if (!back) return;
    setState({ kind: "busy" });
    const { extra, ...proof } = back;
    post(extra.student ?? "", extra.contract ?? "", proof).catch((e) => setState({ kind: "error", message: e instanceof Error ? e.message : String(e) }));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const studentId = me.trim().toLowerCase();
    const contractId = (contract || me).trim().toLowerCase();
    setState({ kind: "busy" });
    try {
      let proof: SignedProof | null = null;
      // Mainnet ships must be signed by the student's own wallet so nobody can attach a contract to someone else's page.
      if (!studentId.endsWith(".testnet")) {
        if (!wallet.accountId) {
          wallet.connect();
          throw new Error("Connect the wallet of " + studentId + " first, then press Verify again.");
        }
        if (wallet.accountId !== studentId) throw new Error(`Your connected wallet is ${wallet.accountId}. Connect ${studentId} to submit for it.`);
        proof = await wallet.signProof(shipProofMessage(studentId, contractId), "ship", { student: studentId, contract: contractId });
        if (!proof) return; // redirect wallet: finishes when it comes back
      }
      await post(studentId, contractId, proof);
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
          Your NEAR account (mainnet, or .testnet for practice)
          <Input
            data-testid="ship-student"
            placeholder="you.near or you.testnet"
            value={me}
            onChange={(e) => setStudent(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          Contract account (your account or a sub-account like hello.you.near)
          <Input
            data-testid="ship-contract"
            placeholder={me ? `hello.${me}` : "hello.you.near"}
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
          <span className="text-xs text-faint">Free. Mainnet ships ask for a gasless wallet signature to prove the account is yours; testnet practice just reads the chain.</span>
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
              Shipped! <span className="font-mono">{state.ship.contract}</span> has code on {state.ship.network === "testnet" ? "testnet (practice)" : "NEAR mainnet"}.
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
