/* Electron21 — core: shared helpers, hero animation, tabs, ticker.
   Labs register themselves with E21.labs.<name> = function (panel) {...}
   and are built lazily the first time their tab is opened. */
(function () {
  'use strict';
  var E = window.E21 = { labs: {}, built: {}, onFilter: null };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  E.reduce = reduce;

  /* ---------- helpers ---------- */
  E.$ = function (s, r) { return (r || document).querySelector(s); };
  E.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  E.esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  E.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // 4700 -> "4.7 kΩ"
  E.eng = function (v, unit, digits) {
    unit = unit || '';
    if (!isFinite(v)) return '—';
    if (v === 0) return '0 ' + unit;
    var a = Math.abs(v), P = ['p', 'n', 'µ', 'm', '', 'k', 'M', 'G'], i = 4;
    while (a >= 1000 && i < 7) { a /= 1000; i++; }
    while (a < 1 && i > 0) { a *= 1000; i--; }
    a = +a.toPrecision(digits || 3);
    if (a >= 1000 && i < 7) { a /= 1000; i++; }   // e.g. 999.99 rounds up to 1000
    return (v < 0 ? '-' : '') + a + ' ' + P[i] + unit;
  };
  // "4.7k" / "10u" / "2.2M" / "330" -> number (m = milli, M = mega)
  E.num = function (str) {
    var s = String(str == null ? '' : str).trim().replace(/,/g, '').replace(/µ/g, 'u');
    if (!s) return NaN;
    var m = s.match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*([pnumkKMG]?)\s*[A-Za-zΩ]*$/);
    if (!m) return NaN;
    var mult = { p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }[m[2]];
    return parseFloat(m[1]) * mult;
  };
  E.plain = function (v) { // for input fields: short engineering string without unit
    var s = E.eng(v, '', 4).trim();
    return s.replace(/\s+/g, '');
  };

  /* ---------- tabs ---------- */
  var tabs = E.$$('.e21-tab'), benchName = E.$('#e21-bench-name');
  function activate(name, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.lab === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    E.$$('.e21-panel').forEach(function (p) { p.hidden = p.dataset.panel !== name; });
    if (benchName) benchName.textContent = name + '-lab';
    var panel = E.$('[data-panel="' + name + '"]');
    if (panel && !E.built[name] && E.labs[name]) {
      try { E.labs[name](panel); E.built[name] = true; } catch (err) { panel.innerHTML = '<p class="e21-note">This lab failed to load: ' + E.esc(err.message) + '</p>'; console.error(err); }
    }
    document.dispatchEvent(new CustomEvent('e21:lab', { detail: name }));
  }
  E.openLab = function (name, scroll) {
    activate(name, false);
    if (scroll) { var b = E.$('#labs'); if (b) b.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { activate(t.dataset.lab, false); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = -1;
      if (k === 'ArrowRight') j = (i + 1) % n; else if (k === 'ArrowLeft') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
      if (j >= 0) { e.preventDefault(); activate(tabs[j].dataset.lab, true); }
    });
  });
  E.$$('.e21-domain').forEach(function (b) {
    b.addEventListener('click', function () {
      E.openLab(b.dataset.lab, true);
      if (E.onFilter) E.onFilter(b.dataset.domain);
    });
  });
  var fs = E.$('#e21-fs');
  if (fs) fs.addEventListener('click', function () {
    var el = E.$('.e21-bench');
    if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen();
  });
  // deep link: electron21.html#lab=cpu
  var m = location.hash.match(/lab=(\w+)/);
  var first = m && E.$('[data-panel="' + m[1] + '"]') ? m[1] : 'logic';

  /* ---------- typewriter ---------- */
  (function () {
    var el = E.$('#e21-type'); if (!el) return;
    var lines = ['> simulate a logic gate', '> step through an 8-bit CPU', '> measure a signal on a scope', '> fit a regression to real data', '> design, test, improve, repeat'];
    if (reduce) { el.textContent = lines[0]; el.style.setProperty('--x', 0); return; }
    var li = 0, ci = 0, del = false;
    (function tick() {
      var s = lines[li];
      el.textContent = s.slice(0, ci);
      var wait = del ? 28 : 55;
      if (!del && ci === s.length) { wait = 1500; del = true; }
      else if (del && ci === 0) { del = false; li = (li + 1) % lines.length; wait = 350; }
      else ci += del ? -1 : 1;
      setTimeout(tick, wait);
    })();
  })();

  /* ---------- count-up stats ---------- */
  (function () {
    var els = E.$$('[data-count]'); if (!els.length) return;
    function run(el) {
      var to = +el.dataset.count, t0 = null;
      if (reduce) { el.textContent = to; return; }
      (function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
    }
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: .4 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- ticker ---------- */
  (function () {
    var tr = E.$('#e21-ticker'); if (!tr) return;
    var items = ['<b>V = I × R</b> Ohm\'s law', '<b>0b1010</b> = 10 = 0x0A', '<b>NAND</b> is a universal gate', '<b>τ = R × C</b> time constant', '<b>mean ± σ</b> describe your data', '<b>f = 1 / T</b> frequency', '<b>y = mx + c</b> a line of best fit', '<b>Fetch → Decode → Execute</b>', '<b>P = V × I</b> power', '<b>Nyquist</b>: sample at 2× the signal', '<b>I²C · SPI · UART</b> talk to chips', '<b>R² → 1</b> a better fit'];
    var html = items.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    tr.innerHTML = html + html;
  })();

  /* ---------- hero background: circuit traces with travelling pulses ---------- */
  (function () {
    var cv = E.$('#e21-bg'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, traces = [], dpr = Math.min(2, window.devicePixelRatio || 1), running = true, G = 44;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function build() {
      traces = [];
      var cols = Math.ceil(W / G), rows = Math.ceil(H / G), n = Math.round((cols * rows) / 14);
      var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (var i = 0; i < n; i++) {
        var x = Math.floor(rnd(0, cols)), y = Math.floor(rnd(0, rows)), d = dirs[Math.floor(rnd(0, 4))], pts = [[x * G, y * G]];
        var segs = Math.floor(rnd(3, 8));
        for (var s = 0; s < segs; s++) {
          var len = Math.floor(rnd(1, 5));
          x += d[0] * len; y += d[1] * len; pts.push([x * G, y * G]);
          var nd; do { nd = dirs[Math.floor(rnd(0, 8))]; } while (nd[0] === -d[0] && nd[1] === -d[1]); d = nd;
        }
        var L = 0, segsL = [];
        for (var k = 1; k < pts.length; k++) { var dl = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); segsL.push(dl); L += dl; }
        traces.push({ pts: pts, L: L, segs: segsL, t: Math.random(), v: rnd(.0006, .0016) * 900 / L, hue: Math.random() < .55 ? '255,255,255' : Math.random() < .5 ? '255,209,102' : '134,239,172' });
      }
    }
    function at(tr, p) {
      var dist = p * tr.L, k = 0;
      while (k < tr.segs.length - 1 && dist > tr.segs[k]) { dist -= tr.segs[k]; k++; }
      var f = dist / tr.segs[k], a = tr.pts[k], b = tr.pts[k + 1];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    function resize() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); draw(0);
    }
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      traces.forEach(function (tr) {
        ctx.beginPath(); tr.pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.strokeStyle = 'rgba(' + tr.hue + ',.14)'; ctx.lineWidth = 1.2; ctx.stroke();
        var e = tr.pts[tr.pts.length - 1], s = tr.pts[0];
        ctx.fillStyle = 'rgba(' + tr.hue + ',.35)'; ctx.beginPath(); ctx.arc(s[0], s[1], 3, 0, 7); ctx.arc(e[0], e[1], 3, 0, 7); ctx.fill();
        if (!reduce) {
          tr.t = (tr.t + tr.v * dt * .06) % 1;
          for (var q = 0; q < 3; q++) {
            var pp = at(tr, (tr.t + q * .09) % 1), a = .9 - q * .3;
            var g = ctx.createRadialGradient(pp[0], pp[1], 0, pp[0], pp[1], 12 - q * 3);
            g.addColorStop(0, 'rgba(' + tr.hue + ',' + a + ')'); g.addColorStop(1, 'rgba(' + tr.hue + ',0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pp[0], pp[1], 12 - q * 3, 0, 7); ctx.fill();
          }
        }
      });
    }
    var last = 0;
    function loop(t) { if (running) { draw(Math.min(40, t - last)); } last = t; requestAnimationFrame(loop); }
    resize(); window.addEventListener('resize', function () { clearTimeout(resize._t); resize._t = setTimeout(resize, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { running = es[0].isIntersecting; }).observe(cv);
    if (!reduce) requestAnimationFrame(loop);
  })();

  /* ---------- hero scope ---------- */
  (function () {
    var cv = E.$('#e21-hero-scope'); if (!cv || !cv.getContext) return;
    var c = cv.getContext('2d'), W = cv.width, H = cv.height, ph = 0, running = true;
    function frame() {
      c.fillStyle = '#02060d'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(134,239,172,.13)'; c.lineWidth = 1; c.beginPath();
      for (var i = 0; i <= 10; i++) { c.moveTo(i * W / 10, 0); c.lineTo(i * W / 10, H); }
      for (var j = 0; j <= 8; j++) { c.moveTo(0, j * H / 8); c.lineTo(W, j * H / 8); }
      c.stroke();
      c.strokeStyle = 'rgba(134,239,172,.35)'; c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.stroke();
      function trace(col, fn) {
        c.strokeStyle = col; c.lineWidth = 2.6; c.shadowColor = col; c.shadowBlur = 12; c.beginPath();
        for (var x = 0; x <= W; x += 3) { var y = fn(x / W); if (x) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke(); c.shadowBlur = 0;
      }
      trace('#FFD166', function (u) { return H / 2 - Math.sin(u * Math.PI * 6 + ph) * H * .3 - Math.sin(u * Math.PI * 18 + ph * 3) * H * .04; });
      trace('#FF7A98', function (u) { var s = Math.sin(u * Math.PI * 3 + ph * .5); return H / 2 + 60 - (Math.tanh(s * 8)) * H * .12; });
      c.fillStyle = 'rgba(255,209,102,.95)'; c.font = '600 14px JetBrains Mono, monospace';
      c.fillText('CH1  1.00 kHz', 14, 24); c.fillStyle = 'rgba(255,122,152,.95)'; c.fillText('CH2  500 Hz', 14, 44);
    }
    function loop() { if (running) { ph += .045; frame(); } requestAnimationFrame(loop); }
    frame();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { running = es[0].isIntersecting; }).observe(cv);
    if (!reduce) requestAnimationFrame(loop);
  })();

  // Labs are registered by later scripts; build the first tab once they have loaded.
  window.addEventListener('load', function () { activate(first, false); });
})();
