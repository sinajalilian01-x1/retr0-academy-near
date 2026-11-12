import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";

export const w3hHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--shiki-token-keyword)" },
  { tag: tags.string, color: "var(--shiki-token-string)" },
  { tag: tags.comment, color: "var(--shiki-token-comment)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--shiki-token-constant)" },
  { tag: tags.tagName, color: "var(--shiki-token-keyword)" },
  { tag: tags.attributeName, color: "var(--shiki-token-constant)" },
  { tag: tags.attributeValue, color: "var(--shiki-token-string)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--shiki-token-function)" },
  { tag: [tags.className, tags.typeName, tags.definition(tags.typeName)], color: "var(--shiki-token-function)" },
  { tag: tags.propertyName, color: "var(--shiki-token-constant)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--shiki-token-punctuation)" },
  { tag: tags.variableName, color: "var(--shiki-foreground)" },
]);

export const w3hSyntax = syntaxHighlighting(w3hHighlight);

export const w3hEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--shiki-background)",
    color: "var(--shiki-foreground)",
  },
  "&.cm-focused": {
    outline: "2px solid var(--w3h-focus)",
    outlineOffset: "-2px",
  },
  ".cm-scroller": {
    fontFamily: "var(--w3h-font-mono)",
    lineHeight: "1.55",
  },
  ".cm-content": {
    caretColor: "var(--w3h-accent)",
    paddingBlock: "0.75rem",
  },
  ".cm-gutters": {
    backgroundColor: "var(--w3h-code-gutter)",
    color: "var(--w3h-faint)",
    borderRight: "1px solid var(--w3h-line)",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--w3h-code-line)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--w3h-accent-soft)",
  },
});
