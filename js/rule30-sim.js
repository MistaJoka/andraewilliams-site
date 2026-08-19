import { createProgram } from './gl-utils.js';
import { createSimTexture, createFbo, createFullscreenTriBuffer } from './fbo-utils.js';

// Fullscreen-triangle vertex shader: pass the clip-space position through
// as-is, and derive a 0..1 uv from it for the fragment shader.
const SIM_VERT_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// ELI5: Rule 30 = a row of on/off cells where each new row comes from the
// row above via one tiny rule ("look at yourself + 2 neighbors, flip
// on/off per Rule 30's table"). Stack rows down the screen and you get
// the classic chaos-from-one-pixel triangle.
//   - top row: recomputed fresh from the rule
//   - every other row: just copies the pixel above it
//   -> image quietly scrolls down while a new row is born at the top
// Deep dive: new = left XOR (center OR right). Same two-case rule every
// pixel, every frame — no "which row is active" branching needed.
const SIM_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;

// Read one cell as a hard 0/1, wrapping the column so left/right of the
// edges reads the opposite edge (col wraps; row does not).
float cellAt(float col, float row) {
  return texture2D(uPrev, vec2(mod(col, 1.0), row)).r > 0.5 ? 1.0 : 0.0;
}

void main() {
  if (vUv.y < uTexel.y) {
    // Top row: recompute from Rule 30 using last frame's top row.
    float row0 = uTexel.y * 0.5;
    float left = cellAt(vUv.x - uTexel.x, row0);
    float center = cellAt(vUv.x, row0);
    float right = cellAt(vUv.x + uTexel.x, row0);
    // ELI5: left/center/right are exactly 0 or 1, so abs(a-b) behaves
    // exactly like XOR for this case — cheaper than a real boolean XOR.
    float next = abs(left - max(center, right)); // XOR for 0/1 floats
    gl_FragColor = vec4(next, next, next, 1.0);
  } else {
    // Every other row: copy the pixel directly above — the "scroll down" half.
    gl_FragColor = texture2D(uPrev, vec2(vUv.x, vUv.y - uTexel.y));
  }
}
`;

// ELI5: not worth figuring out which row WebGL treats as "row 0" (an
// upload-order quirk) — so seed a live cell at BOTH ends. Whichever is
// the real start grows correctly; the other seed scrolls off harmlessly
// after one pass.
// Deep dive: seeds the middle column of row 0 and the last row.
function initialRule30Data(size) {
  const data = new Uint8Array(size * size * 4);
  const mid = Math.floor(size / 2);
  const setCell = (row) => {
    const i = (row * size + mid) * 4; // pixel index -> byte offset (4 bytes/pixel)
    data[i] = 255;     // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    data[i + 3] = 255; // A
  };
  setCell(0);
  setCell(size - 1);
  return data;
}

export class Rule30Sim {
  constructor(gl, size = 128, stepIntervalMs = 65) {
    this.gl = gl;
    this.size = size;
    this.stepIntervalMs = stepIntervalMs;
    this.program = createProgram(gl, SIM_VERT_SRC, SIM_FRAG_SRC);
    this.locations = {
      aPosition: gl.getAttribLocation(this.program, 'aPosition'),
      uPrev: gl.getUniformLocation(this.program, 'uPrev'),
      uTexel: gl.getUniformLocation(this.program, 'uTexel'),
    };

    // Two identical seeded textures + one FBO each — the ping-pong pair.
    // NEAREST filtering keeps cells crisp instead of blurring at edges.
    const initialData = initialRule30Data(size);
    this.textures = [
      createSimTexture(gl, size, { filter: gl.NEAREST, initialData }),
      createSimTexture(gl, size, { filter: gl.NEAREST, initialData }),
    ];
    this.fbos = [createFbo(gl, this.textures[0]), createFbo(gl, this.textures[1])];
    this.readIndex = 0;

    this.triBuffer = createFullscreenTriBuffer(gl);
    this.nextStepAt = 0;
  }

  get texture() {
    return this.textures[this.readIndex]; // whichever texture holds the latest completed frame
  }

  step(nowMs) {
    if (nowMs < this.nextStepAt) return; // throttle: only advance every stepIntervalMs
    this.nextStepAt = nowMs + this.stepIntervalMs;

    const gl = this.gl;
    const writeIndex = 1 - this.readIndex; // ping-pong: write to the other slot

    // Render target: the "write" texture, sized to the sim resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);
    gl.viewport(0, 0, this.size, this.size);
    gl.useProgram(this.program);

    // Fullscreen triangle as the only geometry.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(this.locations.aPosition);
    gl.vertexAttribPointer(this.locations.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Bind last frame's texture as input.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
    gl.uniform1i(this.locations.uPrev, 0);
    gl.uniform2f(this.locations.uTexel, 1 / this.size, 1 / this.size);

    gl.drawArrays(gl.TRIANGLES, 0, 3); // run the shader over every pixel

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.readIndex = writeIndex; // swap — next step reads what we just wrote
  }
}
