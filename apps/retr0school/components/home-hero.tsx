"use client";

import { SearchField } from "@/components/search-field";

export function HomeHero() {
  return (
    <div className="max-w-xl">
      <h1 className="font-pixel text-hero text-ink">
        Build for
        <br />
        the web
      </h1>
      <p className="mt-6 max-w-md text-lead text-muted">
        Practical tutorials. Clean code. Real results.
        <br />
        Level up your web development skills.
      </p>
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
