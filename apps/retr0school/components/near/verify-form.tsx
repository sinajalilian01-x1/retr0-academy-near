"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiplomaCard } from "@/components/near/diploma-card";
import { ACCOUNT_RE, NEAR_TRACK, explorerAccount, explorerToken, verifyDiploma, type Verification } from "@/lib/near";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; diploma: Verification }
  | { kind: "none"; account: string }
  | { kind: "error"; message: string };

export function VerifyForm() {
  const [account, setAccount] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run(id: string) {
    const clean = id.trim().toLowerCase();
    if (!ACCOUNT_RE.test(clean)) {
      setState({ kind: "error", message: "That is not a valid NEAR account id." });
      return;
    }
    setState({ kind: "loading" });
    const url = new URL(window.location.href);
    url.searchParams.set("account", clean);
    window.history.replaceState(null, "", url);
    try {
      const diploma = await verifyDiploma(clean, NEAR_TRACK);
      setState(diploma ? { kind: "found", diploma } : { kind: "none", account: clean });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("account");
    if (id) {
      setAccount(id);
      void run(id);
    }
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(account);
  }

  return (
    <div className="mt-8 max-w-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="verify-account" className="sr-only">
          NEAR account id
        </label>
        <Input
          id="verify-account"
          data-testid="verify-input"
          placeholder="learner.testnet"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" data-testid="verify-submit">
          Verify
        </Button>
      </form>
      <div className="mt-8" aria-live="polite">
        {state.kind === "loading" ? <p className="text-muted">Reading verify_diploma from NEAR testnet…</p> : null}
        {state.kind === "error" ? <p role="alert" className="text-danger">{state.message}</p> : null}
        {state.kind === "none" ? (
          <p data-testid="verify-none" className="rounded-md border-2 border-line bg-elevated p-4 text-ink">
            No NEAR diploma found for <span className="font-mono">{state.account}</span>.
          </p>
        ) : null}
        {state.kind === "found" ? (
          <>
            <DiplomaCard diploma={state.diploma} />
            <p className="mt-4 flex flex-wrap gap-4 text-sm">
              <a className="font-medium text-info underline underline-offset-4" href={explorerToken(state.diploma.token_id)} target="_blank" rel="noopener">
                Token on explorer ↗
              </a>
              <a className="font-medium text-info underline underline-offset-4" href={explorerAccount(state.diploma.owner_id)} target="_blank" rel="noopener">
                Holder on explorer ↗
              </a>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
