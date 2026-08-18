// Each scene is a GLSL snippet defining:
//   float sceneField(vec2 uv, float t)
// Returns a raw 0..1 scalar — the compositor picks glyph density AND
// color (via the shared tacticalRamp) from this one value. uv is 0..1,
// aspect-corrected on x. Injected into the ASCII compositor shader as-is,
// so this is the only thing that changes between scenes — the compositor,
// font atlas, and driver stay identical.

const noise = `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * valueNoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 3.0;
  float n = fbm(p + vec2(t * 0.15, t * 0.1));
  return clamp(n, 0.0, 1.0);
}
`;

const particles = `
float hash1(float n) { return fract(sin(n) * 43758.5453123); }

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float v = 0.0;
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float speed = 0.2 + hash1(fi) * 0.6;
    float angle = hash1(fi * 7.13) * 6.2831853 + t * speed;
    float radius = 0.2 + hash1(fi * 3.71) * 0.75;
    vec2 center = vec2(cos(angle), sin(angle * 1.3)) * radius;
    float d = length(p - center);
    v += 0.0025 / (d * d + 0.0006);
  }
  return clamp(v, 0.0, 1.0);
}
`;

const metaballs = `
float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float v = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float speed = 0.3 + fi * 0.07;
    vec2 center = vec2(
      sin(t * speed + fi * 2.1) * 0.6,
      cos(t * speed * 1.3 + fi * 1.7) * 0.6
    );
    float d2 = dot(p - center, p - center);
    v += 0.05 / (d2 + 0.01);
  }
  return smoothstep(0.6, 1.4, v);
}
`;

const raymarch = `
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

float mapScene(vec3 p) {
  return sdTorus(p, vec2(0.9, 0.35));
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  vec3 ro = vec3(0.0, 0.0, 3.0);
  float ang = t * 0.4;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec3 rd = normalize(vec3(p, -1.6));
  ro.xz = rot * ro.xz;
  rd.xz = rot * rd.xz;

  float dist = 0.0;
  vec3 pos = ro;
  float hit = 0.0;
  for (int i = 0; i < 48; i++) {
    pos = ro + rd * dist;
    float d = mapScene(pos);
    if (d < 0.001) { hit = 1.0; break; }
    dist += d;
    if (dist > 8.0) break;
  }

  if (hit < 0.5) return 0.0;

  vec2 e = vec2(0.001, 0.0);
  vec3 n = normalize(vec3(
    mapScene(pos + e.xyy) - mapScene(pos - e.xyy),
    mapScene(pos + e.yxy) - mapScene(pos - e.yxy),
    mapScene(pos + e.yyx) - mapScene(pos - e.yyx)
  ));
  vec3 lightDir = normalize(vec3(0.6, 0.7, 0.5));
  return clamp(dot(n, lightDir), 0.0, 1.0);
}
`;

const plasma = `
float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float v = sin(p.x * 6.0 + t);
  v += sin(p.y * 5.0 - t * 1.3);
  v += sin((p.x + p.y) * 4.0 + t * 0.7);
  v += sin(length(p) * 8.0 - t * 1.6);
  v = v * 0.25 + 0.5;
  return clamp(v, 0.0, 1.0);
}
`;

// A pure energy-flare abstraction — no figure, no silhouette, no
// character reference. Jagged radial spikes at several angular
// frequencies, each with its own phase jitter, so the burst reads as
// unstable/surging rather than a clean static starburst; a fast inner
// shimmer keeps the core from going flat between pulses.
const aura = `
float hashA(float n) { return fract(sin(n) * 43758.5453123); }

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);

  float spikes = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float freq = 5.0 + fi * 3.0;
    float speed = 0.6 + fi * 0.31;
    float jitter = hashA(fi * 12.9) * 6.2831853;
    spikes += (0.5 + 0.5 * sin(ang * freq + t * speed + jitter)) / (fi + 1.0);
  }
  spikes /= 2.3;

  float edge = 0.28 + spikes * 0.55;
  float pulse = 0.85 + 0.15 * sin(t * 3.0);
  float core = smoothstep(edge * pulse, 0.0, r);

  float shimmer = 0.5 + 0.5 * sin(r * 18.0 - t * 6.0 + spikes * 6.0);
  return clamp(core * (0.7 + 0.3 * shimmer), 0.0, 1.0);
}
`;

// A single decisive diagonal cut, not a blade or figure — anticipation,
// a fast sweep, a held beat, then a fade, repeating on its own cycle.
// Perpendicular width is perturbed by 1D noise along the stroke for
// bled/torn ink edges, plus sparse drip streaks hanging off the line.
const inkSlash = `
float hashB(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise1(float x) {
  float i = floor(x);
  float f = smoothstep(0.0, 1.0, fract(x));
  return mix(hashB(vec2(i, 0.0)), hashB(vec2(i + 1.0, 0.0)), f);
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;

  float ang = -0.55;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = rot * p; // q.x runs along the stroke, q.y is perpendicular to it

  float period = 3.2;
  float cycle = floor(t / period);
  float phase = fract(t / period);

  float sweep = smoothstep(0.08, 0.4, phase);
  float reach = mix(-1.8, 1.8, sweep);
  float fade = 1.0 - smoothstep(0.55, 1.0, phase);
  float tipStart = smoothstep(-1.8, -1.6, q.x);
  float inFront = 1.0 - smoothstep(reach - 0.05, reach + 0.02, q.x);

  float bleed = noise1(q.x * 8.0 + cycle * 17.3) * 0.06;
  float width = 0.045 + bleed;
  float core = 1.0 - smoothstep(width * 0.5, width, abs(q.y));

  float dripSeed = noise1(q.x * 10.0 + cycle * 9.1 + 50.0);
  float drip = smoothstep(0.82, 1.0, dripSeed) * (1.0 - smoothstep(0.0, 0.3, -q.y)) * step(q.y, 0.0);

  float stroke = core * inFront * tipStart * fade;
  stroke = max(stroke, drip * inFront * tipStart * fade * 0.6);

  return clamp(stroke, 0.0, 1.0);
}
`;

export const scenes = { noise, particles, metaballs, raymarch, plasma, aura, inkSlash };
