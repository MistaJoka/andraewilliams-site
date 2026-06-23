# Access Control — Design & Decision Plan

_Date: 2026-06-23 · Status: **proposal, awaiting owner decision** · no code written yet_

The brief asks for "access control to showcase cybersecurity skills … preferably
minimal but resilient measures." This doc scopes the options against the project
constraints (free tooling, Vercel Hobby, GoDaddy DNS, no graduate-level
complexity) and recommends a path. Nothing here is built yet — this is the
decision step.

## What we're protecting (and what we're not)

The site is intentionally public — that's the portfolio. So this is **not** about
locking the whole domain. The goal is a **private wing**: a route or subdomain
(e.g. `/lab`, or `private.andraewilliams.com`) that only you (and invitees) can
open. The public deck stays open; the gate is itself a visible artifact of skill.

- **Public, stays open:** `index.html`, `about.html`, `tools.html`, writeups,
  Level 0, Cipher Console, Pretext.
- **Behind the gate (proposed):** a `/lab` area for in-progress experiments,
  raw logs, or tools you don't want indexed/used anonymously.

## Threat model (right-sized)

Realistic adversaries for a personal site: opportunistic scanners, casual
snoopers, search-engine crawlers. **Not** a funded attacker. So "resilient"
here means: no client-only bypass, secrets never shipped to the browser,
credentials compared in constant time, cookies that can't be forged. It does
**not** need MFA, account systems, or a database.

## Options

| Option | Free? | Resilient? | Effort | Notes |
|---|---|---|---|---|
| **A. Edge middleware + signed cookie** | ✅ Hobby | ✅ server-enforced | Medium | Recommended. Custom login page → serverless verify → HMAC-signed HttpOnly cookie; `middleware.ts` guards protected paths. Showcases real auth logic. |
| **B. Basic Auth in middleware** | ✅ Hobby | ✅ server-enforced | Low | `middleware.ts` checks `Authorization` header against an env secret; browser-native prompt. No logout/UX, but a solid MVP. |
| **C. Cloudflare Access (Zero Trust)** | ✅ free tier (≤50 users) | ✅✅ strongest | Medium-High | Identity-based (email OTP/Google). Requires putting Cloudflare in front of Vercel (move DNS/proxy). The "level up" once A/B exists. |
| **D. Client-side JS gate** | ✅ | ❌ bypassable | Low | View-source defeats it. **Rejected** as primary — anti-showcase. |
| **E. Vercel Password Protection** | ❌ Pro only | ✅ | Low | Violates the free-tooling constraint. **Rejected.** |

## Recommendation

**Start with A (edge middleware + signed cookie).** It's free on Hobby, fully
server-enforced, and is itself the cybersecurity showcase: a login page, a
constant-time secret check, an HMAC-signed `HttpOnly; Secure; SameSite=Strict`
session cookie, and edge enforcement before any private byte is served. If you
want the absolute minimum first, ship **B** in an afternoon and upgrade to A.
Keep **C (Cloudflare Access)** on the roadmap as the identity-grade upgrade.

### How A works (sketch — for the future build, not now)

1. `middleware.ts` matches the protected matcher (e.g. `/lab/:path*`). If the
   request has a valid signed session cookie → continue; else redirect to
   `/lab/login`.
2. `POST /api/auth` reads a passphrase, compares it to `process.env.LAB_SECRET`
   with `crypto.timingSafeEqual`, and on success sets
   `lab_session=<base64 payload>.<HMAC-SHA256>` as `HttpOnly; Secure;
   SameSite=Strict; Max-Age=…`, signed with `process.env.LAB_COOKIE_KEY`.
3. Middleware verifies the HMAC and expiry on every protected request.
4. `POST /api/logout` clears the cookie.

### Secrets & hygiene

- `LAB_SECRET` and `LAB_COOKIE_KEY` live in **Vercel Project → Environment
  Variables**, never in the repo. Rotating = changing the env var.
- Add `X-Robots-Tag: noindex` + `robots.txt` disallow on the private path so
  crawlers don't surface it.
- Implies introducing the project's first `middleware.ts` and `/api` auth
  functions — a real step up from the static tree, consistent with the
  roadmap's "progress to server based apps."

## Open decisions (need your call before building)

1. **Scope of the gate:** a path (`/lab`) on the apex, or a dedicated subdomain
   (`private.andraewilliams.com`)? Subdomain is cleaner to reason about.
2. **Single shared passphrase (A/B) vs. per-person identity (C)?** Shared is
   simplest; identity is the better story if you'll invite specific people.
3. **What actually goes behind it first?** The gate needs a payload to justify
   it — pick the first private artifact (raw logs? a WIP tool?).

## Next step

Pick option + answers to the three open decisions above; then this moves from
plan to a scoped build task (new `middleware.ts` + `/api/auth`, a login page,
and a protected `/lab`).
