import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { DIPLOMA_CONTRACT, TESTNET_DIPLOMA_CONTRACT, explorerAccount, explorerToken, listDiplomas, type Verification } from "@/lib/near";

export const metadata: Metadata = pageMeta("/leaderboard", "Leaderboard", "Every NEAR Developer Certificate holder, read live from the NEAR contract.");

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let rows: Verification[] = [];
  let beta: Verification[] = [];
  let error: string | null = null;
  const sort = (list: Verification[]) => list.sort((a, b) => b.score / b.max_score - a.score / a.max_score || a.issued_at_ms - b.issued_at_ms);
  const [main, test] = await Promise.allSettled([listDiplomas(), listDiplomas(500, "testnet")]);
  if (main.status === "fulfilled") rows = sort(main.value);
  else error = main.reason instanceof Error ? main.reason.message : String(main.reason);
  if (test.status === "fulfilled") beta = sort(test.value);

  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Hall of fame · NEAR mainnet</p>
      <h1 className="mt-3 font-pixel text-title">Leaderboard</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Every certificate holder, read from <code className="font-mono">{DIPLOMA_CONTRACT}</code> with the NEP-181{" "}
        <code className="font-mono">nft_tokens</code> view. Sorted by score, then by who minted first. Live from chain on every load.
      </p>
      {error ? (
        <p role="alert" className="mt-8 text-danger">
          Could not read the contract: {error}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border-2 border-line bg-elevated">
          <table data-testid="leaderboard" className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-sunken font-pixel text-[0.6rem] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Holder</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Date (UTC)</th>
                <th className="px-4 py-3">Explorer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.token_id} className="border-t border-line" data-testid="leaderboard-row">
                  <td className="px-4 py-3 font-pixel text-[0.7rem] text-highlight">{i + 1}</td>
                  <td className="px-4 py-3 font-mono">
                    <Link className="text-info underline underline-offset-4" href={`/d/${encodeURIComponent(r.owner_id)}`}>
                      {r.owner_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.track_title || r.track}</td>
                  <td className="px-4 py-3 font-mono text-ink">
                    {r.score}/{r.max_score}
                  </td>
                  <td className="px-4 py-3 font-pixel text-[0.7rem] text-highlight">{r.grade ?? "–"}</td>
                  <td className="px-4 py-3 font-mono text-muted">{r.date}</td>
                  <td className="px-4 py-3">
                    <a className="mr-3 inline-block py-1.5 text-info underline underline-offset-4" href={explorerToken(r.token_id, r.network)} target="_blank" rel="noopener">
                      token ↗
                    </a>{" "}
                    <a className="inline-block py-1.5 text-info underline underline-offset-4" href={explorerAccount(r.owner_id)} target="_blank" rel="noopener">
                      holder ↗
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    No certificates yet. <Link className="text-info underline" href="/near/quiz">Take the final exam and be the first.</Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      {beta.length ? (
        <section className="mt-10" data-testid="leaderboard-beta">
          <h2 className="font-pixel text-[0.7rem] uppercase tracking-eyebrow text-muted">Testnet (beta) certificates</h2>
          <p className="mt-2 max-w-lesson text-sm text-muted">
            Minted during the beta on <code className="font-mono">{TESTNET_DIPLOMA_CONTRACT}</code>. Still verifiable, kept for the record.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 font-mono text-sm">
            {beta.map((r) => (
              <li key={r.token_id} className="flex flex-wrap items-center gap-x-3">
                <Link className="text-info underline underline-offset-4" href={`/verify/${encodeURIComponent(r.owner_id)}`}>
                  {r.owner_id}
                </Link>
                <span className="text-muted">
                  {r.score}/{r.max_score}
                  {r.grade ? ` · ${r.grade}` : ""} · {r.date}
                </span>
                <span className="border border-line px-1 text-[0.65rem] text-faint">testnet (beta)</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
