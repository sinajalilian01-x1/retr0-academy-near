/**
 * Exact same-site Origin check for browser-only APIs (R1 C-04).
 * Allowed: this deployment's production, preview and branch hosts, NEXT_PUBLIC_SITE_URL, and localhost in dev.
 * A missing or malformed Origin is refused (browsers always send Origin on POST fetch).
 */
export function allowedHosts(env: Record<string, string | undefined> = process.env): Set<string> {
  const hosts = new Set<string>(["retr0school-near.vercel.app"]);
  for (const v of [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (!v) continue;
    try {
      hosts.add(new URL(v.includes("://") ? v : `https://${v}`).host.toLowerCase());
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

export function isAllowedOrigin(origin: string | null, env: Record<string, string | undefined> = process.env): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const isDev = env.VERCEL_ENV !== "production" && env.VERCEL_ENV !== "preview";
  if (isDev && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
  if (url.protocol !== "https:") return false;
  return allowedHosts(env).has(url.host.toLowerCase());
}

/** Parse a positive integer env value; anything else (NaN, 0, negative) falls back to the default. */
export function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}
