"use client";

import { useEffect, useRef, useState } from "react";
import { openTutor } from "@/components/tutor/tutor-launcher";

/**
 * Hero mascot. The static PNG paints immediately (no layout shift); the interactive three.js head
 * loads after the first user interaction and an idle moment, only when WebGL works and the visitor hasn't asked for reduced motion.
 * Clicking the head opens Retr0 Tutor.
 */
export function HeroRobot({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const start = async () => {
      try {
        const probe = document.createElement("canvas");
        if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;
        const { mountRobot } = await import("@/components/hero/robot-scene");
        if (cancelled || !canvas.current) return;
        dispose = mountRobot(canvas.current, { onReady: () => setLive(true), onClick: () => openTutor({}) });
      } catch {
        /* keep the poster */
      }
    };
    // Load three.js only after the visitor shows intent (mouse move, touch, key, scroll), then wait for an
    // idle moment. Until then the poster PNG is the hero. This keeps the main thread free while the page loads.
    const events = ["pointermove", "pointerdown", "touchstart", "keydown", "wheel", "scroll"] as const;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      events.forEach((e) => window.removeEventListener(e, trigger));
      if (w.requestIdleCallback) w.requestIdleCallback(() => void start(), { timeout: 1500 });
      else window.setTimeout(() => void start(), 200);
    };
    events.forEach((e) => window.addEventListener(e, trigger, { passive: true }));
    return () => {
      cancelled = true;
      events.forEach((e) => window.removeEventListener(e, trigger));
      dispose?.();
    };
  }, []);

  return (
    <div className={`relative aspect-square ${className}`} data-testid="hero-robot" data-live={live ? "3d" : "poster"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mascot/retr0-head-256.webp"
        srcSet="/mascot/retr0-head-256.webp 256w, /mascot/retr0-head-512.webp 512w"
        sizes="(min-width: 1024px) 320px, 140px"
        alt="Retr0, the low-poly CRT robot mascot"
        width={256}
        height={256}
        fetchPriority="low"
        onClick={() => openTutor({})}
        className={`absolute inset-0 h-full w-full cursor-pointer object-contain transition-opacity duration-500 ${live ? "pointer-events-none opacity-0" : "opacity-100"}`}
      />
      <canvas
        ref={canvas}
        aria-label="Interactive 3D Retr0 robot. Click to ask the AI tutor."
        role="button"
        className={`absolute inset-0 h-full w-full cursor-pointer transition-opacity duration-500 ${live ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
