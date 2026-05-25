---
name: vibe-coding
description: >-
  Guides incremental, momentum-first development on andraewilliams.com.
  Use for any task in this repo — features, fixes, styling, tools, docs —
  when the user is vibe coding, building the site, or working in src/ or docs/.
---

# Vibe Coding — andraewilliams.com

Personal portfolio + lab. Sci-fi inspired, beginner-friendly, ship small wins.

## Before coding

1. Read `AGENTS.md` for working style (small diffs, teach through code, flag assumptions).
2. Skim `docs/project_brief.md` for goals and constraints (free tools, MacBook M5, GitHub Pages).
3. Check `docs/decisions.md` before changing stack or hosting.

## Stack (don't fight it)

| Layer | Choice |
|-------|--------|
| Main site | Plain HTML, CSS, vanilla JS in `src/` |
| Build | None for main pages — open or `python3 -m http.server` |
| Bundler | Vite **only** for Pretext demos under `src/pretext-smoke/` |
| Deploy | GitHub Actions → GitHub Pages; `src/CNAME` = andraewilliams.com |
| Text metrics | Pretext when DOM measurement won't scale — see `docs/pretext.md` |

**Avoid unless asked:** React, Next.js, Tailwind, Bootstrap, paid services.

## Repo map

```
src/           → live site root (HTML, css/, js/)
src/pretext-smoke/  → Vite + Pretext source (built in CI)
docs/          → brief, roadmap, decisions, plans
```

## Commands

```bash
# Preview main site
cd src && python3 -m http.server 8080

# Pretext demo dev
npm install && npm run dev:pretext

# Pretext production build (matches CI)
npm run build:pretext
```

## Vibe-coding rules

1. **Smallest working slice first** — one page, one component, one interaction.
2. **Match existing patterns** — sidebar layout, nav links, CSS variables in `src/css/style.css`.
3. **No drive-by refactors** — touch only what the task needs.
4. **Verify locally** — open the page or run the relevant npm script before calling it done.
5. **End with a next step** — one concrete follow-up the user can pick up later.

## When to update docs

- Architectural choice → append to `docs/decisions.md`
- New feature plan → add under `docs/plans/` if non-trivial
- Roadmap milestone done → check off in `docs/roadmap.md`

## Definition of done

- Feature works in local preview
- Code is readable; names are clear
- Files sit in the right folder
- User knows what to build next
