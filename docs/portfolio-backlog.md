# Portfolio Backlog

Ordered queue of agreed-upon work. Sequenced so each item makes the next
cheaper. Pick the top unstarted item and go.

## 0. Tactical Command Deck — DONE (2026-06-14)
No-scroll tactical command-center shipped: Home/About/Tools in the deck frame,
data panels wired, long-form pages with internal scroll, operator theme locked,
tactical 404, analytics hook, deployedAt in SYSTEMS panel.

## 1. Tier S polish pass — DONE (2026-06-14)
- [x] Fixed-footer overlap
- [x] PNG OG images
- [~] Contact / hire path — DROPPED

## 2. Existing-project writeups — SUPERSEDED (2026-06-15)
Lab tools removed from armory. Writeups archived with deleted pages.

## 3. Cipher Console — REMOVED (2026-06-15 armory reset)

## 4. Tier B polish — DONE (2026-06-14)
- [x] SYSTEMS panel reads verify/commit/deployedAt from `site-status.json`
- [x] Tactical `404.html`
- [x] Vercel Web Analytics via `src/js/analytics.js`
- [ ] **Manual:** Set Vercel primary domain to bare apex `andraewilliams.com`
- [x] **Manual:** Add `level0.andraewilliams.com` in Vercel (done 2026-06-15)
- [ ] **Manual:** GoDaddy A record `level0` → `76.76.21.21`

## 5. Armory reset — DONE (2026-06-15)
- [x] `tools.manifest.json` — DOPE Prompt Book only
- [x] Removed Pretext Lab, Smoke Playground, Cipher Console from deploy
- [x] Simplified build (no Vite/Pretext in CI)
- [x] Plan: `docs/plans/2026-06-15-impressive-site-plan.md`

## Active plan — Impressive site (no pay-to-win)

See **`docs/plans/2026-06-15-impressive-site-plan.md`**.

**Next up (Phase 2):**
1. Spec first new on-site tool (Recon Lookup or Log Parser)
2. Ship tool #2 + writeup
3. Font self-host / subset (optional perf pass)

## Later ideas
- Access gate for private `/ops`
- CSS cleanup: prune dead `.page-home` / `.home-arsenal-*` rules
- Font self-host / subset
