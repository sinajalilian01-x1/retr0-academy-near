# Content guide

Lessons, track metadata, and quizzes are plain files under `content/`. The site reads them at build time. Another writer can add or replace lessons without changing React components, as long as this format stays the same.

Theming is separate. Colors, fonts, radii, spacing, and shadows live in `styles/theme.css`. See [THEMING.md](THEMING.md).

## Tracks

A track is a folder:

```text
content/<track>/
  _track.json
  quiz.json
  01-some-slug.mdx
  02-another-slug.mdx
```

The folder name is the URL slug. Current tracks:

| Folder | URL |
| --- | --- |
| `html` | `/html` |
| `css` | `/css` |
| `javascript` | `/javascript` |
| `web3` | `/web3` |
| `near` | `/near` (pass the quiz to mint a diploma at `/diploma`) |

Preferred display order is `html`, `css`, `javascript`, `web3`. Any other folder that contains `_track.json` is listed after those, alphabetically.

`quiz` is a reserved lesson slug. Do not name a lesson `quiz`.

## Track metadata

`content/<track>/_track.json`:

```json
{
  "title": "HTML",
  "description": "The skeleton of a page: headings, text, links, and lists.",
  "icon": "CodeXml",
  "color": "#d4522a"
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | yes | Name shown on cards, the track page, and in search. |
| `description` | yes | One or two sentences on the card and the track page. |
| `icon` | yes | A Lucide icon name or an emoji. |
| `color` | yes | CSS color used only as that track's accent stripe and icon. Hex is the usual form. |

Built-in Lucide names: `CodeXml`, `Palette`, `Braces`, `Blocks`. Any other string is rendered as text, so an emoji works with no code change. Adding a new Lucide name means adding it to the map in `components/track-icon.tsx`.

Track accent colors are content. They are not part of the UI theme in `styles/theme.css`.

## Lessons

File name:

```text
content/<track>/<NN>-<slug>.mdx
```

- `NN` is the two-digit order, starting at `01`.
- `<slug>` is lowercase letters, numbers, and single hyphens. It becomes the URL: `/<track>/<slug>`.
- The filename order and the frontmatter `order` must be the same number.
- Orders and slugs must be unique inside a track.

### Frontmatter

```yaml
---
title: A Page Skeleton
description: Put a heading and a paragraph on a page, then run it.
order: 1
tags:
  - basics
  - structure
---
```

| Field | Required | Type |
| --- | --- | --- |
| `title` | yes | string |
| `description` | yes | string |
| `order` | yes | integer |
| `tags` | no | array of strings. Omit it, or use `[]`, when there are none. |

`title`, `description`, and `tags` are searchable. The body is searchable too.

## Lesson body

The body is MDX. Write normal Markdown: paragraphs, `headings`, lists, links, and `inline code`.

Avoid raw `{` and `}` in prose. Those start a JavaScript expression. Put code in fences or in backticks. Also avoid raw `<` in prose. Write element names as inline code, like `` `h1` ``.

Leave a blank line before and after a component so Markdown inside it is parsed:

```mdx
<Note>

You can use **bold** and [a link](/html/text-and-links) here.

</Note>
```

### Fenced code

Always name the language. Supported languages:

`html`, `css`, `js`, `javascript`, `solidity`, `rust`, `bash`, `shell`, `sh`, `json`

````md
```html
<h1>Hello, Retr0school</h1>
```
````

Fenced blocks are syntax highlighted. They do not get a Run button. Use `<TryIt>` for an example the reader can edit.

### TryIt

`<TryIt>` is self-closing. It renders the example and a **Try it Yourself** button. The button opens an HTML, CSS, and JavaScript editor with a sandboxed preview, plus Run and Reset.

```mdx
<TryIt
  title="Say hello"
  html={`<h1>Hello, Retr0school</h1>
<p id="out">Waiting.</p>`}
  css={`body { font-family: Georgia, serif; margin: 0; padding: 24px; }
h1 { margin-top: 0; }`}
  js={`var out = document.getElementById("out");
out.textContent = "Run worked.";`}
/>
```

| Prop | Required | Meaning |
| --- | --- | --- |
| `html` | no | HTML string placed in the preview body. |
| `css` | no | CSS string placed in a style element. |
| `js` | no | JavaScript string run after the HTML. |
| `title` | no | Caption on the example and in the editor. |

Pass at least one of `html`, `css`, or `js`. Omitted languages are hidden on the lesson card. The editor still shows all three panels so a reader can add the missing one.

Use a JavaScript template literal (backticks) so quotes inside the example do not fight the attribute. Inside that literal:

- Do not use a backtick.
- Do not use `${`, because that interpolates.
- `</script>` in the JavaScript is escaped for you when the preview runs.

Only HTML, CSS, and JavaScript run in the preview. Solidity, bash, and JSON stay in fenced blocks.

### Open in Code E

Add the `codeE` flag to a `TryIt` to also show an **Open in Code E** button. It opens the same HTML, CSS, and JavaScript in Code E using Code E's `#code=` share format. The Code E base URL comes from `NEXT_PUBLIC_CODE_E_URL`.

```mdx
<TryIt codeE title="View call" html={`...`} js={`...`} />
```

`<CodeEStarter />` links to Code E's NEAR starter template (`#template=near`).

### Callouts

```mdx
<Note>

A short aside that clarifies the idea.

</Note>

<Warning>

Something a beginner can get wrong, or a safety note.

</Warning>

<Tip>

A small habit worth keeping.

</Tip>
```

Each one takes Markdown children and nothing else. Do not pass props.

## Quiz

`content/<track>/quiz.json` is an array:

```json
[
  {
    "question": "Which element is the main heading of a page?",
    "options": ["p", "h1", "li", "br"],
    "answer": 1,
    "explanation": "h1 is the top heading."
  }
]
```

| Field | Type |
| --- | --- |
| `question` | string |
| `options` | array of at least two strings |
| `answer` | index into `options`, starting at 0 |
| `explanation` | string shown after scoring |

The quiz URL is `/<track>/quiz`.

## URLs

| Page | Path |
| --- | --- |
| Home | `/` |
| Track overview | `/<track>` |
| Lesson | `/<track>/<slug>` |
| Quiz | `/<track>/quiz` |
| Playground | `/tryit` |

Previous and next on a lesson walk Overview, then each lesson in `order`, then the quiz.

## Progress

The browser stores progress in `localStorage` under `w3h-progress-v1`. A finished lesson is `"<track>/<slug>"`. Home percentages count finished lessons divided by lessons in that track. The quiz score is stored separately and does not change the percentage.

## Tables

Markdown tables are enabled with `remark-gfm`. The site wraps each table so it scrolls sideways on a narrow screen. Write them as normal GitHub-flavored tables.

## Curriculum

The lessons under `content/` are the live curriculum. End-to-end tests discover tracks, lessons, and quizzes from these files. The playground starter in `lib/starter.ts` still produces the text `Playground ready.` when Run is pressed.

## What fails the build

The content loader throws, and `npm run build` fails, when:

- a lesson file name does not match `NN-slug.mdx`
- frontmatter is missing `title`, `description`, or an integer `order`
- filename order and frontmatter `order` differ
- `tags` is present but is not an array of strings
- two lessons in one track share an order or a slug
- `_track.json` is missing `title`, `description`, `icon`, or `color`
- `quiz.json` is missing, empty, or has an `answer` outside `options`
