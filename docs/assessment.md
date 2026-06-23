# Project Assessment — andraewilliams.com

_Date: 2026-06-23 · Branch: `claude/assessment-dirjrk`_

A point-in-time review of the codebase against the goals in
`docs/project_brief.md`. Build was run (`npm run build:site`) and passed
("Site verification passed", 4 tools). No code behavior was changed.

## Verdict

The site delivers on the brief: a live, free-to-host, custom-domain portfolio
with a coherent "operator command deck" identity, real custom tools, and an
honest, data-driven status surface. The static-first stack matches the stated
constraints (free tooling, MacBook-friendly, no graduate-level dependencies).
It is in good shape. The gaps are mostly polish, documentation drift, and
deferred ambitions (auth, tests, blog) — not defects.

## Strengths

- **Honest, data-driven home.** Deck panels render from committed JSON
  (`tools.manifest.json`, `mission.json`, `field-notes.json`) and a build-time
  `site-status.json`. Counts derive from data or show `unknown` — no fake green.
  This is the single best decision in the repo and is well executed.
- **Clean build pipeline.** `scripts/assemble-site.sh` + `verify-site.sh` give a
  reproducible `_site/` tree with a real guardrail: the manifest-drift check
  fails the build if `tools.html`'s "N live builds" count diverges from the
  manifest. CI-portable (uses `cp`, not `rsync`).
- **Real, varied tools.** Pretext Layout Lab (Vite), Smoke playground (canvas),
  Cipher Console (Python serverless), DOPE Prompt Book (external Next.js). Each
  has a case-study writeup; three are custom-built here.
- **Disciplined Python function.** `api/cipher.py` separates pure, testable
  `transform()` from the thin HTTP `handler`, validates op/mode/text, and uses
  stdlib only (no `requirements.txt`). Good instincts.
- **Documentation culture.** `docs/decisions.md` is a genuine ADR log with
  rejected alternatives; roadmap and backlog are kept current. Strong for a
  solo portfolio.
- **Accessibility & motion.** Reduced-motion is gated, theme/sidebar boot before
  paint to avoid flash, amber-on-black contrast is documented (~9:1).

## Gaps & risks (ranked)

1. **Stale README hosting line.** `README.md:3` still says "Deployed with GitHub
   Pages" while the rest of the file and `docs/decisions.md` correctly say
   Vercel. Roadmap line 8 marks Pages as superseded. Fix the one-liner — it is
   the first thing a visitor reads. _(Low effort, high visibility.)_
2. **Three open Dependabot PRs.** `sharp` 0.35.1→0.35.2 (patch, safe),
   `@chenglou/pretext` 0.0.4→0.0.8 (minor, review demos), `vite` 6→8 (**major**
   — could break `vite.config.js` / `vite.cards.config.js`; test the build
   before merging). All target `main`.
3. **Home/About/Tools content is JS-only.** Panels are empty (`// STANDBY`)
   until `command-deck.js` fetches JSON. There is no `<noscript>` fallback and
   crawlers/no-JS visitors see placeholders. Acceptable for a personal lab, but
   a static fallback or prerender would help SEO/sharing.
4. **No automated tests.** `transform()` is described as "unit-testable" but has
   no tests. A tiny `python3 -m unittest` over the four ops (round-trip +
   error cases) would be cheap insurance and good portfolio proof-of-rigor.
5. **`verify-site.sh` ignores `level-0/`.** The Level 0 subdomain site is
   shipped but not covered by the build guardrail; a missing/renamed file there
   would pass verification silently.
6. **Known CSS debt.** Backlog notes dead `.page-home` rules in `style.css`
   (4,400+ lines). Worth a prune pass to keep the CSS honest.

## Brief alignment

| Success criterion | Status |
|---|---|
| Functional website | ✅ Live, build green |
| Cool / sci-fi / nostalgic | ✅ Operator deck + 10 themes |
| Library of custom tools | ✅ 4 tools, 3 built here |
| Online portfolio | ✅ Writeups + source links |
| Log incremental changes | ✅ decisions/roadmap/backlog/field-notes |
| Access control (desired) | ⛔ Not started (backlog) |

## Recommended next steps

Cheapest-first, each unblocks the next:

1. Fix the README GitHub Pages line (1 line).
2. Merge `sharp` patch; test-then-merge `pretext` minor; handle `vite` major on
   a branch with a build check.
3. Add `tests/test_cipher.py` (stdlib `unittest`) and a `npm`/make hook to run
   it — converts a claim into proof.
4. Extend `verify-site.sh` to assert key `level-0/` files exist.
5. CSS cleanup pass on `style.css` (`.page-home` dead rules).
6. Then pick a Phase 3 item: notes/blog section, or scope the private-site auth
   layer the brief asks for (e.g. Vercel-edge gate on a subpath).

## Notes

- DNS in GoDaddy, hosting on Vercel, repo on GitHub — matches the brief's
  free-tooling constraint. The promptbook/level-0 subdomain pattern is a clean,
  repeatable way to add artifacts without complicating the main build.
</content>
</invoke>
