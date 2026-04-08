# Pretext — text measurement without DOM layout thrash

Reference for this repo when a feature needs **accurate multiline text size or line breaking** without calling DOM APIs like `getBoundingClientRect()` / `offsetHeight` (those force reflow and get expensive fast).

**Upstream:** [chenglou/pretext](https://github.com/chenglou/pretext) · npm: `@chenglou/pretext`

## What it does

Pretext measures and lays out text using the browser’s font engine (via canvas) as ground truth, then does wrapping math in **pure logic** after a one-time `prepare()` step. That avoids layout thrash when you need heights, line counts, or line strings for things like:

- Virtualized lists (know row heights before touching the DOM)
- Canvas / WebGL / SVG text
- Shrinking or balancing widths (try several widths without reflow)
- Guarding against label overflow in UI (check in JS without layout)

## Mental model (two main flows)

1. **Height / line count only** — `prepare(text, font)` once, then `layout(prepared, maxWidth, lineHeight)` on resizes or width changes (cheap; no DOM).
2. **You own each line** — `prepareWithSegments` + `layoutWithLines`, `walkLineRanges`, `layoutNextLineRange`, etc., for custom flows (e.g. different width per line around a float).

Rich inline (chips, mixed fonts) lives under `@chenglou/pretext/rich-inline` — separate, narrower API.

## Using it in *this* project

The main site stays **static HTML/CSS/vanilla JS** on GitHub Pages. Pretext is an npm package, so it is wired through **Vite** for local work and any future bundled features.

### Local smoke app

From the repo root:

```bash
npm install
npm run dev:pretext
```

Open the URL Vite prints (default `http://localhost:5173`). Source lives in **`src/pretext-smoke/`** — `prepare()` once, `layout()` on resize. That folder is **excluded from the Pages deploy** (see `.github/workflows/deploy.yml`) so the live site does not ship a broken ESM demo.

### When you ship a real feature

- Add a small bundle (Vite/esbuild) and either output into a path Pages serves or adjust the workflow once.
- **Spike only:** `type="module"` + ESM CDN — OK for throwaways; pin versions and watch CSP.

`package.json` already lists `@chenglou/pretext`; `npm run build:pretext` writes to `dist-pretext/` (gitignored) if you want to inspect production output.

## Rules that matter (from upstream docs)

- The **`font` string passed to `prepare()`** must stay in sync with the CSS `font` (size, weight, family) of the text you are modeling — same idea as `canvasContext.font`.
- **`system-ui` is unsafe for accuracy on macOS** — use a named family (this site already uses **Inter** / **JetBrains Mono**; keep that alignment).
- Pretext targets common CSS text modes (`white-space: normal` / `pre-wrap`, `word-break` normal / `keep-all`, etc.); it is **not** a full browser layout engine.

## Snippets (for copy-paste when bundled)

```js
import { prepare, layout } from '@chenglou/pretext';

const prepared = prepare('Some paragraph…', '400 15px Inter, sans-serif');
const { height, lineCount } = layout(prepared, 320, 24);
// On resize: reuse `prepared` if text + font unchanged; only call `layout()` again.
```

```js
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

const prepared = prepareWithSegments('…', '400 15px Inter, sans-serif');
const { lines, height, lineCount } = layoutWithLines(prepared, 320, 24);
```

## When *not* to use it

- Simple “does this div fit?” one-offs where **one** measurement after render is enough.
- Anything that already lays out correctly in CSS and does not need programmatic line strings or pre-DOM height.

## See also

- Live demos (upstream): [chenglou.me/pretext](https://chenglou.me/pretext) (linked from the repo README).
