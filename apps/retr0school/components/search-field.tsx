"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchEntries } from "@/components/site-provider";
import { searchLessons } from "@/lib/search";
import { cn } from "@/lib/utils";

export function SearchField({
  testId,
  placeholder = "Search lessons",
  large = false,
  hero = false,
  withButton = false,
  autoFocus = false,
  inputRef,
  onNavigate,
}: {
  testId: string;
  placeholder?: string;
  large?: boolean;
  /** Bigger variant for the homepage hero. */
  hero?: boolean;
  withButton?: boolean;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onNavigate?: () => void;
}) {
  const entries = useSearchEntries();
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => (query.trim() ? searchLessons(entries, query).slice(0, 8) : []),
    [entries, query],
  );
  const show = open && query.trim().length > 0;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="sr-only" htmlFor={testId}>
        Search lessons
      </label>
      <div className={cn("flex", withButton && "overflow-hidden rounded-xl border-2 border-line bg-elevated shadow-sm")}>
      {!withButton ? (
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
      ) : null}
      <Input
        id={testId}
        ref={inputRef}
        data-testid={testId}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          withButton ? "h-14 rounded-none border-0 bg-transparent pl-4" : "pl-10",
          hero && withButton && "h-16 pl-5 text-lg md:text-xl",
          large && !withButton && "h-14 rounded-xl text-base",
        )}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) {
            event.preventDefault();
            router.push(results[0].href);
            setOpen(false);
            onNavigate?.();
          }
          if (event.key === "Escape") {
            setQuery("");
            setOpen(false);
          }
        }}
      />
        {withButton ? (
          <button
            type="button"
            aria-label="Search"
            className={cn("inline-flex shrink-0 items-center justify-center border-l-2 border-ink bg-accent text-accent-ink", hero ? "w-16" : "w-14")}
            onClick={() => {
              if (results[0]) {
                router.push(results[0].href);
                setOpen(false);
                onNavigate?.();
              }
            }}
          >
            <Search className={hero ? "h-6 w-6" : "h-5 w-5"} aria-hidden />
          </button>
        ) : null}
      </div>
      {show ? (
        results.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-md border border-line bg-elevated p-1 shadow-lg"
          >
            {results.map((result) => (
              <li key={result.href}>
                <Link
                  href={result.href}
                  className="block rounded-md px-3 py-2 hover:bg-sunken"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="text-xs font-medium tracking-eyebrow text-muted uppercase">{result.trackTitle}</span>
                  <span className="block font-medium text-ink">{result.title}</span>
                  <span className="block text-sm text-muted">{result.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className="absolute z-30 mt-2 w-full rounded-md border border-line bg-elevated px-3 py-3 text-sm text-muted shadow-lg"
          >
            No lessons match “{query.trim()}”.
          </p>
        )
      ) : null}
    </div>
  );
}
