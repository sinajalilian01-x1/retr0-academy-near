import "server-only";

import { getCache } from "@vercel/functions";

/**
 * Sliding-window rate limiter and small shared state (used exam nonces, cooldowns).
 * Backed by the Vercel Runtime Cache, so limits are shared by every function instance in a region;
 * falls back to process memory when the cache is unavailable (local dev).
 */
const memory = new Map<string, { value: unknown; exp: number }>();

function cache() {
  try {
    return getCache({ namespace: "r0" });
  } catch {
    return null;
  }
}

/** Never let a slow cache call hold a request: give up after `ms` and fall back to memory. */
function withTimeout<T>(p: Promise<T>, ms = 1200): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("cache timeout")), ms).unref?.())]);
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const c = cache();
  if (c) {
    try {
      return (await withTimeout(c.get(key))) as T | undefined;
    } catch {
      // fall through to memory
    }
  }
  const hit = memory.get(key);
  return hit && hit.exp > Date.now() ? (hit.value as T) : undefined;
}

export async function kvSet(key: string, value: unknown, ttlSec: number) {
  memory.set(key, { value, exp: Date.now() + ttlSec * 1000 });
  if (memory.size > 5000) for (const [k, v] of memory) if (v.exp < Date.now()) memory.delete(k);
  const c = cache();
  if (c) {
    try {
      await withTimeout(c.set(key, value, { ttl: Math.max(1, Math.ceil(ttlSec)), name: "rate-limit" }));
    } catch {
      // memory copy is enough
    }
  }
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || request.headers.get("x-real-ip") || "local").trim();
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterSec: number; remaining: number }> {
  const now = Date.now();
  const k = `rl:${key}`;
  const hits = ((await kvGet<number[]>(k)) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000), remaining: 0 };
  hits.push(now);
  await kvSet(k, hits, windowMs / 1000);
  return { ok: true, retryAfterSec: 0, remaining: limit - hits.length };
}
