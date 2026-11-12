export type ThemeName = 'dark' | 'light'
export type DeviceName = 'mobile' | 'desktop'
export type Syntax = 'html' | 'css' | 'javascript' | 'json' | 'markdown' | 'text'
export type Pane = 'html' | 'css' | 'js' | 'preview' | 'console' | 'file'
export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error'

export type Settings = {
  theme: ThemeName
  fontSize: number
  wordWrap: boolean
  autoRun: boolean
  device: DeviceName
  sidebarWidth: number
  rightWidth: number
  consoleHeight: number
}

export type ProjectFile = {
  name: string
  content: string
}

export type Project = {
  files: ProjectFile[]
  open: string[]
  active: string
  settings: Settings
}

export type SharePayload = {
  html: string
  css: string
  js: string
}

export const STORAGE_KEY = 'retr0code.project.v1'

export const defaultSettings = (): Settings => ({
  theme: 'dark',
  fontSize: 14,
  wordWrap: false,
  autoRun: true,
  device: 'desktop',
  sidebarWidth: 248,
  rightWidth: 500,
  consoleHeight: 176,
})

const PINNED = ['index.html', 'style.css', 'script.js']

export function sortFiles(files: ProjectFile[]): ProjectFile[] {
  return [...files].sort((a, b) => {
    const ai = PINNED.indexOf(a.name)
    const bi = PINNED.indexOf(b.name)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.name.localeCompare(b.name)
  })
}

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/

export function validateFileName(name: string, files: ProjectFile[], ignore?: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Enter a file name.'
  if (!NAME_RE.test(trimmed)) return 'Use letters, numbers, dots, dashes, or underscores.'
  if (files.some((file) => file.name === trimmed && file.name !== ignore)) {
    return 'A file with that name already exists.'
  }
  return null
}

export function syntaxOf(name: string): Syntax {
  const lower = name.toLowerCase()
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown'
  return 'text'
}

export function languageLabel(syntax: Syntax): string {
  switch (syntax) {
    case 'html':
      return 'HTML'
    case 'css':
      return 'CSS'
    case 'javascript':
      return 'JavaScript'
    case 'json':
      return 'JSON'
    case 'markdown':
      return 'Markdown'
    default:
      return 'Text'
  }
}

export function extKind(name: string): string {
  const syntax = syntaxOf(name)
  if (syntax === 'html') return 'html'
  if (syntax === 'css') return 'css'
  if (syntax === 'javascript') return 'js'
  if (syntax === 'json') return 'json'
  if (syntax === 'markdown') return 'md'
  return 'text'
}

export function extShort(name: string): string {
  const kind = extKind(name)
  if (kind === 'html') return 'HTML'
  if (kind === 'css') return 'CSS'
  if (kind === 'js') return 'JS'
  if (kind === 'json') return 'JSON'
  if (kind === 'md') return 'MD'
  const dot = name.lastIndexOf('.')
  if (dot > 0 && dot < name.length - 1) return name.slice(dot + 1, dot + 5).toUpperCase()
  return 'TXT'
}

export function paneFor(name: string): Pane | null {
  if (name === 'index.html') return 'html'
  if (name === 'style.css') return 'css'
  if (name === 'script.js') return 'js'
  return null
}
