# Content Model — andraewilliams.com

How pages, sections, and copy are organized. Aligns with [site-identity.md](site-identity.md) and [design-system.md](design-system.md).

## Site map

| Route | Role | Voice |
|-------|------|-------|
| `/` (index) | Operator's Lab — six-section command center | First person hero; system voice for status |
| `/tools.html` | Arsenal catalog — browseable tools with context | Descriptive, still factual |
| `/about.html` | Origin and intent — the one narrative page | First person, calm |
| `/smoke-playground.html` | Live tool — parameter panel + canvas | Instructional, minimal |
| `/writeups/*.html` | Case files — goals, tradeoffs, sources | Analytical |
| `/pretext-smoke/` | Pretext Layout Lab — eight interactive demos | Tool speaks |
| External apps | Linked from arsenal (e.g. promptbook) | App owns its UX |

## Homepage structure (Operator's Lab)

Vertical scroll, six sections:

| Section | ID | Source | Purpose |
|---------|-----|--------|---------|
| Command Center hero | `#command-center` | Static HTML | Name, role, main/sub lines, status strip |
| Current Mission | `#current-mission` | `mission.json` | What is being built now — honest, editable |
| Arsenal | `#arsenal` | `tools.manifest.json` | Shipped tools — status, purpose, stack, links |
| Lab | `#lab` | `lab.json` | Engineering Demonstrations — text-aware project cards with Pretext measurement badges and proof panels |
| Field Notes | `#field-notes` | `field-notes.json` | Short build logs — case-file cards |
| Transmission | `#transmission` | Static HTML | Outbound links — GitHub, tools, about, source |

Priority order: operational truth first (status, mission), then proof-of-work (arsenal, lab), then record (notes), then channels (transmission).

## Section naming system

Machine-readable labels for panels and headings. Pattern: `category.name` or single nouns — mono, lowercase, no spaces.

| Label | Meaning | Typical location |
|-------|---------|------------------|
| `command.center` | Hero eyebrow | Home hero |
| `current.mission` | Active build focus | Home mission card |
| `arsenal` | Shipped tools collective | Home arsenal section |
| `lab` | Workshop experiments | Home lab section |
| `field.notes` | Short build logs | Home field notes |
| `transmission` | Outbound links | Home transmission |
| `sys.status` | Deploy metadata (legacy / compact) | Status strip |
| `case.file` | Writeup sections | Writeups |
| `origin` | About page collective (optional) | About |

### Naming rules

1. **Nav stays human:** Home, About, Tools — never rename nav to jargon.
2. **Section labels stay machine:** `current.mission`, not "What I'm Building".
3. **Counts derive from data:** `// 3 live` not `// amazing projects`.
4. **Status tokens are honest:** `verify:pass`, `local`, `unknown`, `wip`, `static` — never decorative.
5. **New sections** must map to one archetype cluster (builder → arsenal/lab, analyst → field notes, etc.).

### Page roles (archetype mapping)

| Page | Archetype lead | Purpose |
|------|----------------|---------|
| Home | Analyst + field operator | Operational truth and proof-of-work at a glance |
| Tools | Builder + strategist | Full curated catalog with more context |
| About | Legacy architect + builder | Origin story and intent |
| Writeups | Analyst + builder | Case files with tradeoffs |
| Live demos | Builder | Artifact speaks; minimal instruction |

## Content hierarchy

### Home (Operator's Lab)

1. Hero — identity + status strip
2. Current Mission — one active focus card
3. Arsenal — manifest-driven tool cards
4. Lab — workshop items + smoke toggle
5. Field Notes — summarized build logs with case file links
6. Transmission — static outbound links

Narrative depth deferred to About and case files. No dual CTAs above the fold.

### Tools (arsenal catalog)

- Page lede: 1–2 sentences max
- Per tool: name, type, status, short description, tags, CTA
- Prefer link to case file over inline essay

### About (origin)

- Full story allowed
- Links to GitHub, decisions log, roadmap
- No skill matrix buzzwords — point to proof-of-work

### Case files (writeups)

Required sections:

1. **Problem** — what was being solved
2. **Approach** — what was built
3. **Tradeoffs** — what was given up
4. **Sources** — repo links, related tools

## Data sources

| Asset | Source | Shown on |
|-------|--------|----------|
| `tools.manifest.json` | Committed in repo | Home arsenal, future Tools sync |
| `mission.json` | Committed in repo | Home current mission |
| `field-notes.json` | Committed in repo | Home field notes |
| `lab.json` | Committed in repo | Home lab workshop |
| `site-status.json` | CI-generated at build | Home status strip, sidebar badge |
| `decisions.md` | Copied from docs at build | Field notes raw link target |

## Homepage copy (approved)

### Command Center hero

```
Andrae Williams
Builder. Analyst. Operator.
I turn patterns, pressure, and problems into working software systems.
A private lab for AI-assisted tools, local business systems, dashboards, and experiments.
```

Status strip below hero — no additional headline block.

### Sidebar badge copy

- CI deploy: `// verify:pass`
- Local dev: `// local`
- Fetch failed: `// unknown`

### Footer

Keep minimal: `andraewilliams.com` — no copyright essay.

### Meta / OG

- Description: `Builder, analyst, operator — personal lab for working software systems.`
- Avoid: "portfolio", "passionate", "innovative", "creative developer"

**Avoid on home:** generic taglines, dual CTAs, eyebrow kickers ("Builder portfolio · personal lab"), fictional cadence.

## Metadata (SEO / OG)

- Titles stay factual: `Andrae Williams`, `Tools — Andrae Williams`
- Descriptions: one calm sentence, no superlatives
- OG images may stay stylized; page body stays utilitarian

## Growth rules

When adding a new tool:

1. Entry in `tools.manifest.json` (with `purpose`, `type`, `description`)
2. Tools page card (until auto-rendered)
3. Case file when tradeoffs are worth documenting
4. Optional field note entry in `field-notes.json`
5. Optional lab entry if experimental

When adding a new page type, define: route, voice, section naming, and whether it belongs in nav.

When changing current focus, edit `mission.json` only — no HTML change required.
