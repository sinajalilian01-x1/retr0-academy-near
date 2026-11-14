"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Group = "web" | "near" | "tools";
type Subject = { label: string; href: string; match: string[]; exclude?: string[]; group: Group };

/** Learning-path order: web foundations (beginner, then advanced), then NEAR, then tools. */
export const SUBJECTS: Subject[] = [
  { label: "HTML", href: "/html", match: ["/html"], group: "web" },
  { label: "CSS", href: "/css", match: ["/css"], group: "web" },
  { label: "JavaScript", href: "/javascript", match: ["/javascript"], group: "web" },
  { label: "Advanced HTML", href: "/html-advanced", match: ["/html-advanced"], group: "web" },
  { label: "Advanced CSS", href: "/css-advanced", match: ["/css-advanced"], group: "web" },
  { label: "Advanced JavaScript", href: "/js-advanced", match: ["/js-advanced"], group: "web" },
  { label: "Web3 Fundamentals", href: "/fundamentals", match: ["/fundamentals", "/near"], exclude: ["/near/quiz"], group: "near" },
  { label: "Smart Contracts", href: "/contracts", match: ["/contracts"], group: "near" },
  { label: "Tokens & NFTs", href: "/tokens", match: ["/tokens"], group: "near" },
  { label: "Build a dApp", href: "/dapp", match: ["/dapp"], group: "near" },
  { label: "Advanced NEAR", href: "/advanced", match: ["/advanced"], group: "near" },
  { label: "Perps on NEAR", href: "/guides/perps-on-near", match: ["/guides/perps-on-near"], group: "near" },
  { label: "Playground", href: "/playground", match: ["/playground", "/tryit"], group: "tools" },
  { label: "Exam", href: "/near/quiz", match: ["/near/quiz", "/exam"], group: "tools" },
  { label: "Verify", href: "/verify", match: ["/verify"], group: "tools" },
  { label: "Certificate", href: "/diploma", match: ["/diploma", "/d"], group: "tools" },
  { label: "Leaderboard", href: "/leaderboard", match: ["/leaderboard"], group: "tools" },
];

function isActive(subject: Subject, pathname: string) {
  const hit = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  if (subject.exclude?.some(hit)) return false;
  return subject.match.some(hit);
}

export function SubjectBar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname() || "/";
  const scroller = useRef<HTMLDivElement>(null);
  const stopGlide = useRef<() => void>(() => {});
  const [edges, setEdges] = useState({ left: false, right: false });
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const box = scroller.current;
    if (!box) return;
    const left = box.scrollLeft > 2;
    const right = box.scrollLeft + box.clientWidth < box.scrollWidth - 2;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  // Keep the active subject in view (centered) whenever the route changes.
  useEffect(() => {
    const box = scroller.current;
    const active = box?.querySelector<HTMLElement>("[aria-current='page']");
    if (box && active) {
      const left = active.offsetLeft - box.clientWidth / 2 + active.clientWidth / 2;
      box.scrollTo({ left: Math.max(0, left), behavior: "auto" });
    }
    measure();
  }, [pathname, measure]);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    box.addEventListener("scroll", measure, { passive: true });
    // A vertical mouse wheel scrolls the bar sideways while the pointer is over it.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || box.scrollWidth <= box.clientWidth) return;
      event.preventDefault();
      box.scrollLeft += event.deltaY;
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      box.removeEventListener("scroll", measure);
      box.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  // Click-and-drag panning for mouse users, with a little momentum. Touch keeps native swiping.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    let startX = 0;
    let startLeft = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let down = false;
    let moved = false;
    let frame = 0;
    let pointerId = -1;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0 || box.scrollWidth <= box.clientWidth) return;
      cancelAnimationFrame(frame);
      down = true;
      moved = false;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startLeft = box.scrollLeft;
      lastT = performance.now();
      velocity = 0;
    };
    const onMove = (event: PointerEvent) => {
      if (!down || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        box.setPointerCapture(pointerId);
      }
      const now = performance.now();
      velocity = (event.clientX - lastX) / Math.max(1, now - lastT);
      lastX = event.clientX;
      lastT = now;
      box.scrollLeft = startLeft - dx;
    };
    const onUp = (event: PointerEvent) => {
      if (!down || event.pointerId !== pointerId) return;
      down = false;
      if (box.hasPointerCapture(pointerId)) box.releasePointerCapture(pointerId);
      if (!moved) return;
      setDragging(false);
      // Swallow the click that follows a drag so it doesn't open a subject.
      const swallow = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      box.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => box.removeEventListener("click", swallow, { capture: true }), 50);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Clamp so a fast flick glides a little, never flings across the whole bar.
      let v = Math.max(-2.5, Math.min(2.5, velocity)) * 16;
      const glide = () => {
        if (Math.abs(v) < 0.5) return;
        box.scrollLeft -= v;
        v *= 0.92;
        frame = requestAnimationFrame(glide);
      };
      frame = requestAnimationFrame(glide);
    };
    stopGlide.current = () => cancelAnimationFrame(frame);
    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(frame);
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const page = (dir: -1 | 1) => {
    const box = scroller.current;
    if (!box) return;
    stopGlide.current();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollBy({ left: dir * Math.max(120, box.clientWidth * 0.8), behavior: smooth ? "smooth" : "auto" });
  };

  // Left/Right arrow keys move focus between subjects; Home/End jump to the ends.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const links = Array.from(scroller.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const next = event.key === "ArrowRight" ? i + 1 : event.key === "ArrowLeft" ? i - 1 : event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : -2;
    if (next === -2) return;
    event.preventDefault();
    const target = links[Math.max(0, Math.min(links.length - 1, next))];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const arrow = "absolute inset-y-0 z-10 flex w-8 items-center justify-center border-line bg-sunken text-cyan hover:bg-raised hover:text-highlight focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan";

  return (
    <div className="border-t-2 border-line bg-sunken" data-testid="subject-bar">
      <div className="mx-auto flex h-subjectbar w-full max-w-page items-stretch md:px-3">
        <nav aria-label="Subjects" className="relative min-w-0 flex-1">
          {edges.left ? (
            <button type="button" onClick={() => page(-1)} aria-label="Scroll subjects left" data-testid="subject-prev" className={cn(arrow, "left-0 border-r-2")}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {edges.left ? <div aria-hidden className="pointer-events-none absolute inset-y-0 left-8 z-[9] w-10 bg-gradient-to-r from-sunken to-transparent" /> : null}
          {edges.right ? <div aria-hidden className="pointer-events-none absolute inset-y-0 right-8 z-[9] w-10 bg-gradient-to-l from-sunken to-transparent" /> : null}
          <div
            ref={scroller}
            onKeyDown={onKeyDown}
            onDragStart={(event) => event.preventDefault()}
            data-dragging={dragging ? "true" : undefined}
            className={cn(
              "no-scrollbar flex h-full items-stretch overflow-x-auto select-none",
              edges.left && "pl-8",
              edges.right && "pr-8",
              edges.left || edges.right ? (dragging ? "cursor-grabbing" : "cursor-grab") : "",
              dragging && "[&_a]:pointer-events-none",
            )}
          >
            {SUBJECTS.map((subject, index) => {
              const active = isActive(subject, pathname);
              const divider = index > 0 && SUBJECTS[index - 1].group !== subject.group;
              const near = subject.group === "near";
              return (
                <Link
                  key={subject.href}
                  href={subject.href}
                  draggable={false}
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
                  {near ? (
                    <span aria-hidden className={cn("mr-1.5 inline-block h-1.5 w-1.5", active ? "bg-accent-ink" : "bg-web3")} />
                  ) : null}
                  {subject.label}
                </Link>
              );
            })}
          </div>
          {edges.right ? (
            <button type="button" onClick={() => page(1)} aria-label="Scroll subjects right" data-testid="subject-next" className={cn(arrow, "right-0 border-l-2")}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
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
