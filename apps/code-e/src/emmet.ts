import { completionStatus } from '@codemirror/autocomplete'
import { indentWithTab } from '@codemirror/commands'
import { keymap, type Command, type EditorView } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import expand, { extract, type UserConfig } from 'emmet'
import type { Syntax } from './types'

const MARK = '\u0000'
const SPLIT = '\u0001'
const HTML_BOILERPLATE = new Set(['!', 'html', 'html:5'])

const HTML5_DOCUMENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  
</body>
</html>`

function html5Document(): { text: string; from: number; to: number } {
  const at = HTML5_DOCUMENT.indexOf('<body>\n') + '<body>\n  '.length
  return { text: HTML5_DOCUMENT, from: at, to: at }
}

const HTML_TAGS = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote', 'body', 'br', 'button',
  'canvas', 'caption', 'code', 'col', 'div', 'em', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'iframe', 'img',
  'input', 'label', 'li', 'link', 'main', 'meta', 'nav', 'ol', 'option', 'p', 'pre', 'script',
  'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'summary', 'table', 'tbody',
  'td', 'textarea', 'th', 'thead', 'title', 'tr', 'ul', 'video',
])

function syntaxKind(syntax: Syntax): 'html' | 'css' | null {
  if (syntax === 'html') return 'html'
  if (syntax === 'css') return 'css'
  return null
}

function expandClean(abbr: string, syntax: 'html' | 'css'): { text: string; from: number; to: number } | null {
  if (syntax === 'html' && HTML_BOILERPLATE.has(abbr)) return html5Document()
  const config: UserConfig = {
    syntax,
    type: syntax === 'css' ? 'stylesheet' : 'markup',
    options: {
      'output.indent': '  ',
      'output.field': (index, placeholder) => `${MARK}${String(index).padStart(4, '0')}${SPLIT}${placeholder || ''}${MARK}`,
    },
  }
  let raw = ''
  try {
    raw = expand(abbr, config)
  } catch {
    return null
  }
  if (!raw || raw === abbr) return null
  const fields: { index: number; placeholder: string; start: number; end: number }[] = []
  const pattern = /\u0000(\d+)\u0001([^\u0000]*)\u0000/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw))) {
    fields.push({
      index: Number(match[1]),
      placeholder: match[2],
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  if (!fields.length) return { text: raw, from: raw.length, to: raw.length }
  const chosen = abbr === '!'
    ? fields.reduce((best, field) => (field.index > best.index ? field : best))
    : fields.reduce((best, field) => (field.index < best.index ? field : best))
  let text = ''
  let from = 0
  let to = 0
  let cursor = 0
  for (const field of fields) {
    text += raw.slice(cursor, field.start)
    const at = text.length
    text += field.placeholder
    if (field === chosen) {
      from = at
      to = at + field.placeholder.length
    }
    cursor = field.end
  }
  text += raw.slice(cursor)
  if (!useful(abbr, syntax, text)) return null
  return { text, from, to }
}

function useful(abbr: string, syntax: 'html' | 'css', output: string): boolean {
  if (syntax === 'css') {
    if (!output.includes(':')) return false
    return !new RegExp(`^${abbr}\\s*:\\s*;?\\s*$`).test(output.trim())
  }
  if (abbr === '!') return output.includes('<!DOCTYPE html>')
  if (/[.#[\]>+*^]/.test(abbr) || abbr.includes('{')) return output.includes('<')
  const tag = /^<([a-zA-Z0-9:-]+)/.exec(output.trim())?.[1]?.toLowerCase()
  if (!tag) return false
  if (tag !== abbr.toLowerCase()) return true
  return HTML_TAGS.has(abbr.toLowerCase())
}

function boilerplateAtCursor(view: EditorView, getSyntax: () => Syntax): boolean {
  if (syntaxKind(getSyntax()) !== 'html') return false
  if (view.state.selection.ranges.length !== 1 || !view.state.selection.main.empty) return false
  const range = view.state.selection.main
  const line = view.state.doc.lineAt(range.head)
  const pos = range.head - line.from
  const extracted = extract(line.text, pos, { type: 'markup' })
  return Boolean(extracted && pos >= extracted.start && pos <= extracted.end && HTML_BOILERPLATE.has(extracted.abbreviation))
}

function expandAtCursor(view: EditorView, getSyntax: () => Syntax): boolean {
  if (view.state.selection.ranges.length !== 1) return false
  const range = view.state.selection.main
  if (!range.empty) return false
  const syntax = syntaxKind(getSyntax())
  if (!syntax) return false
  const line = view.state.doc.lineAt(range.head)
  const pos = range.head - line.from
  const extracted = extract(line.text, pos, { type: syntax === 'css' ? 'stylesheet' : 'markup' })
  if (!extracted || pos < extracted.start || pos > extracted.end) return false
  const expanded = expandClean(extracted.abbreviation, syntax)
  if (!expanded) return false
  const insertFrom = line.from + extracted.start
  view.dispatch({
    changes: { from: insertFrom, to: line.from + extracted.end, insert: expanded.text },
    selection: { anchor: insertFrom + expanded.from, head: insertFrom + expanded.to },
  })
  return true
}

export function emmetKeymap(getSyntax: () => Syntax) {
  const tab: Command = (view) => {
    const boilerplate = boilerplateAtCursor(view, getSyntax)
    if (!boilerplate && completionStatus(view.state) === 'active') return false
    if (expandAtCursor(view, getSyntax)) return true
    return indentWithTab.run?.(view) ?? false
  }
  const untab: Command = (view) => indentWithTab.shift?.(view) ?? false
  return Prec.high(keymap.of([{ key: 'Tab', run: tab, shift: untab }]))
}
