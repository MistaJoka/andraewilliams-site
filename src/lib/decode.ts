// The site's one animation primitive: cycle an element's text through
// noise glyphs before settling on the real value, like a terminal
// resolving a signal. Shared because it was copy-pasted near-identically
// across four topic pages before this. Deliberately does NOT touch
// classList — pages differ on whether/how they show a "currently
// decoding" state, so that stays the caller's job via `onDone`.
const SCRAMBLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';
const timers = new WeakMap<HTMLElement, number>();

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface ScrambleOptions {
  frames?: number;
  frameMs?: number;
  onDone?: () => void;
}

export function scrambleText(el: HTMLElement, finalText: string, opts: ScrambleOptions = {}): void {
  const { frames = 6, frameMs = 30, onDone } = opts;
  const existing = timers.get(el);
  if (existing) clearInterval(existing);

  if (prefersReducedMotion() || el.textContent === finalText) {
    el.textContent = finalText;
    onDone?.();
    return;
  }

  let frame = 0;
  const timer = window.setInterval(() => {
    frame++;
    if (frame > frames) {
      clearInterval(timer);
      timers.delete(el);
      el.textContent = finalText;
      onDone?.();
      return;
    }
    el.textContent = Array.from({ length: finalText.length }, () => SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]).join('');
  }, frameMs);
  timers.set(el, timer);
}
