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

---

## 2026-05-25 — Identity: Operator command center + honest status

**Decision:** Reframe the site as a builder/analyst/operator command center. Home exposes `sys.status`, `tool.registry`, and `log.decisions` from real files — not marketing hero copy or decorative stats.

**Why:**
- Proof-of-work and decision logs carry more weight than portfolio onboarding.
- Static site stays honest: build-time `site-status.json`, committed `tools.manifest.json`, copied `decisions.md`.
- Utilitarian home (no entrance animations, smoke off by default) matches the identity docs in `docs/site-identity.md`, `docs/design-system.md`, and `docs/content-model.md`.

**Constraints:**
- Badges and counts must derive from data or show `unknown` — never fake green.
- Narrative stays on About and case files; home stays system voice.

**Rejected alternatives:**
- Fake live metrics or a backend API for a static GitHub Pages site.
- Keeping hero taglines, dual CTAs, and `∞ Experiments` as primary home content.

---

## 2026-05-25 — Homepage: Operator's Lab six-section layout

**Decision:** Rebuild home as Operator's Lab — Command Center hero, Current Mission, Arsenal, Lab, Field Notes, and Transmission. Data-driven sections use committed JSON; hero copy is specific and restrained.

**Why:**
- Hero states role and intent without generic portfolio filler.
- Mission, arsenal, lab, and field notes are editable via JSON without HTML changes.
- Honest status strip replaces decorative stats; sidebar badge still derives from `site-status.json`.
- Visual system uses Graphite Command Pro by default — electric blue (action), teal (secondary), bronze (legacy/premium); red for alerts only. Ten palettes switchable via `data-theme`.

**Constraints:**
- Static HTML/CSS/vanilla JS — no framework on main site.
- Badges and counts must derive from data or show `unknown` — never fake green.
- No character references, cosplay, or theme LARP in UI copy or visuals.
- Home cards: border/color hover only — no scale transforms.

**Data files:**
- `src/data/mission.json` — current build focus
- `src/data/field-notes.json` — short build log cards
- `src/data/lab.json` — workshop experiments
- `src/data/tools.manifest.json` — extended with `purpose`, `type`, `description`

**Supersedes:** Partial override of earlier same-day decision to use zero hero copy — user-approved Command Center hero with main/sub lines is now canonical (see `docs/content-model.md`).

**Rejected alternatives:**
- Raw `log.decisions` `<pre>` dump as primary home content (moved to field notes + raw link).
- Registry table on home (replaced by arsenal cards).
- Smoke toggle in sidebar (relocated to Lab section).

---

## 2026-05-25 — Tactical palette system + theme switcher

**Decision:** Replace the cyberpunk cyan/violet palette with a normalized semantic token system (Graphite Command Pro default) and ten switchable tactical themes via `data-theme` on `<html>`.

**Why:**
- Restrained command-center aesthetic: dark surfaces (~75%), one dominant accent, status colors only where needed.
- Semantic tokens (`--primary`, `--secondary`, `--accent`, `--danger`, etc.) map consistently across palettes for reuse in future apps.
- Theme switcher in Lab + sidebar validates palette layer without build tooling.

**Implementation:**
- [`src/css/style.css`](../src/css/style.css) — base tokens + component rules
- [`src/css/themes.css`](../src/css/themes.css) — ten `[data-theme]` palette blocks
- [`src/js/theme.js`](../src/js/theme.js) — switcher + `localStorage` persistence
- Inline head script prevents theme flash on load

**Rejected alternatives:**
- Tailwind theme config — not in stack; vanilla CSS variables only.
- Dynamic OG images per theme — static social previews use default palette only.

---

## 2026-05-25 — Elite tactical UI + collapsed sidebar rail

**Decision:** Apply master tactical design tokens (Rajdhani/Inter/JetBrains Mono, 8px spacing, structured borders/shadows) and default the sidebar to a **52px collapsed rail** with expand toggle.

**Why:**
- Aligns visual language with command-center / ops workstation spec — sharp, dense, controlled.
- Collapsed rail maximizes workspace; full sidebar available on demand.
- Typography split: headings command, body explains, mono proves.

**Implementation:**
- Design tokens in [`src/css/style.css`](../src/css/style.css)
- [`src/js/sidebar.js`](../src/js/sidebar.js) — `localStorage.site-sidebar`, default `collapsed`
- Head boot sets `data-sidebar` before paint (with theme boot)
