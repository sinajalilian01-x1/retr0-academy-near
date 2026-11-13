"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-pixel text-hero text-ink">
        Learn NEAR from scratch and graduate on-chain with Retr0 Academy.
      </h1>
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
