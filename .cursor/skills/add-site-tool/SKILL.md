---
name: add-site-tool
description: >-
  Scaffolds a new tool, mini-app, or playground page on andraewilliams.com.
  Use when adding tools to the Tools section, creating interactive demos,
  smoke tests, or lab experiments on the site.
disable-model-invocation: true
---

# Add a Site Tool

## Decide the shape

| Type | When | Where |
|------|------|-------|
| **Static page** | HTML/CSS/JS only, no npm deps | `src/your-tool.html` + optional `src/js/` |
| **Vite sub-app** | Needs npm packages (e.g. Pretext, canvas libs) | `src/your-tool/` + update deploy workflow |
| **Section card only** | Links out or "coming soon" | Edit `src/tools.html` card grid |

Default to **static page** unless the tool needs a bundler.

## Static tool checklist

```
- [ ] Create `src/<tool-name>.html` — copy sidebar/nav from index.html
- [ ] Add tool logic in `src/js/<tool-name>.js` (or inline if tiny)
- [ ] Style in `src/css/style.css` or a scoped `<style>` block if isolated
- [ ] Add card on `src/tools.html` with name, description, status badge
- [ ] Add nav link if tool deserves top-level visibility (optional)
- [ ] Test: `cd src && python3 -m http.server 8080`
```

## Vite sub-app checklist

```
- [ ] Create `src/<tool-name>/` with index.html entry + main.js
- [ ] Add npm script in package.json if not reusing dev:pretext pattern
- [ ] Update `.github/workflows/deploy.yml` to build and copy dist output
- [ ] Exclude source folder from rsync (same pattern as pretext-smoke)
- [ ] Link from tools.html to `/<tool-name>/`
- [ ] Document in docs/decisions.md if it changes deploy assumptions
```

## Card template (tools.html)

```html
<article class="tool-card">
  <h3 class="tool-name">Tool Name</h3>
  <p class="tool-desc">One-line description.</p>
  <span class="tool-status">// active</span>
  <a href="tool-name.html" class="tool-link">Open →</a>
</article>
```

Use `// wip` until the tool is usable end-to-end.

## Naming

- Files: lowercase, hyphenated (`smoke-playground.html`)
- Keep titles short; mono font for tool names in UI

## After shipping

- Note the tool in `docs/roadmap.md` if it completes a phase goal
- Optional: one-line entry in README "Repo layout" table
