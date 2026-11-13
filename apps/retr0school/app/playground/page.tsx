import type { Metadata } from "next";
import { PlaygroundStudio } from "@/components/playground-studio";

export const metadata: Metadata = {
  title: "Playground",
  description: "A simple HTML, CSS, and JavaScript playground on Retr0 Academy, with a live preview and an Open in Code E button.",
};

export default function PlaygroundPage() {
  return (
    <main id="content" className="mx-auto max-w-page px-5 py-8 md:px-8">
      <p className="text-sm font-medium tracking-eyebrow text-highlight uppercase">Retr0 Academy</p>
      <h1 className="mt-2 font-pixel text-title">Playground</h1>
      <p className="mt-3 max-w-lesson text-muted">
        Write HTML, CSS, and JavaScript, then press Run. The preview is sandboxed and nothing is uploaded. When you want
        a fuller editor, open the same code in Code E.
      </p>
      <div className="mt-6 h-[75dvh] min-h-[32rem] overflow-hidden rounded-lg border-2 border-line shadow-md">
        <PlaygroundStudio />
      </div>
    </main>
  );
}
