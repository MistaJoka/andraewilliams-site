# Design System — andraewilliams.com

Operator console aesthetic: dark cockpit, precise, data-forward. Sci-fi *function*, not sci-fi *costume*.

Historical reference: [2026-03-07 cyberpunk redesign plan](plans/2026-03-07-cyberpunk-redesign.md).

## Principles

1. **Utility over decoration** — every visual element signals state, structure, or action.
2. **Density where it matters** — home sections are compact; Tools page allows slightly more air.
3. **Honest indicators** — green means verified/live; unknown is labeled, not faked; red is alerts only.
4. **Restraint** — one accent action per viewport. No glow stacks.
5. **Accessibility** — semantic HTML, contrast, `prefers-reduced-motion`, ARIA on toggles and nav.

## Archetype-driven visual rules

Visual design follows the five clusters in [site-identity.md](site-identity.md) — function, not costume.

| Cluster | Visual expression |
|---------|-------------------|
| **Builder / inventor** | Real artifacts visible: arsenal cards, live links, repo paths. Panels look like instrument readouts, not concept art. |
| **Analyst / observer** | Mono labels, status strip, field note cards. Information density where data lives. |
| **Field operator** | Flat glass surfaces, high contrast, no fragile effects on home. Status badges honest. |
| **Strategist / curator** | One accent per panel. Hierarchy is deliberate — hero → mission → arsenal → lab → notes → transmission. |
| **Legacy architect** | Restraint in motion, color, and chrome. Gold accent for control/legacy markers. |

### Visual tone

- **Calm:** dark base, muted labels, no pulsing defaults
- **Sharp:** 1px borders, mono labels, aligned columns
- **Controlled:** electric blue primary action; teal secondary; bronze for legacy/premium markers
- **Strategic:** vertical home scroll — operational sections before narrative sprawl
- **Quietly impressive:** status strip and arsenal are the flex; no hero illustration required

### Identity guardrails (visual)

- No character-adjacent UI: arc-reactor glow, tactical HUD crosshairs, crime-drama typography
- No luxury-villain gold-on-black defaults — bronze accent (`#B88A3C`) is used sparingly for legacy/premium markers
- Window chrome dots: subtle only — not OS cosplay

## Layout

- Fixed left sidebar rail — **52px collapsed by default**, 200px expanded (desktop)
- Toggle persists via `localStorage.site-sidebar`; theme via `ui.palette` in Lab + expanded sidebar
- Mobile: sidebar collapses to top bar
- **Home (Operator's Lab):** vertical scroll — hero, mission, arsenal, lab, field notes, transmission
- **Tools / About:** existing card/section layout until migrated
- Reuse: `.app-layout`, `.sidebar`, `.sidebar-nav`, `.nav-link`

## Color tokens

Default palette: **Graphite Command Pro**. Ten tactical palettes are available via the theme switcher (`ui.palette` in Lab + sidebar). Theme persists in `localStorage` under `site-theme`; set on `<html data-theme="…">` before paint.

### Semantic tokens (every theme defines these)

| Token | Default (Graphite Command Pro) | Use |
|-------|----------------------------------|-----|
| `--bg` | `#080A0D` | Page background |
| `--surface` | `#11161D` | Sidebar, cards |
| `--panel` | `#1A212A` | Raised containers |
| `--panel-raised` | `#202936` | Elevated panels |
| `--border` | `#263241` | Dividers, outlines |
| `--sidebar-w` | 52px collapsed / 200px expanded | Left rail width |
| `--text` | `#E6EDF3` | Body text |
| `--text-muted` | `#8A95A3` | Labels, dim lines |
| `--text-faint` | `#64748B` | Tertiary text |
| `--primary` | `#2979FF` | Main CTA, active nav, lab accent, links |
| `--secondary` | `#0D9488` | Secondary actions, info, ghost hovers |
| `--accent` | `#B88A3C` | Premium / legacy — mission, field notes, role words |
| `--success` | `#228B22` | Verified / complete states |
| `--warning` | `#CC5500` | Needs attention |
| `--danger` | `#B23A48` | Errors, fetch failures |
| `--info` | `#0D9488` | Helpful notices |

### Usage ratio

~75% dark surfaces · ~5–8% primary · ~4–6% secondary · ~2–4% bronze accent · status colors only where state demands.

Accent usage: **blue for intelligence/action, teal for secondary/info, bronze for legacy/control**. Red only for alerts. One primary hue per panel.

### Available themes

| Slug | Name |
|------|------|
| `graphite-command-pro` | Graphite Command Pro (default) |
| `graphite-command` | Graphite Command |
| `navy-forge` | Navy Forge |
| `midnight-bronze` | Midnight Bronze |
| `olive-operator` | Olive Operator |
| `plum-elegance` | Plum Elegance |
| `steel-depth` | Steel Depth |
| `ember-drive` | Ember Drive |
| `forest-depth` | Forest Depth |
| `cyber-teal` | Cyber Teal |
| `monochrome-elite` | Monochrome Elite |

Theme definitions: [`src/css/themes.css`](../src/css/themes.css). Switcher: [`src/js/theme.js`](../src/js/theme.js).

OG images and favicon use Graphite Command Pro only (static assets).

## Typography

| Role | Font | Notes |
|------|------|-------|
| Heading | Rajdhani | Page titles, section headers — condensed command presence |
| Body | Inter | Interface copy, descriptions |
| Mono | JetBrains Mono | Labels, status, registry, logs, metrics |

**Home Operator's Lab:** heading (name), mono (roles, labels, status), body (main/sub lines).

- Body line-height: `1.6`
- Section labels: uppercase, letter-spaced
- Tabular numbers on metrics via `font-variant-numeric: tabular-nums`

## Components

### Status badge (sidebar)

- Format: `// verify:pass`, `// local`, `live`, `wip`, `static`
- Mono, small caps optional via letter-spacing
- Pulsing dot **only** when status is verified live (not decorative default)

### Status strip (home hero)

- Compact horizontal mono: `stack · commit · verify · tools`
- Glass background, no terminal chrome
- Fetch failure → `--alert` text, not fake green

### Glass card (`.glass-card`)

- `--surface-glass` + blur
- Used for: mission, field notes, transmission
- Left accent bar: bronze (notes, mission) or none (transmission)

### Section header (`.home-section-head`)

- Mono label: `current.mission`, `arsenal`, `lab`, `field.notes`, `transmission`
- Display title below label

### Arsenal card (`.home-arsenal-card`)

- Extends `.tool-card` with bronze index numbers
- No scale hover on home — border/color transitions only
- Links row: open + case file

### Lab card (`.lab-card`)

- Electric blue left accent bar — workshop feel
- Toggle card for ambient smoke; link cards for live demos

### Field note card (`.field-note-card`)

- Bronze left accent, mono date, title, summary, tags
- Optional case file link

### Transmission (`.transmission-card`)

- Simple link list — bronze labels, blue targets
- No contact-form desperation

### Diagnostic panel (legacy — inner pages)

- Flat surface, 1px border
- Header: mono label (`sys.status`, `tool.registry`, `log.decisions`)

### Nav

- Active: left accent bar + primary text (no bounce on home)
- `aria-current="page"` on active link

## Motion

| Context | Rule |
|---------|------|
| **Home** | No entrance animation. Instant data exposure. |
| **Tools / About** | Optional stagger reveal; respect `prefers-reduced-motion` |
| **Hover** | Color/border transitions only — 150–200ms |
| **Smoke (lab toggle)** | Off by default. User opt-in. |
| **Nav** | No micro-bounce on home |

No animation libraries. CSS transitions only.

## Grid overlay

- Subtle grid on home (`grid-overlay--dim`)
- Optional on inner pages

## Spacing

- Home section gap: `clamp(2rem, 5vh, 3.5rem)`
- Panel padding: `1rem–1.35rem`
- Avoid hero-scale vertical padding

## Responsive

- Mobile-first: single column arsenal and notes grids
- `overflow-x: hidden` on body and home sections
- `minmax(0, 1fr)` grids — no horizontal scroll from cards

## Files

- Global styles: [src/css/style.css](../src/css/style.css)
- Theme palettes: [src/css/themes.css](../src/css/themes.css)
- Theme switcher: [src/js/theme.js](../src/js/theme.js)
- Home layout: [src/index.html](../src/index.html)
- Identity voice: [site-identity.md](site-identity.md)
- Content structure: [content-model.md](content-model.md)
