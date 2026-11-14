"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { w3hEditorTheme, w3hSyntax } from "@/lib/editor-theme";
import { buildSrcDoc } from "@/lib/srcdoc";
import { codeELink } from "@/lib/code-e";
import type { PlaygroundExample } from "@/lib/playground-starters";
import { openTutor } from "@/components/tutor/tutor-launcher";

type PaneId = "html" | "css" | "js";

const PANES: { id: PaneId; label: string }[] = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JavaScript" },
];

const EXTENSIONS = {
  html: [html(), w3hSyntax],
  css: [css(), w3hSyntax],
  js: [javascript(), w3hSyntax],
};

const basicSetup = {
  lineNumbers: true,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
  foldGutter: false,
  syntaxHighlighting: false,
  autocompletion: false,
};

type Log = { level: "log" | "warn" | "error"; message: string };

export function Playground({
  initialHtml,
  initialCss,
  initialJs,
  examples,
  activeExample,
  showCodeE = false,
  autoRun = false,
  untrusted = false,
}: {
  initialHtml: string;
  initialCss: string;
  initialJs: string;
  examples?: PlaygroundExample[];
  activeExample?: string;
  showCodeE?: boolean;
  autoRun?: boolean;
  /** Code from a share link (someone else's): no form submission in the preview (R1 C-15). */
  untrusted?: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [code, setCode] = useState({ html: initialHtml, css: initialCss, js: initialJs });
  const [baseline, setBaseline] = useState({ html: initialHtml, css: initialCss, js: initialJs });
  const [pane, setPane] = useState<PaneId>("html");
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);
  const [exampleId, setExampleId] = useState(activeExample ?? examples?.[0]?.id ?? "");

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // R1 C-10: only the preview frame we created may write to the console panel.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const data = event.data as { source?: string; level?: string; message?: string } | null;
      if (!data || data.source !== "w3h-preview" || typeof data.message !== "string") return;
      const level: Log["level"] = data.level === "error" || data.level === "warn" ? data.level : "log";
      setLogs((current) => [...current, { level, message: data.message as string }].slice(-6));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Share the current code and console with Retr0 Tutor (read only when the tutor is asked something here).
  useEffect(() => {
    window.__r0Playground = {
      ...code,
      errors: logs.filter((log) => log.level !== "log").map((log) => `${log.level}: ${log.message}`).join("\n"),
    };
    return () => {
      window.__r0Playground = undefined;
    };
  }, [code, logs]);

  const hasError = logs.some((log) => log.level === "error");

  function runWith(next: { html: string; css: string; js: string }) {
    setLogs([]);
    setSrcDoc(buildSrcDoc(next.html, next.css, next.js));
    setRunId((value) => value + 1);
  }

  useEffect(() => {
    if (autoRun) runWith({ html: initialHtml, css: initialCss, js: initialJs });
    // Run once when the editor first mounts with its starting code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    runWith(code);
  }

  function reset() {
    setCode(baseline);
    runWith(baseline);
  }

  function loadExample(id: string) {
    const example = examples?.find((item) => item.id === id);
    if (!example) return;
    const next = { html: example.html, css: example.css, js: example.js };
    setExampleId(id);
    setBaseline(next);
    setCode(next);
    runWith(next);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">Sandboxed preview</p>
          {examples && examples.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <span className="sr-only">Starter example</span>
              <select
                data-testid="playground-example"
                className="h-10 border-2 border-line bg-elevated px-2 text-sm text-ink"
                value={exampleId || "custom"}
                onChange={(event) => loadExample(event.target.value)}
              >
                {exampleId ? null : <option value="custom">Loaded from lesson</option>}
                {examples.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showCodeE ? (
            <a
              href={codeELink(code)}
              target="_blank"
              rel="noopener"
              data-testid="open-in-code-e"
              className="inline-flex h-10 items-center rounded-md border-2 border-line bg-elevated px-4 text-sm font-medium text-ink shadow-sm hover:border-cyan"
            >
              Open in Code E ↗
            </a>
          ) : null}
          {showCodeE ? (
          <Button
            type="button"
            variant="outline"
            data-testid="ask-tutor"
            className={hasError ? "border-accent text-accent-text" : undefined}
            onClick={() =>
              openTutor(
                hasError
                  ? { prompt: "Explain my error and how to fix it.", withPlayground: true, autoSend: true }
                  : { prompt: "Review my code: what does it do, and what is one thing I could improve?", withPlayground: true, autoSend: true },
              )
            }
          >
            {hasError ? "Explain my error" : "Ask AI"}
          </Button>
          ) : null}
          <Button type="button" variant="outline" data-testid="tryit-reset" onClick={reset}>
            Reset
          </Button>
          <Button type="button" data-testid="tryit-run" onClick={run}>
            Run
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
        <div className="flex min-h-0 flex-col border-b border-line lg:border-r lg:border-b-0">
          <div role="tablist" aria-label="Editor language" className="flex gap-1 border-b border-line px-2 py-2">
            {PANES.map((item) => {
              const selected = pane === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={
                    selected
                      ? "rounded-md border-2 border-cyan px-3 py-1.5 text-sm font-medium text-cyan"
                      : "rounded-md border-2 border-transparent px-3 py-1.5 text-sm text-muted"
                  }
                  onClick={() => setPane(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="relative min-h-0 flex-1">
            <CodeMirror
              key={pane}
              value={code[pane]}
              height="100%"
              theme={w3hEditorTheme}
              extensions={[
                ...EXTENSIONS[pane],
                EditorView.contentAttributes.of({ "aria-label": `${PANES.find((item) => item.id === pane)?.label ?? "Code"} editor` }),
              ]}
              basicSetup={basicSetup}
              onChange={(value, update) => {
                if (!update.view.hasFocus) return;
                setCode((current) => ({ ...current, [pane]: value }));
              }}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="border-b border-line px-3 py-2 text-sm text-muted">Preview</p>
          <div className="relative min-h-0 flex-1 bg-elevated">
            {srcDoc ? (
              <iframe
                key={runId}
                ref={frameRef}
                data-testid="tryit-preview"
                title="Example preview"
                sandbox={untrusted ? "allow-scripts" : "allow-scripts allow-forms allow-popups"}
                srcDoc={srcDoc}
                className="absolute inset-0 h-full w-full border-0 bg-elevated"
              />
            ) : (
              <p data-testid="tryit-placeholder" className="flex h-full items-center justify-center px-6 text-center text-muted">
                Press Run to see the result.
              </p>
            )}
          </div>
          <div aria-live="polite" className="max-h-24 overflow-auto border-t border-line bg-sunken px-3 py-2 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-faint">Console output appears here.</p>
            ) : (
              <ul>
                {logs.map((log, index) => (
                  <li key={`${log.level}-${index}`} className={log.level === "error" ? "text-danger" : "text-ink"}>
                    {log.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
