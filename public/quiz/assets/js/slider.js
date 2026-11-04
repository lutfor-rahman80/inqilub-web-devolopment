/* ==========================================================================
   Photo slider controller (shared). Auto-initialises every [data-slider].

   Markup contract (see student.html):
     <div class="slider" data-slider>
       <figure class="slide" data-caption="..." style="--focus: 50% 50%"><img ...></figure>
       ...
       <button class="slider-arrow prev">, <button class="slider-arrow next">
       <span class="slider-caption">, <div class="slider-dots">
     </div>

   Behaviour: crossfade, 5s autoplay, pause on hover/focus/hidden tab,
   reduced-motion aware, swipe that ignores vertical scrolling, next-image
   preloading, keyboard support, automatic skip of images that fail to load.
   ========================================================================== */
(function () {
  'use strict';

  var INTERVAL_MS = 5000;
  var SWIPE_MIN_PX = 50;
  var SWIPE_RATIO = 1.5;

  function toBn(n) {
    var map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/[0-9]/g, function (d) { return map[d]; });
  }

  function initSlider(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('.slide'));
    var dotsWrap = root.querySelector('.slider-dots');
    var captionEl = root.querySelector('.slider-caption');
    var prevBtn = root.querySelector('.slider-arrow.prev');
    var nextBtn = root.querySelector('.slider-arrow.next');
    if (!slides.length) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var current = 0;
    var timer = null;
    var hoverOrFocus = false;
    var dots = [];
    var captionTimer = null;

    // ---- helpers ------------------------------------------------------------
    function isUsable(i) {
      return !slides[i].classList.contains('is-failed');
    }

    function usableCount() {
      var c = 0;
      for (var i = 0; i < slides.length; i++) if (isUsable(i)) c++;
      return c;
    }

    function step(from, dir) {
      var n = slides.length;
      for (var k = 1; k <= n; k++) {
        var idx = (from + dir * k + n * k) % n;
        if (isUsable(idx)) return idx;
      }
      return from;
    }

    function preload(i) {
      var img = slides[i].querySelector('img');
      if (!img) return;
      if (img.getAttribute('loading') === 'lazy') img.setAttribute('loading', 'eager');
      var warm = new Image();
      warm.src = img.getAttribute('src');
    }

    // ---- dots ---------------------------------------------------------------
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      dots = slides.map(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slider-dot';
        b.setAttribute('aria-label', 'ছবি ' + toBn(i + 1) + ' / ' + toBn(slides.length));
        b.addEventListener('click', function () { goTo(i, true); });
        dotsWrap.appendChild(b);
        return b;
      });
    }

    // ---- core ---------------------------------------------------------------
    function render(animateCaption) {
      slides.forEach(function (s, i) {
        var active = i === current;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach(function (d, i) {
        var active = i === current;
        d.classList.toggle('is-active', active);
        d.hidden = !isUsable(i);
        if (active) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });

      if (captionEl) {
        var text = slides[current].getAttribute('data-caption') || '';
        clearTimeout(captionTimer);
        if (animateCaption && !reduceMotion.matches) {
          captionEl.classList.add('is-changing');
          captionTimer = setTimeout(function () {
            captionEl.textContent = text;
            captionEl.title = text;
            captionEl.classList.remove('is-changing');
          }, 200);
        } else {
          captionEl.textContent = text;
          captionEl.title = text;
        }
        captionEl.setAttribute('aria-live', timer ? 'off' : 'polite');
      }

      preload(step(current, 1));
    }

    function goTo(index, fromUser) {
      var n = slides.length;
      index = ((index % n) + n) % n;
      if (!isUsable(index)) index = step(index, 1);
      current = index;
      render(true);
      if (fromUser) restart();
    }

    function next(fromUser) { goTo(step(current, 1), fromUser); }
    function prev(fromUser) { goTo(step(current, -1), fromUser); }

    // ---- autoplay -----------------------------------------------------------
    function canAutoplay() {
      return !reduceMotion.matches && !hoverOrFocus && !document.hidden && usableCount() > 1;
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (captionEl) captionEl.setAttribute('aria-live', 'polite');
    }

    function start() {
      stop();
      if (!canAutoplay()) return;
      timer = setInterval(function () { next(false); }, INTERVAL_MS);
      if (captionEl) captionEl.setAttribute('aria-live', 'off');
    }

    function restart() { start(); }

    // ---- failed images ------------------------------------------------------
    function markFailed(slide) {
      slide.classList.add('is-failed');
      var i = slides.indexOf(slide);
      if (i === current && usableCount() > 0) {
        current = step(current, 1);
      }
      render(false);
      if (usableCount() <= 1) {
        stop();
        if (prevBtn) prevBtn.hidden = true;
        if (nextBtn) nextBtn.hidden = true;
      }
    }

    slides.forEach(function (slide) {
      var img = slide.querySelector('img');
      if (!img) return;
      img.addEventListener('error', function () { markFailed(slide); });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
        // already finished loading with an error before the listener attached
        markFailed(slide);
      }
    });

    // ---- events -------------------------------------------------------------
    if (prevBtn) prevBtn.addEventListener('click', function () { prev(true); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(true); });

    root.addEventListener('mouseenter', function () { hoverOrFocus = true; stop(); });
    root.addEventListener('mouseleave', function () {
      hoverOrFocus = root.contains(document.activeElement) && root.matches(':focus-within');
      if (!hoverOrFocus) start();
    });
    root.addEventListener('focusin', function () { hoverOrFocus = true; stop(); });
    root.addEventListener('focusout', function (e) {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      hoverOrFocus = root.matches(':hover');
      if (!hoverOrFocus) start();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function () { render(false); start(); });
    }

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(true); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(true); }
    });

    // Swipe: only when clearly horizontal, so vertical page scrolling is safe.
    var sx = 0, sy = 0, tracking = false;
    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    root.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
        if (dx < 0) next(true); else prev(true);
      }
    }, { passive: true });

    root.addEventListener('touchcancel', function () { tracking = false; }, { passive: true });

    // ---- boot ---------------------------------------------------------------
    buildDots();
    if (slides.length < 2) {
      if (prevBtn) prevBtn.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      if (dotsWrap) dotsWrap.hidden = true;
    }
    if (!isUsable(current)) current = step(current, 1);
    render(false);
    start();
  }

  function boot() {
    var roots = document.querySelectorAll('[data-slider]');
    for (var i = 0; i < roots.length; i++) initSlider(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
