"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCOUNT_RE } from "@/lib/near";

/** Search box for the public developer verification page. Navigates to the shareable /verify/<account> URL. */
export function VerifySearch({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const clean = account.trim().toLowerCase();
    if (!ACCOUNT_RE.test(clean)) {
      setError("That is not a valid NEAR account id.");
      return;
    }
    setError("");
    setBusy(true);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
      <label htmlFor="verify-account" className="sr-only">
        NEAR account id
      </label>
      <Input
        id="verify-account"
        data-testid="verify-input"
        placeholder="learner.near"
        value={account}
        onChange={(e) => {
          setAccount(e.target.value);
          setBusy(false);
        }}
        autoComplete="off"
        spellCheck={false}
      />
      <Button type="submit" data-testid="verify-submit" disabled={busy}>
        {busy ? "Checking…" : "Verify"}
      </Button>
      {error ? (
        <p role="alert" className="text-danger sm:self-center">
          {error}
        </p>
      ) : null}
    </form>
  );
}
