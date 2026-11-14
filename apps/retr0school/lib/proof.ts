import "server-only";

import snapshot from "@/data/proof-snapshot.json";
import { NETWORKS } from "@/lib/near";

/**
 * Mainnet proof for /proof and /api/proof: the diploma contract, every certificate (soulbound NFT) and every
 * transaction to the contract, read live from public NEAR RPC and the NearBlocks indexer. If either source is
 * down, the page falls back to the committed snapshot (data/proof-snapshot.json) and says so.
 */
export type ProofTx = {
  hash: string;
  signer: string;
  receiver: string;
  methods: string[];
  block_timestamp_ms: number;
  block_height: number | string | null;
  success: boolean;
  rpc_status?: string;
};
export type ProofCert = { token_id: string; owner_id: string; score: number; max_score: number; grade: string | null; date: string; issued_at_ms: number; mint_tx?: string | null };
export type Proof = {
  network: "mainnet";
  contract: string;
  owner: string;
  code_hash: string;
  attestor: string | null;
  balance_yocto: string;
  storage_usage: number;
  tracks: { id: string; title: string; questions: number; pass_score: number }[];
  total_supply: number;
  certificates: ProofCert[];
  transactions: ProofTx[];
  tx_count: number;
  sources: { chain: "live" | "snapshot"; indexer: "live" | "snapshot" };
  fetched_at: string;
  snapshot_at: string;
};

const CONTRACT = snapshot.contract;
const RPC = NETWORKS.mainnet.rpc;
const ARCHIVAL_RPC = ["https://archival-rpc.mainnet.fastnear.com", "https://archival-rpc.mainnet.near.org"];
const NEARBLOCKS = "https://api.nearblocks.io/v1";
const REVALIDATE = 300;

async function rpc<T>(urls: string[], method: string, params: unknown): Promise<T> {
  let last: unknown = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "proof", method, params }),
        next: { revalidate: REVALIDATE },
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.cause?.name || json.error.message || "RPC error");
      return json.result as T;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("RPC unavailable");
}

async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await rpc<{ result: number[] }>(RPC, "query", {
    request_type: "call_function",
    finality: "final",
    account_id: CONTRACT,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64"),
  });
  return JSON.parse(Buffer.from(r.result).toString("utf8")) as T;
}

type NftToken = { token_id: string; owner_id: string; metadata: { extra?: string | null } | null };

async function liveChain() {
  const [account, supply, tracks, attestor] = await Promise.all([
    rpc<{ code_hash: string; amount: string; storage_usage: number }>(RPC, "query", { request_type: "view_account", finality: "final", account_id: CONTRACT }),
    view<string>("nft_total_supply"),
    view<Proof["tracks"]>("get_tracks"),
    view<string | null>("get_attestor"),
  ]);
  const total = Number(supply);
  const certificates: ProofCert[] = [];
  for (let from = 0; from < Math.min(total, 500); from += 100) {
    const page = await view<NftToken[]>("nft_tokens", { from_index: String(from), limit: 100 });
    for (const t of page) {
      let x: Record<string, unknown> = {};
      try {
        x = JSON.parse(t.metadata?.extra ?? "{}");
      } catch {
        x = {};
      }
      certificates.push({
        token_id: t.token_id,
        owner_id: t.owner_id,
        score: Number(x.score ?? 0),
        max_score: Number(x.max_score ?? 0),
        grade: typeof x.grade === "string" ? x.grade : null,
        date: String(x.date ?? ""),
        issued_at_ms: Number(x.issued_at_ms ?? 0),
      });
    }
  }
  return { code_hash: account.code_hash, balance_yocto: account.amount, storage_usage: account.storage_usage, total_supply: total, tracks, attestor, certificates };
}

type NbTxn = {
  transaction_hash: string;
  signer_account_id: string;
  receiver_account_id: string;
  block_timestamp: string;
  block?: { block_height?: number };
  actions?: { action?: string; method?: string | null }[];
  outcomes?: { status?: boolean | null };
};

async function liveIndexer(): Promise<{ transactions: ProofTx[]; tx_count: number }> {
  const opts = { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } };
  const [list, count] = await Promise.all([
    fetch(`${NEARBLOCKS}/account/${CONTRACT}/txns-only?per_page=100`, opts).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`nearblocks ${r.status}`)))),
    fetch(`${NEARBLOCKS}/account/${CONTRACT}/txns-only/count`, opts).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const txns = (list?.txns ?? []) as NbTxn[];
  if (!Array.isArray(txns)) throw new Error("nearblocks: bad response");
  const transactions = txns.map((x) => ({
    hash: x.transaction_hash,
    signer: x.signer_account_id,
    receiver: x.receiver_account_id,
    methods: (x.actions ?? []).map((a) => a.method || a.action || "?"),
    block_timestamp_ms: Math.floor(Number(x.block_timestamp) / 1e6),
    block_height: x.block?.block_height ?? null,
    success: x.outcomes?.status === true,
  }));
  const counted = Number(count?.txns?.[0]?.count);
  return { transactions, tx_count: Number.isFinite(counted) && counted > 0 ? counted : transactions.length };
}

/** Confirm the final status of a transaction on an archival RPC node (independent of the indexer). */
async function rpcStatus(tx: ProofTx): Promise<string> {
  try {
    const r = await rpc<{ status: Record<string, unknown>; receipts_outcome: { outcome: { status: Record<string, unknown> } }[] }>(ARCHIVAL_RPC, "EXPERIMENTAL_tx_status", {
      tx_hash: tx.hash,
      sender_account_id: tx.signer,
      wait_until: "FINAL",
    });
    const failed = r.receipts_outcome.some((o) => "Failure" in o.outcome.status);
    const key = Object.keys(r.status)[0] ?? "Unknown";
    return failed ? "Failure" : key;
  } catch {
    return "unknown";
  }
}

export async function getProof(): Promise<Proof> {
  const snap = snapshot as unknown as Omit<Proof, "sources" | "fetched_at" | "snapshot_at"> & { captured_at: string };
  const [chain, indexer] = await Promise.allSettled([liveChain(), liveIndexer()]);
  const c = chain.status === "fulfilled" ? chain.value : null;
  const ix = indexer.status === "fulfilled" ? indexer.value : null;
  let transactions = ix?.transactions ?? snap.transactions;
  if (ix) {
    // Re-check up to 20 recent transactions on RPC; the snapshot already carries RPC-verified statuses.
    const checked = await Promise.all(transactions.slice(0, 20).map(async (t) => ({ ...t, rpc_status: await rpcStatus(t) })));
    transactions = [...checked, ...transactions.slice(20)];
  }
  const certificates = (c?.certificates ?? snap.certificates).map((cert) => ({
    ...cert,
    mint_tx: transactions.find((t) => t.methods.includes("mint_diploma") && t.signer === cert.owner_id && t.success)?.hash ?? null,
  }));
  return {
    network: "mainnet",
    contract: CONTRACT,
    owner: snap.owner,
    code_hash: c?.code_hash ?? snap.code_hash,
    attestor: c?.attestor ?? snap.attestor,
    balance_yocto: c?.balance_yocto ?? snap.balance_yocto,
    storage_usage: c?.storage_usage ?? snap.storage_usage,
    tracks: c?.tracks ?? snap.tracks,
    total_supply: c?.total_supply ?? snap.total_supply,
    certificates,
    transactions,
    tx_count: ix?.tx_count ?? snap.tx_count,
    sources: { chain: c ? "live" : "snapshot", indexer: ix ? "live" : "snapshot" },
    fetched_at: new Date().toISOString(),
    snapshot_at: snap.captured_at,
  };
}
