"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div>
      <h1 className="max-w-full font-pixel text-hero text-ink">
        Learn Web3 with Retr0 Academy
      </h1>
      <div className="mt-8 max-w-3xl">
        <SearchField testId="search-input" withButton placeholder="Search tutorials" />
      </div>
    </div>
  );
}
