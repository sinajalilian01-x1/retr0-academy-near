import type { ComponentProps, ReactNode } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { Note, Tip, Warning } from "@/components/mdx/callouts";
import { TryIt } from "@/components/mdx/try-it";
import { CodeEStarter } from "@/components/mdx/code-e-starter";
import { getSharedHighlighter, shikiTheme } from "@/lib/highlight";

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function CodePre(props: ComponentProps<"pre"> & { "data-language"?: string }) {
  const language = props["data-language"];
  return (
    <div className="code-frame">
      {language ? <p className="code-label">{language}</p> : null}
      <pre {...props} />
    </div>
  );
}

function Table(props: ComponentProps<"table">) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}

export function renderMdx(source: string, title?: string): ReactNode {
  let skippedDuplicateTitle = false;

  function H1(props: ComponentProps<"h1">) {
    const label = nodeText(props.children).replace(/\s+/g, " ").trim();
    if (!skippedDuplicateTitle && title && label === title.trim()) {
      skippedDuplicateTitle = true;
      return null;
    }
    return <h1 {...props} />;
  }

  return (
    <MDXRemote
      source={source}
      components={{
        Note,
        Warning,
        Tip,
        TryIt,
        CodeEStarter,
        pre: CodePre,
        table: Table,
        h1: H1,
      }}
      options={{
        // Lesson examples pass code through JS template literals. v6 blocks those
        // expressions by default, which emptied every TryIt. Dangerous globals stay blocked.
        blockJS: false,
        blockDangerousJS: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            [
              rehypePrettyCode,
              {
                theme: shikiTheme,
                keepBackground: true,
                bypassInlineCode: true,
                getHighlighter: () => getSharedHighlighter(),
              },
            ],
          ],
        },
      }}
    />
  );
}
