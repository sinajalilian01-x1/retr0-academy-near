import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import {
  bracketMatching,
  codeFolding,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { highlightSelectionMatches, openSearchPanel, searchKeymap, selectNextOccurrence } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
  tooltips,
} from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { browserCompletions } from './completions'
import { emmetKeymap } from './emmet'
import { syntaxOf, type Syntax, type ThemeName } from './types'

const darkHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.tagName, tags.controlKeyword], color: '#ff8ec4' },
  { tag: [tags.attributeName, tags.number, tags.atom, tags.bool, tags.null], color: '#ffd84a' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: '#bff8ff' },
  { tag: [tags.propertyName, tags.definition(tags.variableName)], color: '#6ff6ff' },
  { tag: [tags.function(tags.variableName), tags.className, tags.typeName], color: '#d7b4ff' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#b7b3d9', fontStyle: 'italic' },
  { tag: [tags.angleBracket, tags.punctuation, tags.meta, tags.operator], color: '#a9a4d6' },
  { tag: [tags.heading], color: '#ff8ec4', fontWeight: '700' },
  { tag: [tags.invalid], color: '#ffb0d4' },
])

const lightHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.function(tags.variableName), tags.className, tags.typeName], color: '#6e1fa8' },
  { tag: [tags.tagName, tags.heading], color: '#c2186a' },
  { tag: [tags.attributeName, tags.number, tags.atom, tags.bool, tags.null], color: '#7a5600' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp, tags.propertyName], color: '#0e7480' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#534e72', fontStyle: 'italic' },
  { tag: [tags.angleBracket, tags.punctuation, tags.meta, tags.operator], color: '#534e72' },
  { tag: [tags.invalid], color: '#a1144c' },
])

function languageFor(syntax: Syntax) {
  switch (syntax) {
    case 'html':
      return html({ autoCloseTags: true, matchClosingTags: true, selfClosingTags: true })
    case 'css':
      return css()
    case 'javascript':
      return javascript()
    case 'json':
      return json()
    case 'markdown':
      return markdown()
    default:
      return []
  }
}

function chromeTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--text)',
      },
      '.cm-scroller': {
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        lineHeight: '1.6',
        fontSize: 'var(--code-font)',
      },
      '.cm-content': { caretColor: 'var(--caret)', padding: '8px 0' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--caret)' },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--muted)',
        borderRight: '1px solid var(--border)',
      },
      '.cm-activeLine': { backgroundColor: 'var(--line)' },
      '.cm-activeLineGutter': { backgroundColor: 'var(--line)', color: 'var(--text)' },
      '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: 'var(--selection)',
      },
      '.cm-matchingBracket': {
        backgroundColor: 'var(--match)',
        outline: '1px solid var(--yellow)',
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--raised)',
        border: 'none',
        color: 'var(--muted)',
        borderRadius: '6px',
        padding: '0 6px',
      },
      '.cm-tooltip, .cm-tooltip-autocomplete': {
        backgroundColor: 'var(--card)',
        color: 'var(--text)',
        border: '1px solid var(--control-border)',
        borderRadius: '10px',
      },
    },
    { dark },
  )
}

export type EditorController = {
  view: EditorView
  setDoc: (filename: string, content: string, anchor?: number) => void
  getDoc: () => string
  filename: () => string
  syntax: () => Syntax
  focus: () => void
  refresh: () => void
  undo: () => void
  redo: () => void
  find: () => void
  replace: () => void
  selectNext: () => void
  setTheme: (theme: ThemeName) => void
  setWrap: (on: boolean) => void
  cursor: () => { line: number; col: number; offset: number }
}

export function createEditor(
  parent: HTMLElement,
  options: {
    filename: string
    content: string
    theme: ThemeName
    wrap: boolean
    onChange: (content: string) => void
    onCursor: (line: number, col: number) => void
  },
): EditorController {
  const langComp = new Compartment()
  const themeComp = new Compartment()
  const wrapComp = new Compartment()
  const labelComp = new Compartment()
  let applying = false
  let currentName = options.filename

  const reportCursor = (state: EditorState) => {
    const pos = state.selection.main.head
    const line = state.doc.lineAt(pos)
    options.onCursor(line.number, pos - line.from + 1)
  }

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        history(),
        codeFolding(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        tooltips({ parent: document.body }),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(2),
        indentUnit.of('  '),
        javascriptLanguage.data.of({ autocomplete: browserCompletions }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        emmetKeymap(() => syntaxOf(currentName)),
        langComp.of(languageFor(syntaxOf(currentName))),
        themeComp.of([chromeTheme(options.theme === 'dark'), syntaxHighlighting(options.theme === 'dark' ? darkHighlight : lightHighlight)]),
        wrapComp.of(options.wrap ? EditorView.lineWrapping : []),
        labelComp.of(EditorView.contentAttributes.of({ 'aria-label': `Code editor, ${currentName}`, spellcheck: 'false' })),
        EditorView.updateListener.of((update) => {
          if (applying) return
          if (update.docChanged) options.onChange(update.state.doc.toString())
          if (update.docChanged || update.selectionSet) reportCursor(update.state)
        }),
      ],
    }),
  })

  const setDoc = (filename: string, content: string, anchor = 0) => {
    currentName = filename
    const safe = Math.max(0, Math.min(anchor, content.length))
    applying = true
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
      selection: { anchor: safe },
      effects: [
        langComp.reconfigure(languageFor(syntaxOf(filename))),
        labelComp.reconfigure(EditorView.contentAttributes.of({ 'aria-label': `Code editor, ${filename}`, spellcheck: 'false' })),
      ],
    })
    applying = false
    reportCursor(view.state)
    view.requestMeasure()
  }

  const focusReplace = () => {
    requestAnimationFrame(() => {
      const field = view.dom.querySelector<HTMLInputElement>('input[name="replace"]')
      field?.focus()
      field?.select()
    })
  }

  return {
    view,
    setDoc,
    getDoc: () => view.state.doc.toString(),
    filename: () => currentName,
    syntax: () => syntaxOf(currentName),
    focus: () => view.focus(),
    refresh: () => view.requestMeasure(),
    undo: () => {
      undo(view)
    },
    redo: () => {
      redo(view)
    },
    find: () => openSearchPanel(view),
    replace: () => {
      openSearchPanel(view)
      focusReplace()
    },
    selectNext: () => {
      selectNextOccurrence(view)
    },
    setTheme: (theme) => {
      view.dispatch({
        effects: themeComp.reconfigure([
          chromeTheme(theme === 'dark'),
          syntaxHighlighting(theme === 'dark' ? darkHighlight : lightHighlight),
        ]),
      })
    },
    setWrap: (on) => {
      view.dispatch({ effects: wrapComp.reconfigure(on ? EditorView.lineWrapping : []) })
    },
    cursor: () => {
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      return { line: line.number, col: pos - line.from + 1, offset: pos }
    },
  }
}
