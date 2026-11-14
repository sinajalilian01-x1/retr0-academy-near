import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { getProof } from "@/lib/proof";

export const metadata: Metadata = pageMeta(
  "/proof",
  "Mainnet proof",
  "Retr0 Academy's soulbound NEAR Developer Certificates on NEAR mainnet: the contract, every certificate and every transaction, read live from chain.",
);

export const revalidate = 300;

const NB = "https://nearblocks.io";
const REPO = "https://github.com/sinajalilian01-x1/retr0-academy-near";
const near = (yocto: string) => {
  const n = BigInt(yocto);
  const whole = n / BigInt(10) ** BigInt(24);
  const frac = ((n % BigInt(10) ** BigInt(24)) / BigInt(10) ** BigInt(20)).toString().padStart(4, "0");
  return `${whole}.${frac}`;
};
const utc = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC";

function Stat({ label, value, hint, testid }: { label: string; value: string; hint?: string; testid?: string }) {
  return (
    <div className="border-2 border-line bg-elevated p-4" data-testid={testid}>
      <p className="font-pixel text-[0.6rem] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-pixel text-title text-highlight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const ext = "text-info underline underline-offset-4";

export default async function ProofPage() {
  const p = await getProof();
  const ok = p.transactions.filter((t) => t.success).length;
  const live = p.sources.chain === "live" && p.sources.indexer === "live";
  const track = p.tracks.find((t) => t.id === "near");

  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14" data-testid="proof-page">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">On-chain proof · NEAR mainnet</p>
      <h1 className="mt-3 font-pixel text-title">Mainnet proof</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Every Retr0 Academy certificate is a soulbound NFT minted on NEAR mainnet by the learner&apos;s own wallet, after the server grades the
        final exam and signs an ed25519 attestation that the contract checks. Nothing here is typed in by hand: it is read from public NEAR RPC
        and the NearBlocks indexer, refreshed every 5 minutes.
      </p>
      <p className="mt-3 text-sm" data-testid="proof-source">
        <span className={`inline-block border-2 px-2 py-0.5 font-pixel text-[0.55rem] uppercase ${live ? "border-good text-good" : "border-warn text-warn"}`}>
          {live ? "Live from chain" : "Snapshot fallback"}
        </span>{" "}
        <span className="text-muted">
          chain: {p.sources.chain} · indexer: {p.sources.indexer} · read {utc(Date.parse(p.fetched_at))}
          {live ? "" : ` · snapshot taken ${utc(Date.parse(p.snapshot_at))}`}
        </span>
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Certificates minted" value={String(p.total_supply)} hint="nft_total_supply, live" testid="proof-supply" />
        <Stat label="Contract transactions" value={String(p.tx_count)} hint={`${ok}/${p.transactions.length} succeeded on chain`} testid="proof-txcount" />
        <Stat label="Pass mark on chain" value={track ? `${track.pass_score}/${track.questions}` : "–"} hint="get_tracks: re-checked at mint" />
        <Stat label="Transfers allowed" value="0" hint="soulbound: transfer methods panic" />
      </section>

      <section className="mt-10 border-2 border-line bg-elevated p-5">
        <h2 className="font-pixel text-[0.75rem] uppercase text-highlight">Contract</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted">Account</dt>
          <dd className="font-mono break-all">
            <a className={ext} href={`${NB}/address/${p.contract}`} target="_blank" rel="noopener" data-testid="proof-contract">
              {p.contract} ↗
            </a>
          </dd>
          <dt className="text-muted">Owner</dt>
          <dd className="font-mono">
            <a className={ext} href={`${NB}/address/${p.owner}`} target="_blank" rel="noopener">{p.owner} ↗</a>
          </dd>
          <dt className="text-muted">Standard</dt>
          <dd>NEP-171 / NEP-177 / NEP-181 NFT, symbol R0DIPLOMA, one token per account per track</dd>
          <dt className="text-muted">Code hash</dt>
          <dd className="font-mono break-all">{p.code_hash}</dd>
          <dt className="text-muted">Attestor key</dt>
          <dd className="font-mono break-all">{p.attestor ?? "–"}</dd>
          <dt className="text-muted">Balance / storage</dt>
          <dd className="font-mono">{near(p.balance_yocto)} NEAR · {p.storage_usage.toLocaleString("en-US")} bytes</dd>
          <dt className="text-muted">Source</dt>
          <dd>
            <a className={ext} href={`${REPO}/blob/main/contracts/diploma/src/lib.rs`} target="_blank" rel="noopener">contracts/diploma/src/lib.rs ↗</a>{" "}
            · <a className={ext} href={`${REPO}/blob/main/contracts/diploma/src/tests.rs`} target="_blank" rel="noopener">tests ↗</a>
          </dd>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-pixel text-[0.75rem] uppercase text-highlight">Certificates (soulbound NFTs)</h2>
        <div className="mt-4 overflow-x-auto border-2 border-line bg-elevated">
          <table className="w-full min-w-[46rem] text-left text-sm" data-testid="proof-certs">
            <thead className="bg-sunken font-pixel text-[0.6rem] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Holder</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Issued (UTC)</th>
                <th className="px-4 py-3">Proof</th>
              </tr>
            </thead>
            <tbody>
              {p.certificates.map((c) => (
                <tr key={c.token_id} className="border-t border-line">
                  <td className="px-4 py-3 font-mono">{c.owner_id}</td>
                  <td className="px-4 py-3 font-mono">{c.score}/{c.max_score}</td>
                  <td className="px-4 py-3 font-pixel text-[0.7rem] text-highlight">{c.grade ?? "–"}</td>
                  <td className="px-4 py-3 font-mono text-muted">{c.issued_at_ms ? utc(c.issued_at_ms) : c.date}</td>
                  <td className="px-4 py-3">
                    {c.mint_tx ? (
                      <a className={`${ext} mr-3`} href={`${NB}/txns/${c.mint_tx}`} target="_blank" rel="noopener">mint tx ↗</a>
                    ) : null}
                    <a className={`${ext} mr-3`} href={`${NB}/nft-token/${p.contract}/${encodeURIComponent(c.token_id)}`} target="_blank" rel="noopener">token ↗</a>
                    <Link className={ext} href={`/verify/${encodeURIComponent(c.owner_id)}`}>verify live</Link>
                  </td>
                </tr>
              ))}
              {p.certificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">No certificates yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          &quot;Verify live&quot; calls <code className="font-mono">verify_diploma</code> and <code className="font-mono">nft_tokens_for_owner</code> on mainnet when you open it.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-pixel text-[0.75rem] uppercase text-highlight">Every transaction to the contract</h2>
        <div className="mt-4 overflow-x-auto border-2 border-line bg-elevated">
          <table className="w-full min-w-[52rem] text-left text-sm" data-testid="proof-txs">
            <thead className="bg-sunken font-pixel text-[0.6rem] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Time (UTC)</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Signer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {p.transactions.map((t) => (
                <tr key={t.hash} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-muted">{utc(t.block_timestamp_ms)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.methods.join(", ")}</td>
                  <td className="px-4 py-3 font-mono">{t.signer}</td>
                  <td className="px-4 py-3">
                    <span className={t.success ? "text-good" : "text-danger"}>{t.success ? "Success" : "Failed"}</span>
                    {t.rpc_status ? <span className="ml-2 text-xs text-muted">RPC: {t.rpc_status}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <a className={ext} href={`${NB}/txns/${t.hash}`} target="_blank" rel="noopener">{t.hash.slice(0, 10)}… ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-line bg-elevated p-5 text-sm">
          <h2 className="font-pixel text-[0.75rem] uppercase text-highlight">Check it yourself</h2>
          <pre className="mt-4 overflow-x-auto bg-code p-3 font-mono text-xs text-code-fg">{`near view ${p.contract} nft_total_supply '{}' --networkId mainnet
near view ${p.contract} verify_diploma '{"account_id":"${p.certificates[0]?.owner_id ?? "you.near"}","track":"near"}' --networkId mainnet
near view ${p.contract} get_attestor '{}' --networkId mainnet`}</pre>
          <p className="mt-3 text-muted">
            JSON of this page: <a className={ext} href="/api/proof" target="_blank" rel="noopener">/api/proof ↗</a>
          </p>
        </div>
        <div className="border-2 border-line bg-elevated p-5 text-sm">
          <h2 className="font-pixel text-[0.75rem] uppercase text-highlight">Why a certificate can&apos;t be faked</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
            <li>The contract verifies an ed25519 signature over contract, account, track, score, max score and expiry against the on-chain attestor key.</li>
            <li>The mint must be signed by the learner&apos;s own account, and each account gets one certificate per track.</li>
            <li><code className="font-mono">nft_transfer</code> and <code className="font-mono">nft_transfer_call</code> always panic: certificates are soulbound.</li>
            <li>
              The off-chain grader was red-teamed; every finding and fix is documented in the{" "}
              <a className={ext} href={`${REPO}/blob/main/docs/security/retr0-academy-r1-fixes.md`} target="_blank" rel="noopener">security fix log ↗</a>.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
