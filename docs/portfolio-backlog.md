# Portfolio Backlog

Ordered queue of agreed-upon work. Sequenced so each item makes the next
cheaper. Pick the top unstarted item and go.

## 1. Tier S polish pass (do first — ~40 min, highest credibility/effort)
Three independent quick wins, ship together:
- **Fix the fixed-footer overlap.** `.site-footer` is `position: fixed` with
  its left edge equal to the content column, so `andraewilliams.com` overlaps
  card text on every page. See `src/css/style.css:888`. Make it in-flow, or
  keep it fixed with a solid backdrop + page `padding-bottom`.
- **Real PNG OG image.** `og:image`/`twitter:image` point at `og/home.svg`;
  X/LinkedIn/Slack/iMessage don't render SVG → blank link previews. Produce a
  1200×630 PNG per page and update the meta tags.
- **Contact / hire path.** Transmission section only links GitHub. Add email +
  LinkedIn + a resume PDF so a potential client has a clear next step.

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
