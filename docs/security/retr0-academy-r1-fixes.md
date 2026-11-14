# Retr0 Academy: red-team round 1 fix log

**Review:** independent internal red-team review of `main` at `fc02fa44` (14 Nov 2026), 5 lanes: contract, backend, frontend, spec/git, triage. 29 canonical findings (0 Critical, 2 Medium, 7 Low, 18 Info, 2 Refuted) plus one composite chain rated High.
**Fixed in:** commits `c8ffb42`, `f2424ec`, `d914fb3`, `5adb8c1` (tests), deployed to https://retr0school-near.vercel.app on 14 Nov 2026.
**Contract:** no change to the deployed mainnet contract `diploma.hlpok1lad.tg`. Every on-chain break the reviewers tried failed. The contract findings are owner-only or informational and are mitigated off-chain or deferred (see below), so existing certificates are untouched and keep verifying.

Exploit details are deliberately summarized, not reproduced.

## Summary

| ID | Severity | Summary | Status | Commit |
| --- | --- | --- | --- | --- |
| R-1 | High (composite) | Certificate obtainable without the material and reproducible without limit (C-01 + C-02 + C-12) | **Fixed** (all three components fixed) | `c8ffb42` |
| C-01 | Medium | Pass token not bound to an account, reusable for 7 days | **Fixed** | `c8ffb42` |
| C-02 | Medium | Exam result leaked per-question correctness, and the cooldown was only checked at exam start | **Fixed** | `c8ffb42` |
| C-03 | Low | Rate limiter was non-atomic, fell back per-instance, and trusted the first `x-forwarded-for` hop | **Fixed** for security decisions; throughput limiter hardened (see notes) | `f2424ec` |
| C-04 | Low | `/api/tutor` accepted any `*.vercel.app` or missing Origin, `Origin: null` caused a 500, and a non-numeric cap disabled the cap | **Fixed** | `f2424ec` |
| C-05 | Low | `/api/ship` let anyone attach or overwrite a "Shipped" record for any account | **Fixed** for mainnet; testnet practice records are hardened (see notes) | `f2424ec` |
| C-06 | Low | Session/pass-token HMAC root was the testnet attestor seed | **Fixed** | `f2424ec` |
| C-12 | Low | Visible coding tests could be satisfied by shadowing `JSON.stringify` or hardcoding the examples | **Fixed** | `c8ffb42` |
| C-15 | Low | `/playground#code=` share links auto-ran someone else's HTML/JS with `allow-forms` | **Fixed** | `d914fb3` |
| C-18 | Low | Pre-auth quadratic base58 decode of an unbounded `publicKey` | **Fixed** | `f2424ec` |
| C-07 | Info | NEP-413 holder signature replayable for 10 min, recipient not site-bound | **Fixed** | `f2424ec` |
| C-08 | Info | Double `decodeURIComponent` → 500 on a bare `%`; no rate limit on the RPC-backed PNG route | **Fixed** | `d914fb3` |
| C-09 | Info | No `frame-ancestors` / XFO / Referrer-Policy | **Fixed** (script CSP deferred, see notes) | `d914fb3` |
| C-10 | Info | Playground `message` listener trusted any sender | **Fixed** | `d914fb3` |
| C-11 | Info | Tutor "off during the exam" relied on a client-declared body field | **Fixed** (also checks the browser-set Referer) | `f2424ec` |
| C-13 | n/a | Prerequisite gate is client-only | **Refuted** (documented as browser-tracked; grants nothing on the server) | – |
| C-14 | Info | CSS could close `</style>` in the preview document | **Fixed** | `d914fb3` |
| C-16 | Info | `?tutor=explain&err=` auto-sent URL text to the tutor | **Fixed** | `d914fb3` |
| C-17 | Info | Code E share link silently overwrote the saved local project | **Fixed** | `d914fb3` |
| C-19 | Info | Contract accepts any `expires_at_ms` (signer-controlled) | **Mitigated off-chain**, contract change deferred | – |
| C-20 | Info | Owner-only `rebrand` loops over every token | **Accepted / deferred** (owner-only, atomic, 1 token today) | – |
| C-21 | Info | `set_track` mutates in place; issuance pass mark not stored per token | **Accepted / deferred** (owner-only; pass mark unchanged since launch) | – |
| C-22 | Info | NEP-177 timestamps in ms; `media` without `media_hash` | **Accepted / deferred** (cosmetic metadata conformance) | – |
| C-23 | Info | `verify_diploma.valid` tautological; admin calls emit no events | **Accepted / deferred**; admin history is visible on `/proof` | – |
| C-24 | Info | CI workflow never ran (not at repo root); no unit tests for security code | **Fixed** | `5adb8c1` |
| C-25 | Info | Contract tests under-asserted | **Fixed** (5 new tests, 27/27 pass) | `5adb8c1` |
| C-26 | Info | `.env.example` pointed at testnet while the app defaults to mainnet | **Fixed** | `f2424ec` |
| C-27 | n/a | Dead legacy `/near/quiz` path | **Refuted** (static route shadows it; no runtime effect) | – |
| C-28 | Info | v1 contract once stored the answer key on chain (historical) | **Accepted** (removed in `535098d` and cleared by `migrate`; owner should rotate those questions in the next bank version) | – |
| C-29 | Info | Hardening batch: lax MAC parsing, check-then-set `used:` race, invalid `accountId` burned a passing attempt, `Origin: null` 500 | **Fixed** | `c8ffb42`, `f2424ec` |

## Details

### R-1 / C-01: pass token was an unbound mint authorization (Medium, composite High)
- **Root cause:** the signed pass (`PassClaim`) had no account and no single-use marker, so `POST /api/grade {passToken, accountId}` signed a fresh mint attestation for any account for 7 days.
- **Fix:** pass tokens are now v2 with a unique id. If the learner is connected when grading, the account goes into the token. Otherwise the pass is bound **atomically** to the first account it is exchanged for (`lib/once.ts`, Vercel Blob `allowOverwrite:false`, so exactly one writer wins across instances). Later requests for a different account get 403; retries for the same account still work. TTL cut from 7 days to 24 hours. Old v1 tokens are rejected. The on-chain contract already binds each attestation to the minting account and allows one certificate per account, so one exam pass now yields at most one certificate.
- **Tests:** `test/exam.test.ts`: "binds a pass to the account given at grading time", "binds an unbound pass to the first account it is exchanged for" (concurrent claims, exactly one wins), "rejects legacy v1 and expired pass tokens".

### C-02: exam was an answer oracle over repeated attempts (Medium)
- **Root cause:** results included `perQuestion[{id, correct}]` against stable option texts, and the 30-minute cooldown was only read when starting an exam, so pre-started sessions could be graded during the cooldown.
- **Fix:** per-question correctness is no longer returned (results show per-topic totals and test results only). The failed-attempt cooldown (signed cookie or per-IP) is now enforced at grade time too, before the attempt is consumed.
- **Tests:** "passes a correct attempt and does not return per-question correctness", "enforces the failed-attempt cooldown at grade time".

### C-12: visible tests were hardcodeable (Low, part of R-1)
- **Root cause:** the grader ran `code + ";JSON.stringify(fn(...args))"` in one script and compared the string, so learner code could replace `JSON.stringify`. Hardcoding the disclosed visible examples also earned points.
- **Fix:** `lib/exam/runner.ts` evaluates the learner program alone, calls the function through the QuickJS host API, reads the value back with the engine's native dump and compares canonical JSON **on the host**. Visible tests are worth nothing unless at least one hidden test also passes (each task has 2 visible and 3 hidden tests). Hardcoded visible examples plus a perfect multiple-choice score now total 25/40, below the 32/40 pass mark.
- **Tests:** `test/runner.test.ts` (shadowed `JSON.stringify` scores 0; hardcoded visible examples score 0; `toJSON` tricks rejected; timeouts), `test/exam.test.ts` "hardcoded visible tests plus a perfect MCQ still fail".

### C-03: anti-abuse layer (Low)
- **Root cause:** read-modify-write over the Runtime Cache with no atomic primitive, a per-instance fallback, and the client-controllable first `x-forwarded-for` element.
- **Fix:** every decision that must be exact now uses atomic set-if-absent markers in Vercel Blob that fail closed in production: attempt single use, pass binding and NEP-413 nonce burning. The client IP comes from `@vercel/functions` `ipAddress()` (Vercel's edge-set `x-real-ip`), or the **last** forwarded hop elsewhere. The limiter serializes per-key updates within an instance and never counts fewer hits than the instance has seen.
- **Residual:** throughput limits stay approximate across instances because the Runtime Cache has no atomic increment. They control cost, not certificate integrity.
- **Tests:** `test/security.test.ts` "client IP ignores a spoofed first x-forwarded-for hop", "concurrent requests can't exceed the limit in one instance".

### C-04: tutor as an open paid-key proxy (Low)
- **Fix:** exact Origin allowlist (this project's production, preview and branch hosts and `NEXT_PUBLIC_SITE_URL`; localhost only outside Vercel). A missing, `null` or malformed Origin returns 403, never 500. A cross-site `Sec-Fetch-Site` is refused. `TUTOR_DAILY_CAP` must be a positive integer, otherwise the default 5000 applies. The global counter is increment-then-check.
- **Tests:** "allows only this site", "cap can't be disabled by a bad value".

### C-05: unauthenticated ship records (Low)
- **Fix:** mainnet submissions require a NEP-413 signature from the student's own full-access key over `Link <contract> to <student> on Retr0 Academy`, with a burned nonce and a site-bound recipient. Single-label "students" such as `near` are rejected. Testnet practice accounts can't sign on this mainnet site, so a testnet record can only be replaced by re-verifying the same contract, or when the recorded contract's code is gone.
- **Residual:** a stranger can still create the *first* testnet practice record for an account whose sub-account has Wasm. It is labelled "testnet practice" and the facts are re-checked on chain live.
- **Tests:** "rejects single-label students before any RPC".

### C-06: one seed, two jobs (Low)
- **Fix:** new dedicated `R0_SESSION_SECRET` (32 bytes, set in Vercel as a sensitive variable) is the only root for session, pass-token, cookie and record HMAC/AES keys. Production fails closed without it. Attestor seeds are used only for ed25519 signing. Ship records signed before this change still verify against the legacy key (read-only) so existing "Shipped" sections keep showing. README and `.env.example` document the variable.
- **Tests:** "fails closed in production without R0_SESSION_SECRET", "does not derive token keys from the attestor seed".

### C-07, C-18: NEP-413 hardening (Info, Low)
- **Fix:** the public key is shape-checked (`ed25519:` plus 43-44 base58 chars) before any decoding. Signatures must name this site's host as recipient (the old constant `retr0-academy` is no longer accepted). Each nonce is burned atomically on first use. The client now also sends `callbackUrl`, so wallets that include it in the signed payload verify.
- **Tests:** "length-checks the public key before decoding", "only accepts this site as recipient".

### C-08, C-09, C-10, C-14, C-15, C-16, C-17: web hardening
- **C-08:** route params are decoded once with a non-throwing `safeDecode`. `/api/diploma/...` is rate-limited per client. Test: "a bare % does not throw".
- **C-09:** every response sends `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` and a restrictive `Permissions-Policy`. A full script-src CSP is deferred because it needs nonce plumbing through Next.js, wallet-selector and the lesson previews.
- **C-10:** the playground only accepts console messages whose `event.source` is the preview iframe it created.
- **C-14:** `</style` in user CSS is escaped. Test: "CSS can't close the style element".
- **C-15:** code from a `#code=` link is not auto-run and shows a "shared code" banner, and its preview sandbox drops `allow-forms` and `allow-popups`. Lesson previews keep forms so the forms lessons still work.
- **C-16:** URL-supplied error text is prefilled in the tutor box, not sent.
- **C-17:** Code E backs up the existing project to `localStorage["<key>:backup"]` before importing a share link and says so.

### C-19 to C-23: contract informational findings (deferred, no redeploy)
All are owner- or signer-only. Fixing them in the contract means a code upgrade plus a state migration (new per-token fields), which risks the live mainnet certificate for little security gain. Mitigations:
- **C-19:** the only signer (the server) caps attestation lifetime at 15 minutes (`ATTESTATION_TTL_MS`), and the attestor key is rotatable with `set_attestor`. A contract test now proves rotation invalidates old signatures.
- **C-20 / C-21:** owner-only and atomic. The pass mark has been 32/40 since mainnet launch, and every certificate stores its score and max score.
- **C-22 / C-23:** metadata conformance and events. The full admin history (`set_track`, `set_attestor`) is shown with NearBlocks links on `/proof`.

### C-24, C-25: tests and CI
- `.github/workflows/ci.yml` at the repo root runs lint, typecheck, unit tests and build for the web app, and `cargo test` for the contract. The old workflow under `apps/` was removed.
- 26 web unit tests (`apps/retr0school/test/*.test.ts`, run with `npm test`).
- 5 new contract tests: cross-contract replay, short signature, attestor rotation invalidates old signatures, rotation keeps existing certificates valid, `nft_transfer_call` panics. Contract suite: 27/27 pass.

### C-26, C-28, C-13, C-27
- **C-26:** `.env.example` now targets mainnet (`diploma.hlpok1lad.tg`) and lists every server secret.
- **C-28:** historical only. The current bank is encrypted and never on chain. The owner should retire the v1 questions in the next bank version (needs `EXAM_BANK_KEY`, which only the owner holds).
- **C-13, C-27:** refuted by the reviewers, no change needed.

## Verification
- Web: `npm run lint`, `npm run typecheck`, `npm test` (26 tests), `npm run build`, all passing.
- Contract: `cargo test` 27/27.
- GitHub Actions CI (root workflow): web + contract jobs green on `main`.
- Production checks on https://retr0school-near.vercel.app after deploy (14 Nov 2026):
  - security headers present (`frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy`);
  - `/api/grade` refuses an invalid or legacy pass token (403). A graded attempt submitted twice returns 409 on the second try, which shows the Blob single-use markers work in production;
  - the exam result has no per-question correctness;
  - `/api/tutor` refuses a foreign `*.vercel.app` origin, `Origin: null` and a missing Origin (403), answers same-origin requests, and refuses requests coming from the exam page (403);
  - `/api/holder` rejects a 30 KB public key in about 90 ms (400);
  - `/api/ship` asks for a wallet signature for mainnet students (401) and rejects single-label students (400);
  - `/verify/%25` returns 200 (was 500);
  - the course flow, Ask AI (browser), playground preview, wallet selector modal, `/verify/hlpok1lad.tg` and `/proof` (live chain + indexer) all work in a real browser with no console errors.
- Code E redeployed to https://code-e-near.vercel.app with the share-link backup (C-17).
