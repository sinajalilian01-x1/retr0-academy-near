"use client";

import { useEffect, useState } from "react";
import { PlaygroundLoader } from "@/components/playground-loader";
import { decodeShare, type SharePayload } from "@/lib/code-e";
import { nearExample, playgroundExamples, welcomeExample } from "@/lib/playground-starters";

type Boot = { files: SharePayload; exampleId: string; shared: boolean };

function fromHash(): Boot {
  const hash = window.location.hash;
  if (hash === "#template=near") {
    return { files: nearExample, exampleId: "near", shared: false };
  }
  if (hash.startsWith("#code=")) {
    const decoded = decodeShare(hash.slice("#code=".length));
    if (decoded) return { files: decoded, exampleId: "", shared: true };
  }
  return { files: welcomeExample, exampleId: "welcome", shared: false };
}

export function PlaygroundStudio() {
  const [boot, setBoot] = useState<Boot | null>(null);

  useEffect(() => {
    setBoot(fromHash());
  }, []);

  if (!boot) {
    return <p className="p-6 text-muted">Loading the editor…</p>;
  }

  // R1 C-15: code from a share link is someone else's. It is not run until the learner presses Run,
  // and its preview can't submit forms, so a link can't pop a fake login form on this domain.
  return (
    <>
      {boot.shared ? (
        <p role="note" data-testid="shared-code-banner" className="mx-auto mb-3 max-w-6xl border-2 border-warn bg-warn-soft px-4 py-2 text-sm text-ink">
          Shared code from a link: someone else wrote it. Read it before pressing Run, and never type passwords or seed phrases into a preview.
        </p>
      ) : null}
      <PlaygroundLoader
      initialHtml={boot.files.html}
      initialCss={boot.files.css}
      initialJs={boot.files.js}
      examples={playgroundExamples}
      activeExample={boot.exampleId || undefined}
      showCodeE
      autoRun={!boot.shared}
      untrusted={boot.shared}
    />
    </>
  );
}
