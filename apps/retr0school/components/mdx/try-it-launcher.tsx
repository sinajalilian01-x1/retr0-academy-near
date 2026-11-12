"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const Playground = dynamic(() => import("@/components/playground").then((mod) => mod.Playground), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">Loading the editor…</p>,
});

export function TryItLauncher({
  title,
  html,
  css,
  js,
}: {
  title?: string;
  html: string;
  css: string;
  js: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Try it Yourself
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          data-testid="tryit-dialog"
          className="inset-0 flex flex-col overflow-hidden p-0 lg:inset-6 lg:rounded-xl lg:border lg:border-line"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <DialogTitle>{title ?? "Try it Yourself"}</DialogTitle>
              <DialogDescription>Sandboxed preview. Nothing is uploaded.</DialogDescription>
            </div>
            <DialogClose
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1">
            {open ? <Playground initialHtml={html} initialCss={css} initialJs={js} /> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
