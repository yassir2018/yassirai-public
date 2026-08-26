/* ===================================================================
   SBF_site/assets/ui.js
   Deux composants partagés par les directions : le diaporama de héros
   et le carrousel horizontal.

   RÈGLES
   · Aucun localStorage / sessionStorage.
   · RTL d'abord : on ne raisonne jamais en left/right, seulement en
     début/fin de ligne. scrollLeft est négatif en RTL sous Chromium :
     on le normalise partout par Math.abs.
   · prefers-reduced-motion : plus de défilement automatique, plus de
     zoom lent, plus de scroll animé. Les contrôles restent utilisables.
   · Sans JavaScript la première diapositive reste affichée et le
     carrousel reste défilable au doigt : rien ne disparaît.
   =================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ══════════════ Diaporama de héros ══════════════ */
  function initHero(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide]'));
    if (slides.length < 2) return;

    var dotsBox = root.querySelector('[data-hero-dots]');
    var status  = root.querySelector('[data-hero-status]');
    var toggle  = root.querySelector('[data-hero-toggle]');
    var delay   = parseInt(root.dataset.heroDelay, 10) || 6500;
    var index   = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
    if (index < 0) index = 0;

    var timer = null;
    var playing = false;
    var dots = [];

    if (dotsBox) {
      slides.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hero-dot';
        b.setAttribute('aria-label', 'الشريحة ' + (i + 1));
        b.addEventListener('click', function () { stop(); show(i); });
        dotsBox.appendChild(b);
        dots.push(b);
      });
    }

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        var on = i === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        /* Les liens d'une diapositive masquée sortent de l'ordre de
           tabulation, sinon le clavier se perd dans l'invisible. */
        Array.prototype.forEach.call(s.querySelectorAll('a, button'), function (el) {
          if (on) { el.removeAttribute('tabindex'); }
          else { el.setAttribute('tabindex', '-1'); }
        });
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === index);
        d.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
      if (status) status.textContent = (index + 1) + ' / ' + slides.length;
    }

    function play() {
      if (reduced || playing) return;
      playing = true;
      timer = setInterval(function () { show(index + 1); }, delay);
      if (toggle) {
        toggle.setAttribute('aria-pressed', 'false');
        toggle.setAttribute('aria-label', 'إيقاف العرض التلقائي');
        toggle.classList.remove('is-paused');
      }
    }

    function stop() {
      playing = false;
      clearInterval(timer);
      if (toggle) {
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'تشغيل العرض التلقائي');
        toggle.classList.add('is-paused');
      }
    }

    var prev = root.querySelector('[data-hero-prev]');
    var next = root.querySelector('[data-hero-next]');
    if (prev) prev.addEventListener('click', function () { stop(); show(index - 1); });
    if (next) next.addEventListener('click', function () { stop(); show(index + 1); });
    if (toggle) toggle.addEventListener('click', function () { playing ? stop() : play(); });

    /* Flèches du clavier quand le focus est dans le héros. */
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      /* En RTL, « suivant » est à gauche. */
      var forward = e.key === 'ArrowLeft';
      stop();
      show(index + (forward ? 1 : -1));
    });

    /* On ne fait pas tourner un diaporama que personne ne regarde. */
    root.addEventListener('mouseenter', stop);
    root.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : play();
    });

    if (reduced && toggle) toggle.hidden = true;

    show(index);
    play();
  }

  /* ══════════════ Carrousel horizontal ══════════════ */
  function initCarousel(root) {
    var track = root.querySelector('[data-carousel-track]');
    if (!track) return;
    var items = track.children;
    if (items.length < 2) return;

    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    var dotsBox = root.querySelector('[data-carousel-dots]');
    var dots = [];

    function step() {
      var first = items[0];
      var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function pos() { return Math.abs(track.scrollLeft); }
    function max() { return track.scrollWidth - track.clientWidth; }

    function go(dir) {
      /* scrollBy gère le signe RTL tout seul ; on raisonne en avant /
         arrière, pas en gauche / droite. */
      track.scrollBy({
        left: dir * step() * (getComputedStyle(track).direction === 'rtl' ? -1 : 1),
        behavior: reduced ? 'auto' : 'smooth'
      });
    }

    if (dotsBox) {
      for (var i = 0; i < items.length; i++) {
        (function (n) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'car-dot';
          b.setAttribute('aria-label', 'العنصر ' + (n + 1));
          b.addEventListener('click', function () {
            items[n].scrollIntoView({
              behavior: reduced ? 'auto' : 'smooth',
              block: 'nearest',
              inline: 'start'
            });
          });
          dotsBox.appendChild(b);
          dots.push(b);
        })(i);
      }
    }

    function sync() {
      var p = pos(), m = max();
      if (prev) prev.disabled = m <= 2 || p <= 2;
      if (next) next.disabled = m <= 2 || p >= m - 2;
      if (!dots.length) return;
      var current = Math.round(p / step());
      dots.forEach(function (d, i) {
        d.classList.toggle('is-on', i === current);
        d.setAttribute('aria-current', i === current ? 'true' : 'false');
      });
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    track.addEventListener('scroll', function () {
      window.requestAnimationFrame(sync);
    }, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    /* Les vignettes arrivent après coup : la largeur défilable change,
       donc l'état des flèches aussi. */
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(track);
    window.addEventListener('load', sync);
    sync();
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-hero]'), initHero);
    Array.prototype.forEach.call(document.querySelectorAll('[data-carousel]'), initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
