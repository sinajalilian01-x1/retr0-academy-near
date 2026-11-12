import type { Metadata } from "next";
import { PlaygroundLoader } from "@/components/playground-loader";
import { starter } from "@/lib/starter";

export const metadata: Metadata = {
  title: "Try it Yourself",
  description: "A free HTML, CSS, and JavaScript editor that runs in your browser.",
};

export default function TryItPage() {
  return (
    <main id="content" className="mx-auto max-w-page px-5 py-8 md:px-8">
      <p className="text-sm font-medium tracking-eyebrow text-highlight uppercase">Playground</p>
      <h1 className="mt-2 font-pixel text-title">Try it Yourself</h1>
      <p className="mt-3 max-w-lesson text-muted">
        Write HTML, CSS, and JavaScript, then press Run. The preview is sandboxed and nothing is uploaded.
      </p>
      <div className="mt-6 h-[70dvh] min-h-[28rem] overflow-hidden rounded-lg border border-line shadow-md">
        <PlaygroundLoader initialHtml={starter.html} initialCss={starter.css} initialJs={starter.js} />
      </div>
    </main>
  );
}
