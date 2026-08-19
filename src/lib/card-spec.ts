// Ten card types stay visually distinct without ten codebases: the
// differences live here as data, and four layout components read it.
//
// Distinctness comes from grid footprint + frame + which metadata is
// shown — deliberately NOT from colour alone, so the feed still reads as
// a taxonomy in greyscale.
import type { PostType } from './enums';

export type Archetype = 'link' | 'feature' | 'status' | 'media';
export type Frame = 'hairline' | 'bracket' | 'slab' | 'ticket' | 'poster';
export type MetaField = 'date' | 'difficulty' | 'status' | 'series' | 'readingTime';

export interface CardSpec {
  archetype: Archetype;
  /** Desktop grid footprint. Collapses to 1x1 on mobile — see cards.css. */
  span: { col: 1 | 2; row: 1 | 2 };
  accent: string;
  glyph: string;
  meta: MetaField[];
  showExcerpt: boolean;
  frame: Frame;
}

export const CARD_SPEC: Record<PostType, CardSpec> = {
  TLDR:         { archetype: 'link',    span: { col: 1, row: 1 }, accent: '--topic-cyber',     glyph: '≡', meta: ['date'],                                    showExcerpt: false, frame: 'hairline' },
  ELI5:         { archetype: 'feature', span: { col: 1, row: 1 }, accent: '--topic-homelab',   glyph: '◐', meta: ['date', 'difficulty'],                      showExcerpt: true,  frame: 'slab'     },
  BUILD:        { archetype: 'status',  span: { col: 2, row: 1 }, accent: '--topic-mma',       glyph: '▤', meta: ['date', 'status', 'difficulty'],            showExcerpt: true,  frame: 'bracket'  },
  EXPERIMENT:   { archetype: 'status',  span: { col: 1, row: 2 }, accent: '--status-testing',  glyph: '⌁', meta: ['date', 'status'],                          showExcerpt: true,  frame: 'bracket'  },
  ARCHITECTURE: { archetype: 'media',   span: { col: 2, row: 2 }, accent: '--topic-ai',        glyph: '◫', meta: ['date', 'difficulty', 'series'],            showExcerpt: true,  frame: 'slab'     },
  TUTORIAL:     { archetype: 'feature', span: { col: 1, row: 1 }, accent: '--topic-resources', glyph: '▷', meta: ['date', 'difficulty', 'series'],            showExcerpt: true,  frame: 'ticket'   },
  RESOURCE:     { archetype: 'link',    span: { col: 1, row: 1 }, accent: '--topic-resources', glyph: '↗', meta: ['date'],                                    showExcerpt: false, frame: 'hairline' },
  VISUAL:       { archetype: 'media',   span: { col: 2, row: 1 }, accent: '--topic-anime',     glyph: '◉', meta: ['date'],                                    showExcerpt: false, frame: 'poster'   },
  MMA:          { archetype: 'media',   span: { col: 1, row: 2 }, accent: '--topic-mma',       glyph: '✕', meta: ['date'],                                    showExcerpt: true,  frame: 'poster'   },
  ANIME:        { archetype: 'media',   span: { col: 1, row: 2 }, accent: '--topic-anime',     glyph: '✦', meta: ['date'],                                    showExcerpt: true,  frame: 'poster'   },
};

export const cardSpec = (type: PostType): CardSpec => CARD_SPEC[type];
