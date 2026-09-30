/* Smart21Brain — small UI polish animations
   1) Fades the main content in once on page load (not scroll-triggered,
      so it stays safe for screenshot/scroll-stitch capture tools — see
      the note at the top of animations.css about why AOS was dropped).
   2) Adds a quick ripple to .btn-s21 buttons on click.
   3) Counts dashboard stat numbers up from 0 the first time they're seen.
   Respects prefers-reduced-motion throughout. */
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    // 1) Page-load fade for the main content region.
    var main = document.querySelector('main') || document.body;
    if (!reduceMotion) {
      main.classList.add('s21-page-in');
    }

    // 2) Button ripple.
    if (!reduceMotion) {
      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-s21');
        if (!btn) return;
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var ripple = document.createElement('span');
        ripple.className = 's21-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 650);
      });
    }

    // 3) Count-up for dashboard stat numbers, e.g. <div class="stat-num">91%</div>.
    var stats = document.querySelectorAll('.stat-num');
    stats.forEach(function (el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^(\d+)(.*)$/);
      if (!match) return;
      var target = parseInt(match[1], 10);
      var suffix = match[2] || '';
      if (reduceMotion || !target) return;

      var duration = 900;
      var start = null;
      el.textContent = '0' + suffix;

      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(target * eased);
        el.textContent = value + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target + suffix;
          el.classList.add('is-counted');
        }
      }
      requestAnimationFrame(step);
    });
  });
})();
