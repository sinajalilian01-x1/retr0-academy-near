"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SearchEntry } from "@/lib/types";

const SearchContext = createContext<SearchEntry[] | null>(null);

export function SiteProvider({ entries, children }: { entries: SearchEntry[]; children: ReactNode }) {
  return <SearchContext.Provider value={entries}>{children}</SearchContext.Provider>;
}

export function useSearchEntries() {
  const entries = useContext(SearchContext);
  if (!entries) throw new Error("Search is missing its lesson index.");
  return entries;
}
