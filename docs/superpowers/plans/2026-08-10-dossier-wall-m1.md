# Dossier Wall — Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the dossier engine (curated overlay + build-time GitHub sync) and the Missions wall page, so every worthwhile repo appears on andraewilliams.com and adding a project is one JSON entry + push.

**Architecture:** A committed overlay (`src/data/projects.json`) is validated, enriched with public GitHub metadata at build time (with a committed cache as fallback), and emitted as `src/data/dossiers.json`. A new `missions.html` page renders it client-side with vanilla JS, following the existing `tools.html` + `tool-registry.js` pattern. Spec: `docs/superpowers/specs/2026-08-10-dossier-wall-design.md`.

**Tech Stack:** Vanilla HTML/CSS/JS, Node ESM build scripts (`.mjs`, `"type": "module"`), Node built-in test runner (`node --test`), GitHub REST API (unauthenticated), Vercel static deploy.

## Global Constraints

- No new npm dependencies (site is free-tools-only; `node --test` ships with Node).
- No tokens or secrets anywhere: private repos are `source: "manual"` and are never fetched.
- Live site stays fully static — the only runtime fetch is the local `data/dossiers.json`.
- Build fails loud on invalid overlay (name the bad entry); GitHub API failure must never fail the build (fall back to `src/data/dossier-cache.json`, warn).
- Redaction rule: any entry with `redaction` ≠ `none` must have no `links.repo` — enforced by validation.
- GitHub owner is `MistaJoka`.
- Follow existing deck idiom: pages copy the `tools.html` shell (rail / prompt / banner), JS follows `tool-registry.js` style (no frameworks, `DOMContentLoaded` init, defensive fetch).

---

### Task 1: Overlay schema validation + the triaged projects.json

**Files:**
- Create: `src/data/projects.json`
- Create: `scripts/dossier-lib.mjs`
- Test: `tests/dossier-validate.test.mjs`
- Modify: `package.json` (add `"test": "node --test tests/"`)

**Interfaces:**
- Produces: `validateProjects(data) -> string[]` (array of error messages, empty = valid), `ENUMS` constant. Later tasks import from `scripts/dossier-lib.mjs`.
- Produces: `src/data/projects.json` with shape `{ "projects": [Dossier, ...] }` where Dossier = `{ id, codename, tier, class, status, brief, redaction, source, links? }`.

- [ ] **Step 1: Write the failing validation tests**

Create `tests/dossier-validate.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProjects } from '../scripts/dossier-lib.mjs';

const valid = () => ({
  projects: [
    {
      id: 'pyloop', codename: 'PYLOOP', tier: 'listed', class: 'learning',
      status: 'stable', brief: 'A Python learning engine.',
      redaction: 'none', source: 'github-api',
      links: { repo: 'https://github.com/MistaJoka/pyloop' },
    },
  ],
});

test('valid overlay returns no errors', () => {
  assert.deepEqual(validateProjects(valid()), []);
});

test('missing required field is reported with entry id', () => {
  const data = valid();
  delete data.projects[0].brief;
  const errors = validateProjects(data);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /pyloop/);
  assert.match(errors[0], /brief/);
});

test('bad enum value is reported', () => {
  const data = valid();
  data.projects[0].tier = 'legendary';
  assert.match(validateProjects(data)[0], /tier/);
});

test('redacted entry with a repo link is rejected', () => {
  const data = valid();
  data.projects[0].redaction = 'no-code-link';
  assert.match(validateProjects(data)[0], /links\.repo/);
});

test('duplicate ids are rejected', () => {
  const data = valid();
  data.projects.push({ ...valid().projects[0] });
  assert.match(validateProjects(data).at(-1), /duplicate/i);
});

test('non-array projects is rejected', () => {
  assert.match(validateProjects({})[0], /projects/);
});
```

- [ ] **Step 2: Add the test script and run to verify failure**

In `package.json` `"scripts"`, add: `"test": "node --test tests/"`.

Run: `npm test`
Expected: FAIL — cannot find module `scripts/dossier-lib.mjs`.

- [ ] **Step 3: Implement validation**

Create `scripts/dossier-lib.mjs`:

```js
/** Shared dossier logic: schema validation and overlay/API merging. */

export const ENUMS = {
  tier: ['featured', 'listed', 'hidden'],
  class: ['ai', 'cyber', 'iot', 'game', 'client', 'learning'],
  status: ['active', 'stable', 'archived'],
  redaction: ['none', 'no-code-link', 'sanitized'],
  source: ['github-api', 'manual'],
};

const REQUIRED = ['id', 'codename', 'tier', 'class', 'status', 'brief', 'redaction', 'source'];
const LINK_KEYS = ['repo', 'demo', 'writeup'];

export function validateProjects(data) {
  const errors = [];
  if (!data || !Array.isArray(data.projects)) {
    return ['overlay root must be { "projects": [...] }'];
  }
  const seen = new Set();
  for (const p of data.projects) {
    const label = p && p.id ? p.id : '<no id>';
    for (const field of REQUIRED) {
      if (typeof p[field] !== 'string' || p[field].trim() === '') {
        errors.push(`${label}: missing or empty required field "${field}"`);
      }
    }
    for (const [field, allowed] of Object.entries(ENUMS)) {
      if (typeof p[field] === 'string' && !allowed.includes(p[field])) {
        errors.push(`${label}: invalid ${field} "${p[field]}" (allowed: ${allowed.join(', ')})`);
      }
    }
    if (p.links !== undefined) {
      if (typeof p.links !== 'object' || p.links === null || Array.isArray(p.links)) {
        errors.push(`${label}: links must be an object`);
      } else {
        for (const key of Object.keys(p.links)) {
          if (!LINK_KEYS.includes(key)) errors.push(`${label}: unknown links key "${key}"`);
          else if (typeof p.links[key] !== 'string') errors.push(`${label}: links.${key} must be a string`);
        }
      }
    }
    if (p.redaction && p.redaction !== 'none' && p.links && p.links.repo) {
      errors.push(`${label}: redaction "${p.redaction}" forbids links.repo`);
    }
    if (p.id) {
      if (seen.has(p.id)) errors.push(`${label}: duplicate id`);
      seen.add(p.id);
    }
  }
  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (6 tests).

- [ ] **Step 5: Create the full triaged overlay**

Create `src/data/projects.json`. This is the complete ~30-repo triage from the spec. Briefs are first-draft copy Andrae can edit later; tier/redaction decisions are the spec's.

```json
{
  "projects": [
    { "id": "offline-agent", "codename": "JARVIS", "tier": "featured", "class": "ai", "status": "active", "brief": "A local AI assistant and second brain — private, offline, and built to run the lair. The crown-jewel build.", "redaction": "no-code-link", "source": "manual" },
    { "id": "minitoo-studio", "codename": "MINITOO STUDIO", "tier": "featured", "class": "iot", "status": "active", "brief": "A local pixel-art animation studio that pushes frames to a Divoom MiniToo — code on the desk, pixels on the shelf.", "redaction": "no-code-link", "source": "manual" },
    { "id": "EvenButter-Site", "codename": "EVEN BUTTER", "tier": "featured", "class": "client", "status": "stable", "brief": "Shipped client website for Even Butter Bake Shop, built with Astro. Real client, real deadlines, real deploy.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/EvenButter-Site" } },
    { "id": "awus1900", "codename": "NIGHTHAWK", "tier": "featured", "class": "cyber", "status": "active", "brief": "Custom control app for an AWUS1900 Wi-Fi adapter, built for authorized network-security education on my own lab gear.", "redaction": "sanitized", "source": "manual" },
    { "id": "swarmgod", "codename": "SWARMGOD", "tier": "featured", "class": "game", "status": "active", "brief": "A personal god game in Godot 4 — watch life grow, suffer, and thrive on an earth-like world.", "redaction": "no-code-link", "source": "manual" },

    { "id": "radar", "codename": "RADAR", "tier": "listed", "class": "ai", "status": "active", "brief": "A private GitHub discovery and evaluation command center.", "redaction": "no-code-link", "source": "manual" },
    { "id": "ai-skill-tree", "codename": "SKILL TREE", "tier": "listed", "class": "ai", "status": "active", "brief": "Mapping AI capabilities as an explorable skill tree.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/ai-skill-tree" } },
    { "id": "Kali-bot", "codename": "KALI-BOT", "tier": "listed", "class": "cyber", "status": "active", "brief": "A local AI agent for Kali Linux, built for authorized security education in my own lab.", "redaction": "sanitized", "source": "manual" },
    { "id": "watchdog", "codename": "WATCHDOG", "tier": "listed", "class": "cyber", "status": "active", "brief": "A neighborhood-watch style monitor for the home network.", "redaction": "no-code-link", "source": "manual" },
    { "id": "samsung-tv-remote", "codename": "CLICKER", "tier": "listed", "class": "iot", "status": "stable", "brief": "A custom remote for the living-room Samsung TV — because the lair controls its own hardware.", "redaction": "no-code-link", "source": "manual" },
    { "id": "ginja-brain", "codename": "GINJA BRAIN", "tier": "listed", "class": "ai", "status": "stable", "brief": "AI Andrae — an experiment in giving my knowledge a second body.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/ginja-brain" } },
    { "id": "skills", "codename": "SKILLS", "tier": "listed", "class": "ai", "status": "stable", "brief": "Skills for real engineers, straight from my .claude directory — reusable AI crew members.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/skills" } },
    { "id": "pyloop", "codename": "PYLOOP", "tier": "listed", "class": "learning", "status": "stable", "brief": "A Python learning engine built for COP1047C — learn the course by building the tool.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/pyloop" } },
    { "id": "lawnbizops", "codename": "LAWNBIZOPS", "tier": "listed", "class": "client", "status": "stable", "brief": "Operations tooling for a lawn-care business.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/lawnbizops" } },
    { "id": "overthewire", "codename": "OVERTHEWIRE", "tier": "listed", "class": "cyber", "status": "stable", "brief": "My working guide through the OverTheWire wargames.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/overthewire" } },
    { "id": "JuiceWorldApp", "codename": "JUICE WORLD", "tier": "listed", "class": "cyber", "status": "stable", "brief": "A guide to the OWASP Juice Shop vulnhub, dockerized.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/JuiceWorldApp" } },
    { "id": "107Certified", "codename": "107 CERTIFIED", "tier": "listed", "class": "learning", "status": "stable", "brief": "Study tool for the FAA Part 107 drone certification.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/107Certified" } },
    { "id": "AI-Visually", "codename": "AI VISUALLY", "tier": "listed", "class": "ai", "status": "active", "brief": "Visual experiments in explaining AI.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/AI-Visually" } },
    { "id": "andraewilliams-site", "codename": "COMMAND DECK", "tier": "listed", "class": "learning", "status": "active", "brief": "This site — the lair itself, built level by level in public.", "redaction": "none", "source": "github-api", "links": { "repo": "https://github.com/MistaJoka/andraewilliams-site", "demo": "https://andraewilliams.com" } },

    { "id": "warp", "codename": "WARP", "tier": "hidden", "class": "ai", "status": "archived", "brief": "Fork — not my work to showcase.", "redaction": "none", "source": "manual" },
    { "id": "WebGoat", "codename": "WEBGOAT", "tier": "hidden", "class": "cyber", "status": "archived", "brief": "Fork — practice target, not my work.", "redaction": "none", "source": "manual" },
    { "id": "PayloadsAllTheThings", "codename": "PAYLOADS", "tier": "hidden", "class": "cyber", "status": "archived", "brief": "Fork — reference material, not my work.", "redaction": "none", "source": "manual" },
    { "id": "openhuman", "codename": "OPENHUMAN", "tier": "hidden", "class": "ai", "status": "archived", "brief": "Provenance unclear — review before showcasing.", "redaction": "none", "source": "manual" },
    { "id": "n8nStuff", "codename": "N8N STUFF", "tier": "hidden", "class": "ai", "status": "active", "brief": "Workflow scratchpad, not a showcase piece.", "redaction": "no-code-link", "source": "manual" },
    { "id": "ginja", "codename": "GINJA", "tier": "hidden", "class": "ai", "status": "archived", "brief": "Early experiment superseded by ginja-brain.", "redaction": "no-code-link", "source": "manual" },
    { "id": "Even-Butter-BakeShop", "codename": "EVEN BUTTER (V1)", "tier": "hidden", "class": "client", "status": "archived", "brief": "Superseded by EvenButter-Site.", "redaction": "no-code-link", "source": "manual" },
    { "id": "to_do_Rachel", "codename": "DAILYLOOP", "tier": "hidden", "class": "client", "status": "stable", "brief": "Private personal app for someone else — never showcased.", "redaction": "no-code-link", "source": "manual" },
    { "id": "PythonIntro", "codename": "PYTHON INTRO", "tier": "hidden", "class": "learning", "status": "archived", "brief": "Coursework stub.", "redaction": "none", "source": "manual" },
    { "id": "The-Basics", "codename": "THE BASICS", "tier": "hidden", "class": "learning", "status": "archived", "brief": "Coursework stub.", "redaction": "no-code-link", "source": "manual" }
  ]
}
```

- [ ] **Step 6: Prove the real overlay validates**

Run: `node -e "import('./scripts/dossier-lib.mjs').then(async m => { const fs = await import('node:fs'); const errs = m.validateProjects(JSON.parse(fs.readFileSync('src/data/projects.json','utf8'))); if (errs.length) { console.error(errs.join('\n')); process.exit(1);} console.log('overlay valid'); })"`
Expected: `overlay valid`

- [ ] **Step 7: Commit**

```bash
git add scripts/dossier-lib.mjs tests/dossier-validate.test.mjs src/data/projects.json package.json
git commit -m "feat(dossiers): overlay schema validation + full 29-repo triage"
```

---

### Task 2: Merge + cache fallback logic

**Files:**
- Modify: `scripts/dossier-lib.mjs` (append)
- Test: `tests/dossier-merge.test.mjs`

**Interfaces:**
- Consumes: `ENUMS` from Task 1.
- Produces: `mergeDossier(entry, apiData) -> Dossier` — returns a new object; `apiData` is `{ language, pushed_at, html_url, archived } | null`. `buildDossierList(projects, fetchResults) -> { dossiers, cache, warnings }` where `fetchResults` is `Map<id, {ok: boolean, data?: apiData}>` and `cache` is the prior cache object `{ [id]: apiData }` passed via `fetchResults` misses. Exact behavior below; Task 3 calls these.

- [ ] **Step 1: Write the failing merge tests**

Create `tests/dossier-merge.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeDossier, buildDossierList } from '../scripts/dossier-lib.mjs';

const entry = (over = {}) => ({
  id: 'pyloop', codename: 'PYLOOP', tier: 'listed', class: 'learning',
  status: 'stable', brief: 'My words.', redaction: 'none', source: 'github-api',
  links: { repo: 'https://github.com/MistaJoka/pyloop' }, ...over,
});
const api = { language: 'TypeScript', pushed_at: '2026-08-01T00:00:00Z', html_url: 'https://github.com/MistaJoka/pyloop', archived: false };

test('merge attaches api metadata under meta', () => {
  const d = mergeDossier(entry(), api);
  assert.equal(d.meta.language, 'TypeScript');
  assert.equal(d.meta.pushedAt, '2026-08-01T00:00:00Z');
});

test('overlay always beats api: brief and links untouched', () => {
  const d = mergeDossier(entry({ links: { repo: 'https://example.com/mine' } }), api);
  assert.equal(d.brief, 'My words.');
  assert.equal(d.links.repo, 'https://example.com/mine');
});

test('merge with null api returns entry with empty meta', () => {
  const d = mergeDossier(entry(), null);
  assert.deepEqual(d.meta, {});
});

test('manual entries pass through untouched (no meta fetch expected)', () => {
  const d = mergeDossier(entry({ source: 'manual' }), null);
  assert.equal(d.source, 'manual');
});

test('buildDossierList excludes hidden tier from dossiers', () => {
  const projects = [entry(), entry({ id: 'ghost', tier: 'hidden' })];
  const { dossiers } = buildDossierList(projects, new Map());
  assert.deepEqual(dossiers.map((d) => d.id), ['pyloop']);
});

test('buildDossierList uses fetch result when ok, warns and continues when not', () => {
  const projects = [entry(), entry({ id: 'down', links: {} })];
  const results = new Map([
    ['pyloop', { ok: true, data: api }],
    ['down', { ok: false }],
  ]);
  const { dossiers, warnings, cache } = buildDossierList(projects, results);
  assert.equal(dossiers[0].meta.language, 'TypeScript');
  assert.deepEqual(dossiers[1].meta, {});
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /down/);
  assert.deepEqual(cache.pyloop, api);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`
Expected: FAIL — `mergeDossier` is not exported.

- [ ] **Step 3: Implement merge + list building**

Append to `scripts/dossier-lib.mjs`:

```js
export function mergeDossier(entry, apiData) {
  const meta = apiData
    ? { language: apiData.language ?? null, pushedAt: apiData.pushed_at ?? null, archived: Boolean(apiData.archived) }
    : {};
  return { ...entry, links: { ...(entry.links || {}) }, meta };
}

/**
 * fetchResults: Map<id, {ok, data}> for source:"github-api" entries only.
 * Returns dossiers (hidden excluded), fresh cache of successful fetches, warnings.
 */
export function buildDossierList(projects, fetchResults) {
  const dossiers = [];
  const cache = {};
  const warnings = [];
  for (const entry of projects) {
    let apiData = null;
    if (entry.source === 'github-api') {
      const result = fetchResults.get(entry.id);
      if (result && result.ok) {
        apiData = result.data;
        cache[entry.id] = result.data;
      } else if (result) {
        warnings.push(`${entry.id}: GitHub fetch failed, no cache entry — building from overlay only`);
      }
    }
    if (entry.tier !== 'hidden') dossiers.push(mergeDossier(entry, apiData));
  }
  return { dossiers, cache, warnings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (12 tests total).

- [ ] **Step 5: Commit**

```bash
git add scripts/dossier-lib.mjs tests/dossier-merge.test.mjs
git commit -m "feat(dossiers): overlay/api merge with hidden-tier exclusion and warnings"
```

---

### Task 3: Build orchestrator — fetch, cache fallback, emit

**Files:**
- Create: `scripts/build-dossiers.mjs`
- Create: `src/data/dossier-cache.json` (seed: `{}`)
- Test: `tests/build-dossiers.test.mjs`
- Modify: `package.json` (build chain), `.gitignore` (ignore emitted file)

**Interfaces:**
- Consumes: `validateProjects`, `buildDossierList` from `scripts/dossier-lib.mjs`.
- Produces: `runBuild({ readFile, writeFile, fetchRepo, log }) -> Promise<number>` (exit code) exported for tests; CLI entry writes `src/data/dossiers.json` with shape `{ generated, count, dossiers }`. `fetchRepo(id) -> Promise<{ok, data?}>`.

- [ ] **Step 1: Write the failing orchestrator test**

Create `tests/build-dossiers.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBuild } from '../scripts/build-dossiers.mjs';

const OVERLAY = JSON.stringify({
  projects: [
    { id: 'pub', codename: 'PUB', tier: 'featured', class: 'ai', status: 'active', brief: 'x', redaction: 'none', source: 'github-api', links: { repo: 'https://github.com/MistaJoka/pub' } },
    { id: 'priv', codename: 'PRIV', tier: 'listed', class: 'iot', status: 'active', brief: 'y', redaction: 'no-code-link', source: 'manual' },
    { id: 'gone', codename: 'GONE', tier: 'hidden', class: 'learning', status: 'archived', brief: 'z', redaction: 'none', source: 'manual' },
  ],
});
const API = { language: 'Rust', pushed_at: '2026-08-01T00:00:00Z', html_url: 'u', archived: false };

function harness({ overlay = OVERLAY, cache = '{}', fetchOk = true } = {}) {
  const writes = {};
  const logs = [];
  return {
    writes, logs,
    io: {
      readFile: (path) => (path.endsWith('projects.json') ? overlay : cache),
      writeFile: (path, content) => { writes[path] = content; },
      fetchRepo: async () => (fetchOk ? { ok: true, data: API } : { ok: false }),
      log: (msg) => logs.push(msg),
    },
  };
}

test('happy path: emits dossiers.json without hidden, updates cache', async () => {
  const h = harness();
  const code = await runBuild(h.io);
  assert.equal(code, 0);
  const emitted = JSON.parse(h.writes['src/data/dossiers.json']);
  assert.equal(emitted.count, 2);
  assert.deepEqual(emitted.dossiers.map((d) => d.id), ['pub', 'priv']);
  assert.equal(emitted.dossiers[0].meta.language, 'Rust');
  assert.deepEqual(JSON.parse(h.writes['src/data/dossier-cache.json']).pub, API);
});

test('invalid overlay fails loud with entry named, writes nothing', async () => {
  const bad = JSON.parse(OVERLAY);
  delete bad.projects[0].brief;
  const h = harness({ overlay: JSON.stringify(bad) });
  const code = await runBuild(h.io);
  assert.equal(code, 1);
  assert.deepEqual(h.writes, {});
  assert.ok(h.logs.some((l) => l.includes('pub') && l.includes('brief')));
});

test('api down + warm cache: build succeeds using cached data', async () => {
  const h = harness({ fetchOk: false, cache: JSON.stringify({ pub: API }) });
  const code = await runBuild(h.io);
  assert.equal(code, 0);
  const emitted = JSON.parse(h.writes['src/data/dossiers.json']);
  assert.equal(emitted.dossiers[0].meta.language, 'Rust');
  assert.ok(h.logs.some((l) => /cache/i.test(l)));
});

test('api down + cold cache: build still succeeds, overlay-only, warns', async () => {
  const h = harness({ fetchOk: false });
  const code = await runBuild(h.io);
  assert.equal(code, 0);
  const emitted = JSON.parse(h.writes['src/data/dossiers.json']);
  assert.deepEqual(emitted.dossiers[0].meta, {});
  assert.ok(h.logs.some((l) => /warn/i.test(l)));
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`
Expected: FAIL — cannot find module `scripts/build-dossiers.mjs`.

- [ ] **Step 3: Implement the orchestrator**

Create `scripts/build-dossiers.mjs`:

```js
/**
 * Build-time dossier generator.
 * projects.json (curated overlay) + public GitHub metadata -> src/data/dossiers.json
 * Never fails the build on API errors (cache fallback); always fails on invalid overlay.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { validateProjects, buildDossierList } from './dossier-lib.mjs';

const OWNER = 'MistaJoka';
const OVERLAY_PATH = 'src/data/projects.json';
const CACHE_PATH = 'src/data/dossier-cache.json';
const OUT_PATH = 'src/data/dossiers.json';

async function defaultFetchRepo(id) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${id}`, {
      headers: { accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return { ok: false };
    const body = await res.json();
    return { ok: true, data: { language: body.language, pushed_at: body.pushed_at, html_url: body.html_url, archived: body.archived } };
  } catch {
    return { ok: false };
  }
}

export async function runBuild({ readFile, writeFile, fetchRepo, log }) {
  const overlay = JSON.parse(readFile(OVERLAY_PATH));
  const errors = validateProjects(overlay);
  if (errors.length) {
    for (const err of errors) log(`dossiers: INVALID OVERLAY — ${err}`);
    return 1;
  }

  const cache = JSON.parse(readFile(CACHE_PATH));
  const fetchResults = new Map();
  for (const entry of overlay.projects) {
    if (entry.source !== 'github-api') continue;
    const result = await fetchRepo(entry.id);
    if (!result.ok && cache[entry.id]) {
      log(`dossiers: ${entry.id} fetch failed — using cache`);
      fetchResults.set(entry.id, { ok: true, data: cache[entry.id] });
    } else {
      if (!result.ok) log(`dossiers: warning — ${entry.id} fetch failed, no cache; overlay only`);
      fetchResults.set(entry.id, result);
    }
  }

  const { dossiers, cache: freshCache, warnings } = buildDossierList(overlay.projects, fetchResults);
  for (const warning of warnings) log(`dossiers: warning — ${warning}`);

  writeFile(OUT_PATH, JSON.stringify({ generated: new Date().toISOString(), count: dossiers.length, dossiers }, null, 2));
  if (Object.keys(freshCache).length) {
    writeFile(CACHE_PATH, JSON.stringify({ ...cache, ...freshCache }, null, 2));
  }
  log(`dossiers: emitted ${dossiers.length} dossiers`);
  return 0;
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const code = await runBuild({
    readFile: (p) => readFileSync(p, 'utf8'),
    writeFile: (p, c) => writeFileSync(p, c),
    fetchRepo: defaultFetchRepo,
    log: console.error,
  });
  process.exit(code);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (16 tests total).

- [ ] **Step 5: Seed cache, wire the build chain, ignore the emitted file**

1. Create `src/data/dossier-cache.json` containing exactly `{}`.
2. In `package.json` scripts, change `build:site` to:
   `"build:site": "node scripts/build-level-1.mjs && node scripts/build-dossiers.mjs && bash scripts/assemble-site.sh && bash scripts/verify-site.sh"`
   and add `"build:dossiers": "node scripts/build-dossiers.mjs"`.
3. In `.gitignore`, under the `_site/` line, add: `src/data/dossiers.json`.

- [ ] **Step 6: Run the real build end-to-end (live API)**

Run: `npm run build:dossiers && node -e "const d=require('./src/data/dossiers.json'); console.log(d.count, 'dossiers,', d.dossiers.filter(x=>x.tier==='featured').length, 'featured')"`
Expected: `19 dossiers, 5 featured` and a populated `src/data/dossier-cache.json`.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-dossiers.mjs tests/build-dossiers.test.mjs src/data/dossier-cache.json package.json .gitignore
git commit -m "feat(dossiers): build-time generator with GitHub sync and cache fallback"
```

---

### Task 4: The Missions wall page

**Files:**
- Create: `src/missions.html`
- Create: `src/js/dossier-wall.js`
- Create: `src/css/dossier-wall.css`
- Modify: `src/index.html`, `src/about.html`, `src/tools.html` (rail nav: add Missions link)

**Interfaces:**
- Consumes: `data/dossiers.json` emitted by Task 3 (`{ generated, count, dossiers }`; dossier fields per Task 1 plus `meta.language`/`meta.pushedAt`).
- Produces: page at `/missions.html`; no exports.

- [ ] **Step 1: Create the page**

Create `src/missions.html`, copying the deck shell from `src/tools.html` (same `<head>` font/css links and `<body class="deck-page">` rail/prompt/banner structure — read `src/tools.html` first and mirror it exactly). Differences:

- `<title>Missions — Andrae Williams</title>`, description meta "Mission dossiers — the full project library of Andrae Williams's lair.", canonical `https://andraewilliams.com/missions.html`. Omit og/twitter image tags for now (no generated image yet).
- Rail: same nav block as tools.html plus the new link, with `active`/`aria-current` on Missions.
- Prompt line command: `./operator --dossiers`.
- Main content inside the deck main area:

```html
<section class="dossier-wall" aria-label="Mission dossiers">
  <header class="dossier-head">
    <h1>MISSION DOSSIERS</h1>
    <p id="dossier-count" class="dossier-count">// loading</p>
    <div class="dossier-filters" id="dossier-filters" role="group" aria-label="Filter by class">
      <button type="button" class="dossier-filter active" data-class="all">ALL</button>
      <button type="button" class="dossier-filter" data-class="ai">AI</button>
      <button type="button" class="dossier-filter" data-class="cyber">CYBER</button>
      <button type="button" class="dossier-filter" data-class="iot">IOT</button>
      <button type="button" class="dossier-filter" data-class="game">GAME</button>
      <button type="button" class="dossier-filter" data-class="client">CLIENT</button>
      <button type="button" class="dossier-filter" data-class="learning">LEARNING</button>
    </div>
  </header>
  <div id="featured-grid" class="dossier-grid dossier-grid-featured"></div>
  <div id="listed-grid" class="dossier-grid dossier-grid-listed"></div>
</section>
```

- Before `</body>`: `<link rel="stylesheet" href="css/dossier-wall.css" />` goes in `<head>` with the other stylesheets; scripts follow tools.html's pattern plus `<script src="js/dossier-wall.js" defer></script>`.

- [ ] **Step 2: Implement the renderer**

Create `src/js/dossier-wall.js` (follows `tool-registry.js` idiom):

```js
/** Renders the mission dossier wall from data/dossiers.json. */
const DATA_URL = 'data/dossiers.json';

let all = [];

function card(d) {
  const el = document.createElement('article');
  el.className = `dossier-card tier-${d.tier} class-${d.class}`;
  el.dataset.class = d.class;

  const head = document.createElement('header');
  const codename = document.createElement('h2');
  codename.className = 'dossier-codename';
  codename.textContent = d.codename;
  const status = document.createElement('span');
  status.className = `dossier-status status-${d.status}`;
  status.textContent = d.status.toUpperCase();
  head.append(codename, status);

  const brief = document.createElement('p');
  brief.className = 'dossier-brief';
  brief.textContent = d.brief;

  const meta = document.createElement('p');
  meta.className = 'dossier-meta';
  const bits = [d.class.toUpperCase()];
  if (d.meta && d.meta.language) bits.push(d.meta.language);
  if (d.redaction === 'sanitized') bits.push('SANITIZED');
  else if (d.redaction === 'no-code-link') bits.push('PRIVATE BUILD');
  meta.textContent = `// ${bits.join(' · ')}`;

  const links = document.createElement('p');
  links.className = 'dossier-links';
  const linkDefs = [
    ['repo', 'source ↗', true],
    ['demo', 'live ↗', true],
    ['writeup', 'case file', false],
  ];
  for (const [key, label, external] of linkDefs) {
    if (!d.links || !d.links[key]) continue;
    const a = document.createElement('a');
    a.href = d.links[key];
    a.textContent = label;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    if (links.childNodes.length) links.appendChild(document.createTextNode(' · '));
    links.appendChild(a);
  }

  el.append(head, brief, meta);
  if (links.childNodes.length) el.appendChild(links);
  return el;
}

function render(filterClass) {
  const featured = document.getElementById('featured-grid');
  const listed = document.getElementById('listed-grid');
  const countEl = document.getElementById('dossier-count');
  const visible = all.filter((d) => filterClass === 'all' || d.class === filterClass);
  featured.replaceChildren(...visible.filter((d) => d.tier === 'featured').map(card));
  listed.replaceChildren(...visible.filter((d) => d.tier === 'listed').map(card));
  if (countEl) countEl.textContent = `// ${visible.length} dossiers on file`;
}

async function init() {
  const featured = document.getElementById('featured-grid');
  if (!featured) return;
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(String(res.status));
    all = (await res.json()).dossiers || [];
    render('all');
  } catch {
    const countEl = document.getElementById('dossier-count');
    if (countEl) countEl.textContent = '// dossier retrieval failed';
    return;
  }
  document.getElementById('dossier-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.dossier-filter');
    if (!btn) return;
    document.querySelectorAll('.dossier-filter').forEach((b) => b.classList.toggle('active', b === btn));
    render(btn.dataset.class);
  });
}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 3: Style it**

Create `src/css/dossier-wall.css` using the deck's existing custom properties (read `src/css/command-deck.css` first and reuse its color/border variables rather than hardcoding new colors):

```css
.dossier-wall { padding: 1rem 1.25rem 2rem; overflow-y: auto; }
.dossier-head h1 { font-family: 'Rajdhani', sans-serif; letter-spacing: 0.12em; margin: 0 0 0.25rem; }
.dossier-count { font-family: 'JetBrains Mono', monospace; opacity: 0.7; margin: 0 0 0.75rem; }
.dossier-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
.dossier-filter { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; letter-spacing: 0.08em;
  background: transparent; border: 1px solid currentColor; opacity: 0.55; padding: 0.25rem 0.6rem; cursor: pointer; color: inherit; }
.dossier-filter.active, .dossier-filter:hover { opacity: 1; }
.dossier-grid { display: grid; gap: 0.9rem; margin-bottom: 1.5rem; }
.dossier-grid-featured { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.dossier-grid-listed { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.dossier-card { border: 1px solid rgba(255, 255, 255, 0.14); padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; }
.dossier-card.tier-featured { border-width: 2px; }
.dossier-card header { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
.dossier-codename { font-family: 'Rajdhani', sans-serif; font-size: 1.05rem; letter-spacing: 0.1em; margin: 0; }
.dossier-status { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; opacity: 0.7; }
.dossier-brief { margin: 0; font-size: 0.85rem; line-height: 1.45; }
.dossier-meta { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; opacity: 0.6; }
.dossier-links { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; }
```

Adjust selectors/values after visual check in Step 5 so it sits naturally inside the deck theme — matching the deck's look wins over this starting CSS.

- [ ] **Step 4: Add the rail link on all pages**

In `src/index.html`, `src/about.html`, `src/tools.html`, and `src/missions.html`, the rail nav gains (after the Tools link, matching each page's exact rail markup):

```html
<a class="deck-rail-link" href="missions.html" title="Missions"><span class="deck-dot" aria-hidden="true"></span>M</a>
```

- [ ] **Step 5: Visual check**

Run: `npm run build:dossiers && cd src && python3 -m http.server 8080`
Open `http://localhost:8080/missions.html`. Verify: 5 featured cards, 14 listed cards, filters narrow the wall (CYBER shows NIGHTHAWK + 4 listed), sanitized/private badges render, rail M link present on all four pages, nothing broken on mobile width (devtools, 390px).

- [ ] **Step 6: Commit**

```bash
git add src/missions.html src/js/dossier-wall.js src/css/dossier-wall.css src/index.html src/about.html src/tools.html
git commit -m "feat(dossiers): missions wall page with tier grid and class filters"
```

---

### Task 5: Wire verification + full-build proof

**Files:**
- Modify: `scripts/verify-site.sh`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: everything prior; no new interfaces.

- [ ] **Step 1: Extend site verification**

In `scripts/verify-site.sh`, add to the required-files loop (after `"data/lab.json"`):

```
  "missions.html" \
  "data/dossiers.json" \
```

Then append a dossier drift check after the existing manifest check, before the `missing` summary:

```bash
if command -v node >/dev/null 2>&1; then
  node -e "
    const fs = require('fs');
    const emitted = JSON.parse(fs.readFileSync('$SITE/data/dossiers.json', 'utf8'));
    const overlay = JSON.parse(fs.readFileSync('$ROOT/src/data/projects.json', 'utf8'));
    const expected = overlay.projects.filter(p => p.tier !== 'hidden').length;
    if (emitted.count !== expected || emitted.dossiers.length !== expected) {
      console.error('Dossier drift: emitted ' + emitted.dossiers.length + ', overlay expects ' + expected);
      process.exit(1);
    }
    console.log('Dossier drift check passed (' + expected + ' dossiers).');
  " || missing=$((missing + 1))
fi
```

- [ ] **Step 2: Run the full build as proof**

Run: `npm test && npm run build:site`
Expected: all tests pass; build output ends with `Dossier drift check passed (19 dossiers).` and `Site verification passed.`

- [ ] **Step 3: Update the roadmap**

In `docs/roadmap.md` Phase 3 list, add:

```markdown
- [x] Dossier wall: full-repo mission library with build-time GitHub sync (see docs/superpowers/specs/2026-08-10-dossier-wall-design.md)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-site.sh docs/roadmap.md
git commit -m "feat(dossiers): site verification for missions wall + roadmap update"
```

---

## Definition of done (Milestone 1, from spec)

The wall is live at andraewilliams.com (push to main → Vercel deploys), and adding a project is provably one JSON entry + push. Final proof after deploy: open `https://andraewilliams.com/missions.html`, confirm 5 featured + 14 listed, filters work.
