import "server-only";

import { createHighlighter, createJavaScriptRegexEngine, type Highlighter } from "shiki";
import { createCssVariablesTheme } from "@shikijs/core";

export const shikiTheme = createCssVariablesTheme({ name: "w3h" });

const LANGS = ["html", "css", "javascript", "json", "bash", "shellscript", "solidity", "rust"] as const;

const highlighterPromise: Promise<Highlighter> = createHighlighter({
  themes: [shikiTheme],
  langs: [...LANGS],
  engine: createJavaScriptRegexEngine(),
});

const ALIASES: Record<string, string> = {
  js: "javascript",
  shell: "bash",
  sh: "bash",
};

export async function highlight(code: string, lang: string) {
  const highlighter = await highlighterPromise;
  const resolved = ALIASES[lang] ?? lang;
  return highlighter.codeToHtml(code, { lang: resolved, theme: "w3h" });
}

export function getSharedHighlighter() {
  return highlighterPromise;
}
