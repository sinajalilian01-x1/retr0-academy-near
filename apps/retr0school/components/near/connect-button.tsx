"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNearWallet } from "@/components/near/wallet-provider";
import { cn } from "@/lib/utils";

function short(id: string) {
  return id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id;
}

export function ConnectButton({ className }: { className?: string }) {
  const { ready, accountId, connect, disconnect } = useNearWallet();
  if (accountId) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="near-disconnect"
        title={`Connected as ${accountId}. Click to disconnect.`}
        onClick={() => void disconnect()}
        className={cn("font-mono", className)}
      >
        <span className="inline-block h-2 w-2 bg-good" aria-hidden />
        {short(accountId)}
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      data-testid="near-connect"
      onClick={connect}
      aria-busy={!ready || undefined}
      className={cn("font-pixel text-[0.6rem] uppercase tracking-wide", className)}
    >
      <Wallet className="h-4 w-4" aria-hidden />
      Connect
    </Button>
  );
}
