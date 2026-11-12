# Retr0school

Beginner lessons in HTML, CSS, JavaScript, and Web3. Each lesson has syntax-highlighted examples, a Try it Yourself editor, and a quiz at the end of the track. Progress stays in the browser.

Live site: [w3hschool.vercel.app](https://w3hschool.vercel.app)

The look is controlled from one file. See [THEMING.md](THEMING.md). Lesson files follow [CONTENT_GUIDE.md](CONTENT_GUIDE.md).

![Home on a desktop](docs/screenshots/home-desktop.png)

![A lesson on a phone](docs/screenshots/lesson-mobile.png)

## Run locally

```bash
npm install
npm run dev
```

The dev server is at [http://127.0.0.1:43123](http://127.0.0.1:43123). Dev writes to `.next-dev` so it does not replace a production build in `.next`.

No environment variables or secrets are required.

## Production build

```bash
npm run build
npm run start
```

`npm run build` statically generates every page, including `/sitemap.xml` and `/robots.txt`. Deploy from source with the Vercel CLI. `vercel.json` sets the framework to Next.js. Do not set env vars for the build.

## Tests and CI

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

`npm run test:e2e` covers home, search, lesson navigation, the mobile lessons drawer, Try it Yourself (all 38 examples), the playground, quiz scoring, progress, and the theme toggle at 1440×900 and 390×844.

GitHub Actions runs the same build and end-to-end suite on pushes and pull requests (`.github/workflows/ci.yml`).

## Project map

- `app/` routes: home, `/[track]`, `/[track]/[slug]`, `/[track]/quiz`, `/tryit`, sitemap, robots
- `content/` lessons, `_track.json`, and `quiz.json`
- `styles/theme.css` light and dark tokens
- `components/playground.tsx` the sandboxed HTML/CSS/JS editor
