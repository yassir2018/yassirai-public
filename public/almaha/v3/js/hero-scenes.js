// AL MAHA v3 — the hero's three scenes (Yassir, 13/10: "v2's hero changes, with its own images").
// Scene 1 = the living flag photo (plate + cinemagraph + cut-out; concept C's overture plays on it once per session).
// Scenes 2-3 = v2's oryx on the mountain and the oryx head, loaded after the intro; each one breathes (a slow push, one warm
// light pass, drifting mist) and arrives behind a dry-brush wipe that travels right to left (RTL), left to right going back.
// One headline and one set of buttons for all three: only the photograph changes.
// Autoplay 8 s per scene; it waits while the overture plays, while the pointer rests on the copy or the controls, while
// focus is inside the hero, while the tab is hidden or the hero is off screen; never under prefers-reduced-motion.
import { MQ } from './config.js';

const DWELL = 8000;
const WIPE = 1700;
const EASE_WIPE = 'cubic-bezier(.65, 0, .35, 1)';
const EXPO = 'cubic-bezier(.16, 1, .3, 1)';
const RTL = document.documentElement.dir !== 'ltr';
const CAPTIONS = RTL ? ['رايةٌ تتقدّم نحو الأفق', 'من القمّة نرى أبعد', 'رؤيةٌ تصنع الغد']
  : ['A flag carried toward the horizon', 'From the summit, we see further', 'A vision that shapes tomorrow'];
const L_PLAY = RTL ? ['إيقاف التبديل التلقائي', 'تشغيل التبديل التلقائي'] : ['Pause autoplay', 'Resume autoplay'];

export function initHeroScenes({ cine }) {
  const hero = document.getElementById('home');
  const ui = document.getElementById('heroScenes');
  if (!hero || !ui) return null;
  const root = document.documentElement;
  const reduce = matchMedia(MQ.reduce).matches;
  const layers = [null, ...hero.querySelectorAll('.hero-scene')];      // index 0 = scene 1 (the base photo)
  const dots = [...ui.querySelectorAll('.hero-scenes__dot')];
  const fills = dots.map((d) => d.querySelector('.hero-scenes__fill'));
  const now = ui.querySelector('.hero-scenes__now');
  const cap = ui.querySelector('.hero-scenes__cap');
  const btnPlay = ui.querySelector('[data-scenes="toggle"]');
  const N = layers.length;
  const S = {
    i: 0, busy: false, user: !reduce, hoverCopy: false, hoverUi: false, focus: false, hidden: document.hidden, inView: true,
    t: 0, last: 0, raf: 0, z: 2, loaded: new Map(), kb: new Map(), cineApi: null,
  };
  hero.dataset.scene = '1';
  ui.hidden = false;

  /* ------------------------------------------------------------ lazy images */
  function load(k) {
    if (k === 0) return Promise.resolve();
    if (S.loaded.has(k)) return S.loaded.get(k);
    const el = layers[k];
    const img = el.querySelector('img');
    el.querySelectorAll('source[data-srcset]').forEach((s) => { s.srcset = s.dataset.srcset; s.removeAttribute('data-srcset'); });
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
    if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    el.hidden = false;                                         // still invisible (opacity 0) until it is shown
    const p = (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
    S.loaded.set(k, p);
    return p;
  }
  const idle = (fn, t = 1200) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 200));
  function preload() { idle(() => load(1).then(() => idle(() => load(2)))); }
  // after the intro: the page has loaded and the overture (if any) has handed over to the header logo
  const afterIntro = new Promise((res) => {
    const ok = () => document.readyState === 'complete' && !root.classList.contains('intro-pending') && !root.classList.contains('c-overture');
    const check = () => { if (ok()) { mo.disconnect(); removeEventListener('load', check); setTimeout(res, 900); } };
    const mo = new MutationObserver(check);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    addEventListener('load', check);
    check();
  });
  afterIntro.then(preload);
  // the overture may begin after the page has loaded (it waits for the 3D module): the clock holds while it plays and
  // scene 1 gets its full time once it has landed
  new MutationObserver(() => { if (root.classList.contains('c-overture')) S.t = 0; tick(); })
    .observe(root, { attributes: true, attributeFilter: ['class'] });

  /* ------------------------------------------------------------ the brush wipe (mask-position, px keyframes) */
  const BRUSH_R = 'url("img/brush-edge.svg")';            // transparent -> opaque, left to right
  const BRUSH_L = 'url("img/brush-edge-r.svg")';
  const SOLID = 'linear-gradient(#000, #000)';
  // shape 'R': visible to the right of the edge e; shape 'L': visible to its left. e runs from `from` to `to` (px)
  function wipe(el, shape, from, to) {
    const W = hero.clientWidth, bw = Math.round(W * 0.3), big = W + 2 * bw;
    const pos = (e) => (shape === 'R' ? `${e - bw}px 0px, ${e}px 0px` : `${e}px 0px, ${e - big}px 0px`);
    const st = el.style;
    st.webkitMaskImage = st.maskImage = `${shape === 'R' ? BRUSH_R : BRUSH_L}, ${SOLID}`;
    st.webkitMaskSize = st.maskSize = `${bw}px 100%, ${big}px 100%`;
    st.webkitMaskRepeat = st.maskRepeat = 'no-repeat';
    st.webkitMaskPosition = st.maskPosition = pos(from(W, bw));
    const a = el.animate([{ maskPosition: pos(from(W, bw)), webkitMaskPosition: pos(from(W, bw)) },
      { maskPosition: pos(to(W, bw)), webkitMaskPosition: pos(to(W, bw)) }], { duration: WIPE, easing: EASE_WIPE, fill: 'forwards' });
    return a.finished.catch(() => {}).then(() => a);
  }
  const clearMask = (el) => { ['maskImage', 'maskSize', 'maskRepeat', 'maskPosition', 'webkitMaskImage', 'webkitMaskSize', 'webkitMaskRepeat', 'webkitMaskPosition'].forEach((p) => { el.style[p] = ''; }); el.getAnimations().forEach((a) => a.cancel()); };

  /* ------------------------------------------------------------ each scene breathes (once per visit, never loops) */
  function breathe(k) {
    const el = layers[k];
    if (!el || reduce) return;
    S.kb.get(k)?.forEach((a) => a.cancel());
    const img = el.querySelector('.hero-scene__img');
    const sweep = el.querySelector('.hero-scene__sweep');
    const mist = el.querySelector('.hero-scene__mist');
    const inner = el.querySelector('.hero-scene__in');
    const push = k === 1
      ? [{ transform: 'scale(1.03) translate3d(0, 0, 0)' }, { transform: 'scale(1.11) translate3d(1.2%, .8%, 0)' }]
      : [{ transform: 'scale(1.12) translate3d(1.4%, 1%, 0)' }, { transform: 'scale(1.03) translate3d(0, 0, 0)' }];
    S.kb.set(k, [
      img.animate(push, { duration: 12000, easing: 'cubic-bezier(.3, .1, .3, 1)', fill: 'both' }),
      inner.animate([{ transform: 'scale(1.045)', filter: 'brightness(.9)' }, { transform: 'none', filter: 'none' }], { duration: 2400, easing: EXPO, fill: 'both' }),
      sweep.animate([{ opacity: 0, transform: 'translate3d(22%, 0, 0)' }, { opacity: 1, offset: 0.4 }, { opacity: 0, transform: 'translate3d(-30%, 0, 0)' }],
        { duration: 6500, delay: 700, easing: 'ease-in-out', fill: 'both' }),
      mist.animate([{ opacity: 0, transform: 'translate3d(5%, 0, 0)' }, { opacity: 1, offset: 0.25 }, { opacity: 0.85, transform: 'translate3d(-7%, 0, 0)' }],
        { duration: 14000, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'both' }),
    ]);
  }

  /* ------------------------------------------------------------ the living photo only runs while scene 1 is on screen */
  function syncCine() {
    const api = cine?.api;
    if (!api) return;
    if (api !== S.cineApi) S.cineApi = api;
    if (S.i === 0) api.play(); else api.pause();
  }

  /* ------------------------------------------------------------ go to a scene */
  async function go(k, dir = 1, by = 'auto') {
    k = (k + N) % N;
    if (k === S.i || S.busy) return;
    S.busy = true;
    S.t = 0; paintFill();
    const from = S.i;
    await load(k);
    const out = layers[from], inn = layers[k];
    S.i = k;
    hero.dataset.scene = String(k + 1);
    ui.dataset.scene = String(k + 1);
    renderUi(by);
    if (k === 0) syncCine();
    if (reduce) {
      // a plain cross-fade
      if (inn) { inn.style.zIndex = String(++S.z); inn.classList.add('is-on'); await inn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' }).finished.catch(() => {}); }
      if (out) { if (!inn) await out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out' }).finished.catch(() => {}); out.classList.remove('is-on'); }
    } else if (inn) {
      // reveal the incoming scene above the current one
      inn.style.zIndex = String(++S.z);
      const anim = dir > 0
        ? wipe(inn, 'R', (W, bw) => W + bw, (W, bw) => -bw)       // next: right to left
        : wipe(inn, 'L', (W, bw) => -bw, (W, bw) => W + bw);      // previous: left to right
      inn.classList.add('is-on');
      breathe(k);
      await anim;
      clearMask(inn);
      if (out) out.classList.remove('is-on');
    } else if (out) {
      // back to scene 1 (it lies underneath): the overlay is brushed away
      const anim = dir > 0
        ? wipe(out, 'L', (W, bw) => W + bw, (W, bw) => -bw)
        : wipe(out, 'R', (W, bw) => -bw, (W, bw) => W + bw);
      await anim;
      out.classList.remove('is-on');
      clearMask(out);
    }
    if (k !== 0) syncCine();
    S.busy = false;
    S.last = performance.now();
    if (S.i !== 0) load((S.i + 1) % N);
    tick();
  }

  /* ------------------------------------------------------------ controls */
  function renderUi(by) {
    dots.forEach((d, j) => {
      d.setAttribute('aria-current', j === S.i ? 'true' : 'false');
      d.classList.toggle('is-on', j === S.i);
      d.classList.toggle('is-done', j < S.i);
    });
    if (now) now.textContent = String(S.i + 1).padStart(2, '0');
    if (cap) {
      cap.setAttribute('aria-live', by === 'user' ? 'polite' : 'off');
      cap.textContent = CAPTIONS[S.i] || '';
    }
  }
  function paintFill() {
    fills.forEach((f, j) => { f.style.transform = `scaleX(${j === S.i ? Math.min(1, S.t / DWELL) : j < S.i ? 1 : 0})`; });
  }
  function setUser(play) {
    S.user = play;
    ui.classList.toggle('is-paused', !play);
    btnPlay.setAttribute('aria-pressed', play ? 'false' : 'true');
    btnPlay.setAttribute('aria-label', play ? L_PLAY[0] : L_PLAY[1]);
    S.last = performance.now();
    tick();
  }
  ui.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.scenes;
    if (act === 'next') go(S.i + 1, 1, 'user');
    else if (act === 'prev') go(S.i - 1, -1, 'user');
    else if (act === 'toggle') setUser(!S.user);
    else if (b.dataset.to) { const k = +b.dataset.to; go(k, k >= S.i ? 1 : -1, 'user'); }
  });
  ui.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if ((e.key === 'ArrowLeft') === RTL) go(S.i + 1, 1, 'user'); else go(S.i - 1, -1, 'user');   // reading order: RTL left = forward, LTR right = forward
  });

  // pause while the pointer rests on the copy or the controls, or focus is inside the hero
  const copy = hero.querySelector('.hero__copy');
  const hov = (el, key) => { if (!el) return; el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { S[key] = true; tick(); } }); el.addEventListener('pointerleave', () => { S[key] = false; S.last = performance.now(); tick(); }); };
  hov(copy, 'hoverCopy');
  hov(ui, 'hoverUi');
  hero.addEventListener('focusin', () => { S.focus = true; tick(); });
  hero.addEventListener('focusout', (e) => { if (!hero.contains(e.relatedTarget)) { S.focus = false; S.last = performance.now(); tick(); } });
  document.addEventListener('visibilitychange', () => { S.hidden = document.hidden; S.last = performance.now(); tick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { S.inView = e.isIntersecting; S.last = performance.now(); tick(); }, { threshold: 0.35 }).observe(hero);
  }

  // swipe (touch): RTL, so a swipe to the right brings the next scene
  let sx = 0, sy = 0, st = 0;
  hero.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = performance.now(); }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (performance.now() - st > 800 || Math.abs(dx) < 48 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    if (e.target.closest('a, button')) return;
    if (dx > 0) go(S.i + 1, 1, 'user'); else go(S.i - 1, -1, 'user');
  }, { passive: true });

  /* ------------------------------------------------------------ the clock (runs only while it can play) */
  const intro = { done: false };
  afterIntro.then(() => { intro.done = true; S.last = performance.now(); tick(); });
  const canRun = () => S.user && !reduce && intro.done && !S.busy && !S.hoverCopy && !S.hoverUi && !S.focus && !S.hidden && S.inView
    && !root.classList.contains('c-overture');
  function frame(ts) {
    S.raf = 0;
    if (!canRun()) { S.last = ts; return; }
    S.t += Math.min(100, ts - (S.last || ts));
    S.last = ts;
    paintFill();
    if (S.t >= DWELL) {
      const k = (S.i + 1) % N;
      // never wait on a white frame: if the next photo is not decoded yet, hold here
      if (S.loaded.has(k) || k === 0) { S.t = 0; (k === 0 ? Promise.resolve() : S.loaded.get(k)).then(() => go(k, 1, 'auto')); return; }
      load(k);
      S.t = DWELL;
    }
    S.raf = requestAnimationFrame(frame);
  }
  function tick() {
    ui.classList.toggle('is-waiting', !canRun());
    if (!S.raf && canRun()) { S.last = performance.now(); S.raf = requestAnimationFrame(frame); }
  }

  // the living photo may come up after the visitor already left scene 1
  const cineWatch = setInterval(() => { if (cine?.api) { clearInterval(cineWatch); syncCine(); } }, 1000);
  setTimeout(() => clearInterval(cineWatch), 20000);

  renderUi('auto');
  setUser(!reduce);
  paintFill();
  return { go, get index() { return S.i; }, get state() { return { ...S, introDone: intro.done, kb: undefined, loaded: [...S.loaded.keys()] }; } };
}
