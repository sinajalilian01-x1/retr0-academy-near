"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { WalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import {
  DIPLOMA_CONTRACT,
  MINT_DEPOSIT_YOCTO,
  MINT_GAS,
  NEAR_NETWORK,
  NEAR_TRACK,
  verifyDiploma,
  type Verification,
} from "@/lib/near";

type MintResult = { txHash: string | null };

export type Attestation = {
  account_id: string;
  track: string;
  score: number;
  max_score: number;
  expires_at_ms: number;
  signature: string;
};

type WalletContextValue = {
  ready: boolean;
  accountId: string | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  mintDiploma: (attestation: Attestation) => Promise<MintResult>;
  /** The connected account's NEAR diploma, read on chain with verify_diploma. */
  diploma: Verification | null;
  holderChecked: boolean;
  refreshDiploma: () => Promise<Verification | null>;
  /** NEP-413: sign an off-chain message so the server can verify account ownership, then set the holder cookie. */
  unlockAdvanced: () => Promise<string | null>;
};

const NEP413_MESSAGE = "Unlock Advanced NEAR on Retr0 Academy";
const NEP413_RECIPIENT = "retr0-academy";
const PENDING_NONCE = "r0-nep413-nonce";

function toB64(bytes: Uint8Array) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** 32-byte nonce whose first 8 bytes are the current time (ms, big-endian), so the server can reject stale signatures. */
function makeNonce() {
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  new DataView(nonce.buffer).setBigUint64(0, BigInt(Date.now()));
  return nonce;
}

async function postHolder(body: Record<string, unknown>) {
  const res = await fetch("/api/holder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unlock failed");
  return data.holder as string;
}

/** Browser-redirect wallets (MyNearWallet) come back with the signature in the URL hash. */
export async function completeRedirectUnlock(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const signature = params.get("signature");
  const pending = sessionStorage.getItem(PENDING_NONCE);
  if (!signature || !pending) return null;
  sessionStorage.removeItem(PENDING_NONCE);
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return postHolder({
    accountId: params.get("accountId"),
    publicKey: params.get("publicKey"),
    signature,
    nonce: pending,
    callbackUrl: window.location.origin + window.location.pathname,
  });
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function NearWalletProvider({ children }: { children: ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [diploma, setDiploma] = useState<Verification | null>(null);
  const [holderChecked, setHolderChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      const [{ setupWalletSelector }, { setupModal }, { setupMyNearWallet }, { setupMeteorWallet }] = await Promise.all([
        import("@near-wallet-selector/core"),
        import("@near-wallet-selector/modal-ui"),
        import("@near-wallet-selector/my-near-wallet"),
        import("@near-wallet-selector/meteor-wallet"),
      ]);
      const s = await setupWalletSelector({
        network: NEAR_NETWORK,
        modules: [setupMyNearWallet(), setupMeteorWallet()],
      });
      if (cancelled) return;
      const m = setupModal(s, {
        contractId: DIPLOMA_CONTRACT,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        description: "Connect a NEAR testnet wallet to mint and show your NEAR Developer Certificate.",
      });
      const sync = () => setAccountId(s.store.getState().accounts.find((a) => a.active)?.accountId ?? null);
      sync();
      const sub = s.store.observable.subscribe(sync);
      unsubscribe = () => sub.unsubscribe();
      setSelector(s);
      setModal(m);
    };
    // Load the wallet code after first paint so it does not compete with the page itself.
    const run = () => void init().catch((error) => console.error("Wallet Selector failed to start", error));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(run, { timeout: 1500 }) : null;
    const timer = idle === null ? window.setTimeout(run, 300) : null;
    return () => {
      cancelled = true;
      if (idle !== null) w.cancelIdleCallback?.(idle);
      if (timer !== null) window.clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  const refreshDiploma = useCallback(async () => {
    if (!accountId) {
      setDiploma(null);
      setHolderChecked(true);
      return null;
    }
    try {
      const v = await verifyDiploma(accountId, NEAR_TRACK);
      setDiploma(v);
      return v;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      setHolderChecked(true);
    }
  }, [accountId]);

  useEffect(() => {
    setHolderChecked(false);
    void refreshDiploma();
  }, [refreshDiploma]);

  const connect = useCallback(() => modal?.show(), [modal]);

  const disconnect = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

  const mintDiploma = useCallback(
    async (a: Attestation): Promise<MintResult> => {
      if (!selector) throw new Error("Wallet is still loading.");
      const { actionCreators } = await import("@near-wallet-selector/core");
      const wallet = await selector.wallet();
      const outcome = await wallet.signAndSendTransaction({
        receiverId: DIPLOMA_CONTRACT,
        actions: [
          actionCreators.functionCall(
            "mint_diploma",
            {
              track: a.track,
              score: a.score,
              max_score: a.max_score,
              expires_at_ms: a.expires_at_ms,
              signature: a.signature,
            },
            MINT_GAS,
            MINT_DEPOSIT_YOCTO,
          ),
        ],
      });
      const failure = outcome && typeof outcome === "object" && "status" in outcome
        ? (outcome.status as { Failure?: unknown }).Failure
        : undefined;
      if (failure) throw new Error(JSON.stringify(failure));
      const txHash = outcome && typeof outcome === "object" && "transaction" in outcome
        ? ((outcome.transaction as { hash?: string }).hash ?? null)
        : null;
      return { txHash };
    },
    [selector],
  );

  const unlockAdvanced = useCallback(async () => {
    if (!selector) throw new Error("Wallet is still loading.");
    const wallet = await selector.wallet();
    if (!("signMessage" in wallet) || typeof wallet.signMessage !== "function") {
      throw new Error("This wallet cannot sign messages (NEP-413). Try MyNearWallet or Meteor.");
    }
    const nonce = makeNonce();
    const callbackUrl = window.location.origin + window.location.pathname;
    sessionStorage.setItem(PENDING_NONCE, toB64(nonce));
    const signed = await wallet.signMessage({
      message: NEP413_MESSAGE,
      recipient: NEP413_RECIPIENT,
      nonce: nonce as unknown as Buffer,
      callbackUrl,
    });
    if (!signed) return null; // redirect wallet: completeRedirectUnlock() finishes after the round trip
    sessionStorage.removeItem(PENDING_NONCE);
    return postHolder({
      accountId: signed.accountId,
      publicKey: signed.publicKey,
      signature: signed.signature,
      nonce: toB64(nonce),
    });
  }, [selector]);

  const value = useMemo(
    () => ({
      ready: Boolean(selector && modal),
      accountId,
      connect,
      disconnect,
      mintDiploma,
      diploma,
      holderChecked,
      refreshDiploma,
      unlockAdvanced,
    }),
    [selector, modal, accountId, connect, disconnect, mintDiploma, diploma, holderChecked, refreshDiploma, unlockAdvanced],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useNearWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useNearWallet must be used inside NearWalletProvider");
  return ctx;
}
