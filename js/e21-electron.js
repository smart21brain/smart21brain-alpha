/* Electron21: "Meet the electron" section.
   An interactive model of electrons drifting in a copper wire, with live numbers
   worked out from the real formulas:  electrons/second = I / e   and   drift speed v = I / (n · A · e). */
(function () {
  'use strict';
  var cv = document.getElementById('el-canvas');
  if (!cv) return;
  var Q = 1.602176634e-19;          // elementary charge, coulombs (exact)
  var N_CU = 8.49e28;               // free electrons per cubic metre in copper
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = cv.getContext('2d'), W = 0, H = 0;
  var iEl = document.getElementById('el-i'), aEl = document.getElementById('el-a');
  var out = { i: document.getElementById('el-i-v'), eps: document.getElementById('el-eps'), v: document.getElementById('el-v'), t: document.getElementById('el-t') };
  var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  function sci(x) {
    if (!(x > 0)) return '0';
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (m >= 9.995) { m = 1; e++; }
    return m.toFixed(2) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }
  function dur(s) {
    if (!isFinite(s)) return '—';
    if (s < 60) return s.toFixed(1) + ' seconds';
    if (s < 3600) return (s / 60).toFixed(1) + ' minutes';
    if (s < 86400) return (s / 3600).toFixed(1) + ' hours';
    return (s / 86400).toFixed(1) + ' days';
  }
  function model() {
    var I = +iEl.value, A = +aEl.value * 1e-6;          // mm² -> m²
    var v = I / (N_CU * A * Q);                          // m/s
    return { I: I, A: +aEl.value, v: v, eps: I / Q };
  }
  function readouts() {
    var m = model();
    out.i.textContent = m.I.toFixed(1) + ' A';
    out.eps.textContent = m.I > 0 ? sci(m.eps) + ' /s' : '0';
    out.v.textContent = m.I > 0 ? (m.v * 1000 < 0.01 ? (m.v * 1000).toExponential(1) : (m.v * 1000).toFixed(m.v * 1000 < 1 ? 3 : 2)) + ' mm/s' : '0 mm/s';
    out.t.textContent = m.I > 0 ? dur(1 / m.v) : '—';
  }

  /* ---------- drawing ---------- */
  var ions = [], els = [], band = { y0: 0, y1: 0 };
  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
    W = Math.max(280, Math.round(r.width)); H = Math.round(Math.max(150, Math.min(230, W * .3)));
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    band.y0 = H * .22; band.y1 = H * .78;
    ions = [];
    var gx = 36, gy = 34, row = 0;
    for (var y = band.y0 + 14; y < band.y1 - 6; y += gy, row++) for (var x = 18 + (row % 2 ? gx / 2 : 0); x < W; x += gx) ions.push([x, y]);
    var n = Math.round(Math.min(46, W / 15));
    els = [];
    for (var k = 0; k < n; k++) els.push([Math.random() * W, band.y0 + 6 + Math.random() * (band.y1 - band.y0 - 12)]);
  }
  function arrow(x1, x2, y, color, label, left) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    var d = x2 > x1 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 8 * d, y - 5); ctx.lineTo(x2 - 8 * d, y + 5); ctx.closePath(); ctx.fill();
    ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = left ? 'left' : 'right';
    ctx.fillText(label, left ? x1 : x1, y - 8);
  }
  function draw(step) {
    var m = model(), drift = m.I > 0 ? Math.min(3.4, .25 + 3.2 * Math.min(1, (m.I / m.A) / 20)) : 0;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a1a14'; ctx.fillRect(0, 0, W, H);
    // wire body
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, band.y0, W, band.y1 - band.y0);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, band.y0); ctx.lineTo(W, band.y0); ctx.moveTo(0, band.y1); ctx.lineTo(W, band.y1); ctx.stroke();
    // copper ions (fixed lattice, they just vibrate)
    var t = performance.now() / 260;
    ions.forEach(function (p, i) {
      var ox = Math.sin(t + i) * 1.4, oy = Math.cos(t * 1.1 + i * 1.7) * 1.4;
      ctx.fillStyle = 'rgba(134,239,172,.20)'; ctx.beginPath(); ctx.arc(p[0] + ox, p[1] + oy, 9, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(134,239,172,.55)'; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+', p[0] + ox, p[1] + oy + 3.5);
    });
    // free electrons: random thermal motion plus a slow drift to the left
    els.forEach(function (e) {
      if (step) {
        e[0] += (Math.random() - .5) * 3.2 - drift; e[1] += (Math.random() - .5) * 3.2;
        if (e[0] < -4) e[0] = W + 4; if (e[0] > W + 4) e[0] = -4;
        if (e[1] < band.y0 + 5) e[1] = band.y0 + 5; if (e[1] > band.y1 - 5) e[1] = band.y1 - 5;
      }
      var g = ctx.createRadialGradient(e[0], e[1], 0, e[0], e[1], 8);
      g.addColorStop(0, 'rgba(255,209,102,.95)'); g.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e[0], e[1], 8, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#FFD166'; ctx.beginPath(); ctx.arc(e[0], e[1], 3, 0, 6.2832); ctx.fill();
    });
    // direction labels
    arrow(W - 16, 16, H - 12, '#FFD166', 'electrons drift this way', false);
    arrow(16, W - 16, 22, '#7BAEFF', 'conventional current', true);
  }

  /* ---------- run only while visible ---------- */
  var running = false, raf = 0, visible = false;
  function loop() { if (!running) return; draw(true); raf = requestAnimationFrame(loop); }
  function sync() {
    var want = visible && !document.hidden && !reduce;
    if (want && !running) { running = true; raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); }
    if (!want) draw(false);
  }
  [iEl, aEl].forEach(function (el) { el.addEventListener('input', function () { readouts(); if (!running) draw(false); }); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: .05 }).observe(cv);
  else { visible = true; sync(); }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { layout(); draw(false); }, 120); });
  layout(); readouts(); draw(false);
})();
