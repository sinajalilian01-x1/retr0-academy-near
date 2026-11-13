import { playgroundPath } from "@/lib/code-e";

/** Link that opens the Playground with the NEAR starter template. */
export function CodeEStarter() {
  return (
    <p className="not-prose my-6">
      <a
        href={playgroundPath(undefined, "near")}
        data-testid="code-e-near-starter"
        className="inline-flex h-11 items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 text-sm font-medium text-accent-ink no-underline shadow-md hover:bg-accent-hover"
      >
        Open the NEAR starter in the Playground
      </a>
    </p>
  );
}
