// AL MAHA v3 — interface behaviour that does not depend on the motion layer.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------ header: always visible; one state change only (top -> frosted
   compact bar after a small scroll), with hysteresis so it never flickers around the threshold. It stays light over every
   chapter: no hide-on-scroll, no theme or logo swapping (those were the source of the scroll glitches). */
export function initHeader() {
  const header = $('#siteHeader');
  header.dataset.theme = 'light';
  let scrolled = null, ticking = false;
  const update = () => {
    ticking = false;
    const y = scrollY;
    const next = scrolled ? y > 8 : y > 40;
    if (next !== scrolled) { scrolled = next; header.classList.toggle('is-scrolled', next); }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ------------------------------------------------------------ scroll-spy: a section is current when it crosses the viewport centre */
export function initScrollSpy() {
  const map = { home: 'home', pillars: 'about', about: 'about', services: 'services', sectors: 'services', approach: 'approach', clients: 'works', works: 'works', vision: 'vision', contact: 'contact' };
  const sections = Object.keys(map).map((id) => document.getElementById(id)).filter(Boolean);
  const links = $$('[data-spy]');
  const nav = $('.site-nav');
  const indicator = $('.site-nav__indicator');
  let current = null, ticking = false;

  const place = () => {
    const a = nav && nav.querySelector(`a[data-spy="${current}"]:not(.btn)`);
    if (!a || !nav.offsetParent) { indicator?.classList.remove('is-on'); return; }
    const nr = nav.getBoundingClientRect(), ar = a.getBoundingClientRect();
    indicator.style.width = ar.width + 'px';
    indicator.style.setProperty('--x', (ar.left - nr.left) + 'px');
    indicator.classList.add('is-on');
  };
  const update = () => {
    ticking = false;
    const mid = innerHeight / 2;
    let id = null;
    for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { id = map[s.id]; break; } }
    if (id === current) return;
    current = id;
    links.forEach((l) => { if (l.dataset.spy === id) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    place();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', place);
  document.fonts?.ready.then(place);
  update();
}

/* ------------------------------------------------------------ mobile menu: dialog with focus trap, Esc, inert page */
export function initMenu() {
  const menu = $('#menu');
  const toggle = $('.menu-toggle');
  const page = [$('#siteHeader'), $('#main'), $('.site-footer')];
  let lastFocus = null;

  const focusables = () => $$('a[href], button:not([disabled])', menu).filter((el) => el.offsetParent !== null);
  const open = () => {
    lastFocus = document.activeElement;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('menu-open');
    page.forEach((el) => el && (el.inert = true));
    menu.dispatchEvent(new CustomEvent('menu:open'));
    requestAnimationFrame(() => focusables()[1]?.focus());
  };
  /** target: the in-page section the visitor chose (focus moves there), or null (focus returns to the toggle) */
  const close = (target = null) => {
    if (menu.hidden) return;
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
    page.forEach((el) => el && (el.inert = false));
    const done = () => {
      menu.hidden = true;
      if (target) {
        const h = target.querySelector('h1, h2') || target;
        if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
        h.focus({ preventScroll: true });
      } else (lastFocus || toggle).focus({ preventScroll: true });
    };
    const ev = new CustomEvent('menu:close', { detail: { done }, cancelable: true });
    if (menu.dispatchEvent(ev)) done();   // motion.js cancels the event and calls done() after its exit animation
  };

  toggle.addEventListener('click', open);
  menu.addEventListener('click', (e) => {
    const t = e.target.closest('[data-close]');
    if (!t) return;
    const hash = t.matches('a[href^="#"]:not([href="#"])') ? t.getAttribute('href') : null;
    close(hash ? document.querySelector(hash) : null);
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches) close(); });
}

/* ------------------------------------------------------------ approach as tabs (style layer «روح v2», <html data-style="v2">):
   the same <ol> of steps becomes an ARIA tablist (click, arrows in reading order, Home / End); the CSS in style-v2.css lays
   the titles out as tabs and opens the active step's text in one panel under them. The default v3 style keeps its pinned list. */
export function initApproachTabs() {
  const list = $('#approach .steps');
  if (!list) return;
  const steps = $$('.step', list);
  const tabs = steps.map((li) => $('.step__title', li));
  list.setAttribute('role', 'tablist');
  const rtl = document.documentElement.dir !== 'ltr';
  list.setAttribute('aria-label', rtl ? 'مراحل منهجيتنا' : 'Stages of our approach');
  const select = (i, focus = false) => {
    steps.forEach((li, k) => {
      const on = k === i;
      li.classList.toggle('is-active', on);
      li.classList.toggle('is-done', k < i);
      tabs[k].setAttribute('aria-selected', String(on));
      tabs[k].tabIndex = on ? 0 : -1;
    });
    if (focus) tabs[i].focus();
  };
  steps.forEach((li, i) => {
    const t = tabs[i], body = $('.step__body', li);
    li.setAttribute('role', 'presentation');
    t.id = `step-tab-${i + 1}`;
    body.id = `step-panel-${i + 1}`;
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', body.id);
    body.setAttribute('role', 'tabpanel');
    body.setAttribute('aria-labelledby', t.id);
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const n = tabs.length;
      // arrows follow the reading order: RTL ArrowLeft moves forward, LTR ArrowRight does
      const fwd = (i + 1) % n, back = (i - 1 + n) % n;
      const map = rtl ? { ArrowLeft: fwd, ArrowRight: back, Home: 0, End: n - 1 } : { ArrowRight: fwd, ArrowLeft: back, Home: 0, End: n - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(map[e.key], true);
    });
  });
  const start = Math.max(0, steps.findIndex((li) => li.classList.contains('is-active')));
  select(start);
}

/* ------------------------------------------------------------ services index: hover / focus selects a row; click opens the form on that topic */
export function initServices(onPick) {
  const index = $('[data-svc]');
  if (!index) return;
  const items = $$('.svc', index);
  const activate = (li) => items.forEach((x) => x.classList.toggle('is-active', x === li));
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  items.forEach((li) => {
    const a = li.querySelector('.svc__link');
    a.addEventListener('pointerenter', () => { if (fine.matches) activate(li); });
    a.addEventListener('focus', () => activate(li));
    a.addEventListener('click', (e) => { e.preventDefault(); activate(li); onPick?.(a.dataset.service); });
  });
  index.addEventListener('pointerleave', () => { if (fine.matches) activate(null); });
}

/* ------------------------------------------------------------ language switch (index.html <-> en.html): same section on the other page.
   Both pages share every id, so the current hash (or the section in view) carries over. */
export function initLangSwitch() {
  $$('a[data-lang-switch]').forEach((a) => {
    const base = a.getAttribute('href').split('#')[0];
    const sync = () => {
      let hash = location.hash;
      if (!hash || hash === '#home' || hash === '#main') {
        const mid = innerHeight * 0.4;
        const sec = $$('main > section[id]').find((x) => { const r = x.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
        hash = sec && sec.id !== 'home' ? `#${sec.id}` : '';
      }
      a.setAttribute('href', base + hash);
    };
    a.addEventListener('pointerdown', sync);
    a.addEventListener('focus', sync);
    a.addEventListener('click', sync);
  });
}

/* ------------------------------------------------------------ clients: the SBF spotlight (sbf-v3 PartnerLogoCloud) — logos
   grey at rest, a colour pulse passes from one logo to the next; hovering or focusing the strip pauses it */
export function initClientSpotlight() {
  const list = $('.clients__list');
  if (!list || document.documentElement.lang !== 'ar') return;   // the English page is frozen for now
  const items = $$('.client', list);
  if (items.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = -1, timer = 0, held = false, seen = false;
  const step = () => {
    items.forEach((el) => el.classList.remove('is-lit'));
    if (held || !seen || document.hidden) return;
    i = (i + 1) % items.length;
    items[i].classList.add('is-lit');
  };
  const run = () => { clearInterval(timer); timer = setInterval(step, 1700); step(); };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) run(); else { clearInterval(timer); step(); } }, { threshold: 0.3 }).observe(list);
  list.addEventListener('mouseenter', () => { held = true; step(); });
  list.addEventListener('mouseleave', () => { held = false; run(); });
  list.addEventListener('focusin', () => { held = true; step(); });
  list.addEventListener('focusout', () => { held = false; run(); });
}
