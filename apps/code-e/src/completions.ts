import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'

const GLOBALS = [
  'console',
  'document',
  'window',
  'localStorage',
  'sessionStorage',
  'fetch',
  'alert',
  'Math',
  'JSON',
  'Object',
  'Array',
  'Promise',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'navigator',
  'location',
  'history',
]

const SNIPPETS: { label: string; apply: string; detail: string }[] = [
  { label: 'console.log', apply: 'console.log()', detail: 'Print a message' },
  { label: 'console.warn', apply: 'console.warn()', detail: 'Print a warning' },
  { label: 'console.error', apply: 'console.error()', detail: 'Print an error' },
  { label: 'document.querySelector', apply: "document.querySelector('')", detail: 'Find one element' },
  { label: 'addEventListener', apply: "addEventListener('click', () => {\n  \n})", detail: 'Listen for an event' },
]

const MEMBERS: Record<string, string[]> = {
  console: ['log', 'info', 'warn', 'error', 'debug', 'table', 'clear', 'dir'],
  document: [
    'querySelector',
    'querySelectorAll',
    'getElementById',
    'getElementsByClassName',
    'createElement',
    'body',
    'head',
    'title',
    'addEventListener',
  ],
  window: ['document', 'console', 'localStorage', 'location', 'fetch', 'alert', 'setTimeout', 'addEventListener', 'innerWidth', 'innerHeight'],
  localStorage: ['getItem', 'setItem', 'removeItem', 'clear', 'key'],
  sessionStorage: ['getItem', 'setItem', 'removeItem', 'clear', 'key'],
  JSON: ['parse', 'stringify'],
  Math: ['floor', 'ceil', 'round', 'random', 'max', 'min', 'abs', 'pow', 'sqrt'],
  Object: ['keys', 'values', 'entries', 'assign', 'freeze'],
  Array: ['from', 'isArray', 'of'],
  Promise: ['resolve', 'reject', 'all', 'race'],
  history: ['pushState', 'replaceState', 'back', 'forward'],
  location: ['href', 'hash', 'search', 'pathname', 'reload', 'assign'],
  navigator: ['userAgent', 'clipboard', 'language'],
}

function insideLiteral(context: CompletionContext): boolean {
  const name = syntaxTree(context.state).resolveInner(context.pos, -1).name
  return /String|Comment|Template/.test(name)
}

export function browserCompletions(context: CompletionContext): CompletionResult | null {
  if (insideLiteral(context)) return null
  const dotted = context.matchBefore(/[A-Za-z_$][\w$]*\.[A-Za-z_$]*$/)
  if (dotted) {
    const [objectName, partial = ''] = dotted.text.split('.')
    const members = MEMBERS[objectName]
    if (!members) return null
    const options = members
      .filter((label) => label.startsWith(partial))
      .map((label) => ({ label, type: 'method' }))
    if (!options.length) return null
    return {
      from: dotted.from + objectName.length + 1,
      options,
      validFor: /^[A-Za-z_$][\w$]*$/,
    }
  }
  const word = context.matchBefore(/[A-Za-z_$][\w$]*$/)
  if (!word || (word.from > 0 && /[.\w$]/.test(context.state.sliceDoc(word.from - 1, word.from)))) return null
  const options = [
    ...SNIPPETS.filter((item) => item.label.startsWith(word.text)).map((item) => ({
      label: item.label,
      apply: item.apply,
      detail: item.detail,
      type: 'function',
    })),
    ...GLOBALS.filter((label) => label.startsWith(word.text)).map((label) => ({ label, type: 'variable' })),
  ]
  if (!options.length) return null
  return { from: word.from, options, validFor: /^[A-Za-z_$][\w$]*$/ }
}
