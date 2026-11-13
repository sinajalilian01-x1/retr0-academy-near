# Theming Retr0 Academy

All UI colors, font choices, radii, spacing, shadows, and syntax colors live in `styles/theme.css`.

Components use semantic utilities (`bg-canvas`, `text-ink`, `border-line`, `bg-accent`, `text-accent-ink`, `text-cyan`, `text-highlight`, `bg-web3`, `bg-bar`, `bg-raised`, `font-pixel`, `shadow-md`). They do not hard-code hex values and they do not use `dark:` color classes. `app/globals.css` imports the theme and styles lesson prose, callouts, tables, and code frames with the same variables.

## Dark is the default

`:root` is the light set, plus shared type, space, and radius tokens. `.dark` replaces the color and shadow variables with the Retr0 Studio palette.

`app/layout.tsx` runs a tiny boot script before paint. It adds `class="dark"` unless `localStorage["w3h-theme"]` is `"light"`. A reader who has never chosen a theme gets dark, even when the operating system prefers light. The header toggle uses the same rule on mount. It writes `light` or `dark` only after a click.

## Palette

Dark surfaces:

| Token | Hex | Use |
| --- | --- | --- |
| `--w3h-canvas` | `#0d0b1a` | Page background. An 8px dot grid uses `--w3h-grid-dot` (`#1c1838`). |
| `--w3h-bar` | `#120f24` | Header |
| `--w3h-elevated` | `#17132b` | Cards and course rows |
| `--w3h-raised` | `#221d40` | Raised panels |
| `--w3h-line` | `#2e2858` | Borders |
| `--w3h-ink` | `#e8e6ff` | Body text |
| `--w3h-muted` | `#a9a4d6` | Secondary text |
| `--w3h-faint` | `#8480b8` | Non-essential text only |

`#6a65a0` was the requested faint color. It is about 3.7:1 on `#0d0b1a`, which misses WCAG AA for normal text. `#8480b8` clears 4.5:1 on the canvas, header, and cards. Do not put faint text on `--w3h-raised`; that pair is about 4.4:1.

Accents, shared by both themes:

| Role | Dark | Light (AA-adjusted) |
| --- | --- | --- |
| Primary pink fills (buttons, active lesson, dots) | `#ff3fa4`, hover `#ff5fb7` | same fills |
| Pink text (logo, arrows) | `#ff3fa4` | `#c73180` |
| Text on pink buttons | `#0d0b1a` (`--w3h-accent-ink`) | `#1a1633` |
| Links and info | `#ff5fb7` | `#a1005c` |
| Cyan nav, outlined chips, focus | `#6ff6ff` | `#0a6e78` |
| Yellow headings, progress, badges | `#ffd84a` | `#7a5200` |
| Web3 track dot | `#8a2ac9` | `#8a2ac9` |

White text on `#ff3fa4` is about 3.2:1, so buttons use the dark accent ink (about 6.0:1 in dark mode, 5.4:1 in light mode). `#d98a00` is the deep yellow. It is not used for text on the light canvas, where it fails AA; light headings use `#7a5200` instead. The Web3 purple is a small decorative dot, not text. It sits under the 3:1 non-text guideline on the dark card, so do not use it for labels.

Light surfaces are `#f4f1ff` canvas, white bar and cards, `#1a1633` text, `#3d3768` muted, and `#534e78` faint.

## Type, shape, shadow

- `Press Start 2P` is loaded with `next/font/google` as `--font-pixel`. Use `font-pixel` for the logo and large headings only. Body, navigation, lessons, and progress use Inter. Code uses JetBrains Mono.
- Hero size is `clamp(1.35rem, 0.7rem + 3.63vw, 3.6rem)` with a 1.4 line-height, sized so the short homepage title wraps in about three lines in the left column. Page titles use `clamp(1.05rem, 2.2vw, 1.55rem)`.
- Corners are 0–4px, except the accent dot, which stays a circle.
- Shadows are hard offsets: `3px 3px 0 #000` and `6px 6px 0 #000`. There is no glow and no gradient. The page dot grid is a 1px radial dot, not a fade.

## Raster exceptions

`app/icon.svg`, `app/apple-icon.tsx`, `app/manifest.ts`, and `lib/og-card.tsx` cannot read CSS variables. They repeat the dark pink, ink, and canvas hex values. Change them when you change the dark set.

Track files still store a `color` field for authors. The home rows and lesson chrome do not paint it, so an orange HTML color cannot leak into the UI.

## How to recolor

1. Edit the light block and the `.dark` block in `styles/theme.css`.
2. Keep the variable names.
3. Check contrast for ink, muted, faint, links, and button text on both themes.
4. Update the raster files above if the dark brand colors moved.
