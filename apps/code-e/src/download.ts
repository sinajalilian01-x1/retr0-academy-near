import { strToU8, zipSync } from 'fflate'
import type { ProjectFile } from './types'

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadProjectZip(files: ProjectFile[]): void {
  const entries: Record<string, Uint8Array> = {}
  for (const file of files) entries[file.name] = strToU8(file.content)
  const zipped = zipSync(entries, { level: 6 })
  downloadBlob('Code E.zip', new Blob([zipped], { type: 'application/zip' }))
}
