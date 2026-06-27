# Ops Console — Design Spec

**Date:** 2026-06-26
**Status:** Approved design, pre-implementation
**Type:** Private, local-only tool for andraewilliams.com

## Summary

A local web dashboard that acts as a command-center for the andraewilliams.com
site: **site health/uptime, deploy status, and repo status**, with visual alerts.
Runs entirely on `127.0.0.1`, custom code, never deployed. Reuses the existing
tactical "operator" aesthetic so it feels like part of the command deck.

Visitor analytics is explicitly **deferred** (a later phase that slots into the
same architecture).

## Goals / Non-goals

**Goals**
- One glanceable console for: is the live site up, did the last deploy succeed,
  what's the repo/PR state.
- Trustworthy "green" — checks verify expectations (status code, content,
  cert), not just liveness.
- Historical view (uptime %, latency trends, incident log), recorded as long as
  the server is left running.
- Zero paid services, minimal dependencies (Python stdlib first), private by
  construction.

**Non-goals (v1)**
- Visitor analytics / tracking (deferred — see Phase 3).
- macOS notifications or an always-on background daemon (alerts are visual only;
  the tab title/favicon carry the ambient signal).
- Public access, multi-user, or auth (localhost-only removes the need).
- Mobile/responsive layout.

## Architecture

### Stack

Python stdlib backend + static tactical-themed dashboard.

- A tiny local server (`http.server`) bound to **`127.0.0.1` only** serves the
  dashboard and exposes JSON + SSE endpoints. Localhost-only is the security
  boundary — `/api/*` shells out to `git`/`gh`, so it must never bind `0.0.0.0`.
- Python is chosen over Node to fit the portfolio's "beginner Python → server
  apps" thesis and to keep dependencies at zero (stdlib `http.server`,
  `sqlite3`, `ssl`, `urllib`, `subprocess`).
- The frontend is plain static HTML/CSS/JS reusing the operator amber-on-black
  theme tokens.

### The `Check` abstraction (architectural backbone)

Every observable — a health target, the TLS cert, deploy drift, PR count — is
normalized to one shape:

```
CheckResult {
  key:         str           # stable id, e.g. "health.apex"
  label:       str           # human label
  state:       ok|warn|crit|unknown
  value:       float | None  # numeric for history/sparklines (e.g. latency_ms)
  detail:      str           # short human explanation
  observed_at: iso8601
  history_key: str | None    # if set, value is recorded to the time-series
  meta:        dict          # extra payload for drill-down
}
```

Collectors implement a small protocol and **self-register** in a registry:

```
Collector {
  key:      str
  interval: int               # seconds between runs
  run() -> list[CheckResult]
}
```

This is what makes the depth cheap and uniform:
- **Rendering** is generic over checks — a new collector needs no UI work.
- **History** is automatic for any check with a `history_key` + numeric `value`.
- **Alerting** is one rule engine reading `state` across all checks.
- Adding the deferred analytics collector later is just dropping a file.

### Components

```
ops-console/
  server.py            # 127.0.0.1 server: serves dashboard, /api/*, /events (SSE),
                       #   starts the poller thread; supports --once headless mode
  poller.py            # background loop: runs due collectors, writes to store,
                       #   diffs state, pushes SSE updates; tracks own heartbeat
  registry.py          # Collector protocol + registration
  store.py             # sqlite: record samples, rollups, query uptime%/series/incidents
  alerts.py            # rule engine: CheckResults -> overall state + incident transitions
  collectors/
    health.py          # HTTP checks: status vs expect_status, expect_contains,
                       #   latency, TLS expiry/validity, functional synthetics
    deploys.py         # recent deploys via `gh api .../commits/<sha>/status`,
                       #   drift (HEAD vs last deployed sha); optional Vercel adapter
    repo.py            # branch, dirty, ahead/behind, last commit, open PRs/Dependabot
    backlog.py         # (Phase 3) parse docs/portfolio-backlog.md + Level docs
    analytics.py       # (Phase 3) visitor analytics stub
  static/
    index.html         # panel grid
    dashboard.css      # operator amber-on-black tokens
    dashboard.js       # SSE client (poll fallback), render, tab-title/favicon signal
  config.json          # targets, intervals, SLOs, repo slug
  test_collectors.py   # unit + integration tests
  README.md
  data.db              # sqlite (gitignored)
```

### Data flow

1. `poller.py` runs each collector when its `interval` is due, on a background
   thread inside the server process.
2. Results are written to sqlite (`store.py`); numeric values append to the
   time-series.
3. `alerts.py` diffs new states against previous, opening/closing incidents and
   computing the overall banner state.
4. Changed checks are pushed to the browser over **SSE** (`/events`). The browser
   falls back to polling `/api/state` if SSE is unavailable.
5. `--once` runs a single cycle, prints JSON, and exits nonzero if degraded
   (scriptable; also the integration-test entry point).

### Alerts (visual only)

- Any `crit` check → top banner `DEGRADED`; otherwise `ALL SYSTEMS NOMINAL`;
  `warn` → amber.
- Ambient signal with **no OS permissions**: browser **tab title + favicon** flip
  to 🟢/🔴 with the live incident count, visible from a backgrounded tab.

## Configuration

`config.json` drives targets so green means *healthy*, not just *200*:

```json
{
  "poll_interval_default": 30,
  "repo": "MistaJoka/andraewilliams-site",
  "targets": [
    { "name": "apex",    "url": "https://andraewilliams.com",        "expect_status": 308, "slo": 99.5 },
    { "name": "www",     "url": "https://www.andraewilliams.com",    "expect_status": 200, "expect_contains": "<html", "slo": 99.5 },
    { "name": "level0",  "url": "https://level0.andraewilliams.com", "expect_status": 200 },
    { "name": "level1",  "url": "https://level1.andraewilliams.com", "expect_status": 200 },
    { "name": "level2",  "url": "https://level2.andraewilliams.com", "expect_status": 200 },
    { "name": "level3",  "url": "https://level3.andraewilliams.com", "expect_status": 200 },
    { "name": "level4",  "url": "https://level4.andraewilliams.com", "expect_status": 200 },
    { "name": "api-echo",  "url": "https://www.andraewilliams.com/api/level-2/echo",  "synthetic": "echo" },
    { "name": "api-notes", "url": "https://www.andraewilliams.com/api/level-3/notes", "synthetic": "notes" }
  ]
}
```

- `apex` correctly expects **308** (it redirects to www by design) — a naive
  200-check would false-alarm forever.
- Config is validated on boot with human-readable errors, and hot-reloaded
  without restart.

## Error handling / graceful degradation

- A failed check returns `state: crit`/`unknown` for **that check only**; never
  crashes a panel or the server.
- `gh` missing or unauthenticated → deploys + PR data show `unavailable`; health
  panel still works.
- `VERCEL_TOKEN` absent → deploy data comes from gh commit-status; the Vercel
  adapter is a pure enrichment, never a hard dependency.
- **Self-monitoring**: the UI surfaces a stalled poller / stale data instead of
  showing silently-old "green."

## Testing

- **Injectable clock** — no real `time.time()` in logic; deterministic baseline /
  rollup / MTTR tests.
- **Golden-file fixtures** — captured `gh`/`git` output → parser tests, no network.
- **Pure unit** — state classification (incl. apex-308-ok), drift, σ-baseline,
  rollup aggregation, SLO/budget math.
- **Integration smoke** — `server.py --once` boots, runs a cycle, asserts JSON
  shape; can run in CI without a browser.

## Phasing

**Phase 1 — MVP (shippable, useful)**
- `Check` model + registry; collectors: health, deploys, repo.
- sqlite store + poller thread; SSE transport (poll fallback).
- Four panels: Site Health, Deploys, Repo, Incident Log.
- Visual + tab-title/favicon alerts.
- `--once` headless mode; core unit + integration tests.
- `npm run console` wired into package.json; README.

**Phase 2 — Depth (as usage justifies)**
- Time-series rollups + retention; σ-baseline anomaly detection; SLO/error-budget.
- Functional synthetics (echo round-trip, notes round-trip).
- Incident lifecycle (ack/resolve), MTTR, annotations.
- 24h status timeline strip; per-check drill-down; keyboard command palette.

**Phase 3 — Site-aware**
- Backlog-progress panel (parses `docs/portfolio-backlog.md` + Level docs).
- Optional Vercel adapter (build durations, rollback URLs).
- Visitor-analytics collector slotting into the same registry.

## Deployment / privacy notes

- `ops-console/` lives at the repo root, **outside** the `_site` build pipeline,
  so it is never deployed by Vercel. `data.db` is gitignored.
- Run: `npm run console` (or `python3 ops-console/server.py`), open
  `http://127.0.0.1:7878`.
