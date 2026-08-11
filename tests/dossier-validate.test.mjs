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
