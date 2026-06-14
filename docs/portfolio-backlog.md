# Portfolio Backlog

Ordered queue of agreed-upon work. Sequenced so each item makes the next
cheaper. Pick the top unstarted item and go.

## 1. Tier S polish pass — DONE (2026-06-14)
- [x] **Fixed-footer overlap** — `.app-layout` switched to `display:block`,
  `.site-footer` now flows in-document at the bottom. Commit `66b8439`.
- [x] **PNG OG images** — `og/*.svg` rasterized to committed 1200×630 PNGs via
  `sharp` (`npm run og`); meta tags repointed. Also fixed stale "github pages"
  → "vercel" and U+FFFD chars → middle dots in the images. Commit `6636602`.
- [~] **Contact / hire path — DROPPED.** Site is **private/personal** ("just
  for me", auth planned), not a client-facing portfolio. No public contact
  path wanted. Do not reintroduce.

## 2. Existing-project writeups (do second — near-zero new code)
- Only Smoke Playground uses the writeup template
  (`src/writeups/smoke-playground.html`). Add goals / tradeoffs / what-I-learned
  writeups for the other live projects (start with Pretext Layout Lab).
- This establishes the Build Log pattern reused by Cipher Console below.

## 3. Cipher Console build (do last — needs usage headroom)
- Spec: `docs/superpowers/specs/2026-06-14-cipher-console-design.md` (approved
  design). Next step is the implementation plan (writing-plans skill).
- Tactical encoding tool (Base64/Hex/ROT13/URL) backed by a Python stdlib
  serverless function at `/api/cipher.py` — first Python-on-Vercel deploy.
- Ships with a Build Log writeup (`src/writeups/cipher-console.html`).
- One risk to confirm on first deploy: `/api/*.py` deploys alongside the custom
  build (`framework: null`, `outputDirectory: _site`).

## Lower-priority (Tier B, not yet scheduled)
- Wire hero `verify: unknown` to a real value.
- Flip Vercel primary domain to the bare apex (matches canonical/OG tags).
- Surface a "last deployed" timestamp from existing `site-status.json`.
- Custom tactical 404 page; free Vercel Web Analytics.
