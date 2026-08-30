// Presentation data for the `signal` collection.
//
// Signal deliberately gets ONE accent for the whole section rather than a
// colour per track. That follows the rule card-spec.ts already states:
// distinctness comes from glyph, label and structure, "deliberately NOT
// from colour alone". Teal reads as material from elsewhere, which is
// exactly what these are.
import type { Track } from './enums';

export const SIGNAL_ACCENT = '--topic-resources';

export const TRACK_META: Record<Track, { label: string; glyph: string; blurb: string }> = {
  agents: { label: 'AGENTS', glyph: '◈', blurb: 'Agent loops, tools, memory, orchestration.' },
  'rag-data': { label: 'RAG / DATA', glyph: '▦', blurb: 'Retrieval, chunking, and where it quietly fails.' },
  security: { label: 'SECURITY', glyph: '▚', blurb: 'Offense, defense, and reading real traffic.' },
  webdev: { label: 'WEB', glyph: '◧', blurb: 'Frontend, layout, and the browser platform.' },
  creative: { label: 'CREATIVE', glyph: '✦', blurb: 'Generative art, ASCII, procedural systems.' },
  'meta-learning': { label: 'META', glyph: '◐', blurb: 'How to think, learn, and decide faster.' },
};

export type SourceKind = 'VIDEO' | 'ARTICLE' | 'COURSE';

export const KIND_GLYPH: Record<SourceKind, string> = {
  VIDEO: '▶',
  ARTICLE: '¶',
  COURSE: '≣',
};

/** Bare host, for showing where a source actually lives. */
export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
