# andraewilliams.com

A personal technical second brain — a feed-first public knowledge archive
and digital laboratory covering AI, software, cyber, homelab, risk, MMA
and anime.

Built with [Astro](https://astro.build) 7. Static output, no adapter, no
database, no CMS, no paid service. All content lives in this repo as
Markdown/MDX with build-validated frontmatter.

---

## Local development

Requires Node ≥ 22.12.

```bash
npm install
npm run dev
```

Dev server runs at <http://localhost:4321>.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run check` | Astro + TypeScript diagnostics |
| `node scripts/check-links.mjs` | Verify every internal link resolves (run after `build`) |

### Known gotcha: stale content

The content layer persists to `node_modules/.astro/data-store.json`.
Deleting a content file does **not** always purge its entry, and a dev
server started before a collection existed may keep showing it as empty.
If content looks stale or a new entry 404s in dev:

```bash
rm -rf node_modules/.astro .astro && npm run dev
```

---

## Authoring content

Content lives in `src/content/`, one directory per collection. Schemas are
defined in [`src/content.config.ts`](src/content.config.ts) — that file is
the contract, and a malformed entry fails the build rather than rendering
wrong.

```
src/content/
├── posts/       .mdx  — the feed
├── projects/    .mdx  — things that shipped
├── lab/         .mdx  — experiments (incl. the WebGL scenes)
├── series/      .md   — series metadata
├── resources/   .md   — the reference library
└── ../data/topics.yaml — the six topic hubs
```

### A new post

Create `src/content/posts/my-slug.mdx`. The filename becomes the URL:
`/posts/my-slug/`.

```mdx
---
title: How something actually works
description: One sentence. Max 200 characters — it is the feed excerpt and the OG description.
type: ARCHITECTURE      # TLDR ELI5 BUILD EXPERIMENT ARCHITECTURE TUTORIAL RESOURCE VISUAL MMA ANIME
difficulty: BEGINNER    # ELI5 BEGINNER INTERMEDIATE DEEP_DIVE
date: 2026-08-19
topics: [ai]            # must match ids in src/data/topics.yaml
tags: [agents, memory]
featured: false         # at most one post should set this
---

Body in Markdown.
```

Optional fields: `updated`, `series` + `seriesOrder` (both or neither),
`project`, `status` (BUILD/EXPERIMENT/ARCHITECTURE only), `related.posts`,
`related.topics`, `related.projects`, `resources`, `draft`.

### Modular content blocks

Articles are built from blocks rather than continuous prose. Import what
you need in one line and wrap sections:

```mdx
import { Tldr, WhyItMatters, HowItWorks, FailureModes, WhatILearned } from '@blocks';

<Tldr>The compressed answer.</Tldr>
<WhyItMatters>Why the reader should care.</WhyItMatters>
<HowItWorks>
Regular markdown works in here — code fences, lists, images.
</HowItWorks>
<FailureModes>- Where it breaks.</FailureModes>
<WhatILearned>The transferable lesson.</WhatILearned>
```

Available: `Tldr`, `Eli5`, `WhyItMatters`, `Architecture`, `HowItWorks`,
`WhatITried`, `WhatBroke`, `FailureModes`, `WhatILearned`, `Visual`.
Not every article uses every block — use only what the piece needs.

### A new topic

Add a row to `src/data/topics.yaml` and a matching `--topic-<id>` token in
`src/styles/tokens.css`. No code changes: hubs, filter chips, accents and
the search index all read from that file.

### A new post type

Add it to `POST_TYPES` in `src/lib/enums.ts` and add one row to
`CARD_SPEC` in `src/lib/card-spec.ts`. Optionally add a `data-frame`
variant in `src/styles/cards.css`. No new component logic.

### A lab entry with a live shader

Set `scene:` in the frontmatter to one of `particles`, `aura`, `fire`,
`inkSlash`, `mechaHud`, `reaction`. The page renders a click-to-run
canvas; nothing loads until the reader asks for it.

---

## Architecture notes

- **`src/lib/integrity.ts` is load-bearing.** Astro's `reference()`
  validates the *shape* of a link, not that the target exists — a dangling
  reference resolves to `undefined` and silently drops an edge. This gate
  throws, which fails the build. **If you add a reference field to a
  schema, add it to `REF_FIELDS` too.**
- **The colour ramp has one source.** `src/lib/palette.ts` feeds both the
  CSS tokens and the GLSL ramp in the ASCII engine.
- **Reading routes ship no WebGL.** The engine is dynamically imported and
  only on pages that declare a `scene`.
- **Filters are CSS-only** (radio inputs + `:has()`), so they work with
  JavaScript disabled. The command palette is the only significant client
  JS, and its search index is fetched lazily on first ⌘K.

## Deployment

Vercel, static, no adapter. `vercel.json` sets `cleanUrls` and
`trailingSlash`. Pushing to `main` deploys.
