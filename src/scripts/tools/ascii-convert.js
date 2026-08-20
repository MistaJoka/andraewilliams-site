// Image → ASCII via plain 2D canvas luminance sampling. Same density-ramp
// idea as the lab's WebGL font atlas (src/scripts/ascii/font-atlas.js),
// reimplemented here as text output over a shader glyph atlas — that
// pipeline is GLSL-shader-driven and not reusable for a flat 2D convert.
const RAMP = ' .:-=+*#%@';

// Monospace glyphs run roughly twice as tall as wide; correcting for it
// keeps the output from stretching vertically.
const CHAR_ASPECT = 0.55;

export function luminanceToChar(lum, invert = false) {
  const v = invert ? 1 - lum : lum;
  const idx = Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * RAMP.length)));
  return RAMP[idx];
}

/** Draws `image` into `canvas` at `cols` width and returns the ASCII text. */
export function renderAscii(ctx, canvas, image, cols, invert = false) {
  const rows = Math.max(1, Math.round((image.height / image.width) * cols * CHAR_ASPECT));
  canvas.width = cols;
  canvas.height = rows;
  ctx.drawImage(image, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);

  let text = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      text += luminanceToChar(lum, invert);
    }
    text += '\n';
  }
  return text;
}
