import { createProgram } from './gl-utils.js';
import { buildFontAtlas } from './font-atlas.js';

const VERT_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Shared threat-escalation gradient: navy -> blue -> teal -> green -> amber -> red.
// Stays in the blue/green/amber/red HUD family on purpose — no magenta/purple/pink,
// no pastels. Every scene maps its own scalar field through this one ramp so the
// palette reads as one system across all 5, not five different color schemes.
const TACTICAL_RAMP_GLSL = `
vec3 tacticalRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.02, 0.04, 0.07);
  vec3 c1 = vec3(0.039, 0.239, 0.384);
  vec3 c2 = vec3(0.122, 0.820, 0.757);
  vec3 c3 = vec3(0.310, 0.827, 0.353);
  vec3 c4 = vec3(1.0, 0.616, 0.184);
  vec3 c5 = vec3(1.0, 0.231, 0.231);

  if (t < 0.2) return mix(c0, c1, t / 0.2);
  if (t < 0.4) return mix(c1, c2, (t - 0.2) / 0.2);
  if (t < 0.6) return mix(c2, c3, (t - 0.4) / 0.2);
  if (t < 0.8) return mix(c3, c4, (t - 0.6) / 0.2);
  return mix(c4, c5, (t - 0.8) / 0.2);
}
`;

const FRAG_TEMPLATE = (sceneGLSL) => `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform float uTime;
uniform float uAspect;
uniform sampler2D uAtlas;
uniform float uRampLen;
uniform vec3 uBgColor;

${TACTICAL_RAMP_GLSL}
${sceneGLSL}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 cellCoord = floor(fragPx / uCell);
  vec2 cellUv = (cellCoord + 0.5) * uCell / uResolution;
  vec2 sceneUv = vec2((cellUv.x - 0.5) * uAspect + 0.5, cellUv.y);

  float field = clamp(sceneField(sceneUv, uTime), 0.0, 0.999);
  vec3 sceneRGB = tacticalRamp(field);
  float glyphIndex = floor(field * uRampLen);

  vec2 localUv = fract(fragPx / uCell);
  vec2 atlasUv = vec2((glyphIndex + localUv.x) / uRampLen, 1.0 - localUv.y);
  float glyphAlpha = texture2D(uAtlas, atlasUv).a;

  vec3 color = mix(uBgColor, sceneRGB, glyphAlpha);
  gl_FragColor = vec4(color, 1.0);
}
`;

export class AsciiPipeline {
  constructor(canvas, scenes, { cellWidth = 8, cellHeight = 14, bgColor = [0.02, 0.04, 0.07] } = {}) {
    this.canvas = canvas;
    this.scenes = scenes;
    this.bgColor = bgColor;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    this.atlas = buildFontAtlas(gl, { cellWidth, cellHeight, textColor: '#eeeeee' });

    // Oversized fullscreen triangle — avoids a 4-vertex quad + index buffer.
    const tri = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.triBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);

    this.programCache = new Map(); // name -> { program, locations }
    this.setScene(Object.keys(scenes)[0]);
    this.sceneStartTime = performance.now();
    this.gridStartTime = performance.now();
  }

  _ensureProgram(name) {
    if (!this.programCache.has(name)) {
      const gl = this.gl;
      const program = createProgram(gl, VERT_SRC, FRAG_TEMPLATE(this.scenes[name]));
      const locations = {
        aPosition: gl.getAttribLocation(program, 'aPosition'),
        uResolution: gl.getUniformLocation(program, 'uResolution'),
        uCell: gl.getUniformLocation(program, 'uCell'),
        uTime: gl.getUniformLocation(program, 'uTime'),
        uAspect: gl.getUniformLocation(program, 'uAspect'),
        uAtlas: gl.getUniformLocation(program, 'uAtlas'),
        uRampLen: gl.getUniformLocation(program, 'uRampLen'),
        uBgColor: gl.getUniformLocation(program, 'uBgColor'),
      };
      this.programCache.set(name, { program, locations });
    }
    return this.programCache.get(name);
  }

  setScene(name) {
    const { program, locations } = this._ensureProgram(name);
    this.activeScene = name;
    this.program = program;
    this.locations = locations;
    this.sceneStartTime = performance.now();
  }

  resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    return { w, h, dpr };
  }

  _drawScene(program, locations, w, h, timeSeconds) {
    const gl = this.gl;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(locations.aPosition);
    gl.vertexAttribPointer(locations.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);
    gl.uniform1i(locations.uAtlas, 0);

    gl.uniform2f(locations.uResolution, w, h);
    gl.uniform2f(locations.uCell, this.atlas.cellWidth, this.atlas.cellHeight);
    gl.uniform1f(locations.uAspect, w / h);
    gl.uniform1f(locations.uRampLen, this.atlas.rampLength);
    gl.uniform3fv(locations.uBgColor, this.bgColor);
    gl.uniform1f(locations.uTime, timeSeconds);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  render(frozen = false) {
    const gl = this.gl;
    const { w, h } = this.resize();
    gl.viewport(0, 0, w, h);
    const t = frozen ? 0 : (performance.now() - this.sceneStartTime) / 1000;
    this._drawScene(this.program, this.locations, w, h, t);
  }

  // cellRects: [{ name, x, y, w, h }] in CSS pixels, top-left origin,
  // relative to the canvas's own box — as returned by getBoundingClientRect().
  renderGrid(cellRects, frozen = false) {
    const gl = this.gl;
    const { h: canvasH, dpr } = this.resize();
    gl.enable(gl.SCISSOR_TEST);
    const t = frozen ? 0 : (performance.now() - this.gridStartTime) / 1000;

    for (const cell of cellRects) {
      const gx = Math.round(cell.x * dpr);
      const gw = Math.round(cell.w * dpr);
      const gh = Math.round(cell.h * dpr);
      const gy = Math.round(canvasH - (cell.y + cell.h) * dpr); // flip to WebGL's bottom-left origin

      gl.viewport(gx, gy, gw, gh);
      gl.scissor(gx, gy, gw, gh);

      const { program, locations } = this._ensureProgram(cell.name);
      this._drawScene(program, locations, gw, gh, t);
    }

    gl.disable(gl.SCISSOR_TEST);
  }
}
