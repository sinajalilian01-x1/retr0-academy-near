// NEAR configuration shared by the client components. All values can be overridden at build time.
export const NEAR_NETWORK = "testnet" as const;
export const DIPLOMA_CONTRACT = process.env.NEXT_PUBLIC_DIPLOMA_CONTRACT || "diploma.retr0school.testnet";
export const NEAR_TRACK = "near";
/** Must match the pass_score set on chain with set_track. */
export const NEAR_PASS_SCORE = 32;
export const RPC_URLS = [
  process.env.NEXT_PUBLIC_NEAR_RPC || "https://rpc.testnet.near.org",
  "https://test.rpc.fastnear.com",
];
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://retr0school-near.vercel.app").replace(/\/+$/, "");
export const CODE_E_URL = (process.env.NEXT_PUBLIC_CODE_E_URL || "https://code-e-near.vercel.app").replace(/\/+$/, "");
export const MINT_DEPOSIT_YOCTO = BigInt("20000000000000000000000"); // 0.02 NEAR, unused part is refunded
export const MINT_GAS = BigInt("100000000000000"); // 100 Tgas

export const explorerTx = (hash: string) => `https://testnet.nearblocks.io/txns/${hash}`;
export const explorerAccount = (id: string) => `https://testnet.nearblocks.io/address/${id}`;
export const explorerToken = (tokenId: string) =>
  `https://testnet.nearblocks.io/nft-token/${DIPLOMA_CONTRACT}/${encodeURIComponent(tokenId)}`;

export type Verification = {
  valid: boolean;
  token_id: string;
  owner_id: string;
  track: string;
  track_title: string;
  score: number;
  max_score: number;
  issued_at_ms: number;
  date: string;
  /** Letter grade from the final exam; null for diplomas minted before the exam existed. */
  grade?: string | null;
};

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** Read-only contract call over JSON-RPC. No wallet, no gas. */
export async function viewCall<T>(contractId: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  let lastError: unknown = null;
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "r0",
          method: "query",
          params: {
            request_type: "call_function",
            finality: "optimistic",
            account_id: contractId,
            method_name: method,
            args_base64: toBase64(JSON.stringify(args)),
          },
        }),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.cause?.name || json.error.message || "RPC error");
      if (json.result?.error) throw new Error(json.result.error);
      const text = new TextDecoder().decode(new Uint8Array(json.result.result));
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("RPC unavailable");
}

export type NftToken = {
  token_id: string;
  owner_id: string;
  metadata: { title?: string; media?: string; extra?: string } | null;
};

/** All diplomas, via NEP-181 enumeration (paged). */
export async function listDiplomas(limit = 500): Promise<Verification[]> {
  const total = Number(await viewCall<string>(DIPLOMA_CONTRACT, "nft_total_supply"));
  const out: Verification[] = [];
  for (let from = 0; from < Math.min(total, limit); from += 50) {
    const page = await viewCall<NftToken[]>(DIPLOMA_CONTRACT, "nft_tokens", { from_index: String(from), limit: 50 });
    for (const t of page) {
      try {
        const x = JSON.parse(t.metadata?.extra ?? "{}");
        out.push({
          valid: true,
          token_id: t.token_id,
          owner_id: t.owner_id,
          track: x.track,
          track_title: (t.metadata?.title ?? "").replace(/^.*?Diploma:\s*/, ""),
          score: x.score,
          max_score: x.max_score,
          issued_at_ms: x.issued_at_ms,
          date: x.date,
        });
      } catch {}
    }
  }
  return out;
}

export function verifyDiploma(accountId: string, track = NEAR_TRACK) {
  return viewCall<Verification | null>(DIPLOMA_CONTRACT, "verify_diploma", { account_id: accountId, track });
}

export const ACCOUNT_RE = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

// Quiz answers for the NEAR track are kept in the browser so the diploma page can submit them on chain.
const ANSWERS_KEY = "r0-near-quiz-answers";
export function saveNearAnswers(answers: number[]) {
  try {
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
  } catch {}
}
export function readNearAnswers(): number[] | null {
  try {
    const raw = localStorage.getItem(ANSWERS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) && parsed.every((n) => Number.isInteger(n)) ? parsed : null;
  } catch {
    return null;
  }
}
