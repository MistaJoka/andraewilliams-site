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
