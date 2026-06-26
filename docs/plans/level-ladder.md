# Level ladder (0–4)

Five separate sites in one repo. Each level adds one capability axis. Each has its own path (`/level-N/`) and optional subdomain (`levelN.andraewilliams.com`).

## Levels

| Level | Label | Path | Subdomain | New capability |
|-------|--------|------|-----------|----------------|
| 0 | Surface | `/level-0/` | level0 | Browser-only static files |
| 1 | Assembly | `/level-1/` | level1 | Partials + build script + generated JSON |
| 2 | Edge | `/level-2/` | level2 | Serverless functions (`api/level-2/`) |
| 3 | Memory | `/level-3/` | level3 | Database via API (`api/level-3/`) |
| 4 | Product | `/level-4/` | level4 | Full apps on own subdomain (portal page) |

## Repo layout

```
src/level-0/ … level-4/   ← static sites (separate pages per level)
api/level-2/echo.py       ← Level 2 serverless
api/level-3/notes.py      ← Level 3 serverless + Supabase
scripts/build-level-1.mjs ← assembles Level 1 from partials
vercel.json               ← subdomain rewrites (no redirects until DNS live)
```

## Build

```bash
npm run build:site
```

Runs `build-level-1.mjs` → `assemble-site.sh` → `verify-site.sh`.

## DNS (GoDaddy)

Add **A records** for each subdomain → `76.76.21.21` (Vercel):

- `level0`, `level1`, `level2`, `level3`, `level4`

Until DNS is live, use `https://www.andraewilliams.com/level-N/`.

## Level 3 optional setup

See [level-3-supabase-setup.md](../level-3-supabase-setup.md). Works in demo mode without env vars.

## Level 4 exemplar

[DOPE Prompt Book](https://promptbook.andraewilliams.com) — separate repo, counts as a real Level 4 product.
