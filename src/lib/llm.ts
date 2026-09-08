// Pure logic behind /how-llms-predict-text/ -- no DOM, so it's directly
// unit-testable (see llm.test.ts) and importable by the page. The bigram
// map is passed in rather than closed over, so tests can build a small
// deterministic one instead of relying on the full toy corpus.

export const CORPUS = `The cat sat on the mat. The cat likes to nap in the sun. The dog ran across the yard.
The dog likes to bark at the mailman. The cat and the dog are friends. The cat sat by the window
and watched the birds. The dog sat by the door and waited for the mail. The sun was warm and the
cat felt sleepy. The yard was green and the dog loved to run. The mailman came to the door every
day. The cat did not like the mailman. The dog did not like the vacuum. The vacuum was loud and
scared the dog. The cat hid under the bed when the vacuum came out. Every morning the cat ate
breakfast by the window. Every morning the dog waited by the door for a walk. The walk was the
best part of the dog's day. The nap was the best part of the cat's day. The birds sang in the tree
by the window. The tree was tall and full of leaves. In the evening the family sat by the fire.
The cat curled up on the warm rug. The dog lay down next to the cat. They were tired after a long
day. The stars came out and the house grew quiet. The cat closed its eyes and began to dream. The
dog let out a big yawn and fell asleep too.`;

export type Bigram = Map<string, Map<string, number>>;

export function corpusWords(corpus: string): string[] {
  return corpus.toLowerCase().replace(/[.,!?']/g, '').split(/\s+/).filter(Boolean);
}

export function buildBigram(corpus: string): Bigram {
  const words = corpusWords(corpus);
  const bigram: Bigram = new Map();
  for (let i = 0; i < words.length - 1; i++) {
    const ctx = words[i];
    const next = words[i + 1];
    if (!bigram.has(ctx)) bigram.set(ctx, new Map());
    const m = bigram.get(ctx)!;
    m.set(next, (m.get(next) ?? 0) + 1);
  }
  return bigram;
}

export interface Candidate { word: string; count: number; pct: number; }

export function predict(bigram: Bigram, context: string, topN = 5): Candidate[] | null {
  const lastWord = context.trim().toLowerCase().split(/\s+/).pop();
  if (!lastWord) return null;
  const m = bigram.get(lastWord);
  if (!m) return null;
  const total = Array.from(m.values()).reduce((a, b) => a + b, 0);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, pct: (count / total) * 100 }));
}

// A generator so the UI can reveal each word as it's actually sampled,
// not as a typewriter effect played over text computed all at once.
export function* generateSteps(bigram: Bigram, seed: string, numWords = 15): Generator<string> {
  const seq = seed.trim().toLowerCase().split(/\s+/).filter(Boolean);
  yield seq.join(' ');
  for (let i = 0; i < numWords; i++) {
    const last = seq[seq.length - 1];
    const m = bigram.get(last);
    if (!m) return;
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosen: string | undefined;
    for (const [w, c] of m) {
      r -= c;
      if (r <= 0) { chosen = w; break; }
    }
    seq.push(chosen ?? Array.from(m.keys())[0]);
    yield seq.join(' ');
  }
}
