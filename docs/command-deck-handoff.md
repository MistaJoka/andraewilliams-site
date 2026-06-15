# Command Deck — Build Handoff / Backlog

Self-contained handoff so anyone (e.g. Cursor) can continue the tactical
command-center redesign with no prior conversation context.

## TL;DR

Converting andraewilliams.com from scrolling pages into a **no-scroll,
single-screen tactical "command deck"** with an elite military/intel operator
aesthetic (amber-on-black). **Phases 2–8 shipped on `feat/command-deck`** — merge
to `main` to deploy.

## Where things live

- **Spec (what + why):** `docs/superpowers/specs/2026-06-14-tactical-command-deck-design.md`
- **Full task plan:** `docs/superpowers/plans/2026-06-14-tactical-command-deck.md` (Phases 0–8, exact steps)
- **Branch:** `feat/command-deck` (NOT merged to `main`; `main` is live on Vercel)
- **Visual source of truth:** the locked "v5.1" operator look — already realized
  by the current Home frame; match it for new panels/pages.

## Current state (committed on `feat/command-deck`)

- All phases 2–8 complete: data panels, About/Tools, long-form scroll, 404,
  analytics, operator theme locked on deck pages, rail toggle, Tier B polish.
- Build is green: `npm run build:site` → "Site verification passed."

## Historical — Phase 1 snapshot

- `src/css/command-deck.css` — frame, panels, radar, ticker, status bar.
- `src/js/command-deck.js` — clock, motion gate, keyboard nav, data loaders.
- `src/css/themes.css` — `[data-theme="operator"]` palette.
- `src/index.html` — deck frame with dossier, scan, comms, data hooks.

## How to run / verify (obsolete section trimmed — see above)

- Build the production tree: `npm run build:site` (must end "Site verification passed").
- Local preview: `cd src && python3 -m http.server 8123` → open `localhost:8123`.
- **Cache gotcha:** browsers aggressively cache `style.css`/`themes.css`. After
  CSS edits, hard-reload (Cmd/Ctrl+Shift+R) or append `?cb=1`.
- **Theme note:** the inline `<script>` in each page reads `localStorage`
  `site-theme`. If you previously saved another theme it overrides the operator
  default — run `localStorage.setItem('site-theme','operator')` or clear it.
  OPEN DECISION: force operator on deck pages (recommended, no picker yet) vs
  keep respecting saved themes.

## Backlog — remaining work (in order)

### Phase 2 — wire Home data panels (NEXT)
Populate the `// STANDBY` placeholders in `src/index.html` from existing JSON.
Do it in `src/js/command-deck.js` (fetch + render) or reuse the existing
loaders noted below. Markup uses `.deck-stack` (column) + `.deck-row`
(space-between) + `.deck-dim`/`.deck-go` helpers.

- `#deck-assets` ← `src/data/tools.manifest.json` (`tools[]`): one `.deck-row`
  per tool — `NN Name` + green `●` if `status==="live"`, linking `href`. Add
  "ACCESS ARMORY →" to `tools.html`. (Pattern: `src/js/home-arsenal.js`.)
- `#deck-systems` ← `src/data/site-status.json`: rows for `deploy` (use
  "vercel"), `integrity`/`verify`, `commit`, plus literal `scroll: locked`.
  (Pattern: `src/js/status-panel.js`.)
- `#deck-opslog` ← `src/data/field-notes.json` (or `docs/decisions.md`): the 2
  most-recent entries, `MM.DDZ` + title. (Pattern: `src/js/home-field-notes.js`.)
- `#deck-active-op` ← `src/data/mission.json`: current mission title.
  (Pattern: `src/js/home-mission.js`.)
Verify: build green; `localhost:8123` Home shows real data in all six panels;
no console errors; page does not scroll on desktop.

### Phase 3 — operator theme polish
Mostly done (theme exists + default). Remaining: grep `src/css/command-deck.css`
for stray hardcoded hex and confirm only intentional scanline/overlay alphas
remain; confirm other themes still recolor the deck (swap `data-theme`).

### Phase 4 — About in the frame (`src/about.html`)
Wrap About in the same frame (rail/prompt/hazard/banner/ticker/status,
`class="deck-page"`, load `command-deck.js`, rail About active). Active region =
2–3 operator panels (origin / mission-vibe / principles) from current About
content, fitting one screen.

### Phase 5 — Tools in the frame (`src/tools.html`)
Wrap in frame; rail Tools active. Active region = asset tiles from
`tools.manifest.json` (4 tiles) as deck panels. KEEP the `// 4 live builds`
count comment (verify-site checks manifest count == this number).

### Phase 6 — Long-form pages keep internal scroll
`src/cipher-console.html`, `src/writeups/*.html`: add the frame chrome but make
the center `.deck-active--scroll` (the class exists) so they scroll internally;
do NOT clip their content. Cipher Console EXECUTE must still work.

### Phase 7 — Responsive
`@media (max-width:768px)` already stubs the stacked fallback in
`command-deck.css`. Test each page at 375px; refine so nothing clips/overlaps.

### Phase 8 — a11y + ship
- Confirm reduced-motion disables radar/ticker/cursor/pulse (already gated).
- One `<h1>` per page, `<nav>` rail with `aria-current`, visible focus rings,
  AA contrast (amber `#f0a818` on `#070809` ≈ 9:1).
- Final: `npm run build:site`; preview Home/About/Tools at 1280/1440/375.
- Merge to `main` + push (Vercel auto-deploys). Verify live.

## Class / id reference (already defined in command-deck.css)

`.deck` `.deck-page` `.deck-rail` `.deck-rail-link.active` `.deck-main`
`.deck-prompt` `.deck-cursor` `.deck-threat` `.deck-hazard` `.deck-banner`
`.deck-clock` (`#deck-clock`) `.deck-active` `.deck-active--scroll`
`.deck-panel` `.deck-panel--scroll` `.deck-label` `.deck-label--primary`
`.deck-row` `.deck-stack` `.deck-dim` `.deck-go` `.deck-dossier` `.deck-bracket`
`.deck-watermark` `.deck-stamp` `.deck-photo` `.deck-callsign` `.deck-barcode`
`.deck-badge` `.deck-radar(-scope/-ring/-sweep)` `.deck-blip(--hostile)`
`.deck-ticker(-track)` `.deck-status` `.deck-uplink-dot`. Data hooks:
`#deck-assets` `#deck-systems` `#deck-opslog` `#deck-active-op`.
