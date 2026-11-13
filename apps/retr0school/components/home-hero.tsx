"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div>
      <h1 className="max-w-full font-pixel text-hero text-ink">
        Learn NEAR from scratch and graduate{" "}
        <span className="whitespace-nowrap">on-chain</span> with Retr0 Academy.
      </h1>
      <div className="mt-8">
        <SearchField testId="search-input" withButton placeholder="Search tutorials" />
      </div>
    </div>
  );
}
