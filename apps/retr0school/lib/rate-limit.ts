import "server-only";

import { getCache, ipAddress } from "@vercel/functions";

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

/**
 * Client IP (R1 C-03). On Vercel `x-real-ip` is set by the edge from the TCP peer and cannot be supplied by
 * the client (read via @vercel/functions ipAddress). Elsewhere the *last* x-forwarded-for hop is used: it is
 * appended by the nearest proxy, while the first element is whatever the client sent.
 */
export function clientIp(request: Request): string {
  const real = ipAddress(request);
  if (real) return real.trim().slice(0, 64);
  const fwd = request.headers.get("x-forwarded-for");
  const last = fwd?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  return (last || "local").slice(0, 64);
}

/** Serialize read-modify-write per key inside this instance so concurrent requests can't all read the same window. */
const locks = new Map<string, Promise<unknown>>();
function serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => undefined);
  locks.set(key, tail);
  void tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return next;
}

/**
 * Sliding-window limiter. Best-effort throughput control: per-key RMW is serialized within an instance and the
 * window is merged with the local copy, so a burst against one instance can't exceed the limit. Cross-instance it
 * is approximate (the Runtime Cache has no atomic increment). Security decisions that must be exact (single-use
 * attempts, pass binding, nonce burning) do not rely on this; they use lib/once.ts.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterSec: number; remaining: number }> {
  const k = `rl:${key}`;
  return serialized(k, async () => {
    const now = Date.now();
    const shared = (await kvGet<number[]>(k)) ?? [];
    const local = (memory.get(k)?.value as number[] | undefined) ?? [];
    const live = (xs: number[]) => (Array.isArray(xs) ? xs : []).filter((t) => typeof t === "number" && now - t < windowMs);
    // The shared copy can be stale or lost (cache timeout); never count fewer hits than this instance has seen.
    const [a, b] = [live(shared), live(local)];
    const hits = (a.length >= b.length ? a : b).slice().sort((x, y) => x - y);
    if (hits.length >= limit) return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000), remaining: 0 };
    hits.push(now);
    await kvSet(k, hits, windowMs / 1000);
    return { ok: true, retryAfterSec: 0, remaining: limit - hits.length };
  });
}

/** Atomic-within-instance counter on the shared cache (used for the tutor's global daily cap). */
export async function incrementCounter(key: string, ttlSec: number): Promise<number> {
  return serialized(`ctr:${key}`, async () => {
    const shared = (await kvGet<number>(key)) ?? 0;
    const local = (memory.get(key)?.value as number | undefined) ?? 0;
    const next = Math.max(shared, local) + 1;
    await kvSet(key, next, ttlSec);
    return next;
  });
}
