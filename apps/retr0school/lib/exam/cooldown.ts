import "server-only";

/** Best-effort per-IP cooldown, in addition to the signed HttpOnly cookie. */
export const ipCooldowns = new Map<string, number>();
