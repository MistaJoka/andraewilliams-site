// Reading-level ladder used to badge every topic writeup. A reader picks
// their floor, not a category — ELI5 and DEEP_DIVE cover the same ground.
export const DIFFICULTY = ['ELI5', 'BEGINNER', 'INTERMEDIATE', 'DEEP_DIVE'] as const;
export type Difficulty = (typeof DIFFICULTY)[number];
