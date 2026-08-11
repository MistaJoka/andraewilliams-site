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
