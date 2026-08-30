// Publishes flagged distilled notes from the Obsidian vault into the
// `signal` content collection.
//
// The vault is the source of truth and is never written to from here. A note
// travels only when its frontmatter says `publish: true`, so nothing reaches
// the web that Andrae did not flag by hand.
//
// Three things are stripped on the way out, deliberately:
//   `mission`               — written for Andrae personally, not for readers
//   ## Distillation Notes   — internal QA about the distillation run
//   dead ## Connections     — wikilinks whose target is not published
// The last one is not a nicety: scripts/check-links.mjs fails the build on a
// dead internal link, so an unrewritten wikilink would break the deploy.
//
// Usage:
//   node scripts/sync-signal.mjs --doctor    audit the corpus, write nothing
//   node scripts/sync-signal.mjs --dry-run   show what would change
//   node scripts/sync-signal.mjs             write src/content/signal/
import { readdir, readFile, writeFile, unlink, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VAULT = process.env.SIGNAL_VAULT ?? '/Users/andraewilliams/Desktop/Obsidian Vault';
const NOTES = join(VAULT, '30 Notes');
const OUT = join(ROOT, 'src/content/signal');

const argv = new Set(process.argv.slice(2));
const DOCTOR = argv.has('--doctor');
const DRY = argv.has('--dry-run') || DOCTOR;
const VERBOSE = argv.has('--verbose') || DOCTOR;

// Provenance stamped on every entry. These are machine-written compressions
// and the page says so; this is the machine that wrote them.
const BUILT = 'Claude Code — distill-clipping pipeline';

// Vault track -> site topic. The keys mirror TRACKS in src/lib/enums.ts; if
// they drift, the `signal` schema's z.enum rejects the emitted file and the
// build fails, so the two cannot silently diverge.
//
// Only mappings that are honest: agents/rag-data
// are AI, security is cyber. webdev, creative and meta-learning have no site
// hub, so they carry no topic rather than being forced into a wrong one.
const TRACK_TO_TOPICS = {
  agents: ['ai'],
  'rag-data': ['ai'],
  security: ['cyber'],
  creative: [],
  webdev: [],
  'meta-learning': [],
};
const TRACKS = Object.keys(TRACK_TO_TOPICS);

// Published in this order. Anything not listed here never leaves the vault.
const KEEP_SECTIONS = [
  'TLDR', 'Caveman', 'ELI5', 'Course Map',
  'Trunk → Branches', 'Key Patterns', 'Stress Test', 'In Practice',
];
const REQUIRED_SECTIONS = ['TLDR', 'ELI5', 'Trunk → Branches'];

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
// A quoted run longer than this many words stops being commentary and starts
// being reproduction. Guards the copyright posture.
const MAX_QUOTE_WORDS = 25;

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Filesystem-stable slug. Unicode punctuation and emoji are folded away. */
function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')        // combining marks
    .replace(/[\u2018\u2019\u02bc']/g, '')  // apostrophes vanish, not hyphenate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `[[Name]]` / `[[Name | alias]]` -> `Name`. Also tolerates a bare string. */
function unwikilink(v) {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== 'string') return undefined;
  const m = s.match(/\[\[([^\]]+)\]\]/);
  const inner = m ? m[1] : s;
  return clean(inner.split('|')[0]) || undefined;
}

/** Markdown -> plain text, for the meta description. */
function plain(md) {
  return clean(
    md
      .replace(/\[\[([^\]]+)\]\]/g, (_, t) => t.split('|')[0])
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, ''),
  );
}

function truncate(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\-—\s]+$/, '') + '…';
}

/** Split a note body into `## `-delimited sections, preserving order. */
function splitSections(body) {
  const out = [];
  const re = /^##[ \t]+(.+?)[ \t]*$/gm;
  const heads = [...body.matchAll(re)];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].index + heads[i][0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
    out.push({ title: clean(heads[i][1]), body: body.slice(start, end).replace(/^\r?\n+/, '').trimEnd() });
  }
  return out;
}

const SEC_ALIASES = { 'trunk → branches': 'Trunk → Branches', 'trunk -> branches': 'Trunk → Branches' };
const canonSection = (t) => SEC_ALIASES[t.toLowerCase()] ?? t;

/** `M:SS` / `H:MM:SS` -> seconds. */
function toSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

/**
 * Normalise citations. The corpus carries three formats: the canonical
 * `[¶M:SS]`, a deprecated `[¶**M:SS**]` that broke the vault's own verifier,
 * and `[§ Heading]` for articles (left alone — there is nothing to link to).
 * For video sources the timestamp becomes a deep link into the original,
 * which is a real reader feature and reinforces the attribution.
 */
function normaliseCitations(md, sourceUrl, kind) {
  let out = md.replace(/\[¶\s*\*\*([\d:]+)\*\*\s*\]/g, '[¶$1]');
  if (kind !== 'VIDEO' || !sourceUrl) return out;
  return out.replace(/\[¶\s*([\d]{1,2}(?::[\d]{2}){1,2})\s*\]/g, (whole, ts) => {
    const secs = toSeconds(ts);
    if (secs == null) return whole;
    try {
      const u = new URL(sourceUrl);
      u.searchParams.set('t', `${secs}s`);
      return `[¶${ts}](${u.toString()})`;
    } catch {
      return whole;
    }
  });
}

/**
 * Rewrite `## Connections` against the set of notes actually being published.
 * A bullet survives only if every wikilink in it resolves; otherwise it is
 * dropped whole, because a half-rewritten bullet reads as a broken thought.
 */
function rewriteConnections(sectionBody, published) {
  const related = new Set();
  const kept = [];
  for (const block of sectionBody.split(/\n(?=[-*] )/)) {
    const bullet = block.trimEnd();
    if (!bullet.trim()) continue;
    const links = [...bullet.matchAll(/\[\[([^\]]+)\]\]/g)];
    if (!links.length) continue;
    const targets = links.map((m) => published.get(clean(m[1].split('|')[0])));
    if (targets.some((t) => !t)) continue;
    targets.forEach((t) => related.add(t.slug));
    let rewritten = bullet;
    links.forEach((m, i) => {
      const label = clean(m[1].split('|')[0]).replace(/\s*\(distilled\)$/i, '');
      rewritten = rewritten.replace(m[0], `[${label}](/signal/${targets[i].slug}/)`);
    });
    kept.push(rewritten);
  }
  return { body: kept.join('\n'), related: [...related].sort() };
}

/**
 * Quoted runs longer than MAX_QUOTE_WORDS — the near-reproduction guard.
 * Both quote marks must sit on the same line: a `"` opened in one bullet and
 * closed three paragraphs later is punctuation, not a quotation, and matching
 * across it flags the whole corpus. Run this on the PUBLISHED body only —
 * `mission` is the longest quoted string in most notes and never ships.
 */
function longQuotes(md) {
  const found = [];
  for (const m of md.matchAll(/[\u201c]([^\u201c\u201d\n]+)[\u201d]|"([^"\n]+)"/g)) {
    const text = (m[1] ?? m[2]).trim();
    const words = text.split(/\s+/).length;
    if (words > MAX_QUOTE_WORDS) found.push(`${words}-word quote: "${truncate(text, 60)}"`);
  }
  return found;
}

/** Read + parse one vault note. Never throws; defects are returned. */
async function readNote(name) {
  const raw = await readFile(join(NOTES, name), 'utf8');
  const m = raw.match(FM_RE);
  const note = { name, defects: [], warnings: [] };
  if (!m) {
    note.defects.push('no frontmatter block');
    return note;
  }
  try {
    note.fm = YAML.parse(m[1]);
  } catch (e) {
    note.defects.push(`frontmatter is not valid YAML — ${e.message.split('\n')[0]}`);
    return note;
  }
  if (!note.fm || typeof note.fm !== 'object') {
    note.defects.push('frontmatter is not a mapping');
    return note;
  }
  note.body = m[2];
  note.publish = note.fm.publish === true;

  const vaultTitle = name.replace(/\.md$/, '');
  note.vaultTitle = vaultTitle;
  note.title = vaultTitle.replace(/\s*\(distilled\)$/i, '');
  note.slug = slugify(note.title);
  if (!note.slug) note.defects.push('title slugifies to an empty string');

  const tags = Array.isArray(note.fm.tags) ? note.fm.tags : [];
  note.track = tags.map((t) => String(t).match(/^track\/(.+)$/)?.[1]).find(Boolean);
  if (!note.track) note.defects.push('no track/* tag');
  else if (!TRACKS.includes(note.track)) note.defects.push(`unknown track "${note.track}"`);

  note.sourceUrl = clean(note.fm.source_url);
  if (!note.sourceUrl) note.defects.push('no source_url — attribution is mandatory');
  else if (!/^https?:\/\//.test(note.sourceUrl)) note.defects.push(`source_url is not an http(s) URL: ${note.sourceUrl}`);

  note.sourceTitle = unwikilink(note.fm.source_note) ?? note.title;
  note.author = unwikilink(note.fm.author);
  if (!note.author) note.warnings.push('no author — the page will credit the source only');

  note.kind = note.fm.type === 'distilled-course' ? 'COURSE'
    : /(?:^|\/\/|\.)(?:youtube\.com|youtu\.be)/.test(note.sourceUrl ?? '') ? 'VIDEO'
    : 'ARTICLE';

  note.date = note.fm.created instanceof Date
    ? note.fm.created.toISOString().slice(0, 10)
    : clean(note.fm.created);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(note.date ?? '')) note.defects.push(`created is not a YYYY-MM-DD date: ${note.date}`);

  note.sections = splitSections(note.body);
  const have = new Set(note.sections.map((s) => canonSection(s.title)));
  for (const req of REQUIRED_SECTIONS) if (!have.has(req)) note.defects.push(`missing section: ## ${req}`);

  const tldr = note.sections.find((s) => canonSection(s.title) === 'TLDR');
  const firstBullet = tldr?.body.split('\n').find((l) => /^[-*] /.test(l.trim()));
  note.description = firstBullet ? truncate(plain(firstBullet.replace(/^\s*[-*] /, '')), 300) : '';
  if (!note.description) note.defects.push('could not derive a description from the first TLDR bullet');

  // Lint only what actually ships, and only warn: a long quoted run is a
  // prompt or a config snippet as often as it is prose. A human flips the
  // publish flag, so a human is the right place for this judgement.
  const shipped = note.sections
    .filter((s) => KEEP_SECTIONS.includes(canonSection(s.title)))
    .map((s) => s.body)
    .join('\n');
  for (const q of longQuotes(shipped)) note.warnings.push(`check quotation — ${q}`);

  return note;
}

/** Build the publishable `.md` for one note. */
function render(note, published) {
  const conn = note.sections.find((s) => canonSection(s.title) === 'Connections');
  const { body: connBody, related } = conn
    ? rewriteConnections(conn.body, published)
    : { body: '', related: [] };

  const data = {
    title: note.title,
    description: note.description,
    track: note.track,
    date: note.date,
    source: {
      url: note.sourceUrl,
      title: note.sourceTitle,
      ...(note.author ? { author: note.author } : {}),
      kind: note.kind,
    },
    topics: TRACK_TO_TOPICS[note.track] ?? [],
    related,
    built: BUILT,
  };

  const chunks = [];
  for (const want of KEEP_SECTIONS) {
    const s = note.sections.find((x) => canonSection(x.title) === want);
    if (!s || !s.body.trim()) continue;
    chunks.push(`## ${want}\n\n${normaliseCitations(s.body, note.sourceUrl, note.kind)}`);
  }
  if (connBody.trim()) chunks.push(`## Connections\n\n${connBody}`);

  // A generated-file banner, so the next person to open this knows editing it
  // here is pointless — the vault wins on the next sync.
  const banner = `<!-- Generated by scripts/sync-signal.mjs from "${note.vaultTitle}" in the Obsidian vault. Edit the vault note, not this file. -->`;
  return `---\n${YAML.stringify(data, { lineWidth: 0 }).trimEnd()}\n---\n${banner}\n\n${chunks.join('\n\n')}\n`;
}

// ---------------------------------------------------------------------------

async function main() {
  try {
    await access(NOTES);
  } catch {
    console.error(`[signal] vault not found at ${NOTES}`);
    console.error('[signal] set SIGNAL_VAULT to the vault root, or skip this step on a machine without the vault.');
    process.exit(DOCTOR || DRY ? 1 : 0); // a plain build on another machine must not fail
  }

  const names = (await readdir(NOTES)).filter((f) => f.endsWith('(distilled).md')).sort();
  const notes = [];
  for (const n of names) notes.push(await readNote(n));

  const flagged = notes.filter((n) => n.publish);
  const broken = notes.filter((n) => n.defects.length);
  const blocking = flagged.filter((n) => n.defects.length);

  // Pass 1: the published set, needed before any Connections can be rewritten.
  const published = new Map();
  const bySlug = new Map();
  for (const n of flagged) {
    if (n.defects.length) continue;
    if (bySlug.has(n.slug)) {
      n.defects.push(`slug "${n.slug}" collides with ${bySlug.get(n.slug).name}`);
      blocking.push(n);
      continue;
    }
    bySlug.set(n.slug, n);
    published.set(n.vaultTitle, n);
    published.set(n.title, n);
  }

  console.log(`[signal] vault: ${NOTES}`);
  console.log(`[signal] ${notes.length} distilled notes · ${flagged.length} flagged publish:true · ${broken.length} with defects`);

  if (VERBOSE && broken.length) {
    console.log('\n[signal] defects (blocking only when the note is flagged for publishing):');
    for (const n of broken) {
      console.log(`  ${n.publish ? 'BLOCKING' : 'inactive'}  ${n.name}`);
      for (const d of n.defects) console.log(`      · ${d}`);
    }
  }
  if (VERBOSE) {
    const warned = notes.filter((n) => n.warnings.length && n.publish);
    for (const n of warned) for (const w of n.warnings) console.log(`  warn      ${n.name} · ${w}`);
  }

  if (blocking.length) {
    console.error(`\n[signal] ${blocking.length} note(s) flagged publish:true but defective — refusing to sync.`);
    for (const n of blocking) console.error(`  ${n.name}: ${n.defects.join('; ')}`);
    process.exit(1);
  }

  if (DOCTOR) {
    console.log(`\n[signal] doctor: ${broken.length ? `${broken.length} unflagged note(s) need attention before they can publish` : 'corpus is clean'}`);
    process.exit(0);
  }

  // Pass 2: emit.
  await mkdir(OUT, { recursive: true });
  const existing = new Set(
    (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith('.md')),
  );

  let written = 0, unchanged = 0, removed = 0;
  for (const n of bySlug.values()) {
    const file = `${n.slug}.md`;
    const next = render(n, published);
    const prev = existing.has(file) ? await readFile(join(OUT, file), 'utf8') : null;
    existing.delete(file);
    if (prev === next) { unchanged++; continue; }
    written++;
    console.log(`  ${prev == null ? 'add   ' : 'update'} src/content/signal/${file}`);
    if (!DRY) await writeFile(join(OUT, file), next, 'utf8');
  }

  // Whatever is left was published before and is no longer flagged. Clearing
  // the flag has to actually take the page down.
  for (const file of existing) {
    removed++;
    console.log(`  remove src/content/signal/${file} (no longer flagged publish:true)`);
    if (!DRY) await unlink(join(OUT, file));
  }

  console.log(`\n[signal] ${DRY ? 'would write' : 'wrote'} ${written}, unchanged ${unchanged}, removed ${removed}`);
}

await main();
