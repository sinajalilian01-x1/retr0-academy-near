import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { SharePayload } from './types'

export function encodeShare(payload: SharePayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

export function shareUrl(payload: SharePayload): string {
  return `${location.origin}${location.pathname}${location.search}#code=${encodeShare(payload)}`
}

function asPayload(value: unknown): SharePayload | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.html !== 'string' || typeof record.css !== 'string' || typeof record.js !== 'string') {
    return null
  }
  return { html: record.html, css: record.css, js: record.js }
}

function tryDecode(encoded: string): SharePayload | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return asPayload(JSON.parse(json))
  } catch {
    return null
  }
}

export function decodeShare(encoded: string): SharePayload | null {
  const candidates = [encoded, encoded.replace(/ /g, '+')]
  try {
    candidates.push(decodeURIComponent(encoded))
  } catch {
    /* The fragment was not percent-encoded. */
  }
  for (const candidate of candidates) {
    const payload = tryDecode(candidate)
    if (payload) return payload
  }
  return null
}

export function clearCodeHash(): void {
  history.replaceState(null, '', location.pathname + location.search)
}
