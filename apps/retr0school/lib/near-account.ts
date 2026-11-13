import { RPC_URLS } from "@/lib/near";

export const EMPTY_CODE_HASH = "11111111111111111111111111111111";

export type AccountView = { amount: string; code_hash: string; storage_usage: number };

/** view_account over JSON-RPC. Returns null when the account does not exist. */
export async function viewAccount(accountId: string): Promise<AccountView | null> {
  let lastError: unknown = null;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "a", method: "query", params: { request_type: "view_account", finality: "final", account_id: accountId } }),
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      const cause = json.error?.cause?.name || json.result?.error || "";
      if (cause === "UNKNOWN_ACCOUNT" || /does not exist/i.test(String(cause)) || /does not exist/i.test(JSON.stringify(json.error ?? ""))) return null;
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result as AccountView;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}
