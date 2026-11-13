// NEAR configuration shared by the client components. All values can be overridden at build time.
export type NearNetwork = "mainnet" | "testnet";

/** Certificates live on mainnet. Testnet stays readable as the earlier beta. */
export const NEAR_NETWORK: NearNetwork = process.env.NEXT_PUBLIC_NEAR_NETWORK === "testnet" ? "testnet" : "mainnet";

export const NETWORKS: Record<NearNetwork, { diploma: string; rpc: string[]; explorer: string; label: string }> = {
  mainnet: {
    diploma: "diploma.hlpok1lad.tg",
    rpc: ["https://rpc.mainnet.fastnear.com", "https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"],
    explorer: "https://nearblocks.io",
    label: "mainnet",
  },
  testnet: {
    diploma: "diploma.retr0school.testnet",
    rpc: ["https://rpc.testnet.fastnear.com", "https://rpc.testnet.near.org"],
    explorer: "https://testnet.nearblocks.io",
    label: "testnet (beta)",
  },
};

export const DIPLOMA_CONTRACT = process.env.NEXT_PUBLIC_DIPLOMA_CONTRACT || NETWORKS[NEAR_NETWORK].diploma;
/** The beta contract on testnet, kept so earlier certificates stay verifiable. */
export const TESTNET_DIPLOMA_CONTRACT = NETWORKS.testnet.diploma;
export const NEAR_TRACK = "near";
/** Must match the pass_score set on chain with set_track. */
export const NEAR_PASS_SCORE = 32;
export const RPC_URLS = process.env.NEXT_PUBLIC_NEAR_RPC ? [process.env.NEXT_PUBLIC_NEAR_RPC, ...NETWORKS[NEAR_NETWORK].rpc] : NETWORKS[NEAR_NETWORK].rpc;
export const rpcUrls = (net: NearNetwork = NEAR_NETWORK) => (net === NEAR_NETWORK ? RPC_URLS : NETWORKS[net].rpc);
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://retr0school-near.vercel.app").replace(/\/+$/, "");
export const CODE_E_URL = (process.env.NEXT_PUBLIC_CODE_E_URL || "https://code-e-near.vercel.app").replace(/\/+$/, "");
export const MINT_DEPOSIT_YOCTO = BigInt("20000000000000000000000"); // 0.02 NEAR, unused part is refunded
export const MINT_GAS = BigInt("100000000000000"); // 100 Tgas

/** Network an account id belongs to: `.testnet` names are testnet, everything else mainnet. */
export const networkOf = (accountId: string): NearNetwork => (accountId.endsWith(".testnet") ? "testnet" : "mainnet");
const explorer = (net: NearNetwork) => NETWORKS[net].explorer;
export const explorerTx = (hash: string, net: NearNetwork = NEAR_NETWORK) => `${explorer(net)}/txns/${hash}`;
export const explorerAccount = (id: string, net: NearNetwork = networkOf(id)) => `${explorer(net)}/address/${id}`;
export const explorerToken = (tokenId: string, net: NearNetwork = NEAR_NETWORK) =>
  `${explorer(net)}/nft-token/${net === NEAR_NETWORK ? DIPLOMA_CONTRACT : NETWORKS[net].diploma}/${encodeURIComponent(tokenId)}`;

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
  /** Where the certificate lives. Missing means the current network. */
  network?: NearNetwork;
};

function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** Read-only contract call over JSON-RPC. No wallet, no gas. */
export async function viewCall<T>(contractId: string, method: string, args: Record<string, unknown> = {}, net: NearNetwork = NEAR_NETWORK): Promise<T> {
  let lastError: unknown = null;
  for (const url of rpcUrls(net)) {
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
        signal: AbortSignal.timeout(6000),
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
export async function listDiplomas(limit = 500, net: NearNetwork = NEAR_NETWORK): Promise<Verification[]> {
  const contract = net === NEAR_NETWORK ? DIPLOMA_CONTRACT : NETWORKS[net].diploma;
  const total = Number(await viewCall<string>(contract, "nft_total_supply", {}, net));
  const out: Verification[] = [];
  for (let from = 0; from < Math.min(total, limit); from += 50) {
    const page = await viewCall<NftToken[]>(contract, "nft_tokens", { from_index: String(from), limit: 50 }, net);
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
          grade: x.grade ?? null,
          network: net,
        });
      } catch {}
    }
  }
  return out;
}

function toVerification(t: NftToken): Verification | null {
  try {
    const x = JSON.parse(t.metadata?.extra ?? "{}");
    return {
      valid: true,
      token_id: t.token_id,
      owner_id: t.owner_id,
      track: x.track,
      track_title: (t.metadata?.title ?? "").replace(/^.*?Diploma:\s*/, ""),
      score: x.score,
      max_score: x.max_score,
      issued_at_ms: x.issued_at_ms,
      date: x.date,
      grade: x.grade ?? null,
    };
  } catch {
    return null;
  }
}

/** Every certificate an account holds, read live with NEP-181 nft_tokens_for_owner. */
export async function tokensForOwner(accountId: string, net: NearNetwork = NEAR_NETWORK): Promise<Verification[]> {
  const contract = net === NEAR_NETWORK ? DIPLOMA_CONTRACT : NETWORKS[net].diploma;
  const page = await viewCall<NftToken[]>(contract, "nft_tokens_for_owner", { account_id: accountId, from_index: "0", limit: 20 }, net);
  return page.map(toVerification).filter((v): v is Verification => !!v).map((v) => ({ ...v, network: net }));
}

export function verifyDiploma(accountId: string, track = NEAR_TRACK, net: NearNetwork = NEAR_NETWORK) {
  const contract = net === NEAR_NETWORK ? DIPLOMA_CONTRACT : NETWORKS[net].diploma;
  return viewCall<Verification | null>(contract, "verify_diploma", { account_id: accountId, track }, net).then((v) => (v ? { ...v, network: net } : v));
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
