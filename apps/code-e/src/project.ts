import { decodeShare, clearCodeHash } from './share'
import { starterFiles } from './starter'
import { nearStarterFiles } from './near-starter'
import {
  STORAGE_KEY,
  defaultSettings,
  sortFiles,
  type Project,
  type ProjectFile,
  type Settings,
  type SharePayload,
} from './types'

type Persisted = {
  v: 1
  files: ProjectFile[]
  open: string[]
  active: string
  settings?: Partial<Settings>
}

function isFile(value: unknown): value is ProjectFile {
  if (!value || typeof value !== 'object') return false
  const file = value as ProjectFile
  return typeof file.name === 'string' && file.name.length > 0 && typeof file.content === 'string'
}

export function normalizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Persisted
  if (!Array.isArray(data.files)) return null
  const files = sortFiles(data.files.filter(isFile))
  if (!files.length) return null
  const names = new Set(files.map((file) => file.name))
  const open = Array.isArray(data.open) ? data.open.filter((name) => names.has(name)) : []
  const active = typeof data.active === 'string' && names.has(data.active) ? data.active : files[0].name
  if (!open.includes(active)) open.push(active)
  const settings = { ...defaultSettings(), ...(data.settings ?? {}) }
  if (settings.device !== 'mobile' && settings.device !== 'desktop') settings.device = 'desktop'
  return {
    files,
    open,
    active,
    settings,
  }
}

const LEGACY_NAMES: Array<[string, string]> = [
  ['Retr0 Code E', 'Code E'],
  ['Retr0 Academy', 'Retr0school'],
  ['Academy X', 'Retr0school'],
  ['Retr0code', 'Code E'],
  ['Code X', 'Code E'],
]

export function migrateLegacyNames(content: string): string {
  let next = content
  for (const [from, to] of LEGACY_NAMES) {
    if (next.includes(from)) next = next.split(from).join(to)
  }
  return next
}

function withMigratedNames(project: Project): Project {
  let changed = false
  const files = project.files.map((file) => {
    const content = migrateLegacyNames(file.content)
    if (content === file.content) return file
    changed = true
    return { ...file, content }
  })
  if (!changed) return project
  const next = { ...project, files }
  writeStorage(next)
  return next
}

export function readStorage(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeProject(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeStorage(project: Project): boolean {
  try {
    const payload: Persisted = {
      v: 1,
      files: project.files,
      open: project.open,
      active: project.active,
      settings: project.settings,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function starterProject(): Project {
  const files = starterFiles()
  return {
    files,
    open: files.map((file) => file.name),
    active: 'index.html',
    settings: defaultSettings(),
  }
}

export function projectFromShare(base: Project | null, payload: SharePayload): Project {
  return {
    settings: base?.settings ?? defaultSettings(),
    files: [
      { name: 'index.html', content: payload.html },
      { name: 'style.css', content: payload.css },
      { name: 'script.js', content: payload.js },
    ],
    open: ['index.html', 'style.css', 'script.js'],
    active: 'index.html',
  }
}

export type BootSource = 'import' | 'saved' | 'starter'

export type BootResult = {
  project: Project
  source: BootSource
  error: string | null
}

export function bootProject(): BootResult {
  const saved = readStorage()
  const stored = saved ? withMigratedNames(saved) : null
  const hash = location.hash
  if (hash === '#template=near') {
    clearCodeHash()
    const files = nearStarterFiles()
    const project: Project = {
      settings: stored?.settings ?? defaultSettings(),
      files,
      open: files.map((file) => file.name),
      active: 'script.js',
    }
    writeStorage(project)
    return { project, source: 'import', error: null }
  }
  if (hash.startsWith('#code=')) {
    const decoded = decodeShare(hash.slice('#code='.length))
    clearCodeHash()
    if (decoded) {
      const project = projectFromShare(stored, decoded)
      writeStorage(project)
      return { project, source: 'import', error: null }
    }
    const project = stored ?? starterProject()
    return {
      project,
      source: stored ? 'saved' : 'starter',
      error: stored
        ? 'This share link could not be read. Opened your saved project instead.'
        : 'This share link could not be read. Opened the starter project instead.',
    }
  }
  if (stored) return { project: stored, source: 'saved', error: null }
  return { project: starterProject(), source: 'starter', error: null }
}
