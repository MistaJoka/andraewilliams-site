---
name: site-design
description: >-
  Applies the operator-console design system for andraewilliams.com — colors,
  typography, sidebar layout, diagnostic panels, registry tables. Use when styling
  pages, tweaking CSS, adding UI components, or matching the command-center aesthetic.
---

# Site Design System

Full spec: `docs/design-system.md`  
Identity voice: `docs/site-identity.md`  
Content structure: `docs/content-model.md`

Historical: `docs/plans/2026-03-07-cyberpunk-redesign.md`

## Layout

- Fixed left sidebar — **52px collapsed default**, 200px expanded (`›` toggle, `localStorage.site-sidebar`)
- Mobile: sidebar → top bar
- **Home:** asymmetric command grid — `sys.status` + `tool.registry`, then `log.decisions`
- Reuse `.app-layout`, `.sidebar`, `.sidebar-nav`, `.nav-link` from existing pages

## Colors (CSS variables — semantic tokens)

Default theme: `graphite-command-pro` on `<html data-theme>`. Ten palettes in `src/css/themes.css`.

| Token | Default hex | Role |
|-------|-------------|------|
| `--bg` | `#080A0D` | Page background |
| `--surface` | `#11161D` | Sidebar, cards |
| `--panel` | `#1A212A` | Raised containers |
| `--primary` | `#2979FF` | Main actions, active nav, lab accent |
| `--secondary` | `#0D9488` | Secondary actions, info |
| `--accent` | `#B88A3C` | Premium / legacy markers |
| `--danger` | `#B23A48` | Errors only |
| `--text` | `#E6EDF3` | Body |
| `--text-muted` | `#8A95A3` | Labels |

Theme switcher: Lab panel (`ui.palette`) + sidebar footer. Persists via `localStorage.site-theme`.

## Typography

- Body: **Inter**
- Display / headings: **Rajdhani**
- Mono / labels / panels: **JetBrains Mono**
- Home: mono-dominant
- Body line-height: `1.6`

## Components

**Status badge:** `// verify:pass`, `// local`, `live`, `wip` — pulsing dot only when `.badge--verified`

**Diagnostic panel:** `.diag-panel` — flat border, mono header (`sys.status`, `tool.registry`, `log.decisions`)

**Registry table:** `.tool-registry-table` — compact rows, no scale hover on home

**Tool cards (Tools page):** glass allowed lightly; hover border glow only

**Nav active state:** left accent bar + primary blue text

## Motion

- **Home:** no entrance animation (`.main-content--command`)
- **Tools / About:** optional stagger reveal; respect `prefers-reduced-motion`
- **Smoke:** off by default; user toggle only
- CSS transitions only — no animation libraries

## Accessibility

- Sufficient contrast on muted text against dark bg
- `aria-current="page"` on active nav
- `aria-pressed` on toggles
- Labeled regions on command-center panels

## Files to edit

- Global styles: `src/css/style.css`
- Theme palettes: `src/css/themes.css`
- Theme switcher: `src/js/theme.js`
- Sidebar rail: `src/js/sidebar.js`
- Home layout: `src/index.html`
- Copy sidebar + nav block from `src/index.html` when adding pages
