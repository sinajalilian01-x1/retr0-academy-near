import type { Verification } from "@/lib/near";
import { DIPLOMA_CONTRACT } from "@/lib/near";

/** Retro certificate rendering of an on-chain diploma. */
export function DiplomaCard({ diploma }: { diploma: Verification }) {
  return (
    <figure
      data-testid="diploma-card"
      className="relative overflow-hidden rounded-md border-4 border-ink bg-elevated p-6 shadow-md md:p-8"
      style={{ boxShadow: "6px 6px 0 0 var(--w3h-accent)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-2 border-2 border-dashed"
        style={{ borderColor: "#00EC97" }}
      />
      <p className="font-pixel text-[0.6rem] uppercase tracking-eyebrow text-muted">Retr0 Academy · NEAR testnet</p>
      <h2 className="mt-4 font-pixel text-title leading-snug text-ink">Certificate</h2>
      <p className="mt-4 text-sm text-muted">This certifies that</p>
      <p data-testid="diploma-owner" className="mt-1 break-all font-mono text-lg font-semibold text-ink">
        {diploma.owner_id}
      </p>
      <p className="mt-3 text-sm text-muted">passed the track</p>
      <p className="mt-1 text-lg font-semibold text-ink">{diploma.track_title || diploma.track}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Score</dt>
          <dd data-testid="diploma-score" className="text-ink">
            {diploma.score}/{diploma.max_score}{diploma.grade ? ` · Grade ${diploma.grade}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Date (UTC)</dt>
          <dd className="text-ink">{diploma.date}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-muted">Status</dt>
          <dd className={diploma.valid ? "text-good" : "text-danger"}>{diploma.valid ? "■ Valid · soulbound" : "Invalid"}</dd>
        </div>
      </dl>
      <figcaption className="mt-6 break-all border-t border-line pt-3 font-mono text-xs text-muted">
        token {diploma.token_id} · contract {DIPLOMA_CONTRACT}
      </figcaption>
    </figure>
  );
}
