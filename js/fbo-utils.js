// ELI5: shaders can't remember anything between frames. So we park last
// frame's result in a texture and hand it back next frame — a whiteboard
// erased and redrawn each tick.
// Deep dive: shared setup for any sim that ping-pongs a pair of these
// instead of being a stateless f(uv, time) scene — currently reaction.

export function createSimTexture(gl, size, { filter, initialData } = {}) {
  const tex = gl.createTexture();                    // allocate a GPU texture handle
  gl.bindTexture(gl.TEXTURE_2D, tex);                 // make it the active 2D texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, initialData || null); // allocate size×size RGBA storage, seeded with initialData (or blank)
  const f = filter || gl.LINEAR;                      // LINEAR (smooth) unless caller wants NEAREST (crisp cells)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); // sampling when shrunk
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f); // sampling when enlarged
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // no wraparound sampling on x
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // no wraparound sampling on y
  return tex;
}

// ELI5: an FBO lets the GPU paint into a texture instead of the screen —
// the sim shader's off-screen canvas.
export function createFbo(gl, texture) {
  const fbo = gl.createFramebuffer();                 // allocate an off-screen render target
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);             // make it the active framebuffer
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0); // wire the texture as this FBO's draw target
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);            // switch back to the default (screen) framebuffer
  return fbo;
}

// ELI5: one triangle bigger than the screen, clipped down to fill it
// exactly — cheaper than the usual two-triangle quad.
// Deep dive: verts at (-1,-1), (3,-1), (-1,3) — 2x clip space; the GPU
// clips the rest away.
export function createFullscreenTriBuffer(gl) {
  const tri = new Float32Array([-1, -1, 3, -1, -1, 3]); // the 3 oversized vertices
  const buf = gl.createBuffer();                        // allocate a GPU vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);                  // make it the active array buffer
  gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);  // upload once — never updated again
  return buf;
}
