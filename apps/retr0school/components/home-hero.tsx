"use client";

import { SearchField } from "@/components/search-field";
import { HeroRobot } from "@/components/hero/hero-robot";

export function HomeHero() {
  return (
    <div>
      <div className="flex items-center gap-4 md:gap-8">
        <h1 className="min-w-0 flex-1 font-pixel text-hero text-ink">Learn Web3 with Retr0 Academy</h1>
        <HeroRobot className="w-28 shrink-0 sm:w-40 lg:-my-10 lg:w-80" />
      </div>
      <p className="mt-5 max-w-full text-lead text-muted lg:whitespace-nowrap">
        Write real code, ship it to NEAR, and earn a certificate you actually have to pass for.
      </p>
      <div className="mt-8 w-full max-w-[44rem]">
        <SearchField testId="search-input" withButton hero placeholder="Search tutorials" />
      </div>
    </div>
  );
}
