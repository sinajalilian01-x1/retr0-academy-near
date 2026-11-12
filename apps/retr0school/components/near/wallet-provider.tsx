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
};

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
    (async () => {
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
        description: "Connect a NEAR testnet wallet to mint and show your Retr0 Academy diploma.",
      });
      const sync = () => setAccountId(s.store.getState().accounts.find((a) => a.active)?.accountId ?? null);
      sync();
      const sub = s.store.observable.subscribe(sync);
      unsubscribe = () => sub.unsubscribe();
      setSelector(s);
      setModal(m);
    })().catch((error) => console.error("Wallet Selector failed to start", error));
    return () => {
      cancelled = true;
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
    }),
    [selector, modal, accountId, connect, disconnect, mintDiploma, diploma, holderChecked, refreshDiploma],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useNearWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useNearWallet must be used inside NearWalletProvider");
  return ctx;
}
