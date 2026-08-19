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

// ELI5: shallow-water ripple sim — like tapping a pan of water. Each
// point tracks height + velocity:
//   - pulled toward its 4 neighbors' average -> ripples spread outward
//   - damping bleeds off energy each frame -> ripples die, don't ring forever
//   - random "raindrop" taps -> keeps the pool from ever going still
// Deep dive: height+velocity in one RG texture (0.5-centered so an 8-bit
// UNSIGNED_BYTE can hold signed values), updated via a damped discrete
// wave equation.
const SIM_FRAG_SRC = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform float uDamping;
uniform vec2 uImpulsePos;
uniform float uImpulseStrength;

void main() {
  // Decode this pixel's current height (h) and velocity (v) from the
  // 0..1 texture back to -1..1.
  vec2 c = texture2D(uPrev, vUv).rg * 2.0 - 1.0;
  float h = c.x;
  float v = c.y;

  // Sample the 4 neighbors' heights (left/right/up/down), same decode.
  float hL = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r * 2.0 - 1.0;
  float hR = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r * 2.0 - 1.0;
  float hU = texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r * 2.0 - 1.0;
  float hD = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r * 2.0 - 1.0;

  // ELI5: "laplacian" = how much higher/lower neighbors are, on average.
  // Positive -> pulled up, negative -> pulled down. This is the whole
  // ripple-spreading engine.
  float laplacian = (hL + hR + hU + hD) - 4.0 * h;
  v += laplacian * 0.5;  // neighbor pull accelerates velocity
  v *= uDamping;         // bleed off energy so ripples decay
  h += v * 0.5;          // velocity moves the surface

  // "Raindrop" impulse: add height near uImpulsePos, falling off with
  // distance (smoothstep), then clamp so the field can't blow up.
  float d = distance(vUv, uImpulsePos);
  h += uImpulseStrength * smoothstep(0.04, 0.0, d);
  h = clamp(h, -1.0, 1.0);

  // Re-encode both channels back to 0..1 for 8-bit storage.
  gl_FragColor = vec4(h * 0.5 + 0.5, v * 0.5 + 0.5, 0.0, 1.0);
}
`;

// ELI5: 8-bit channels only hold 0-255, so 128 = "zero" here (decodes via
// *2.0-1.0). Filling with 0 instead would decode to -1.0 everywhere — a
// pool maxed-out and falling on frame one.
// Deep dive: 128 so height/velocity both decode to 0 — a flat, undisturbed
// pool at start.
function initialRippleData(size) {
  return new Uint8Array(size * size * 4).fill(128);
}

// ELI5: runs continuously in the background no matter which scene is
// visible — like a fish tank filter that keeps going whether you're
// looking or not. Switch back to a water-driven scene later and it's
// mid-ripple, not freshly reset.
// Deep dive: persistent state via a ping-ponged framebuffer pair,
// independent of the active scene.
export class RippleSim {
  constructor(gl, size = 96) {
    this.gl = gl;
    this.size = size;
    this.program = createProgram(gl, SIM_VERT_SRC, SIM_FRAG_SRC);
    this.locations = {
      aPosition: gl.getAttribLocation(this.program, 'aPosition'),
      uPrev: gl.getUniformLocation(this.program, 'uPrev'),
      uTexel: gl.getUniformLocation(this.program, 'uTexel'),
      uDamping: gl.getUniformLocation(this.program, 'uDamping'),
      uImpulsePos: gl.getUniformLocation(this.program, 'uImpulsePos'),
      uImpulseStrength: gl.getUniformLocation(this.program, 'uImpulseStrength'),
    };

    // Two identical flat-pool textures + one FBO each — the ping-pong pair.
    const initialData = initialRippleData(size);
    this.textures = [
      createSimTexture(gl, size, { initialData }),
      createSimTexture(gl, size, { initialData }),
    ];
    this.fbos = [createFbo(gl, this.textures[0]), createFbo(gl, this.textures[1])];
    this.readIndex = 0;

    this.triBuffer = createFullscreenTriBuffer(gl);

    this.nextImpulseAt = 0;
  }

  get texture() {
    return this.textures[this.readIndex]; // whichever texture holds the latest completed frame
  }

  // ELI5: "ping-pong" buffering — can't read+write one texture at once,
  // so two textures alternate: read last frame's, write this frame's
  // into the other, then swap.
  step(nowMs) {
    const gl = this.gl;
    const writeIndex = 1 - this.readIndex;

    // Schedule the next raindrop, or skip if it's not due yet.
    let impulsePos = [0.5, 0.5];
    let impulseStrength = 0.0;
    if (nowMs >= this.nextImpulseAt) {
      impulsePos = [0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7]; // random point inside the pool
      impulseStrength = 0.9 + Math.random() * 0.5;
      this.nextImpulseAt = nowMs + 70 + Math.random() * 160; // next tap in ~70-230ms
    }

    // Render target: the "write" texture, sized to the sim resolution
    // (not the canvas — this runs off-screen at a fixed low res).
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
    gl.uniform1f(this.locations.uDamping, 0.992);
    gl.uniform2f(this.locations.uImpulsePos, impulsePos[0], impulsePos[1]);
    gl.uniform1f(this.locations.uImpulseStrength, impulseStrength);

    gl.drawArrays(gl.TRIANGLES, 0, 3); // run the shader over every pixel

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.readIndex = writeIndex; // swap — next step reads what we just wrote
  }
}
