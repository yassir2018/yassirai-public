// AL MAHA v3 — one place for the switches the team may flip.

/**
 * HERO_PLATE: which hero photograph to use.
 *  'flag'    = v3 hero (tools/make-hero.py, master oryx-3d-ai/hero-flag-master-3072-small.png): the flag of Tunisia on its pole
 *              in the cliff, flying to the right, with a cut-out foreground (pole + rocks) so the 3D oryx can sit
 *              between the sky and the foreground, and the living photo (cinemagraph) behind them.
 *  'painted' = the original v2 horizon photo (painted oryx in the sky); the 3D oryx and the living photo are then off.
 * index.html preloads the 'flag' files; if they fail to load, an onerror fallback switches to 'painted'.
 * (The earlier man-on-the-cliff plate, img/hero-plate-*.webp + img/hero-fg-*.webp, is retired: the files stay unused.)
 */
export const HERO_PLATE = 'flag';

/**
 * Plate geometry, in fractions of each plate (from img/hero-geometry.json, written by tools/make-hero.py).
 * flag = the cloth's bounding box, pole = the pole + finial; reach = how far the fluttering cloth's outline may travel
 * (7 master px, as a fraction of the plate width); the oryx is placed clear of all of them.
 * 13/10: the whole flag assembly is 0.70 x its first size, scaled about the pole's foot (tools/make-flag-small.py), so
 * the finial stays >= 1.5 x the header height below the header at every landscape viewport down to 1280 x 720.
 * portrait = the 3:4 portrait plate (master x 811..2683 with 960 px of sky continued above the master).
 */
export const PLATES = {
  flag: {
    size: [2880, 1440], portraitSize: [1440, 1920],
    flag: [0.2835, 0.3307, 0.391, 0.5208], pole: [0.2783, 0.3151, 0.2894, 0.7253], skyFloor: 0.62, reach: 7 / 3072,
    portrait: { flag: [0.0321, 0.5881, 0.2083, 0.7051], pole: [0.0235, 0.5785, 0.0417, 0.8309], skyFloor: 0.766, reach: 7 / 1872 },
  },
  painted: {
    srcset: '../shared/img/v2/horizon-hq2048.webp 2048w, ../shared/img/v2/horizon-hq3072.webp 3072w',
    src: '../shared/img/v2/horizon-hq2048.webp',
    portrait: '../shared/img/v2/horizon-hq-mobile.webp',
    size: [2048, 1020], portraitSize: [1080, 1920],
  },
};

/**
 * The living photo (js/vendor/cinemagraph.js, fork of lab/hero-cinemagraph): the sea ripples and glitters, the valley
 * mist and the clouds drift to the right with the wind; the pole, the rocks, the city and the bridges never move.
 * Runs on capable devices only (same test as the 3D oryx, plus WebGL2); everything else keeps the still photo.
 */
export const CINEMAGRAPH = true;
/** FLAG_FLUTTER: the cloth ripples (waves travel from the pole to the free edge; the pole and the hoist never move). */
export const FLAG_FLUTTER = true;
export const CINE = {
  module: './vendor/cinemagraph.js',                 // relative to this file
  variants: {
    land: { masks: 'img/cine/motion.png', flag: 'img/cine/flag.png', protect: 'img/cine/protect.png', crop: [0, 0, 1, 1] },
    port: { masks: 'img/cine/motion-portrait.png', flag: 'img/cine/flag-portrait.png', protect: 'img/cine/protect-portrait.png',
      crop: [0.263997, -0.625, 0.609375, 1.625] },
  },
  aspect: 2, masterH: 1536,
  sun: [0.82552, 0.68294], horizon: 0.73047,
  wind: [1, 0],                                       // the flag flies to the right: mist and clouds travel right too
                                                      // (far banks 54 master px/s: ~40 px/s on a 1920 screen)
  flagGeo: { hoistPoly: [-0.1005993, 0.0786131, 0.2720645], flyX: 0.391, y0: 0.3307, y1: 0.5208 },
  flagAmp: 18,                                       // master px at the free edge (subtle; 7.5 on the full-size flag, x 0.70)
  fogTune: [0.40, 3.9, 0.85, 0.24],                   // mist: density offset, gain thicker / clearer, billow light
  dprMax: 2,                                          // canvas px per CSS px at most (the photo <img> is drawn at the
                                                      // device ratio: matching it keeps the take-over seamless)
  startDelay: 60,                                     // ms after the 3D oryx is ready (or has fallen back) before the set-up starts
  intro: { delay: 0, ramp: 2.6 },                     // the set-up starts once the 3D oryx is ready (~1.1-1.3 s), ~0.5 s of
                                                      // hidden frames choose the render scale, the canvas takes over still
                                                      // (~1.8-2.3 s), then the motion eases in over 2.6 s (smoothstep)
};

// 3D oryx module (imported, never copied) and the brand vector it renders.
export const ORYX_MODULE = '../../lab/oryx-3d/oryx3d.js';   // relative to this file
export const ORYX_SRC = '../shared/brand/symbol.svg';      // relative to index.html
export const ORYX_STATIC = 'img/symbol.svg';               // fallback image (reduced motion, no WebGL, low-end, slow)
// what stands in front of the oryx in concept B (cut-out pole + rocks, and the flag's flutter zone): tools/make-occlusion.py
export const ORYX_OCCLUDE = { land: 'img/cine/occlude.png', port: 'img/cine/occlude-portrait.png' };

/**
 * HERO COMPOSITION: three art-directed concepts for the 3D oryx (art-direction audit of 13/10). The page shows one of
 * them; ?hero=a|b|c in the URL picks another (index.html writes it on <html data-hero> before the first paint, so the
 * CSS is right on the first frame; keep its fallback equal to this default).
 *  'a' = THE SIGNATURE (التوقيع), recommended: the oryx is the symbol of a stacked lockup with the headline. It stands in
 *        the pocket beside the short first line «معاً نحو», above «مستقبلٍ أكثر إشراقاً», on the clean haze, in true
 *        colours (above the ivory air), never taller than the national flag's cloth (ORYX_FIT.a.maxFlag, hangFlag).
 *  'b' = THE MONUMENT (النُّصُب), lineage of the brand mockups: the oryx as a monumental figure in the landscape
 *        (0.55-0.65 H on screens), between the flag's cliff and the city, its face toward the headline; the pole, the
 *        rocks and the brush edge stand in front of it (occlusion matte, tools/make-occlusion.py). The flag cloth is
 *        never touched (every stroke keeps air from it) and stays the highest element. Portrait tablets: beside the flag
 *        in the open sky; portrait phones have no room for it: A's lockup (the audit's rule).
 *        (The audit's 1.05 H monument would pass behind the cloth: tested, its red strokes against the red flag break
 *        the flag's silhouette, and its horns cross the navigation; not offered.)
 *  'c' = OVERTURE AND HANDOFF (العتبة): the monumental moment happens in time. First visit of a session: the oryx draws
 *        itself very large in the sky, then flies into the header logo's symbol and the words rise. At rest the hero
 *        holds no symbol: photo, flag, headline.
 */
export const HERO_CONCEPT = 'c';
export const HERO_CONCEPTS = ['a', 'b', 'c'];

/**
 * Placement rules per concept (motion.js place* functions). Symbol aspect 545 x 770 (symbol.svg); the 3D module draws
 * it at `fit` of its stage (so the ink box is the stage inset by 4 % per side).
 * Shared rules (every concept): the sun (CINE.sun) is never pinned under a button (landscape: the copy block is lifted
 * until sun.y - CTA.bottom >= max(sunClear px, sunClearH x H)); the symbol never stands above the flag cloth's top in A;
 * it leaves with the copy on scroll (same 0..exitAt hero progress as .hero__inner).
 */
export const ORYX_FIT = {
  aspect: 545 / 770,
  fit: 0.92,                    // share of the stage the symbol occupies (module option `fit`)
  sunClear: 36, sunClearH: 0.045,
  exitAt: 0.16,                 // hero scroll progress at which the copy (and the symbol with it) is gone
  a: {
    maxH: 0.26,                 // x hero height: the signature, never a second flag
    ascAir: 16, ascAirH: 0.018, // air between the stage bottom and line 2's ascenders (px, x H; the larger)
    asc: 0.12,                  // line 2's ink top, as a fraction of its line box below the box top (Cairo, measured)
    typeGap: 28, typeGapW: 0.022, typeGapPort: 16,   // stage ink to line 1's first glyph (px, x W; portrait: px)
    navAir: 0.03, navAirPort: 0.02,                  // x H below the header bar
    minLand: 110, minLandH: 0.16, minPort: 88, minPortH: 0.11,
    portPhone: 0.11, portTablet: 0.13,               // portrait: target height (x H) the headline is pushed down to reach
    portGuard: 0.06,            // portrait: the sub-line ends at least this (x H) above the flag cloth
    maxFlag: 1.0,               // never taller than the flag cloth when both share the frame (0.8 with the full-size flag:
                                // with the 0.70 flag, 0.8 x the cloth fell below the symbol's legible minimum on tablets/phones)
    hangFlag: false,            // true: top never above the flag cloth's top (the full-size flag's rule; no pocket left with the 0.70 flag)
    delay: 0.35,                // s after line 2's first word: the symbol signs the sentence
  },
  b: {                          // motion.js placeB(): the largest symbol whose ink clears everything below wins
    maxH: 1.1, minH: 0.5,       // x hero height (landscape)
    maxHPort: 0.62, minHPort: 0.3,   // portrait
    flagAir: 0.06, flagAirMin: 20, // ink to the flag cloth (+ flutter reach): x the cloth's width, px at least
    navAir: 18,                 // ink to any header item (links, CTA, language, logo)
    copyGap: 28, copyGapW: 0.022,  // ink to any glyph run of the copy and to the buttons
    edgeAir: 0.04,              // x H: the face (jaw) stays this far above the hero's bottom brush edge
    skyFace: false,             // true: the face must stand above the far mountains' tops (PLATES.flag.skyFloor; smaller)
    minSeen: 0.7,               // at least this share of the ink is seen (not behind the flag, pole, rocks, edge, frame)
    wordsAfter: 0.95,           // s after the draw-in starts: the words rise (the oryx paints first)
  },
  c: {
    hLand: 1.2, hPort: 0.9,     // overture size, x hero height (portrait: also capped by the width)
    jawLand: [0.6, 0.56], jawPort: [0.62, 0.52],      // where the jaw stands (x W, x H)
    jaw: [0.9, 0.7],            // the jaw's point in the symbol box (fractions)
    flagAir: 24,                // px between the overture's ink and the flag cloth (+ reach), pole and rocks
    hold: 1.4, fly: 0.9, fade: 0.15, wordsLead: 0.2,  // s: draw-in (the ink is down by 1.4 s), flight into the header symbol, crossfade
    session: 'almaha-overture', // sessionStorage key: the overture plays once per session
  },
};
export const ORYX_BUDGET_MS = 1900;   // ms after the hero release: the 3D path must be ready by then, or the flat logo plays the hero

export const MQ = {
  portrait: '(max-width: 1023px) and (orientation: portrait), (max-width: 600px)',
  pin: '(min-width: 1024px) and (min-height: 620px)',
  fine: '(hover: hover) and (pointer: fine)',
  reduce: '(prefers-reduced-motion: reduce)',
};

export const CONTACT_EMAIL_FALLBACK = 'contact@almaha-consulting.com';
export const MESSAGE_MAX = 250;       // keeps the mailto under the ~2,000 characters Windows mail handlers accept
