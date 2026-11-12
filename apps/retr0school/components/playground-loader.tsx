"use client";

import dynamic from "next/dynamic";

const Playground = dynamic(() => import("@/components/playground").then((mod) => mod.Playground), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">Loading the editor…</p>,
});

export function PlaygroundLoader({
  initialHtml,
  initialCss,
  initialJs,
}: {
  initialHtml: string;
  initialCss: string;
  initialJs: string;
}) {
  return <Playground initialHtml={initialHtml} initialCss={initialCss} initialJs={initialJs} />;
}
