# andraewilliams.com

Bare Astro project. Everything previous — content collections, design
system, tools, the WebGL lab, the hidden Savage Bible area — was torn down
to rebuild from scratch. It's all still in git history if any of it needs
to come back.

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

## Deployment

Vercel, static, no adapter. Pushing to `main` deploys.
