/* Electron21 — labs C: Number Lab, Data Lab */
(function () {
  'use strict';
  var E = window.E21; if (!E) return;
  var $ = E.$, $$ = E.$$, esc = E.esc;

  /* =====================================================================
     NUMBER LAB
     ===================================================================== */
  E.labs.numbers = function (p) {
    var bits = [0, 0, 1, 0, 1, 0, 1, 0]; // MSB first = 42
    p.innerHTML = E.head('Number Lab', 'See how the same number looks in decimal, binary, hexadecimal and octal, flip individual bits in an 8-bit register, and try bitwise operations.') +
      '<div class="e21-two"><div class="e21-card"><h4>Base converter</h4><div class="e21-row" style="align-items:end"><div class="e21-field"><label for="nm-in">Number</label><input class="e21-in" id="nm-in" value="42" autocomplete="off" spellcheck="false"></div><div class="e21-field"><label for="nm-b">Input base</label><select class="e21-sel" id="nm-b"><option value="10">Decimal</option><option value="2">Binary</option><option value="16">Hex</option><option value="8">Octal</option></select></div></div>' +
      '<div class="e21-kv mt-3" id="nm-out"></div><div id="nm-err" class="e21-note d-none" style="border-color:var(--e-red)"></div>' +
      '<h4 class="mt-4">Bitwise calculator</h4><div class="e21-row" style="align-items:end"><div class="e21-field"><label for="bw-a">A</label><input class="e21-in" id="bw-a" value="0b11001010"></div><div class="e21-field" style="flex:0 0 100px"><label for="bw-o">Op</label><select class="e21-sel" id="bw-o"><option>AND</option><option>OR</option><option>XOR</option><option>SHL</option><option>SHR</option></select></div><div class="e21-field"><label for="bw-b">B / shift</label><input class="e21-in" id="bw-b" value="0b00001111"></div></div><pre class="e21-console mt-3" id="bw-out" style="color:var(--e-text)"></pre></div>' +
      '<div class="e21-card"><h4>8-bit register: click the bits</h4><div class="e21-bits" id="nm-bits"></div><div class="e21-row mt-3"><button class="e21-btn sm" id="nm-not" type="button">NOT</button><button class="e21-btn sm" id="nm-inc" type="button">+ 1</button><button class="e21-btn sm" id="nm-neg" type="button">Negate (−x)</button><button class="e21-btn sm" id="nm-shl" type="button">« Shift</button><button class="e21-btn sm" id="nm-shr" type="button">Shift »</button><button class="e21-btn sm ghost" id="nm-clr" type="button">Clear</button></div>' +
      '<div class="e21-kv mt-3" id="nm-reg"></div><p class="e21-note" id="nm-tip"></p></div></div>';

    /* converter */
    function conv() {
      var s = $('#nm-in', p).value.trim().replace(/^0[xb]/i, '').replace(/_/g, ''), b = +$('#nm-b', p).value, err = $('#nm-err', p), ok = {
        2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i
      }[b].test(s);
      if (!s) { $('#nm-out', p).innerHTML = ''; err.classList.add('d-none'); return; }
      if (!ok) { err.textContent = 'Not a valid base-' + b + ' number.'; err.classList.remove('d-none'); $('#nm-out', p).innerHTML = ''; return; }
      var v = parseInt(s, b);
      if (v > Number.MAX_SAFE_INTEGER) { err.textContent = 'Too large (limit 2^53).'; err.classList.remove('d-none'); return; }
      err.classList.add('d-none');
      var bin = v.toString(2), grp = bin.replace(/\B(?=(\d{4})+(?!\d))/g, ' ');
      $('#nm-out', p).innerHTML = '<div><small>Decimal</small><b>' + v.toLocaleString('en-US') + '</b></div><div><small>Binary</small><b>' + grp + '</b></div><div><small>Hex</small><b>0x' + v.toString(16).toUpperCase() + '</b></div><div><small>Octal</small><b>0o' + v.toString(8) + '</b></div><div><small>Bits needed</small><b>' + bin.length + '</b></div>';
    }
    $('#nm-in', p).addEventListener('input', conv); $('#nm-b', p).addEventListener('change', conv); conv();

    /* bitwise */
    function pn(s) { s = String(s).trim(); if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2); if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16); if (/^\d+$/.test(s)) return parseInt(s, 10); return NaN; }
    function bw() {
      var a = pn($('#bw-a', p).value), b = pn($('#bw-b', p).value), op = $('#bw-o', p).value, out = $('#bw-out', p);
      if (isNaN(a) || isNaN(b) || a > 255 || b > 255) { out.textContent = 'Use values 0-255 (decimal, 0x.. or 0b..).'; return; }
      var r = op === 'AND' ? a & b : op === 'OR' ? a | b : op === 'XOR' ? a ^ b : op === 'SHL' ? (a << b) & 255 : a >> b, f = function (n) { return ('00000000' + n.toString(2)).slice(-8); };
      var shift = op === 'SHL' || op === 'SHR';
      out.textContent = '  A  ' + f(a) + '  (' + a + ')\n' + (shift ? '  ' + op + ' by ' + b + '\n' : '  B  ' + f(b) + '  (' + b + ')\n') + '  ' + '─'.repeat(22) + '\n  =  ' + f(r) + '  (' + r + ')';
    }
    $$('#bw-a,#bw-b,#bw-o', p).forEach(function (el) { el.addEventListener('input', bw); el.addEventListener('change', bw); }); bw();

    /* register */
    function val() { return bits.reduce(function (s, b) { return s * 2 + b; }, 0); }
    function setVal(v) { v &= 255; for (var i = 7; i >= 0; i--) { bits[i] = v & 1; v >>= 1; } }
    function reg() {
      var v = val(), sg = v > 127 ? v - 256 : v;
      $('#nm-bits', p).innerHTML = bits.map(function (b, i) { return '<button type="button" class="e21-bit ' + (b ? 'on' : '') + '" data-i="' + i + '" aria-pressed="' + (b === 1) + '" aria-label="Bit ' + (7 - i) + '">' + b + '<small>' + (1 << (7 - i)) + '</small></button>'; }).join('');
      $$('.e21-bit', $('#nm-bits', p)).forEach(function (b) { b.addEventListener('click', function () { bits[+b.dataset.i] ^= 1; reg(); }); });
      var ch = v >= 32 && v < 127 ? "'" + String.fromCharCode(v) + "'" : v === 0 ? 'NUL' : '·';
      $('#nm-reg', p).innerHTML = '<div><small>Unsigned</small><b>' + v + '</b></div><div><small>Signed (2\'s comp)</small><b>' + sg + '</b></div><div><small>Hex</small><b>0x' + ('0' + v.toString(16)).slice(-2).toUpperCase() + '</b></div><div><small>ASCII</small><b>' + esc(ch) + '</b></div>';
      $('#nm-tip', p).textContent = bits[0] ? 'The top bit is 1, so as a signed number this is negative: bit 7 counts as −128 instead of +128.' : 'Each bit is worth a power of 2. Add the values of the bits that are on: ' + (bits.map(function (b, i) { return b ? (1 << (7 - i)) : null; }).filter(Boolean).join(' + ') || '0') + ' = ' + v + '.';
    }
    $('#nm-not', p).addEventListener('click', function () { setVal(~val()); reg(); });
    $('#nm-inc', p).addEventListener('click', function () { setVal(val() + 1); reg(); });
    $('#nm-neg', p).addEventListener('click', function () { setVal(~val() + 1); reg(); $('#nm-tip', p).textContent = "Two's complement negation: invert every bit, then add 1. That is how computers subtract with an adder."; });
    $('#nm-shl', p).addEventListener('click', function () { setVal(val() << 1); reg(); $('#nm-tip', p).textContent = 'Shifting left multiplies by 2 (the top bit falls off).'; });
    $('#nm-shr', p).addEventListener('click', function () { setVal(val() >> 1); reg(); $('#nm-tip', p).textContent = 'Shifting right divides by 2 (rounding down).'; });
    $('#nm-clr', p).addEventListener('click', function () { setVal(0); reg(); });
    reg();
  };

  /* =====================================================================
     DATA LAB
     ===================================================================== */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function csvOf(headers, rows) { return headers.join(',') + '\n' + rows.map(function (r) { return r.join(','); }).join('\n'); }
  var SETS = {
    study: { name: 'Study hours vs exam score', make: function () { var r = rng(7), rows = [], i; for (i = 0; i < 28; i++) { var h = +(0.5 + r() * 9).toFixed(1); rows.push([h, Math.round(Math.max(0, Math.min(100, 36 + 5.4 * h + (r() - .5) * 18))), Math.round(5 + r() * 4)]); } return csvOf(['study_hours', 'exam_score', 'sleep_hours'], rows); } },
    maize: { name: 'Rainfall vs maize yield', make: function () { var r = rng(21), rows = [], i; for (i = 0; i < 24; i++) { var mm = Math.round(350 + r() * 600); rows.push([mm, +(0.4 + 0.0029 * mm + (r() - .5) * 0.9).toFixed(2), Math.round(18 + r() * 8)]); } return csvOf(['rainfall_mm', 'yield_t_per_ha', 'avg_temp_c'], rows); } },
    pendulum: { name: 'Pendulum: length vs period²', make: function () { var r = rng(3), rows = [], L; for (L = 0.2; L <= 1.61; L += 0.1) { var T = 2 * Math.PI * Math.sqrt(L / 9.81) * (1 + (r() - .5) * 0.03); rows.push([+L.toFixed(2), +(T * T).toFixed(3), +T.toFixed(3)]); } return csvOf(['length_m', 'period_squared', 'period_s'], rows); } },
    temp: { name: 'Temperature sensor log (24 h)', make: function () { var r = rng(11), rows = [], h; for (h = 0; h < 24; h++) rows.push([h, +(23 + 6 * Math.sin((h - 9) / 24 * 2 * Math.PI) + (r() - .5) * 1.2).toFixed(1), Math.round(55 + 18 * Math.cos((h - 4) / 24 * 2 * Math.PI) + (r() - .5) * 6)]); return csvOf(['hour', 'temp_c', 'humidity_pct'], rows); } }
  };

  E.labs.data = function (p) {
    var D = null, sel = { x: 0, y: 1, h: 0 };
    p.innerHTML = E.head('Data Lab', 'Paste or upload a CSV file (it never leaves your device), or load a sample. Get summary statistics, a histogram, a correlation table and a regression line you can use to predict.',
      '<div class="e21-field" style="min-width:230px"><label for="dl-s">Sample dataset</label><select class="e21-sel" id="dl-s"><option value="">Choose…</option>' + Object.keys(SETS).map(function (k) { return '<option value="' + k + '">' + SETS[k].name + '</option>'; }).join('') + '</select></div>') +
      '<div class="e21-two" style="grid-template-columns:1fr 1.4fr"><div><div class="e21-card"><h4>Your data (CSV)</h4><textarea class="e21-ta" id="dl-ta" spellcheck="false" placeholder="name,score&#10;Amina,72&#10;Juma,64"></textarea><div class="e21-row mt-3" style="align-items:center"><button class="e21-btn sm lime" type="button" id="dl-go"><i class="fa-solid fa-chart-column"></i> Analyse</button><label class="e21-btn sm ghost" style="margin:0"><i class="fa-solid fa-upload"></i> Upload CSV<input type="file" id="dl-file" accept=".csv,.tsv,.txt,text/csv" hidden></label></div><div id="dl-msg" class="e21-note"></div></div>' +
      '<div class="e21-card mt-3"><h4>Preview</h4><div class="e21-dtable-wrap" id="dl-prev"><p class="e21-note" style="margin:.8rem">No data yet.</p></div></div></div>' +
      '<div id="dl-res"><div class="e21-card"><p class="e21-note" style="margin:0">Load a sample dataset or paste a CSV, then press <b>Analyse</b>.</p></div></div></div>';

    function parse(text) {
      var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
      if (lines.length < 3) throw new Error('Need a header row and at least 2 data rows.');
      var delim = [',', '\t', ';'].map(function (d) { return [d, lines[0].split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
      var split = function (l) { var o = [], cur = '', q = false; for (var i = 0; i < l.length; i++) { var c = l[i]; if (c === '"') q = !q; else if (c === delim && !q) { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map(function (s) { return s.trim(); }); };
      var head = split(lines[0]), rows = lines.slice(1, 5001).map(split);
      var cols = head.map(function (h, j) {
        var vals = rows.map(function (r) { return r[j]; }), nums = vals.map(function (v) { return v === '' || v == null ? NaN : Number(v); }), good = nums.filter(isFinite).length;
        return { name: h || 'col' + (j + 1), vals: vals, nums: nums, numeric: good / rows.length >= .7 && good >= 2 };
      });
      return { cols: cols, rows: rows, n: rows.length };
    }
    var ST = {
      mean: function (a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; },
      sd: function (a) { var m = ST.mean(a); return a.length > 1 ? Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1)) : 0; },
      med: function (a) { var s = a.slice().sort(function (x, y) { return x - y; }), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; }
    };
    function fin(c) { return c.nums.filter(isFinite); }
    function corr(a, b) {
      var xs = [], ys = [], i; for (i = 0; i < a.nums.length; i++) if (isFinite(a.nums[i]) && isFinite(b.nums[i])) { xs.push(a.nums[i]); ys.push(b.nums[i]); }
      var n = xs.length; if (n < 3) return { r: NaN, n: n, xs: xs, ys: ys };
      var mx = ST.mean(xs), my = ST.mean(ys), sxy = 0, sxx = 0, syy = 0;
      for (i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
      var slope = sxx ? sxy / sxx : 0, icpt = my - slope * mx, r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0, sse = 0;
      for (i = 0; i < n; i++) { var e = ys[i] - (slope * xs[i] + icpt); sse += e * e; }
      return { r: r, n: n, xs: xs, ys: ys, slope: slope, icpt: icpt, rmse: Math.sqrt(sse / n) };
    }
    var f3 = function (v) { return isFinite(v) ? String(+v.toPrecision(4)) : '—'; };

    function render() {
      var num = D.cols.map(function (c, i) { return c.numeric ? i : -1; }).filter(function (i) { return i >= 0; });
      if (num.length < 1) { $('#dl-res', p).innerHTML = '<div class="e21-card"><p class="e21-note" style="border-color:var(--e-red)">No numeric columns found. Check that the first row holds column names.</p></div>'; return; }
      if (num.indexOf(sel.x) < 0) sel.x = num[0]; if (num.indexOf(sel.y) < 0) sel.y = num[Math.min(1, num.length - 1)]; if (num.indexOf(sel.h) < 0) sel.h = num[0];
      var opts = function (cur) { return num.map(function (i) { return '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + esc(D.cols[i].name) + '</option>'; }).join(''); };
      var stats = num.map(function (i) { var a = fin(D.cols[i]); return '<tr><td style="text-align:left">' + esc(D.cols[i].name) + '</td><td>' + a.length + '</td><td>' + f3(ST.mean(a)) + '</td><td>' + f3(ST.med(a)) + '</td><td>' + f3(ST.sd(a)) + '</td><td>' + f3(Math.min.apply(null, a)) + '</td><td>' + f3(Math.max.apply(null, a)) + '</td></tr>'; }).join('');
      var cm = '';
      if (num.length >= 2 && num.length <= 7) {
        cm = '<div class="e21-card mt-3"><h4>Correlation (Pearson r)</h4><div style="overflow:auto"><table class="e21-table"><tr><th></th>' + num.map(function (i) { return '<th>' + esc(D.cols[i].name) + '</th>'; }).join('') + '</tr>' + num.map(function (i) {
          return '<tr><th style="text-align:left">' + esc(D.cols[i].name) + '</th>' + num.map(function (j) { var c = i === j ? { r: 1 } : corr(D.cols[i], D.cols[j]), r = c.r, a = isFinite(r) ? Math.abs(r) : 0; return '<td style="background:' + (r >= 0 ? 'rgba(163,230,53,' : 'rgba(251,113,133,') + (a * .55).toFixed(2) + ')">' + (isFinite(r) ? r.toFixed(2) : '—') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table></div><p class="e21-note">+1 means two columns rise together, −1 means one rises as the other falls, 0 means no straight-line link. <b>Correlation does not prove cause.</b></p></div>';
      }
      $('#dl-res', p).innerHTML = '<div class="e21-card"><h4>Summary statistics (' + D.n + ' rows)</h4><div style="overflow:auto"><table class="e21-table"><tr><th style="text-align:left">Column</th><th>n</th><th>mean</th><th>median</th><th>std dev</th><th>min</th><th>max</th></tr>' + stats + '</table></div></div>' +
        '<div class="e21-card mt-3"><h4>Scatter &amp; regression</h4><div class="e21-row"><div class="e21-field"><label for="dl-x">X (input)</label><select class="e21-sel" id="dl-x">' + opts(sel.x) + '</select></div><div class="e21-field"><label for="dl-y">Y (to predict)</label><select class="e21-sel" id="dl-y">' + opts(sel.y) + '</select></div></div>' +
        '<canvas id="dl-sc" class="e21-chart mt-3" width="640" height="320"></canvas><div class="e21-kv mt-3" id="dl-reg"></div>' +
        '<div class="e21-row mt-3" style="align-items:end"><div class="e21-field"><label for="dl-px">Predict Y when X =</label><input class="e21-in" id="dl-px" placeholder="enter a value" inputmode="decimal"></div><div class="e21-out" id="dl-pr" style="flex:2;align-self:center"></div></div></div>' +
        '<div class="e21-card mt-3"><h4>Histogram</h4><div class="e21-field" style="max-width:260px"><label for="dl-h">Column</label><select class="e21-sel" id="dl-h">' + opts(sel.h) + '</select></div><canvas id="dl-hi" class="e21-chart mt-3" width="640" height="260"></canvas></div>' + cm;
      $('#dl-x', p).addEventListener('change', function () { sel.x = +this.value; scatter(); });
      $('#dl-y', p).addEventListener('change', function () { sel.y = +this.value; scatter(); });
      $('#dl-h', p).addEventListener('change', function () { sel.h = +this.value; hist(); });
      $('#dl-px', p).addEventListener('input', predict);
      scatter(); hist();
    }
    var fit = null;
    function axes(c, W, H, l, b, t, r, x0, x1, y0, y1, xl, yl) {
      c.fillStyle = '#02060d'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(148,163,184,.14)'; c.fillStyle = '#93a4bf'; c.font = '11px JetBrains Mono, monospace'; c.lineWidth = 1;
      for (var k = 0; k <= 5; k++) {
        var xv = x0 + (x1 - x0) * k / 5, yv = y0 + (y1 - y0) * k / 5, X = l + (W - l - r) * k / 5, Y = H - b - (H - b - t) * k / 5;
        c.beginPath(); c.moveTo(X, t); c.lineTo(X, H - b); c.moveTo(l, Y); c.lineTo(W - r, Y); c.stroke(); c.fillText(f3(xv), X - 12, H - b + 15); c.fillText(f3(yv), 20, Y + 4);
      }
      c.fillStyle = '#e6edf7'; c.fillText(xl, W / 2 - 20, H - 6); c.save(); c.translate(10, H / 2 + 10); c.rotate(-Math.PI / 2); c.fillText(yl || '', 0, 0); c.restore();
    }
    function scatter() {
      var cv = $('#dl-sc', p), c = cv.getContext('2d'), W = 640, H = 320, l = 74, b = 36, t = 14, r = 16, a = D.cols[sel.x], bcol = D.cols[sel.y], f = corr(a, bcol);
      fit = f;
      if (f.n < 3) { c.fillStyle = '#02060d'; c.fillRect(0, 0, W, H); $('#dl-reg', p).innerHTML = '<div><small>Not enough paired numbers</small><b>—</b></div>'; return; }
      var x0 = Math.min.apply(null, f.xs), x1 = Math.max.apply(null, f.xs), y0 = Math.min.apply(null, f.ys), y1 = Math.max.apply(null, f.ys);
      var px = (x1 - x0) * .06 || 1, py = (y1 - y0) * .08 || 1; x0 -= px; x1 += px; y0 -= py; y1 += py;
      axes(c, W, H, l, b, t, r, x0, x1, y0, y1, a.name, bcol.name);
      var X = function (v) { return l + (W - l - r) * (v - x0) / (x1 - x0); }, Y = function (v) { return H - b - (H - b - t) * (v - y0) / (y1 - y0); };
      c.fillStyle = 'rgba(34,211,238,.8)'; f.xs.forEach(function (v, i) { c.beginPath(); c.arc(X(v), Y(f.ys[i]), 4.2, 0, 7); c.fill(); });
      c.strokeStyle = '#a3e635'; c.lineWidth = 2.5; c.setLineDash([8, 5]); c.beginPath(); c.moveTo(X(x0), Y(f.slope * x0 + f.icpt)); c.lineTo(X(x1), Y(f.slope * x1 + f.icpt)); c.stroke(); c.setLineDash([]);
      var r2 = f.r * f.r, strength = r2 > .8 ? 'strong' : r2 > .4 ? 'moderate' : 'weak';
      $('#dl-reg', p).innerHTML = '<div><small>Line of best fit</small><b>y = ' + f3(f.slope) + 'x ' + (f.icpt < 0 ? '− ' : '+ ') + f3(Math.abs(f.icpt)) + '</b></div><div><small>r</small><b>' + f.r.toFixed(3) + '</b></div><div><small>R²</small><b>' + r2.toFixed(3) + ' (' + strength + ')</b></div><div><small>Typical error (RMSE)</small><b>' + f3(f.rmse) + '</b></div><div><small>Points used</small><b>' + f.n + '</b></div>';
      predict();
    }
    function predict() {
      var v = E.num($('#dl-px', p).value), o = $('#dl-pr', p);
      if (!fit || !isFinite(v) || fit.n < 3) { o.textContent = ''; return; }
      o.textContent = 'ŷ ≈ ' + f3(fit.slope * v + fit.icpt) + '  (± ' + f3(fit.rmse) + ')';
    }
    function hist() {
      var cv = $('#dl-hi', p), c = cv.getContext('2d'), W = 640, H = 260, l = 74, b = 36, t = 14, r = 16, col = D.cols[sel.h], a = fin(col);
      if (a.length < 2) { c.fillStyle = '#02060d'; c.fillRect(0, 0, W, H); return; }
      var mn = Math.min.apply(null, a), mx = Math.max.apply(null, a), k = Math.max(4, Math.min(20, Math.round(Math.sqrt(a.length)))), w = (mx - mn) / k || 1, bins = new Array(k).fill(0);
      a.forEach(function (v) { bins[Math.min(k - 1, Math.floor((v - mn) / w))]++; });
      var top = Math.max.apply(null, bins);
      axes(c, W, H, l, b, t, r, mn, mx, 0, top, col.name, 'count');
      var bw = (W - l - r) / k;
      bins.forEach(function (n, i) { var h = (H - b - t) * n / top; c.fillStyle = 'rgba(139,92,246,.85)'; c.fillRect(l + i * bw + 1, H - b - h, bw - 2, h); });
      var m = ST.mean(a), X = l + (W - l - r) * (m - mn) / (mx - mn); c.strokeStyle = '#fbbf24'; c.setLineDash([6, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(X, t); c.lineTo(X, H - b); c.stroke(); c.setLineDash([]); c.fillStyle = '#fbbf24'; c.fillText('mean', X + 4, t + 12);
    }
    function preview() {
      var rows = D.rows.slice(0, 8);
      $('#dl-prev', p).innerHTML = '<table class="e21-table left"><tr>' + D.cols.map(function (c) { return '<th>' + esc(c.name) + (c.numeric ? ' <span style="color:var(--e-lime)">#</span>' : '') + '</th>'; }).join('') + '</tr>' + rows.map(function (r) { return '<tr>' + D.cols.map(function (c, j) { return '<td>' + esc(r[j]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    }
    function analyse() {
      var m = $('#dl-msg', p);
      try { D = parse($('#dl-ta', p).value); } catch (e) { m.textContent = e.message; m.style.borderColor = 'var(--e-red)'; return; }
      m.style.borderColor = ''; m.innerHTML = '<b>' + D.n + '</b> rows, <b>' + D.cols.length + '</b> columns (<b>' + D.cols.filter(function (c) { return c.numeric; }).length + '</b> numeric, marked #).';
      preview(); render();
    }
    $('#dl-go', p).addEventListener('click', analyse);
    $('#dl-s', p).addEventListener('change', function () { if (this.value) { $('#dl-ta', p).value = SETS[this.value].make(); sel = { x: 0, y: 1, h: 0 }; analyse(); } });
    $('#dl-file', p).addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      if (f.size > 3e6) { $('#dl-msg', p).textContent = 'File too large (3 MB max).'; return; }
      var fr = new FileReader(); fr.onload = function () { $('#dl-ta', p).value = String(fr.result); sel = { x: 0, y: 1, h: 0 }; analyse(); }; fr.readAsText(f);
    });
    $('#dl-ta', p).value = SETS.study.make(); $('#dl-s', p).value = 'study'; analyse();
  };
})();
