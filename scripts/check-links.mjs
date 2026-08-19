// Verifies every internal href in the built site resolves to a real
// emitted file. Astro will happily build a page containing a link to a
// route that does not exist, so this is the only thing standing between
// a typo and a 404 in production.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = 'dist';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));
const routes = new Set();
for (const f of files) {
  const rel = '/' + relative(DIST, f).split('\\').join('/');
  routes.add(rel);
  if (rel.endsWith('/index.html')) {
    routes.add(rel.slice(0, -'index.html'.length)); // "/posts/x/"
    routes.add(rel.slice(0, -'/index.html'.length) + '/'); // same, defensive
  }
}

const problems = [];
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const from = '/' + relative(DIST, page);
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|#|data:)/.test(raw)) continue;
    const path = raw.split('#')[0].split('?')[0];
    if (!path.startsWith('/')) continue;
    const ok = routes.has(path) || routes.has(path + 'index.html') || routes.has(path + '/');
    if (!ok) problems.push(`${from} -> ${raw}`);
  }
}

console.log(`checked ${pages.length} pages, ${routes.size} known routes`);
if (problems.length) {
  console.error(`\n${problems.length} broken internal link(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('all internal links resolve');
