import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ExternalLink, Rocket, ShieldAlert } from "lucide-react";
import { DiplomaCard } from "@/components/near/diploma-card";
import { ShareButton } from "@/components/near/share-button";
import { VerifySearch } from "@/components/near/verify-search";
import { ACCOUNT_RE, DIPLOMA_CONTRACT, SITE_URL, explorerAccount, explorerToken, tokensForOwner, type Verification } from "@/lib/near";
import { viewAccount } from "@/lib/near-account";
import { liveShipStatus, loadShip, type ShipRecord } from "@/lib/ship";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ account: string }> };

type Loaded =
  | { kind: "invalid"; account: string }
  | { kind: "error"; account: string }
  | { kind: "ok"; account: string; exists: boolean; certs: Verification[]; ship: ShipRecord | null; shipStatus: string };

async function load(params: Props["params"]): Promise<Loaded> {
  const { account: raw } = await params;
  const account = decodeURIComponent(raw).trim().toLowerCase();
  if (!ACCOUNT_RE.test(account)) return { kind: "invalid", account };
  try {
    const [acct, certs, ship] = await Promise.all([viewAccount(account), tokensForOwner(account), loadShip(account)]);
    const shipStatus = ship ? await liveShipStatus(ship) : "none";
    return { kind: "ok", account, exists: !!acct, certs, ship, shipStatus };
  } catch {
    return { kind: "error", account };
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { account: raw } = await params;
  const account = decodeURIComponent(raw).toLowerCase();
  const title = `Verify ${account}`;
  const description = `Live on-chain check of ${account}: NEAR Developer Certificate and shipped testnet contract from Retr0 Academy.`;
  const image = { url: `${SITE_URL}/api/diploma/near/${encodeURIComponent(account)}`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    alternates: { canonical: `/verify/${account}` },
    openGraph: { title, description, url: `${SITE_URL}/verify/${account}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

function fmtDate(v: Verification) {
  if (v.date) return v.date;
  return v.issued_at_ms ? new Date(v.issued_at_ms).toISOString().slice(0, 10) : "—";
}

export default async function VerifyAccountPage({ params }: Props) {
  const data = await load(params);
  const { account } = data;

  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">
        <Link href="/verify" className="hover:text-cyan">
          Verify a developer
        </Link>{" "}
        · live from NEAR testnet
      </p>
      <h1 className="mt-3 font-pixel text-title break-all" data-testid="verify-account">
        {account}
      </h1>
      <div className="mt-6">
        <VerifySearch initial={data.kind === "ok" ? "" : account} />
      </div>

      {data.kind === "invalid" ? (
        <p role="alert" data-testid="verify-invalid" className="mt-8 max-w-2xl border-2 border-danger bg-danger-soft p-4 text-danger">
          That is not a valid NEAR account id. Account ids are lowercase, like <span className="font-mono">alice.testnet</span>.
        </p>
      ) : null}

      {data.kind === "error" ? (
        <p role="alert" className="mt-8 max-w-2xl border-2 border-line bg-elevated p-4 text-ink">
          NEAR testnet RPC didn&apos;t answer. Refresh in a few seconds.
        </p>
      ) : null}

      {data.kind === "ok" ? (
        <>
          {/* Summary strip */}
          <ul className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3" data-testid="verify-summary">
            <li className="flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3">
              {data.exists ? <BadgeCheck className="h-5 w-5 text-good" aria-hidden /> : <ShieldAlert className="h-5 w-5 text-danger" aria-hidden />}
              <span className="text-sm">
                <span className="block text-faint">Account</span>
                <span className="font-semibold text-ink">{data.exists ? "Exists on testnet" : "Not found on testnet"}</span>
              </span>
            </li>
            <li className="flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3">
              <BadgeCheck className={`h-5 w-5 ${data.certs.length ? "text-good" : "text-faint"}`} aria-hidden />
              <span className="text-sm">
                <span className="block text-faint">Certificates</span>
                <span className="font-semibold text-ink" data-testid="verify-cert-count">
                  {data.certs.length ? `${data.certs.length} soulbound NFT${data.certs.length > 1 ? "s" : ""}` : "None yet"}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-3 border-2 border-line bg-elevated px-4 py-3">
              <Rocket className={`h-5 w-5 ${data.ship ? "text-accent-text" : "text-faint"}`} aria-hidden />
              <span className="min-w-0 text-sm">
                <span className="block text-faint">Shipped contract</span>
                <span className="block truncate font-semibold text-ink">{data.ship ? data.ship.contract : "Not yet"}</span>
              </span>
            </li>
          </ul>

          <div className="mt-8 grid max-w-5xl gap-8 lg:grid-cols-[1.2fr_1fr]">
            <section aria-label="Certificates" className="flex flex-col gap-6">
              {data.certs.length === 0 ? (
                <div data-testid="verify-none" className="border-2 border-line bg-elevated p-5 text-ink">
                  <p>
                    No NEAR Developer Certificate for <span className="font-mono">{account}</span>
                    {data.exists ? " yet." : ". This account doesn't exist on testnet."}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Certificates are minted only after passing the server-graded final exam.{" "}
                    <Link href="/near" className="text-info underline underline-offset-4">
                      Start the NEAR Developer path →
                    </Link>
                  </p>
                </div>
              ) : (
                data.certs.map((c) => (
                  <div key={c.token_id} className="flex flex-col gap-3">
                    <DiplomaCard diploma={c} />
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-2 border-line bg-elevated p-4 font-mono text-xs sm:grid-cols-4">
                      <div>
                        <dt className="text-faint">Score</dt>
                        <dd className="text-ink">
                          {c.score}/{c.max_score}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-faint">Grade</dt>
                        <dd className="text-ink">{c.grade ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-faint">Issued</dt>
                        <dd className="text-ink">{fmtDate(c)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-faint">Token id</dt>
                        <dd className="truncate text-ink" title={c.token_id}>
                          {c.token_id}
                        </dd>
                      </div>
                    </dl>
                    <p className="flex flex-wrap items-center gap-4 text-sm">
                      <ShareButton accountId={c.owner_id} score={c.score} maxScore={c.max_score} />
                      <a className="inline-flex items-center gap-1 font-medium text-info underline underline-offset-4" href={explorerToken(c.token_id)} target="_blank" rel="noopener">
                        Token on explorer <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </p>
                  </div>
                ))
              )}
            </section>

            <section aria-label="Shipped project" className="flex flex-col gap-4">
              <div className="border-2 border-line bg-elevated p-5" data-testid="verify-ship">
                <p className="font-pixel text-[0.6rem] uppercase tracking-eyebrow text-highlight">Ship-to-chain project</p>
                {data.ship ? (
                  <>
                    <p className="mt-3 text-sm text-muted">Shipped:</p>
                    <p className="mt-1 font-mono text-base font-semibold break-all text-ink" data-testid="verify-ship-contract">
                      {data.ship.contract}
                    </p>
                    {data.ship.greeting ? (
                      <p className="mt-3 border-l-4 border-accent bg-sunken px-3 py-2 font-mono text-sm text-ink">get_greeting() → “{data.ship.greeting}”</p>
                    ) : null}
                    <dl className="mt-4 grid gap-2 font-mono text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-faint">Status now</dt>
                        <dd className={data.shipStatus === "live" ? "text-good" : data.shipStatus === "changed" ? "text-highlight" : "text-danger"}>
                          {data.shipStatus === "live" ? "● code live on chain" : data.shipStatus === "changed" ? "● redeployed since check" : data.shipStatus === "gone" ? "● code removed" : "● couldn't re-check"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-faint">Code hash</dt>
                        <dd className="truncate text-ink" title={data.ship.code_hash}>
                          {data.ship.code_hash.slice(0, 16)}…
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-faint">Verified</dt>
                        <dd className="text-ink">{data.ship.verified_at.slice(0, 10)}</dd>
                      </div>
                    </dl>
                    <a
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-info underline underline-offset-4"
                      href={explorerAccount(data.ship.contract)}
                      target="_blank"
                      rel="noopener"
                    >
                      Contract on explorer <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    No shipped contract yet. The{" "}
                    <Link href="/dapp/ship-to-chain" className="text-info underline underline-offset-4">
                      Ship-to-chain final project
                    </Link>{" "}
                    has learners deploy their own contract to testnet; the server checks it on chain and it shows up here.
                  </p>
                )}
              </div>
              <div className="border-2 border-line bg-sunken p-4 text-xs leading-relaxed text-muted">
                <p className="font-semibold text-ink">How this is verified</p>
                <ul className="mt-2 list-[square] space-y-1 pl-4">
                  <li>
                    Certificates: <code className="font-mono">nft_tokens_for_owner</code> on <code className="font-mono">{DIPLOMA_CONTRACT}</code>, read now. They are soulbound (non-transferable) and the contract only mints after checking the exam grader&apos;s ed25519 signature.
                  </li>
                  <li>
                    Shipped contract: must be the account itself or its sub-account (only the parent can create one) with Wasm deployed. The code hash is re-checked live on every view. The link is a server-signed record, so the certificate contract didn&apos;t need to change.
                  </li>
                </ul>
                {data.exists ? (
                  <a className="mt-3 inline-flex items-center gap-1 text-info underline underline-offset-4" href={explorerAccount(account)} target="_blank" rel="noopener">
                    {account} on explorer <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </main>
  );
}
