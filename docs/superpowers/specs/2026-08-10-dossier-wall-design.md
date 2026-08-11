# Dossier Wall — Design Spec

**Date:** 2026-08-10
**Status:** Approved direction, pending final review
**Supersedes:** the "tools/projects section" model from Phase 2 (roadmap.md)

## Problem

The site showcases 3 small demos while ~30 real repos (AI agents, cyber tooling, IoT, client work) sit invisible on GitHub. Hand-written project pages rot: adding project N+1 is a manual chore, so the portfolio permanently lags reality.

## Identity decision (approved)

**Lair-first.** The site stays the sci-fi command deck — one identity, no split professional/personal personas. The project library becomes real: every worthwhile repo appears as a **mission dossier**. Clients or visitors who see it are seeing the lair itself as proof of skill.

## Exposure policy (approved)

**Redacted dossiers now, classified wing later.**

- Any project may appear as a dossier — including private repos — but private repos get **no code links**.
- Security/offensive work (`awus1900`, `Kali-bot`, etc.) is written **sanitized**: authorized-research / education framing, no operational detail, no payloads, no target specifics.
- **Milestone 3 (committed):** a "classified wing" puts sensitive dossiers behind real access control. Deferred because the auth design deserves its own spec — and its writeup becomes a featured dossier itself.

## Architecture (approved — Approach 2 of 3)

GitHub-synced registry + curated overlay. Rejected alternatives: fully hand-written pages (rots — the exact failure mode this fixes) and Astro migration (rewrite of a working deck; stays the named escalation path for when the blog/notes phase arrives, per decisions.md "migrate when complexity grows").

### Content model

One overlay file, `src/data/projects.json`. Every project is a dossier:

| Field | Values / meaning |
|---|---|
| `id` | repo name or slug |
| `codename` | lair-style display name (e.g. offline-agent → "JARVIS") |
| `tier` | `featured` \| `listed` \| `hidden` |
| `class` | `ai` \| `cyber` \| `iot` \| `game` \| `client` \| `learning` |
| `status` | `active` \| `stable` \| `archived` |
| `brief` | 1–2 sentence mission summary in Andrae's words |
| `redaction` | `none` \| `no-code-link` \| `sanitized` |
| `source` | `github-api` (public repos) \| `manual` (private repos — no tokens anywhere) |
| `links` | repo / live demo / writeup — each optional |

**Tier semantics:**
- `featured` (~5): full mission cards → dedicated writeup pages. Starting picks: `offline-agent` (JARVIS), `minitoo-studio` (IoT), `EvenButter-Site` (shipped client work), `awus1900` (cyber, sanitized), `swarmgod`.
- `listed` (~10–12): compact cards, API-enriched where public — `radar`, `ai-skill-tree`, `pyloop`, `Kali-bot` (sanitized), `lawnbizops`, `samsung-tv-remote`, `watchdog`, …
- `hidden`: forks (`warp`, `WebGoat`, `PayloadsAllTheThings`), coursework stubs, `to_do_Rachel`. Never rendered; the entry records that the decision was made.

Existing case studies (Smoke, Pretext Layout Lab, Cipher Console) convert into this schema — no special cases.

### Build pipeline

All work happens at **build time**; the live site stays fully static (zero runtime API calls → no rate limits, no CORS, instant loads).

```
projects.json
   → scripts/build-dossiers.mjs   (added to the existing `npm run build:site` chain)
       1. Validate overlay against schema — build FAILS LOUD, bad entry named
       2. source: github-api → fetch public metadata, unauthenticated
          (~15 public repos vs 60/hr limit — ample)
       3. API failure → fall back to committed dossier-cache.json;
          deploy proceeds with warning. GitHub can never break a deploy.
       4. Merge: overlay beats API; manual entries pass through untouched
   → static dossier cards + emitted dossiers.json → _site/
   → Vercel (unchanged)
```

Client side: the deck's existing vanilla JS reads emitted `dossiers.json` for tier/class filtering. No frameworks, no new runtime dependencies.

**Failure posture:** invalid overlay = failed build with the offending entry named. API down = cached data + build-log warning. No silent drift.

## Milestones

1. **Dossier engine + wall.** Schema, full ~30-repo triage into `projects.json`, build script with validation + cache, deck wall with tier/class filtering. *Done when:* the wall is live at andraewilliams.com and adding a project is provably one JSON entry + push.
2. **Featured mission pages.** Full writeup pages for the 5 featured; existing case studies converted to schema. *Done when:* every featured card opens into a writeup.
3. **Classified wing** (committed, own spec later). Access control on a hidden tier; the build doubles as the cybersecurity showcase.

**Ongoing rule:** new repo → one overlay entry. Anything added by hand twice becomes a build-script automation candidate.

**Out of scope:** Astro migration (escalation path only), blog/notes, animation polish.

## Testing (strategic)

- Schema validation is the primary test surface for M1.
- One build smoke test: fixture overlay in → assert N featured cards render and dossiers.json emits.
- No UI test theater.
