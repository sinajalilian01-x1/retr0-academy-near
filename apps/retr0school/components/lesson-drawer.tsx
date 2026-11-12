"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LessonNav } from "@/components/lesson-nav";
import { useProgress } from "@/lib/progress";
import type { LessonSummary, Track } from "@/lib/types";

const EDGE_PX = 20;
const LOCK_PX = 10;
const SNAP_RATIO = 0.45;
const FLICK_PX_PER_MS = 0.7;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 63.99rem)").matches;
}

export function LessonDrawer({
  track,
  lessons,
  current,
}: {
  track: Track;
  lessons: LessonSummary[];
  current: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  const progress = useProgress();
  const quizScore = progress.quizzes[track.slug];

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startT: number;
    origin: number;
    axis: "undecided" | "x" | "y";
  } | null>(null);

  function panelWidth() {
    return panelRef.current?.getBoundingClientRect().width || 320;
  }

  function paint(px: number, animate: boolean) {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return;
    const width = panelWidth();
    const x = Math.max(-width, Math.min(0, px));
    const motion = animate && !prefersReducedMotion();
    panel.style.transition = motion ? "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
    panel.style.transform = `translate3d(${x}px, 0, 0)`;
    const progressValue = (x + width) / width;
    if (backdrop) {
      backdrop.style.transition = motion ? "opacity 220ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
      backdrop.style.opacity = String(Math.max(0, Math.min(1, progressValue)));
      backdrop.style.pointerEvents = progressValue > 0.02 ? "auto" : "none";
    }
  }

  function setScrollLock(locked: boolean) {
    document.documentElement.style.overflow = locked ? "hidden" : "";
    document.body.style.overflow = locked ? "hidden" : "";
  }

  function snap(next: boolean, restoreFocus = true) {
    const width = panelWidth();
    paint(next ? 0 : -width, true);
    openRef.current = next;
    setOpen(next);
    setScrollLock(next);
    if (next) {
      window.requestAnimationFrame(() => closeRef.current?.focus());
    } else if (restoreFocus) {
      openerRef.current?.focus();
    }
  }

  const paintRef = useRef(paint);
  const snapRef = useRef(snap);
  paintRef.current = paint;
  snapRef.current = snap;

  useLayoutEffect(() => {
    if (dragRef.current?.axis === "x") return;
    paintRef.current(open ? 0 : -panelWidth(), false);
  }, [open]);

  useEffect(() => () => setScrollLock(false), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!openRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        snapRef.current(false);
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function currentTranslate() {
      return openRef.current ? 0 : -panelWidth();
    }

    function onDown(event: PointerEvent) {
      if (!isMobileLayout()) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const fromEdge = !openRef.current && event.clientX <= EDGE_PX;
      const onDrawer = openRef.current && event.clientX <= panelWidth();
      if (!fromEdge && !onDrawer) return;
      if (target?.closest("[data-testid='lessons-toggle'], [data-testid='lessons-close']")) return;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startT: event.timeStamp,
        origin: currentTranslate(),
        axis: "undecided",
      };
    }

    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (drag.axis === "undecided") {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (drag.axis !== "x") return;
      event.preventDefault();
      paintRef.current(drag.origin + dx, false);
    }

    function onUp(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      if (drag.axis === "x") {
        window.addEventListener(
          "click",
          (clickEvent) => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
          },
          { capture: true, once: true },
        );
      }
      if (drag.axis !== "x") return;
      const width = panelWidth();
      const dx = event.clientX - drag.startX;
      const x = Math.max(-width, Math.min(0, drag.origin + dx));
      const progressValue = (x + width) / width;
      const elapsed = event.timeStamp - drag.startT;
      const flicked = elapsed >= 40 && Math.abs(dx) > 24 && Math.abs(dx) / elapsed > FLICK_PX_PER_MS;
      snapRef.current(flicked ? dx > 0 : progressValue > SNAP_RATIO, false);
    }

    function onTouchMove(event: TouchEvent) {
      if (dragRef.current?.axis === "x") event.preventDefault();
    }

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <>
      <div className="sticky top-header z-30 flex items-center gap-2 border-b border-line bg-canvas px-3 py-1.5 lg:hidden">
        <button
          ref={openerRef}
          type="button"
          data-testid="lessons-toggle"
          aria-expanded={open}
          aria-controls="lesson-drawer"
          aria-label="Open lessons"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink"
          onClick={() => snap(true, false)}
        >
          <Menu className="h-4 w-4" aria-hidden />
        </button>
        <span className="truncate text-sm text-muted">{track.title}</span>
      </div>
      <button
        type="button"
        data-testid="lessons-edge"
        aria-label="Open lessons"
        className="fixed top-1/2 left-0 z-30 flex h-24 w-5 -translate-y-1/2 items-center lg:hidden"
        onClick={() => snap(true, false)}
      >
        <span className="h-12 w-1 rounded-r-full bg-line-strong" />
      </button>
      <div
        ref={backdropRef}
        data-testid="lessons-backdrop"
        className="fixed inset-0 z-40 bg-overlay lg:hidden"
        style={{ opacity: 0, pointerEvents: "none" }}
        onClick={() => snap(false)}
      />
      <div
        ref={panelRef}
        id="lesson-drawer"
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-labelledby={titleId}
        data-testid="lesson-drawer"
        data-open={open ? "true" : "false"}
        inert={open ? undefined : true}
        className="fixed inset-y-0 left-0 z-50 flex w-drawer flex-col border-r border-line bg-elevated text-ink shadow-lg lg:hidden"
        style={{ touchAction: "pan-y" }}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <h2 id={titleId} className="font-display text-xl tracking-display text-ink">
              Lessons
            </h2>
            <p className="mt-1 text-sm text-muted">{track.title}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-testid="lessons-close"
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-ink"
            onClick={() => snap(false)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 pb-6">
          <Link href="/#courses" className="mb-4 inline-block text-sm font-medium text-cyan" onClick={() => snap(false, false)}>
            Learn
          </Link>
          <span className="mb-4 block h-1.5 w-12 rounded-full bg-accent" />
          <LessonNav
            track={track}
            lessons={lessons}
            current={current}
            quizScore={quizScore}
            onNavigate={() => snap(false, false)}
          />
        </div>
      </div>
    </>
  );
}
