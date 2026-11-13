import Link from "next/link";
import type { ReactNode } from "react";

/** Tiny, safe markdown renderer for tutor answers (no HTML injection): code fences, lists, headings, bold, code, links, [S1] cites. */
export function TutorMarkdown({ text, cite }: { text: string; cite: string[] }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^\s*```(\w+)?/.exec(line);
    if (fence) {
      const lang = fence[1] || "";
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push(
        <div key={key++} className="my-2 border-2 border-line bg-sunken">
          {lang ? <div className="border-b border-line px-2 py-0.5 font-mono text-[0.65rem] text-faint uppercase">{lang}</div> : null}
          <pre className="overflow-x-auto p-2 font-mono text-[0.78rem] leading-relaxed text-ink">
            <code>{code.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={key++} className={`my-1.5 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-[square]"} marker:text-accent-text`}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, cite)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={key++} className="mt-2.5 mb-1 font-semibold text-highlight">
          {inline(heading[1], cite)}
        </p>,
      );
      i++;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|[-*]\s|\d+\.\s|#{1,4}\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key++} className="my-1.5">
        {inline(para.join(" "), cite)}
      </p>,
    );
  }
  return <>{blocks}</>;
}

function inline(text: string, cite: string[]): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\[S(\d+)\](?:\[S\d+\])*)|(\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (m[1]) out.push(<code key={k++} className="border border-line bg-sunken px-1 font-mono text-[0.8em] text-cyan">{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k++} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>);
    else if (m[3]) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const href = lm[2];
      if (href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={k++} href={href} className="text-info underline underline-offset-2">{lm[1]}</Link>);
      else if (/^https:\/\//.test(href)) out.push(<a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="text-info underline underline-offset-2">{lm[1]}</a>);
      else out.push(lm[1]);
    } else if (m[4]) {
      for (const c of tok.matchAll(/\[S(\d+)\]/g)) {
        const href = cite[Number(c[1]) - 1];
        out.push(
          href ? (
            <Link key={k++} href={href} title={href} className="mx-0.5 inline-block border border-cyan px-1 align-baseline font-mono text-[0.65rem] leading-tight text-cyan hover:bg-cyan hover:text-canvas">
              S{c[1]}
            </Link>
          ) : null,
        );
      }
    } else if (m[6]) out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
