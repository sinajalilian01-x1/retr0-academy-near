"use client";

import { useState } from "react";

type Pane = { id: string; label: string; html: string };

export function CodeSample({ panes }: { panes: Pane[] }) {
  const [active, setActive] = useState(0);
  if (panes.length === 0) return null;
  const pane = panes[Math.min(active, panes.length - 1)];

  return (
    <div>
      {panes.length > 1 ? (
        <div role="tablist" aria-label="Example code" className="flex gap-1 overflow-auto border-b border-line px-2 py-2">
          {panes.map((item, index) => {
            const selected = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={
                  selected
                    ? "rounded-md border-2 border-cyan px-3 py-1.5 text-sm font-medium text-cyan"
                    : "rounded-md border-2 border-transparent px-3 py-1.5 text-sm text-muted"
                }
                onClick={() => setActive(index)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="code-label">{pane.label}</p>
      )}
      <div dangerouslySetInnerHTML={{ __html: pane.html }} />
    </div>
  );
}
