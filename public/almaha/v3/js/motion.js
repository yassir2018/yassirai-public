// AL MAHA v3 — the motion layer (GSAP 3.14 + ScrollTrigger, and the 3D oryx module).
// Rules: Arabic moves by words, never letters; every directional move follows RTL (enter from the right,
// wipe right to left, forward arrows point left); one brand ease family; full static fallback for
// prefers-reduced-motion; nothing loops forever; scroll-linked effects animate transform / opacity only.
import { HERO_PLATE, PLATES, ORYX_MODULE, ORYX_SRC, ORYX_STATIC, ORYX_OCCLUDE, ORYX_FIT, ORYX_BUDGET_MS, MQ, CINEMAGRAPH, FLAG_FLUTTER, CINE, HERO_CONCEPT, HERO_CONCEPTS } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const DIR = root.dir === 'ltr' ? -1 : 1;   // +1 = RTL (enter from the right), -1 = LTR (enter from the left)
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DEV = /[?&]debug(&|=|$)/.test(location.search) && ['127.0.0.1', 'localhost'].includes(location.hostname);
const BUDGET = DEV ? 12000 : ORYX_BUDGET_MS;   // the capture harness renders WebGL in software (SwiftShader)
const LOCAL = ['127.0.0.1', 'localhost'].includes(location.hostname);     // test hooks (window.__cine) on a local server only
// the hero composition (config.js HERO_CONCEPT; index.html already wrote ?hero=a|b|c on <html data-hero>)
const HERO = HERO_CONCEPTS.includes(root.dataset.hero) ? root.dataset.hero : HERO_CONCEPT;
root.dataset.hero = HERO;

export function initMotion() {
  const reduce = matchMedia(MQ.reduce).matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  applyPlate();
  // the 3D oryx and the living photo only where they will feel instant: capable device, fast network, and WebGL2
  // (probed off the main thread: see probeWebGL2)
  const nav = navigator;
  const net = nav.connection;
  const capable = !reduce
    && (nav.deviceMemory || 8) >= 4 && (nav.hardwareConcurrency || 8) >= 4
    && !(net && (net.saveData || (net.effectiveType && net.effectiveType !== '4g')));
  const gl2 = capable ? probeWebGL2() : Promise.resolve(false);
  const oryx = initOryx({ reduce, gl2, gsap: reduce ? null : gsap });
  const cine = initCine({ gl2, after: oryx.ready });
  const cta = ctaHandoff();
  if (LOCAL) window.__hero = { oryx, cine, concept: HERO };               // test hook (local server only)

  if (!gsap || !ST || reduce) {
    root.classList.remove('intro-pending');
    oryx.showStatic();
    return;
  }
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });
  // the CSS smooth scroll (anchor links) must not animate ScrollTrigger's own measuring scrolls: with it, a refresh
  // while scrolled down (window resize, DevTools, browser zoom) measured every trigger from the wrong place, and the
  // hero copy stayed faded out at the top of the page. GSAP only does this itself for an element scroller; the read
  // flushes the style, without it Chrome scrolls with the stale (smooth) value
  ST.addEventListener('refreshInit', () => { root.style.scrollBehavior = 'auto'; void getComputedStyle(root).scrollBehavior; });
  ST.addEventListener('refresh', () => { root.style.scrollBehavior = ''; });
  splitWords();
  menu(gsap);

  // the hero intro waits for the photo to decode and the fonts; the scroll layer is built meanwhile (nothing moves yet).
  // The pinned chapter comes first, so every trigger created after it measures with its pin spacing.
  intro(oryx, cine);
  approach(gsap);
  heroScroll(gsap, ST, oryx, cine, cta);
  headings(gsap);
  reveals(gsap);
  pillars(gsap);
  about(gsap);
  services(gsap);
  sectors(gsap);
  seams(gsap);
  clients(gsap);
  works(gsap);
  vision(gsap);
  contact(gsap);
  document.fonts?.ready.then(() => ST.refresh());   // ScrollTrigger refreshes on "load" by itself
}

/* ================================================================ hero plate switch */
function applyPlate() {
  if (HERO_PLATE === 'painted' && root.dataset.plate !== 'painted') window.__platePainted?.($('#heroPlate'));
  if (!root.dataset.plate) root.dataset.plate = 'flag';
}

/* ================================================================ word split (Arabic-safe: whole words only)
   Headings keep their accessible name (aria-label + hidden word spans); once revealed, the original markup
   is restored so assistive tech never steps through inline-block fragments. */
function splitWords() {
  $$('[data-words]').forEach((el) => {
    el._html = el.innerHTML;
    if (/^H\d$/.test(el.tagName)) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (!n.nodeValue.trim() || n.parentElement.closest('.sr-only')) return;
      const frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.append(document.createTextNode(tok)); return; }
        const w = document.createElement('span');
        w.className = 'w';
        w.setAttribute('aria-hidden', 'true');
        const i = document.createElement('span');
        i.className = 'w__i';
        i.textContent = tok;
        w.append(i);
        frag.append(w);
      });
      n.replaceWith(frag);
    });
  });
}
const unclip = (el) => $$('.w', el).forEach((w) => { w.style.overflow = 'visible'; });
const restore = (el) => {
  if (el._html == null) return;
  el.innerHTML = el._html;
  el._html = null;
  el.removeAttribute('aria-label');
};
const settleTitle = (el) => (root.lang === 'ar' ? restore(el) : unclip(el));
const wordGroups = (el) => {
  const lines = $$(':scope > .line', el);
  return (lines.length ? lines : [el]).map((l) => $$('.w__i', l)).filter((g) => g.length);
};

/* ================================================================ WebGL2 probe + GPU warm-up
   The very first WebGL context of a browser session makes the GPU process set its WebGL device up, and the thread that
   asks for it waits ~0.3 s. The probe asks from a worker (OffscreenCanvas), so that wait never lands on the main thread;
   the oryx and the living photo create their own contexts afterwards, warm. Without OffscreenCanvas the probe runs on
   the main thread after the first paint. */
function probeWebGL2() {
  return new Promise((resolve) => {
    const onMain = () => { try { resolve(!!document.createElement('canvas').getContext('webgl2')); } catch (e) { resolve(false); } };
    if (!('OffscreenCanvas' in window) || !('Worker' in window)) { requestAnimationFrame(() => setTimeout(onMain, 0)); return; }
    let w = null;
    const end = (v) => { clearTimeout(t); try { w && w.terminate(); } catch (e) {} resolve(v); };
    const t = setTimeout(() => end('WebGL2RenderingContext' in window), 1500);     // slow worker: trust the API
    try {
      const src = 'let ok = false; try { const g = new OffscreenCanvas(1, 1).getContext("webgl2"); ok = !!g; if (g) { g.clear(g.COLOR_BUFFER_BIT); g.finish(); } } catch (e) {} postMessage(ok);';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      w = new Worker(url);
      URL.revokeObjectURL(url);
      w.onmessage = (e) => end(!!e.data);
      w.onerror = () => { clearTimeout(t); try { w.terminate(); } catch (e) {} onMain(); };
    } catch (e) { clearTimeout(t); onMain(); }
  });
}

/* ================================================================ the 3D oryx: three hero compositions (config.js HERO_CONCEPT)
   A, the signature: the symbol of a stacked lockup whose wordmark is the headline (the pocket beside line 1, above
   line 2), true colours, never taller than the flag cloth. B, the monument: very large and in the photo; the flag, its
   pole and the rocks stand in front of it (occlusion matte), its face looks at the headline. C, the overture: very large
   for one moment on the first visit of a session, then it flies into the header logo's symbol; nothing at rest. */
const PAD = (1 - ORYX_FIT.fit) / 2;                         // the symbol's margin inside its stage, each side

/** an image's alpha as a coarse occupancy grid (max-pooled: a thin stroke is never lost) */
function alphaGrid(src, gw, gh, pool = 3, thr = 40) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const W = gw * pool, H = gh * pool;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data;
        const a = new Uint8Array(gw * gh);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > thr) a[((y / pool) | 0) * gw + ((x / pool) | 0)] = 1;
        resolve({ a, gw, gh, src });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** the symbol's ink cells (fractions of its 545 x 770 box), classed: 1 = the face (jaw), 2 = the right half (horn, neck
    bulge, tail: never behind the flag), 0 = the left half (may pass behind the flag, the pole or the rocks) */
function inkCells(grid) {
  const u = [], v = [], cls = [];
  for (let j = 0; j < grid.gh; j++) for (let i = 0; i < grid.gw; i++) {
    if (!grid.a[j * grid.gw + i]) continue;
    const uu = (i + 0.5) / grid.gw, vv = (j + 0.5) / grid.gh;
    u.push(uu); v.push(vv);
    cls.push(uu >= 0.76 && vv >= 0.52 && vv <= 0.8 ? 1 : uu >= 0.45 ? 2 : 0);
  }
  const n = u.length, ord = [...Array(n).keys()];
  for (let i = n - 1, s = 7; i > 0; i--) { s = (s * 16807) % 2147483647; const k = s % (i + 1); [ord[i], ord[k]] = [ord[k], ord[i]]; }   // fixed shuffle: a collision shows up after a few cells
  return { n, u: Float32Array.from(ord, (k) => u[k]), v: Float32Array.from(ord, (k) => v[k]), cls: Uint8Array.from(ord, (k) => cls[k]), cu: 1 / grid.gw, cv: 1 / grid.gh };
}

/** obstacles rasterised in hero px (cells of `cell` px over [-W, 2W] x [-1.5H, 2.5H]) with a summed-area table */
function occupancy(W, H, cell = 6) {
  const x0 = -W, y0 = -1.5 * H, gw = Math.ceil((3 * W) / cell), gh = Math.ceil((4 * H) / cell);
  const g = new Uint8Array(gw * gh);
  const w1 = gw + 1;
  let sat = null;
  const ix = (x) => Math.floor((x - x0) / cell), iy = (y) => Math.floor((y - y0) / cell);
  return {
    rect(a, b, c, d) {
      const i0 = Math.max(0, ix(a)), i1 = Math.min(gw - 1, ix(c)), j0 = Math.max(0, iy(b)), j1 = Math.min(gh - 1, iy(d));
      if (i1 >= i0) for (let j = j0; j <= j1; j++) g.fill(1, j * gw + i0, j * gw + i1 + 1);
    },
    build() {
      sat = new Int32Array(w1 * (gh + 1));
      for (let j = 0; j < gh; j++) { let row = 0; for (let i = 0; i < gw; i++) { row += g[j * gw + i]; sat[(j + 1) * w1 + i + 1] = sat[j * w1 + i + 1] + row; } }
      return this;
    },
    any(a, b, c, d) {
      const i0 = Math.max(0, ix(a)), i1 = Math.min(gw - 1, ix(c)), j0 = Math.max(0, iy(b)), j1 = Math.min(gh - 1, iy(d));
      if (i1 < i0 || j1 < j0) return false;
      return sat[(j1 + 1) * w1 + i1 + 1] - sat[j0 * w1 + i1 + 1] - sat[(j1 + 1) * w1 + i0] + sat[j0 * w1 + i0] > 0;
    },
  };
}

// top of the hero's bottom brush edge at x (the fill path of .hero__edge, viewBox 1440 x 150, plus the stroke above it)
const EDGE_PTS = [[0, 139], [200, 118], [400, 100], [600, 85], [800, 74], [1000, 64], [1200, 50], [1440, 41]];
function edgeTop(x, W, H, E) {
  const sx = Math.min(1440, Math.max(0, (x / W) * 1440));
  let k = 1;
  while (k < EDGE_PTS.length - 1 && EDGE_PTS[k][0] < sx) k++;
  const [xa, ya] = EDGE_PTS[k - 1], [xb, yb] = EDGE_PTS[k];
  const ys = ya + ((yb - ya) * (sx - xa)) / (xb - xa);
  return H - E + (E * (ys - 22)) / 150;
}

function initOryx({ reduce, gl2, gsap }) {
  const stage = $('#oryxStage');
  const hero = $('#home');
  const fgImg = $('#heroFg');
  const media = $('.hero__media');
  const plateImg = $('#heroPlate');
  const inner = document.createElement('div');
  inner.className = 'oryx-stage__inner';
  stage.append(inner);

  Object.assign(stage.style, { width: '20px', height: '28px' });   // a provisional box until placed
  const portrait = matchMedia(MQ.portrait);
  const fine = matchMedia(MQ.fine);
  const F = ORYX_FIT;
  const S = { api: null, mode: null, started: false, dead: false, e: 0, lastW: innerWidth, ink: null, occ: null, key: '', geom: {} };
  let ov = null;                                            // C: the running overture
  const stub = { ready: Promise.resolve('none'), fgReady: Promise.resolve(), wantsOverture: false, armBudget() {}, start() {}, showStatic() {},
    setExit() {}, place() {}, overture: () => Promise.resolve(), skipOverture() {}, geom: () => ({ concept: HERO, box: { visible: false } }) };
  if (root.dataset.plate === 'painted') { stage.hidden = true; return stub; }

  // C: the overture plays once per session, from the top of the page, on a client that can run it; otherwise the hero
  // holds no symbol at all (the 3D module is not even loaded; the shared layout rules still run)
  let wantsOverture = false;
  if (HERO === 'c') {
    let seen = false;
    try { seen = sessionStorage.getItem(F.c.session) === '1'; } catch (e) { /* storage blocked: play it */ }
    wantsOverture = !reduce && !seen && (!location.hash || location.hash === '#home') && scrollY < 8;
  }
  const noSymbol = HERO === 'c' && !wantsOverture;
  if (noSymbol) stage.hidden = true;
  if (HERO === 'b') $('#oryxLayer')?.append(stage);       // the monument stands in the photo (see site.css)

  /* placement in hero coordinates; layout is measured without transforms (offset chains) */
  const offsetIn = (el) => { let x = 0, y = 0; for (let n = el; n && n !== hero; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
  // rects of the copy as laid out (intro / scroll transforms ignored), relative to the hero: x from the glyph runs,
  // y from the layout boxes, so the symbol meets the real staircase of the text, not the column's box
  const heroLeft = () => hero.getBoundingClientRect().left;
  const glyphRuns = (el) => {
    const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), r = document.createRange();
    while (w.nextNode()) {
      if (!w.currentNode.nodeValue.trim() || w.currentNode.parentElement.closest('.sr-only')) continue;
      r.selectNodeContents(w.currentNode);
      for (const q of r.getClientRects()) if (q.width > 0.5 && q.height > 0.5) out.push(q);
    }
    return out;
  };
  function copyRects() {
    const hl = heroLeft(), lines = [], runs = [];
    $$('#heroTitle .line').forEach((line) => {
      const g = glyphRuns(line);
      if (!g.length) return;
      const o = offsetIn(line);
      const r = { x0: Math.min(...g.map((q) => q.left)) - hl, x1: Math.max(...g.map((q) => q.right)) - hl, y0: o.y, y1: o.y + line.offsetHeight };
      lines.push(r); runs.push(r);
    });
    const sub = $('.hero__sub'), sb = sub.getBoundingClientRect(), so = offsetIn(sub);
    glyphRuns(sub).forEach((q) => runs.push({ x0: q.left - hl, x1: q.right - hl, y0: q.top - sb.top + so.y, y1: q.bottom - sb.top + so.y }));
    const btns = $$('.hero__actions > *').map((b) => { const o = offsetIn(b); return { x0: o.x, x1: o.x + b.offsetWidth, y0: o.y, y1: o.y + b.offsetHeight }; });
    return { l1: lines[0], l2: lines[1], lines, runs, btns, subY1: so.y + sub.offsetHeight };
  }
  /** header items (links, CTA, language, logo, menu button) as laid out at the top of the page */
  function headerRects() {
    const out = [];
    $$('#siteHeader .brand, #siteHeader .site-nav li > a, #siteHeader .lang, #siteHeader .menu-toggle').forEach((el) => {
      if (!el.getClientRects().length) return;                // display: none at this width
      const r = el.getBoundingClientRect();
      if (r.width > 1) out.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    });
    return out;
  }
  /** the plate as laid out (transforms ignored): its box inside the hero, its object-fit: cover mapping, the flag, the sun */
  function plateMap(isPortrait) {
    const [pw, ph] = isPortrait ? PLATES.flag.portraitSize : PLATES.flag.size;
    const BW = plateImg.offsetWidth, BH = plateImg.offsetHeight;
    const s = Math.max(BW / pw, BH / ph), dw = pw * s, dh = ph * s;
    const [px, py] = getComputedStyle(plateImg).objectPosition.split(' ').map((v) => parseFloat(v) / 100);   // the plate's CSS object-position
    const ox = plateImg.offsetLeft + (BW - dw) * px, oy = plateImg.offsetTop + (BH - dh) * py;
    const box = (b) => ({ x0: ox + b[0] * dw, y0: oy + b[1] * dh, x1: ox + b[2] * dw, y1: oy + b[3] * dh });
    const g = isPortrait ? PLATES.flag.portrait : PLATES.flag;
    const c = isPortrait ? CINE.variants.port.crop : [0, 0, 1, 1];                       // master -> plate fractions
    const sun = { x: ox + ((CINE.sun[0] - c[0]) / c[2]) * dw, y: oy + ((CINE.sun[1] - c[1]) / c[3]) * dh };
    return { ox, oy, dw, dh, flag: box(g.flag), pole: box(g.pole), floor: oy + g.skyFloor * dh, reach: g.reach * dw, sun };
  }
  const headerH = () => $('#siteHeader .site-header__bar')?.offsetHeight || 84;
  const edgeH = () => $('.hero__edge')?.getBoundingClientRect().height || 90;
  const occAt = (G, pm, x, y) => {
    const i = Math.floor(((x - pm.ox) / pm.dw) * G.gw), j = Math.floor(((y - pm.oy) / pm.dh) * G.gh);
    return i >= 0 && j >= 0 && i < G.gw && j < G.gh && G.a[j * G.gw + i] === 1;
  };

  /* shared rule: the sun (the photo's light, «إشراقاً») is never pinned under a button. Landscape: the copy block is
     lifted until sun.y - CTA.bottom >= max(36 px, 4.5 %H) (after the tighter sub-line rhythm in site.css). Portrait,
     concept A: the headline is pushed down until the pocket above it holds the signature (phones 11 %H, tablets 13 %H),
     never closer to the flag than 6 %H. */
  function layoutCopy(isPortrait, W, H, pm) {
    const box = $('.hero__inner');
    const cur = (k) => parseFloat(box.style.getPropertyValue(k)) || 0;
    const set = (k, v) => { const s = `${Math.round(v)}px`; if (box.style.getPropertyValue(k) !== s) box.style.setProperty(k, s); };
    if (!isPortrait) {
      set('--hero-push', 0);
      // the offset the layout really has now: under reduced motion every property gets a .001ms transition, and
      // Firefox / Safari keep the previous `top` until the next frame (reading the custom property lifted the copy twice)
      const lift0 = -parseFloat(getComputedStyle(box).top) || 0;
      const ctaB = Math.max(...$$('.hero__actions > *').map((b) => offsetIn(b).y + b.offsetHeight)) + lift0;   // as if not lifted
      const sun = pm.sun, onScreen = sun.x >= 0 && sun.x <= W && sun.y > 0 && sun.y < H;
      let lift = onScreen ? Math.max(0, ctaB - (sun.y - Math.max(F.sunClear, F.sunClearH * H))) : 0;
      const h1Top = offsetIn($('#heroTitle')).y + lift0;
      lift = Math.min(lift, Math.max(0, h1Top - (headerH() + 0.03 * H)));                   // never under the header
      set('--hero-lift', lift);
      return;
    }
    set('--hero-lift', 0);
    if (S.place !== 'a') { set('--hero-push', 0); return; }
    const A = F.a, push0 = cur('--hero-push');
    const line2 = $$('#heroTitle .line')[1], sub = $('.hero__sub');
    if (!line2) return;
    const ink2 = offsetIn(line2).y - push0 + A.asc * line2.offsetHeight;
    const subB = offsetIn(sub).y + sub.offsetHeight - push0;
    const target = (W <= 600 ? A.portPhone : A.portTablet) * H;
    const want = headerH() + A.navAirPort * H + target + Math.max(A.ascAir, A.ascAirH * H) - ink2;
    const guard = pm.flag.y0 - A.portGuard * H - subB;
    set('--hero-push', Math.max(0, Math.min(want, guard)));
  }

  /* A: the signature. Box bottom on line 2's ascender air, its ink a type gap left of line 1's first glyph, never past
     the end of line 2, at most 26 %H and F.a.maxFlag x the cloth (the flag stays the dominant mark). Hang line: with the smaller
     flag (13/10, 0.70 x, its cloth top ~0.32 H) the cloth's top would leave no pocket on landscape screens, so the top
     follows the header air there (F.a.hangFlag = true restores the cloth-top rule). */
  function placeA(isPortrait, W, H, pm, cr) {
    const A = F.a, L1 = cr.l1, L2 = cr.l2;
    if (!L1 || !L2) return null;
    const fh = pm.flag.y1 - pm.flag.y0;
    const bottom = L2.y0 + A.asc * (L2.y1 - L2.y0) - Math.max(A.ascAir, A.ascAirH * H);
    const topMin = isPortrait ? headerH() + A.navAirPort * H : Math.max(A.hangFlag ? pm.flag.y0 : -Infinity, headerH() + A.navAir * H);
    const gap = isPortrait ? A.typeGapPort : Math.max(A.typeGap, A.typeGapW * W);
    let h = Math.min(A.maxH * H, bottom - topMin, A.maxFlag * fh);
    h = Math.min(h, (L1.x0 - gap - L2.x0) / (1 - PAD) / F.aspect);          // left edge never before line 2's end
    const w = h * F.aspect;
    const min = isPortrait ? Math.max(A.minPort, A.minPortH * H) : Math.max(A.minLand, A.minLandH * H);
    return { x: L1.x0 - gap + PAD * w - w, y: bottom - h, w, h, visible: h >= 0.8 * min };
  }

  /* B: the monument. The largest symbol (up to 1.1 H) whose ink clears every line of copy, the buttons and the header
     items, whose right half (horn, neck bulge, tail) and face keep real air from the flag cloth (its left half may pass
     behind the flag, the pole and the rocks: the occlusion matte), whose face is fully seen above the brush edge, and
     most of whose ink is seen. Among those, its face looks at the headline: jaw near the copy, level with the title. */
  function placeB(isPortrait, W, H, pm, cr) {
    const B = F.b, ink = S.ink, occ = S.occ;
    if (!ink || !occ) return null;
    const fl = pm.flag, fw = fl.x1 - fl.x0;
    const gc = Math.max(B.copyGap, B.copyGapW * W);
    const all = occupancy(W, H), prot = occupancy(W, H);
    [...cr.runs, ...cr.btns].forEach((r) => all.rect(r.x0 - gc, r.y0 - gc * 0.7, r.x1 + gc, r.y1 + gc * 0.7));
    headerRects().forEach((r) => all.rect(r.x0 - B.navAir, r.y0 - B.navAir, r.x1 + B.navAir, r.y1 + B.navAir));
    if (!isPortrait) all.rect(-W, -1.5 * H, 2 * W, fl.y0);       // landscape: nothing of the brand above the national flag
    const fa = Math.max(B.flagAirMin, B.flagAir * fw) + pm.reach;
    prot.rect(fl.x0 - fa, fl.y0 - fa, fl.x1 + fa, fl.y1 + fa);
    all.build(); prot.build();
    const E = edgeH();
    const copyL = Math.min(...cr.runs.map((r) => r.x0), ...cr.btns.map((r) => r.x0));
    const midY = cr.l1 && cr.l2 ? (cr.l1.y0 + cr.l2.y1) / 2 : 0.45 * H;
    const sky = B.skyFace ? pm.floor : H;           // optionally: the face only on clean sky, above the far mountains' tops
    const eCol = new Float32Array(W + 1);
    for (let x = 0; x <= W; x++) eCol[x] = edgeTop(x, W, H, E);
    const eAt = (x) => eCol[x < 0 ? 0 : x > W ? W : x | 0];
    const margin = Math.max(18, 0.05 * Math.min(W, H)), top = headerH() + margin;   // the face never touches the frame
    const jawK = [], restK = [];
    for (let k = 0; k < ink.n; k++) (ink.cls[k] === 1 ? jawK : restK).push(k);
    const test = (sx, sy, sw, sh) => {
      // 1. the face: on screen, on clean sky, above the brush edge, nothing in front of it (cheap: tested first)
      let jx = -1e9, jy = 0;
      for (const k of jawK) {
        const cx = sx + ink.u[k] * sw, cy = sy + ink.v[k] * sh;
        if (cx < margin || cx > W - margin || cy < top || cy > sky || cy > eAt(cx) - B.edgeAir * H || occAt(occ, pm, cx, cy)) return null;
        if (cx > jx) jx = cx;
        jy += cy;
      }
      // 2. the ink clears the copy, the buttons, the header items and the flag cloth (+ air)
      const hx = ink.cu * sw * 0.5, hy = ink.cv * sh * 0.5;
      for (let k = 0; k < ink.n; k++) {
        const cx = sx + ink.u[k] * sw, cy = sy + ink.v[k] * sh;
        if (all.any(cx - hx, cy - hy, cx + hx, cy + hy) || prot.any(cx - hx, cy - hy, cx + hx, cy + hy)) return null;
      }
      // 3. most of the ink is seen (on screen, above the brush edge, not behind the pole or the rocks)
      let seen = jawK.length;
      for (const k of restK) {
        const cx = sx + ink.u[k] * sw, cy = sy + ink.v[k] * sh;
        if (cx >= 0 && cx <= W && cy >= 0 && cy <= eAt(cx) && !occAt(occ, pm, cx, cy)) seen++;
      }
      if (seen < B.minSeen * ink.n) return null;
      return { score: (copyL - gc - jx) / W + (0.5 * Math.abs(jy / jawK.length - midY)) / H, seen: seen / ink.n };
    };
    const scan = (sw, sh, xa, xb, ya, yb, step) => {
      let best = null;
      for (let sy = ya; sy <= yb; sy += step[1]) for (let sx = xa; sx <= xb; sx += step[0]) {
        const r = test(sx, sy, sw, sh);
        if (r && (!best || r.score < best.score)) best = { ...r, sx, sy };
      }
      return best;
    };
    const hMax = (isPortrait ? B.maxHPort : B.maxH) * H, hMin = (isPortrait ? B.minHPort : B.minH) * H;
    const step = [Math.max(6, 0.016 * W), Math.max(6, 0.018 * H)];   // coarse pass; refined below
    let found = null;
    for (let h = hMax; h >= hMin - 0.5; h -= 0.03 * H) {
      const sh = h * F.fit, sw = sh * F.aspect;
      const best = scan(sw, sh, -0.3 * sw, W - 0.55 * sw, -0.45 * sh, H - 0.5 * sh, step);
      if (!best) continue;
      found = { h, best };
      // a little larger may still fit (the coarse size step)
      for (let h2 = Math.min(hMax, h + 0.025 * H); h2 > h + 1; h2 -= 0.01 * H) {
        const sh2 = h2 * F.fit, sw2 = sh2 * F.aspect;
        const b2 = scan(sw2, sh2, best.sx - 2 * step[0], best.sx + 2 * step[0], best.sy - 2 * step[1], best.sy + 2 * step[1], [step[0] / 3, step[1] / 3]);
        if (b2) { found = { h: h2, best: b2 }; break; }
      }
      break;
    }
    if (!found) return null;
    const { h } = found, sh = h * F.fit, sw = sh * F.aspect;
    // refine the position (quarter steps) at the chosen size
    const b = scan(sw, sh, found.best.sx - step[0], found.best.sx + step[0], found.best.sy - step[1], found.best.sy + step[1], [step[0] / 6, step[1] / 6]) || found.best;
    const w = h * F.aspect;
    return { x: b.sx - PAD * w, y: b.sy - PAD * h, w, h, visible: true, seen: Math.round(b.seen * 100) / 100 };
  }

  /* B: the stage is masked by the occlusion matte (pole, rocks, the flag's flutter zone), mapped like the plate */
  function maskTo(b, pm, isPortrait) {
    const st = stage.style;
    const src = isPortrait ? ORYX_OCCLUDE.port : ORYX_OCCLUDE.land;
    const img = `linear-gradient(#000, #000), url("${src}")`;
    const size = `100% 100%, ${pm.dw}px ${pm.dh}px`;
    const pos = `0 0, ${pm.ox - b.x}px ${pm.oy - b.y}px`;
    st.webkitMaskImage = img; st.maskImage = img;
    st.webkitMaskSize = size; st.maskSize = size;
    st.webkitMaskPosition = pos; st.maskPosition = pos;
    st.webkitMaskRepeat = 'no-repeat'; st.maskRepeat = 'no-repeat';
    st.webkitMaskComposite = 'source-out'; st.maskComposite = 'subtract';
  }

  /* grids for B and C: the symbol's ink, and the occlusion matte of the current plate (reloaded when it changes) */
  const occSrc = (p) => (p ? ORYX_OCCLUDE.port : ORYX_OCCLUDE.land);
  let gridP = null, gridKey = '';
  function loadGrids() {
    const p = portrait.matches;
    if (gridP && gridKey === occSrc(p)) return gridP;
    gridKey = occSrc(p);
    return (gridP = Promise.all([
      S.ink ? S.ink : alphaGrid(ORYX_STATIC, 40, 56, 4).then((g) => (g ? inkCells(g) : null)),
      S.occ && S.occ.src === occSrc(p) ? S.occ : alphaGrid(occSrc(p), p ? 144 : 256, p ? 192 : 128, 2, 100),
    ]).then(([ink, occ]) => { S.ink = ink; S.occ = occ; }));
  }
  const gridsReady = HERO === 'a' || noSymbol ? Promise.resolve() : loadGrids();

  function place(force) {
    if (force === true) S.key = '';
    const isPortrait = portrait.matches;
    const W = hero.clientWidth, H = media.clientHeight;
    // B has no room for a monument on a portrait phone (the copy above, the flag and the buttons below): A's lockup there
    // B where its monument cannot stand (no room for the face: portrait phones) takes A's lockup, as the audit rules
    S.place = HERO === 'b' && ((isPortrait && W <= 600) || S.bNone === `${W}x${H}`) ? 'a' : HERO;
    const pm = plateMap(isPortrait);
    layoutCopy(isPortrait, W, H, pm);
    const cr = copyRects();
    const f0 = pm.flag, reach = pm.reach;
    S.flag = { x0: Math.round(f0.x0 - reach), y0: Math.round(f0.y0 - reach), x1: Math.round(f0.x1 + reach), y1: Math.round(f0.y1 + reach), w: Math.round(f0.x1 - f0.x0), h: Math.round(f0.y1 - f0.y0) };
    S.pole = { xc: Math.round((pm.pole.x0 + pm.pole.x1) / 2), y1: Math.round(pm.pole.y1) };     // the pole's foot (top of the cairn)
    S.geom = { concept: HERO, portrait: isPortrait, W, H, header: headerH(), cloth: { x0: f0.x0, y0: f0.y0, x1: f0.x1, y1: f0.y1 }, reach,
      sun: pm.sun, l1: cr.l1, l2: cr.l2, subY1: cr.subY1, lift: parseFloat($('.hero__inner').style.getPropertyValue('--hero-lift')) || 0,
      push: parseFloat($('.hero__inner').style.getPropertyValue('--hero-push')) || 0 };
    S.geom.place = S.place;
    if (HERO === 'c') { if (!ov) S.box = { visible: false }; return; }   // the overture computes its own geometry
    if (S.place === 'b' && (!S.occ || S.occ.src !== occSrc(isPortrait))) {
      loadGrids().then(() => { if (S.occ && S.occ.src === occSrc(portrait.matches)) place(); });
    }
    // B's search is the expensive part: skip it when nothing it depends on has moved
    const key = S.place === 'b' ? JSON.stringify([W, H, Math.round(pm.ox), Math.round(pm.dw), cr.runs.map((r) => [r.x0 | 0, r.y0 | 0]), cr.btns.map((r) => [r.x0 | 0, r.y0 | 0]), headerRects().map((r) => r.x0 | 0), !!S.occ, !!S.ink]) : '';
    let b;
    if (S.place === 'b' && key === S.key) b = S.lastB;
    else b = S.place === 'a' ? placeA(isPortrait, W, H, pm, cr) : placeB(isPortrait, W, H, pm, cr);
    if (S.place === 'b') { S.key = key; S.lastB = b; }
    if (S.place === 'b' && !b && S.ink && S.occ) { S.bNone = `${W}x${H}`; place(); return; }
    if (!b) { stage.style.visibility = 'hidden'; S.box = { visible: false }; return; }
    Object.assign(stage.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, visibility: b.visible ? '' : 'hidden' });
    if (HERO === 'b') maskTo(b, pm, isPortrait);
    S.box = { x0: Math.round(b.x), y0: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h), visible: b.visible, seen: b.seen };
  }

  /* C: the overture's box. The jaw at (60 %W, 56 %H) (portrait 62 / 52), 1.2 H tall (portrait 0.9 H, capped by the
     width); its ink keeps 24 px from the flag cloth (+ reach), the pole and the rocks and stays above the brush edge:
     if not, it moves toward the (still hidden) copy, then shrinks. */
  function overtureBox() {
    const isPortrait = portrait.matches, W = hero.clientWidth, H = media.clientHeight, C = F.c, ink = S.ink, occ = S.occ;
    if (!ink) return null;
    const pm = plateMap(isPortrait), fl = pm.flag, a = C.flagAir, r = pm.reach;
    const o = occupancy(W, H);
    o.rect(fl.x0 - r - a, fl.y0 - r - a, fl.x1 + r + a, fl.y1 + r + a);
    if (occ) {
      const cw = pm.dw / occ.gw, ch = pm.dh / occ.gh;
      for (let j = 0; j < occ.gh; j++) for (let i = 0; i < occ.gw; i++) if (occ.a[j * occ.gw + i]) {
        const x0 = pm.ox + i * cw, y0 = pm.oy + j * ch;
        if (x0 + cw + a < 0 || x0 - a > W || y0 - a > H) continue;
        o.rect(x0 - a, y0 - a, x0 + cw + a, y0 + ch + a);
      }
    }
    const E = edgeH();
    for (let x = 0; x < W; x += 16) o.rect(x, edgeTop(x + 8, W, H, E) - 10, x + 16, 3 * H);
    o.build();
    const hits = (sx, sy, sw, sh) => {
      const hx = ink.cu * sw * 0.5, hy = ink.cv * sh * 0.5;
      for (let k = 0; k < ink.n; k++) { const cx = sx + ink.u[k] * sw, cy = sy + ink.v[k] * sh; if (o.any(cx - hx, cy - hy, cx + hx, cy + hy)) return true; }
      return false;
    };
    // the largest size that clears them, with the jaw as close to its anchor as possible (toward the hidden copy, or
    // higher: the copy band is empty during the overture)
    const h0 = isPortrait ? Math.min(C.hPort * H, (1.05 * W) / F.aspect) : C.hLand * H;
    const [ax, ay] = isPortrait ? C.jawPort : C.jawLand;
    for (let h = h0; h >= 0.5 * H; h *= 0.97) {
      const w = h * F.aspect, sw = w * F.fit, sh = h * F.fit;
      let best = null;
      for (let dy = 0; dy <= (isPortrait ? 0.3 : 0.16) + 1e-6; dy += 0.02) for (let jx = ax; jx <= 0.78 + 1e-6; jx += 0.01) {
        const sx = jx * W - C.jaw[0] * sw, sy = (ay - dy) * H - C.jaw[1] * sh;
        const cost = (jx - ax) + dy;
        if ((!best || cost < best.cost) && !hits(sx, sy, sw, sh)) best = { cost, x: sx - PAD * w, y: sy - PAD * h };
      }
      if (best) return { x: best.x, y: best.y, w, h, visible: true };
    }
    return null;
  }

  function headerSymbolBox() {
    const r = $('#siteHeader .brand').getBoundingClientRect();
    const ar = matchMedia('(max-width: 760px)').matches;            // logo-header-ar.svg (phones) / logo-header.svg
    const k = r.width / (ar ? 3315 : 2945);
    return { x: r.left + (ar ? 2779.1 : 2410) * k, y: r.top - 9.5 * k, w: 545 * k, h: 770 * k };
  }

  function makeStatic() {
    if (S.mode === 'static') return;
    S.mode = 'static';
    S.api?.destroy();
    S.api = null;
    inner.replaceChildren();
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.src = ORYX_STATIC;
    inner.append(img);
    stage.classList.add('is-static');
  }

  // the 3D path is fetched at once (off the critical path: the plate is preloaded at high priority),
  // and must be ready inside the budget, or the flat logo plays the whole hero (never a hot swap in view)
  let budgetTimer = 0;
  const ready = noSymbol ? Promise.resolve('none') : new Promise((resolve) => {
    let done = false;
    const finish = (mode) => { if (done) return; done = true; clearTimeout(budgetTimer); if (mode === 'static') makeStatic(); resolve(mode); };
    S.kill = () => { if (done) return; S.dead = true; S.pending?.destroy(); finish('static'); };
    budgetTimer = setTimeout(S.kill, BUDGET + 2500);   // hard cap if the intro never arms the budget
    gl2.then((ok) => (ok ? Promise.all([import(ORYX_MODULE), gridsReady]) : null)).then((r) => {
      const mod = r && r[0];
      if (!mod) { finish('static'); return; }
      if (S.dead) return;
      // the module sizes its textures to its stage: give the stage its real box first
      if (HERO === 'c') { S.ovBox = overtureBox(); if (S.ovBox) setBox(S.ovBox); } else place();
      // A leans at most 4 deg with the mouse (tiltFeed); the monument and the overture stand still
      const api = mod.createOryx3D(inner, { src: ORYX_SRC, intro: false, fit: F.fit, sheen: false, pointer: false, hold: HERO === 'c' ? 0 : 1.2 });
      S.pending = api;
      return api.ready.then(() => {
        if (S.dead) { api.destroy(); return; }
        if (!inner.querySelector('canvas')) { api.destroy(); finish('static'); return; }   // module fell back (no WebGL)
        S.api = api;
        S.mode = '3d';
        if (DEV) window.__oryx = api;                       // capture-harness hook, local only
        finish('3d');
      });
    }).catch(() => finish('static'));
  }).then((mode) => gridsReady.then(() => { place(); return mode; }));
  function setBox(b) { Object.assign(stage.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` }); }

  function armBudget() {
    clearTimeout(budgetTimer);
    budgetTimer = setTimeout(() => S.kill?.(), BUDGET);
  }

  /* A: the module's own pointer tilt reaches 7 deg (16 while hovering); the signature leans at most 4 / 2 deg. Its soft
     curve (7 tanh(1.4 nx), 3.5 tanh(1.4 ny)) is inverted for the wanted angle, and the fed point is kept outside its
     hover zone; the glint plays when the real pointer enters the symbol (at most every 15 s). */
  function tiltFeed() {
    if (!fine.matches || portrait.matches || !S.api) return;
    let inside = false, lastGlint = -1e9;
    addEventListener('pointermove', (e) => {
      if (!S.api || (e.pointerType && e.pointerType !== 'mouse')) return;
      const r = stage.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const yaw = 4 * Math.tanh((1.4 * dx) / (vw / 2)), pit = 2 * Math.tanh((1.4 * dy) / (vh / 2));
      let fx = (Math.atanh(yaw / 7) / 1.4) * (vw / 2), fy = (Math.atanh(pit / 3.5) / 1.4) * (vh / 2);
      const hw = (r.width * F.fit) / 2 * 1.1 + 2, hh = (r.height * F.fit) / 2 * 1.05 + 2;
      if (Math.abs(fx) <= hw && Math.abs(fy) <= hh) fy = (fy < 0 ? -1 : 1) * hh;
      S.api.setPointer(fx / (r.width / 2), fy / (r.height / 2));
      const now = performance.now(), inZone = Math.abs(dx) <= hw && Math.abs(dy) <= hh;
      if (inZone && !inside && now - lastGlint > 15000) { lastGlint = now; S.api.glint(); }
      inside = inZone;
    }, { passive: true });
  }

  function start() {
    if (S.started || noSymbol) return;
    S.started = true;
    if (S.api) {
      S.api.play();
      requestAnimationFrame(() => { inner.style.transition = 'opacity .3s ease-out'; inner.style.opacity = '1'; });
      if (HERO === 'a') tiltFeed();
    } else if (gsap) {
      gsap.fromTo(inner, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out' });   // no zoom, drift <= 8 px
    } else inner.style.opacity = '1';
  }

  function showStatic() {
    if (noSymbol) return;
    makeStatic();
    S.started = true;
    inner.style.opacity = '1';
  }

  /** hero scroll 0..1 (0 .. exitAt of the hero): the symbol turns away while it leaves with the copy */
  function setExit(e) {
    S.e = clamp01(e);
    if (S.api) S.api.setProgress(0.46 * S.e);              // module: the red symbol fades out by p 0.46
    else if (S.mode === 'static' && S.started) inner.style.opacity = String(1 - S.e);
  }

  /* C: the overture. The oryx draws itself very large (the module's own intro), holds, then contracts along a rising arc
     into the exact box of the header logo's symbol and hands over to it; the header appears as it flies, the words
     rise 0.2 s before it lands. Skipped by a scroll, a key, a tap or a click; plays once per session. */
  function overture({ header, words }) {
    return new Promise((resolve) => {
      const C = F.c;
      const box = gsap && S.api ? overtureBox() || S.ovBox : null;
      if (!box) { header(); words(); finishOverture(); resolve(false); return; }
      try { sessionStorage.setItem(C.session, '1'); } catch (e) { /* the overture may then play again */ }
      setBox(box);
      stage.style.visibility = '';
      S.box = { x0: Math.round(box.x), y0: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h), visible: true, overture: true };
      stage.classList.add('is-overture');
      root.classList.add('c-overture');
      S.api.play();
      inner.style.opacity = '1';
      const tgt = headerSymbolBox();
      const s = tgt.h / F.fit / box.h;                     // the stage shows the symbol at `fit` of its height
      const tx = tgt.x + tgt.w / 2 - (box.x + box.w / 2), ty = tgt.y + tgt.h / 2 - (box.y + box.h / 2);
      gsap.set(stage, { transformOrigin: '50% 50%', x: 0, y: 0, scale: 1 });
      // one gesture: the centre travels a rising arc (quadratic curve whose control point sits level with the logo, a
      // quarter of the way across: it lifts first, then crosses), the size contracts geometrically (log scale)
      const cx = 0.25 * tx, cy = ty, ls = Math.log(s), m = { p: 0 };
      const step = () => {
        const p = m.p, b = 2 * (1 - p) * p, c = p * p;
        gsap.set(stage, { x: b * cx + c * tx, y: b * cy + c * ty, scale: Math.exp(ls * p) });
      };
      const tl = gsap.timeline({ delay: C.hold })
        .call(header, null, 0)
        .to(m, { p: 1, duration: C.fly, ease: 'power3.inOut', onUpdate: step }, 0)
        .call(words, null, Math.max(0, C.fly - C.wordsLead - 0.18))   // the copy's own first delay is 0.18 s
        .call(() => land(C.fade), null, C.fly);
      // a real scroll only (ScrollTrigger's refresh may emit 'scroll' events without moving the page)
      const skip = (e) => { if (!ov || ov.landing || (e && e.type === 'scroll' && scrollY < 8)) return; tl.kill(); header(); words(); land(0.25); };
      const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'];
      evs.forEach((t) => addEventListener(t, skip, { passive: true }));
      ov = { tl, skip, evs, resolve, landing: false };
    });
  }
  function land(dur) {
    if (!ov) return;
    ov.landing = true;
    root.classList.remove('c-overture');                    // the header logo's own symbol takes over
    gsap.to(stage, { opacity: 0, duration: dur, ease: 'none', onComplete: finishOverture });
  }
  function finishOverture() {
    root.classList.remove('c-overture');
    stage.classList.remove('is-overture');
    gsap?.set(stage, { clearProps: 'transform,opacity' });
    S.api?.destroy(); S.api = null; inner.replaceChildren();       // nothing of the symbol stays in the hero
    Object.assign(stage.style, { width: '20px', height: '28px', left: '0px', top: '0px' });
    S.box = { visible: false };
    if (ov) { ov.evs.forEach((t) => removeEventListener(t, ov.skip)); const r = ov.resolve; ov = null; r(true); }
  }
  function skipOverture() { if (ov) ov.skip(); else finishOverture(); }

  addEventListener('resize', () => {
    // touch devices: ignore height-only resizes (URL bar), like ScrollTrigger does
    if (!fine.matches && innerWidth === S.lastW) return;
    S.lastW = innerWidth;
    clearTimeout(S.rt);
    S.rt = setTimeout(place, 120);
  });
  portrait.addEventListener('change', place);
  place();
  document.fonts?.ready.then(place);

  return {
    ready,
    armBudget,
    wantsOverture,
    fgReady: Promise.race([fgImg?.decode?.().catch(() => {}) ?? Promise.resolve(), wait(2500)]),
    start,
    showStatic,
    setExit,
    place,
    overture,
    skipOverture,
    get mode() { return S.mode; },
    get box() { return S.box; },
    get flag() { return S.flag; },
    get pole() { return S.pole; },
    geom: () => ({ ...S.geom, box: S.box, mode: S.mode }),
  };
}

/* ================================================================ header CTA hand-off: one solid red call to action per screen
   While the hero's own CTA is on screen (and the copy has not faded on scroll), the header's is an outline. */
function ctaHandoff() {
  const header = $('#siteHeader'), act = $('.hero__actions');
  if (!header || !act) return { faded() {} };
  let inView = true, gone = false;
  const set = () => header.classList.toggle('cta-ghost', inView && !gone);
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { inView = e.isIntersecting; set(); }).observe(act);
  set();
  return { faded(v) { if (v !== gone) { gone = v; set(); } } };
}

/* ================================================================ hero intro
   Everything here runs on the compositor (Web Animations on transform / opacity / filter), so the 3D set-up
   and the scroll-layer build that happen meanwhile on the main thread can never make the hero stutter or jump.
   Beat 1: the photo and the light. Beat 2 and 3 depend on the concept:
   A: the headline by words, then the sub-line and the buttons; 0.35 s after line 2 starts, the oryx signs the sentence.
   B: the oryx paints itself in the photo first, the words rise ~1 s later.
   C: the overture (first visit of a session): the oryx, then the header as it flies, the words as it lands. */
const EXPO = 'cubic-bezier(.16, 1, .3, 1)';
const POWER3 = 'cubic-bezier(.215, .61, .355, 1)';
const play = (el, frames, opts) => {
  const a = el.animate(frames, { fill: 'both', easing: EXPO, ...opts });
  a.finished.then(() => a.cancel(), () => {});             // the end state equals the element's own style
  return a;
};

async function intro(oryx, cine) {
  const plate = $('#heroPlate');
  const layers = $$('.hero__layer');
  const wipe = $('.hero__wipe');
  const light = $('.hero__light');
  const header = $('#siteHeader');
  const h1 = $('#heroTitle');
  const q = (k) => $(`.hero [data-intro="${k}"]`);
  await Promise.race([Promise.all([plate.decode().catch(() => {}), document.fonts?.ready]), wait(1200)]);

  if (!root.classList.contains('intro-pending')) {          // the safety timer already released the hero
    settleTitle(h1);
    if (HERO === 'c') oryx.skipOverture();
    else oryx.ready.then(() => oryx.fgReady).then(() => oryx.start());
    cine.start();
    return;
  }

  // beat 1: the photo was painted on the first frame (scaled, dimmed, half covered); it now settles. The layers carry
  // the photo, the living-photo canvas, the cut-out (and B's oryx) together, so they can never drift apart.
  layers.forEach((el) => play(el,
    [{ transform: 'scale(1.06)', filter: 'brightness(.86) saturate(.9)' }, { transform: 'scale(1)', filter: 'brightness(1) saturate(1)' }],
    { duration: 2600, easing: 'cubic-bezier(.22, 1, .36, 1)' }));
  play(wipe, [{ transform: 'translateX(-34%)' }, { transform: 'translateX(-78%)' }], { duration: 1250, easing: 'cubic-bezier(.33, 1, .68, 1)' });
  play(light, [{ opacity: 0, transform: 'translateX(18%)' }, { opacity: 0.8, transform: 'translateX(-2%)', offset: 0.45 }, { opacity: 0, transform: 'translateX(-24%)' }],
    { duration: 1500, delay: 120, easing: 'ease-in-out' });
  // the light ends at its resting opacity 0 and stays in the tree: removing it (display: none) made Chrome report a
  // phantom layout shift of the whole hero (CLS 0.19 phones / 0.39 desktop) although nothing moves

  // beat 2: every "from" state is set now (backwards fill); B and C hold the copy (paused) until the symbol has had its
  // moment. Words rise inside their masks (whole words: Arabic shaping is never split), red line 140 ms later.
  const [l1 = [], l2 = []] = wordGroups(h1);
  const T = 0.18;                                            // s after release
  const head = [], copy = [], words = [];
  [[l1, T], [l2, T + 0.14]].forEach(([g, at]) => g.forEach((w, i) => words.push(play(w,
    [{ transform: 'translateY(160%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1200, delay: (at + i * 0.08) * 1000 }))));
  copy.push(...words);
  // controls stay hidden (not just transparent, so not clickable) until their own entrance begins
  const appear = (el, delay) => play(el, [{ visibility: 'hidden' }, { visibility: 'visible' }], { duration: 1, delay });
  head.push(play(header, [{ opacity: 0 }, { opacity: 1 }], { duration: 1000, delay: T * 1000 }), appear(header, T * 1000));
  copy.push(play(q('sub'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: (T + 0.3) * 1000, easing: POWER3 }));
  [...q('actions').children].forEach((b, i) => {
    const at = (T + 0.5 + i * 0.1) * 1000;
    copy.push(play(b, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: at, easing: POWER3 }), appear(b, at));
  });
  // the header never waits (the page must never look stuck); C holds only the copy, briefly, for the overture
  const holdHead = HERO === 'c' && oryx.wantsOverture, holdCopy = HERO === 'b' || holdHead;
  if (holdCopy) copy.forEach((a) => a.pause());
  root.classList.remove('intro-pending');                    // the backwards fill above already holds every "from" state
  // once the words are up, the Arabic headline gets its plain markup back (like every other heading): Safari lays the
  // word masks of a wrapped Arabic line out on staggered baselines (en.html, frozen, keeps its unclipped masks)
  Promise.all(words.map((a) => a.finished)).then(() => settleTitle(h1), () => settleTitle(h1));
  const once = (list) => { let done = false; return () => { if (done) return; done = true; list.forEach((a) => a.play()); }; };
  const playHead = once(head), playCopy = once(copy);

  // beat 3: the 3D path has a fixed budget from here (otherwise the flat logo plays the hero, never a hot swap)
  oryx.armBudget?.();
  if (HERO === 'a') {
    // the signature: 0.35 s after line 2's first word (or as soon as the 3D is ready after that)
    Promise.all([oryx.ready, oryx.fgReady, wait((T + 0.14 + ORYX_FIT.a.delay) * 1000)]).then(() => oryx.start());
  } else if (HERO === 'b') {
    const safety = setTimeout(playCopy, 4200);                // the copy is never held hostage by the 3D path
    Promise.all([oryx.ready, oryx.fgReady]).then(() => {
      oryx.start();
      setTimeout(() => { clearTimeout(safety); playCopy(); }, ORYX_FIT.b.wordsAfter * 1000);
    });
  } else if (!holdHead) {
    // C on a repeat visit (or where it cannot play): no symbol, the words at once
  } else {
    let skipped = false;
    const release = () => { playHead(); playCopy(); };
    // the overture only plays if the 3D is ready fast; otherwise the copy comes in at once and the overture is skipped
    const safety = setTimeout(() => { skipped = true; release(); oryx.skipOverture(); }, 1600);
    Promise.all([oryx.ready, oryx.fgReady]).then(([mode]) => {
      if (skipped) return;
      if (mode !== '3d') { clearTimeout(safety); release(); oryx.skipOverture(); return; }
      clearTimeout(safety);
      oryx.overture({ header: () => {}, words: playCopy }).then(() => release(), () => release());
    });
  }
  // the living photo is set up off the critical path (after the LCP), takes over while still and eases its motion in
  cine.start();
}

/* ================================================================ the living photo (cinemagraph): sea, mist, clouds, flag */
function initCine({ gl2, after }) {
  const S = { api: null, p: 0, started: false };
  const stub = { start() {}, setProgress() {}, get api() { return null; } };
  if (!CINEMAGRAPH || root.dataset.plate !== 'flag' || (LOCAL && /[?&]nocine\b/.test(location.search))) return stub;
  const layer = $('#heroPhoto');
  const img = $('#heroPlate');
  function start() {
    if (S.started) return;
    S.started = true;
    const go = () => gl2.then((ok) => (ok ? import(CINE.module) : null)).then((mod) => {
      if (!mod || root.dataset.plate !== 'flag') return;         // no WebGL2 / low-end, or the photo fell back to the painted plate
      S.api = mod.createCinemagraph(layer, {
        image: img, className: 'hero__cine', portraitQuery: MQ.portrait,
        cutout: { image: $('#heroFg'), container: $('#heroFg').closest('.hero__layer') },
        variants: CINE.variants, aspect: CINE.aspect, masterH: CINE.masterH, sun: CINE.sun, horizon: CINE.horizon,
        wind: CINE.wind, dprMax: CINE.dprMax, flagGeo: FLAG_FLUTTER ? CINE.flagGeo : null, flagAmp: CINE.flagAmp, fogTune: CINE.fogTune, intro: CINE.intro,
        onError: (e) => { if (LOCAL) console.info('cinemagraph: still photo kept,', e.message); },
      });
      S.api.setProgress(S.p);
      if (LOCAL) window.__cine = S.api;                           // test hook (local server only)
    }).catch(() => {});
    // after the photo is painted, the words are moving and the 3D oryx has finished its own GPU set-up (two contexts
    // compiling and uploading at the same time make each other's synchronous GL calls wait: long tasks): one short task
    // per step from here
    Promise.race([after, wait(2600)]).then(() => setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 600 }) : go()), CINE.startDelay));
  }
  return {
    start,
    setProgress(p) { S.p = p; S.api?.setProgress(p); },
    get api() { return S.api; },
  };
}

/* ================================================================ hero on scroll: push-in, parallax layers; the symbol leaves WITH the copy
   (same 0..exitAt of the hero): A is part of the type layer and rises with it; B is in the photo (it pushes in with
   the photo) and fades with the copy; C holds no symbol at rest. */
function heroScroll(gsap, ST, oryx, cine, cta) {
  const hero = $('#home');
  const X = ORYX_FIT.exitAt;
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6,
    onUpdate: (self) => { cine.setProgress(self.progress); cta.faded(self.progress >= X * 0.9); } } })
    .to('.hero__frame', { scale: 1.13, yPercent: 9, duration: 1 }, 0)
    .to('.hero__inner', { y: -120, duration: 1 }, 0)
    .to('.hero__inner', { opacity: 0, duration: X }, 0)          // gone before it can slide under the header
    .to('.hero__air', { opacity: 0.35, duration: 0.6 }, 0);
  if (HERO === 'a') tl.to('#oryxStage', { y: -120, duration: 1 }, 0).to('#oryxStage', { opacity: 0, duration: X }, 0);
  if (HERO === 'b') tl.to('#oryxStage', { opacity: 0, duration: X }, 0);
  ST.create({
    trigger: hero, start: 'top top', end: () => `+=${Math.max(1, Math.round(hero.offsetHeight * X))}`,
    onUpdate: (self) => oryx.setExit(self.progress),
    onRefresh: (self) => { oryx.place(); oryx.setExit(self.progress); },
  });
}

/* ================================================================ headings: word-mask rise, the accent line 140 ms later */
function headings(gsap) {
  $$('[data-words]').forEach((el) => {
    if (el.id === 'heroTitle') return;
    const groups = wordGroups(el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 87%', once: true }, onComplete: () => restore(el) });
    groups.forEach((g, i) => tl.from(g, { yPercent: 160, opacity: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, i * 0.14));
  });
}

/* ================================================================ body copy and blocks */
function reveals(gsap) {
  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, y: 22, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ================================================================ pillars: hairlines grow, the brush ticks paint right to left */
function pillars(gsap) {
  const tl = gsap.timeline({ scrollTrigger: { trigger: '.pillars__list', start: 'top 90%', once: true } });
  $$('.pillar').forEach((p, i) => {
    const at = i * 0.12;
    tl.fromTo(p, { '--draw': 0 }, { '--draw': 1, duration: 1.2, ease: 'power3.inOut' }, at)
      .fromTo($('.pillar__ico', p), { clipPath: DIR > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power2.out', clearProps: 'clipPath' }, at + 0.1)
      .from($$('.pillar__title, .pillar__text', p), { opacity: 0, x: 18 * DIR, duration: 1.1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity' }, at + 0.2);
  });
}

/* ================================================================ about: the facts ledger draws from the right */
function about(gsap) {
  const facts = $$('.fact');
  gsap.timeline({ scrollTrigger: { trigger: '.facts', start: 'top 88%', once: true } })
    .fromTo(facts, { '--draw': 0 }, { '--draw': 1, duration: 1.3, stagger: 0.12, ease: 'power3.inOut' }, 0)
    .from(facts.map((f) => f.children), { opacity: 0, y: 14, duration: 1, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.25);
}

/* ================================================================ services: rows arrive from the right */
function services(gsap) {
  gsap.from($$('.svc'), {
    opacity: 0, x: 44 * DIR, duration: 1.15, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '.svc-index', start: 'top 86%', once: true },
  });
}

/* ================================================================ sectors: a typographic stack that rises line by line */
function sectors(gsap) {
  const items = $$('.sector');
  gsap.timeline({ scrollTrigger: { trigger: '.sectors__list', start: 'top 84%', once: true } })
    .from(items.map((i) => $('.sector__ar', i)), { yPercent: 55, opacity: 0, duration: 1.25, stagger: 0.12, ease: 'expo.out', clearProps: 'transform,opacity' }, 0)
    .from(items.map((i) => $('.sector__en', i) || $('.sector__ico', i)), { opacity: 0, duration: 1, stagger: 0.12, ease: 'power2.out' }, 0.3)   // en.html: no Latin echo, the icon fades instead
    .fromTo(items.slice(1), { '--sep': 0 }, { '--sep': 1, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 0.05);
}

/* ================================================================ compositor wipe: the outer box slides in from the right while its content
   counter-slides, so the content stays put and only the dry-brush front travels (transform only) */
function wipe(gsap, outer, inner, vars) {
  return gsap.timeline(vars)
    .fromTo(outer, { x: () => outer.offsetWidth }, { x: 0, ease: vars.ease || 'none', duration: vars.dur || 1 }, 0)
    .fromTo(inner, { x: () => -outer.offsetWidth }, { x: 0, ease: vars.ease || 'none', duration: vars.dur || 1 }, 0);
}

/* ================================================================ chapter seams: the logo's ribbon paints across the boundary, scrubbed */
function seams(gsap) {
  $$('.seam').forEach((seam) => {
    if (!$('.seam__wipe', seam)) return;                   // the footer seam has no ribbon: the shape only
    wipe(gsap, $('.seam__wipe', seam), $('.seam__wipe-in', seam), {
      scrollTrigger: { trigger: seam, start: 'top 108%', end: 'top 38%', scrub: 0.8, invalidateOnRefresh: true },
    });
  });
}

/* ================================================================ approach: the steps are tabs (ui.js initApproachTabs); they rise in */
function approach(gsap) {
  const sec = $('#approach');
  gsap.from($$('.step__title', sec), { opacity: 0, y: 18, duration: 1, stagger: 0.08, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.steps', start: 'top 85%', once: true } });
}

/* ================================================================ clients: the register frame draws, logos settle */
function clients(gsap) {
  const list = $('.clients__list');
  const items = $$('.client', list);
  gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 86%', once: true } })
    .fromTo(list, { '--draw': 0 }, { '--draw': 1, duration: 1.5, ease: 'power3.inOut' }, 0)
    .fromTo(items, { '--draw': 0 }, { '--draw': 1, duration: 1.1, stagger: 0.14, ease: 'power3.inOut' }, 0.3)
    .from(items.map((c) => $('.client__logo', c)), { opacity: 0, scale: 0.94, duration: 1.3, stagger: 0.14, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.35)
    .from(items.map((c) => $('.client__name', c)), { opacity: 0, y: 12, duration: 1, stagger: 0.14, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.5);
}

/* ================================================================ works: the cards rise in turn (v2's stagger), the covers settle */
function works(gsap) {
  const cards = $$('.work');
  if (!cards.length) return;
  gsap.timeline({ scrollTrigger: { trigger: '.works__list', start: 'top 86%', once: true } })
    .from(cards, { opacity: 0, y: 28, duration: 1.1, stagger: 0.11, ease: 'expo.out', clearProps: 'transform,opacity' }, 0)
    .from(cards.map((c) => $('.work__plate, .work__mark', c)), { y: 22, duration: 1.4, stagger: 0.11, ease: 'expo.out', clearProps: 'transform' }, 0.1);
}

/* ================================================================ vision: the band opens like a screen (scale + counter-scale), the sky drifts */
function vision(gsap) {
  const band = $('.vision__band');
  const clip = $('.vision__clip');
  const counter = $('.vision__counter');
  const from = { x: 0.88, y: 0.84 };
  const proxy = { p: 0 };
  const apply = () => {
    const sx = from.x + (1 - from.x) * proxy.p, sy = from.y + (1 - from.y) * proxy.p;
    gsap.set(clip, { scaleX: sx, scaleY: sy });
    gsap.set(counter, { scaleX: 1 / sx, scaleY: 1 / sy });
  };
  apply();
  gsap.to(proxy, { p: 1, ease: 'none', onUpdate: apply, scrollTrigger: { trigger: band, start: 'top 96%', end: 'top 20%', scrub: 0.7 } });
  gsap.fromTo('.vision__img', { yPercent: -4, scale: 1.04 }, { yPercent: 4, scale: 1, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true } });
  const values = $$('.value');
  gsap.timeline({ scrollTrigger: { trigger: '.values', start: 'top 88%', once: true } })
    .fromTo(values, { '--draw': 0 }, { '--draw': 1, duration: 1.2, stagger: 0.1, ease: 'power3.inOut' }, 0)
    .from(values.map((v) => v.children), { opacity: 0, y: 12, duration: 1, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }, 0.2);
}

/* ================================================================ closing band: one ribbon paints in once, then drifts; form fields arrive */
function contact(gsap) {
  if ($('.contact__wipe')) {
    wipe(gsap, $('.contact__wipe'), $('.contact__wipe-in'), { dur: 2.2, ease: 'power2.inOut', scrollTrigger: { trigger: '.contact__cta', start: 'top 78%', once: true } });
    gsap.fromTo('.contact__drift', { y: 26 }, { y: -26, ease: 'none', scrollTrigger: { trigger: '.contact__cta', start: 'top bottom', end: 'bottom top', scrub: 1 } });
  }
  gsap.from($$('#contact-form .field, #contact-form .form__consent, #contact-form .form__actions'), {
    opacity: 0, y: 16, duration: 1, stagger: 0.06, ease: 'power3.out', clearProps: 'transform,opacity',
    scrollTrigger: { trigger: '#contact-form', start: 'top 82%', once: true },
  });
}

/* ================================================================ mobile menu: curtain + links from the right */
function menu(gsap) {
  const el = $('#menu');
  el.addEventListener('menu:open', () => {
    gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'expo.out', clearProps: 'clipPath' });
    gsap.from($$('.menu__nav li, .menu__foot > *', el), { opacity: 0, x: 34 * DIR, duration: 0.9, stagger: 0.045, delay: 0.12, ease: 'expo.out', clearProps: 'transform,opacity' });
  });
  el.addEventListener('menu:close', (e) => {
    e.preventDefault();
    gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, ease: 'expo.in', onComplete: () => { e.detail.done(); gsap.set(el, { clearProps: 'clipPath' }); } });
  });
}
