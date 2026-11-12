import type { ReactNode } from "react";

function Callout({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "note" | "warning" | "tip";
  children: ReactNode;
}) {
  const labelClass = tone === "warning" ? "text-warn" : tone === "tip" ? "text-good" : "text-info";
  return (
    <aside className={`callout callout-${tone}`} role="note">
      <p className={`callout-label ${labelClass}`}>{label}</p>
      <div className="callout-body">{children}</div>
    </aside>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <Callout label="Note" tone="note">
      {children}
    </Callout>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <Callout label="Warning" tone="warning">
      {children}
    </Callout>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <Callout label="Tip" tone="tip">
      {children}
    </Callout>
  );
}
