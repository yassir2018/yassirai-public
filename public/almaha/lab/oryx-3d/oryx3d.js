/**
 * oryx3d.js: the AL MAHA oryx symbol as a lacquered 3D object, built in code from the
 * brand vector (shared/brand/symbol.svg). No AI generation, no external model file.
 *
 *   import { createOryx3D } from './oryx3d.js';
 *   const oryx = createOryx3D(container, { src: '/shared/brand/symbol.svg' });
 *   await oryx.ready;
 *   oryx.setPointer(x, y);   // -1..1 relative to the stage centre (the module also tracks the mouse itself)
 *   oryx.setProgress(p);     // 0..1 scroll progress (see SCROLL below)
 *   oryx.play();             // (re)play the intro
 *   oryx.destroy();
 *
 * Needs an import map that resolves "three" and "three/addons/" (three r170).
 *
 * HOW THE FRONT STAYS THE LOGO
 *  - Each of the 5 base shapes (#symbol > path, gradients oryx-1..5) is one layer. Its front face
 *    is a flat quad carrying the browser's own raster of the art (gradients + tones), cut to that
 *    shape plus its anti-aliased fringe, so the 5 layers composite back to the logo. Colours are
 *    unlit. Tone pixels that overflow a shape by more than the fringe are clipped in 3D (they would
 *    float beyond the walls when tilted); the vector hand-off shows them at rest.
 *  - Walls run ALONG THE VIEW RAYS of the rest camera and each layer is scaled by (EYE - z) / EYE,
 *    so at the rest pose every wall is edge-on and every layer projects exactly onto the logo
 *    plane although the layers sit at different depths. Rotation reveals depth and parallax.
 *  - Walls fade in with their projected width (nothing below ~0.4 css px). At small tilts a wall is
 *    the stroke's own base colour (sampled from the logo at that edge, unlit); the deep lacquer
 *    body and its lighting only take over from ~6 deg, so small tilts never draw dark outlines.
 *  - VECTOR HAND-OFF (option `vector`, on by default): whenever the object is exactly at rest
 *    (intro done, no tilt, no scroll, no sheen), an inline <svg> of the same art, placed with
 *    getFrontMapping(), fades in over the canvas (160 ms) and the render loop sleeps. The rest
 *    pose is therefore the real vector at any screen density. Any motion swaps back instantly
 *    (the two images agree to sub-pixel precision, so the swap is invisible).
 *  - Option `tones` (default true): keep the 22 % shadow/light groups of symbol.svg (the v2 art
 *    with shadows and lights, as the site's flat logo shows it). false = the tone-less master,
 *    identical to AL_MAHA_Logo_5016px.png and the .ai export, which lack those groups.
 *
 * LIGHT
 *  - Walls: a compact lacquer shader: self-glow of their own colour, soft key/fill, and a clear-coat
 *    reflection of a warm studio described analytically (deep red surround, warm softboxes, red
 *    floor bounce). No environment map to build and no physical-material compile at load; the hue
 *    stays close to the base colour (no grey or pink highlights).
 *  - Front: (a) a rolled-edge normal from the shape's distance field, so tilting slides a thin
 *    highlight along the ribbon edges facing the light (exactly zero at rest); (b) a sheen glint
 *    that scales each colour by itself (black stays neutral). The glint plays once after the
 *    intro hold, then only when the pointer enters the symbol (at most every 15 s), or every
 *    `sheenInterval` seconds if set.
 *
 * MOTION
 *  - Intro (2.2 s): the first ink shows within ~80 ms; ribbons are painted along their own arc
 *    with a hard, ragged dry-brush front and a faint wet rim while each layer flies in from depth.
 *    The symbol holds a 3/4 view (yaw -14 deg) until ~70 % of the ink is down, then turns into
 *    the exact front view (power3.inOut, 1.0 -> 2.2 s). The last frame is the rest pose.
 *  - Hold: the exact logo is held 1.2 s after the intro, then one sheen glint.
 *  - Pointer (mouse only; ignored on hover:none devices unless `touchTilt`): critically damped
 *    springs (omega 6) toward a soft viewport-wide tilt (7 deg yaw / 3.5 deg pitch, tanh curve),
 *    blending to the full 16 / 8 deg range only while the cursor hovers the symbol. After 3 s
 *    without movement the tilt relaxes to the exact front through a slow critically damped spring
 *    (omega 1.2/s: no jump, no overshoot, back on the vector logo about 6 s later); leaving the
 *    window relaxes it faster. Layers breathe in depth
 *    along the rest view rays, which is invisible at rest and only shows as parallax when tilted.
 *    Optional `sway` (deg, default 0, keep <= 2) adds a slow autonomous sway.
 *  - SCROLL setProgress(p): p = 0 rest. As p rises the oryx turns away (yaw -18, pitch +5,
 *    roll -3 deg), recedes, drifts right and spreads its layers. Colours never blend at partial
 *    opacity: the red symbol only fades (opacity 1 -> 0 over p 0.10..0.46), switches to one flat
 *    watermark tone while almost invisible (p 0.40..0.50, opacity < 0.12; walls 4 L* darker, no
 *    outline), then the watermark fades in to `watermarkOpacity` (p 0.46..0.85). Above p 0.9
 *    everything is static and the loop sleeps (0 frames). Combined yaw is clamped to +-22 deg.
 *  - prefers-reduced-motion: no intro, no tilt, no sheen; setProgress only fades and recolours.
 *
 * OPTIONS: src, tones, vector, intro, idle, pointer, touchTilt, sway, sheen, sheenInterval, hold,
 * maxDpr, fit, watermarkColor, watermarkOpacity, progressSmoothing, texOversample, texBudget,
 * lodBias, reducedMotion.
 * EXTRA API (dev / tests): seek(t), setPose({yaw, pitch, raw}), clearPose(), frontView(), glint(),
 * setSheen(on), debugSweep(c), debugWalls(on), setVector(on), setWatermarkColor(hex),
 * getFrontMapping(), screenBounds(), info(), state(), ready (Promise). Set-up steps are marked
 * with performance.mark('oryx3d:*').
 *
 * PERFORMANCE: DPR clamped (2, or 3 on stages up to 450k css px2), renders only while visible
 * (IntersectionObserver + visibilitychange) and only while something moves; heavy set-up work is
 * split into short tasks, shaders are compiled asynchronously and the intro clock starts on the
 * first steady frame; textures are sized to the on-screen scale within a texel budget; everything
 * is disposed in destroy().
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const DEFAULT_SRC = new URL('../../shared/brand/symbol.svg', import.meta.url).href;
const SVG_NS = 'http://www.w3.org/2000/svg';

const U = 100;              // svg units per world unit
const EYE = 2200;           // rest camera distance from the logo plane (svg units)
const EW = EYE / U;         // same, world units
const PIVOT_Z = 0.25;       // rotation pivot, world units in front of the logo plane
const INTRO_TOTAL = 2.2;    // seconds
const EDGE_MAX = 16;        // distance range stored in the edge texture (svg units)
const FIELD_RES = 1.5;      // distance field cells per svg unit
const D2R = Math.PI / 180;

// Layer art direction (svg units). z = front face depth, depth = max wall depth.
// reveal.arc = centre of curvature of the stroke; from/to = where the brush starts/ends.
const LAYER_SPECS = {
  'oryx-3': { z: 0,  depth: 26, reveal: { arc: [441.6, 614.1], from: [415, 357], to: [360, 855] }, t0: 0.24, dur: 0.98 },
  'oryx-5': { z: 14, depth: 18, reveal: { arc: [661.7, 734.0], from: [682, 650], to: [668, 826] }, t0: 0.90, dur: 0.60 },
  'oryx-2': { z: 30, depth: 24, reveal: { arc: [309.3, 755.7], from: [838, 582], to: [345, 202] }, t0: 0.00, dur: 0.90 },
  'oryx-1': { z: 46, depth: 22, reveal: { arc: [545.0, 336.3], from: [690, 106], to: [800, 465] }, t0: 0.14, dur: 0.78 },
  'oryx-4': { z: 58, depth: 20, reveal: { axis: true,          from: [753, 507], to: [835, 690] }, t0: 0.66, dur: 0.62 },
};

const POSE = {
  introYaw: -14, introPitch: 4, introRoll: 1.2, introZ: -0.7, turnStart: 1.0, turnEnd: INTRO_TOTAL,
  softYaw: 7, softPitch: 3.5, hoverYaw: 16, hoverPitch: 8,
  scrollYaw: -18, scrollPitch: 5, scrollRoll: -3, maxYaw: 22, maxPitch: 10,
};
const SPRING_W = 6;          // pointer follow (rad/s), critically damped
const ENGAGE_HOLD = 3;       // s without pointer movement before the tilt relaxes
const ENGAGE_UP_W = 6, ENGAGE_DOWN_W = 1.2, ENGAGE_LEAVE_W = 2.4;
const GLINT_DUR = 2.6, GLINT_GAP = 15;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const expoOut = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10)));
const sineInOut = (t) => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
const power3InOut = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const fx = (t) => ((ax * t + bx) * t + cx) * t;
  const fy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = fx(t) - x; const d = dx(t); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; t -= e / d; }
    t = Math.min(1, Math.max(0, t));
    return fy(t);
  };
}
const brushEase = bezier(0.3, 0.0, 0.2, 1.0); // ink from the first frames, long lift
const mark = (n) => { try { performance.mark('oryx3d:' + n); } catch (e) { /* no-op */ } };
const nextTask = () => new Promise((r) => (globalThis.scheduler?.yield ? globalThis.scheduler.yield().then(r) : setTimeout(r, 0)));
const springStep = (s, target, w, dt) => {
  // critically damped spring, exact for a constant target over dt
  const x0 = s.x - target, v0 = s.v, e = Math.exp(-w * dt);
  s.x = target + (x0 + (v0 + w * x0) * dt) * e;
  s.v = (v0 - w * (v0 + w * x0) * dt) * e;
};

/* ------------------------------------------------------------------ shaders */

const REVEAL_GLSL = /* glsl */`
uniform float uReveal;
uniform float uRevealOn;
uniform vec4 uRevA;   // arc: cx, cy, refAngle, sign | axis: ox, oy, dx, dy
uniform vec3 uRevB;   // type (0 arc, 1 axis), min, max
float oryxHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float oryxNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(oryxHash(i), oryxHash(i + vec2(1.0, 0.0)), f.x),
             mix(oryxHash(i + vec2(0.0, 1.0)), oryxHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float revealT(vec2 p) {
  float raw, across;
  if (uRevB.x < 0.5) {
    float a = atan(p.y - uRevA.y, p.x - uRevA.x) - uRevA.z;
    a = mod(a + 3.14159265, 6.28318531) - 3.14159265;
    raw = a * uRevA.w;
    across = length(p - uRevA.xy);
  } else {
    raw = dot(p - uRevA.xy, uRevA.zw);
    across = dot(p - uRevA.xy, vec2(-uRevA.w, uRevA.z));
  }
  float t = (raw - uRevB.y) / (uRevB.z - uRevB.y);
  // dry-brush front: each bristle band (across the stroke) runs slightly ahead or behind
  float bristle = oryxNoise(vec2(across * 0.21, 1.7)) - 0.5;
  float fine = oryxNoise(vec2(across * 0.85, 7.3)) - 0.5;
  return t + bristle * 0.07 + fine * 0.025 + (oryxNoise(p * 0.05) - 0.5) * 0.02;
}
`;

const FRONT_VS = /* glsl */`
attribute vec2 svg;
varying vec2 vUv;
varying vec2 vSvg;
varying vec3 vWPos;
varying vec3 vAx;
varying vec3 vAy;
varying vec3 vAz;
void main() {
  vUv = uv;
  vSvg = svg;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vAx = normalize(m[0]); vAy = normalize(m[1]); vAz = normalize(m[2]);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRONT_FS = /* glsl */`
uniform sampler2D map;
uniform sampler2D uEdge;
uniform vec4 uEdgeT;     // svg -> edge uv: (svg - xy) * zw
uniform float uLodBias;
uniform float uWet;
uniform float uMono;
uniform vec3 uMonoColor;
uniform float uSweep;
uniform float uSheen;
uniform vec2 uSweepO;
uniform vec2 uSweepD;
uniform float uSpec;
uniform float uTilt;
uniform float uRollW;
uniform float uRollK;
uniform vec3 uKey1;
uniform vec3 uKey2;
varying vec2 vUv;
varying vec2 vSvg;
varying vec3 vWPos;
varying vec3 vAx;
varying vec3 vAy;
varying vec3 vAz;
${REVEAL_GLSL}
void main() {
  vec4 c = texture2D(map, vUv, uLodBias);           // premultiplied, raw sRGB
  float wet = 0.0;
  if (uRevealOn > 0.5) {
    float t = revealT(vSvg);
    float px = (uReveal - t) / max(fwidth(t), 1e-6);  // pixels behind the brush front
    c *= clamp(px + 0.5, 0.0, 1.0);                   // hard, ragged, 1 px anti-aliased front
    wet = (1.0 - smoothstep(0.0, 3.0, px)) * uWet;    // faint wet-ink rim, darkening only
  }
  if (c.a < 0.003) discard;
  vec3 col = c.rgb / c.a;
  col *= 1.0 - wet;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  // highlights tint warm on red, stay neutral on black
  vec3 tint = mix(vec3(0.10), vec3(0.20, 0.065, 0.055), smoothstep(0.08, 0.30, lum));
  // rolled-edge normal from the distance field: highlights live on the ribbon edges
  vec4 e = texture2D(uEdge, (vSvg - uEdgeT.xy) * uEdgeT.zw);
  vec2 g = e.rg * 2.0 - 1.0;
  float roll = 1.0 - clamp(e.b * ${EDGE_MAX.toFixed(1)} / uRollW, 0.0, 1.0);
  roll *= roll;
  vec3 nO = normalize(vec3(-g.x * roll * uRollK, g.y * roll * uRollK, 1.0));
  vec3 N = normalize(vAx * nO.x + vAy * nO.y + vAz * nO.z);
  vec3 V = normalize(cameraPosition - vWPos);
  vec3 R = reflect(-V, N);
  float sb = smoothstep(0.93, 0.995, dot(R, uKey1)) + 0.6 * smoothstep(0.93, 0.995, dot(R, uKey2));
  float spec = sb * uSpec * uTilt * mix(0.08, 1.0, roll);
  // sheen glint: scales each colour by itself, so red stays red and black stays black
  float u = dot(vSvg - uSweepO, uSweepD);
  float band = exp(-pow((u - uSweep) / 0.11, 2.0));
  float peak = exp(-pow((u - uSweep) / 0.035, 2.0));
  col += uSheen * (band * 0.12 * col + peak * tint * (0.45 + lum));
  col += spec * (0.45 * col + tint * 1.3);
  col = mix(col, uMonoColor, uMono);                 // watermark: one flat tone
  gl_FragColor = vec4(min(col, vec3(1.0)) * c.a, c.a);
}
`;

const WALL_VS = /* glsl */`
attribute vec2 svg;
attribute vec3 aLip;
attribute vec3 aBody;
attribute float aWd;
attribute float aDep;
attribute vec3 aWn;
varying vec2 vSvg;
varying vec3 vLip;
varying vec3 vBody;
varying float vWd;
varying float vDep;
varying float vFace;
varying vec3 vWN;
varying vec3 vWPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mv = viewMatrix * wp;
  vWPos = wp.xyz;
  vWN = normalize(mat3(modelMatrix) * normal);
  vSvg = svg; vLip = aLip; vBody = aBody; vWd = aWd; vDep = aDep;
  vFace = abs(dot(normalize(normalMatrix * aWn), normalize(-mv.xyz)));   // 0 = edge-on (rest pose)
  gl_Position = projectionMatrix * mv;
}
`;

// Lacquer walls: their own colour (self-glow + soft key/fill) plus a clear-coat reflection of a warm
// studio described analytically (deep red surround, warm softboxes, red floor bounce). No white or
// grey light anywhere, and the hue of the base colour is kept, so highlights never turn pink.
const WALL_FS = /* glsl */`
uniform float uPxU;
uniform float uMono;
uniform vec3 uMonoWall;
uniform float uWallGlow;
uniform float uChromaKeep;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec3 uSweepDir;
uniform float uSweepI;
varying vec2 vSvg;
varying vec3 vLip;
varying vec3 vBody;
varying float vWd;
varying float vDep;
varying float vFace;
varying vec3 vWN;
varying vec3 vWPos;
${REVEAL_GLSL}
vec3 oxLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 oxSrgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float lobe(vec3 r, vec3 d, float a, float b) { return smoothstep(a, b, dot(r, d)); }
void main() {
  float wWidth = vDep * uPxU * vFace;                       // projected wall width, css px
  float wFade = smoothstep(0.35, 1.25, wWidth);              // sub-pixel walls never draw
  if (wFade < 0.01) discard;
  if (uRevealOn > 0.5 && revealT(vSvg) > uReveal) discard;
  float wPx = vWd * uPxU * vFace;                           // css px behind the lip
  float lipness = 1.0 - smoothstep(0.09, 0.24, vFace);      // small tilt: the stroke's own edge colour
  vec3 baseS = mix(vLip, vBody, smoothstep(0.6, 6.0, wPx) * (1.0 - lipness));
  vec3 base = oxLin(baseS);
  vec3 N = normalize(vWN) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 V = normalize(cameraPosition - vWPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 col = base * (uWallGlow + 0.55 * max(dot(N, uKeyDir), 0.0) + 0.30 * max(dot(N, uFillDir), 0.0) * vec3(1.0, 0.62, 0.56));
  vec3 R = reflect(-V, N);
  vec3 studio = vec3(0.12, 0.012, 0.010)
    + vec3(2.6, 1.0, 0.9) * lobe(R, uKeyDir, 0.82, 0.975)
    + vec3(1.6, 0.55, 0.5) * lobe(R, vec3(-0.894, 0.149, -0.447), 0.90, 0.99)
    + vec3(1.3, 0.42, 0.38) * lobe(R, vec3(0.894, 0.0, -0.447), 0.90, 0.99)
    + vec3(0.9, 0.36, 0.32) * lobe(R, vec3(0.0, 1.0, 0.0), 0.80, 0.97)
    + vec3(1.0, 0.10, 0.07) * smoothstep(-0.25, -0.75, R.y)
    + vec3(2.2, 1.3, 1.15) * uSweepI * lobe(R, uSweepDir, 0.86, 0.985);
  float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  col += studio * F * 0.42;                                  // clear coat
  col += base * 0.35 * pow(max(dot(N, normalize(uKeyDir + V)), 0.0), 18.0);   // broad sheen of the lacquer
  vec3 o = oxSrgb(col);
  vec3 lw = vec3(0.2126, 0.7152, 0.0722);
  float lo = dot(o, lw), lb = max(dot(baseS, lw), 1e-3);
  o = mix(o, min(baseS * (lo / lb), vec3(1.0)), uChromaKeep);   // keep the base hue
  o = mix(o, baseS, lipness);
  o = mix(o, uMonoWall, uMono);
  gl_FragColor = vec4(o * wFade, wFade);                     // premultiplied
}
`;

/* ------------------------------------------------------------- geometry utils */

function simplifyClosed(pts, tol) {
  const p = [];
  for (const q of pts) { const l = p[p.length - 1]; if (!l || Math.hypot(q.x - l.x, q.y - l.y) > 1e-4) p.push({ x: q.x, y: q.y }); }
  if (p.length > 2 && Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) < 1e-4) p.pop();
  if (p.length < 4) return p;
  let far = 0, fd = -1;
  for (let i = 1; i < p.length; i++) { const d = (p[i].x - p[0].x) ** 2 + (p[i].y - p[0].y) ** 2; if (d > fd) { fd = d; far = i; } }
  const keep = new Uint8Array(p.length); keep[0] = 1; keep[far] = 1;
  const rdp = (a, b) => {
    const n = p.length; const A = p[a % n], B = p[b % n];
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bd = 0;
    for (let i = a + 1; i < b; i++) { const P = p[i % n]; const d = Math.abs((P.x - A.x) * dy - (P.y - A.y) * dx) / L; if (d > bd) { bd = d; best = i; } }
    if (best >= 0 && bd > tol) { keep[best % n] = 1; rdp(a, best); rdp(best, b); }
  };
  rdp(0, far); rdp(far, p.length);
  return p.filter((_, i) => keep[i]);
}

function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}

/** Distance (svg units) to the shape border for every inside cell. */
function distanceField(path2d, x0, y0, w, h, s) {
  const W = Math.ceil(w * s) + 4, H = Math.ceil(h * s) + 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(s, 0, 0, s, 2 - x0 * s, 2 - y0 * s);
  ctx.fill(path2d);
  const a = ctx.getImageData(0, 0, W, H).data;
  const g = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = a[i * 4 + 3] > 127 ? 1e20 : 0;
  const N = Math.max(W, H); const f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1);
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = g[y * W + x]; edt1d(f, H, d, v, z); for (let y = 0; y < H; y++) g[y * W + x] = d[y]; }
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = g[y * W + x]; edt1d(f, W, d, v, z); for (let x = 0; x < W; x++) g[y * W + x] = d[x]; }
  const out = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = Math.sqrt(g[i]) / s;
  cv.width = cv.height = 1;
  const ox = x0 - 2 / s, oy = y0 - 2 / s;
  return { W, H, s, ox, oy, d: out,
    at(x, y) { const i = Math.floor((x - ox) * s), j = Math.floor((y - oy) * s); return (i < 0 || j < 0 || i >= W || j >= H) ? 0 : out[j * W + i]; } };
}

/** RGBA8 edge texture: inward gradient direction (rg) and distance to the border (b). */
function edgeTexture(field) {
  const { W, H, d } = field;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i, o = k * 4, v = d[k];
      let gx = 0, gy = 0;
      if (v > 0) {
        gx = (i + 1 < W ? d[k + 1] : v) - (i > 0 ? d[k - 1] : v);
        gy = (j + 1 < H ? d[k + W] : v) - (j > 0 ? d[k - W] : v);
        const l = Math.hypot(gx, gy); if (l > 1e-6) { gx /= l; gy /= l; } else { gx = gy = 0; }
      }
      data[o] = Math.round((gx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((gy * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round(Math.min(1, v / EDGE_MAX) * 255);
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true;
  return t;
}

/** Wall body colour from the lip colour (sRGB 0..1): deep lacquer, hue kept. */
function bodyOf(r, g, b) {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const m = l > 0.5 ? 0.8 : l < 0.09 ? 0.85 : 0.58;
  return [r * m, g * m, b * m];
}

/* ------------------------------------------------------------------ module */

export function createOryx3D(container, options = {}) {
  const smallStage = (container.clientWidth || 1) * (container.clientHeight || 1) <= 450000;
  const opt = {
    src: DEFAULT_SRC,
    tones: true,               // false = tone-less master (same as the .ai / 5016 px PNG export)
    vector: true,              // inline-SVG hand-off at the exact rest pose
    intro: true,
    idle: true,                // pointer tilt + breathing
    pointer: true,             // track the mouse on window (mouse only)
    touchTilt: false,          // allow setPointer on hover:none devices
    sway: 0,                   // autonomous sway amplitude (deg), off by default
    sheen: true,               // glint after the intro hold and on pointer entry
    sheenInterval: 0,          // > 0: also repeat the glint every n seconds
    hold: 1.2,                 // s the exact logo is held after the intro
    maxDpr: smallStage ? 3 : 2,
    fit: 0.94,                 // share of the stage the symbol may occupy (rest pose)
    watermarkColor: '#D9C9C3', // one flat tone (sand)
    watermarkOpacity: 0.5,
    progressSmoothing: 9,      // 0 = immediate
    texOversample: 2,          // texture texels per device pixel at rest
    texBudget: 12e6,           // max texels over all layer textures
    lodBias: -1,               // mip bias for the front faces
    reducedMotion: null,       // null = follow prefers-reduced-motion
    ...options,
  };
  const reduced = opt.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hoverNone = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

  const S = {
    destroyed: false, visible: true, hidden: typeof document !== 'undefined' && document.hidden,
    clock: 0, last: 0, raf: 0, steady: 0, pendingFrames: 0,
    introT: INTRO_TOTAL, introPending: false, introPlaying: false, introPaused: false, introDone: -1e9,
    dx: 0, dy: 0, pointerAt: -1e9, pointerActive: false, pointerLeft: false, inZone: false,
    engage: { x: 0, v: 0 }, hover: 0,
    yaw: { x: 0, v: 0 }, pitch: { x: 0, v: 0 }, override: null,
    progress: 0, prog: 0,
    sheen: !!opt.sheen && !reduced, glintAt: -1, lastGlint: -1e9, forceSweep: null,
    vectorOn: !!opt.vector, vectorShown: false, vectorTimer: 0, wallsOn: true,
    frames: [], renderMs: [], frameCount: 0, texScale: 0, building: false, atRest: false,
  };
  const disposables = [];
  const layers = [];
  let renderer, scene, camera, outer, inner, symbol, io, ro, artText, vec;

  const GU = {
    uMono: { value: 0 }, uMonoColor: { value: new THREE.Vector3() }, uMonoWall: { value: new THREE.Vector3() },
    uWallGlow: { value: 0.62 }, uChromaKeep: { value: 0.55 }, uPxU: { value: 1 },
    uKeyDir: { value: new THREE.Vector3(-4, 6, 7).normalize() }, uFillDir: { value: new THREE.Vector3(6, -1, 3).normalize() },
    uSweepDir: { value: new THREE.Vector3(-5, 5, 4).normalize() }, uSweepI: { value: 0 },
    uSweep: { value: -5 }, uSheen: { value: 0 },
    uSweepO: { value: new THREE.Vector2() }, uSweepD: { value: new THREE.Vector2() },
    uSpec: { value: reduced ? 0 : 0.55 }, uTilt: { value: 0 }, uRollW: { value: 6.5 }, uRollK: { value: 0.9 },
    uKey1: { value: new THREE.Vector3(-0.50, 0.58, 0.64).normalize() },
    uKey2: { value: new THREE.Vector3(0.55, 0.50, 0.67).normalize() },
    uLodBias: { value: opt.lodBias },
  };
  setMonoColor(opt.watermarkColor);

  function setMonoColor(hex) {
    const c = new THREE.Color(); c.setStyle(hex, THREE.NoColorSpace); // raw sRGB values
    GU.uMonoColor.value.set(c.r, c.g, c.b);
    GU.uMonoWall.value.set(c.r * 0.94, c.g * 0.94, c.b * 0.94); // about 4 L* darker, same hue
  }

  /* --------------------------------------------------------------- build */
  const ready = (async () => {
    mark('start');
    const res = await fetch(opt.src);
    if (!res.ok) throw new Error('oryx3d: cannot load ' + opt.src);
    const srcText = await res.text();
    artText = opt.tones ? srcText : stripTones(srcText);
    if (S.destroyed) return api;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      fallback();
      return api;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opt.maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const cvs = renderer.domElement;
    cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    cvs.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(cvs);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(20, 1, 1, 80);
    camera.position.set(0, 0, EW);
    camera.lookAt(0, 0, 0);

    mark('renderer');

    outer = new THREE.Group(); outer.position.z = PIVOT_Z; outer.rotation.order = 'YXZ';
    inner = new THREE.Group(); inner.position.z = -PIVOT_Z;
    outer.add(inner); scene.add(outer);

    parseSymbol(srcText);
    mark('parsed');
    await nextTask();
    for (const L of layers) {             // distance fields, one short task per layer
      const [bx0, by0, bx1, by1] = L.bbox;
      L.field = distanceField(L.path2d, bx0 - 2, by0 - 2, bx1 - bx0 + 4, by1 - by0 + 4, FIELD_RES);
      await nextTask();
      if (S.destroyed) return api;
    }
    mark('fields');
    resize();
    const lip = await rasterArt(2);       // wall lips: the logo's own colour just inside each edge
    if (S.destroyed) return api;
    mark('lip');
    await buildTextures(desiredTexScale());
    if (S.destroyed) return api;
    mark('textures');
    for (const L of layers) { buildLayer(L, lip); await nextTask(); if (S.destroyed) return api; }
    mark('geometry');
    if (opt.vector) buildVector();

    ro = new ResizeObserver(() => { resize(); invalidate(); });
    ro.observe(container);
    io = new IntersectionObserver((ents) => { S.visible = ents[ents.length - 1].isIntersecting; if (S.visible) invalidate(); }, { rootMargin: '80px' });
    io.observe(container);
    document.addEventListener('visibilitychange', onVis);
    if (opt.pointer && !reduced) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mouseout', onMouseOut, { passive: true });
      window.addEventListener('blur', onLeave);
    }

    // upload and compile before the first visible frame (no stall at intro t = 0)
    for (const L of layers) { renderer.initTexture(L.tex); renderer.initTexture(L.edgeTex); await nextTask(); }
    mark('uploaded');
    applyIntro(opt.intro && !reduced ? 0 : INTRO_TOTAL);
    S.compiling = renderer.compileAsync(scene, camera);
    try { await S.compiling; } catch (e) { /* older drivers: compiled on first render */ }
    S.compiling = null;
    if (S.destroyed) return api;
    mark('compiled');
    renderNow();
    await nextTask();
    mark('ready');

    if (opt.intro && !reduced) play(); else { S.introT = INTRO_TOTAL; S.introDone = -1e9; }
    update(0);
    renderNow();
    invalidate();
    return api;
  })();

  function stripTones(text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    for (const id of ['shadows', 'lights']) doc.getElementById(id)?.remove();
    return new XMLSerializer().serializeToString(doc);
  }

  function fallback() {
    const img = new Image();
    img.src = opt.src; img.alt = '';
    img.style.cssText = `position:absolute;inset:0;margin:auto;max-width:${opt.fit * 100}%;max-height:${opt.fit * 100}%;`;
    container.appendChild(img);
    disposables.push(() => img.remove());
  }

  function parseSymbol(text) {
    const cleaned = stripTones(text).replace(/<svg[^>]*>/, '<svg xmlns="http://www.w3.org/2000/svg">').replace(/fill="url\(#([\w-]+)\)"/g, 'fill="#000" data-grad="$1"');
    const data = new SVGLoader().parse(cleaned);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const raw = [];
    for (const path of data.paths) {
      const node = path.userData?.node;
      if (node?.parentNode?.getAttribute?.('id') !== 'symbol') continue;
      const id = node.getAttribute('data-grad') || 'oryx-' + raw.length;
      const d = node.getAttribute('d');
      const contours = path.subPaths.map((sp) => simplifyClosed(sp.getPoints(8), 0.06)).filter((c) => c.length > 2);
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const c of contours) for (const p of c) { bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x); by1 = Math.max(by1, p.y); }
      x0 = Math.min(x0, bx0); y0 = Math.min(y0, by0); x1 = Math.max(x1, bx1); y1 = Math.max(y1, by1);
      raw.push({ id, d, contours, bbox: [bx0, by0, bx1, by1] });
    }
    const vb = /viewBox="([^"]+)"/.exec(text);
    const VB = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [x0, y0, x1 - x0, y1 - y0];
    symbol = { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, VB };
    // sweep axis: upper-left -> lower-right, normalised over the symbol
    const dir = new THREE.Vector2(1, 0.62).normalize();
    const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => x * dir.x + y * dir.y);
    const mn = Math.min(...corners), mx = Math.max(...corners);
    GU.uSweepO.value.set(dir.x * mn, dir.y * mn);
    GU.uSweepD.value.set(dir.x / (mx - mn), dir.y / (mx - mn));

    raw.sort((a, b) => (LAYER_SPECS[a.id]?.z ?? 0) - (LAYER_SPECS[b.id]?.z ?? 0));
    raw.forEach((r, i) => {
      const spec = LAYER_SPECS[r.id] || { z: i * 12, depth: 20, reveal: { axis: true, from: [r.bbox[0], r.bbox[1]], to: [r.bbox[2], r.bbox[3]] }, t0: 0.2 * i, dur: 0.9 };
      const u = {
        uReveal: { value: 5 }, uRevealOn: { value: 0 }, uWet: { value: 0 },
        uRevA: { value: new THREE.Vector4() }, uRevB: { value: new THREE.Vector3() },
      };
      const L = { ...r, spec, u, rank: i, path2d: new Path2D(r.d), group: new THREE.Group(), dir: new THREE.Vector2(), intro: { x: 0, y: 0, z: 0 } };
      setupReveal(L);
      inner.add(L.group);
      layers.push(L);
    });
  }

  function setupReveal(L) {
    const rv = L.spec.reveal; const pts = L.contours.flat();
    const [fx, fy] = rv.from, [tx, ty] = rv.to;
    L.dir.set(tx - fx, ty - fy).normalize();
    let rawOf;
    if (rv.axis) {
      L.u.uRevA.value.set(fx, fy, L.dir.x, L.dir.y); L.u.uRevB.value.x = 1;
      rawOf = (p) => (p.x - fx) * L.dir.x + (p.y - fy) * L.dir.y;
    } else {
      const [cx, cy] = rv.arc;
      let mx = 0, my = 0; for (const p of pts) { mx += p.x; my += p.y; } mx /= pts.length; my /= pts.length;
      const ref = Math.atan2(my - cy, mx - cx);
      const wrap = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
      // direction measured through the shape (relative to its centroid), never the short way round
      const sign = Math.sign(wrap(Math.atan2(ty - cy, tx - cx) - ref) - wrap(Math.atan2(fy - cy, fx - cx) - ref)) || 1;
      L.u.uRevA.value.set(cx, cy, ref, sign); L.u.uRevB.value.x = 0;
      rawOf = (p) => wrap(Math.atan2(p.y - cy, p.x - cx) - ref) * sign;
    }
    let mn = Infinity, mx = -Infinity; for (const p of pts) { const r = rawOf(p); mn = Math.min(mn, r); mx = Math.max(mx, r); }
    L.u.uRevB.value.y = mn; L.u.uRevB.value.z = mx;
  }

  const toWorld = (x, y, z) => { const s = (EYE - z) / EYE; return [(x - symbol.cx) * s / U, -(y - symbol.cy) * s / U, z / U]; };

  /** The art rasterised by the browser over the viewBox at k px per svg unit (ImageData). */
  async function rasterArt(k, text = artText) {
    const [vx, vy, vw, vh] = symbol.VB;
    const cw = Math.ceil(vw * k), ch = Math.ceil(vh * k);
    const sized = text.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${cw}" height="${ch}" preserveAspectRatio="none">`);
    const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
    const img = new Image(); img.src = url;
    try { await img.decode(); } finally { URL.revokeObjectURL(url); }
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data;
    cv.width = cv.height = 1;
    return {
      /** un-premultiplied sRGB 0..1, averaged over a 3x3 neighbourhood */
      at(x, y) {
        const ci = Math.round((x - vx) * k), cj = Math.round((y - vy) * k);
        let r = 0, g = 0, b = 0, a = 0;
        for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
          if (i < 0 || j < 0 || i >= cw || j >= ch) continue;
          const o = (j * cw + i) * 4, w = data[o + 3] / 255;
          r += data[o] / 255 * w; g += data[o + 1] / 255 * w; b += data[o + 2] / 255 * w; a += w;
        }
        return a > 1e-3 ? [r / a, g / a, b / a] : null;
      },
    };
  }

  function desiredTexScale() {
    const h = Math.max(1, container.clientHeight), w = Math.max(1, container.clientWidth);
    const dpr = renderer.getPixelRatio();
    const pxPerUnit = frontScale(w, h) * dpr;        // device px per svg unit at rest
    let area = 0, maxDim = 1;
    for (const L of layers) { const [a, b, c, d] = L.bbox; area += (c - a + 6) * (d - b + 6); maxDim = Math.max(maxDim, c - a + 6, d - b + 6); }
    const maxTex = renderer.capabilities.maxTextureSize || 4096;
    const cap = Math.min(Math.sqrt(opt.texBudget / Math.max(1, area)), maxTex / maxDim);
    return Math.min(cap, Math.max(1.25, pxPerUnit * opt.texOversample));
  }

  async function buildTextures(k) {
    S.building = true;
    const dil = Math.max(0.5, 1.25 / k);               // svg units; keeps the raster's own AA fringe
    const jobs = layers.map(async (L) => {
      const [bx0, by0, bx1, by1] = L.bbox;
      const px0 = Math.floor((bx0 - 3) * k), py0 = Math.floor((by0 - 3) * k);
      const px1 = Math.ceil((bx1 + 3) * k), py1 = Math.ceil((by1 + 3) * k);
      const cw = px1 - px0, ch = py1 - py0;
      const X0 = px0 / k, Y0 = py0 / k, X1 = px1 / k, Y1 = py1 / k;
      // the browser rasterises the real logo directly at this layer's resolution
      const sized = artText.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${X0} ${Y0} ${X1 - X0} ${Y1 - Y0}" width="${cw}" height="${ch}" preserveAspectRatio="none">`);
      const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
      const img = new Image(); img.src = url;
      try { await img.decode(); } finally { URL.revokeObjectURL(url); }
      return { L, img, cw, ch, X0, Y0, X1, Y1 };
    });
    const decoded = await Promise.all(jobs);
    const results = [];
    for (const { L, img, cw, ch, X0, Y0, X1, Y1 } of decoded) {
      if (S.destroyed) break;
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      const mk = document.createElement('canvas'); mk.width = cw; mk.height = ch;
      const mc = mk.getContext('2d');
      mc.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
      mc.fillStyle = '#000'; mc.strokeStyle = '#000'; mc.lineJoin = 'round';
      // the base shape plus its anti-aliased fringe; tone overflow beyond the shape is clipped, so
      // nothing floats beyond the walls when tilted (the vector hand-off keeps it at rest)
      mc.lineWidth = dil * 2; mc.fill(L.path2d); mc.stroke(L.path2d);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mk, 0, 0);
      mk.width = mk.height = 1;
      const tex = new THREE.CanvasTexture(cv);
      tex.premultiplyAlpha = true;
      tex.colorSpace = THREE.NoColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      results.push({ L, tex, rect: [X0, Y0, X1, Y1] });
      await nextTask();
    }
    if (S.destroyed) { results.forEach((r) => r.tex.dispose()); return; }
    for (const { L, tex, rect } of results) {
      const old = L.tex; L.tex = tex; L.texRect = rect;
      if (L.front) { L.front.material.uniforms.map.value = tex; L.front.geometry.dispose(); L.front.geometry = frontGeometry(L); }
      if (old) old.dispose();
    }
    S.texScale = k; S.building = false;
  }

  function frontGeometry(L) {
    const [X0, Y0, X1, Y1] = L.texRect; const z = L.spec.z;
    const g = new THREE.BufferGeometry();
    const P = [toWorld(X0, Y0, z), toWorld(X1, Y0, z), toWorld(X1, Y1, z), toWorld(X0, Y1, z)];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    g.setAttribute('svg', new THREE.Float32BufferAttribute([X0, Y0, X1, Y0, X1, Y1, X0, Y1], 2));
    g.setIndex([0, 3, 2, 0, 2, 1]);
    return g;
  }

  function buildLayer(L, lip) {
    const probe = document.createElement('canvas').getContext('2d');
    const f = L.field;
    L.edgeTex = edgeTexture(f);
    // front
    const fm = new THREE.ShaderMaterial({
      uniforms: { map: { value: L.tex }, uEdge: { value: L.edgeTex }, uEdgeT: { value: new THREE.Vector4(f.ox, f.oy, f.s / f.W, f.s / f.H) }, ...L.u, ...GU },
      vertexShader: FRONT_VS, fragmentShader: FRONT_FS,
      transparent: true, premultipliedAlpha: true, depthWrite: true, depthTest: true,
    });
    L.front = new THREE.Mesh(frontGeometry(L), fm);
    L.front.renderOrder = 2 * L.rank + 1;
    L.front.frustumCulled = false;
    // walls
    const wg = wallGeometry(L, probe, lip);
    const wm = new THREE.ShaderMaterial({
      uniforms: { ...L.u, ...GU },
      vertexShader: WALL_VS, fragmentShader: WALL_FS,
      side: THREE.DoubleSide, transparent: true, premultipliedAlpha: true, depthWrite: true, depthTest: true,
    });
    L.walls = new THREE.Mesh(wg, wm);
    L.walls.renderOrder = 2 * L.rank;
    L.group.add(L.walls, L.front);
    disposables.push(() => { fm.dispose(); wm.dispose(); L.front.geometry.dispose(); wg.dispose(); L.tex?.dispose(); L.edgeTex?.dispose(); });
  }

  function wallGeometry(L, probe, lip) {
    const spec = L.spec; const zf = spec.z;
    const field = L.field;
    const pos = [], nrm = [], svg = [], aLip = [], aBody = [], aWd = [], aDep = [], aWn = [], idx = [];
    const v3 = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const fallbackCol = lip.at((L.bbox[0] + L.bbox[2]) / 2, (L.bbox[1] + L.bbox[3]) / 2) || [0.5, 0.02, 0.03];
    for (const c of L.contours) {
      const n = c.length; if (n < 3) continue;
      const en = [];
      for (let i = 0; i < n; i++) {
        const a = c[i], b = c[(i + 1) % n];
        const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-9;
        en.push([dy / l, -dx / l, l]);
      }
      // orientation: majority vote on the longest edges, using the browser's own fill rule
      const longest = en.map((e, i) => [e[2], i]).sort((a, b) => b[0] - a[0]).slice(0, 15);
      let inside = 0;
      for (const [, i] of longest) {
        const a = c[i], b = c[(i + 1) % n];
        const mx = (a.x + b.x) / 2 + en[i][0] * 0.35, my = (a.y + b.y) / 2 + en[i][1] * 0.35;
        if (probe.isPointInPath(L.path2d, mx, my, 'nonzero')) inside++;
      }
      if (inside > longest.length / 2) for (const e of en) { e[0] = -e[0]; e[1] = -e[1]; }
      const vn = [], sharp = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const p = en[(i - 1 + n) % n], q = en[i];
        const cosT = p[0] * q[0] + p[1] * q[1];
        sharp[i] = cosT < 0.64 ? 1 : 0;
        let x = p[0] + q[0], y = p[1] + q[1]; const l = Math.hypot(x, y);
        if (l < 1e-6) { x = q[0]; y = q[1]; } else { x /= l; y /= l; }
        vn.push([x, y]);
      }
      // local half-width -> depth (thin brush tips and dry-brush hairs stay paper-thin)
      let dep = new Float32Array(n);
      const half = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const p = c[i], [nx, ny] = vn[i];
        let h = 0, entered = false;
        for (let s = 0.4; s < 60; s += 0.7) {
          const dd = field.at(p.x - nx * s, p.y - ny * s);
          if (dd > 0) { entered = true; if (dd > h) h = dd; } else if (entered) break;
        }
        half[i] = h;
        dep[i] = Math.min(spec.depth, Math.max(0.6, h * lerp(0.6, 1.35, smooth(2, 5, h))));
      }
      // lip colour: the logo itself just inside the edge
      let col = [];
      for (let i = 0; i < n; i++) {
        const p = c[i], [nx, ny] = vn[i], s = clamp(half[i] * 0.35, 0.3, 0.9);
        col.push(lip.at(p.x - nx * s, p.y - ny * s) || fallbackCol);
      }
      for (let pass = 0; pass < 3; pass++) {
        const nd = new Float32Array(n), nc = [];
        for (let i = 0; i < n; i++) {
          const a = (i - 1 + n) % n, b = (i + 1) % n;
          nd[i] = 0.25 * dep[a] + 0.5 * dep[i] + 0.25 * dep[b];
          nc.push([0, 1, 2].map((k) => 0.25 * col[a][k] + 0.5 * col[i][k] + 0.25 * col[b][k]));
        }
        dep = nd; col = nc;
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const A = c[i], B = c[j];
        const nA = sharp[i] ? [en[i][0], en[i][1]] : vn[i];
        const nB = sharp[j] ? [en[i][0], en[i][1]] : vn[j];
        const base = pos.length / 3;
        // geometric normal of this wall segment at rest (perpendicular to the view rays)
        const Af = toWorld(A.x, A.y, zf), Bf = toWorld(B.x, B.y, zf), Ab = toWorld(A.x, A.y, zf - dep[i]);
        e1.set(Bf[0] - Af[0], Bf[1] - Af[1], Bf[2] - Af[2]);
        e2.set(Ab[0] - Af[0], Ab[1] - Af[1], Ab[2] - Af[2]);
        const wn = e1.clone().cross(e2).normalize();
        if (wn.x * en[i][0] - wn.y * en[i][1] < 0) wn.negate();
        const ring = (P, N, d, cl) => {
          const bev = Math.min(3.2, d * 0.32);
          const zs = [zf, zf - bev, zf - d];
          const tilt = [0.78, 0.12, -0.05];
          const body = bodyOf(cl[0], cl[1], cl[2]);
          for (let r = 0; r < 3; r++) {
            const w = toWorld(P.x, P.y, zs[r]);
            pos.push(w[0], w[1], w[2]);
            v3.set(N[0], -N[1], 0).multiplyScalar(Math.sqrt(1 - tilt[r] * tilt[r])).add(e1.set(0, 0, tilt[r])).normalize();
            nrm.push(v3.x, v3.y, v3.z);
            svg.push(P.x, P.y);
            aLip.push(cl[0], cl[1], cl[2]);
            aBody.push(body[0], body[1], body[2]);
            aWd.push(zf - zs[r]);
            aDep.push(d);
            aWn.push(wn.x, wn.y, wn.z);
          }
        };
        ring(A, nA, dep[i], col[i]);  // base+0..2
        ring(B, nB, dep[j], col[j]);  // base+3..5
        const o = base * 3;
        e1.set(pos[o + 9] - pos[o], pos[o + 10] - pos[o + 1], pos[o + 11] - pos[o + 2]);
        e2.set(pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]);
        e1.cross(e2);
        const flip = e1.x * en[i][0] + e1.y * -en[i][1] < 0;
        for (let r = 0; r < 2; r++) {
          const a = base + r, b = base + 3 + r, cc = base + 4 + r, d = base + 1 + r;
          if (!flip) idx.push(a, b, cc, a, cc, d); else idx.push(a, cc, b, a, d, cc);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('svg', new THREE.Float32BufferAttribute(svg, 2));
    g.setAttribute('aLip', new THREE.Float32BufferAttribute(aLip, 3));
    g.setAttribute('aBody', new THREE.Float32BufferAttribute(aBody, 3));
    g.setAttribute('aWd', new THREE.Float32BufferAttribute(aWd, 1));
    g.setAttribute('aDep', new THREE.Float32BufferAttribute(aDep, 1));
    g.setAttribute('aWn', new THREE.Float32BufferAttribute(aWn, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  /* ------------------------------------------------------------ vector overlay */
  function buildVector() {
    const uid = 'ox3d' + Math.random().toString(36).slice(2, 8);
    const text = artText.replace(/\bid="([^"]+)"/g, `id="${uid}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${uid}-$1)`);
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;opacity:0;';
    const g = document.createElementNS(SVG_NS, 'g');
    for (const n of [...doc.documentElement.childNodes]) g.appendChild(document.importNode(n, true));
    svg.appendChild(g);
    container.appendChild(svg);
    vec = { svg, g };
    placeVector();
    disposables.push(() => { clearTimeout(S.vectorTimer); svg.remove(); });
  }
  function placeVector() {
    if (!vec) return;
    const m = getFrontMapping();
    vec.svg.setAttribute('viewBox', `0 0 ${m.width} ${m.height}`);
    vec.g.setAttribute('transform', `matrix(${m.k} 0 0 ${m.k} ${m.ox - m.k * m.cx} ${m.oy - m.k * m.cy})`);
  }
  function showVector(on) {
    if (!vec) return;
    const cvs = renderer.domElement;
    if (on && !S.vectorShown) {
      S.vectorShown = true;
      vec.svg.style.transition = 'opacity 160ms linear';
      vec.svg.style.opacity = '1';
      clearTimeout(S.vectorTimer);
      S.vectorTimer = setTimeout(() => { if (S.vectorShown) cvs.style.visibility = 'hidden'; }, 190);
    } else if (!on && S.vectorShown) {
      S.vectorShown = false;
      clearTimeout(S.vectorTimer);
      cvs.style.visibility = '';
      vec.svg.style.transition = 'none';
      vec.svg.style.opacity = '0';
    }
  }

  /* -------------------------------------------------------------- camera */
  function fovFor(w, h) {
    const halfH = (symbol.h / 2 / U) / opt.fit;
    const halfW = (symbol.w / 2 / U) / opt.fit;
    const need = Math.max(halfH, halfW * h / w);
    return 2 * Math.atan(need / EW) / D2R;
  }
  /** CSS px per svg unit at the rest pose. */
  function frontScale(w, h) {
    const fov = fovFor(w, h) * D2R;
    return (h / 2) / (EW * Math.tan(fov / 2)) / U;
  }
  function resize() {
    if (!renderer) return;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opt.maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = fovFor(w, h); camera.updateProjectionMatrix();
    GU.uPxU.value = frontScale(w, h);
    placeVector();
    if (S.texScale && !S.building) {
      const k = desiredTexScale();
      if (k > S.texScale * 1.3 || k < S.texScale / 1.6) buildTextures(k).then(invalidate);
    }
  }

  /* -------------------------------------------------------------- animation */
  function applyIntro(t) {
    // the symbol holds a 3/4 view while most of the ink goes down, then turns into the logo
    const turn = power3InOut((t - POSE.turnStart) / (POSE.turnEnd - POSE.turnStart));
    const k = 1 - turn;
    const hold = clamp01(t / POSE.turnStart);
    const drift = 1 + 0.1 * (1 - hold) * (1 - hold);
    const pose = { yaw: POSE.introYaw * D2R * drift * k, pitch: POSE.introPitch * D2R * k, roll: POSE.introRoll * D2R * k, z: POSE.introZ * k };
    for (const L of layers) {
      const sp = L.spec;
      const a = clamp01((t - sp.t0) / sp.dur);
      const e = brushEase(a);
      L.u.uReveal.value = t < sp.t0 ? -1 : lerp(-0.03, 1.075, e);   // nothing of a stroke before its brush lands
      L.u.uRevealOn.value = a < 1 ? 1 : 0;
      L.u.uWet.value = 0.10 * (1 - smooth(0.8, 1, a));
      const span = Math.min(sp.dur + 0.5, INTRO_TOTAL - sp.t0);
      const kk = 1 - expoOut(clamp01((t - sp.t0) / span));
      L.intro = { x: (-L.dir.x * 20 * kk) / U, y: (L.dir.y * 20 * kk) / U, z: (-80 * kk) / U };
    }
    return pose;
  }

  function pointerTarget() {
    // soft, viewport-wide tilt everywhere; the full range only while hovering the symbol
    const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
    const nx = S.dx / (vw / 2), ny = S.dy / (vh / 2);
    const sy = POSE.softYaw * Math.tanh(1.4 * nx), sp = POSE.softPitch * Math.tanh(1.4 * ny);
    const z = zone();
    const hx = clamp(S.dx / z.hw, -1, 1), hy = clamp(S.dy / z.hh, -1, 1);
    const hyaw = POSE.hoverYaw * hx * (1.5 - 0.5 * hx * hx), hpit = POSE.hoverPitch * hy * (1.5 - 0.5 * hy * hy);
    return [lerp(sy, hyaw, S.hover) * D2R, lerp(sp, hpit, S.hover) * D2R];
  }
  function zone() {
    const k = frontScale(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    return { hw: symbol.w / 2 * k * 1.1, hh: symbol.h / 2 * k * 1.05 };
  }

  function update(dt) {
    S.clock += dt;
    const now = S.clock;
    // intro
    if (S.introPlaying && !S.introPaused) {
      S.introT += dt;
      if (S.introT >= INTRO_TOTAL) {
        S.introT = INTRO_TOTAL; S.introPlaying = false; S.introDone = now;
        if (S.sheen) S.glintAt = now + opt.hold;      // one signature glint when the hold ends
      }
    }
    const ip = applyIntro(S.introT);
    S.ip = ip;
    const introActive = S.introPending || S.introPlaying || S.introT < INTRO_TOTAL;

    // progress (scroll)
    const k = opt.progressSmoothing > 0 ? 1 - Math.exp(-dt * opt.progressSmoothing) : 1;
    S.prog += (S.progress - S.prog) * k;
    if (Math.abs(S.progress - S.prog) < 1e-4) S.prog = S.progress;
    const pe = smooth(0, 1, S.prog);
    const pm = reduced ? 0 : pe;
    const still = S.prog > 0.9;

    // pointer engagement: follows while the mouse moves, relaxes to the exact front at rest
    const interactive = opt.idle && !reduced && !introActive && !S.override && now >= S.introDone + opt.hold && !still;
    const eT = interactive && S.pointerActive && now - S.pointerAt < ENGAGE_HOLD ? 1 : 0;
    springStep(S.engage, eT, eT > S.engage.x ? ENGAGE_UP_W : (S.pointerLeft ? ENGAGE_LEAVE_W : ENGAGE_DOWN_W), dt);
    if (S.engage.x < 0.01 && eT === 0) { S.engage.x = 0; S.engage.v = 0; } // the tilt left is < 0.2 deg and the pose spring eases it out
    const hT = S.inZone && interactive ? 1 : 0;
    S.hover += (hT - S.hover) * (1 - Math.exp(-dt / (hT > S.hover ? 0.35 : 0.6)));
    if (Math.abs(hT - S.hover) < 1e-4) S.hover = hT;
    const eng = clamp01(S.engage.x);

    let ty = 0, tp = 0;
    if (S.override) { ty = S.override.yaw; tp = S.override.pitch; }
    else if (eng > 0) { const [a, b] = pointerTarget(); ty = a * eng; tp = b * eng; }
    let swaying = false;
    if (!S.override && opt.sway > 0 && opt.idle && !reduced && !introActive && !still) {
      const w = smooth(0, 2, now - S.introDone - opt.hold) * (1 - pe);
      ty += Math.sin(now * 0.33) * opt.sway * D2R * w; tp += Math.sin(now * 0.27 + 1.3) * opt.sway * 0.45 * D2R * w;
      swaying = w > 0;
    }
    if (S.override?.snap) { S.yaw.x = ty; S.yaw.v = 0; S.pitch.x = tp; S.pitch.v = 0; S.override.snap = false; }
    else { springStep(S.yaw, ty, SPRING_W, dt); springStep(S.pitch, tp, SPRING_W, dt); }
    for (const [s, t] of [[S.yaw, ty], [S.pitch, tp]]) if (Math.abs(s.x - t) < 2e-5 && Math.abs(s.v) < 2e-4) { s.x = t; s.v = 0; }

    let yaw = ip.yaw + S.yaw.x + POSE.scrollYaw * D2R * pm;
    let pitch = ip.pitch + S.pitch.x + POSE.scrollPitch * D2R * pm;
    if (!S.override?.raw) { yaw = clamp(yaw, -POSE.maxYaw * D2R, POSE.maxYaw * D2R); pitch = clamp(pitch, -POSE.maxPitch * D2R, POSE.maxPitch * D2R); }
    outer.rotation.set(pitch, yaw, ip.roll + POSE.scrollRoll * D2R * pm);
    outer.position.set(0.6 * pm, 0.25 * pm, PIVOT_Z + ip.z - 3.2 * pm);
    // layers: intro flight + breathing along the rest view rays (homothety about the eye) + scroll spread
    const bw = eng * (1 - pe);
    for (const L of layers) {
      const zf = L.spec.z / U;
      const br = bw * 2.5 * Math.sin(now * 2 * Math.PI / 6.4 + L.rank * 0.9) / U;
      const s = 1 - br / (EW - zf);
      L.group.scale.setScalar(s);
      L.group.position.set(L.intro.x, L.intro.y, L.intro.z + (1 - s) * EW + (L.spec.z * 1.4 * pm) / U);
    }
    const tiltDeg = Math.hypot(yaw, pitch) / D2R;
    GU.uTilt.value = smooth(0.15, 3, tiltDeg);

    // watermark: fade the red out, switch to one flat tone while invisible, fade the tone in
    const mono = smooth(0.40, 0.50, S.prog);
    GU.uMono.value = mono;
    const op = (1 - mono) * (1 - smooth(0.10, 0.46, S.prog)) + mono * opt.watermarkOpacity * smooth(0.46, 0.85, S.prog);
    renderer.domElement.style.opacity = op >= 0.999 ? '' : op.toFixed(3);

    // sheen glint
    let sweepActive = false;
    if (S.forceSweep !== null) {
      const c = S.forceSweep; GU.uSweep.value = c; GU.uSheen.value = 1;
      GU.uSweepDir.value.set(lerp(-5, 5, c), lerp(5, -5, c), 4).normalize(); GU.uSweepI.value = 1;
    } else {
      if (S.sheen && S.glintAt >= 0 && now >= S.glintAt && !introActive && !still) {
        const ph = now - S.glintAt;
        if (ph < GLINT_DUR) {
          const c = lerp(-0.3, 1.3, sineInOut(ph / GLINT_DUR));
          GU.uSweep.value = c; GU.uSheen.value = 1 - pe; sweepActive = true;
          GU.uSweepDir.value.set(lerp(-5, 5, c), lerp(5, -5, c), 4).normalize();
          GU.uSweepI.value = Math.sin(Math.PI * clamp01((c + 0.3) / 1.6));
          S.lastGlint = S.glintAt;
        } else {
          S.glintAt = opt.sheenInterval > 0 ? S.glintAt + Math.max(GLINT_DUR + 1, opt.sheenInterval) : -1;
        }
      } else if (still && S.glintAt >= 0 && now >= S.glintAt) S.glintAt = -1;
      if (!sweepActive) { GU.uSweep.value = -5; GU.uSheen.value = 0; GU.uSweepI.value = 0; }
    }

    // exact rest pose -> vector hand-off
    S.atRest = !introActive && S.prog === 0 && S.progress === 0 && !sweepActive && S.forceSweep === null && S.wallsOn &&
      Math.abs(yaw) < 0.05 * D2R && Math.abs(pitch) < 0.05 * D2R && Math.abs(ip.roll) < 1e-6;

    const settling = Math.abs(ty - S.yaw.x) > 0 || Math.abs(tp - S.pitch.x) > 0 || S.yaw.v !== 0 || S.pitch.v !== 0 ||
      S.engage.x !== eT || S.hover !== hT || S.prog !== S.progress;
    const glintPending = S.sheen && S.glintAt >= 0 && !still;
    return (S.introPlaying && !S.introPaused) || S.introPending || settling || sweepActive || glintPending || swaying ||
      (eng > 0 && !still);
  }

  function renderNow() {
    if (!renderer || !layers[0]?.front) return;
    const t0 = performance.now();
    renderer.render(scene, camera);
    S.renderMs.push(performance.now() - t0); if (S.renderMs.length > 120) S.renderMs.shift();
  }

  function frame(ts) {
    S.raf = 0;
    if (S.destroyed) return;
    const rawDt = S.last ? (ts - S.last) / 1000 : 0;
    const dt = S.last ? Math.min(rawDt, 1 / 20) : 1 / 60;
    S.frameCount++;
    if (S.last) { S.frames.push(ts - S.last); if (S.frames.length > 120) S.frames.shift(); }
    S.last = ts;
    if (S.introPending) {
      // start the intro clock on the first steady frame, so a load-time hitch never eats ink
      S.steady = S.last && rawDt > 0 && rawDt < 0.02 ? S.steady + 1 : 0;
      S.pendingFrames = (S.pendingFrames || 0) + 1;
      if (S.steady >= 2 || S.pendingFrames > 45) { S.introPending = false; S.introPlaying = true; S.introT = 0; }
    }
    const again = update(S.introPending ? 0 : dt);
    if (S.vectorOn && S.atRest) {
      if (!S.vectorShown) renderNow();
      showVector(true);
    } else {
      showVector(false);
      renderNow();
    }
    if (again && S.visible && !S.hidden) S.raf = requestAnimationFrame(frame);
    else S.last = 0;
  }

  function invalidate() {
    if (!S.raf && !S.destroyed && renderer && layers[0]?.front && S.visible && !S.hidden) S.raf = requestAnimationFrame(frame);
  }
  function onVis() { S.hidden = document.hidden; if (!S.hidden) invalidate(); }

  /* --------------------------------------------------------------- pointer */
  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && !opt.touchTilt) return;
    const r = container.getBoundingClientRect();
    pointerPx(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
  }
  function onMouseOut(e) { if (!e.relatedTarget) onLeave(); }
  function onLeave() { S.pointerActive = false; S.pointerLeft = true; S.inZone = false; invalidate(); }
  function pointerPx(dx, dy) {
    if (reduced || !symbol) return;
    S.dx = dx; S.dy = dy; S.pointerAt = Math.max(S.pointerAt, S.clock); S.pointerActive = true; S.pointerLeft = false;
    const z = zone();
    const inZone = Math.abs(dx) <= z.hw && Math.abs(dy) <= z.hh;
    if (inZone && !S.inZone && S.sheen && S.clock >= S.introDone + opt.hold && S.clock - S.lastGlint > GLINT_GAP && S.glintAt < 0 && S.prog < 0.05) {
      S.glintAt = S.clock + 0.1; S.lastGlint = S.glintAt;
    }
    S.inZone = inZone;
    invalidate();
  }

  /* --------------------------------------------------------------- API */
  function play() {
    if (reduced) { S.introT = INTRO_TOTAL; invalidate(); return; }
    S.override = null; S.introT = 0; S.introPending = true; S.introPlaying = false; S.introPaused = false;
    S.steady = 0; S.pendingFrames = 0;
    S.yaw.x = S.yaw.v = S.pitch.x = S.pitch.v = 0; S.engage.x = S.engage.v = 0; S.glintAt = -1;
    invalidate();
  }
  function seek(t) {
    S.introPending = false;
    S.introT = Math.max(0, Math.min(INTRO_TOTAL, t));
    S.introPlaying = S.introT < INTRO_TOTAL; S.introPaused = true;
    invalidate();
  }
  function setProgress(p, o = {}) {
    S.progress = clamp01(+p || 0);
    if (o.immediate) S.prog = S.progress;
    invalidate();
  }
  function setPointer(x, y) {
    if (reduced || (hoverNone && !opt.touchTilt) || !symbol) return;
    const w = container.clientWidth, h = container.clientHeight;
    pointerPx(x * w / 2, y * h / 2);
  }
  function setPose({ yaw = 0, pitch = 0, snap = true, raw = false } = {}) {
    S.introPending = false; S.introT = INTRO_TOTAL; S.introPlaying = false; S.introPaused = false;
    S.override = { yaw: yaw * D2R, pitch: pitch * D2R, snap, raw };
    invalidate();
  }
  function clearPose() { S.override = null; S.introDone = S.clock - opt.hold - 1; invalidate(); }
  function frontView() { setProgress(0, { immediate: true }); setPose({ yaw: 0, pitch: 0 }); }
  function glint() { if (!reduced) { S.sheen = true; S.glintAt = S.clock + 0.05; S.lastGlint = S.glintAt; invalidate(); } }
  function setSheen(on) { S.sheen = !!on && !reduced; if (!S.sheen) S.glintAt = -1; invalidate(); }
  function getFrontMapping() {
    if (!symbol) return null;                       // WebGL unavailable (image fallback)
    const w = container.clientWidth, h = container.clientHeight;
    const k = frontScale(w, h);
    return { k, cx: symbol.cx, cy: symbol.cy, ox: w / 2, oy: h / 2, width: w, height: h };
  }
  /** Projected extent of all wall vertices in container css px at the current pose (composition checks). */
  function screenBounds() {
    scene.updateMatrixWorld(true);
    const v = new THREE.Vector3(), w = container.clientWidth, h = container.clientHeight;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const L of layers) {
      const pos = L.walls.geometry.attributes.position, m = L.walls.matrixWorld;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m).project(camera);
        const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
        if (sx < x0) x0 = sx; if (sx > x1) x1 = sx; if (sy < y0) y0 = sy; if (sy > y1) y1 = sy;
      }
    }
    return { x0, y0, x1, y1, width: w, height: h };
  }
  function info() {
    const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
    let tris = 0; for (const L of layers) tris += (L.walls?.geometry.index.count || 0) / 3 + 2;
    const texPx = layers.reduce((s, L) => s + (L.tex ? L.tex.image.width * L.tex.image.height : 0), 0);
    const edgePx = layers.reduce((s, L) => s + (L.edgeTex ? L.edgeTex.image.width * L.edgeTex.image.height : 0), 0);
    return {
      triangles: tris, drawCalls: layers.length * 2, texScale: +S.texScale.toFixed(3), texMB: +((texPx * 4 * 1.33 + edgePx * 4) / 1048576).toFixed(1),
      frameMs: +avg(S.frames).toFixed(2), fps: S.frames.length ? +(1000 / avg(S.frames)).toFixed(1) : 0,
      renderCpuMs: +avg(S.renderMs).toFixed(2), frameCount: S.frameCount, looping: !!S.raf, dpr: renderer?.getPixelRatio(), reduced,
      vector: S.vectorShown, tones: !!opt.tones,
      gl: renderer ? renderer.getContext().getParameter(renderer.getContext().VERSION) : null,
    };
  }
  function destroy() {
    if (S.destroyed) return;
    S.destroyed = true;
    if (S.raf) cancelAnimationFrame(S.raf);
    ro?.disconnect(); io?.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('mouseout', onMouseOut);
    window.removeEventListener('blur', onLeave);
    if (renderer) renderer.domElement.remove();
    // three's compileAsync polls every program until it is linked: freeing the GPU side under it threw
    // ("reading 'isReady'", a destroy during the set-up, e.g. a missed time budget); it is freed once the compile settles
    const free = () => {
      disposables.forEach((f) => f());
      if (renderer) { renderer.dispose(); renderer.forceContextLoss?.(); }
      layers.length = 0;
    };
    if (S.compiling) S.compiling.then(free, free); else free();
  }

  const api = {
    ready, play, seek, setProgress, setPointer, setPose, clearPose, frontView, glint, setSheen,
    setWatermarkColor: (hex) => { setMonoColor(hex); invalidate(); },
    setVector: (on) => { S.vectorOn = !!on && !!vec; if (!S.vectorOn) showVector(false); invalidate(); },
    debugWalls: (on) => { S.wallsOn = !!on; for (const L of layers) if (L.walls) L.walls.visible = S.wallsOn; invalidate(); },
    getFrontMapping, screenBounds, info, destroy, render: () => { invalidate(); },
    debugSweep: (c) => { S.forceSweep = c == null ? null : +c; invalidate(); },
    state: () => ({
      introPlaying: S.introPlaying, introPending: S.introPending, introT: S.introT, progress: S.prog,
      yaw: S.yaw.x / D2R, pitch: S.pitch.x / D2R, engage: S.engage.x, hover: S.hover,
      atRest: S.atRest, vector: S.vectorShown, looping: !!S.raf, clock: S.clock,
      introYaw: (S.ip?.yaw || 0) / D2R, introPitch: (S.ip?.pitch || 0) / D2R, sheen: GU.uSheen.value, mono: GU.uMono.value,
      opacity: renderer ? +(renderer.domElement.style.opacity || 1) : 1, frames: S.frameCount,
    }),
    get reducedMotion() { return reduced; },
  };
  return api;
}
