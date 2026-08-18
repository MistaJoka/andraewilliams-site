// Luminance-ordered ramp: sparsest (dark) to densest (bright) ink coverage.
const RAMP = ' .:-=+*#%@';

export function buildFontAtlas(gl, { cellWidth = 8, cellHeight = 14, textColor = '#eeeeee' } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.round(cellWidth * dpr);
  const ch = Math.round(cellHeight * dpr);

  const canvas = document.createElement('canvas');
  canvas.width = cw * RAMP.length;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = textColor;
  ctx.font = `${Math.round(ch * 0.85)}px "JetBrains Mono", "SF Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < RAMP.length; i++) {
    const cx = i * cw + cw / 2;
    const cy = ch / 2;
    ctx.fillText(RAMP[i], cx, cy);
  }

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return { texture, rampLength: RAMP.length, cellWidth: cw, cellHeight: ch, dpr };
}
