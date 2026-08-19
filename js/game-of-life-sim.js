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

// ELI5: classic Conway's Life — each cell checks its 8 neighbors:
//   - alive + 2 or 3 neighbors -> survives
//   - dead + exactly 3 neighbors -> springs to life
//   - otherwise -> dies (loneliness or overcrowding)
// Left alone, boards settle static or die out, so a small patch reseeds
// randomly every couple seconds to keep new shapes forming.
// Deep dive: neighbor count is always an exact small int (hard 0/1
// inputs), so == comparisons are safe — no rounding-error risk.
const SIM_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uReseedCenter;
uniform float uReseedActive;
uniform float uReseedSeed;

// Read one cell as a hard 0/1.
float alive(vec2 uv) {
  return texture2D(uPrev, uv).r > 0.5 ? 1.0 : 0.0;
}

// Cheap 2D hash -> pseudo-random 0..1, used only for the reseed patch.
float hashL(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  float self = alive(vUv);

  // Sum the 8 surrounding cells.
  float n = 0.0;
  n += alive(vUv + vec2(-uTexel.x, -uTexel.y));
  n += alive(vUv + vec2(0.0, -uTexel.y));
  n += alive(vUv + vec2(uTexel.x, -uTexel.y));
  n += alive(vUv + vec2(-uTexel.x, 0.0));
  n += alive(vUv + vec2(uTexel.x, 0.0));
  n += alive(vUv + vec2(-uTexel.x, uTexel.y));
  n += alive(vUv + vec2(0.0, uTexel.y));
  n += alive(vUv + vec2(uTexel.x, uTexel.y));

  // Conway's rule: survive on 2-3, birth on exactly 3.
  float next = 0.0;
  if (self > 0.5) {
    next = (n == 2.0 || n == 3.0) ? 1.0 : 0.0;
  } else {
    next = (n == 3.0) ? 1.0 : 0.0;
  }

  // ELI5: inside a small circle, randomly flip ~40% of cells alive
  // regardless of Conway's rule — injected chaos for a settled/dead board.
  if (uReseedActive > 0.5 && distance(vUv, uReseedCenter) < 0.14) {
    float r = hashL(vUv * 97.13 + uReseedSeed);
    next = r > 0.6 ? 1.0 : next;
  }

  gl_FragColor = vec4(next, next, next, 1.0);
}
`;

// ELI5: too sparse -> dies of loneliness; too dense -> dies of
// overcrowding. ~28% alive is the sweet spot that self-organizes into
// gliders/oscillators instead of flatlining.
function initialLifeData(size) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const alive = Math.random() < 0.28 ? 255 : 0; // ~28% of cells start alive
    data[i * 4] = alive;
    data[i * 4 + 1] = alive;
    data[i * 4 + 2] = alive;
    data[i * 4 + 3] = 255;
  }
  return data;
}

export class GameOfLifeSim {
  constructor(gl, size = 96, stepIntervalMs = 100) {
    this.gl = gl;
    this.size = size;
    this.stepIntervalMs = stepIntervalMs;
    this.program = createProgram(gl, SIM_VERT_SRC, SIM_FRAG_SRC);
    this.locations = {
      aPosition: gl.getAttribLocation(this.program, 'aPosition'),
      uPrev: gl.getUniformLocation(this.program, 'uPrev'),
      uTexel: gl.getUniformLocation(this.program, 'uTexel'),
      uReseedCenter: gl.getUniformLocation(this.program, 'uReseedCenter'),
      uReseedActive: gl.getUniformLocation(this.program, 'uReseedActive'),
      uReseedSeed: gl.getUniformLocation(this.program, 'uReseedSeed'),
    };

    // Two identical random-seeded textures + one FBO each — the
    // ping-pong pair. NEAREST filtering keeps cells crisp.
    const initialData = initialLifeData(size);
    this.textures = [
      createSimTexture(gl, size, { filter: gl.NEAREST, initialData }),
      createSimTexture(gl, size, { filter: gl.NEAREST, initialData }),
    ];
    this.fbos = [createFbo(gl, this.textures[0]), createFbo(gl, this.textures[1])];
    this.readIndex = 0;

    this.triBuffer = createFullscreenTriBuffer(gl);
    this.nextStepAt = 0;
    this.nextReseedAt = 0;
  }

  get texture() {
    return this.textures[this.readIndex]; // whichever texture holds the latest completed frame
  }

  step(nowMs) {
    if (nowMs < this.nextStepAt) return; // throttle: only advance every stepIntervalMs
    this.nextStepAt = nowMs + this.stepIntervalMs;

    const gl = this.gl;
    const writeIndex = 1 - this.readIndex; // ping-pong: write to the other slot

    // Schedule the next reseed pulse, or skip if it's not due yet.
    let reseedActive = 0;
    let reseedCenter = [0.5, 0.5];
    if (nowMs >= this.nextReseedAt) {
      reseedActive = 1;
      reseedCenter = [0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7]; // random point on the board
      this.nextReseedAt = nowMs + 2500 + Math.random() * 2500; // next reseed in ~2.5-5s
    }

    // Render target: the "write" texture, sized to the sim resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);
    gl.viewport(0, 0, this.size, this.size);
    gl.useProgram(this.program);

    // Fullscreen triangle as the only geometry.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(this.locations.aPosition);
    gl.vertexAttribPointer(this.locations.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Bind last frame's texture as input, and push this step's uniforms.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
    gl.uniform1i(this.locations.uPrev, 0);
    gl.uniform2f(this.locations.uTexel, 1 / this.size, 1 / this.size);
    gl.uniform2f(this.locations.uReseedCenter, reseedCenter[0], reseedCenter[1]);
    gl.uniform1f(this.locations.uReseedActive, reseedActive);
    gl.uniform1f(this.locations.uReseedSeed, Math.random() * 100.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3); // run the shader over every pixel

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.readIndex = writeIndex; // swap — next step reads what we just wrote
  }
}
