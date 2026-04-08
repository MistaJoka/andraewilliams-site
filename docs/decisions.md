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

---

## 2026-04-07 — Text measurement: Pretext when we leave “DOM guesswork”

**Decision:** When a feature needs **accurate multiline text metrics or line breaking** without repeated DOM measurement, use **[Pretext](https://github.com/chenglou/pretext)** (`@chenglou/pretext`) and follow **`docs/pretext.md`**.

**Why:**
- Avoids reflow-heavy APIs (`getBoundingClientRect`, `offsetHeight`, etc.) for hot paths like virtualization, canvas text, or width probing.
- Keeps font-driven behavior aligned with canvas measurement, with a documented API instead of ad hoc hacks.

**Constraints:**
- Pretext is an npm package; adopting it for a shipped feature implies introducing a **minimal bundler** (or a deliberate ESM strategy). The static Pages setup stays until that feature lands.
- **`src/pretext-smoke`** exercises Pretext locally via Vite (`npm run dev:pretext`). Deploy excludes that folder so production stays a plain static tree.

**Rejected for that job (defaults):**
- Measuring the same text in a hidden DOM node on every frame — simple but does not scale and couples layout to the main document.
