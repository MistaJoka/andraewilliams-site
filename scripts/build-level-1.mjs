#!/usr/bin/env node
/**
 * Level 1 build — assembles HTML from partials + page bodies.
 * Generates site-meta.json at build time (Assembly tier proof).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const L1 = path.join(ROOT, 'src/level-1');
const PARTIALS = path.join(L1, '_partials');
const PAGES = path.join(L1, '_pages');

function read(name) {
  return fs.readFileSync(path.join(PARTIALS, name), 'utf8');
}

function gitShort() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

const pages = fs.readdirSync(PAGES).filter((f) => f.endsWith('.html'));

const meta = {
  level: 1,
  label: 'Assembly',
  builtAt: new Date().toISOString(),
  commit: gitShort(),
  pages: pages.map((f) => f.replace(/\.html$/, '')),
  partials: fs.readdirSync(PARTIALS).filter((f) => f.endsWith('.html')),
  generator: 'scripts/build-level-1.mjs',
};

fs.mkdirSync(path.join(L1, 'data'), { recursive: true });
fs.writeFileSync(path.join(L1, 'data/site-meta.json'), JSON.stringify(meta, null, 2) + '\n');

const shellStart = read('shell-start.html');
const shellEnd = read('shell-end.html');

for (const file of pages) {
  const slug = file.replace(/\.html$/, '');
  const title = slug === 'index' ? 'Level 1 · Assembly' : `Level 1 · ${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const body = fs.readFileSync(path.join(PAGES, file), 'utf8');
  const html = shellStart.replace('{{PAGE_TITLE}}', title).replace('{{PAGE_SLUG}}', slug === 'index' ? '' : slug) + body + shellEnd;
  fs.writeFileSync(path.join(L1, file === 'index.html' ? 'index.html' : file), html);
}

console.log(`Built Level 1 (${pages.length} pages, commit ${meta.commit})`);
