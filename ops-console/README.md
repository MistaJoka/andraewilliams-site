# Ops Console

Private, local-only command-center for andraewilliams.com. Not deployed.

## Run

    npm run console
    # or: python3 ops-console/server.py

Open http://127.0.0.1:7878

## One-shot (no browser)

    python3 ops-console/server.py --once

Prints a JSON status snapshot and exits non-zero if anything is CRITICAL.

## Tests

    cd ops-console && python3 -m unittest discover -s tests -v

## What it watches

- **Site health** — apex/www + level0–4 + /api endpoints (status, latency, TLS cert)
- **Deploys** — latest deploy state (via `gh` commit status) + drift vs production
- **Repo** — branch/dirty state, open PRs (Dependabot flagged)
- **Incident log** — auto-opened/closed from health state transitions

Config lives in `config.json`. Requires `gh` authenticated and `python3`.
Data is stored in `data.db` (gitignored).
