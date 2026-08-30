// The contract for every piece of content on the site. Astro validates
// frontmatter against these schemas at build time, so a malformed post
// fails the build instead of rendering wrong.
//
// Note: reference() validates the SHAPE of a link, not that the target
// exists — a dangling reference resolves to undefined at runtime rather
// than failing here. src/lib/integrity.ts closes that gap.
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';
import { POST_TYPES, DIFFICULTY, STATUS, TRACKS } from './lib/enums';

const MD = '**/[^_]*.{md,mdx}';

const topics = defineCollection({
  loader: file('src/data/topics.yaml'),
  schema: z.object({
    // Constrained because a topic id is interpolated into a generated CSS
    // rule for the JS-free feed filters (`<style set:html>`). Anything
    // outside this alphabet could terminate the rule and inject its own.
    // Enforcing it here means a bad id fails the build instead of
    // reaching a stylesheet.
    id: z.string().regex(/^[a-z0-9-]+$/, 'topic id must be lowercase letters, digits and hyphens only'),
    label: z.string(),
    accent: z.string().regex(/^--[a-z0-9-]+$/, 'accent must name a CSS custom property'),
    glyph: z.string().min(1).max(2),
    blurb: z.string().max(160),
    order: z.number().int().default(99),
  }),
});

const series = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/series' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    topics: z.array(reference('topics')).min(1),
    status: z.enum(['ONGOING', 'COMPLETE', 'ABANDONED']).default('ONGOING'),
    // How many parts the series is planned to run to. This is what the
    // "04 / 09" counter divides by, so a part can publish before every
    // earlier part exists without the position becoming a lie.
    plannedParts: z.number().int().positive(),
    started: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

// Provenance (`built` / `model`) lives on projects and lab entries only.
// Posts are Andrae's writing and carry no AI attribution.
const provenance = {
  built: z.string().optional(),
  model: z.string().optional(),
  source: z.url().optional(),
};

const projects = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    status: z.enum(STATUS),
    topics: z.array(reference('topics')).min(1),
    tags: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    repo: z.url().optional(),
    demo: z.url().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    ...provenance,
  }),
});

const lab = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/lab' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    status: z.enum(STATUS),
    outcome: z.enum(['CONFIRMED', 'REFUTED', 'INCONCLUSIVE', 'ONGOING']).default('ONGOING'),
    topics: z.array(reference('topics')).min(1),
    tags: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    // Presence of `scene` is what mounts the WebGL engine on this entry.
    scene: z.enum(['particles', 'aura', 'fire', 'inkSlash', 'mechaHud', 'reaction']).optional(),
    project: reference('projects').optional(),
    draft: z.boolean().default(false),
    ...provenance,
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    status: z.enum(STATUS),
    // Portfolio: distinctive, demonstrates craft. Utility: plain reader value.
    // Drives the grouping on the /tools index.
    category: z.enum(['portfolio', 'utility']),
    topics: z.array(reference('topics')).min(1),
    tags: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    // Presence of `app` is what mounts the interactive tool on this entry —
    // same role `scene` plays for lab's WebGL engine.
    app: z.enum(['cidr', 'ascii-convert', 'compose-ports', 'contrast', 'cron', 'secrets']).optional(),
    draft: z.boolean().default(false),
    ...provenance,
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    url: z.url(),
    author: z.string().optional(),
    kind: z.enum(['BOOK', 'PAPER', 'TOOL', 'VIDEO', 'COURSE', 'REPO', 'POST']),
    topics: z.array(reference('topics')).min(1),
    tags: z.array(z.string()).default([]),
    why: z.string().max(240),
    added: z.coerce.date(),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/posts' }),
  schema: z
    .object({
      title: z.string().max(90),
      description: z.string().max(200),
      type: z.enum(POST_TYPES),
      difficulty: z.enum(DIFFICULTY),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      topics: z.array(reference('topics')).min(1),
      series: reference('series').optional(),
      seriesOrder: z.number().int().positive().optional(),
      featured: z.boolean().default(false),
      project: reference('projects').optional(),
      status: z.enum(STATUS).optional(),
      related: z
        .object({
          posts: z.array(reference('posts')).default([]),
          topics: z.array(reference('topics')).default([]),
          projects: z.array(reference('projects')).default([]),
        })
        .default({ posts: [], topics: [], projects: [] }),
      resources: z.array(reference('resources')).default([]),
      draft: z.boolean().default(false),
    })
    .refine((d) => (d.series == null) === (d.seriesOrder == null), {
      message: 'series and seriesOrder must be set together',
    })
    .refine((d) => !d.status || ['BUILD', 'EXPERIMENT', 'ARCHITECTURE'].includes(d.type), {
      message: 'status is only meaningful on BUILD / EXPERIMENT / ARCHITECTURE posts',
    }),
});

// Distilled clippings, synced from the Obsidian vault by
// scripts/sync-signal.mjs. These are machine-written compressions of other
// people's articles and videos, which is why they are their own collection
// rather than posts: `posts` is Andrae's writing and says so above.
//
// `track` is the vault's own reading taxonomy and is the primary facet on
// /signal/. `topics` is deliberately optional — over half the corpus
// (webdev, creative, meta-learning) has no honest site hub, and an entry
// with no topic is the normal case, not a defect.
const signal = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/signal' }),
  schema: z.object({
    title: z.string().max(120),
    description: z.string().max(300),
    track: z.enum(TRACKS),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // Attribution is not optional. The page credits the original before it
    // says anything of its own.
    source: z.object({
      url: z.url(),
      title: z.string(),
      author: z.string().optional(),
      kind: z.enum(['VIDEO', 'ARTICLE', 'COURSE']),
    }),
    topics: z.array(reference('topics')).default([]),
    // Rewritten from the vault's ## Connections. The sync drops any link
    // whose target is not published, so these always resolve.
    related: z.array(reference('signal')).default([]),
    built: z.string().optional(),
    model: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// The Savage Bible — a hidden reference area (/savage/). Deliberately has
// no `topics` field: it stays out of the knowledge graph, topic hubs,
// search index, RSS and sitemap. Reachable by URL and the homepage
// easter egg only.
const savageDomains = defineCollection({
  loader: file('src/data/savage-domains.yaml'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'domain id must be lowercase letters, digits and hyphens only'),
    label: z.string(),
    // Short code used in citation ids (BDY·03). Uppercase so it reads as a
    // reference, not a word.
    code: z.string().regex(/^[A-Z]{2,4}$/, 'code must be 2–4 uppercase letters'),
    creed: z.string().max(160),
    blurb: z.string().max(200),
    order: z.number().int().positive(),
  }),
});

const savageStandards = defineCollection({
  loader: glob({ pattern: MD, base: './src/content/savage' }),
  schema: z.object({
    title: z.string().max(80),
    // The commandment. One line, no hedging — this is the ceiling.
    ceiling: z.string().max(160),
    summary: z.string().max(200),
    domain: reference('savageDomains'),
    // Position within the domain; integrity.ts enforces uniqueness so a
    // citation id never points at two standards.
    order: z.number().int().positive(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, projects, lab, tools, series, resources, topics, signal, savageDomains, savageStandards };
