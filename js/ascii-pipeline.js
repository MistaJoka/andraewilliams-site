import { createProgram } from './gl-utils.js';
import { buildFontAtlas } from './font-atlas.js';
import { RippleSim } from './ripple-sim.js';
import { Rule30Sim } from './rule30-sim.js';
import { GameOfLifeSim } from './game-of-life-sim.js';
import { ReactionSim } from './reaction-sim.js';

// Fullscreen-triangle vertex shader: pass the clip-space position through
// as-is, and derive a 0..1 uv from it for the fragment shader.
const VERT_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// ELI5: every scene outputs one number per pixel (0-1, "how intense").
// tacticalRamp is the shared lookup table turning that into a color:
// 0 = navy, 1 = red, blue/teal/green/amber between. Same ramp for every
// scene -> one visual language, not five palettes.
const TACTICAL_RAMP_GLSL = `
vec3 tacticalRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.02, 0.04, 0.07);   // navy   (t = 0.0)
  vec3 c1 = vec3(0.039, 0.239, 0.384); // blue   (t = 0.2)
  vec3 c2 = vec3(0.122, 0.820, 0.757); // teal   (t = 0.4)
  vec3 c3 = vec3(0.310, 0.827, 0.353); // green  (t = 0.6)
  vec3 c4 = vec3(1.0, 0.616, 0.184);   // amber  (t = 0.8)
  vec3 c5 = vec3(1.0, 0.231, 0.231);   // red    (t = 1.0)

  // Pick the two stops t falls between and blend linearly across that
  // 0.2-wide band.
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
uniform sampler2D uSimTexture;
uniform sampler2D uRule30Texture;
uniform sampler2D uLifeTexture;
uniform sampler2D uReactionTexture;

${TACTICAL_RAMP_GLSL}
${sceneGLSL}

// ELI5: the one shader every scene runs through. Per pixel:
//   1. ask the scene "how intense is this character-cell"
//   2. look up the matching glyph in a pre-rendered font atlas (sparse
//      "." to dense "@")
//   3. tint that glyph's ink via the tactical ramp
// Scenes never touch fonts or text — they just return a number.
void main() {
  // Snap every pixel in a cell to one shared UV -> the whole cell samples
  // the same scene value (a solid glyph, not a blurry smear).
  vec2 fragPx = vUv * uResolution;
  vec2 cellCoord = floor(fragPx / uCell);
  vec2 cellUv = (cellCoord + 0.5) * uCell / uResolution;
  // Correct for the canvas not being square: without this, scenes drawn
  // in cell-space would stretch horizontally on a wide viewport.
  vec2 sceneUv = vec2((cellUv.x - 0.5) * uAspect + 0.5, cellUv.y);

  float field = clamp(sceneField(sceneUv, uTime), 0.0, 0.999);
  vec3 sceneRGB = tacticalRamp(field);
  // The font atlas holds uRampLen glyphs ordered sparse -> dense; this
  // picks which one this cell's intensity maps to.
  float glyphIndex = floor(field * uRampLen);

  // localUv is this pixel's position *within* its own cell (0..1), used
  // to sample the correct spot inside the chosen glyph's slice of the
  // atlas. Y is flipped because texture V=0 is the atlas's top row while
  // localUv's origin is bottom-left.
  vec2 localUv = fract(fragPx / uCell);
  vec2 atlasUv = vec2((glyphIndex + localUv.x) / uRampLen, 1.0 - localUv.y);
  float glyphAlpha = texture2D(uAtlas, atlasUv).a;

  // Glyph alpha decides ink vs. background; where the glyph has ink, tint
  // it with the scene's color instead of drawing plain white text.
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

    // Font glyph sheet + the 4 always-running feedback-buffer sims.
    this.atlas = buildFontAtlas(gl, { cellWidth, cellHeight, textColor: '#eeeeee' });
    this.rippleSim = new RippleSim(gl);
    this.rule30Sim = new Rule30Sim(gl);
    this.lifeSim = new GameOfLifeSim(gl);
    this.reactionSim = new ReactionSim(gl);

    // ELI5: one oversized triangle clipped to fill the screen — cheaper
    // than a two-triangle quad + index buffer.
    const tri = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.triBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);

    this.programCache = new Map(); // name -> { program, locations } — compile each scene's shader once, lazily
    this.setScene(Object.keys(scenes)[0]);
    this.sceneStartTime = performance.now();
    this.gridStartTime = performance.now();
  }

  // Compiles and caches one scene's full shader program (vertex + this
  // scene's FRAG_TEMPLATE), or returns the cached one on repeat calls.
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
        uSimTexture: gl.getUniformLocation(program, 'uSimTexture'),
        uRule30Texture: gl.getUniformLocation(program, 'uRule30Texture'),
        uLifeTexture: gl.getUniformLocation(program, 'uLifeTexture'),
        uReactionTexture: gl.getUniformLocation(program, 'uReactionTexture'),
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
    this.sceneStartTime = performance.now(); // reset t=0 so the new scene doesn't jump-start mid-animation
  }

  // Matches the canvas's backing-store resolution to its CSS size ×
  // devicePixelRatio (capped at 2x to bound fill-rate cost), only
  // touching canvas.width/height when they actually changed.
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

  // Binds one scene's program + all shared inputs (glyph atlas + the 4
  // sim textures, one per texture unit) and draws it into whatever
  // viewport/scissor is currently set.
  _drawScene(program, locations, w, h, timeSeconds) {
    const gl = this.gl;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(locations.aPosition);
    gl.vertexAttribPointer(locations.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Texture units 0-4: font atlas, ripple, rule30, life, reaction — bound every
    // draw since a different scene's program may be active next call.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);
    gl.uniform1i(locations.uAtlas, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.rippleSim.texture);
    gl.uniform1i(locations.uSimTexture, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.rule30Sim.texture);
    gl.uniform1i(locations.uRule30Texture, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.lifeSim.texture);
    gl.uniform1i(locations.uLifeTexture, 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.reactionSim.texture);
    gl.uniform1i(locations.uReactionTexture, 4);

    gl.uniform2f(locations.uResolution, w, h);
    gl.uniform2f(locations.uCell, this.atlas.cellWidth, this.atlas.cellHeight);
    gl.uniform1f(locations.uAspect, w / h);
    gl.uniform1f(locations.uRampLen, this.atlas.rampLength);
    gl.uniform3fv(locations.uBgColor, this.bgColor);
    gl.uniform1f(locations.uTime, timeSeconds);

    gl.drawArrays(gl.TRIANGLES, 0, 3); // run the shader over every pixel in the current viewport
  }

  _stepSims(nowMs) {
    this.rippleSim.step(nowMs);
    this.rule30Sim.step(nowMs);
    this.lifeSim.step(nowMs);
    this.reactionSim.step();
  }

  // Draws the single active scene fullscreen — the hero canvas's render path.
  render(frozen = false) {
    const gl = this.gl;
    if (!frozen) this._stepSims(performance.now());
    const { w, h } = this.resize();
    gl.viewport(0, 0, w, h);
    const t = frozen ? 0 : (performance.now() - this.sceneStartTime) / 1000;
    this._drawScene(this.program, this.locations, w, h, t);
  }

  // ELI5: draws the whole gallery grid on one shared canvas. Per tile:
  // set the drawable rectangle (scissor + viewport), then run that
  // tile's own scene shader only inside it — so N scenes coexist without
  // stepping on each other.
  //
  // cellRects: [{ name, x, y, w, h }] in CSS pixels, top-left origin,
  // relative to the canvas's own box — as returned by getBoundingClientRect().
  renderGrid(cellRects, frozen = false) {
    const gl = this.gl;
    if (!frozen) this._stepSims(performance.now());
    const { h: canvasH, dpr } = this.resize();
    gl.enable(gl.SCISSOR_TEST); // restrict drawing to each tile's rectangle in turn
    const t = frozen ? 0 : (performance.now() - this.gridStartTime) / 1000;

    for (const cell of cellRects) {
      // CSS pixels -> device pixels.
      const gx = Math.round(cell.x * dpr);
      const gw = Math.round(cell.w * dpr);
      const gh = Math.round(cell.h * dpr);
      // ELI5: CSS counts down from top-left; WebGL counts up from
      // bottom-left — this line converts between them.
      const gy = Math.round(canvasH - (cell.y + cell.h) * dpr); // flip to WebGL's bottom-left origin

      gl.viewport(gx, gy, gw, gh); // where this tile's draw call lands
      gl.scissor(gx, gy, gw, gh);  // and the hard clip so it can't bleed into neighbors

      const { program, locations } = this._ensureProgram(cell.name);
      this._drawScene(program, locations, gw, gh, t);
    }

    gl.disable(gl.SCISSOR_TEST);
  }
}
