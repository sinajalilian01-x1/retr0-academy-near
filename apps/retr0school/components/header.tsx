"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { SearchField } from "@/components/search-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectButton } from "@/components/near/connect-button";
import { HolderBadge } from "@/components/near/holder-badge";
import { SubjectBar } from "@/components/subject-bar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function Header() {
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
      <div className="mx-auto flex h-header w-full max-w-page items-center gap-4 px-5 md:gap-6 md:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2 text-cyan">
          <ThemeToggle />
          <HolderBadge />
          <ConnectButton />
        </div>
      </div>
      <SubjectBar onSearch={() => setSearchOpen(true)} />
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
