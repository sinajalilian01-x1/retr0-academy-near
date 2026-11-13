import type { Metadata } from "next";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getAdvancedLessons } from "@/lib/advanced";

export const metadata: Metadata = {
  title: "Advanced NEAR",
  description: "Holder-only deep dives: cross-contract calls, storage staking, Chain Signatures, and NEAR Intents.",
};

export default function AdvancedPage() {
  const lessons = getAdvancedLessons().filter((l) => l.locked);
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Bonus track · diploma holders</p>
      <h1 className="mt-3 font-pixel text-title">Advanced NEAR</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        These four deep dives unlock when your connected wallet holds a Retr0 Academy diploma, checked on chain with{" "}
        <code className="font-mono">verify_diploma</code>. For writing contracts, tokens, and frontends, start with the
        open courses under Learn.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {lessons.map((l) => (
          <li key={l.slug}>
            <Link
              href={`/advanced/${l.slug}`}
              data-testid={`advanced-${l.slug}`}
              className="flex h-full flex-col gap-2 border-2 border-line bg-elevated p-5 text-ink shadow-sm hover:border-accent"
            >
              <span className="flex items-center gap-2 font-pixel text-[0.6rem] uppercase tracking-wide text-muted">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Holders only · Lesson {l.order}
              </span>
              <span className="font-semibold">{l.title}</span>
              <span className="text-sm text-muted">{l.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
