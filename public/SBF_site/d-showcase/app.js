/* ===================================================================
   اتجاه د — مؤسسي متكامل  /  d-showcase/app.js

   Techniques reprises du « template engine » (weaver), adaptées :
     · nav .scrolled sur listener passif      → assets/js/main.js
     · reveal au scroll par IntersectionObserver + stagger
     · compteur animé avec easing cubique     → animateCounter()
     · rail à scroll-snap piloté par flèches  → landing-event
     · filtrage live par la recherche         → main.js §Search

   Adaptations imposées par ce projet :
     · RTL — le sens de défilement des rails est inversé, et scrollLeft
       est négatif en RTL sur les navigateurs conformes : tout est
       normalisé par Math.abs().
     · prefers-reduced-motion respecté partout.
     · AUCUN localStorage / sessionStorage (langues : registre §11).
     · Le compteur ne s'anime QUE si data-target > 0. Tous les compteurs
       de cette page valent 0 : aucun chiffre non approuvé (registre §5.9), donc le
       placeholder « 00 » reste affiché tel quel.
   =================================================================== */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smooth  = reduced ? 'auto' : 'smooth';

  document.addEventListener('DOMContentLoaded', function () {

    /* ── الترويسة عند التمرير ─────────────────────────────────── */
    var nav = document.getElementById('nav');
    if (nav) {
      var onScrollNav = function () {
        nav.classList.toggle('scrolled', window.scrollY > 60);
      };
      window.addEventListener('scroll', onScrollNav, { passive: true });
      onScrollNav();
    }

    /* ── الكشف التدريجي عند التمرير ───────────────────────────── */
    var reveals = document.querySelectorAll('.r');
    if ('IntersectionObserver' in window && !reduced) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('v');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      reveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('v'); });
    }

    /* ── العدّادات ────────────────────────────────────────────────
       Chiffres réels du profil institutionnel. Le décompte respecte les
       décimales (56.8) et le préfixe « + ». Sans JS, la valeur finale est
       déjà dans le HTML : rien ne disparaît. */
    var counters = document.querySelectorAll('.counter');

    function animateCounter(el) {
      var target = parseFloat(el.dataset.target);
      if (!isFinite(target) || target <= 0) return;

      var decimals = (el.dataset.target.split('.')[1] || '').length;
      var prefix   = el.dataset.prefix || '';
      var suffix   = el.dataset.suffix || '';
      var duration = 1800;
      var start    = performance.now();
      el.classList.remove('tmp');

      (function step(now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + (eased * target).toFixed(decimals) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      })(start);
    }

    if ('IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { counterObserver.observe(c); });
    }

    /* ── الرفوف الأفقية ───────────────────────────────────────────
       En RTL, « التالي » va vers la gauche : le delta physique est
       inversé. scrollLeft étant négatif en RTL, on le normalise. */
    var railBtns = document.querySelectorAll('.rail-btn');

    function railState(rail) {
      var max = rail.scrollWidth - rail.clientWidth;
      var pos = Math.abs(rail.scrollLeft);
      return { max: max, pos: pos, atStart: pos <= 2, atEnd: pos >= max - 2 };
    }

    function syncRailBtns(rail) {
      var s = railState(rail);
      document.querySelectorAll('.rail-btn[data-rail="' + rail.id + '"]').forEach(function (btn) {
        var isNext = btn.dataset.dir === 'next';
        btn.disabled = s.max <= 2 ? true : (isNext ? s.atEnd : s.atStart);
      });
    }

    railBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var rail = document.getElementById(btn.dataset.rail);
        if (!rail) return;

        var rtl    = getComputedStyle(rail).direction === 'rtl';
        var first  = rail.firstElementChild;
        var step   = first ? first.getBoundingClientRect().width + 24 : rail.clientWidth * 0.8;
        var dir    = btn.dataset.dir === 'next' ? 1 : -1;
        var delta  = step * dir * (rtl ? -1 : 1);

        rail.scrollBy({ left: delta, behavior: smooth });
      });
    });

    document.querySelectorAll('.rail').forEach(function (rail) {
      syncRailBtns(rail);
      rail.addEventListener('scroll', function () { syncRailBtns(rail); }, { passive: true });
      window.addEventListener('resize', function () { syncRailBtns(rail); }, { passive: true });
    });

    /* ── البحث في المشاريع ─────────────────────────────────────── */
    var searchToggle = document.getElementById('search-toggle');
    var searchBar    = document.getElementById('search-bar');
    var searchInput  = document.getElementById('search-input');
    var searchHint   = document.getElementById('search-hint');
    var projRail     = document.getElementById('proj-rail');
    var projEmpty    = document.getElementById('proj-empty');

    if (searchToggle && searchBar) {
      searchToggle.addEventListener('click', function () {
        var open = searchBar.hidden;
        searchBar.hidden = !open;
        searchToggle.setAttribute('aria-expanded', String(open));
        if (open && searchInput) searchInput.focus();
      });
    }

    if (searchInput && projRail) {
      searchInput.addEventListener('input', function (e) {
        var q     = e.target.value.trim().toLowerCase();
        var cards = projRail.querySelectorAll('.pcard');
        var shown = 0;

        cards.forEach(function (card) {
          var title = (card.querySelector('h3') || {}).textContent || '';
          var tags  = card.dataset.tags || '';
          var match = !q || (title + ' ' + tags).toLowerCase().indexOf(q) !== -1;
          card.hidden = !match;
          if (match) shown++;
        });

        if (projEmpty) projEmpty.hidden = shown !== 0;
        if (searchHint) {
          searchHint.textContent = q
            ? shown + ' من ' + cards.length + ' مشروعًا'
            : '';
        }
        syncRailBtns(projRail);
      });

      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        }
      });
    }

    /* ── قائمة الجوال ─────────────────────────────────────────── */
    var burger    = document.getElementById('burger');
    var navMobile = document.getElementById('nav-mobile');

    if (burger && navMobile) {
      burger.addEventListener('click', function () {
        var open = navMobile.hidden;
        navMobile.hidden = !open;
        burger.setAttribute('aria-expanded', String(open));
      });

      navMobile.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          navMobile.hidden = true;
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* ── التمرير السلس للمراسي ────────────────────────────────── */
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: smooth, block: 'start' });
      });
    });

    /* ── زر العودة إلى الأعلى ─────────────────────────────────── */
    var toTop = document.getElementById('to-top');
    if (toTop) {
      window.addEventListener('scroll', function () {
        toTop.classList.toggle('visible', window.scrollY > 500);
      }, { passive: true });

      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: smooth });
      });
    }

    /* ── النشرة البريدية ──────────────────────────────────────────
       Démonstration d'interface uniquement : rien n'est envoyé, rien
       n'est stocké (localStorage/sessionStorage proscrits, §5). */
    var nlForm = document.getElementById('nl-form');
    var nlMsg  = document.getElementById('nl-msg');

    if (nlForm && nlMsg) {
      nlForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = document.getElementById('nl-mail');
        var value = (input.value || '').trim();
        var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

        if (!valid) {
          nlMsg.textContent = 'أدخل بريدًا إلكترونيًا صحيحًا.';
          input.focus();
          return;
        }
        nlMsg.textContent = 'واجهة عرض فقط — لم يُرسل الاشتراك ولم يُحفظ البريد.';
        nlForm.reset();
      });
    }

  });
})();
