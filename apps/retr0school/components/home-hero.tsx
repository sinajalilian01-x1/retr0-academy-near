"use client";

import Link from "next/link";
import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div className="max-w-xl">
      <p className="mb-4 inline-flex items-center gap-2 border-2 border-line bg-elevated px-3 py-1 font-pixel text-[0.55rem] uppercase tracking-wide text-ink">
        <span className="inline-block h-2 w-2" style={{ background: "#00EC97" }} aria-hidden />
        New · The W3Schools of NEAR
      </p>
      <h1 className="font-pixel text-hero text-ink">
        Learn NEAR.
        <br />
        Earn it on-chain.
      </h1>
      <p className="mt-6 max-w-md text-lead text-muted">
        Short lessons, examples you run in Code E, a secret-key quiz, and a soulbound
        diploma NFT anyone can verify. Holders unlock Advanced NEAR.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/near"
          data-testid="hero-start-near"
          className="inline-flex h-12 items-center rounded-md border-2 border-ink bg-accent px-5 text-base font-medium text-accent-ink shadow-md hover:bg-accent-hover"
        >
          Start the NEAR track
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex h-12 items-center rounded-md border-2 border-line bg-elevated px-5 text-base font-medium text-ink shadow-sm hover:border-cyan"
        >
          Leaderboard
        </Link>
        <Link
          href="/verify"
          className="inline-flex h-12 items-center rounded-md border-2 border-line bg-elevated px-5 text-base font-medium text-ink shadow-sm hover:border-cyan"
        >
          Verify a diploma
        </Link>
      </div>
      <div className="mt-8">
        <SearchField
          testId="search-input"
          withButton
          placeholder="Search tutorials"
        />
      </div>
    </div>
  );
}
