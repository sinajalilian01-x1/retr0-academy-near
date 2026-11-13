import "server-only";

import { kvGet, kvSet } from "@/lib/rate-limit";

/** Per-IP cooldown shared across instances, in addition to the signed HttpOnly cookie. */
export async function getIpCooldown(ip: string) {
  return (await kvGet<number>(`cd:${ip}`)) ?? 0;
}
export async function setIpCooldown(ip: string, until: number) {
  await kvSet(`cd:${ip}`, until, Math.ceil((until - Date.now()) / 1000));
}
