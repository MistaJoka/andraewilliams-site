// ELI5: think of each scene as a tiny plug-in — its only job is to answer
// "how bright is this point right now" for any (x, y, time). It doesn't
// know about fonts, colors, or the canvas; the shared compositor
// (js/ascii-pipeline.js) turns that number into an actual glyph and
// color. That's why swapping scenes is just swapping this one function.
//
// Deep dive: each scene is a GLSL snippet defining
//   float sceneField(vec2 uv, float t)
// -> raw 0..1 scalar, injected into the compositor shader as-is. uv is
// 0..1, aspect-corrected on x.

// ELI5: 24 points orbit the center on fixed (hash-randomized) circular
// paths. Each pixel sums 1/distance² to every point — close points glow
// bright, far ones barely register, the same falloff as a point light —
// so each orbiting point reads as a soft particle of light.
const particles = `
float hash1(float n) { return fract(sin(n) * 43758.5453123); }

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0; // recenter uv to -1..1
  float v = 0.0;
  for (int i = 0; i < 24; i++) {
    float fi = float(i);
    float speed = 0.2 + hash1(fi) * 0.6;                          // each point's own orbit speed
    float angle = hash1(fi * 7.13) * 6.2831853 + t * speed;       // fixed random start angle + time
    float radius = 0.2 + hash1(fi * 3.71) * 0.75;                 // each point's own orbit radius
    vec2 center = vec2(cos(angle), sin(angle * 1.3)) * radius;    // where this point is right now
    float d = length(p - center);
    v += 0.0025 / (d * d + 0.0006); // inverse-square falloff -> point-light glow
  }
  return clamp(v, 0.0, 1.0);
}
`;

// ELI5: a circle whose edge wobbles with angle instead of a fixed
// radius — sum 5 wobble frequencies (tight+fast to broad+slow) for a
// jagged, alive edge instead of a clean scallop. Size pulses gently over
// time; a fine ripple inside stops the core from reading flat.
const aura = `
float hashA(float n) { return fract(sin(n) * 43758.5453123); }

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);       // distance from center
  float ang = atan(p.y, p.x); // angle around center

  // Sum 5 sine waves in angle, each its own frequency/speed/phase.
  float spikes = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float freq = 5.0 + fi * 3.0;
    float speed = 0.6 + fi * 0.31;
    float jitter = hashA(fi * 12.9) * 6.2831853;
    spikes += (0.5 + 0.5 * sin(ang * freq + t * speed + jitter)) / (fi + 1.0);
  }
  spikes /= 2.3;

  // Edge radius = base + spikes, breathing slowly via pulse; core is
  // "inside that radius" via smoothstep for a soft edge.
  float edge = 0.28 + spikes * 0.55;
  float pulse = 0.85 + 0.15 * sin(t * 3.0);
  float core = smoothstep(edge * pulse, 0.0, r);

  // Fine radial ripple layered on top so the inside isn't flat.
  float shimmer = 0.5 + 0.5 * sin(r * 18.0 - t * 6.0 + spikes * 6.0);
  return clamp(core * (0.7 + 0.3 * shimmer), 0.0, 1.0);
}
`;

// ELI5: "fbm" (fractal Brownian motion) = layer several octaves of
// smooth noise (each 2x finer, half as strong) and sum them — the same
// trick behind procedural clouds and marble. "Domain warping" feeds
// fbm's own output back in as an offset to itself, turning smooth blobs
// into flame-like tongues. Color is free — the ramp's amber/red top does
// the "hot" work; this shader only makes shape.
const fire = `
float hashF(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Value noise: hash the 4 corners of the grid cell containing p, blend
// with a smoothed interpolation (u) instead of a straight lerp — that's
// what avoids visible grid-cell seams.
float noiseF(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hashF(i);
  float b = hashF(i + vec2(1.0, 0.0));
  float c = hashF(i + vec2(0.0, 1.0));
  float d = hashF(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// 5 octaves of noiseF, each finer and quieter than the last, summed.
float fbmF(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noiseF(p);
    p *= 2.0;   // next octave: double the frequency (finer detail)
    amp *= 0.5; // ...at half the strength
  }
  return v;
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;

  // ELI5: 4 flame tongues, each own offset/speed. Keep whichever is
  // brightest per pixel (max()) instead of adding — stops overlaps from
  // washing into one blob.
  float body = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float xOff = (fi - 1.5) * 0.28;    // horizontal spread across the 4 tongues
    float speed = 1.3 + fi * 0.35;     // each tongue rises at its own rate
    vec2 lp = vec2(p.x - xOff, p.y);
    // Domain-warp offset: fbm sampled twice (x/y) to distort lp before
    // the real flicker sample below.
    vec2 warp = vec2(
      fbmF(lp * 2.2 + vec2(fi * 3.1, -t * speed)),
      fbmF(lp * 2.2 + vec2(fi * 3.1 + 5.2, -t * speed))
    );
    float flicker = fbmF(vec2(lp.x * 3.2 + warp.x * 1.6, lp.y * 2.2 - t * (speed + 0.6) + warp.y * 1.6));
    float taper = smoothstep(1.0 - fi * 0.08, -0.15, lp.y);              // fades out near the top
    float width = 1.0 - smoothstep(0.0, 0.55, abs(lp.x) + (1.0 - taper) * 0.22); // narrows toward the tip
    float tongue = pow(clamp(flicker * taper * width, 0.0, 1.0), 1.4);   // sharpen contrast
    body = max(body, tongue);
  }

  // ELI5: same point-light trick as the particles scene (1/distance²
  // glow), but each point's height is driven by fract(t * speed), which
  // sawtooths from 0 to 1 and instantly snaps back — so each ember
  // rises, fades near the top, then teleports back to the base on loop.
  float sparks = 0.0;
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float seed = hashF(vec2(fi, 1.0));
    float rise = fract(t * (0.35 + seed * 0.4) + seed); // 0..1 sawtooth: this ember's height in its cycle
    vec2 sp = vec2((seed - 0.5) * 1.4 + sin(rise * 6.2831 + fi) * 0.08, mix(-1.1, 1.1, rise));
    float d = length(p - sp);
    sparks += (0.0009 / (d * d + 0.0004)) * (1.0 - rise); // fade out as it nears the top
  }

  return clamp(body * 1.2 + sparks, 0.0, 1.0);
}
`;

// ELI5: one diagonal stroke repeating on a timer: reaches across the
// screen (wipe-on), holds, fades, restarts. Thickness is perturbed by
// 1D noise along its length for torn/bled ink edges, plus a few random
// drips off the underside.
const inkSlash = `
float hashB(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// 1D value noise along a single axis — same smoothstep-blend idea as
// noiseF above, just one dimension.
float noise1(float x) {
  float i = floor(x);
  float f = smoothstep(0.0, 1.0, fract(x));
  return mix(hashB(vec2(i, 0.0)), hashB(vec2(i + 1.0, 0.0)), f);
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;

  float ang = -0.55;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  // ELI5: rotate the whole coordinate space by the stroke's angle so the
  // rest of the math can pretend the stroke is perfectly horizontal —
  // much simpler than doing diagonal distance math directly.
  vec2 q = rot * p; // q.x runs along the stroke, q.y is perpendicular to it

  // Cycle timing: which repeat we're in (cycle) and how far through it (phase).
  float period = 3.2;
  float cycle = floor(t / period);
  float phase = fract(t / period);

  float sweep = smoothstep(0.08, 0.4, phase);        // 0->1 wipe-on ramp early in the cycle
  float reach = mix(-1.8, 1.8, sweep);                // how far the stroke has extended
  float fade = 1.0 - smoothstep(0.55, 1.0, phase);    // fades out late in the cycle
  float tipStart = smoothstep(-1.8, -1.6, q.x);       // stroke doesn't start before its origin
  float inFront = 1.0 - smoothstep(reach - 0.05, reach + 0.02, q.x); // masks off anything past the current reach

  // Thickness perturbed by noise along the stroke -> torn/bled edge.
  float bleed = noise1(q.x * 8.0 + cycle * 17.3) * 0.06;
  float width = 0.045 + bleed;
  float core = 1.0 - smoothstep(width * 0.5, width, abs(q.y));

  // Sparse drips hanging below the stroke, only where dripSeed rolls high.
  float dripSeed = noise1(q.x * 10.0 + cycle * 9.1 + 50.0);
  float drip = smoothstep(0.82, 1.0, dripSeed) * (1.0 - smoothstep(0.0, 0.3, -q.y)) * step(q.y, 0.0);

  float stroke = core * inFront * tipStart * fade;
  stroke = max(stroke, drip * inFront * tipStart * fade * 0.6);

  return clamp(stroke, 0.0, 1.0);
}
`;

// ELI5: layer independent HUD pieces — background grid, gapped
// crosshair, 4 pulsing corner brackets, a rotating radar sweep with a
// fading trail — and add their brightness. No 3D object, just 2D shape
// functions (grid lines, distance/angle thresholds) combined.
const mechaHud = `
float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);        // distance from center
  float ang = atan(p.y, p.x); // angle around center

  // Faint background grid: thin lines at regular intervals.
  vec2 gp = p * 6.0;
  vec2 gf = abs(fract(gp) - 0.5);
  float grid = (1.0 - smoothstep(0.0, 0.12, min(gf.x, gf.y))) * 0.10;

  // Crosshair: a +, with a gap near the center and a hard cutoff past
  // a max range.
  float gapMask = smoothstep(0.05, 0.09, r);
  float rangeMask = 1.0 - smoothstep(0.85, 0.95, r);
  float hLine = 1.0 - smoothstep(0.0, 0.05, abs(p.y));
  float vLine = 1.0 - smoothstep(0.0, 0.05, abs(p.x));
  float crosshair = max(hLine, vLine) * gapMask * rangeMask;

  // 4 corner lock-on brackets: an L-shaped pair of arms at each corner
  // of a square whose radius gently pulses.
  vec2 ap = abs(p);
  float bracketR = 0.5 + 0.03 * sin(t * 1.5);
  vec2 d = ap - vec2(bracketR);
  float armLen = 0.16;
  float thick = 0.045;
  float armH = step(abs(d.y), thick) * step(-armLen, d.x) * step(d.x, 0.0);
  float armV = step(abs(d.x), thick) * step(-armLen, d.y) * step(d.y, 0.0);
  float bracket = max(armH, armV);

  // ELI5: sweepAngle rotates over time; angDiff = this pixel's angular
  // distance from it (wrapped across the -pi/pi seam). exp(-abs(angDiff))
  // -> brightness fades smoothly with angle = the glowing trail behind
  // the sweep line.
  float sweepAngle = mod(t * 1.2, 6.2831853) - 3.14159265;
  float angDiff = mod(ang - sweepAngle + 3.14159265, 6.2831853) - 3.14159265;
  float sweep = exp(-abs(angDiff) * 1.8) * (1.0 - smoothstep(0.75, 0.95, r)) * step(r, 0.95);

  // Periodic "lock" flash across the crosshair/brackets.
  float lockPeriod = 4.0;
  float lockPhase = fract(t / lockPeriod);
  float lockPulse = smoothstep(0.0, 0.05, lockPhase) * (1.0 - smoothstep(0.05, 0.18, lockPhase));

  float field = grid + crosshair * 0.45 + bracket * 0.85 + sweep * 0.7;
  field += lockPulse * (bracket + crosshair) * 1.4;

  return clamp(field, 0.0, 1.0);
}
`;

// ELI5: thin adapter — just samples what js/rule30-sim.js already
// computed this frame. No logic lives here.
const rule30 = `
float sceneField(vec2 uv, float t) {
  return texture2D(uRule30Texture, uv).r;
}
`;

// ELI5: same pattern as rule30 above — samples js/game-of-life-sim.js's
// output. No logic here.
const life = `
float sceneField(vec2 uv, float t) {
  return texture2D(uLifeTexture, uv).r;
}
`;

export const scenes = { particles, aura, fire, inkSlash, mechaHud, rule30, life };
