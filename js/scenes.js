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

// ELI5: a corona, not a blob. Three layers stacked: a molten core whose
// outline is chewed by turbulence, streamers thrown outward from it, and
// shock rings that expand and fade like something detonated in the
// middle. The old version was one wobbly circle and read as almost empty
// at thumbnail size — this fills its frame.
//
// Deep dive: fbm sampled in POLAR coordinates, so the turbulence flows
// around the ring instead of sliding across it in screen space.
const aura = `
float hashA(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// 2D value noise: random value per lattice corner, smoothly blended.
float noiseA(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  f = f * f * (3.0 - 2.0 * f); // smoothstep curve — no creases at the seams
  float a = hashA(i);
  float b = hashA(i + vec2(1.0, 0.0));
  float c = hashA(i + vec2(0.0, 1.0));
  float d = hashA(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Three octaves, each twice as fine and half as loud.
float fbmA(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noiseA(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);

  // ELI5: feeding the ANGLE into the noise (not x/y) is what makes the
  // turbulence wrap around the shape — it drifts along the rim instead of
  // sliding past it. The radius term makes it churn outward over time.
  float turb = fbmA(vec2(ang * 1.7, r * 2.6 - t * 0.4));

  // Molten core: solid in the middle, dissolving at a turbulent edge.
  float edge = 0.30 + turb * 0.26;
  float core = smoothstep(edge, edge * 0.55, r);        // tight, genuinely hot centre
  float halo = smoothstep(edge * 1.4, edge * 0.6, r) * 0.5; // glow bleeding past it
  float limb = smoothstep(0.055, 0.0, abs(r - edge));   // bright rim -> a readable silhouette

  // Streamers: fine angular striping, warped by the same turbulence so
  // they bend with the rim. Windowed to live just outside the core.
  float streak = 0.5 + 0.5 * sin(ang * 24.0 + turb * 9.0 + t * 1.3);
  streak *= smoothstep(edge * 2.2, edge * 1.0, r) * smoothstep(edge * 0.75, edge * 1.05, r);

  // Shock rings: three expanding shells, each fading as it grows.
  float rings = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float phase = fract(t * 0.26 + fi * 0.3333);
    float radius = 0.22 + phase * 1.05;
    rings += smoothstep(0.05, 0.0, abs(r - radius)) * (1.0 - phase);
  }

  // Slow breath so the whole thing is never quite still.
  float breath = 0.9 + 0.1 * sin(t * 1.7);

  return clamp((core + halo + limb * 0.85 + streak * 0.5 + rings * 0.7) * breath, 0.0, 1.0);
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

// ELI5: three brush strokes cutting across the field, each on its own
// clock so one is always mid-swing — the old single stroke left the
// screen empty for a third of every cycle. A stroke is not drawn as a
// shape: each cell asks "how far am I from the line the brush is
// travelling", and near cells become ink.
//
// Deep dive: segment SDF with a pressure-tapered width, a 1D-noise
// dry-brush edge, ink that runs out from the tail forward, and a few
// spatter droplets thrown past the tip.
const inkSlash = `
float hashB(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float hashB1(float n) { return fract(sin(n * 78.233) * 43758.5453123); }

// 1D value noise — smooth random wobble along one axis.
float noise1(float x) {
  float i = floor(x);
  float f = smoothstep(0.0, 1.0, fract(x));
  return mix(hashB(vec2(i, 0.0)), hashB(vec2(i + 1.0, 0.0)), f);
}

// ELI5: shortest distance from a point to a line segment. Project the
// point onto the line, clamp to the segment's ends, measure the gap.
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// One stroke. \`seed\` offsets its clock so the three never swing together.
float brushStroke(vec2 p, float t, float seed) {
  float period = 2.6;
  float clock = t / period + seed;
  float cycle = floor(clock);
  float phase = fract(clock);

  // Fresh angle and offset every cycle, so it never repeats the same slash.
  float ang = (hashB1(cycle + seed * 17.0) - 0.5) * 1.8;
  float off = (hashB1(cycle * 3.7 + seed * 11.0) - 0.5) * 0.9;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = rot * p - vec2(0.0, off); // rotate so the stroke runs along x

  // The tip races ahead; the tail follows later, so the stroke draws on
  // and then runs dry from the back.
  float head = mix(-1.7, 1.7, smoothstep(0.0, 0.42, phase));
  float tail = mix(-1.7, 1.7, smoothstep(0.30, 0.95, phase));
  if (head - tail < 0.01) return 0.0;

  float d = segDist(q, vec2(tail, 0.0), vec2(head, 0.0));

  // Pressure: thin where the brush lands and lifts, fat through the middle.
  float along = clamp((q.x - tail) / (head - tail), 0.0, 1.0);
  float pressure = sin(along * 3.14159);
  float width = 0.03 + 0.16 * pressure;

  // Dry-brush: chew the edge with noise so it is not a clean capsule.
  float rough = 0.62 + 0.38 * noise1(q.x * 16.0 + seed * 29.0);
  // Flat-topped, not a hairline: solid out to most of the width, then a
  // quick falloff. A plain smoothstep-to-zero peaked only dead on the
  // centre line, which the cell grid mostly sampled past.
  float core = smoothstep(width * rough, width * 0.2, d);
  float bleed = smoothstep(width * 2.8, width * 0.9, d) * 0.4; // ink wicking outward

  // Spatter flung past the tip while the brush is still moving fast.
  float spatter = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 drop = vec2(head, 0.0) + vec2(0.05 + hashB1(fi + seed) * 0.28,
                                       (hashB1(fi * 5.3 + seed) - 0.5) * 0.4);
    spatter += smoothstep(0.05, 0.0, length(q - drop)) * smoothstep(0.05, 0.25, phase);
  }

  float dry = 1.0 - smoothstep(0.72, 1.0, phase); // the whole mark fades as it dries
  return (core + bleed + spatter * 0.8) * dry;
}

float sceneField(vec2 uv, float t) {
  vec2 p = uv * 2.0 - 1.0;
  // Thirds of a cycle apart: as one dries, the next is already landing.
  float ink = brushStroke(p, t, 0.0)
            + brushStroke(p, t, 0.333) * 0.85
            + brushStroke(p, t, 0.667) * 0.7;
  return clamp(ink, 0.0, 1.0);
}
`;

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

// ELI5: the pattern is not drawn here at all — js/reaction-sim.js grows
// it in a texture, and this scene just reads how much of the "eater"
// chemical (V) ended up at each point. The 16-bit value is split across
// two channels, so it is reassembled before use.
const reaction = `
float reactionV(vec2 uv) {
  vec4 s = texture2D(uReactionTexture, fract(uv));
  return s.b + s.a / 255.0; // rejoin the coarse + leftover halves
}

float sceneField(vec2 uv, float t) {
  // The compositor widens uv by the aspect ratio so scenes keep square
  // cells; here that would push x past 0..1 and wrap the dish, showing
  // the same motif two or three times across a wide canvas. Undoing it
  // fits exactly one dish to the canvas — the corridors stretch a little
  // instead of repeating.
  vec2 dish = vec2((uv.x - 0.5) / uAspect + 0.5, uv.y);

  // V lives in roughly 0..0.4; stretch that across the glyph ramp so the
  // pattern uses the full sparse -> dense range instead of the bottom third.
  return smoothstep(0.04, 0.30, reactionV(dish));
}
`;

export const scenes = { particles, aura, fire, inkSlash, mechaHud, reaction };
