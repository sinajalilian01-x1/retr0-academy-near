import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { NavItem } from "@/lib/types";

export function PrevNext({ prev, next }: { prev: NavItem | null; next: NavItem | null }) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
      {prev ? (
        <Link
          href={prev.href}
          data-testid="prev-lesson"
          className="inline-flex items-center gap-2 rounded-md border-2 border-line bg-elevated px-4 py-3 text-sm text-ink shadow-sm hover:border-cyan"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          data-testid="next-lesson"
          className="inline-flex items-center justify-between gap-2 rounded-md border-2 border-ink bg-accent px-4 py-3 text-sm font-medium text-accent-ink shadow-sm hover:bg-accent-hover sm:justify-start"
        >
          {next.title}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
