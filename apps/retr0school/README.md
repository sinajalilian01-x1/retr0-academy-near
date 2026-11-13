# Retr0 Academy (Next.js app)

The learning site of Retr0 Academy on NEAR. See the [repository README](../../README.md) for the full story, architecture and judge steps.

```bash
npm ci
npm run dev                      # http://127.0.0.1:43123 (writes to .next-dev)
npm run build && npm run start   # production build on http://localhost:3000
npm run typecheck
npx playwright install chromium && npm run test:e2e   # live end-to-end checks; R0_URL=… to target another server
```

No environment variables are required: without secrets the final exam runs the public practice paper and cannot sign mint attestations. See `.env.example`.

The look is controlled from one file, see [THEMING.md](THEMING.md). Lesson files follow [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
