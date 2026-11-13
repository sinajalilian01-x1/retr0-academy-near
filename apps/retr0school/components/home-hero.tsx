"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div>
      <h1 className="max-w-full font-pixel text-hero text-ink">
        Learn Web3 with Retr0 Academy
      </h1>
      <p className="mt-5 max-w-full text-lead text-muted lg:whitespace-nowrap">
        Write real code, ship it to NEAR, and earn a certificate you actually have to pass for.
      </p>
      <div className="mt-8 w-full max-w-[44rem]">
        <SearchField testId="search-input" withButton hero placeholder="Search tutorials" />
      </div>
    </div>
  );
}
