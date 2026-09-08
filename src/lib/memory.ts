// Pure logic behind /ai-memory/ -- no DOM, so it's directly unit-testable
// (see memory.test.ts) and importable by the page.

export interface MemoryEntry { text: string; score: number; }

export const SALIENT_KEYWORDS = ['prefer', 'always', 'never', 'remember', 'favorite', 'hate', 'love', "i'm", 'i am', 'my name', 'birthday', 'deadline', 'allerg'];
export const STOPWORDS = new Set(['i', 'a', 'an', 'the', 'is', 'my', 'to', 'of', 'and', 'in', 'on', 'for', 'it', 'this', 'that', "i'm", 'should']);
export const SALIENCE_THRESHOLD = 3;

export function salience(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of SALIENT_KEYWORDS) if (lower.includes(kw)) score += 2;
  if (/\d/.test(text)) score += 1;
  const properNouns = (text.match(/\b[A-Z][a-z]+\b/g) ?? []).filter((w) => text.indexOf(w) !== 0).length;
  score += Math.min(properNouns, 2);
  return score;
}

export function keywords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
}

export function retrieve(query: string, entries: MemoryEntry[]): MemoryEntry | null {
  const qWords = new Set(keywords(query));
  let best: { entry: MemoryEntry; overlap: number } | null = null;
  for (const entry of entries) {
    const overlap = keywords(entry.text).filter((w) => qWords.has(w)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { entry, overlap };
  }
  return best?.entry ?? null;
}
