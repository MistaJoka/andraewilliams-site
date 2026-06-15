# Tactical Command Deck — Redesign Spec

**Date:** 2026-06-14
**Status:** Approved design (v5.1 mockup locked), pre-implementation
**Project:** andraewilliams.com — convert the site to a no-scroll, single-screen
tactical command center.

## Goal

Replace the current long, vertically-scrolling pages with a fixed **command
deck**: a single-viewport "mission control" where every readout is visible at
once, the page itself never scrolls, and the visual language is an elite
military/intel "operator" aesthetic. Scope is the **whole site** (Home, About,
Tools share one frame).

Success = on desktop, Home/About/Tools each fit one screen with no page scroll;
the deck feels badass and intentional (not cluttered); and real content
(identity, projects, navigation, links) stays legible underneath the theater.

## Principles

1. **No page scroll on desktop.** `body` is fixed to the viewport. Orientation
   comes from the persistent frame, not from scrolling.
2. **Theater over real content — never instead of it.** Decorative chrome
   (radar, ticker, CLASSIFIED stamp, redaction, classification banner) is a
   layer *around* real, working content. Name, projects, links, and nav must be
   immediately legible. This is the hard rule that keeps it elite, not cosplay.
3. **Disciplined signal language.** One accent system: amber = primary/identity,
   green = go/secure/online, red = rare threat (used only where it means
   something). No rainbow.
4. **Restraint = elite.** Calm, purposeful motion; sharp geometry; dense but
   organized. Adding more is usually wrong.

## Layout architecture — the Command Frame

A fixed `100vh` CSS grid, identical chrome on every page:

```
┌ rail ┬──────── command-prompt header (boot line · threat flag) ────────┐
│      ├──────────────── hazard stripe (thin) ─────────────────────────────┤
│      ├──────── classification banner (clearance · grid · Zulu clock) ────┤
│ nav  │                                                                   │
│ H    │                   ACTIVE REGION (per-page panels)                 │
│ A    │                                                                   │
│ T    ├──────────────── intel ticker (scrolling) ───────────────────────┤
│      ├──────────────── status bar (uplink · scroll-disabled · status) ──┤
└──────┴───────────────────────────────────────────────────────────────────┘
```

- `body { overflow: hidden }` on desktop; the frame is `100vh`/`100dvh`.
- Rail, header, banner, ticker, and status bar are **real grid regions**, not
  `position: fixed` overlays (avoids the old footer-overlap class of bug).
- Only the **active region** differs between pages.

## Home — the bento deck (active region)

Six panels in a bento grid (`grid-template-columns: 1.55fr 1fr 1fr`,
`rows: 1fr 1fr 0.7fr`), all visible at once:

| Panel | Source data | Content |
|-------|-------------|---------|
| `DOSSIER` (hero, spans 2 rows) | static identity + `mission.json` | callsign MISTAJOKA, name, designation, reticle photo block, barcode + ID, ghosted `001` watermark, CLASSIFIED stamp, corner bracket, `ACTIVE OP` = current mission |
| `ASSETS` (spans 2 rows) | `tools.manifest.json` | the 4 live tools with status dots, "ACCESS ARMORY →" to Tools |
| `SCAN` | none (signature theater) | rotating radar sweep + contacts; static still under reduced-motion |
| `SYSTEMS` | `site-status.json` | deploy/integrity/commit + `scroll: locked` |
| `OPS.LOG` | `field-notes.json` / `decisions.md` | 2 most-recent entries with Zulu dates |
| `SECURE.COMMS` (spans 2 cols) | static channel config | github / source / net, `● ENCRYPTED` |

**Lab is not a separate panel** — the eight demos live under the Pretext Lab
asset (`ASSETS` 01 → its writeup/lab), resolving the orphaned-panel slop.

If a panel's data exceeds its box, the **panel** scrolls internally (a styled,
contained feed) — the page never does.

## About & Tools (same frame, own active region)

- **About:** 2–3 framed panels in the same aesthetic — origin, mission/vibe,
  principles — fitting one screen.
- **Tools:** the asset tiles (from `tools.manifest.json`) as the active region;
  4 tiles fit one screen, no scroll.

## Long-form pages (writeups, cipher console)

These keep the **frame chrome** for consistency but their center region is an
**internally-scrollable reading panel** — case studies and the console are
inherently long, so forcing zero-scroll there would hurt them. "No page scroll"
is a desktop rule for Home/About/Tools; long-form uses contained scroll.

## Visual language (v5.1 operator aesthetic)

- **Palette:** base `#070809`/`#080a0d`; bone text `#d8d4c8`; muted `#8a8778`;
  dim `#5c5a4f`; amber `#f0a818` (primary); green `#4ade80` (go); red `#e0322f`
  (rare threat). Borders warm-charcoal `#2d2f2a`.
- **Type:** monospace throughout (`JetBrains Mono`), uppercase + wide tracking
  for labels; weight 400/500 only.
- **Geometry:** sharp corners (`radius: 2–3px`), hairline grid background, faint
  CRT scanline overlay, corner brackets on the hero.
- **Chrome:** command-prompt boot line with one blinking cursor; `THREAT //
  GUARDED` flag; amber/black hazard stripe; `CLEARANCE: OPERATOR // EYES ONLY`
  banner (stylized/fictional — no real classification markings or agency
  marks); Zulu clock; redaction bars; rotated red `CLASSIFIED` stamp; barcode.
- **Motion (exactly four):** blinking prompt cursor, rotating radar sweep,
  scrolling intel ticker, pulsing uplink dot. Nothing else moves.

## Theme system

The site has a theme picker (`themes.css`). The **command-frame layout is
theme-agnostic** (structure). Ship a new default **"Operator"** theme = the
v5.1 amber palette; existing themes still swap and recolor the same deck via the
token variables. Panels read color from tokens, never hardcoded hex.

## Responsive

Desktop-first. Below ~768px the frame degrades: rail → top bar, panels stack to
one column, the radar/ticker may hide, and **normal vertical scroll is allowed**
(a dense cockpit can't fit a phone). The no-scroll deck is the desktop
experience.

## Accessibility

- `prefers-reduced-motion: reduce` disables the radar spin, ticker scroll,
  cursor blink, and uplink pulse (static stills remain).
- Real semantics: one `<h1>` (identity), `<nav>` rail with `aria-current`,
  landmark regions, real `<a>` links. Decorative chrome gets `aria-hidden`.
- Contrast: bone/amber/green on near-black all clear AA; red used on dark only
  for non-text indicators or large glyphs. Verify the amber-on-black labels.
- Keyboard: rail nav and all links focusable with visible focus rings.

## Implementation approach

Multi-page, shared frame (keeps URLs, SEO, static deploy). New/changed:

- `css/command-deck.css` (or a large section in `style.css`): the frame grid,
  bento panels, operator chrome, scanlines, sharp tokens.
- `themes.css`: add the `operator` theme; make it default.
- Restructure `index.html`, `about.html`, `tools.html` into the frame + panels.
- `js/command-deck.js`: Zulu clock tick, ticker, radar (CSS-driven), and the
  `prefers-reduced-motion` gate. Reuse existing panel data loaders
  (`home-mission.js`, `home-arsenal.js`, `home-field-notes.js`,
  `status-panel.js`) — reorganized into panels, not rewritten.
- Data unchanged: `mission.json`, `tools.manifest.json`, `field-notes.json`,
  `lab.json`, `site-status.json`, `decisions.md`.
- The footer-overlap fix already shipped is superseded by the new frame footer.

## Out of scope (YAGNI)

- No single-page-app router; pages stay separate HTML.
- No new backend; no changes to the Cipher Console function.
- Writeups/console keep their current internal layout (just gain frame chrome).
- No real classification markings, agency seals, or named real-person references
  — operator language is stylized and fictional.

## Risks

1. **Density vs legibility** — six panels + chrome on one screen can crowd.
   Mitigation: the theater-over-content rule; generous internal panel padding;
   test at 1280px and 1440px.
2. **Theme interaction** — panels must read every color from tokens so non-
   Operator themes don't break. Mitigation: zero hardcoded hex in panel CSS.
3. **Mobile** — the deck can't be no-scroll on a phone; the stacked fallback
   must still look intentional, not broken.
4. **Content that grows** — OPS.LOG / ASSETS may outgrow their boxes over time;
   contained internal scroll handles it without breaking the frame.
