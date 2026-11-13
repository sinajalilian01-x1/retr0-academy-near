"use client";

import { useEffect, useState } from "react";
import { PlaygroundLoader } from "@/components/playground-loader";
import { decodeShare, type SharePayload } from "@/lib/code-e";
import { nearExample, playgroundExamples, welcomeExample } from "@/lib/playground-starters";

function fromHash(): { files: SharePayload; exampleId: string } {
  const hash = window.location.hash;
  if (hash === "#template=near") {
    return { files: nearExample, exampleId: "near" };
  }
  if (hash.startsWith("#code=")) {
    const decoded = decodeShare(hash.slice("#code=".length));
    if (decoded) return { files: decoded, exampleId: "" };
  }
  return { files: welcomeExample, exampleId: "welcome" };
}

export function PlaygroundStudio() {
  const [boot, setBoot] = useState<{ files: SharePayload; exampleId: string } | null>(null);

  useEffect(() => {
    setBoot(fromHash());
  }, []);

  if (!boot) {
    return <p className="p-6 text-muted">Loading the editor…</p>;
  }

  return (
    <PlaygroundLoader
      initialHtml={boot.files.html}
      initialCss={boot.files.css}
      initialJs={boot.files.js}
      examples={playgroundExamples}
      activeExample={boot.exampleId || undefined}
      showCodeE
      autoRun
    />
  );
}
