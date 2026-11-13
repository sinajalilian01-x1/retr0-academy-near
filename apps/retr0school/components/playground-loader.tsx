"use client";

import dynamic from "next/dynamic";
import type { PlaygroundExample } from "@/lib/playground-starters";

const Playground = dynamic(() => import("@/components/playground").then((mod) => mod.Playground), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">Loading the editor…</p>,
});

export function PlaygroundLoader({
  initialHtml,
  initialCss,
  initialJs,
  examples,
  activeExample,
  showCodeE = false,
  autoRun = false,
}: {
  initialHtml: string;
  initialCss: string;
  initialJs: string;
  examples?: PlaygroundExample[];
  activeExample?: string;
  showCodeE?: boolean;
  autoRun?: boolean;
}) {
  return (
    <Playground
      initialHtml={initialHtml}
      initialCss={initialCss}
      initialJs={initialJs}
      examples={examples}
      activeExample={activeExample}
      showCodeE={showCodeE}
      autoRun={autoRun}
    />
  );
}
