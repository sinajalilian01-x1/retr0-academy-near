import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Unlock } from "lucide-react";
import { getAdvancedLessons } from "@/lib/advanced";

export const metadata: Metadata = {
  title: "Advanced NEAR",
  description: "Advanced NEAR development: open tutorials on contracts, tokens, and frontends, plus holder-only deep dives on promises, storage staking, Chain Signatures, and Intents.",
};

export default function AdvancedPage() {
  const lessons = getAdvancedLessons();
  const openLessons = lessons.filter((l) => !l.locked);
  const lockedLessons = lessons.filter((l) => l.locked);
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Advanced NEAR · Web3 development</p>
      <h1 className="mt-3 font-pixel text-title">Advanced NEAR</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        New tutorials below are open to everyone so you can start building on testnet right away. Four extra deep dives
        stay locked until your connected wallet holds a Retr0 Academy diploma, checked on chain with{" "}
        <code className="font-mono">verify_diploma</code>.
      </p>
      <h2 className="mt-10 font-pixel text-sm uppercase tracking-eyebrow text-highlight">Open tutorials</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {openLessons.map((l) => (
          <li key={l.slug}>
            <Link
              href={`/advanced/${l.slug}`}
              data-testid={`advanced-${l.slug}`}
              className="flex h-full flex-col gap-2 border-2 border-line bg-elevated p-5 text-ink shadow-sm hover:border-accent"
            >
              <span className="flex items-center gap-2 font-pixel text-[0.6rem] uppercase tracking-wide text-good">
                <Unlock className="h-3.5 w-3.5" aria-hidden /> Open · Lesson {l.order}
              </span>
              <span className="font-semibold">{l.title}</span>
              <span className="text-sm text-muted">{l.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 font-pixel text-sm uppercase tracking-eyebrow text-highlight">Holder extras</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {lockedLessons.map((l) => (
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
