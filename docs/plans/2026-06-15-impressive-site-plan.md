# Impressive Site Plan — Skill-First, No Pay-to-Win

**Date:** 2026-06-15  
**Status:** Active  
**Context:** Armory reset complete — only [DOPE Prompt Book](https://promptbook.andraewilliams.com) remains in `tools.manifest.json`. This plan defines how to rebuild impressiveness through craft, not subscriptions or templates.

---

## North star

> The site is an **operating system for proof-of-work** — status, mission, assets, field notes, tools, logs — wired to real files. Impressive means **usable, honest, and fast**, not motion theater.

Aligned with `docs/site-identity.md` and `docs/project_brief.md`:
- Free tools only (GitHub, Vercel free tier, Google Fonts)
- Plain HTML/CSS/vanilla JS for the main site
- Each addition must be buildable, explainable, and documentable

---

## What “no pay-to-win” means here

| Avoid | Do instead |
|-------|------------|
| Framer/Webflow/Spline templates | Custom command-deck UI you own |
| Fake live metrics | Build-time `site-status.json`, real commit/verify counts |
| 20 GitHub pins | 3–6 tools with case writeups |
| Premium UI kits | CSS variables, native platform APIs |
| AI-generated filler copy | Restrained operator voice + evidence nouns |

---

## Phase 0 — Reset (done)

- [x] `tools.manifest.json` — DOPE Prompt Book only
- [x] Removed Pretext Lab, Smoke Playground, Cipher Console from deploy
- [x] Cleared `lab.json`; updated mission, field notes, deck copy
- [x] Simplified build (no Vite/Pretext in CI)

---

## Phase 1 — Foundation polish (1–2 sessions) — IN PROGRESS

**Goal:** Make the existing deck feel intentional with modern platform CSS — no new tools yet.

### 1.1 Modern CSS layer — DONE (2026-06-15)

- [x] `@layer deck` in command-deck.css; layer order in style.css
- [x] Container queries on `.deck-panel` and `.deck-tool-tile`
- [x] View Transitions API + `same-origin` meta on deck pages
- [x] Speculation Rules prefetch on rail hover/focus
- [x] `color-mix()` already used on deck borders/hovers

### 1.2 Honest empty states — DONE (2026-06-15)

- [x] Solo armory layout (`.deck-active--tools-solo`, hero tile)
- [x] Home ASSETS: external ↗ indicator, `NEXT SLOT // UNASSIGNED` placeholder
- [x] Tools page: unassigned slot placeholder

### 1.3 DOPE Prompt Book writeup — DONE (2026-06-15)

- [x] `writeups/dope-promptbook.html` shipped
- [x] Manifest `writeup` field linked
- [x] Field note entry added

---

## Phase 2 — First new tool (2–3 sessions)

**Goal:** One new asset that proves a skill domain. Pick **one**:

| Option | Skill signal | Stack fit |
|--------|--------------|-----------|
| **Recon Lookup** | OSINT / API integration / input validation | Static HTML + fetch to free API or serverless |
| **Log Parser** | Text processing / regex / UX for operators | Vanilla JS, no backend |
| **Access gate** | Security / auth patterns | Vercel middleware or edge function, minimal scope |

**Process (every tool):**

```
1. Spec in docs/plans/ (problem, scope, out-of-scope)
2. Ship smallest working slice
3. Add to tools.manifest.json
4. Write case file in src/writeups/
5. Field note entry
6. Verify build + manual smoke test
```

**Acceptance:** Manifest shows 2 live tools; both have writeups or external repo links.

---

## Phase 3 — Platform craft (ongoing)

**Goal:** Techniques that signal “reads the platform,” not “bought the template.”

### 3.1 Build pipeline

- CI fails if `tools.manifest.json` count ≠ `tools.html` comment (already in `verify-site.sh`)
- Auto field-note stub on new tool (optional script)
- OG image regen when mission/tools change (`npm run og`)

### 3.2 Performance budget

- Main pages: &lt; 100KB transfer (excluding fonts)
- No JS on pages that don’t need it
- Self-host or subset fonts when ready

### 3.3 Progressive enhancement

- Deck panels show static fallback before JS hydrates
- Tools page works with manifest fetch failure → clear error state

---

## Phase 4 — Optional depth (when ready)

| Item | Notes |
|------|-------|
| Private `/ops` route | Minimal auth — HTTP basic, signed cookie, or Vercel password protect |
| Pretext lab return | Re-introduce only if a tool needs it; Vite sub-app pattern documented in decisions |
| Server-backed apps | One at a time; Python or Node serverless on Vercel free tier |
| CSS dead-code prune | `.page-home`, `.home-arsenal-*` rules in `style.css` from pre-deck layout |

---

## Sequenced backlog

| # | Task | Depends on | Est. |
|---|------|------------|------|
| 1 | DOPE Prompt Book writeup | Phase 0 | 2h |
| 2 | Tools page single-asset layout polish | Phase 0 | 1h |
| 3 | View Transitions between deck pages | — | 2h |
| 4 | Container queries on deck panels | — | 1h |
| 5 | Pick + spec first new tool | Writeup done | 1h |
| 6 | Build + ship first new tool | Spec | 4–8h |
| 7 | Speculation Rules prefetch | View Transitions | 30m |
| 8 | Font self-host / subset | — | 1h |

---

## Definition of done (whole plan)

- [ ] 2+ tools in manifest, each with writeup or honest external link
- [ ] Home ASSETS + Tools armory feel intentional at any count
- [ ] Lighthouse ≥ 95 performance on Home/Tools
- [ ] View Transitions or equivalent native navigation polish
- [ ] DOPE Prompt Book case file published
- [ ] No paid services required to maintain or extend
- [ ] Every badge/metric traceable to a file or build step

---

## What we’re not doing

- Rewriting in React/Next for the main site
- 3D/WebGL hero unless a tool genuinely needs it
- Fake metrics, lorem projects, or “hire me” copy
- Feature sprawl before the second tool ships

---

## Next action

**Start Phase 1.3:** Draft DOPE Prompt Book writeup — it’s the only live asset and the highest-leverage proof point until tool #2 ships.
