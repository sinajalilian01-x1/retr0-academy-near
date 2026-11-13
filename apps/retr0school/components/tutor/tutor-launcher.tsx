"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";
import { TutorIcon } from "@/components/tutor/tutor-icon";
import type { TutorPanelProps, TutorRequest } from "@/components/tutor/tutor-panel";

/** Fire this from anywhere to open the tutor with a prompt, e.g. the Playground's "Explain my error". */
export function openTutor(request: TutorRequest = {}) {
  window.dispatchEvent(new CustomEvent<TutorRequest>("r0-tutor", { detail: request }));
}

const isExam = (p: string) => p === "/near/quiz" || p.startsWith("/near/quiz/") || p === "/exam" || p.startsWith("/exam/");

/**
 * Floating "Ask Retr0 Tutor" button. The chat panel (and its markdown renderer) is only downloaded on first open,
 * so it costs nothing on page load. Hidden during the final exam.
 */
export function TutorLauncher() {
  const pathname = usePathname() || "/";
  const [Panel, setPanel] = useState<ComponentType<TutorPanelProps> | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<TutorRequest | null>(null);

  const load = useCallback(async () => {
    if (!Panel) {
      const mod = await import("@/components/tutor/tutor-panel");
      setPanel(() => mod.TutorPanel);
    }
    setOpen(true);
  }, [Panel]);

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<TutorRequest>).detail ?? {};
      setPending({ ...detail, nonce: Date.now() });
      void load();
    }
    window.addEventListener("r0-tutor", onOpen);
    return () => window.removeEventListener("r0-tutor", onOpen);
  }, [load]);

  // Handoff from Code E: /playground?tutor=explain&err=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("tutor");
    if (!mode) return;
    const err = (params.get("err") || "").slice(0, 800);
    params.delete("tutor");
    params.delete("err");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    const t = window.setTimeout(() => {
      openTutor(
        mode === "explain"
          ? { prompt: err ? `Explain my error and how to fix it:\n${err}` : "Explain what my code does and anything that looks wrong.", withPlayground: true, autoSend: true }
          : {},
      );
    }, 900);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isExam(pathname)) setOpen(false);
  }, [pathname]);

  if (isExam(pathname)) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => void load()}
          data-testid="tutor-open"
          aria-label="Ask Retr0 Tutor, the AI tutor"
          className="fixed right-4 bottom-4 z-50 flex items-center gap-2 border-2 border-ink bg-accent px-3 py-2.5 text-accent-ink shadow-md transition-transform hover:-translate-y-0.5 hover:bg-accent-hover md:right-6 md:bottom-6"
        >
          <TutorIcon className="-my-1 h-9 w-9" size={128} />
          <span className="font-pixel text-[0.6rem] leading-none">Ask AI</span>
        </button>
      ) : null}
      {Panel && open ? <Panel pathname={pathname} request={pending} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
