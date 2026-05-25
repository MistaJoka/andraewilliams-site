import { walkLineRanges } from '@chenglou/pretext';

/** Binary-search tightest width preserving line count (somnai pattern). */
export function shrinkwrapWidth(prepared, maxWidth) {
  let targetLineCount = 0;
  let widestLine = 0;
  walkLineRanges(prepared, maxWidth, (line) => {
    targetLineCount++;
    if (line.width > widestLine) widestLine = line.width;
  });
  if (targetLineCount <= 1) {
    return { width: Math.ceil(widestLine), lineCount: targetLineCount };
  }
  let lo = 1;
  let hi = Math.ceil(widestLine);
  while (lo < hi) {
    const mid = lo + (hi >>> 1);
    let count = 0;
    walkLineRanges(prepared, mid, () => {
      count++;
    });
    if (count <= targetLineCount) hi = mid;
    else lo = mid + 1;
  }
  return { width: lo, lineCount: targetLineCount };
}

/** Widest line width at a given max width (for CSS waste calc). */
export function widestLineAt(prepared, maxWidth) {
  let widest = 0;
  walkLineRanges(prepared, maxWidth, (line) => {
    if (line.width > widest) widest = line.width;
  });
  return Math.ceil(widest);
}
