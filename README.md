# andraewilliams.com

Personal site and project hub: static HTML and CSS (no client JavaScript on the main pages yet). Deployed with GitHub Pages from the `src/` folder.

**Live site:** [andraewilliams.com](https://andraewilliams.com) (custom domain via `src/CNAME`)

## Repo layout

| Path | Purpose |
|------|---------|
| `src/` | Site root (HTML, CSS, `CNAME`) — this is what Pages serves |
| `src/pretext-smoke/` | Local Vite + Pretext demo — **not** deployed |
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

Uses `src/pretext-smoke/`. The deploy workflow **rsyncs `src/` without `pretext-smoke`**, so production stays unchanged.

## Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, which copies `src/` to a staging folder (excluding `pretext-smoke`) and uploads that artifact to GitHub Pages.

## More context

See `docs/project_brief.md` for goals, audience, and constraints.

For **text measurement and line layout** without DOM reflow (virtualization, canvas UI, etc.), see `docs/pretext.md` ([Pretext](https://github.com/chenglou/pretext)).
