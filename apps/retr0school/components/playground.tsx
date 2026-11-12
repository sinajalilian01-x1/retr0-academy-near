"use client";

import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { w3hEditorTheme, w3hSyntax } from "@/lib/editor-theme";
import { buildSrcDoc } from "@/lib/srcdoc";

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
}: {
  initialHtml: string;
  initialCss: string;
  initialJs: string;
}) {
  const [code, setCode] = useState({ html: initialHtml, css: initialCss, js: initialJs });
  const [pane, setPane] = useState<PaneId>("html");
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; level?: string; message?: string } | null;
      if (!data || data.source !== "w3h-preview" || typeof data.message !== "string") return;
      const level: Log["level"] = data.level === "error" || data.level === "warn" ? data.level : "log";
      setLogs((current) => [...current, { level, message: data.message as string }].slice(-6));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function runWith(next: { html: string; css: string; js: string }) {
    setLogs([]);
    setSrcDoc(buildSrcDoc(next.html, next.css, next.js));
    setRunId((value) => value + 1);
  }

  function run() {
    runWith(code);
  }

  function reset() {
    const next = { html: initialHtml, css: initialCss, js: initialJs };
    setCode(next);
    runWith(next);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-sm text-muted">Sandboxed preview</p>
        <div className="flex gap-2">
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
                data-testid="tryit-preview"
                title="Example preview"
                sandbox="allow-scripts allow-forms allow-popups"
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
