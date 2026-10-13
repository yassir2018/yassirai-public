/*!
 * AL MAHA — hero cinemagraph, v3 site build (raw WebGL2, no dependencies).
 * Forked from lab/hero-cinemagraph/cinemagraph.js (the lab copy is unchanged and keeps working with its own photo).
 *
 *   const cine = createCinemagraph(layer, {
 *     image: plateImg,               // the still <img> already on the page (its currentSrc is the texture: no 2nd request)
 *     variants: { land: {...}, port: {...} },   // masks + geometry per plate (see DEFAULTS)
 *     portraitQuery: '(max-width: 1023px) and (orientation: portrait)',
 *   });
 *   cine.ready.then(...); cine.setProgress(p); cine.play(); cine.pause(); cine.destroy();
 *
 * The canvas is appended to `layer` with `className`: give it EXACTLY the CSS box of the still <img> (same rules) and the
 * shader reproduces object-fit: cover + the img's computed object-position, so photo, canvas and any cut-out layer that
 * shares the same box register to the pixel, whatever transform their common parent receives (intro, scroll push-in).
 *
 * Packed mask (built by v3/tools/make-hero.py):
 *   motion.png  R = 0.5 * water + 0.5 * warp   G = fog   B = drift      (exactly 0 on everything that must never move)
 *   flag.png    R = cloth weight              G = flutter zone (the cloth + the margin its outline may travel into)
 *
 *  water : perspective ripple slope field (two crossing layers, ~1 Hz) that wobbles the reflections, shades the wave
 *          facets and breaks the sun's reflection column into short-lived glints; broad slicks drift with the wind.
 *  fog   : three layers of curl-warped fbm mist drifting WITH THE WIND at parallax speeds, lit by the local colour.
 *  drift : the photo's own clouds and mist interiors advect with the wind (two-phase flow map, phase varies in space).
 *  flag  : the cloth ripples: waves travel from the hoist to the fly end, amplitude grows from exactly 0 at the hoist to
 *          its maximum at the free edge, light and shade travel with the folds. The pole and the hoist never move.
 *  intro : every effect is multiplied by `mix`, which eases 0 -> 1 (`intro.delay`, `intro.ramp`): the canvas takes over
 *          from the still while nothing moves yet (no seam), then the motion fades in.
 *
 *  scale : before the take-over, ~0.5 s of frames are drawn hidden with every effect on; if the GPU (with whatever else
 *          the page draws, e.g. the 3D oryx) cannot hold ~50 fps, the render scale steps down (1 -> 0.875 -> 0.75) while
 *          still hidden, and below `minFps` at the lowest scale the still photo simply stays. The scale is never stepped
 *          down while the canvas is on screen except by the 4 s safety net (adapt).
 * Start-up is split into short tasks (parallel shader compile when KHR_parallel_shader_compile exists, images decoded
 * off-thread with createImageBitmap), so it never blocks the main thread for long.
 */

const DEFAULTS = {
  image: null,                     // HTMLImageElement: the still (required)
  variants: {
    land: { masks: null, flag: null, protect: null, crop: [0, 0, 1, 1] },   // crop: master x0, y0, w, h (normalised)
    port: null,
  },
  portraitQuery: null,             // media query that selects the `port` variant (the <picture> source must match it)
  aspect: 2,                       // master width / height
  masterH: 1536,                   // master height in px (unit of the speed constants below)
  sun: [0.8255, 0.6829],           // sun centre, master uv
  horizon: 0.7305,                 // sea horizon (master v): vanishing line of the water plane
  wind: [1, 0],                    // screen direction the wind blows to (the flag flies to the right)
  flagGeo: null,                   // { hoistPoly: [c2, c1, c0], flyX, y0, y1 } master-normalised (hero-geometry.json)
  water: 1, fog: 1, drift: 1, glitter: 1, flag: 1, speed: 1,
  flagAmp: 7.5,                    // master px of travel at the fly end
  flagHz: 0.85,                    // wave frequency at a point of the cloth
  fogTune: [0.42, 3.0, 0.7, 0.2],  // fog density offset (keeps the photo's mean), gain thick / clear, billow light
  intro: { delay: 0, ramp: 2.4 },  // motion fades in once the canvas is up (s)
  dprMax: 2,                       // canvas pixels per CSS px at most: the still <img> is drawn at the device ratio, so is
                                   // the canvas (no softer take-over). Measured on the integrated AMD GPU next to the 3D
                                   // oryx: 60 fps at DPR 2 (1920 x 1080 -> 4416 x 2480 canvas). Weaker GPUs: the pre-roll
                                   // probe lowers the scale before the take-over, or keeps the still.
  adaptive: true,                  // lower the render scale if the GPU cannot hold ~50 fps
  minFps: 24,                      // below this for 4 s even at the lowest scale: hand back to the still for good
  reducedMotion: 'auto',
  preserveDrawingBuffer: false,
  className: 'cine-canvas',
  cutout: null,                    // { image, container }: the page's cut-out <img> (alpha) whose pixels are repainted from
                                   // this canvas, so the layer above the 3D symbol is the canvas's own pixels (diff 0)
  onReady: null,
  onError: null,
};

/* ------------------------------------------------------------------ motion design constants (master px, master px / s) */
const FLOW_T = 4.0;                       // drift flow-map cycle (s)
const DRIFT_MAX = 34.0;                   // master px of travel per cycle for drift mask == 1 (make-hero.py)
const FOG = [                             // [size px (feature), speed px/s at the far edge, weight]
  { size: 620, speed: 54, w: 0.52 },     // far banks (a steady breeze to the right: the flag flies)
  { size: 330, speed: 84, w: 0.36 },     // mid wisps
  { size: 170, speed: 126, w: 0.18 },    // near threads
];
const FLAG_LAMBDA = 0.62;                 // main wavelength along the cloth (fraction of its length)

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Tileable noise, generated once on the GPU (512 x 512, mip-mapped).
//  N1: R, G = fbm (base 8 cells, 5 octaves)   B, A = curl of a low-frequency potential (warp field)
//  N2: R, G = slope of a ripple height field  B = ripple height   A = fine grain (glitter)
const NOISE_FRAG = `#version 300 es
precision highp float; precision highp int;
uniform int uWhich; out vec4 frag;
uvec3 pcg3d(uvec3 v){
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
vec2 grad(ivec2 c, int per, uint seed){
  c = ((c % per) + per) % per;
  uint h = pcg3d(uvec3(uvec2(c), seed)).x;
  float a = float(h >> 8u) * (6.2831853 / 16777216.0);
  return vec2(cos(a), sin(a));
}
vec3 gnoise(vec2 p, int per, uint seed){
  ivec2 i = ivec2(floor(p)); vec2 f = p - floor(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = grad(i, per, seed), gb = grad(i + ivec2(1, 0), per, seed);
  vec2 gc = grad(i + ivec2(0, 1), per, seed), gd = grad(i + ivec2(1, 1), per, seed);
  float va = dot(ga, f), vb = dot(gb, f - vec2(1, 0)), vc = dot(gc, f - vec2(0, 1)), vd = dot(gd, f - vec2(1, 1));
  float v = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd);
  vec2 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd)
         + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va);
  return vec3(v, d);
}
vec3 fbm(vec2 uv, int base, int oct, float gain, uint seed){
  vec3 s = vec3(0.0); float a = 1.0; int f = base;
  for (int o = 0; o < 8; o++) {
    if (o >= oct) break;
    vec3 n = gnoise(uv * float(f), f, seed + uint(o) * 131u);
    s += a * vec3(n.x, n.yz * float(f));
    a *= gain; f *= 2;
  }
  return s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / 512.0;
  if (uWhich == 0) {
    float a = fbm(uv, 8, 5, 0.52, 11u).x;
    float b = fbm(uv, 8, 5, 0.52, 23u).x;
    vec3 psi = fbm(uv, 4, 2, 0.30, 37u);
    vec2 curl = vec2(psi.z, -psi.y) / 4.0;
    frag = vec4(0.5 + a * 0.62, 0.5 + b * 0.62, 0.5 + curl * 0.20);
  } else {
    vec3 h = fbm(uv, 16, 3, 0.42, 53u);
    vec2 s = h.yz / 16.0;
    float g = fbm(uv, 64, 2, 0.35, 71u).x;
    frag = vec4(0.5 + s * 0.20, 0.5 + h.x * 0.55, 0.5 + g * 0.62);
  }
  frag = clamp(frag, 0.0, 1.0);
}`;

const frag = (A, MH) => `#version 300 es
precision highp float;
uniform sampler2D uPhoto, uMask, uN1, uN2, uProtect, uFlag;
uniform vec4  uCover;      // xy scale, zw offset   (screen uv -> image uv, top-left origin)
uniform vec4  uCrop;       // image uv -> master: x0, y0, w, h (normalised master units; y may start above the master)
uniform vec2  uTexSize;
uniform vec2  uSun;
uniform float uHorizon;
uniform float uPx;         // height units per canvas pixel
uniform vec4  uAmt;        // water, fog, drift, glitter (already multiplied by the intro mix)
uniform vec2  uWind;       // unit vector, screen space (x right, y down)
uniform float uFlowPh;
uniform vec2  uOff[12];
uniform vec4  uBreath;
uniform float uProgress;
uniform vec4  uTune;
uniform vec4  uFlagA;      // hoist poly c2, c1, c0 (x / W as a function of v), fly x (x / W)
uniform vec4  uFlagB;      // cloth top v, bottom v, amplitude (height units), phase (cycles)
uniform vec4  uFlagC;      // shade gain, gust, phase of the short wave (cycles), -
uniform int   uDebug;
in vec2 vUv; out vec4 frag;

const float A = ${A.toFixed(6)};
const float MH = ${MH.toFixed(1)};
const float DRIFT_MAX = ${DRIFT_MAX.toFixed(2)} / MH;
const vec3  LUMA = vec3(0.299, 0.587, 0.114);
const vec3  GLINT = vec3(1.0, 0.95, 0.86);
const float FOG_S1 = ${(MH / (8 * FOG[0].size)).toFixed(5)};
const float FOG_S2 = ${(MH / (8 * FOG[1].size)).toFixed(5)};
const float FOG_S3 = ${(MH / (8 * FOG[2].size)).toFixed(5)};
const float TAU = 6.2831853;

vec3 bicubic(vec2 uv);
// magnified: Catmull-Rom (displaced pixels keep the photo's crispness); minified: trilinear like the browser's own
// downscale of the <img>, blended across lod 0 .. 0.12 so the canvas takes over from the still with the same sharpness
// (measured with tools/measure-cine.py: Laplacian ratio canvas / <img> within a few % from 1440 to 390 and on 768 x 1024)
vec3 photo(vec2 uv, float lod) {
  float m = smoothstep(0.0, 0.12, lod);
  float lu = lod < 0.4 ? lod * 0.8 : 0.32 + (lod - 0.4) * 0.25;     // strong downscales: the browser stays crisper
  vec3 mip = m > 0.0 ? textureLod(uPhoto, uv, lu).rgb : vec3(0.0);
  if (m >= 1.0) return mip;
  return mix(bicubic(uv), mip, m);
}
vec3 bicubic(vec2 uv) {
  vec2 sp = uv * uTexSize;
  vec2 t1 = floor(sp - 0.5) + 0.5;
  vec2 f = sp - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 p0 = (t1 - 1.0) / uTexSize, p3 = (t1 + 2.0) / uTexSize, p12 = (t1 + w2 / w12) / uTexSize;
  vec3 c = textureLod(uPhoto, vec2(p12.x, p0.y), 0.0).rgb * (w12.x * w0.y)
         + textureLod(uPhoto, vec2(p0.x, p12.y), 0.0).rgb * (w0.x * w12.y)
         + textureLod(uPhoto, p12, 0.0).rgb * (w12.x * w12.y)
         + textureLod(uPhoto, vec2(p3.x, p12.y), 0.0).rgb * (w3.x * w12.y)
         + textureLod(uPhoto, vec2(p12.x, p3.y), 0.0).rgb * (w12.x * w3.y);
  float n = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return max(c / n, 0.0);
}

vec3 heat(float x){ return clamp(vec3(1.5 * x, 2.0 * x - 0.5, 4.0 * x - 3.0), 0.0, 1.0); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float nlod(float k){ return log2(max(k * 512.0, 1e-3)); }

void main(){
  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 uv  = suv * uCover.xy + uCover.zw;                            // image uv
  vec2 P   = vec2((uCrop.x + uv.x * uCrop.z) * A, uCrop.y + uv.y * uCrop.w);   // master coords, height units
  vec2 toImg = vec2(1.0 / (A * uCrop.z), 1.0 / uCrop.w);             // height units -> image uv

  vec2 duv = max(abs(dFdx(uv * uTexSize)), abs(dFdy(uv * uTexSize)));
  float lod = log2(max(max(duv.x, duv.y), 1e-4));
  float dz = max(P.y - uHorizon, 0.012);
  vec2 Wp = vec2((P.x - uSun.x * A) / dz, 1.0 / dz);
  vec2 dWx = dFdx(Wp), dWy = dFdy(Wp);

  vec4 mk = textureLod(uMask, uv, 0.0);
  float wFx = clamp(2.0 * mk.r, 0.0, 1.0), wWp = clamp(2.0 * mk.r - 1.0, 0.0, 1.0);
  wFx = clamp((wFx - 0.02) / 0.98, 0.0, 1.0);
  wWp = clamp((wWp - 0.02) / 0.98, 0.0, 1.0);
  float fm = clamp((mk.g - 0.035) / 0.965, 0.0, 1.0);
  float dmk = clamp((mk.b - 0.012) / 0.988, 0.0, 1.0);
  float wm = wFx * uAmt.x, fA = fm * uAmt.y, dm = dmk * uAmt.z;

  /* --- drift: two-phase flow map; content travels along the wind --- */
  vec2 d0 = vec2(0.0), d1 = vec2(0.0); float wB = 0.0;
  if (dm > 0.0) {
    vec4 nl = textureLod(uN1, P * vec2(0.19, 0.31) + vec2(0.37, 0.11), 3.5);
    float ph0 = fract(uFlowPh + (nl.r - 0.5) * 2.6 + P.x * 0.21);
    float ph1 = fract(ph0 + 0.5);
    wB = abs(1.0 - 2.0 * ph0);
    vec2 dir = normalize(-uWind + (nl.ba - 0.5) * vec2(0.6, 1.4));   // photo(uv + dir * phase): motion along -dir
    float len = dm * DRIFT_MAX;
    d0 = dir * (ph0 - 0.5) * len;
    d1 = dir * (ph1 - 0.5) * len;
  }

  /* --- flag: travelling waves from the hoist to the fly end --- */
  vec2 dF = vec2(0.0); float fShade = 0.0;
  vec2 fz = uFlagB.z > 0.0 ? textureLod(uFlag, uv, 0.0).rg : vec2(0.0);
  if (fz.g > 0.002) {
    float v = P.y;
    float hx = (uFlagA.x * v * v + uFlagA.y * v + uFlagA.z) * A;
    float fx = uFlagA.w * A;
    float u = clamp((P.x - hx) / max(fx - hx, 1e-3), 0.0, 1.25);
    float vv = (P.y - uFlagB.x) / (uFlagB.y - uFlagB.x);             // 0 top .. 1 bottom of the cloth
    float env = pow(smoothstep(0.0, 1.0, u), 1.35);                   // 0 (and flat) at the hoist, 1 at the fly end
    float p1 = TAU * (u / ${FLAG_LAMBDA.toFixed(3)} - uFlagB.w + 0.16 * vv);
    float p2 = TAU * (u / ${(FLAG_LAMBDA * 0.46).toFixed(3)} - uFlagC.z - 0.22 * vv + 0.31);
    float s1 = sin(p1), c1 = cos(p1), s2 = sin(p2), c2 = cos(p2);
    float a = uFlagB.z * env * uFlagC.y;
    // the cloth rises and falls with the wave (mostly vertical at this side view) and is pulled toward the hoist a
    // little where it folds (foreshortening: photo(uv + o) with o.x >= 0 shows content from nearer the fly end, so the
    // cloth only ever SHORTENS, as real cloth does; it never stretches past its outline), so the folds seem to travel
    // toward the fly end
    dF = vec2(a * (0.32 * (0.5 + 0.5 * c1) + 0.10 * (0.5 + 0.5 * c2)), a * (s1 + 0.32 * s2)) * fz.g;
    fShade = env * (c1 + 0.45 * c2) * uFlagC.x * uFlagC.y;
  }

  /* --- water --- */
  vec2 slope = vec2(0.0); float calm = 0.0; float nearW = 0.0; vec2 rip = vec2(0.0);
  float spark = 0.0;
  if (wm > 0.0) {
    nearW = smoothstep(0.03, 0.26, dz);
    vec2 ks = vec2(0.154, 0.19);
    float sl = textureGrad(uN1, Wp * ks + uOff[0], dWx * ks, dWy * ks).g;
    sl = mix(sl, textureGrad(uN1, Wp * ks * 1.7 + uOff[1], dWx * ks * 1.7, dWy * ks * 1.7).r, 0.35);
    calm = smoothstep(0.50, 0.68, sl);
    vec2 k1 = vec2(0.55, 0.95), k2 = vec2(0.80, 1.40);
    mat2 r2 = rot(0.25);
    vec2 R1 = Wp * k1 + uOff[2];
    vec2 R2 = r2 * (Wp * k2) + uOff[3];
    vec4 a = textureGrad(uN2, R1, dWx * k1, dWy * k1);
    vec4 b = textureGrad(uN2, R2, r2 * (dWx * k2), r2 * (dWy * k2));
    vec2 sb = transpose(r2) * (b.rg - 0.5);
    slope = ((a.rg - 0.5) + 0.8 * sb) * 4.2 * mix(1.0, 0.35, calm);
    vec2 dpx = vec2(0.30 * slope.x, slope.y) * (13.0 * dz) * wWp * uAmt.x;
    rip = dpx / MH;
    float cg = mix(0.0024, 0.0055, nearW);
    vec2 G = vec2(P.x / (cg * 1.9), P.y / (cg * 0.9)) / 64.0;
    vec2 dGx = vec2(uPx / (cg * 1.9), 0.0) / 64.0, dGy = vec2(0.0, uPx / (cg * 0.9)) / 64.0;
    float g1 = textureGrad(uN2, G + uOff[4] + slope * 0.004, dGx, dGy).a;
    float g2 = textureGrad(uN2, rot(1.1) * G * 1.13 + uOff[5], rot(1.1) * dGx * 1.13, rot(1.1) * dGy * 1.13).a;
    float sx = P.x - uSun.x * A;
    float core = exp(-pow(sx / (0.006 + 0.125 * dz), 2.0));
    float broad = exp(-pow(sx / (0.03 + 0.6 * dz), 2.0));
    float thr = mix(0.67, 0.47, core);
    spark = smoothstep(thr, thr + 0.07, g1) * smoothstep(thr - 0.02, thr + 0.05, g2);
    spark *= (core + 0.35 * broad) * mix(1.0, 0.45, calm);
  }

  vec2 o0 = (d0 + rip + dF) * toImg, o1 = (d1 + rip + dF) * toImg;
  vec3 col = photo(uv + o0, lod);
  if (wB > 0.0) col = mix(col, photo(uv + o1, lod), wB);
  if (fz.g > 0.002) {
    // light and shade travel with the folds, on the cloth only (read where the cloth pixel came from)
    float cw = textureLod(uFlag, uv + o0, 0.0).r;
    col *= 1.0 + fShade * cw;
  }

  /* --- water light --- */
  float wLight = 0.0;
  if (wm > 0.0) {
    float lum = dot(col, LUMA);
    float facet = slope.y * 0.75 + slope.x * 0.25;
    float fk = 0.19 * mix(0.45, 1.0, nearW);
    col += facet * fk * wm * (0.28 + 0.72 * col) * vec3(0.72, 1.0, 1.32);
    col = max(col, 0.0);
    col *= 1.0 + (calm - 0.22) * 0.16 * wm;
    float sx = P.x - uSun.x * A;
    float core = exp(-pow(sx / (0.006 + 0.125 * dz), 2.0)) * smoothstep(0.50, 0.85, lum);
    float gate = smoothstep(0.42, 0.80, lum);
    vec3 hue = col / max(max(col.r, max(col.g, col.b)), 0.2);
    vec3 glc = mix(hue, GLINT, 0.35);
    float toward = smoothstep(-0.9, 0.9, facet);
    col = mix(col, col * vec3(0.95, 0.78, 0.55), mix(0.92, 0.0, toward) * core * wm * (1.0 - spark));
    col += glc * spark * gate * 1.15 * uAmt.w * wm;
    col = min(col, vec3(1.0));
    wLight = abs(facet) * fk + spark;
  }

  /* --- fog: drifting, curling mist banks in the warm light --- */
  float fogH = 0.0, fogD = -1.0;
  if (fA > 0.0) {
    float dep = smoothstep(0.55, 1.0, P.y);
    float sc = mix(1.0, 1.6, dep);
    vec2 F = (P - vec2(0.95, 0.62)) / sc;
    float pr = uProgress;
    vec2 cw = textureLod(uN1, F * vec2(0.42, 0.9) + uOff[6], nlod(0.9 * uPx / sc)).ba - 0.5;
    vec2 cw2 = textureLod(uN1, F * vec2(0.9, 1.9) + uOff[7], nlod(1.9 * uPx / sc)).ba - 0.5;
    vec2 wq = cw * 1.6 + cw2 * 0.25;
    vec2 q1 = F * vec2(FOG_S1 * 0.72, FOG_S1 * 1.30) + wq * 0.045 + uOff[8] + vec2(0.0, pr * 0.10);
    vec2 q2 = rot(0.21) * (F * vec2(FOG_S2 * 0.72, FOG_S2 * 1.30)) + wq * 0.065 + uOff[9] + vec2(0.0, pr * 0.19);
    vec2 q3 = rot(-0.33) * (F * vec2(FOG_S3 * 0.75, FOG_S3 * 1.30)) + wq * 0.07 + uOff[10] + vec2(0.0, pr * 0.30);
    float l1 = nlod(FOG_S1 * 1.3 * uPx / sc), l2 = nlod(FOG_S2 * 1.3 * uPx / sc), l3 = nlod(FOG_S3 * 1.3 * uPx / sc);
    float n1 = textureLod(uN1, q1, l1).r;
    float n2 = textureLod(uN1, q2, l2).g;
    float n3 = textureLod(uN1, q3, l3).r;
    float b1 = smoothstep(0.46, 0.67, n1) * (0.80 + 0.20 * uBreath.x);
    float b2 = smoothstep(0.48, 0.67, n2) * (0.78 + 0.22 * uBreath.y);
    float b3 = smoothstep(0.48, 0.74, n3) * (0.75 + 0.25 * uBreath.z);
    float dens = ${FOG[0].w.toFixed(2)} * b1 + ${FOG[1].w.toFixed(2)} * b2 * (0.45 + 0.55 * b1) + ${FOG[2].w.toFixed(2)} * b3 * (0.3 + 0.7 * b2);
    dens *= (0.92 + 0.08 * uBreath.w) * (1.0 + 0.4 * pr);
    fogD = dens;
    vec3 local = textureLod(uPhoto, uv, 6.0).rgb;
    vec3 air = clamp(mix(vec3(1.0, 0.86, 0.73), local * 1.15 + 0.05, 0.6), 0.0, 1.0);
    float lum = dot(col, LUMA);
    float mistiness = smoothstep(0.55, 0.80, lum);
    float v = dens - uTune.x;
    float h = fA * v * (v > 0.0 ? uTune.y * (1.0 - 0.5 * mistiness) : uTune.z);
    if (h > 0.0) col = mix(col, air, h);
    else col = max((col + air * h) / (1.0 + h), 0.0);
    // billow light on the photo's own bright mist: sun-facing slopes of the moving banks brighten
    float n2s = textureLod(uN1, q2 + rot(0.21) * vec2(0.012, 0.004), l2).g;
    float n1s = textureLod(uN1, q1 + vec2(0.010, 0.004), l1).r;
    float lit = clamp(((n2 - n2s) * 0.9 + (n1 - n1s) * 1.1) * 7.0, -1.0, 1.0);
    float bl = uTune.w * lit * mistiness * fA * (1.0 - 0.75 * smoothstep(0.80, 0.97, lum));
    col *= 1.0 + bl;
    fogH = abs(h) + abs(bl);
  }

  if (uDebug > 0) {
    vec3 base = mix(vec3(dot(col, vec3(0.333))), col, 0.35) * 0.8;
    float pm = textureLod(uProtect, uv, 0.0).r;
    if (uDebug == 1) {
      base = mix(base, vec3(0.95, 0.15, 0.1), pm * 0.55);
      base = mix(base, vec3(0.25, 0.85, 0.2), dmk * 0.40);
      base = mix(base, vec3(1.0, 0.85, 0.2), fm * 0.55);
      base = mix(base, vec3(0.1, 0.45, 1.0), wFx * 0.60);
      base = mix(base, vec3(0.6, 0.1, 1.0), wWp * 0.45);
      base = mix(base, vec3(1.0, 0.2, 0.9), fz.g * 0.5);
    } else if (uDebug == 2) { base = mix(base, vec3(0.1, 0.45, 1.0), wFx * 0.75); base = mix(base, vec3(0.6, 0.1, 1.0), wWp * 0.6); }
    else if (uDebug == 3) base = mix(base, vec3(1.0, 0.85, 0.2), fm * 0.85);
    else if (uDebug == 4) base = mix(base, vec3(0.25, 0.85, 0.2), dmk * 0.85);
    else if (uDebug == 5) base = mix(base, vec3(0.95, 0.15, 0.1), pm * 0.8);
    else if (uDebug == 6) {
      float px = max(length(o0 / toImg), length(o1 / toImg)) * MH;
      float e = px / 16.0 + fogH * 2.5 + wLight * 2.0 + abs(fShade);
      base = mix(base * 0.5, heat(clamp(e, 0.0, 1.0)), step(0.0005, e));
    } else if (uDebug == 7 && fogD >= 0.0) base = vec3(fogD);
    else if (uDebug == 8) base = mix(base, vec3(1.0, 0.2, 0.9), fz.g * 0.6);
    col = base;
  }
  frag = vec4(col, 1.0);
}`;

/* ------------------------------------------------------------------ helpers */
const fract = (x) => x - Math.floor(x);
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const nextTask = () => new Promise((r) => setTimeout(r, 0));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const loadImage = (url) => new Promise((res, rej) => {
  const im = new Image();
  if (new URL(url, document.baseURI).origin !== location.origin) im.crossOrigin = 'anonymous';
  im.decoding = 'async';
  im.onload = () => res(im);
  im.onerror = () => rej(new Error('image failed: ' + url));
  im.src = url;
});
// off-thread decode; `raw` keeps the stored bytes (masks), else the photo is colour-managed like the <img>
const bitmap = async (src, raw) => {
  if (!('createImageBitmap' in window)) return src;
  try {
    return await createImageBitmap(src, { premultiplyAlpha: 'none', colorSpaceConversion: raw ? 'none' : 'default', imageOrientation: 'none' });
  } catch (e) { return src; }
};
const parsePos = (s) => {
  const v = String(s || '50% 50%').split(/\s+/).map((t) => (t.endsWith('%') ? parseFloat(t) / 100 : NaN));
  return [Number.isFinite(v[0]) ? v[0] : 0.5, Number.isFinite(v[1]) ? v[1] : 0.5];
};

/* ------------------------------------------------------------------ main */
export function createCinemagraph(container, options = {}) {
  const o = { ...DEFAULTS, ...options, intro: { ...DEFAULTS.intro, ...(options.intro || {}) } };
  const img = o.image;
  if (!img) throw new Error('createCinemagraph: options.image is required');
  const wl = Math.hypot(o.wind[0], o.wind[1]) || 1;
  const WIND = [o.wind[0] / wl, o.wind[1] / wl];
  const P = { water: o.water, fog: o.fog, drift: o.drift, glitter: o.glitter, flag: o.flag, speed: o.speed, debug: 0,
    tune: Float32Array.from(o.fogTune), mix: null };

  const mark = (n) => { try { performance.mark('cine:' + n); } catch (e) {} };
  const mkCanvas = (parent) => {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.className = o.className;
    c.style.opacity = '0';
    c.style.transition = 'opacity .7s ease';
    parent.append(c);
    return c;
  };
  const canvas = mkCanvas(container);
  // cut-out repaint: a 2D canvas over the cut-out <img>, holding the WebGL canvas's own (never-moving) pixels under the
  // cut-out's alpha. Resampling is then identical above and below the 3D symbol: the cut-out cannot show an edge.
  const cut = o.cutout && o.cutout.image ? { img: o.cutout.image, canvas: mkCanvas(o.cutout.container || o.cutout.image.parentNode), need: true, hideT: 0 } : null;

  const mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const mqPort = o.portraitQuery && window.matchMedia ? window.matchMedia(o.portraitQuery) : null;
  const isReduced = () => (o.reducedMotion === 'auto' ? !!(mqReduce && mqReduce.matches) : !!o.reducedMotion);
  const variantKey = () => (mqPort && mqPort.matches && o.variants.port ? 'port' : 'land');

  let gl = null, prog = null, loc = {}, tex = {}, vao = null, buf = null;
  let raf = 0, last = 0, time = 0, progress = 0, shownAt = -1;
  // pre-roll: the first frames are drawn hidden, with every effect on, to choose the render scale BEFORE the canvas takes
  // over (never a visible step down while the photo is on screen); too slow even at the lowest scale: keep the still
  let probe = null, revealed = false;
  let userPlaying = true, onScreen = true, destroyed = false, glFailed = false, ready = false, booting = false;
  let imgSize = [1, 1], cur = { key: null, v: null };
  let scale = 1, frameAcc = 0, frameN = 0, fps = 0, slowWindows = 0, lowWindows = 0;
  let box = { w: 1, h: 1, pos: [0.5, 0.5] };
  let readyResolve; const readyP = new Promise((r) => (readyResolve = r));

  /* ---------------- GL set-up (async: compile in parallel, check later) */
  async function program(vs, fs) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const p = gl.createProgram();
    const a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, a); gl.attachShader(p, b);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    const par = gl.getExtension('KHR_parallel_shader_compile');
    if (par) {
      const t0 = performance.now();
      while (!gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR)) {
        if (destroyed || gl.isContextLost()) throw new Error('aborted');
        if (performance.now() - t0 > 20000) break;
        await nextFrame();
      }
    }
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getShaderInfoLog(b) || gl.getShaderInfoLog(a) || gl.getProgramInfoLog(p);
      throw new Error('shader: ' + log);
    }
    gl.deleteShader(a); gl.deleteShader(b);
    return p;
  }

  async function makeNoise() {
    const np = await program(VERT, NOISE_FRAG);
    mark('noise-linked');
    gl.useProgram(np);
    const uWhich = gl.getUniformLocation(np, 'uWhich');
    const fb = gl.createFramebuffer();
    const out = [];
    for (let which = 0; which < 2; which++) {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2 + which); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 10, gl.RGBA8, 512, 512);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      // (no checkFramebufferStatus: a 512 x 512 RGBA8 colour attachment is always complete, and the query is a
      // synchronous round trip to the GPU process that waits behind any other page's / context's GPU work)
      gl.viewport(0, 0, 512, 512);
      gl.uniform1i(uWhich, which);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      out.push(t);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteProgram(np);
    mark('noise-drawn');
    [tex.n1, tex.n2] = out;
  }

  async function initGL() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: !!o.preserveDrawingBuffer, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    gl.getExtension('KHR_parallel_shader_compile');
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const main = program(VERT, frag(o.aspect, o.masterH));          // both programs compile at the same time
    await makeNoise();
    prog = await main;
    mark('main-linked');
    gl.useProgram(prog);
    for (const n of ['uPhoto', 'uMask', 'uN1', 'uN2', 'uProtect', 'uFlag', 'uCover', 'uCrop', 'uTexSize', 'uSun', 'uHorizon', 'uPx',
      'uAmt', 'uWind', 'uFlowPh', 'uOff', 'uBreath', 'uProgress', 'uTune', 'uFlagA', 'uFlagB', 'uFlagC', 'uDebug']) loc[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(loc.uPhoto, 0); gl.uniform1i(loc.uMask, 1); gl.uniform1i(loc.uN1, 2); gl.uniform1i(loc.uN2, 3);
    gl.uniform1i(loc.uProtect, 4); gl.uniform1i(loc.uFlag, 5);
    tex.blank = gl.createTexture();
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tex.blank);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  }

  function upload(unit, image, { mips = false, raw = false } = {}) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, raw ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (image.close) image.close();
    return t;
  }

  const stillReadyP = () => (img.complete && img.naturalWidth ? Promise.resolve()
    : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }));

  let loading = null;
  async function ensureVariant() {
    await stillReadyP();
    const v = variantKey();
    const V = o.variants[v];
    const photoUrl = img.currentSrc || img.src;
    const key = v + '|' + photoUrl + '|' + (P.debug ? 'dbg' : '');
    if (cur.key === key || loading === key) return;
    loading = key;
    const [phB, mk, fl, pt] = await Promise.all([
      bitmap(img, false),
      loadImage(V.masks).then((m) => bitmap(m, true)),
      V.flag && o.flagGeo ? loadImage(V.flag).then((m) => bitmap(m, true)) : null,
      P.debug && V.protect ? loadImage(V.protect).then((m) => bitmap(m, true)).catch(() => null) : null,
    ]);
    if (destroyed || loading !== key || !gl) return;
    const w = phB.width || img.naturalWidth, h = phB.height || img.naturalHeight;
    const old = [cur.photo, cur.mask, cur.flag, cur.protect];
    await nextTask();
    const photo = upload(0, phB, { mips: true });
    await nextTask();
    const mask = upload(1, mk, { raw: true });
    const flag = fl ? upload(5, fl, { raw: true }) : null;
    const protect = pt ? upload(4, pt, { raw: true }) : null;
    cur = { key, v, photo, mask, flag, protect, crop: V.crop || [0, 0, 1, 1] };
    old.forEach((t) => t && gl.deleteTexture(t));
    imgSize = [w, h];
    loading = null;
  }

  // the canvas shares the <img>'s CSS box; read its size and object-position (changes with the layout breakpoints)
  function measure() {
    const r = canvas.getBoundingClientRect();
    const w = canvas.offsetWidth || r.width, h = canvas.offsetHeight || r.height;
    box = { w: Math.max(1, w), h: Math.max(1, h), pos: parsePos(getComputedStyle(img).objectPosition) };
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, o.dprMax) * scale;
    const w = Math.max(1, Math.round(box.w * dpr)), h = Math.max(1, Math.round(box.h * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  const off = new Float32Array(24);
  const setOff = (i, x, y) => { off[2 * i] = fract(x); off[2 * i + 1] = fract(y); };
  const mixNow = () => {
    if (P.mix != null) return P.mix;
    if (probe) return 1;
    if (shownAt < 0) return 0;
    const t = (performance.now() - shownAt) / 1000 - o.intro.delay;
    return smooth(t / Math.max(0.01, o.intro.ramp));
  };
  function uniforms() {
    const ai = imgSize[0] / imgSize[1], ac = box.w / box.h;
    let sx = 1, sy = 1;
    if (ac > ai) sy = ai / ac; else sx = ac / ai;
    gl.uniform4f(loc.uCover, sx, sy, (1 - sx) * box.pos[0], (1 - sy) * box.pos[1]);
    const c = cur.crop;
    gl.uniform4f(loc.uCrop, c[0], c[1], c[2], c[3]);
    gl.uniform2f(loc.uSun, o.sun[0], o.sun[1]);
    gl.uniform2f(loc.uTexSize, imgSize[0], imgSize[1]);
    gl.uniform1f(loc.uHorizon, o.horizon);
    gl.uniform1f(loc.uPx, (sy * c[3]) / canvas.height);
    const m = mixNow();
    gl.uniform4f(loc.uAmt, P.water * m, P.fog * m, P.drift * m, P.glitter * m);
    gl.uniform2f(loc.uWind, WIND[0], WIND[1]);
    const t = time;
    gl.uniform1f(loc.uFlowPh, fract(t / FLOW_T));
    const wx = WIND[0];
    setOff(0, -wx * t * 0.0140, t * -0.0028);     // slicks drift with the wind
    setOff(1, t * -0.0060, t * 0.0025);
    setOff(2, t * 0.034, t * -0.050);              // ripple layers cross (no net slide)
    setOff(3, t * -0.046, t * -0.032);
    setOff(4, t * 0.046, t * 0.011);
    setOff(5, t * -0.039, t * -0.009);
    const ts = (k) => (FOG[k].speed / o.masterH) * (o.masterH / (8 * FOG[k].size)) * [0.72, 0.72, 0.75][k];
    // curl warp, large: carried at the far banks' speed, so the banks travel with the wind instead of boiling in place
    const vF = (FOG[0].speed / o.masterH) * 0.42;
    setOff(6, -wx * t * vF, t * -0.0030);
    setOff(7, -wx * t * vF * 1.2, t * 0.0040);    // curl warp, fine: a little faster (the threads curl as they go)
    // a feature at texture coordinate q sits where F * k + off = q: off decreasing in x moves the mist to the right
    setOff(8, -wx * t * ts(0), t * 0.0007);
    setOff(9, -wx * t * ts(1) * Math.cos(0.21), -wx * t * ts(1) * Math.sin(0.21) + t * 0.0012);
    setOff(10, -wx * t * ts(2) * Math.cos(-0.33), -wx * t * ts(2) * Math.sin(-0.33) - t * 0.0016);
    gl.uniform2fv(loc.uOff, off);
    const TAU = Math.PI * 2;
    gl.uniform4f(loc.uBreath, Math.sin(t * TAU / 13 + 0.4), Math.sin(t * TAU / 9.7 + 2.1), Math.sin(t * TAU / 7.3 + 4.0),
      Math.sin(t * TAU / 17 + 1.0));
    gl.uniform1f(loc.uProgress, progress);
    gl.uniform4fv(loc.uTune, P.tune);
    const g = o.flagGeo;
    const fOn = g && cur.flag ? P.flag * m : 0;
    if (g) {
      gl.uniform4f(loc.uFlagA, g.hoistPoly[0], g.hoistPoly[1], g.hoistPoly[2], g.flyX);
      // gusts: two slow incommensurate swells, never below 0.7 of the base amplitude
      const gust = 0.85 + 0.09 * Math.sin(t * TAU / 6.3 + 0.7) + 0.06 * Math.sin(t * TAU / 2.9 + 2.2);
      gl.uniform4f(loc.uFlagB, g.y0, g.y1, (o.flagAmp / o.masterH) * fOn, fract(t * o.flagHz));
      gl.uniform4f(loc.uFlagC, 0.075 * fOn, gust, fract(t * o.flagHz * 1.73), 0);
    } else {
      gl.uniform4f(loc.uFlagB, 0, 1, 0, 0);
    }
    gl.uniform1i(loc.uDebug, P.debug | 0);
  }

  function repaintCutout() {
    const fi = cut.img;
    if (!fi.complete || !fi.naturalWidth) return false;
    const cw = canvas.width, ch = canvas.height;
    if (cut.canvas.width !== cw || cut.canvas.height !== ch) { cut.canvas.width = cw; cut.canvas.height = ch; }
    const ctx = cut.ctx || (cut.ctx = cut.canvas.getContext('2d'));
    const iw = fi.naturalWidth, ih = fi.naturalHeight;
    const s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    ctx.globalCompositeOperation = 'copy';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(fi, (cw - dw) * box.pos[0], (ch - dh) * box.pos[1], dw, dh);     // the alpha (cover, same mapping)
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(canvas, 0, 0);                                                      // ...filled with this frame
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  function draw() {
    if (!gl || !cur.photo || gl.isContextLost()) return;
    const w0 = canvas.width, h0 = canvas.height;
    resize();
    if (cut && (canvas.width !== w0 || canvas.height !== h0)) cut.need = true;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog); gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, cur.photo);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cur.mask);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex.n1);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tex.n2);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, cur.protect || tex.blank);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, cur.flag || tex.blank);
    uniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (cut && cut.need && repaintCutout()) cut.need = false;       // same task: the drawing buffer is still valid
    if (!ready) {
      ready = true;
      mark('drawn');
      if (o.adaptive) { probe = { dts: [], rounds: 0 }; kick(); } else reveal();
    }
  }

  function reveal() {
    mark('shown');
    revealed = true;
    draw();                                                          // this frame: still (mix 0), at the chosen scale
    requestAnimationFrame(() => {
      canvas.style.opacity = '1';
      if (cut) {
        cut.canvas.style.opacity = '1';
        clearTimeout(cut.hideT);
        cut.hideT = setTimeout(() => { if (!glFailed) cut.img.style.visibility = 'hidden'; }, 760);
      }
      shownAt = performance.now() + 700;
    });
    readyResolve(api); o.onReady && o.onReady(api);
    kick();
  }
  const PROBE_N = 24, PROBE_SKIP = 4;
  // throughput, not the median: a GPU that cannot keep up often delivers frames in bursts (many quick callbacks, then
  // one very long one), so the probe uses the mean frame time with only the single longest frame left out (one page
  // hitch during the intro must not lower the scale)
  function probeStep(dtRaw) {
    if (dtRaw <= 0) return;
    probe.dts.push(dtRaw);
    const spent = probe.dts.reduce((a, x) => a + x, 0);
    // a slow GPU shows itself fast: after 1.2 s of frames, judge on what is there (>= 6 frames)
    if (probe.dts.length < PROBE_N + PROBE_SKIP && !(spent > 1.2 && probe.dts.length >= 6)) return;
    const d = (probe.dts.length > PROBE_SKIP + 4 ? probe.dts.slice(PROBE_SKIP) : probe.dts.slice(1)).sort((x, y) => x - y);
    d.pop();
    const mean = d.reduce((a, x) => a + x, 0) / d.length;
    const med = d[d.length >> 1];
    const capped30 = med > 0.031 && med < 0.035 && d[Math.floor(d.length * 0.9)] < 0.037;
    probe.mean = mean;
    if (mean > 0.0195 && !capped30) {
      if (scale > 0.75 && probe.rounds < 2) { scale = Math.max(0.75, scale - 0.125); probe.rounds++; probe.dts.length = 0; if (cut) cut.need = true; return; }
      if (mean > 1 / o.minFps) { probe = null; giveUp(new Error('too slow before take-over: ' + (1 / mean).toFixed(1) + ' fps')); return; }
    }
    probe = null;
    reveal();
  }

  const shouldRun = () => userPlaying && onScreen && !document.hidden && !destroyed && !glFailed && !isReduced() && ready;
  function frame(now) {
    raf = 0;
    if (!shouldRun()) return;
    const dtRaw = last ? (now - last) / 1000 : 0;
    const dt = Math.min(0.1, dtRaw);
    last = now;
    time += dt * P.speed;
    draw();
    if (probe) probeStep(dtRaw);
    else if (o.adaptive && dt > 0 && shownAt >= 0) adapt(dt);
    if (!glFailed && !raf) raf = requestAnimationFrame(frame);      // (reveal() may have queued it already)
  }
  // lower the render scale only when the GPU really cannot keep up (a steady 30 Hz cadence is a refresh cap)
  const dts = [];
  function adapt(dt) {
    frameAcc += dt; frameN++; dts.push(dt);
    if (frameAcc >= 2) {
      fps = frameN / frameAcc;
      const sorted = dts.slice().sort((a, b) => a - b), med = sorted[sorted.length >> 1];
      const capped30 = med > 0.031 && med < 0.035 && sorted[Math.floor(sorted.length * 0.9)] < 0.037;
      frameAcc = 0; frameN = 0; dts.length = 0;
      if (fps < 45 && !capped30 && scale > 0.75) { if (++slowWindows >= 2) { scale = Math.max(0.75, scale - 0.125); slowWindows = 0; } }
      else slowWindows = 0;
      if (fps < o.minFps && !capped30 && scale <= 0.75) { if (++lowWindows >= 2) giveUp(new Error('too slow: ' + fps.toFixed(1) + ' fps')); }
      else lowWindows = 0;
    }
  }
  const kick = () => { if (!raf && shouldRun()) { last = 0; raf = requestAnimationFrame(frame); } };
  const halt = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    onScreen = es[es.length - 1].isIntersecting; onScreen ? kick() : halt();
  }, { threshold: 0 }) : null;
  io && io.observe(container);
  const onVis = () => (document.hidden ? halt() : kick());
  document.addEventListener('visibilitychange', onVis);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => {
    measure();
    if (cut) cut.need = true;
    if (gl && !glFailed && ready) ensureVariant().then(() => { if (!raf) draw(); }).catch(fail);
  }) : null;
  ro && ro.observe(canvas);
  const onSrc = () => { if (cut) cut.need = true; if (gl && !glFailed && ready) ensureVariant().then(() => { if (!raf) draw(); }).catch(fail); };
  img.addEventListener('load', onSrc);
  if (cut) cut.img.addEventListener('load', onSrc);

  function giveUp(err) {                          // fade back to the still and stop for good (the photo stays)
    glFailed = true; halt();
    canvas.style.opacity = '0';
    if (cut) { clearTimeout(cut.hideT); cut.img.style.visibility = ''; cut.canvas.style.opacity = '0'; }
    setTimeout(() => { canvas.style.display = 'none'; if (cut) cut.canvas.style.display = 'none'; }, 800);
    o.onError && o.onError(err);
  }
  function fail(err) {
    if (destroyed) return;
    giveUp(err);
    if (!ready) readyResolve(api);
  }
  const showStill = () => { if (cut) { clearTimeout(cut.hideT); cut.img.style.visibility = ''; cut.canvas.style.opacity = '0'; } canvas.style.opacity = '0'; };
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); halt(); showStill(); ready = false; revealed = false; probe = null; });
  canvas.addEventListener('webglcontextrestored', () => { cur = { key: null, v: null }; if (cut) cut.need = true; boot(); });

  const onReduce = () => {
    if (isReduced()) { halt(); showStill(); }
    else if (!gl && !glFailed) boot();
    else if (ready) { canvas.style.opacity = '1'; if (cut) { cut.need = true; draw(); cut.canvas.style.opacity = '1'; cut.img.style.visibility = 'hidden'; } kick(); }
  };
  mqReduce && (mqReduce.addEventListener ? mqReduce.addEventListener('change', onReduce) : mqReduce.addListener(onReduce));

  async function boot() {
    if (booting) return;
    if (isReduced() || destroyed) { readyResolve(api); return; }
    booting = true;
    try {
      mark('boot');
      measure();
      await initGL();
      mark('gl');
      await nextTask();
      await ensureVariant();
      mark('textures');
      await nextTask();
      if (destroyed) return;
      draw();
      kick();
    } catch (err) { fail(err); }
    finally { booting = false; }
  }

  const api = {
    canvas,
    cutCanvas: cut ? cut.canvas : null,
    ready: readyP,
    get time() { return time; },
    get fps() { return fps; },
    get renderScale() { return scale; },
    get probe() { return probe ? 'running' : 'done'; },
    get active() { return revealed && !glFailed && !isReduced(); },
    get mix() { return mixNow(); },
    setProgress(p) { progress = Math.max(0, Math.min(1, +p || 0)); if (!raf && ready) draw(); },
    play() { userPlaying = true; kick(); },
    pause() { userPlaying = false; halt(); },
    /** deterministic render at time t (s); tests and frame capture. `mix` pins the intro ramp (null = automatic) */
    setTime(t, mix) { time = +t || 0; if (mix !== undefined) P.mix = mix; if (ready) draw(); },
    set(params = {}) {
      const dbgChanged = 'debug' in params && (params.debug | 0) !== P.debug;
      Object.assign(P, params);
      if (dbgChanged && gl) ensureVariant().then(() => draw());
      if (!raf && ready) draw();
    },
    get params() { return { ...P }; },
    destroy() {
      destroyed = true; halt();
      io && io.disconnect(); ro && ro.disconnect();
      img.removeEventListener('load', onSrc);
      if (cut) { cut.img.removeEventListener('load', onSrc); clearTimeout(cut.hideT); cut.img.style.visibility = ''; cut.canvas.remove(); }
      document.removeEventListener('visibilitychange', onVis);
      mqReduce && (mqReduce.removeEventListener ? mqReduce.removeEventListener('change', onReduce) : mqReduce.removeListener(onReduce));
      if (gl) {
        [cur.photo, cur.mask, cur.flag, cur.protect, tex.n1, tex.n2, tex.blank].forEach((t) => t && gl.deleteTexture(t));
        buf && gl.deleteBuffer(buf); vao && gl.deleteVertexArray(vao); prog && gl.deleteProgram(prog);
        const lose = gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
      }
      canvas.remove(); gl = null;
    },
  };
  boot();
  return api;
}

export default createCinemagraph;
