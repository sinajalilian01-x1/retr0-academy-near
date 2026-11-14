# Security policy

## Reporting a vulnerability
Please report security issues privately to the maintainer (GitHub: [@sinajalilian01-x1](https://github.com/sinajalilian01-x1)) instead of opening a public issue. Include the affected URL or file, impact, and steps to reproduce. We aim to respond within 72 hours.

## Scope
- Web app: https://retr0school-near.vercel.app (`apps/retr0school`)
- Certificate contract on NEAR mainnet: `diploma.hlpok1lad.tg` (`contracts/diploma`)
- Code E: https://code-e-near.vercel.app (`apps/code-e`)

## Reviews and fixes
- **Round 1 red-team review (Nov 2026):** 29 findings plus one composite chain. All High/Medium/Low items are fixed. Full log with root cause, fix, commit and test for each finding: [docs/security/retr0-academy-r1-fixes.md](docs/security/retr0-academy-r1-fixes.md).

## Design notes
- The server never holds user keys. Certificates are minted by the learner's own wallet. The server only signs a short-lived ed25519 attestation that the contract verifies.
- Secrets (`R0_SESSION_SECRET`, attestor seeds, `EXAM_BANK_KEY`, `NEAR_AI_API_KEY`, `BLOB_READ_WRITE_TOKEN`) live only in Vercel environment variables, never in the repo.
