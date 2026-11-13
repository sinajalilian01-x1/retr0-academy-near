"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Minimize2, Send, Square, Trash2, X } from "lucide-react";
import { TutorIcon } from "@/components/tutor/tutor-icon";
import { TutorMarkdown } from "@/components/tutor/tutor-markdown";

export type TutorRequest = {
  prompt?: string;
  withPlayground?: boolean;
  autoSend?: boolean;
  nonce?: number;
};
export type TutorPanelProps = {
  pathname: string;
  request: TutorRequest | null;
  onClose: () => void;
};

type Source = { href: string; title: string; track: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  cite?: string[];
  error?: boolean;
};

const MAX = 1200;
const STORE = "r0-tutor-v1";
const FULL_STORE = "r0-tutor-full";

declare global {
  interface Window {
    __r0Playground?: { html: string; css: string; js: string; errors: string };
  }
}

function pageLabel(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/playground") || pathname.startsWith("/tryit"))
    return "Playground";
  const h1 =
    typeof document !== "undefined"
      ? document.querySelector("main h1")?.textContent?.trim()
      : "";
  return h1 ? h1.slice(0, 48) : pathname;
}

function suggestions(pathname: string): string[] {
  if (pathname.startsWith("/playground") || pathname.startsWith("/tryit")) {
    return [
      "Explain my error",
      "Review my code and suggest one improvement",
      "Show me how to add a NEAR view call here",
    ];
  }
  if (
    /^\/(fundamentals|contracts|tokens|dapp|html|css|javascript|html-advanced|css-advanced|js-advanced|advanced)\/[a-z0-9-]+$/.test(
      pathname,
    ) &&
    !pathname.endsWith("/quiz")
  ) {
    return [
      "Explain this lesson like I'm new",
      "Give me a harder example",
      "What are the 3 things to remember here?",
    ];
  }
  if (
    pathname.startsWith("/diploma") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/d/")
  ) {
    return [
      "How does the soulbound certificate work?",
      "What is NEP-171?",
      "How is my exam score stored on-chain?",
    ];
  }
  if (pathname.startsWith("/guides/perps")) {
    return [
      "What is a perp, in one minute?",
      "How does liquidation work?",
      "Where do perps exist on NEAR?",
    ];
  }
  return [
    "What is a NEAR access key?",
    "What are perps on NEAR?",
    "View call vs change call?",
    "How do I mint an NFT on NEAR?",
    "Flexbox or Grid?",
  ];
}

export function TutorPanel({ pathname, request, onClose }: TutorPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const fullRef = useRef(full);
  fullRef.current = full;
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const handled = useRef<number | undefined>(undefined);
  const onPlayground =
    pathname.startsWith("/playground") || pathname.startsWith("/tryit");

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Mount once: restore this tab's chat and wire Escape. Must not re-run on parent re-renders, or it would
  // overwrite a streaming answer with the saved copy.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved)
        setMessages((cur) =>
          cur.length ? cur : (JSON.parse(saved) as Msg[]).slice(-20),
        );
      if (sessionStorage.getItem(FULL_STORE) === "1") setFull(true);
    } catch {
      /* ignore */
    }
    field.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Esc leaves fullscreen first; a second Esc closes the panel.
      if (fullRef.current) setFull(false);
      else closeRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (busy) return;
    try {
      sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-20)));
    } catch {
      /* ignore */
    }
  }, [messages, busy]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FULL_STORE, full ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!full) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [full]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!request || request.nonce === handled.current) return;
    handled.current = request.nonce;
    if (request.prompt && request.autoSend) void send(request.prompt);
    else if (request.prompt) setInput(request.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  async function send(text: string) {
    const q = text.trim().slice(0, MAX);
    if (!q || busy) return;
    const history = [
      ...messages.filter((m) => !m.error),
      { role: "user" as const, content: q },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    const pg = onPlayground ? window.__r0Playground : undefined;
    try {
      const payload = JSON.stringify({
        path: pathname,
        messages: history
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content })),
        playground: pg
          ? { html: pg.html, css: pg.css, js: pg.js, errors: pg.errors }
          : undefined,
      });
      let res: Response | null = null;
      // One automatic retry for cold starts and upstream hiccups.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch("/api/tutor", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
            signal: ctrl.signal,
          });
          if (res.status < 500) break;
        } catch (error) {
          if ((error as Error).name === "AbortError" || attempt === 1)
            throw error;
        }
      }
      if (!res)
        throw new Error("The tutor is unavailable right now. Try again.");
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error ||
            `The tutor is unavailable right now (HTTP ${res.status}). Try again in a moment.`,
        );
      }
      const parse = <T,>(h: string | null, fallback: T): T => {
        try {
          return h ? (JSON.parse(decodeURIComponent(h)) as T) : fallback;
        } catch {
          return fallback;
        }
      };
      const sources = parse<Source[]>(res.headers.get("x-tutor-sources"), []);
      const cite = parse<string[]>(res.headers.get("x-tutor-cite"), []);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((cur) => [
          ...cur.slice(0, -1),
          { role: "assistant", content: snapshot, cite },
        ]);
      }
      const used = sources.filter((s) =>
        cite.some((href, n) => href === s.href && acc.includes(`[S${n + 1}]`)),
      );
      setMessages((cur) => [
        ...cur.slice(0, -1),
        {
          role: "assistant",
          content: acc || "…",
          cite,
          sources: used.length ? used : sources.slice(0, 2),
        },
      ]);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setMessages((cur) => {
          const last = cur[cur.length - 1];
          return [
            ...cur.slice(0, -1),
            { ...last, content: (last?.content || "") + " _(stopped)_" },
          ];
        });
      } else {
        setMessages((cur) => [
          ...cur.slice(0, -1),
          { role: "assistant", content: (error as Error).message, error: true },
        ]);
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  const label = pageLabel(pathname);
  const empty = messages.length === 0;

  return (
    <section
      role="dialog"
      aria-label="Retr0 Tutor"
      aria-modal={full || undefined}
      data-testid="tutor-panel"
      data-fullscreen={full ? "true" : "false"}
      className={
        full
          ? "fixed inset-0 z-[60] flex h-dvh flex-col bg-elevated"
          : "fixed inset-0 z-50 flex flex-col border-ink bg-elevated sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-6rem))] sm:w-[400px] sm:border-2 sm:shadow-md"
      }
    >
      <header className="border-b-2 border-line bg-bar px-3 py-2.5">
        <div
          className={`flex items-center gap-2.5 ${full ? "mx-auto w-full max-w-3xl" : ""}`}
        >
          <TutorIcon className="h-10 w-10 shrink-0" size={128} />
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[0.65rem] leading-relaxed text-accent-text">
              Retr0 Tutor
            </p>
            <p className="truncate text-[0.7rem] text-muted">
              <span
                className="mr-1 inline-block h-1.5 w-1.5 bg-good align-middle"
                aria-hidden
              />
              AI on NEAR AI Cloud · grounded in lessons
            </p>
          </div>
          {messages.length ? (
            <button
              type="button"
              onClick={() => {
                abort.current?.abort();
                setMessages([]);
              }}
              className="p-2 text-muted hover:text-cyan"
              aria-label="Clear chat"
              data-testid="tutor-clear"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setFull((f) => !f)}
            className="border-2 border-transparent p-1.5 text-muted hover:border-line hover:text-cyan"
            aria-label={full ? "Exit fullscreen" : "Fullscreen"}
            aria-pressed={full}
            title={full ? "Exit fullscreen (Esc)" : "Fullscreen"}
            data-testid="tutor-fullscreen"
          >
            {full ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted hover:text-cyan"
            aria-label="Close tutor"
            data-testid="tutor-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="border-b border-line bg-sunken px-3 py-1.5 text-[0.7rem] text-faint">
        <div
          className={`flex items-center gap-2 ${full ? "mx-auto w-full max-w-3xl" : ""}`}
        >
          <span className="font-mono text-cyan">&gt;</span>
          <span className="truncate">
            Context: <span className="text-muted">{label}</span>
            {onPlayground ? (
              <span className="text-muted"> · reads your code + console</span>
            ) : null}
          </span>
          {full ? (
            <span className="ml-auto hidden shrink-0 sm:inline">
              Esc to exit fullscreen
            </span>
          ) : null}
        </div>
      </div>

      <div
        ref={scroller}
        className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 leading-relaxed text-ink ${full ? "text-[0.95rem]" : "text-[0.88rem]"}`}
        aria-live="polite"
      >
        <div className={full ? "mx-auto w-full max-w-3xl" : ""}>
          {empty ? (
            <div className="flex flex-col gap-3">
              <div className="border-2 border-line bg-canvas p-3">
                <p className="font-pixel text-[0.6rem] leading-relaxed text-highlight">
                  Hi, I&apos;m Retr0 Tutor!
                </p>
                <p className="mt-2 text-muted">
                  Ask me about NEAR accounts, keys, contracts, NEP-171 NFTs,
                  near-api-js, or any HTML, CSS and JS lesson. I answer from the
                  Retr0 Academy lessons and link the ones I use.
                </p>
                <p className="mt-2 text-[0.75rem] text-faint">
                  I won&apos;t give final exam answers. You earn that
                  certificate yourself.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions(pathname).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      void send(
                        s === "Explain my error"
                          ? "Explain my error and how to fix it."
                          : s,
                      )
                    }
                    className="border-2 border-line bg-canvas px-3 py-2 text-left text-sm text-cyan shadow-sm hover:border-cyan"
                    data-testid="tutor-suggestion"
                  >
                    <span className="mr-2 font-mono text-accent-text">▸</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {messages.map((m, n) => (
                <li
                  key={n}
                  className={
                    m.role === "user" ? "flex justify-end" : "flex gap-2"
                  }
                >
                  {m.role === "user" ? (
                    <div className="max-w-[85%] border-2 border-ink bg-accent px-3 py-2 whitespace-pre-wrap text-accent-ink shadow-sm">
                      {m.content}
                    </div>
                  ) : (
                    <>
                      <div
                        data-testid="tutor-answer"
                        className={`min-w-0 flex-1 border-2 px-3 py-1.5 ${m.error ? "border-danger bg-danger-soft text-danger" : "border-line bg-canvas"}`}
                      >
                        {m.content ? (
                          <TutorMarkdown text={m.content} cite={m.cite ?? []} />
                        ) : (
                          <p className="my-1.5 text-muted">
                            Thinking
                            <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-cyan align-middle" />
                          </p>
                        )}
                        {busy && n === messages.length - 1 && m.content ? (
                          <span
                            className="inline-block h-3.5 w-2 animate-pulse bg-cyan align-middle"
                            aria-hidden
                          />
                        ) : null}
                        {m.sources?.length ? (
                          <div
                            className="mt-2 border-t border-line pt-1.5 pb-0.5"
                            data-testid="tutor-sources"
                          >
                            <p className="text-[0.65rem] tracking-eyebrow text-faint uppercase">
                              From the lessons
                            </p>
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {m.sources.map((s) => (
                                <li key={s.href}>
                                  <Link
                                    href={s.href}
                                    className="inline-block border border-line px-1.5 py-0.5 text-[0.72rem] text-cyan hover:border-cyan"
                                  >
                                    {s.title}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <form
        className="border-t-2 border-line bg-bar p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <div className={full ? "mx-auto w-full max-w-3xl" : ""}>
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="tutor-input">
              Ask Retr0 Tutor
            </label>
            <textarea
              id="tutor-input"
              ref={field}
              data-testid="tutor-input"
              rows={2}
              maxLength={MAX}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder={
                onPlayground
                  ? "Ask about your code…"
                  : "Ask about NEAR, HTML, CSS, JS…"
              }
              className="min-h-11 flex-1 resize-none border-2 border-line bg-canvas px-2.5 py-2 text-sm text-ink placeholder:text-faint focus:border-cyan focus:outline-none"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-raised text-ink shadow-sm"
                aria-label="Stop"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                data-testid="tutor-send"
                className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-accent text-accent-ink shadow-sm hover:bg-accent-hover disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-1 flex justify-between text-[0.65rem] text-faint">
            <span>Enter to send · Shift+Enter for a new line</span>
            <span>
              {input.length}/{MAX}
            </span>
          </p>
        </div>
      </form>
    </section>
  );
}
