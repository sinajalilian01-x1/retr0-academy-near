"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavDropdownItem = {
  href?: string;
  label: string;
  locked?: boolean;
  testId?: string;
  heading?: boolean;
};

export function NavDropdown({
  label,
  items,
  active = false,
  testId,
  align = "left",
}: {
  label: string;
  items: NavDropdownItem[];
  active?: boolean;
  testId: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const menuId = useId();
  const buttonId = useId();
  const links = items.filter((item) => !item.heading && item.href);

  function close(focusButton = false) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function focusItem(index: number) {
    const count = links.length;
    if (!count) return;
    const next = ((index % count) + count) % count;
    itemRefs.current[next]?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        data-testid={testId}
        className={cn("inline-flex items-center gap-1 text-sm font-medium", active ? "text-highlight" : "text-cyan")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => focusItem(0));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => focusItem(links.length - 1));
          }
        }}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          data-testid={`${testId}-menu`}
          className={cn(
            "absolute top-[calc(100%+0.6rem)] z-50 min-w-56 border-2 border-line bg-elevated py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            if (item.heading) {
              return (
                <li
                  key={`heading-${item.label}`}
                  role="presentation"
                  className="mt-1 border-t border-line px-4 pt-2 pb-1 font-pixel text-[0.55rem] uppercase tracking-eyebrow text-muted first:mt-0 first:border-t-0 first:pt-2"
                >
                  {item.label}
                </li>
              );
            }
            const linkIndex = links.findIndex((link) => link.href === item.href);
            return (
              <li key={item.href} role="none">
                <Link
                  href={item.href ?? "/"}
                  role="menuitem"
                  data-testid={item.testId}
                  ref={(node) => {
                    itemRefs.current[linkIndex] = node;
                  }}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink hover:bg-sunken hover:text-cyan"
                  onClick={() => close()}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusItem(linkIndex + 1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusItem(linkIndex - 1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      focusItem(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      focusItem(links.length - 1);
                    } else if (event.key === "Tab") {
                      close();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      close(true);
                    }
                  }}
                >
                  <span>{item.label}</span>
                  {item.locked ? (
                    <Lock className="h-3.5 w-3.5 text-muted" aria-label="Locked for certificate holders" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
