import { prepare, layout } from '@chenglou/pretext';

const text =
  'andraewilliams.com — Pretext measures this paragraph without DOM layout thrash. ' +
  'Resize the window and watch layout() re-run with the new width. '.repeat(3);

const font = '400 15px Inter, sans-serif';
const lineHeight = 24;

const prepared = prepare(text, font);

function measure() {
  const maxWidth = Math.min(480, window.innerWidth - 48);
  const { height, lineCount } = layout(prepared, maxWidth, lineHeight);

  document.getElementById('out').textContent = JSON.stringify(
    {
      maxWidthPx: maxWidth,
      lineHeightPx: lineHeight,
      lineCount,
      heightPx: height,
      font,
      textPreview: text.slice(0, 72) + '…',
    },
    null,
    2
  );
}

measure();
window.addEventListener('resize', measure);
