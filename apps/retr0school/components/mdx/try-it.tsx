import { highlight } from "@/lib/highlight";
import { CodeSample } from "@/components/mdx/code-sample";
import { TryItLauncher } from "@/components/mdx/try-it-launcher";

export async function TryIt({
  title,
  html = "",
  css = "",
  js = "",
}: {
  title?: string;
  html?: string;
  css?: string;
  js?: string;
}) {
  const panes: { id: string; label: string; html: string }[] = [];
  if (html) panes.push({ id: "html", label: "HTML", html: await highlight(html, "html") });
  if (css) panes.push({ id: "css", label: "CSS", html: await highlight(css, "css") });
  if (js) panes.push({ id: "js", label: "JavaScript", html: await highlight(js, "javascript") });

  return (
    <figure className="tryit">
      {title ? <figcaption className="border-b border-line px-4 py-3 font-medium text-ink">{title}</figcaption> : null}
      <CodeSample panes={panes} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken px-4 py-3">
        <p className="text-sm text-muted">Edit this example in the browser.</p>
        <TryItLauncher title={title} html={html} css={css} js={js} />
      </div>
    </figure>
  );
}
