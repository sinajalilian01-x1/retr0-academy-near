import type { ConsoleLevel, ProjectFile } from './types'

function basename(url: string): string {
  const clean = url.split(/[?#]/)[0] ?? ''
  const last = clean.split('/').pop() ?? ''
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

function stripLocalReferences(html: string, files: ProjectFile[]): string {
  const css = new Set(files.filter((file) => file.name.toLowerCase().endsWith('.css')).map((file) => file.name))
  const js = new Set(
    files.filter((file) => /\.(js|mjs|cjs)$/i.test(file.name)).map((file) => file.name),
  )
  const withoutLinks = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]
    if (href && css.has(basename(href))) return ''
    return tag
  })
  return withoutLinks.replace(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/script>/gi, (tag, _quote, src) => {
    if (js.has(basename(String(src)))) return ''
    return tag
  })
}

function ordered(files: ProjectFile[], pattern: RegExp, pinned: string): string {
  return files
    .filter((file) => pattern.test(file.name))
    .sort((a, b) => {
      if (a.name === pinned) return -1
      if (b.name === pinned) return 1
      return a.name.localeCompare(b.name)
    })
    .map((file) => file.content)
    .join('\n\n')
}

function safeStyle(css: string): string {
  return css.replace(/<\/style/gi, '<\\/style')
}

function safeScript(js: string): string {
  return js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')
}

function bridge(runId: number): string {
  return `<script>(function(){var run=${runId};function ser(v){if(v===null)return"null";var t=typeof v;if(t==="string"||t==="number"||t==="boolean"||t==="undefined")return String(v);if(v instanceof Error)return v.stack||v.message;try{return JSON.stringify(v)}catch(e){return String(v)}}function send(level,args){parent.postMessage({source:"retr0code",run:run,level:level,text:args.map(ser).join(" ")},"*")}["log","info","warn","error"].forEach(function(level){var orig=console[level];console[level]=function(){var args=[].slice.call(arguments);send(level,args);return orig.apply(console,args)}});window.addEventListener("error",function(e){send("error",[e.message+(e.lineno?" (line "+e.lineno+")":"")])});window.addEventListener("unhandledrejection",function(e){var reason=e.reason instanceof Error?(e.reason.stack||e.reason.message):ser(e.reason);send("error",["Unhandled rejection: "+reason])})})();</script>`
}

function entryHtml(files: ProjectFile[]): string {
  return (
    files.find((file) => file.name === 'index.html')?.content ??
    files.find((file) => /\.html?$/i.test(file.name))?.content ??
    '<p>Add an index.html file to see a preview.</p>'
  )
}

export function assembleDocument(files: ProjectFile[], options: { bridgeId?: number; nonce?: number }): string {
  const css = safeStyle(ordered(files, /\.css$/i, 'style.css'))
  const js = safeScript(ordered(files, /\.(js|mjs|cjs)$/i, 'script.js'))
  const styleTag = `<style>${css}</style>`
  const scripts = `${options.bridgeId ? bridge(options.bridgeId) : ''}<script>${js}</script>`
  let html = stripLocalReferences(entryHtml(files), files)
  const full = /<!doctype\s+html|<html[\s>]/i.test(html)
  if (full) {
    if (/<head[\s>]/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`)
    else if (/<html([^>]*)>/i.test(html)) html = html.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`)
    else html = styleTag + html
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${scripts}</body>`)
    else html += scripts
    return options.nonce ? `<!--run:${options.nonce}-->${html}` : html
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${styleTag}
</head>
<body>
${html}
${scripts}
</body>
</html>`
}

let sequence = 0

export function runPreview(iframe: HTMLIFrameElement, files: ProjectFile[]): number {
  const runId = ++sequence
  iframe.srcdoc = assembleDocument(files, { bridgeId: runId, nonce: runId })
  return runId
}

export function watchPreview(
  iframe: HTMLIFrameElement,
  accept: () => number,
  onMessage: (level: ConsoleLevel, text: string) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    const data = event.data as { source?: string; run?: number; level?: string; text?: string } | null
    if (!data || data.source !== 'retr0code' || data.run !== accept()) return
    if (iframe.contentWindow && event.source !== iframe.contentWindow) return
    if (data.level !== 'log' && data.level !== 'info' && data.level !== 'warn' && data.level !== 'error') return
    if (typeof data.text !== 'string') return
    onMessage(data.level, data.text.slice(0, 4000))
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}
