# Code E

Code E is a browser playground for HTML, CSS, and JavaScript. It is the editor companion to Retr0 Academy: a file tree, tabs, a sandboxed preview, and a console, with nothing to install and no server of its own.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm run build
npm run preview
```

`npm run build` typechecks and writes the static site to `dist/`. Preview serves that folder at [http://127.0.0.1:43124](http://127.0.0.1:43124). Deploy `dist/` with any static host. On Vercel, the Vite preset uses `npm run build` and publishes `dist/`.

```bash
npm test
```

Playwright runs against the production build in desktop (1440×900) and mobile (390×844) viewports.

## What you can do

The starter project is `index.html`, `style.css`, and `script.js`. Add, rename, and delete files from the explorer. On a phone, open Files from the header. HTML, CSS, JS, Preview, and Console are the section tabs, and Share, Fullscreen, Console, and Reset sit in the bottom dock.

The editor is CodeMirror 6: syntax colors, autocomplete (including common browser APIs), Emmet in HTML and CSS (`!` then Tab inserts an HTML document), auto-closing tags and brackets, matching brackets, multiple cursors (Ctrl/Cmd+D or Alt-drag), find and replace (Ctrl/Cmd+F), and folding. Format runs Prettier, loaded the first time you use it.

Run (Ctrl/Cmd+Enter) refreshes the preview. Auto-run does that about half a second after you stop typing. The preview is a sandboxed iframe: its scripts cannot read or change the editor page. `console.log`, `info`, `warn`, `error`, uncaught errors, and rejected promises show in the Console panel.

The preview width can be a phone or the full pane. Drag the dividers to resize the explorer, preview, and console. Fullscreen covers the window when the browser allows it.

Your project is saved in `localStorage`. Share copies a link. Download HTML gives one file with the CSS and JavaScript inlined. Download ZIP keeps the files separate. Copy code copies the file you are editing. Light and dark themes, font size, and word wrap are saved with the project. Reset puts the starter files back and leaves those settings alone.

## Share link contract

Other sites can open Code E with a project by setting the URL hash:

```text
https://<host>/#code=<payload>
```

`<payload>` is the result of `lz-string`'s `compressToEncodedURIComponent` on a JSON string:

```json
{"html":"<h1>Hi</h1>","css":"h1{color:red}","js":"console.log('hi')"}
```

On load, Code E decodes that object into `index.html`, `style.css`, and `script.js`, replaces the autosaved project, and removes the hash. Share creates the same kind of link. The storage key stays `retr0code.project.v1`, so a project saved under the previous name still opens.

```js
import { compressToEncodedURIComponent } from 'lz-string'

const payload = compressToEncodedURIComponent(JSON.stringify({
  html: '<h1>Hi</h1>',
  css: 'h1 { color: #ff3fa4; }',
  js: 'console.log("hi")',
}))
location.href = `https://<host>/#code=${payload}`
```

## Limits

- A share link carries only `index.html`, `style.css`, and `script.js`. Any other file stays in this browser.
- The preview can load network resources, but it cannot touch the editor page, its storage, or its cookies.
- The HTML download inlines project CSS and JavaScript into one document. The ZIP is the separate files.
- Prettier is fetched the first time you format.
- Emmet expands an abbreviation when you press Tab. It does not track the abbreviation while you type.
- Very large projects can hit the browser storage limit.
