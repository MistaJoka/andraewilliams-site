// Display helpers shared by cards, headers and the feed.

export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

/** Difficulty is stored as DEEP_DIVE; it is shown as DEEP DIVE. */
export const formatDifficulty = (d: string): string => d.replace(/_/g, ' ');

/** 200 wpm, floored at 1. Good enough to set expectations, which is all
 *  a read-time estimate is for. */
export const readingTime = (body: string | undefined): number =>
  Math.max(1, Math.round((body?.trim().split(/\s+/).length ?? 0) / 200));

/** "04 / 09" — zero-padded so the counter does not jitter in a mono face. */
export const seriesCounter = (order: number, total: number): string =>
  `${String(order).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
