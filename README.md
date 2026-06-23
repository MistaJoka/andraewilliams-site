# andraewilliams.com

Personal site and project hub: static HTML and CSS on the main pages, plus a small Vite-built **Pretext** demo at `/pretext-smoke/`. Built and deployed on Vercel (see [Deploy](#deploy)).

**Live site:** [andraewilliams.com](https://andraewilliams.com) (custom domain via `src/CNAME`)

## Repo layout

| Path | Purpose |
|------|---------|
| `src/` | Site root (HTML, CSS, `CNAME`); deploy workflow stages `src/` plus built Pretext into `_site` |
| `src/pretext-smoke/` | Vite + Pretext source; CI builds it to `/pretext-smoke/` on the live site |
| `docs/` | Plans, roadmap, and project notes |

## Local preview

Open `src/index.html` in a browser, or serve the folder so asset paths behave like production:

```bash
cd src && python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

### Pretext + Vite (local)

```bash
npm install
npm run dev:pretext
```

Uses `src/pretext-smoke/`. Production build output is produced in CI and published at **https://andraewilliams.com/pretext-smoke/** (see Deploy).

### Production-like preview

Build the same `_site/` tree CI deploys, then serve it locally:

```bash
npm install
npm run preview:site
```

Or build only:

```bash
npm run build:site
```

## Deploy

Hosted on **Vercel** (`vercel.json`). Every push builds with `npm run build:site` (Pretext build, rsync, verify) and serves the `_site/` output. Pull requests get automatic Vercel preview deployments; pushes to `main` deploy to production at andraewilliams.com.

- Build command: `npm run build:site`
- Output directory: `_site`
- DNS: `andraewilliams.com` is managed in GoDaddy and points at Vercel.

## More context

See `docs/project_brief.md` for goals, audience, and constraints.

For **text measurement and line layout** without DOM reflow (virtualization, canvas UI, etc.), see `docs/pretext.md` ([Pretext](https://github.com/chenglou/pretext)).
