"use client";

import { useEffect, useRef, useState } from "react";
import { openTutor } from "@/components/tutor/tutor-launcher";

/**
 * Hero mascot. The static PNG paints immediately (no layout shift); the interactive three.js head
 * loads after the page is idle, only when WebGL works and the visitor hasn't asked for reduced motion.
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
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = idle ? idle(() => void start(), { timeout: 2500 }) : window.setTimeout(() => void start(), 1200);
    return () => {
      cancelled = true;
      if (!idle) window.clearTimeout(id);
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
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}
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
