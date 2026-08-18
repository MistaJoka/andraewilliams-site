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

const FRAG_TEMPLATE = (sceneGLSL) => `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform float uTime;
uniform float uAspect;
uniform sampler2D uAtlas;
uniform float uRampLen;
uniform vec3 uTextColor;
uniform vec3 uBgColor;

${sceneGLSL}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 cellCoord = floor(fragPx / uCell);
  vec2 cellUv = (cellCoord + 0.5) * uCell / uResolution;
  vec2 sceneUv = vec2((cellUv.x - 0.5) * uAspect + 0.5, cellUv.y);

  vec3 scene = sceneColor(sceneUv, uTime);
  float lum = clamp(dot(scene, vec3(0.299, 0.587, 0.114)), 0.0, 0.999);
  float glyphIndex = floor(lum * uRampLen);

  vec2 localUv = fract(fragPx / uCell);
  vec2 atlasUv = vec2((glyphIndex + localUv.x) / uRampLen, 1.0 - localUv.y);
  float glyphAlpha = texture2D(uAtlas, atlasUv).a;

  vec3 color = mix(uBgColor, uTextColor, glyphAlpha);
  gl_FragColor = vec4(color, 1.0);
}
`;

export class AsciiPipeline {
  constructor(canvas, scenes, { cellWidth = 8, cellHeight = 14, bgColor = [0, 0, 0], textColor = [1, 1, 1] } = {}) {
    this.canvas = canvas;
    this.scenes = scenes;
    this.bgColor = bgColor;
    this.textColor = textColor;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    this.atlas = buildFontAtlas(gl, { cellWidth, cellHeight, textColor: '#eeeeee' });

    // Oversized fullscreen triangle — avoids a 4-vertex quad + index buffer.
    const tri = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.triBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);

    this.programCache = new Map();
    this.setScene(Object.keys(scenes)[0]);
    this.sceneStartTime = performance.now();
  }

  setScene(name) {
    const gl = this.gl;
    if (!this.programCache.has(name)) {
      const src = FRAG_TEMPLATE(this.scenes[name]);
      this.programCache.set(name, createProgram(gl, VERT_SRC, src));
    }
    this.activeScene = name;
    this.program = this.programCache.get(name);
    this.sceneStartTime = performance.now();

    gl.useProgram(this.program);
    this.locations = {
      aPosition: gl.getAttribLocation(this.program, 'aPosition'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uCell: gl.getUniformLocation(this.program, 'uCell'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uAspect: gl.getUniformLocation(this.program, 'uAspect'),
      uAtlas: gl.getUniformLocation(this.program, 'uAtlas'),
      uRampLen: gl.getUniformLocation(this.program, 'uRampLen'),
      uTextColor: gl.getUniformLocation(this.program, 'uTextColor'),
      uBgColor: gl.getUniformLocation(this.program, 'uBgColor'),
    };
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
    gl.viewport(0, 0, w, h);
  }

  render(frozen = false) {
    const gl = this.gl;
    this.resize();
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.triBuffer);
    gl.enableVertexAttribArray(this.locations.aPosition);
    gl.vertexAttribPointer(this.locations.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);
    gl.uniform1i(this.locations.uAtlas, 0);

    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.uniform2f(this.locations.uResolution, w, h);
    gl.uniform2f(this.locations.uCell, this.atlas.cellWidth, this.atlas.cellHeight);
    gl.uniform1f(this.locations.uAspect, w / h);
    gl.uniform1f(this.locations.uRampLen, this.atlas.rampLength);
    gl.uniform3fv(this.locations.uTextColor, this.textColor);
    gl.uniform3fv(this.locations.uBgColor, this.bgColor);

    const t = frozen ? 0 : (performance.now() - this.sceneStartTime) / 1000;
    gl.uniform1f(this.locations.uTime, t);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
