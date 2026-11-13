"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div>
      <h1 className="max-w-full font-pixel text-hero text-ink">
        Learn Web3 with Retr0 Academy
      </h1>
      <p className="mt-6 max-w-full text-lead text-muted">
        Retr0 Academy is a NEAR-based coding academy for the web: short lessons in NEAR, Web3, HTML, CSS, and
        JavaScript, with examples you can edit and run in the browser or open in Code E. Finish the NEAR track to mint a
        soulbound diploma NFT on NEAR testnet.
      </p>
      <div className="mt-8">
        <SearchField testId="search-input" withButton placeholder="Search tutorials" />
      </div>
    </div>
  );
}
