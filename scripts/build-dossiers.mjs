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
