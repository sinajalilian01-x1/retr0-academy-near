"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { SearchField } from "@/components/search-field";
import { ThemeToggle } from "@/components/theme-toggle";
import { ConnectButton } from "@/components/near/connect-button";
import { HolderBadge } from "@/components/near/holder-badge";
import { NavDropdown } from "@/components/nav-dropdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const LEARN_HREFS = ["/near", "/html", "/css", "/javascript", "/web3", "/advanced"];

export function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileId = useId();

  const learnItems = [
    { href: "/near", label: "NEAR", testId: "learn-near" },
    { href: "/web3", label: "Web3", testId: "learn-web3" },
    { href: "/advanced", label: "Advanced NEAR", testId: "learn-advanced" },
    { heading: true, label: "Foundations" },
    { href: "/html", label: "HTML", testId: "learn-html" },
    { href: "/css", label: "CSS", testId: "learn-css" },
    { href: "/javascript", label: "JavaScript", testId: "learn-javascript" },
  ];
  const diplomaItems = [
    { href: "/diploma", label: "Mint diploma", testId: "diploma-mint-link" },
    { href: "/diploma#verify", label: "Verify a diploma", testId: "diploma-verify-link" },
    { href: "/diploma#share", label: "Share diploma", testId: "diploma-share-link" },
  ];

  const learnActive = LEARN_HREFS.some((href) => pathname === href || pathname.startsWith(`${href}/`));
  const playgroundActive = pathname === "/playground" || pathname === "/tryit";
  const diplomaActive = pathname === "/diploma" || pathname === "/verify" || pathname.startsWith("/d/");
  const leaderboardActive = pathname === "/leaderboard";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const nav = (
    <>
      <NavDropdown label="Learn" testId="nav-learn" items={learnItems} active={learnActive} />
      <Link
        href="/playground"
        data-testid="nav-playground"
        aria-current={playgroundActive ? "page" : undefined}
        className={cn("text-sm font-medium", playgroundActive ? "text-highlight" : "text-cyan")}
      >
        Playground
      </Link>
      <NavDropdown label="Diploma" testId="nav-diploma" items={diplomaItems} active={diplomaActive} />
      <Link
        href="/leaderboard"
        data-testid="nav-leaderboard"
        aria-current={leaderboardActive ? "page" : undefined}
        className={cn("text-sm font-medium", leaderboardActive ? "text-highlight" : "text-cyan")}
      >
        Leaderboard
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-bar">
      <div className="mx-auto flex h-header w-full max-w-page items-center gap-4 px-5 md:gap-6 md:px-8">
        <Logo />
        <nav aria-label="Site" className="ml-auto hidden items-center gap-5 lg:flex">
          {nav}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-cyan lg:ml-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            data-testid="open-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls={mobileId}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
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
          <HolderBadge />
          <ConnectButton />
        </div>
      </div>
      {mobileOpen ? (
        <nav
          id={mobileId}
          aria-label="Site"
          className="flex flex-col gap-4 border-t border-line px-5 py-4 lg:hidden"
        >
          {nav}
        </nav>
      ) : null}
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
