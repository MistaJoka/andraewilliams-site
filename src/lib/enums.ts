// Single source of truth for the content taxonomy. The Zod schemas, the
// feed filter chips and the card registry all read from here, so a new
// post type is one edit, not three that can drift apart.

export const POST_TYPES = [
  'TLDR', 'ELI5', 'BUILD', 'EXPERIMENT', 'ARCHITECTURE',
  'TUTORIAL', 'RESOURCE', 'VISUAL', 'MMA', 'ANIME',
] as const;

export const DIFFICULTY = ['ELI5', 'BEGINNER', 'INTERMEDIATE', 'DEEP_DIVE'] as const;

// Status describes work that can be in flight. Spec: it belongs on
// projects, lab entries and build/experiment posts — never on a plain
// article, which has no meaningful "BROKEN" state.
export const STATUS = ['IDEA', 'TESTING', 'WORKING', 'BROKEN', 'PRODUCTION', 'ARCHIVED'] as const;

export type PostType = (typeof POST_TYPES)[number];
export type Difficulty = (typeof DIFFICULTY)[number];
export type Status = (typeof STATUS)[number];
