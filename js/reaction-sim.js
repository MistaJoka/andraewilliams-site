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

// ELI5: two imaginary chemicals sloshing in a dish. U is the food, V is
// the thing that eats it. Three rules, applied everywhere at once:
//   - both spread out into their neighbors (U spreads twice as fast)
//   - where V meets U it converts it: U + 2V -> 3V (V multiplies)
//   - U is topped up ("feed"), V is drained off ("kill")
// Feed slightly slower than V multiplies and the two never settle — they
// chase each other into stripes, spots and branching coral. Nobody
// designed the pattern; it is what those three rules cannot avoid doing.
//
// Deep dive: Gray-Scott reaction-diffusion, forward Euler, dt = 1.
//   U' = U + (Du*lap(U) - U*V^2 + F*(1-U))
//   V' = V + (Dv*lap(V) + U*V^2 - (F+k)*V)
// This is the engine's first scene that samples its own neighbors — the
// pattern only exists because each cell can read the ones around it.
const SIM_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uFeed;
uniform float uKill;
uniform float uKillSlope;

// ELI5: an 8-bit channel can only count in steps of 1/255. One tick of
// this chemistry changes V by far less than that, so stored in one
// channel the whole reaction would round to zero and freeze. Fix: spend
// two channels per chemical — one for the coarse value, one for the
// leftover — which buys ~1/65025 steps. RGBA holds U in RG, V in BA.
vec2 pack16(float v) {
  v = clamp(v, 0.0, 1.0);
  float hi = floor(v * 255.0) / 255.0;  // coarse part, exactly representable in 8 bits
  return vec2(hi, (v - hi) * 255.0);    // leftover, rescaled to fill its own channel
}

float unpack16(vec2 p) {
  return p.x + p.y / 255.0;
}

// One cell's (U, V). fract() wraps the edges, so the dish has no walls —
// patterns run off one side and back in the other.
vec2 stateAt(vec2 uv) {
  vec4 s = texture2D(uPrev, fract(uv));
  return vec2(unpack16(s.rg), unpack16(s.ba));
}

void main() {
  vec2 c = stateAt(vUv);

  // ELI5: "how much more of each chemical do my neighbors have than me" —
  // positive means they are richer and it flows in. Diagonals count for
  // less than the four side neighbors because they are further away.
  vec2 lap = -c;
  lap += 0.20 * (stateAt(vUv + vec2(uTexel.x, 0.0)) + stateAt(vUv - vec2(uTexel.x, 0.0))
               + stateAt(vUv + vec2(0.0, uTexel.y)) + stateAt(vUv - vec2(0.0, uTexel.y)));
  lap += 0.05 * (stateAt(vUv + uTexel) + stateAt(vUv - uTexel)
               + stateAt(vUv + vec2(uTexel.x, -uTexel.y)) + stateAt(vUv - vec2(uTexel.x, -uTexel.y)));

  float u = c.x;
  float v = c.y;
  float reaction = u * v * v; // one U plus two V becomes three V

  // Optional left-to-right drift in the kill rate, so the two sides can
  // sit in different regimes. Off by default: measured over 12k ticks, a
  // slope wide enough to see pushes the low-k side into a flood, where V
  // fills the dish and the pattern flattens to a solid block.
  float kill = uKill + (vUv.x - 0.5) * uKillSlope;

  u = clamp(u + (0.16 * lap.x - reaction + uFeed * (1.0 - u)), 0.0, 1.0);
  v = clamp(v + (0.08 * lap.y + reaction - (uFeed + kill) * v), 0.0, 1.0);

  gl_FragColor = vec4(pack16(u), pack16(v));
}
`;

// Same 16-bit split as pack16 above, on the CPU side for the seed frame.
function writeCell(data, offset, u, v) {
  const uHi = Math.floor(u * 255);
  const vHi = Math.floor(v * 255);
  data[offset] = uHi;
  data[offset + 1] = Math.round((u * 255 - uHi) * 255);
  data[offset + 2] = vHi;
  data[offset + 3] = Math.round((v * 255 - vHi) * 255);
}

// ELI5: a dish full of food (U = 1) and no eater (V = 0) would sit there
// forever — the chemistry has nothing to amplify. So drop a few blobs of
// V in; everything visible grows out of those seeds.
function initialReactionData(size, seedCount = 14) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) writeCell(data, i * 4, 1.0, 0.0);

  for (let s = 0; s < seedCount; s++) {
    const cx = Math.floor(Math.random() * size);
    const cy = Math.floor(Math.random() * size);
    const r = 3;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const px = (cx + x + size) % size;
        const py = (cy + y + size) % size;
        writeCell(data, (py * size + px) * 4, 0.5, 0.25);
      }
    }
  }
  return data;
}

// ELI5: like the other sims, this runs whether or not anyone is looking —
// so the pattern you see has genuinely been growing since page load, not
// restarted when the scene came on screen.
// Deep dive: ping-ponged framebuffer pair, several chemistry steps per
// displayed frame because one step barely moves.
export class ReactionSim {
  // feed/kill picked by measurement, not by lore: swept 8 pairs for 12k
  // ticks each and scored the spatial spread of V. Textbook coral values
  // (0.0545 / 0.062) sat inert under this discretisation; 0.038 / 0.060
  // scored highest and settles into the winding "maze" regime, which
  // suits a 10-glyph ramp better than isolated spots.
  constructor(gl, size = 128, { stepsPerFrame = 6, feed = 0.038, kill = 0.060, killSlope = 0.0 } = {}) {
    this.gl = gl;
    this.size = size;
    this.stepsPerFrame = stepsPerFrame;
    this.feed = feed;
    this.kill = kill;
    this.killSlope = killSlope;

    this.program = createProgram(gl, SIM_VERT_SRC, SIM_FRAG_SRC);
    this.locations = {
      aPosition: gl.getAttribLocation(this.program, 'aPosition'),
      uPrev: gl.getUniformLocation(this.program, 'uPrev'),
      uTexel: gl.getUniformLocation(this.program, 'uTexel'),
      uFeed: gl.getUniformLocation(this.program, 'uFeed'),
      uKill: gl.getUniformLocation(this.program, 'uKill'),
      uKillSlope: gl.getUniformLocation(this.program, 'uKillSlope'),
    };

    // NEAREST: the packed low byte is meaningless if the GPU blends two
    // neighbouring texels, so no smoothing on this pair.
    const initialData = initialReactionData(size);
    this.textures = [
      createSimTexture(gl, size, { initialData, filter: gl.NEAREST }),
      createSimTexture(gl, size, { initialData, filter: gl.NEAREST }),
    ];
    this.fbos = [createFbo(gl, this.textures[0]), createFbo(gl, this.textures[1])];
    this.readIndex = 0;

    this.triBuffer = createFullscreenTriBuffer(gl);
  }

  get texture() {
    return this.textures[this.readIndex]; // whichever texture holds the latest completed step
  }

  step() {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(this.locations.aPosition);
    gl.vertexAttribPointer(this.locations.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.locations.uTexel, 1 / this.size, 1 / this.size);
    gl.uniform1f(this.locations.uFeed, this.feed);
    gl.uniform1f(this.locations.uKill, this.kill);
    gl.uniform1f(this.locations.uKillSlope, this.killSlope);
    gl.viewport(0, 0, this.size, this.size);

    // Several chemistry ticks per animation frame: one tick moves the
    // concentrations by ~0.001, so at one tick per frame the dish would
    // take minutes to show anything.
    for (let i = 0; i < this.stepsPerFrame; i++) {
      const writeIndex = 1 - this.readIndex;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[writeIndex]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[this.readIndex]);
      gl.uniform1i(this.locations.uPrev, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.readIndex = writeIndex; // swap — next tick reads what we just wrote
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
