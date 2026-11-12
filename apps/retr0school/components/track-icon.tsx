import { Blocks, Braces, CodeXml, Palette, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Blocks,
  Braces,
  CodeXml,
  Palette,
};

export function TrackIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name];
  if (!Icon) {
    return (
      <span className="text-2xl leading-none" aria-hidden>
        {name}
      </span>
    );
  }
  return <Icon className={className} aria-hidden />;
}
