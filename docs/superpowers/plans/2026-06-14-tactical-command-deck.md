# Tactical Command Deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert andraewilliams.com into a no-scroll, single-screen tactical "command deck" with an elite operator aesthetic, across Home/About/Tools.

**Architecture:** Multi-page static site keeps separate HTML pages (URLs/SEO/deploy unchanged). A shared, theme-agnostic **command frame** (CSS grid, `100vh`, `body{overflow:hidden}`) wraps each page; only the center "active region" differs. Existing data JSON + panel loaders are reorganized into bento panels, not rewritten. A new `operator` theme supplies the v5.1 amber palette as the default.

**Tech Stack:** Vanilla HTML/CSS/ES-module JS, Vite (existing build), `npm run build:site` + `verify-site.sh`, Claude Preview tools for verification.

**Source of truth:** Spec `docs/superpowers/specs/2026-06-14-tactical-command-deck-design.md`; visual reference = the locked **v5.1 mockup** from the brainstorm (operator_war_room_v5_1_locked).

**Verification model (this is a static UI redesign — no unit tests):** each task ends by (a) running `npm run build:site` (must print "Site verification passed"), and/or (b) a Claude Preview check (screenshot / `preview_eval` computed-style / `preview_resize`), then a commit. "Expected" describes what the check must show.

---

## File Structure

- Create `src/css/command-deck.css` — the frame grid, bento panels, operator chrome, scanlines, sharp tokens. One responsibility: command-deck layout + components.
- Create `src/js/command-deck.js` — Zulu clock, intel ticker seed, radar enable, `prefers-reduced-motion` gate, keyboard rail nav. One responsibility: deck runtime behavior.
- Modify `src/css/themes.css` — add `operator` theme tokens; make it the default.
- Modify `src/index.html` — restructure into frame + 6 Home panels.
- Modify `src/about.html` — frame + About panels.
- Modify `src/tools.html` — frame + asset-tile active region.
- Modify `src/css/style.css` — neutralize the old fixed/scroll page styles superseded by the frame (footer, section `100vh` stacking).
- Modify writeup/console pages — add frame chrome with an internally-scrolling center.
- Data unchanged: `src/data/*.json`, `docs/decisions.md`.

---

## Phase 0 — Branch

### Task 0: Feature branch
- [ ] **Step 1:** Create and switch to a branch (this is a large change; keep `main` clean).

Run: `git checkout -b feat/command-deck`
Expected: "Switched to a new branch 'feat/command-deck'"

- [ ] **Step 2:** Confirm clean baseline build.

Run: `npm run build:site`
Expected: ends with "Site verification passed."

---

## Phase 1 — Command frame shell (theme-agnostic)

Build the persistent frame chrome and its runtime on the Home page first, with placeholder center content. No operator colors yet (use existing tokens) — this isolates layout from theming.

### Task 1: Frame layout + CSS
**Files:** Create `src/css/command-deck.css`; Modify `src/index.html` (link the stylesheet; wrap body in the frame); Modify `src/css/style.css`.

- [ ] **Step 1:** Add `command-deck.css` with the frame grid. Implement the regions from the spec's diagram: `.deck` is `display:grid; grid-template-columns: var(--rail-w) 1fr; height:100dvh`. The right column is `display:grid; grid-template-rows: auto auto auto 1fr auto auto` for prompt / hazard / banner / active-region / ticker / status-bar. Set `html,body{height:100%;margin:0}` and `body.deck-page{overflow:hidden}`. Use existing tokens (`--border`, `--bg`, `--surface-glass`) for now; sharp radius `2px`.

```css
.deck { display: grid; grid-template-columns: 52px 1fr; height: 100dvh; }
.deck-main { display: grid; grid-template-rows: auto auto auto 1fr auto auto; min-height: 0; }
.deck-active { min-height: 0; overflow: hidden; }
.deck-prompt, .deck-banner, .deck-status { display:flex; align-items:center; justify-content:space-between; }
```

- [ ] **Step 2:** In `index.html`, add `class="deck-page"` to `<body>`, link `command-deck.css` after `style.css`, and wrap content in `.deck` > rail + `.deck-main` (prompt, hazard, banner, `.deck-active` placeholder "ACTIVE REGION", ticker, status bar). Copy the chrome markup from the v5.1 mockup (prompt line, hazard stripe, clearance banner, ticker, status bar), swapping hardcoded hex for token vars.

- [ ] **Step 3:** In `style.css`, scope the old full-height section stacking so it does not apply on `.deck-page` (the frame owns height now). Remove reliance on the in-flow `.site-footer` for deck pages (the status bar replaces it).

- [ ] **Step 4 (verify):** `npm run build:site` → "Site verification passed." Then preview:

Run (Claude Preview): start `site`, screenshot `index.html`.
Expected: a full-viewport frame — rail left, prompt/banner top, status bar bottom, no page scroll; `preview_eval` `document.body.scrollHeight <= innerHeight + 2`.

- [ ] **Step 5:** Commit. `git add -A && git commit -m "feat(deck): command frame shell on home"`

### Task 2: Deck runtime JS
**Files:** Create `src/js/command-deck.js`; Modify `src/index.html` (load module).

- [ ] **Step 1:** Implement `command-deck.js`: a Zulu clock updating `#deck-clock` each second (`new Date().toISOString().slice(11,19)`), respect `prefers-reduced-motion` by adding `data-motion="reduce"` to `<html>` when matched (CSS uses it to disable radar/ticker/cursor/pulse), and keyboard nav (`h`/`a`/`t` or rail focus). Guard all DOM lookups (`if (el)`).

```js
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mq.matches) document.documentElement.dataset.motion = 'reduce';
const clock = document.querySelector('#deck-clock');
function tick(){ if(clock) clock.textContent = new Date().toISOString().slice(11,19); }
tick(); if(!mq.matches) setInterval(tick, 1000);
```

- [ ] **Step 2:** Add `<script type="module" src="js/command-deck.js"></script>` to `index.html`; give the clock span `id="deck-clock"`.

- [ ] **Step 3 (verify):** Preview `preview_eval`: clock text matches `/^\d\d:\d\d:\d\d$/`; with `preview_resize colorScheme/reduced` emulation, `document.documentElement.dataset.motion === 'reduce'`. Check `preview_console_logs` level error = none.

- [ ] **Step 4:** Commit. `git commit -am "feat(deck): clock, reduced-motion gate, keyboard nav"`

**CHECKPOINT 1:** Frame + runtime work on Home with placeholder center. Review before panels.

---

## Phase 2 — Home bento panels (data-wired)

Replace the placeholder `.deck-active` with the six-panel bento, each fed by existing data. Reference the v5.1 mockup for exact markup; read color from tokens.

### Task 3: Bento grid + static panels (DOSSIER, SCAN, SECURE.COMMS)
**Files:** Modify `src/index.html`, `src/css/command-deck.css`.

- [ ] **Step 1:** Add `.deck-active` grid: `grid-template-columns:1.55fr 1fr 1fr; grid-template-rows:1fr 1fr 0.7fr; gap:8px; padding:10px`. Add `.deck-panel` (border, bg token, padding, `position:relative; overflow:hidden`).
- [ ] **Step 2:** Build DOSSIER (spans rows 1-2): identity (static: callsign MISTAJOKA, name, designation), reticle photo block, barcode, `001` watermark, CLASSIFIED stamp, corner bracket, and an `ACTIVE OP` slot (filled in Task 4). SCAN panel: the CSS radar (rings, conic sweep, 3 contacts). SECURE.COMMS (spans cols 2-3): github/source/net links.
- [ ] **Step 3 (verify):** build + screenshot. Expected: dossier, radar, comms render; links are real `<a>` (`preview_eval` counts `.deck-panel a` ≥ 3).
- [ ] **Step 4:** Commit. `git commit -am "feat(deck): home dossier, scan, comms panels"`

### Task 4: Data-driven panels (ASSETS, SYSTEMS, OPS.LOG, ACTIVE OP)
**Files:** Modify `src/js/command-deck.js` (or reuse `home-arsenal.js`/`home-mission.js`/`status-panel.js`/`home-field-notes.js`), `src/index.html`.

- [ ] **Step 1:** Render ASSETS from `data/tools.manifest.json` (4 tool rows, status dot, "ACCESS ARMORY →" → `tools.html`). Reuse the existing fetch pattern in `home-arsenal.js`; mount into `#deck-assets`.
- [ ] **Step 2:** Render SYSTEMS from `data/site-status.json` (deploy/integrity/commit + literal `scroll: locked`). Reuse `status-panel.js` pattern.
- [ ] **Step 3:** Render OPS.LOG: 2 most-recent from `data/field-notes.json` with Zulu-style dates.
- [ ] **Step 4:** Fill `ACTIVE OP` from `data/mission.json` (current mission title).
- [ ] **Step 5 (verify):** build; preview screenshot shows the four populated panels; `preview_console_logs` error = none; `preview_network` shows the JSON files 200.
- [ ] **Step 6:** Commit. `git commit -am "feat(deck): wire assets/systems/ops-log/active-op to data"`

**CHECKPOINT 2:** Full Home deck renders from real data. Review density/legibility at 1280 and 1440 (`preview_resize`).

---

## Phase 3 — Operator theme

### Task 5: Operator theme tokens, default
**Files:** Modify `src/css/themes.css`; Modify the inline theme bootstrap in `index.html`/`about.html`/`tools.html`.

- [ ] **Step 1:** Add an `[data-theme="operator"]` block defining the v5.1 palette as tokens: `--bg:#070809; --text:#d8d4c8; --muted:#8a8778; --dim:#5c5a4f; --primary:#f0a818; --go:#4ade80; --alert:#e0322f; --border:#2d2f2a; --surface-glass:#0b0d10;` plus radius `--radius-card:2px`.
- [ ] **Step 2:** Change the inline bootstrap default from `'graphite-command-pro'` to `'operator'` on all deck pages.
- [ ] **Step 3:** Audit `command-deck.css` — replace any remaining hardcoded hex with tokens (`--primary`, `--go`, `--alert`, `--border`, `--muted`, `--dim`, `--text`). Grep: `grep -nE '#[0-9a-fA-F]{3,6}' src/css/command-deck.css` should return only intentional scanline/overlay alphas.
- [ ] **Step 4 (verify):** build; screenshot Home → matches v5.1 (amber/black, green dots, one red radar contact + stamp). Switch a non-operator theme via the picker (`preview_eval` set `data-theme`) → deck recolors without breaking layout.
- [ ] **Step 5:** Commit. `git commit -am "feat(deck): operator theme as default, tokenize deck colors"`

**CHECKPOINT 3:** Home is the locked v5.1 look. Review before replicating to other pages.

---

## Phase 4 — About in the frame

### Task 6: About active region
**Files:** Modify `src/about.html`, `src/css/command-deck.css`.

- [ ] **Step 1:** Wrap `about.html` in the same frame (rail/prompt/hazard/banner/ticker/status; `class="deck-page"`, load `command-deck.js`). Rail marks About active (`aria-current`).
- [ ] **Step 2:** Active region = 2-3 framed panels (origin / mission-vibe / principles) from the existing About content, fitting one screen.
- [ ] **Step 3 (verify):** build; screenshot About → framed, no page scroll (`scrollHeight <= innerHeight+2`).
- [ ] **Step 4:** Commit. `git commit -am "feat(deck): about page in command frame"`

---

## Phase 5 — Tools in the frame

### Task 7: Tools active region
**Files:** Modify `src/tools.html`, `src/css/command-deck.css`.

- [ ] **Step 1:** Wrap `tools.html` in the frame; rail marks Tools active. Keep the `// N live builds` count comment intact (verify-site checks it).
- [ ] **Step 2:** Active region = the asset tiles from `tools.manifest.json` (4 tiles) styled as deck panels, fitting one screen; keep links to each tool/writeup.
- [ ] **Step 3 (verify):** `npm run build:site` (manifest drift check must still pass — 4 tools, `// 4 live builds`); screenshot Tools, no page scroll.
- [ ] **Step 4:** Commit. `git commit -am "feat(deck): tools page in command frame"`

---

## Phase 6 — Long-form pages keep internal scroll

### Task 8: Frame chrome on writeups + cipher console
**Files:** Modify `src/cipher-console.html`, `src/writeups/*.html`, `src/css/command-deck.css`.

- [ ] **Step 1:** Wrap these pages in the frame chrome but make `.deck-active` `overflow-y:auto` (a contained reading panel) — these are long-form and must scroll internally, not be clipped. Do NOT add `body{overflow:hidden}` clipping that hides their content; the inner panel scrolls.
- [ ] **Step 2:** Add a `.deck-active--scroll` modifier in `command-deck.css` for this case.
- [ ] **Step 3 (verify):** build; screenshot a writeup + cipher-console; `preview_eval` confirms the inner panel scrolls (`#deck-active.scrollHeight > clientHeight`) while `body` does not. Test Cipher Console EXECUTE still works (it does client→/api; locally shows graceful error).
- [ ] **Step 4:** Commit. `git commit -am "feat(deck): frame chrome on long-form pages with internal scroll"`

---

## Phase 7 — Responsive fallback

### Task 9: Mobile stacking
**Files:** Modify `src/css/command-deck.css`.

- [ ] **Step 1:** Add `@media (max-width: 768px)`: rail → top bar; `.deck-active` panels stack to one column; allow vertical scroll (`body.deck-page{overflow:auto}` within the query); hide or shrink radar + ticker. Use `100dvh` so mobile browser chrome doesn't clip.
- [ ] **Step 2 (verify):** `preview_resize preset mobile` (375×812) → screenshot each page; readable, stacked, scrollable, nothing clipped/overlapping.
- [ ] **Step 3:** Commit. `git commit -am "feat(deck): mobile stacked fallback"`

---

## Phase 8 — Accessibility, final verification, ship

### Task 10: Motion + a11y pass
**Files:** Modify `src/css/command-deck.css`, `src/js/command-deck.js`.

- [ ] **Step 1:** CSS: under `html[data-motion="reduce"]`, set radar `animation:none`, ticker `animation:none` (show a static line), cursor + uplink pulse `animation:none`. Ensure all decorative chrome (radar, hazard stripe, watermark, stamp, scanlines) has `aria-hidden="true"`.
- [ ] **Step 2:** Confirm one `<h1>` per page (identity), rail is `<nav>` with `aria-current`, links have visible `:focus-visible` rings, and amber/green/bone on `#070809` pass AA (`preview_eval` contrast helper from earlier; amber `#f0a818` on `#070809` ≈ 9:1).
- [ ] **Step 3 (verify):** `preview_resize colorScheme reduce` → `preview_eval` confirms radar/ticker not animating; tab order reaches rail links.
- [ ] **Step 4:** Commit. `git commit -am "feat(deck): reduced-motion + a11y pass"`

### Task 11: Full verification + merge + deploy
- [ ] **Step 1:** `npm run build:site` → "Site verification passed."; `grep -rE '#[0-9a-fA-F]{6}' src/css/command-deck.css` only intentional overlays.
- [ ] **Step 2:** Preview sweep: Home/About/Tools at 1280, 1440, 375 — screenshots; no page scroll on desktop for the three; no console errors (`preview_console_logs error`).
- [ ] **Step 3:** Update `docs/portfolio-backlog.md` (command deck shipped) and the `portfolio-direction` memory.
- [ ] **Step 4:** Merge to main + deploy (per user's choice at that time): `git checkout main && git merge --ff-only feat/command-deck && git push origin main`.
- [ ] **Step 5 (verify live):** after Vercel build, curl/preview `www.andraewilliams.com` — Home serves the deck; `og`/links intact.

---

## Self-Review (against spec)

**Spec coverage:** no-scroll frame → Task 1/9; six Home panels → Task 3/4; About/Tools → Task 6/7; long-form internal scroll → Task 8; operator aesthetic + theme-agnostic → Task 3/5; theater-over-content (real links/data in every panel) → Task 3/4/7; reduced-motion + a11y → Task 10; mobile → Task 9; live verify/deploy → Task 11. No gaps.

**Placeholders:** none — each task names files, the concrete change, a verification check with expected result, and a commit. Visual minutiae intentionally defer to the v5.1 mockup (named source of truth) rather than re-pasting the full stylesheet.

**Consistency:** `.deck` / `.deck-page` / `.deck-main` / `.deck-active` / `.deck-panel` / `#deck-clock` / `data-motion="reduce"` / theme `operator` used consistently across tasks.
