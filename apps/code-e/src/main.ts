import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-600.css'
import './styles.css'
import { downloadBlob, downloadProjectZip } from './download'
import { createEditor, type EditorController } from './editor'
import { formatCode } from './format'
import { bootProject, writeStorage } from './project'
import { ACADEMY_URL, nearStarterFiles } from './near-starter'
import { assembleDocument, runPreview, watchPreview } from './preview'
import { encodeShare, shareUrl } from './share'
import { starterFiles } from './starter'
import {
  extKind,
  extShort,
  languageLabel,
  paneFor,
  sortFiles,
  syntaxOf,
  validateFileName,
  type ConsoleLevel,
  type DeviceName,
  type Pane,
  type Project,
  type SharePayload,
  type ThemeName,
} from './types'

function must<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing #${id}`)
  return element as T
}

const app = must<HTMLElement>('app')
const filesBtn = must<HTMLButtonElement>('files-btn')
const explorer = must<HTMLElement>('explorer')
const backdrop = must<HTMLElement>('backdrop')
const fileTree = must<HTMLUListElement>('file-tree')
const tabs = must<HTMLElement>('tabs')
const editorHost = must<HTMLElement>('editor')
const editorEmpty = must<HTMLElement>('editor-empty')
const preview = must<HTMLIFrameElement>('preview')
const previewStage = must<HTMLElement>('preview-stage')
const formatBtn = must<HTMLButtonElement>('format-btn')
const shareBtn = must<HTMLButtonElement>('share-btn')
const autorun = must<HTMLInputElement>('autorun')
const themeMobile = must<HTMLButtonElement>('theme-mobile')
const themeDesktop = must<HTMLButtonElement>('theme-desktop')
const runBtn = must<HTMLButtonElement>('run-btn')
const copyBtn = must<HTMLButtonElement>('copy-btn')
const previewFull = must<HTMLButtonElement>('preview-full')
const consoleList = must<HTMLElement>('console-list')
const consoleEmpty = must<HTMLElement>('console-empty')
const problemsList = must<HTMLElement>('problems-list')
const problemsEmpty = must<HTMLElement>('problems-empty')
const outputList = must<HTMLElement>('output-list')
const outputEmpty = must<HTMLElement>('output-empty')
const problemsBadge = must<HTMLElement>('problems-badge')
const banner = must<HTMLElement>('banner')
const bannerText = must<HTMLElement>('banner-text')
const statusPos = must<HTMLElement>('status-pos')
const statusLang = must<HTMLElement>('status-lang')
const wrapToggle = must<HTMLButtonElement>('wrap-toggle')
const fontSizeLabel = must<HTMLElement>('font-size')
const peekText = must<HTMLElement>('peek-text')
const modalRoot = must<HTMLElement>('modal-root')
const toastEl = must<HTMLElement>('toast')
const segments = must<HTMLElement>('segments')
const menuTheme = must<HTMLButtonElement>('menu-theme')
const menuWrap = must<HTMLButtonElement>('menu-wrap')
const menuAutorun = must<HTMLButtonElement>('menu-autorun')

function bindViewportLock(): void {
  const root = document.documentElement
  const apply = () => {
    const viewport = window.visualViewport
    if (viewport) {
      root.style.setProperty('--app-height', `${Math.floor(viewport.height)}px`)
      root.style.setProperty('--app-top', `${viewport.offsetTop}px`)
    }
    if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0)
  }
  apply()
  window.visualViewport?.addEventListener('resize', apply)
  window.visualViewport?.addEventListener('scroll', apply)
  window.addEventListener('resize', apply)
}

bindViewportLock()

const boot = bootProject()
const project: Project = boot.project
const cursors: Record<string, number> = {}
const logs: { level: ConsoleLevel; text: string }[] = []
const output: string[] = []
let activeRun = 0
let saveTimer = 0
let runTimer = 0
let toastTimer = 0
let warnedQuota = false
let formatting = false
let editor: EditorController

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function payload(): SharePayload {
  return {
    html: project.files.find((file) => file.name === 'index.html')?.content ?? '',
    css: project.files.find((file) => file.name === 'style.css')?.content ?? '',
    js: project.files.find((file) => file.name === 'script.js')?.content ?? '',
  }
}

function flushEditor(): void {
  const file = project.files.find((item) => item.name === editor.filename())
  if (file) file.content = editor.getDoc()
}

function persist(immediate = false): void {
  const save = () => {
    flushEditor()
    if (!writeStorage(project) && !warnedQuota) {
      warnedQuota = true
      showBanner('This browser could not save the project. It stays until you reload.')
    }
  }
  window.clearTimeout(saveTimer)
  if (immediate) save()
  else saveTimer = window.setTimeout(save, 200)
}

function toast(message: string): void {
  toastEl.textContent = message
  toastEl.dataset.show = 'true'
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    delete toastEl.dataset.show
  }, 2400)
}

function showBanner(message: string): void {
  bannerText.textContent = message
  banner.hidden = false
}

function outputPush(text: string): void {
  const now = new Date()
  const stamp = [now.getHours(), now.getMinutes(), now.getSeconds()].map((part) => String(part).padStart(2, '0')).join(':')
  output.unshift(`${stamp}  ${text}`)
  if (output.length > 100) output.pop()
  renderOutput()
}

function layoutVars(): void {
  const root = document.documentElement
  const settings = project.settings
  root.style.setProperty('--sidebar-w', `${settings.sidebarWidth}px`)
  root.style.setProperty('--right-w', `${settings.rightWidth}px`)
  root.style.setProperty('--console-h', `${settings.consoleHeight}px`)
  root.style.setProperty('--code-font', `${settings.fontSize}px`)
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d0b1a' : '#f4f2fb')
  const action = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  const current = theme === 'dark' ? 'Dark' : 'Light'
  for (const button of [themeDesktop, themeMobile]) {
    button.setAttribute('aria-label', action)
    button.title = action
  }
  const label = themeDesktop.querySelector('.theme-label')
  if (label) label.textContent = current
  menuTheme.textContent = action
  menuTheme.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false')
}

function syncChrome(): void {
  const settings = project.settings
  autorun.checked = settings.autoRun
  menuAutorun.setAttribute('aria-checked', settings.autoRun ? 'true' : 'false')
  wrapToggle.setAttribute('aria-pressed', settings.wordWrap ? 'true' : 'false')
  menuWrap.setAttribute('aria-checked', settings.wordWrap ? 'true' : 'false')
  fontSizeLabel.textContent = `${settings.fontSize}px`
  statusLang.textContent = languageLabel(syntaxOf(project.active || 'index.html'))
  previewStage.dataset.device = settings.device
  document.querySelectorAll<HTMLButtonElement>('.device-toggle [data-device]').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.device === settings.device ? 'true' : 'false')
  })
  document.querySelectorAll<HTMLButtonElement>('[data-action^="device-"]').forEach((button) => {
    const device = button.dataset.action?.replace('device-', '')
    button.setAttribute('aria-checked', device === settings.device ? 'true' : 'false')
  })
  const sidebar = must<HTMLElement>('splitter-sidebar')
  const right = must<HTMLElement>('splitter-right')
  const consoleSplit = must<HTMLElement>('splitter-console')
  sidebar.setAttribute('aria-valuenow', String(settings.sidebarWidth))
  right.setAttribute('aria-valuenow', String(settings.rightWidth))
  consoleSplit.setAttribute('aria-valuenow', String(settings.consoleHeight))
  layoutVars()
}

function renderTree(): void {
  fileTree.replaceChildren()
  for (const file of project.files) {
    const item = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'file'
    button.setAttribute('aria-label', file.name)
    if (file.name === project.active) button.setAttribute('aria-current', 'true')
    const ext = document.createElement('span')
    ext.className = 'ext'
    ext.dataset.kind = extKind(file.name)
    ext.setAttribute('aria-hidden', 'true')
    ext.textContent = extShort(file.name)
    const label = document.createElement('span')
    label.textContent = file.name
    button.append(ext, label)
    button.addEventListener('click', () => {
      activate(file.name)
      if (window.matchMedia('(max-width: 860px)').matches) setDrawer(false)
    })
    item.append(button)
    fileTree.append(item)
  }
}

function renderTabs(): void {
  tabs.replaceChildren()
  const open = project.open.filter((name) => project.files.some((file) => file.name === name))
  project.open = open
  editorEmpty.hidden = open.length > 0
  editorHost.hidden = open.length === 0
  for (const name of open) {
    const tab = document.createElement('div')
    tab.className = 'tab'
    tab.dataset.name = name
    tab.setAttribute('role', 'tab')
    tab.tabIndex = name === project.active ? 0 : -1
    tab.setAttribute('aria-selected', name === project.active ? 'true' : 'false')
    const ext = document.createElement('span')
    ext.className = 'ext'
    ext.dataset.kind = extKind(name)
    ext.setAttribute('aria-hidden', 'true')
    ext.textContent = extShort(name)
    const label = document.createElement('span')
    label.className = 'tab-label'
    label.textContent = name
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'tab-close'
    close.tabIndex = -1
    close.setAttribute('aria-label', `Close ${name}`)
    close.textContent = '×'
    tab.append(ext, label, close)
    tabs.append(tab)
  }
}

function renderLogs(): void {
  fillList(consoleList, logs)
  consoleEmpty.hidden = logs.length > 0
  const problems = logs.filter((item) => item.level === 'error')
  fillList(problemsList, problems)
  problemsEmpty.hidden = problems.length > 0
  problemsBadge.hidden = problems.length === 0
  problemsBadge.textContent = String(problems.length)
  const last = logs[logs.length - 1]
  peekText.textContent = last ? `${last.level === 'log' ? '' : `${last.level} `}${last.text}`.replace(/\s+/g, ' ').slice(0, 90) : 'Ready'
}

function renderOutput(): void {
  outputList.replaceChildren()
  for (const line of output) {
    const row = document.createElement('div')
    row.className = 'entry'
    const msg = document.createElement('span')
    msg.className = 'msg'
    msg.textContent = line
    row.append(msg)
    outputList.append(row)
  }
  outputEmpty.hidden = output.length > 0
}

function fillList(container: HTMLElement, items: { level: ConsoleLevel; text: string }[]): void {
  container.replaceChildren()
  for (const item of items) {
    const row = document.createElement('div')
    row.className = 'entry'
    row.dataset.level = item.level
    const level = document.createElement('span')
    level.className = 'lvl'
    level.textContent = item.level
    const msg = document.createElement('span')
    msg.className = 'msg'
    msg.textContent = item.text
    row.append(level, msg)
    container.append(row)
  }
}

function updateSegments(): void {
  segments.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.pane === app.dataset.pane
    tab.setAttribute('aria-selected', selected ? 'true' : 'false')
    tab.tabIndex = selected ? 0 : -1
  })
}

function setPane(pane: Pane): void {
  if (pane === 'html' || pane === 'css' || pane === 'js') {
    activate(pane === 'html' ? 'index.html' : pane === 'css' ? 'style.css' : 'script.js')
    return
  }
  app.dataset.pane = pane
  updateSegments()
  editor.refresh()
}

function focusMobile(name: string): void {
  if (!window.matchMedia('(max-width: 860px)').matches) return
  app.dataset.pane = paneFor(name) ?? 'file'
  updateSegments()
  editor.refresh()
}

function activate(name: string): void {
  if (!project.files.some((file) => file.name === name)) {
    project.files.push({ name, content: '' })
    project.files = sortFiles(project.files)
  }
  if (!project.open.includes(name)) project.open.push(name)
  if (project.active && project.active !== name) cursors[project.active] = editor.cursor().offset
  const same = project.active === name && editor.filename() === name
  project.active = name
  if (!same) {
    const file = project.files.find((item) => item.name === name)!
    editor.setDoc(name, file.content, cursors[name] ?? file.content.length)
  }
  renderTabs()
  renderTree()
  syncChrome()
  focusMobile(name)
  persist()
}

function closeTab(name: string): void {
  if (project.active === name) cursors[name] = editor.cursor().offset
  project.open = project.open.filter((item) => item !== name)
  if (project.active === name) {
    project.active = project.open.at(-1) ?? ''
    if (project.active) {
      const file = project.files.find((item) => item.name === project.active)!
      editor.setDoc(project.active, file.content, cursors[project.active] ?? 0)
    }
  }
  renderTabs()
  renderTree()
  syncChrome()
  persist()
}

function setDrawer(open: boolean): void {
  explorer.dataset.open = open ? 'true' : 'false'
  filesBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
  backdrop.hidden = !open
  if (open) fileTree.querySelector('button')?.focus()
}

function setTool(name: 'console' | 'problems' | 'output'): void {
  for (const id of ['console', 'problems', 'output'] as const) {
    const panel = must<HTMLElement>(`panel-${id}`)
    const tab = must<HTMLButtonElement>(`tab-${id}`)
    const selected = id === name
    panel.hidden = !selected
    tab.setAttribute('aria-selected', selected ? 'true' : 'false')
    tab.tabIndex = selected ? 0 : -1
  }
  if (window.matchMedia('(max-width: 860px)').matches) {
    app.dataset.pane = 'console'
    updateSegments()
  }
}

function run(reason: 'manual' | 'auto' | 'load'): void {
  window.clearTimeout(runTimer)
  flushEditor()
  logs.length = 0
  renderLogs()
  activeRun = runPreview(preview, project.files)
  if (reason === 'manual') outputPush('Ran the preview.')
  if (reason === 'load' && boot.source === 'import') outputPush('Loaded a shared project.')
  else if (reason === 'load' && boot.source === 'saved') outputPush('Restored your saved project.')
  else if (reason === 'load') outputPush('Opened the starter project.')
}

function scheduleRun(): void {
  if (!project.settings.autoRun) return
  window.clearTimeout(runTimer)
  runTimer = window.setTimeout(() => run('auto'), 500)
}

async function formatActive(): Promise<void> {
  if (formatting) return
  const syntax = editor.syntax()
  if (syntax === 'text') {
    toast('This file does not have a formatter.')
    return
  }
  formatting = true
  formatBtn.setAttribute('aria-busy', 'true')
  try {
    const next = await formatCode(syntax, editor.getDoc())
    const file = project.files.find((item) => item.name === editor.filename())
    if (file) file.content = next
    const cursor = editor.cursor().offset
    editor.setDoc(editor.filename(), next, Math.min(cursor, next.length))
    persist()
    scheduleRun()
    outputPush(`Formatted ${editor.filename()}.`)
    toast(`Formatted ${editor.filename()}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not format this file.'
    outputPush(`Format failed. ${message}`)
    showBanner(message)
  } finally {
    formatting = false
    formatBtn.removeAttribute('aria-busy')
  }
}

async function copyText(text: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast(message)
  } catch {
    toast('Clipboard is blocked in this browser.')
  }
}

function downloadHtml(): void {
  flushEditor()
  const html = assembleDocument(project.files, {})
  downloadBlob('index.html', new Blob([html], { type: 'text/html;charset=utf-8' }))
  outputPush('Downloaded index.html.')
  toast('Downloaded index.html')
}

function downloadZip(): void {
  flushEditor()
  downloadProjectZip(project.files)
  outputPush('Downloaded Code E.zip.')
  toast('Downloaded Code E.zip')
}

function showDialog(options: {
  title: string
  description?: string
  fields?: { name: string; label: string; value?: string }[]
  confirmLabel: string
  cancelLabel?: string
  validate?: (values: Record<string, string>) => string | null
}): Promise<Record<string, string> | null> {
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  modalRoot.replaceChildren()
  app.inert = true
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: Record<string, string> | null) => {
      if (settled) return
      settled = true
      document.removeEventListener('keydown', onKey, true)
      modalRoot.replaceChildren()
      app.inert = false
      resolve(value)
      previouslyFocused?.focus()
    }
    const backdropEl = document.createElement('div')
    backdropEl.className = 'modal-backdrop'
    backdropEl.addEventListener('pointerdown', (event) => {
      if (event.target === backdropEl) finish(null)
    })
    const panel = document.createElement('div')
    panel.className = 'modal'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.setAttribute('aria-labelledby', 'dialog-title')
    const title = document.createElement('h2')
    title.id = 'dialog-title'
    title.textContent = options.title
    panel.append(title)
    if (options.description) {
      const copy = document.createElement('p')
      copy.className = 'modal-copy'
      copy.textContent = options.description
      panel.append(copy)
    }
    const form = document.createElement('form')
    const inputs: Record<string, HTMLInputElement> = {}
    for (const field of options.fields ?? []) {
      const label = document.createElement('label')
      label.className = 'field'
      const span = document.createElement('span')
      span.textContent = field.label
      const input = document.createElement('input')
      input.name = field.name
      input.value = field.value ?? ''
      input.autocomplete = 'off'
      input.spellcheck = false
      label.append(span, input)
      form.append(label)
      inputs[field.name] = input
    }
    const error = document.createElement('p')
    error.className = 'form-error'
    error.setAttribute('role', 'alert')
    const actions = document.createElement('div')
    actions.className = 'modal-actions'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'ghost'
    cancel.textContent = options.cancelLabel ?? 'Cancel'
    cancel.addEventListener('click', () => finish(null))
    const confirm = document.createElement('button')
    confirm.type = 'submit'
    confirm.className = 'primary'
    confirm.textContent = options.confirmLabel
    actions.append(cancel, confirm)
    form.append(error, actions)
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      const result: Record<string, string> = {}
      for (const [name, input] of Object.entries(inputs)) result[name] = input.value
      const message = options.validate?.(result) ?? null
      error.textContent = message ?? ''
      if (!message) finish(result)
    })
    panel.append(form)
    backdropEl.append(panel)
    modalRoot.append(backdropEl)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish(null)
        return
      }
      if (event.key !== 'Tab') return
      const items = [...panel.querySelectorAll<HTMLElement>('button, input')]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    const firstInput = panel.querySelector('input')
    if (firstInput) {
      firstInput.focus()
      firstInput.select()
    } else confirm.focus()
  })
}

async function newFile(): Promise<void> {
  const result = await showDialog({
    title: 'New file',
    description: 'Add a file to this project. Try notes.txt, extra.css, or helper.js.',
    fields: [{ name: 'name', label: 'File name' }],
    confirmLabel: 'Create',
    validate: (values) => validateFileName(values.name ?? '', project.files),
  })
  if (!result) return
  const name = result.name.trim()
  project.files = sortFiles([...project.files, { name, content: '' }])
  activate(name)
  outputPush(`Added ${name}.`)
  persist(true)
}

async function renameFile(): Promise<void> {
  const current = project.active
  if (!current) return
  const result = await showDialog({
    title: 'Rename file',
    fields: [{ name: 'name', label: 'File name', value: current }],
    confirmLabel: 'Rename file',
    validate: (values) => validateFileName(values.name ?? '', project.files, current),
  })
  if (!result) return
  const name = result.name.trim()
  if (name === current) return
  const file = project.files.find((item) => item.name === current)
  if (!file) return
  file.name = name
  project.files = sortFiles(project.files)
  project.open = project.open.map((item) => (item === current ? name : item))
  if (project.active === current) project.active = name
  cursors[name] = cursors[current] ?? 0
  delete cursors[current]
  editor.setDoc(name, file.content, cursors[name] ?? 0)
  renderTabs()
  renderTree()
  syncChrome()
  outputPush(`Renamed ${current} to ${name}.`)
  persist(true)
}

async function deleteFile(): Promise<void> {
  const current = project.active
  if (!current) return
  if (project.files.length <= 1) {
    showBanner('Keep at least one file in the project.')
    return
  }
  const result = await showDialog({
    title: `Delete ${current}?`,
    description: 'This removes the file from the project saved in this browser.',
    confirmLabel: 'Delete file',
  })
  if (!result) return
  project.files = project.files.filter((file) => file.name !== current)
  project.open = project.open.filter((name) => name !== current)
  delete cursors[current]
  project.active = project.open[0] ?? project.files[0]?.name ?? ''
  if (project.active && !project.open.includes(project.active)) project.open.push(project.active)
  if (project.active) {
    const file = project.files.find((item) => item.name === project.active)!
    editor.setDoc(project.active, file.content, 0)
  }
  renderTabs()
  renderTree()
  syncChrome()
  outputPush(`Deleted ${current}.`)
  persist(true)
  scheduleRun()
}

async function resetProject(): Promise<void> {
  const result = await showDialog({
    title: 'Reset project?',
    description: 'Replace your files with the starter HTML, CSS, and JavaScript. Theme and editor settings stay as they are.',
    confirmLabel: 'Reset project',
  })
  if (!result) return
  const fresh = starterFiles()
  project.files = fresh
  project.open = fresh.map((file) => file.name)
  project.active = 'index.html'
  for (const key of Object.keys(cursors)) delete cursors[key]
  editor.setDoc('index.html', fresh[0]?.content ?? '', 0)
  renderTabs()
  renderTree()
  syncChrome()
  logs.length = 0
  run('manual')
  outputPush('Reset to the starter project.')
  persist(true)
  toast('Project reset')
}

async function loadNearStarter(): Promise<void> {
  const result = await showDialog({
    title: 'Open the NEAR starter?',
    description: 'Replace your files with a NEAR testnet starter: connect an account and call the Retr0 Academy diploma contract with a view call.',
    confirmLabel: 'Open NEAR starter',
  })
  if (!result) return
  const fresh = nearStarterFiles()
  project.files = fresh
  project.open = fresh.map((file) => file.name)
  project.active = 'script.js'
  for (const key of Object.keys(cursors)) delete cursors[key]
  editor.setDoc('script.js', fresh.find((file) => file.name === 'script.js')?.content ?? '', 0)
  renderTabs()
  renderTree()
  syncChrome()
  logs.length = 0
  run('manual')
  outputPush('Loaded the NEAR starter.')
  persist(true)
  toast('NEAR starter loaded')
}

function showShare(): void {
  flushEditor()
  const url = shareUrl(payload())
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  modalRoot.replaceChildren()
  app.inert = true
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
  }
  const close = () => {
    document.removeEventListener('keydown', onKey, true)
    modalRoot.replaceChildren()
    app.inert = false
    previouslyFocused?.focus()
  }
  const backdropEl = document.createElement('div')
  backdropEl.className = 'modal-backdrop'
  backdropEl.addEventListener('pointerdown', (event) => {
    if (event.target === backdropEl) close()
  })
  const panel = document.createElement('div')
  panel.className = 'modal'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'share-title')
  const title = document.createElement('h2')
  title.id = 'share-title'
  title.textContent = 'Share'
  const copy = document.createElement('p')
  copy.className = 'modal-copy'
  copy.textContent = 'Anyone with this link opens your HTML, CSS, and JavaScript. Other files stay in this browser.'
  const input = document.createElement('input')
  input.className = 'share-url'
  input.readOnly = true
  input.value = url
  input.setAttribute('aria-label', 'Share link')
  input.dataset.testid = 'share-url'
  const actions = document.createElement('div')
  actions.className = 'share-actions'
  const add = (label: string, action: () => void, primary = false) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = primary ? 'primary' : 'ghost'
    button.textContent = label
    button.addEventListener('click', action)
    actions.append(button)
  }
  add('Copy link', () => {
    void copyText(url, 'Link copied')
    input.select()
  }, true)
  add('Download HTML', downloadHtml)
  add('Download ZIP', downloadZip)
  add('Copy code', () => {
    flushEditor()
    void copyText(editor.getDoc(), `Copied ${editor.filename()}`)
  })
  add('Close', close)
  panel.append(title, copy, input, actions)
  backdropEl.append(panel)
  modalRoot.append(backdropEl)
  input.focus()
  input.select()
  document.addEventListener('keydown', onKey, true)
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
    return
  }
  try {
    await app.requestFullscreen()
  } catch {
    app.classList.toggle('is-fullscreen')
    syncFullscreen()
  }
}

function syncFullscreen(): void {
  const on = Boolean(document.fullscreenElement) || app.classList.contains('is-fullscreen')
  const label = on ? 'Exit fullscreen' : 'Fullscreen'
  for (const id of ['preview-full', 'dock-full']) {
    const button = must<HTMLButtonElement>(id)
    button.setAttribute('aria-pressed', on ? 'true' : 'false')
    button.setAttribute('aria-label', label)
    button.title = label
  }
}

function closeMenus(): void {
  document.querySelectorAll<HTMLElement>('.menu-pop').forEach((pop) => pop.setAttribute('hidden', ''))
  document.querySelectorAll<HTMLButtonElement>('.menu-trigger').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'))
}

function openMenu(trigger: HTMLButtonElement): void {
  const pop = document.getElementById(trigger.getAttribute('aria-controls') ?? '')
  if (!pop) return
  const wasOpen = !pop.hasAttribute('hidden')
  closeMenus()
  if (wasOpen) return
  pop.removeAttribute('hidden')
  trigger.setAttribute('aria-expanded', 'true')
  pop.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()
}

function changeFont(delta: number): void {
  project.settings.fontSize = clamp(project.settings.fontSize + delta, 12, 22)
  syncChrome()
  editor.refresh()
  persist()
}

function setDevice(device: DeviceName): void {
  project.settings.device = device
  syncChrome()
  persist()
}

function toggleTheme(): void {
  project.settings.theme = project.settings.theme === 'dark' ? 'light' : 'dark'
  applyTheme(project.settings.theme)
  editor.setTheme(project.settings.theme)
  persist()
}

function toggleWrap(): void {
  project.settings.wordWrap = !project.settings.wordWrap
  editor.setWrap(project.settings.wordWrap)
  syncChrome()
  persist()
}

async function handleAction(action: string | undefined): Promise<void> {
  switch (action) {
    case 'new-file':
      await newFile()
      break
    case 'rename-file':
      await renameFile()
      break
    case 'delete-file':
      await deleteFile()
      break
    case 'download-html':
      downloadHtml()
      break
    case 'download-zip':
      downloadZip()
      break
    case 'share':
      showShare()
      break
    case 'reset':
      await resetProject()
      break
    case 'near-starter':
      await loadNearStarter()
      break
    case 'undo':
      editor.undo()
      break
    case 'redo':
      editor.redo()
      break
    case 'find':
      editor.find()
      break
    case 'replace':
      editor.replace()
      break
    case 'next-cursor':
      editor.selectNext()
      break
    case 'format':
      await formatActive()
      break
    case 'copy':
      flushEditor()
      await copyText(editor.getDoc(), `Copied ${editor.filename()}`)
      break
    case 'theme':
      toggleTheme()
      break
    case 'wrap':
      toggleWrap()
      break
    case 'font-inc':
      changeFont(1)
      break
    case 'font-dec':
      changeFont(-1)
      break
    case 'device-mobile':
      setDevice('mobile')
      break
    case 'device-desktop':
      setDevice('desktop')
      break
    case 'fullscreen':
      await toggleFullscreen()
      break
    case 'focus-console':
      setTool('console')
      break
    case 'run':
      run('manual')
      break
    case 'autorun':
      project.settings.autoRun = !project.settings.autoRun
      syncChrome()
      persist()
      if (project.settings.autoRun) run('auto')
      break
    default:
      break
  }
}

function bindSplitter(element: HTMLElement, kind: 'sidebar' | 'right' | 'console'): void {
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || window.matchMedia('(max-width: 860px)').matches) return
    event.preventDefault()
    element.setPointerCapture(event.pointerId)
    document.body.classList.add('resizing', kind === 'console' ? 'row-resize' : 'col-resize')
    const start = kind === 'sidebar' ? project.settings.sidebarWidth : kind === 'right' ? project.settings.rightWidth : project.settings.consoleHeight
    const origin = kind === 'console' ? event.clientY : event.clientX
    const move = (ev: PointerEvent) => {
      const delta = (kind === 'console' ? ev.clientY : ev.clientX) - origin
      if (kind === 'sidebar') project.settings.sidebarWidth = clamp(start + delta, 180, 420)
      if (kind === 'right') project.settings.rightWidth = clamp(start - delta, 280, 760)
      if (kind === 'console') project.settings.consoleHeight = clamp(start - delta, 96, 420)
      syncChrome()
    }
    const up = () => {
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      document.body.classList.remove('resizing', 'row-resize', 'col-resize')
      editor.refresh()
      persist()
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
  })
  element.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 32 : 16
    const grow = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    const shrink = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
    if (!grow && !shrink) return
    event.preventDefault()
    const sign = grow ? 1 : -1
    if (kind === 'sidebar') project.settings.sidebarWidth = clamp(project.settings.sidebarWidth + sign * step, 180, 420)
    if (kind === 'right') project.settings.rightWidth = clamp(project.settings.rightWidth + (event.key.includes('Left') || event.key === 'ArrowUp' ? step : -step), 280, 760)
    if (kind === 'console') project.settings.consoleHeight = clamp(project.settings.consoleHeight + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0), 96, 420)
    syncChrome()
    persist()
  })
}

function bind(): void {
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'
  document.querySelectorAll<HTMLElement>('[data-shortcut]').forEach((hint) => {
    hint.textContent = (hint.dataset.shortcut ?? '').replaceAll('Mod', mod)
  })
  document.querySelectorAll<HTMLButtonElement>('.menu-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => openMenu(trigger))
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openMenu(trigger)
      }
    })
  })
  document.querySelectorAll<HTMLElement>('.menu-pop').forEach((pop) => {
    pop.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
      if (!button) return
      closeMenus()
      void handleAction(button.dataset.action)
    })
    pop.addEventListener('keydown', (event) => {
      const items = [...pop.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')]
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'Escape') {
        event.preventDefault()
        const trigger = document.querySelector<HTMLButtonElement>(`[aria-controls="${pop.id}"]`)
        closeMenus()
        trigger?.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const next = items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1) + items.length) % items.length]
        next?.focus()
      }
    })
  })
  document.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element) || event.target.closest('.menu')) return
    closeMenus()
  })
  filesBtn.addEventListener('click', () => setDrawer(explorer.dataset.open !== 'true'))
  backdrop.addEventListener('click', () => setDrawer(false))
  must<HTMLButtonElement>('new-file').addEventListener('click', () => void newFile())
  must<HTMLButtonElement>('rename-file').addEventListener('click', () => void renameFile())
  must<HTMLButtonElement>('delete-file').addEventListener('click', () => void deleteFile())
  formatBtn.addEventListener('click', () => void formatActive())
  shareBtn.addEventListener('click', showShare)
  runBtn.addEventListener('click', () => run('manual'))
  copyBtn.addEventListener('click', () => {
    flushEditor()
    void copyText(editor.getDoc(), `Copied ${editor.filename()}`)
  })
  themeDesktop.addEventListener('click', toggleTheme)
  themeMobile.addEventListener('click', toggleTheme)
  wrapToggle.addEventListener('click', toggleWrap)
  must<HTMLButtonElement>('font-inc').addEventListener('click', () => changeFont(1))
  must<HTMLButtonElement>('font-dec').addEventListener('click', () => changeFont(-1))
  previewFull.addEventListener('click', () => void toggleFullscreen())
  must<HTMLButtonElement>('dock-share').addEventListener('click', showShare)
  must<HTMLButtonElement>('dock-full').addEventListener('click', () => void toggleFullscreen())
  must<HTMLButtonElement>('dock-console').addEventListener('click', () => setPane('console'))
  must<HTMLButtonElement>('dock-reset').addEventListener('click', () => void resetProject())
  document.querySelectorAll<HTMLButtonElement>('.top-actions [data-action="near-starter"]').forEach((button) => {
    button.addEventListener('click', () => void loadNearStarter())
  })
  // A share link or template link opened while Code E is already loaded only changes the hash: reboot to import it.
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#code=') || location.hash === '#template=near') location.reload()
  })
  const academyLink = document.getElementById('academy-link')
  if (academyLink instanceof HTMLAnchorElement) academyLink.href = `${ACADEMY_URL}/near`
  must<HTMLButtonElement>('console-peek').addEventListener('click', () => setPane('console'))
  must<HTMLButtonElement>('ask-tutor').addEventListener('click', () => {
    flushEditor()
    const err = logs
      .filter((item) => item.level === 'error')
      .slice(-3)
      .map((item) => item.text)
      .join('\n')
      .slice(0, 600)
    const query = `tutor=explain${err ? `&err=${encodeURIComponent(err)}` : ''}`
    window.open(`${ACADEMY_URL}/playground?${query}#code=${encodeShare(payload())}`, '_blank', 'noopener')
  })
  must<HTMLButtonElement>('clear-console').addEventListener('click', () => {
    logs.length = 0
    renderLogs()
  })
  must<HTMLButtonElement>('banner-dismiss').addEventListener('click', () => {
    banner.hidden = true
  })
  autorun.addEventListener('change', () => {
    project.settings.autoRun = autorun.checked
    syncChrome()
    persist()
    if (autorun.checked) run('auto')
  })
  document.querySelectorAll<HTMLButtonElement>('.device-toggle [data-device]').forEach((button) => {
    button.addEventListener('click', () => setDevice(button.dataset.device as DeviceName))
  })
  segments.addEventListener('click', (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-pane]')
    if (!tab?.dataset.pane) return
    setPane(tab.dataset.pane as Pane)
  })
  for (const id of ['console', 'problems', 'output'] as const) {
    must<HTMLButtonElement>(`tab-${id}`).addEventListener('click', () => setTool(id))
  }
  tabs.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const tab = target.closest<HTMLElement>('.tab')
    if (!tab?.dataset.name) return
    if (target.closest('.tab-close')) closeTab(tab.dataset.name)
    else activate(tab.dataset.name)
  })
  document.querySelector('.skip')?.addEventListener('click', (event) => {
    event.preventDefault()
    editor.focus()
  })
  document.addEventListener('keydown', (event) => {
    if (modalRoot.childElementCount) return
    const modKey = event.metaKey || event.ctrlKey
    if (modKey && event.key === 'Enter') {
      event.preventDefault()
      run('manual')
    } else if (modKey && event.key.toLowerCase() === 's') {
      event.preventDefault()
      persist(true)
      toast('Saved')
    } else if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'f') {
      event.preventDefault()
      void formatActive()
    } else if (event.key === 'Escape') {
      closeMenus()
      if (explorer.dataset.open === 'true') setDrawer(false)
    }
  })
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) app.classList.remove('is-fullscreen')
    syncFullscreen()
  })
  window.addEventListener('resize', () => editor.refresh())
  window.addEventListener('pagehide', () => {
    flushEditor()
    writeStorage(project)
  })
  bindSplitter(must('splitter-sidebar'), 'sidebar')
  bindSplitter(must('splitter-right'), 'right')
  bindSplitter(must('splitter-console'), 'console')
}

applyTheme(project.settings.theme)
layoutVars()
autorun.checked = project.settings.autoRun
editor = createEditor(editorHost, {
  filename: project.active,
  content: project.files.find((file) => file.name === project.active)?.content ?? '',
  theme: project.settings.theme,
  wrap: project.settings.wordWrap,
  onChange: (content) => {
    const file = project.files.find((item) => item.name === editor.filename())
    if (file) file.content = content
    persist()
    scheduleRun()
  },
  onCursor: (line, col) => {
    statusPos.textContent = `Ln ${line}, Col ${col}`
  },
})
bind()
renderTabs()
renderTree()
syncChrome()
if (window.matchMedia('(max-width: 860px)').matches) {
  app.dataset.pane = paneFor(project.active) ?? 'file'
  updateSegments()
}
const cursor = editor.cursor()
statusPos.textContent = `Ln ${cursor.line}, Col ${cursor.col}`
watchPreview(preview, () => activeRun, (level, text) => {
  logs.push({ level, text })
  if (logs.length > 200) logs.shift()
  renderLogs()
})
if (boot.error) showBanner(boot.error)
run('load')
persist(true)

if (import.meta.env.PROD && 'serviceWorker' in navigator && !new URLSearchParams(location.search).has('nosw')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Tests can block service workers. The app still runs. */
    })
  })
}
