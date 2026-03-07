# Architecture Decisions

A lightweight log of key decisions and why they were made.

---

## 2026-03-07 — Stack: HTML + CSS + Vanilla JS

**Decision:** Start with plain HTML, CSS, and JavaScript. No framework yet.

**Why:**
- Zero build tooling means instant feedback and no config overhead.
- Forces real understanding of how the web works before abstractions.
- GitHub Pages hosts static files for free with no setup.
- Easy to upgrade to Vue.js in Phase 3 without rewriting everything.

**Rejected alternatives:**
- React — JSX and build tools add unnecessary complexity at this stage.
- Next.js — Overkill for a static portfolio site.
- Bootstrap/Tailwind — Hides CSS fundamentals behind utility classes too early.
- WordPress — Not a codebase; nothing to show on GitHub.

---

## 2026-03-07 — Hosting: GitHub Pages

**Decision:** Deploy directly from this repo using GitHub Pages.

**Why:**
- Free, reliable, and already connected to the codebase.
- No separate deployment pipeline needed for Phase 1.
- Supports custom domains (andraewilliams.com).

---

## 2026-03-07 — Folder Structure: src/ + docs/

**Decision:** Keep all site code in `src/`, all planning docs in `docs/`.

**Why:**
- Clean root directory from day one.
- Easy to understand where things belong as the project grows.
- Matches professional project conventions without over-engineering.
