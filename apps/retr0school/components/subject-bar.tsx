"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Subject = { label: string; href: string; match: string[]; exclude?: string[]; near?: boolean };

/** One item per subject, like a classic tutorial site's top bar. Order follows the learning path. */
export const SUBJECTS: Subject[] = [
  { label: "NEAR", href: "/near", match: ["/near", "/fundamentals"], exclude: ["/near/quiz"], near: true },
  { label: "Contracts", href: "/contracts", match: ["/contracts"], near: true },
  { label: "Tokens & NFTs", href: "/tokens", match: ["/tokens"], near: true },
  { label: "dApps", href: "/dapp", match: ["/dapp"], near: true },
  { label: "Advanced NEAR", href: "/advanced", match: ["/advanced"], near: true },
  { label: "HTML", href: "/html", match: ["/html", "/html-advanced"] },
  { label: "CSS", href: "/css", match: ["/css", "/css-advanced"] },
  { label: "JavaScript", href: "/javascript", match: ["/javascript", "/js-advanced"] },
  { label: "Playground", href: "/playground", match: ["/playground", "/tryit"] },
  { label: "Exam", href: "/near/quiz", match: ["/near/quiz", "/exam"] },
  { label: "Certificate", href: "/diploma", match: ["/diploma", "/d"] },
  { label: "Verify", href: "/verify", match: ["/verify"] },
  { label: "Leaderboard", href: "/leaderboard", match: ["/leaderboard"] },
];

function isActive(subject: Subject, pathname: string) {
  const hit = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (subject.exclude?.some(hit)) return false;
  return subject.match.some(hit);
}

export function SubjectBar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname() || "/";
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the active subject in view on narrow screens.
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>("[aria-current='page']");
    if (!active || !scroller.current) return;
    const box = scroller.current;
    const left = active.offsetLeft - box.clientWidth / 2 + active.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [pathname]);

  return (
    <div className="border-t-2 border-line bg-sunken" data-testid="subject-bar">
      <div className="mx-auto flex h-subjectbar w-full max-w-page items-stretch md:px-3">
        <nav aria-label="Subjects" className="min-w-0 flex-1">
          <div ref={scroller} className="no-scrollbar flex h-full items-stretch overflow-x-auto">
            {SUBJECTS.map((subject, index) => {
              const active = isActive(subject, pathname);
              const divider = index > 0 && SUBJECTS[index - 1].near && !subject.near;
              return (
                <Link
                  key={subject.href}
                  href={subject.href}
                  data-testid={`subject-${subject.href.replace(/\//g, "-").replace(/^-/, "")}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex shrink-0 items-center px-3 text-[0.8rem] font-semibold tracking-wide whitespace-nowrap transition-colors md:px-3.5",
                    divider && "ml-1 border-l-2 border-line pl-4 md:pl-4",
                    active
                      ? "bg-accent text-accent-ink"
                      : "text-cyan hover:bg-raised hover:text-highlight",
                  )}
                >
                  {subject.near ? (
                    <span aria-hidden className={cn("mr-1.5 inline-block h-1.5 w-1.5", active ? "bg-accent-ink" : "bg-web3")} />
                  ) : null}
                  {subject.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <button
          type="button"
          onClick={onSearch}
          data-testid="subject-search"
          aria-label="Search lessons"
          className="flex shrink-0 items-center gap-2 border-l-2 border-line px-3 text-sm text-muted hover:text-cyan md:min-w-44"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden md:inline">Search</span>
          <kbd className="ml-auto hidden border border-line px-1.5 font-mono text-[0.7rem] text-faint md:inline">/</kbd>
        </button>
      </div>
    </div>
  );
}
