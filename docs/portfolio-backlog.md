# Portfolio Backlog

Ordered queue of agreed-upon work. Sequenced so each item makes the next
cheaper. Pick the top unstarted item and go.

## 0. Tactical Command Deck — IN PROGRESS (branch `feat/command-deck`)
No-scroll, single-screen tactical command-center redesign. **Phase 1 (frame +
operator theme) DONE; Phases 2–8 remain.** Full continuation guide (state, next
steps, data hooks): **`docs/command-deck-handoff.md`**. Spec + plan in
`docs/superpowers/`. Do not merge to main until shipped.

## 1. Tier S polish pass — DONE (2026-06-14)
- [x] **Fixed-footer overlap** — `.app-layout` switched to `display:block`,
  `.site-footer` now flows in-document at the bottom. Commit `66b8439`.
- [x] **PNG OG images** — `og/*.svg` rasterized to committed 1200×630 PNGs via
  `sharp` (`npm run og`); meta tags repointed. Also fixed stale "github pages"
  → "vercel" and U+FFFD chars → middle dots in the images. Commit `6636602`.
- [~] **Contact / hire path — DROPPED.** Site is **private/personal** ("just
  for me", auth planned), not a client-facing portfolio. No public contact
  path wanted. Do not reintroduce.

## 2. Existing-project writeups — DONE (2026-06-14)
- [x] Pretext Layout Lab writeup (`src/writeups/pretext-layout-lab.html`), wired
  via manifest + Tools card routes to the case study. Commit `dedc591`.
- [ ] Optional later: DOPE Prompt Book writeup (external Next.js app — needs the
  owner's input on that codebase; deliberately not invented).

## 3. Cipher Console build — DONE & LIVE (2026-06-14)
- [x] `api/cipher.py` (stdlib serverless), `cipher-console.html` + JS, themed CSS,
  manifest entry (tools → 4), Tools card 04, AI build log. Commit `dedc591`.
- [x] **Verified live**: `POST /api/cipher` returns correct transforms on
  www.andraewilliams.com; bad input returns a 400 error, not a 500.
- Resolved: `/api/*.py` DOES deploy alongside the custom build
  (`framework: null`, `outputDirectory: _site`) — confirmed in production.

## Backlog clear — all items shipped. Next ideas: Tier B polish (verify stat,
## apex-primary domain, last-deployed timestamp, 404 page, analytics) or new
## Tier 1 Python tools (Recon Lookup, Log Parser) per portfolio-direction memory.

## Lower-priority (Tier B, not yet scheduled)
- Wire hero `verify: unknown` to a real value.
- Flip Vercel primary domain to the bare apex (matches canonical/OG tags).
- Surface a "last deployed" timestamp from existing `site-status.json`.
- Custom tactical 404 page; free Vercel Web Analytics.
