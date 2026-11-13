"use client";

import type { ReactNode } from "react";
import { SearchField } from "@/components/search-field";

export function HomeHero({ children }: { children?: ReactNode }) {
  return (
    <>
      <h1 className="max-w-full font-pixel text-hero text-ink">
        Learn NEAR from scratch and graduate on-chain with Retr0 Academy.
      </h1>
      <div className="mt-8 grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.8fr)] lg:gap-16">
        <div className="max-w-2xl">
          <SearchField testId="search-input" withButton placeholder="Search tutorials" />
        </div>
        {children}
      </div>
    </>
  );
}
