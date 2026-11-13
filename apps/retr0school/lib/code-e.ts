import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { CODE_E_URL } from "@/lib/near";

export type SharePayload = { html: string; css: string; js: string };

export function encodeShare(payload: { html?: string; css?: string; js?: string }) {
  const body: SharePayload = { html: payload.html ?? "", css: payload.css ?? "", js: payload.js ?? "" };
  return compressToEncodedURIComponent(JSON.stringify(body));
}

/** Build a Code E link using Code E's existing `#code=` share format (lz-string JSON of html/css/js). */
export function codeELink(files: { html?: string; css?: string; js?: string }) {
  return `${CODE_E_URL}/#code=${encodeShare(files)}`;
}

export function playgroundPath(files?: { html?: string; css?: string; js?: string }, template?: "near") {
  if (files && (files.html || files.css || files.js)) return `/playground#code=${encodeShare(files)}`;
  if (template === "near") return "/playground#template=near";
  return "/playground";
}

/** Same decoder Code E uses, so `#code=` payloads round-trip in both directions. */
export function decodeShare(encoded: string): SharePayload | null {
  const candidates = [encoded, encoded.replace(/ /g, "+")];
  try {
    candidates.push(decodeURIComponent(encoded));
  } catch {
    /* The fragment was not percent-encoded. */
  }
  for (const candidate of candidates) {
    try {
      const json = decompressFromEncodedURIComponent(candidate);
      if (!json) continue;
      const value = JSON.parse(json) as unknown;
      if (!value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      if (typeof record.html !== "string" || typeof record.css !== "string" || typeof record.js !== "string") continue;
      return { html: record.html, css: record.css, js: record.js };
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

/** Pull the first <TryIt html={`...`} css={`...`} js={`...`} /> example out of an MDX lesson body. */
export function firstTryItExample(body: string): SharePayload | null {
  const start = body.search(/<TryIt\b/);
  if (start < 0) return null;
  const slice = body.slice(start, start + 12000);
  const end = slice.search(/\/>/);
  const block = end >= 0 ? slice.slice(0, end) : slice;
  const pick = (name: string) => {
    const prefix = name + "={\u0060";
    const startAt = block.indexOf(prefix);
    if (startAt < 0) return "";
    const from = startAt + prefix.length;
    const endAt = block.indexOf("\u0060}", from);
    if (endAt < 0) return "";
    return block.slice(from, endAt);
  };
  const html = pick("html");
  const css = pick("css");
  const js = pick("js");
  if (!html && !css && !js) return null;
  return { html, css, js };
}

export function playgroundHrefForLesson(track: string, body?: string) {
  const example = body ? firstTryItExample(body) : null;
  if (example) return playgroundPath(example);
  if (track === "near" || track === "advanced") return playgroundPath(undefined, "near");
  return playgroundPath();
}
