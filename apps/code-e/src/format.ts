import type { Plugin } from 'prettier'
import type { Syntax } from './types'

type PrettierPlugin = { parsers?: unknown; default?: unknown }

function pluginOf(mod: unknown): PrettierPlugin {
  if (mod && typeof mod === 'object' && 'parsers' in mod) return mod as PrettierPlugin
  if (mod && typeof mod === 'object' && 'default' in mod) {
    const inner = (mod as { default: unknown }).default
    if (inner && typeof inner === 'object') return inner as PrettierPlugin
  }
  return mod as PrettierPlugin
}

async function pluginsFor(syntax: Syntax): Promise<{ parser: string; plugins: unknown[] } | null> {
  switch (syntax) {
    case 'html':
      return { parser: 'html', plugins: [pluginOf(await import('prettier/plugins/html'))] }
    case 'css':
      return { parser: 'css', plugins: [pluginOf(await import('prettier/plugins/postcss'))] }
    case 'javascript':
      return {
        parser: 'babel',
        plugins: [pluginOf(await import('prettier/plugins/babel')), pluginOf(await import('prettier/plugins/estree'))],
      }
    case 'json':
      return {
        parser: 'json',
        plugins: [pluginOf(await import('prettier/plugins/babel')), pluginOf(await import('prettier/plugins/estree'))],
      }
    case 'markdown':
      return { parser: 'markdown', plugins: [pluginOf(await import('prettier/plugins/markdown'))] }
    default:
      return null
  }
}

export async function formatCode(syntax: Syntax, code: string): Promise<string> {
  const target = await pluginsFor(syntax)
  if (!target) throw new Error('Prettier does not format this file type.')
  const prettier = await import('prettier/standalone')
  const plugins = target.plugins
  return prettier.format(code, {
    parser: target.parser,
    plugins: plugins as Plugin[],
    printWidth: 80,
    tabWidth: 2,
    singleQuote: false,
    htmlWhitespaceSensitivity: 'css',
  })
}
