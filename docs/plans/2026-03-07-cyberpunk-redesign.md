# Design: Dark Cyberpunk Redesign + Tools Section
**Date:** 2026-03-07

## Overview
Restyle the personal site with a dark cyberpunk / pro dashboard aesthetic and add a Tools section. The layout shifts from a single centered landing page to a split sidebar + main content layout.

## Layout
Fixed left sidebar (~220px), full-height. Right side is the scrollable main content area. On mobile, sidebar collapses to a top bar.

```
┌──────────────┬──────────────────────────────┐
│              │                              │
│  SIDEBAR     │   MAIN CONTENT               │
│              │                              │
│  • Name      │   [ Hero / active section ]  │
│  • Status    │                              │
│              │                              │
│  nav:        │                              │
│  ○ Home      │                              │
│  ● Tools     │                              │
│              │                              │
│  ─────────   │                              │
│  GitHub →    │                              │
└──────────────┴──────────────────────────────┘
```

## Color Palette
- Background: `#0a0a0f`
- Surface/Cards: `#111118`
- Sidebar: `#080810`
- Primary Accent: `#00f0ff` (electric cyan)
- Secondary Accent: `#9b5dff` (neon violet)
- Alert/Highlight: `#ff2d78` (deep magenta)
- Text Primary: `#e8e8f0`
- Text Muted: `#5a5a7a`
- Borders: `rgba(255,255,255,0.06)`

## Typography
- Headings/Body: Inter (already loaded)
- Mono elements: JetBrains Mono (replaces Space Mono)
- Heading letter-spacing: `-0.02em`
- Body line-height: `1.6`

## Sidebar
- Ultra-dark bg (`#080810`), right ghost border
- Name in JetBrains Mono, small and tight
- `// online` pulsing badge
- Nav: `Home` and `Tools` — active state: left accent bar + cyan glow text
- GitHub link pinned to bottom

## Sections

### Home
- Keeps existing content: name, tagline, sub-line
- Restyled with new palette and typography
- Grid overlay retained, slightly more intense
- Fade + upward slide entrance animation

### Tools
- 2-col card grid (desktop), 1-col (mobile)
- Cards: glassmorphism — `backdrop-filter: blur(16px)`, semi-transparent `#111118` bg
- Each card: tool name (mono, bold), description (muted), status badge (`// active`, `// wip`)
- Hover: inner cyan glow + `scale(1.02)`
- Placeholder data to be replaced by real tools

## Animations
- Page load: fade + upward slide (300ms ease-out)
- Hover states: glow pulse on accent, scale 1.02
- Pulsing dot on status badge retained
- Micro-bounce on nav link clicks

## Glassmorphism Rules
- `backdrop-filter: blur(16px)`
- Background: `rgba(17, 17, 24, 0.6)`
- Border: `1px solid rgba(255,255,255,0.06)`
- Box shadow: `0 0 20px rgba(0, 240, 255, 0.05)` inner glow

## Mobile
- Sidebar collapses to a fixed top bar
- Nav links become horizontal or hidden behind a toggle
- Cards stack to single column

## Files Changed
- `src/index.html` — restructured for sidebar layout + Tools section
- `src/css/style.css` — full restyle with new design system
- `src/js/main.js` — active nav state tracking on scroll
