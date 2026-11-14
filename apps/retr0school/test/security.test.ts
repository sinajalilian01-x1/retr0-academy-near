import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedOrigin, positiveInt } from "@/lib/security/origin";
import { PUBLIC_KEY_RE, recipientAllowed, verifyAccountSignature } from "@/lib/holder";
import { deriveKey, signToken, verifyToken } from "@/lib/server-secret";
import { buildSrcDoc } from "@/lib/srcdoc";
import { safeDecode } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyShip } from "@/lib/ship";

const prod = { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "retr0school-near.vercel.app" };

afterEach(() => vi.unstubAllEnvs());

describe("tutor origin (R1 C-04)", () => {
  it("allows only this site", () => {
    expect(isAllowedOrigin("https://retr0school-near.vercel.app", prod)).toBe(true);
    expect(isAllowedOrigin("https://evil.vercel.app", prod)).toBe(false);
    expect(isAllowedOrigin(null, prod)).toBe(false);
    expect(isAllowedOrigin("null", prod)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000", prod)).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000", {})).toBe(true);
  });
  it("cap can't be disabled by a bad value", () => {
    expect(positiveInt("abc", 5000)).toBe(5000);
    expect(positiveInt("0", 5000)).toBe(5000);
    expect(positiveInt("120", 5000)).toBe(120);
  });
});

describe("server secret (R1 C-06, C-29)", () => {
  it("fails closed in production without R0_SESSION_SECRET", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("R0_SESSION_SECRET", "");
    vi.stubEnv("NEAR_ATTESTOR_SEED", "11".repeat(32));
    expect(() => deriveKey("pass")).toThrow();
  });
  it("does not derive token keys from the attestor seed", () => {
    vi.stubEnv("R0_SESSION_SECRET", "22".repeat(32));
    vi.stubEnv("NEAR_ATTESTOR_SEED", "11".repeat(32));
    const a = deriveKey("pass");
    vi.stubEnv("NEAR_ATTESTOR_SEED", "33".repeat(32));
    expect(deriveKey("pass").equals(a)).toBe(true);
  });
  it("rejects malformed MACs and extra segments", () => {
    vi.stubEnv("R0_SESSION_SECRET", "22".repeat(32));
    const t = signToken("x", { ok: 1 });
    expect(verifyToken("x", t)).toEqual({ ok: 1 });
    expect(verifyToken("x", `${t}.extra`)).toBeNull();
    expect(verifyToken("x", `${t}=`)).toBeNull();
  });
});

describe("NEP-413 (R1 C-07, C-18)", () => {
  it("length-checks the public key before decoding", async () => {
    expect(PUBLIC_KEY_RE.test("ed25519:" + "1".repeat(5000))).toBe(false);
    const t0 = Date.now();
    await expect(verifyAccountSignature({ accountId: "a.near", publicKey: "ed25519:" + "z".repeat(40000), signature: "", nonce: "", recipient: "retr0school-near.vercel.app" }, "m")).rejects.toThrow(/public key/);
    expect(Date.now() - t0).toBeLessThan(50);
  });
  it("only accepts this site as recipient", () => {
    expect(recipientAllowed("retr0school-near.vercel.app", prod)).toBe(true);
    expect(recipientAllowed("retr0-academy", prod)).toBe(false);
    expect(recipientAllowed("evil.example", prod)).toBe(false);
  });
});

describe("ship (R1 C-05)", () => {
  it("rejects single-label students before any RPC", async () => {
    await expect(verifyShip("near", "anything.near")).rejects.toThrow(/named account/);
  });
});

describe("misc hardening", () => {
  it("C-14: CSS can't close the style element", () => {
    const doc = buildSrcDoc("<p>x</p>", "a{}</style><script>alert(1)</script>", "");
    expect(doc).not.toMatch(/<\/style><script>alert/);
  });
  it("C-08: a bare % does not throw", () => {
    expect(safeDecode("%")).toBe("%");
    expect(safeDecode("alice.near")).toBe("alice.near");
  });
  it("C-03: client IP ignores a spoofed first x-forwarded-for hop", () => {
    expect(clientIp(new Request("https://x", { headers: { "x-forwarded-for": "1.1.1.1, 9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("https://x", { headers: { "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" } }))).toBe("8.8.8.8");
  });
  it("C-03: concurrent requests can't exceed the limit in one instance", async () => {
    const key = `t-${Math.random()}`;
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(key, 6, 60_000)));
    expect(results.filter((r) => r.ok)).toHaveLength(6);
  });
});
