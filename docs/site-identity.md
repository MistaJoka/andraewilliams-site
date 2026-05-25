# Site Identity — andraewilliams.com

## Who this is for

Primarily Andrae. Secondarily: anyone invited or who finds the site and reads carefully.

## Core identity

**Andrae Williams** is a builder, analyst, and operator.

**The site** — nicknamed **Operator's Lab** — is a personal command center, lab, arsenal, and proof-of-work archive. It does not ask for attention. It exposes work, decisions, and status — and lets competence speak for itself.

## Brand archetype

One composite operator. Traits are extracted from a blend of builder, analyst, field leader, strategist, and legacy architect — **never referenced as fiction, never cosplayed visually or verbally**.

| Cluster | Core traits | How it shows up on the site |
|---------|-------------|----------------------------|
| **Builder / inventor** | Technical confidence, prototyping, shipping | Working tools, live demos, repos linked from arsenal. Confidence from what runs, not what is claimed. |
| **Analyst / observer** | Observation, deduction, pattern recognition | Field notes, case files, metrics that compute. Patterns over slogans. Evidence before narrative. |
| **Field operator** | Survival readiness, grit, low ceremony | Static-first, honest status, survives broken APIs and long gaps. Durable UX over polish theater. |
| **Strategist / curator** | Strategic calm, taste, network intelligence | Calm hierarchy. What gets surfaced is curated. Connections between tools, writeups, and source. Nothing shouted. |
| **Legacy architect** | Restraint, control, calculated moves | Every element earns its place. Long horizon. Additions are deliberate, not feature sprawl. |

### Archetype balance

- **Lead with:** analyst + field operator (status strip, mission, field notes)
- **Support with:** builder + strategist (arsenal, lab, transmission links)
- **Underpin with:** legacy architect (restraint in copy, layout, and growth)

### Metaphor vocabulary

**Allowed:** command center, lab, arsenal, registry, log, case file, field notes, status, deploy, verify, origin, transmission, mission.

**Forbidden:** character names, franchise references, cosplay aesthetics, criminal/mafia/vigilante framing, comic-book tone, antihero posturing.

## Voice and tone rules

### Tone targets

| Quality | Meaning |
|---------|---------|
| Calm | Short sentences. No exclamation marks. No urgency theater. |
| Sharp | Precise nouns. Name the stack, file, or metric. |
| Controlled | Say less. Link to source. Let the artifact carry weight. |
| Strategic | Order matters. Status and mission before biography essays. |
| Intelligent | Assume the reader can follow technical context or open a writeup. |
| Quietly impressive | Proof-of-work over self-promotion. |

### Always

- State **what exists** and **what was decided** — not how you feel about it.
- Use **evidence nouns:** commit hash, verify state, tool count, repo link.
- Hero copy is allowed when it is **specific and restrained** — not generic portfolio filler.
- Write like someone who has already done the work and is filing the report.

### Never

- Desperate: "hire me", "passionate about", "excited to announce", "let's connect"
- Corporate: "synergy", "leverage", "proficient in automation architectures", "thought leader"
- Childish: emoji spam, meme copy, "infinity experiments", fake uptime, performative edginess
- Performative minimalism: cryptic nav, broken semantics, empty pages that signal taste instead of work
- Theme cosplay: noir monologues, lab-coat irony, tactical/military LARP, luxury-villain cadence

### Copy length

| Context | Max |
|---------|-----|
| Home hero main line | 1 sentence |
| Home hero subline | 1 sentence |
| Panel label | 2–4 words, mono convention |
| Tool card (Tools page) | 2 sentences + tags |
| Case file lede | 3 sentences |
| About page | Full narrative allowed — the one place for story |

### Person

First person in hero and About. Mission and field notes use calm factual voice. Status strip uses system voice.

## Things to avoid

### Identity

- Character names, quotes, or visual references from film/TV/comics
- Mafia, crime, vigilante, or "antihero" theming — even as "vibe"
- "Genius" or "visionary" self-labels — demonstrate, don't declare
- Borrowed cadence from fiction (dramatic reveals, villain monologues, quippy arrogance)

### UX

- Onboarding tours, dual CTAs above the fold
- Decorative stats (`∞`, fake `// online`, hardcoded "live" with no backing)
- Landing animations that delay first paint of useful data

### Visual

- Neon overload, gradient headline text as default, glassmorphism everywhere
- Badge soup (every element tagged `NEW` or `HOT`)
- Stock sci-fi illustration that replaces real tools
- Costume aesthetics: tactical HUD clutter, luxury noir, comic-panel layouts

### Technical

- Backend solely to feed fake "live" data on a static site
- Metrics that randomize or lie when fetch fails (show `unknown`, not green)

## Good vs bad copy

### Home / hero

| Bad | Good |
|-----|------|
| "Welcome! I'm a passionate full-stack developer building the future." | **Andrae Williams** · Builder. Analyst. Operator. |
| "Check out my amazing projects below!" | Main line: patterns, pressure, problems → working systems |
| "∞ Experiments" | Status strip: `stack · commit · verify · tools` |
| "// online" (always, with no meaning) | `// verify:pass` or `// local` from build metadata |
| "Always learning, always building." | Current Mission card with honest focus tags |

### Arsenal / registry

| Bad | Good |
|-----|------|
| "Revolutionary AI-powered canvas experience" | "Smoke playground" — canvas · case study · live |
| "I'm really proud of this one!" | Case file link + source repo link |
| Long marketing paragraph on home card | Purpose + tags + links only |

### About

| Bad | Good |
|-----|------|
| "Visionary technologist disrupting the space" | "This is my lab. I build tools here to learn in public and keep a record of decisions." |
| Buzzword skill list | Link to `docs/decisions.md` and shipped tools |

### Field notes / writeups

| Bad | Good |
|-----|------|
| "In this blog post I'll walk you through..." | "Problem: DOM layout thrash on resize. Approach: Pretext measurement. Tradeoff: …" |
| Hype without tradeoffs | Goals, constraints, what worked, what didn't, source links |
| "This was a fun experiment!" | "Outcome: shipped. Limitation: no SSR. Next: migrate registry to manifest-only." |

## Decision filter

Before adding copy or UI to the site, ask:

1. Does it **compute** or **link to source**?
2. Would a careful reader learn something in **5 seconds**?
3. Does it sound like **evidence** or **advertising**?
4. Will it still read well in **12 months** without updates?
5. Does it reflect **restraint** — would removing it make the page clearer?

If any answer fails, cut or move it to About or a case file.
