import { CODE_E_URL } from "@/lib/near";

/** Link that opens Code E with its built-in NEAR starter template (#template=near). */
export function CodeEStarter() {
  return (
    <p className="not-prose my-6">
      <a
        href={`${CODE_E_URL}/#template=near`}
        target="_blank"
        rel="noopener"
        data-testid="code-e-near-starter"
        className="inline-flex h-11 items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 text-sm font-medium text-accent-ink no-underline shadow-md hover:bg-accent-hover"
      >
        Open the NEAR starter in Code E ↗
      </a>
    </p>
  );
}
