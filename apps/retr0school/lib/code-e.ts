import { compressToEncodedURIComponent } from "lz-string";
import { CODE_E_URL } from "@/lib/near";

/** Build a Code E link using Code E's existing `#code=` share format (lz-string JSON of html/css/js). */
export function codeELink(files: { html?: string; css?: string; js?: string }) {
  const payload = { html: files.html ?? "", css: files.css ?? "", js: files.js ?? "" };
  return `${CODE_E_URL}/#code=${compressToEncodedURIComponent(JSON.stringify(payload))}`;
}
