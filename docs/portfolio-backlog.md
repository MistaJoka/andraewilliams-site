# Portfolio Backlog

Ordered queue of agreed-upon work. Sequenced so each item makes the next
cheaper. Pick the top unstarted item and go.

## 0. Tactical Command Deck — DONE (2026-06-14, branch `feat/command-deck`)
No-scroll tactical command-center shipped: Home/About/Tools in the deck frame,
data panels wired, long-form pages with internal scroll, operator theme locked,
tactical 404, analytics hook, deployedAt in SYSTEMS panel.

## 1. Tier S polish pass — DONE (2026-06-14)
- [x] Fixed-footer overlap
- [x] PNG OG images
- [~] Contact / hire path — DROPPED

## 2. Existing-project writeups — DONE (2026-06-14)
- [x] Pretext Layout Lab, Smoke, Cipher Console writeups
- [ ] Optional later: DOPE Prompt Book writeup

## 3. Cipher Console build — DONE & LIVE (2026-06-14)

## 4. Tier B polish — DONE (2026-06-14)
- [x] SYSTEMS panel reads verify/commit/deployedAt from `site-status.json`
- [x] Tactical `404.html` (Vercel serves automatically from `_site/`)
- [x] Vercel Web Analytics via `src/js/analytics.js`
- [x] Docs hygiene (`docs/roadmap.md`, this file)
- [ ] **Manual:** Set Vercel primary domain to bare apex `andraewilliams.com` (Dashboard → Domains → make apex primary; canonical/OG already use apex)

## Next ideas
- New Tier 1 Python tools (Recon Lookup, Log Parser)
- DOPE Prompt Book writeup (needs owner input)
- CSS cleanup: prune dead `.page-home` rules in `style.css`
- Auth layer for private site
