"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { SearchField } from "@/components/search-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#courses", label: "Learn", match: null },
  { href: "/tryit", label: "Playground", match: "/tryit" },
  { href: "/#about", label: "About", match: null },
] as const;

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      event.preventDefault();
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-bar">
      <div className="mx-auto flex h-header w-full max-w-page items-center gap-6 px-5 md:px-8">
        <Logo />
        <nav aria-label="Site" className="ml-auto hidden items-center gap-6 md:flex">
          {links.map((link) => {
            const active = link.match !== null && pathname === link.match;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn("text-sm font-medium", active ? "text-highlight" : "text-cyan")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-cyan md:ml-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-testid="open-search"
            aria-label="Search lessons"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" aria-hidden />
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent hideClose className="top-dialog left-1/2 w-dialog -translate-x-1/2 rounded-xl border border-line p-4">
          <DialogTitle>Search lessons</DialogTitle>
          <DialogDescription className="mt-1 mb-3">Look across every course.</DialogDescription>
          <SearchField
            testId="search-dialog-input"
            autoFocus
            large
            placeholder="Search tutorials"
            onNavigate={() => setSearchOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
