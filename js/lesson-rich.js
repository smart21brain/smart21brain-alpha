/* Smart21Brain — lesson-rich.js
   Turns a lesson's plain-text "body" into a modern lesson page: headings,
   bullets, tables, coloured callout boxes (Example / Tip / Remember / Careful),
   "Try it" questions with a reveal-answer button, code blocks and built-in
   diagrams (fraction bars, pies, number lines, arrays, flows, cycles, charts,
   mind maps, timelines). Everything is escaped first, so lesson text can never
   inject HTML. Old plain-text lessons still render fine.

   Markup cheat-sheet (one item per line):
     ## Big heading          ### Small heading
     - bullet                1. numbered step
     > Example: ...          > Tip: ...   > Remember: ...   > Careful: ...
     > Try it: question || answer
     | a | b |  (table; a |---|---| line after the first row makes it a header)
     ```  (code block, closed by another ```)
     {{bar 3/8}} {{pie 3/4}} {{bars 1/2 2/4 4/8}} {{line 4 1/4 3/4 max=2}}
     {{array 3 4}} {{flow A > B > C}} {{cycle A > B > C}} {{chart Mon:3 Tue:5}}
     {{mind Centre | a | b | c}} {{stack Top | Middle | Bottom}} {{timeline A | B | C}}
     {{anat heart}}  (planes cavities membrane neuron actionpotential synapse sarcomere
                      heart ecg circulation alveolus oxyhb nephron gi reflex)
     **bold**  `code`
*/
(function () {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var inline = function (s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  };
  var frac = function (t) {
    var m = /^(-?\d+)\s*\/\s*(\d+)$/.exec(String(t).trim());
    return m ? { n: +m[1], d: +m[2] } : null;
  };
  var fracLabel = function (n, d) { return n + '/' + d; };
  var svg = function (w, h, inner, label) {
    return '<figure class="rc-diagram"><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(label || 'Diagram') + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg></figure>';
  };

  /* ---------- diagram generators ---------- */
  var D = {};

  D.bar = function (args) {
    var f = frac(args[0]); if (!f || !f.d || f.d > 24) return '';
    var W = 380, H = 78, x0 = 10, bw = W - 20, pw = bw / f.d, out = '';
    for (var i = 0; i < f.d; i++) {
      out += '<rect x="' + (x0 + i * pw) + '" y="8" width="' + pw + '" height="40" class="' + (i < f.n ? 'd-fill' : 'd-empty') + '"/>';
    }
    out += '<text x="' + W / 2 + '" y="68" class="d-text d-big" text-anchor="middle">' + fracLabel(f.n, f.d) + '</text>';
    return svg(W, H, out, f.n + ' out of ' + f.d + ' equal parts shaded');
  };

  D.bars = function (args) {
    var rows = args.map(frac).filter(Boolean).slice(0, 6); if (!rows.length) return '';
    var W = 380, rowH = 46, H = rows.length * rowH + 8, x0 = 56, bw = W - x0 - 10, out = '';
    rows.forEach(function (f, r) {
      var y = 6 + r * rowH, pw = bw / f.d;
      out += '<text x="4" y="' + (y + 26) + '" class="d-text">' + fracLabel(f.n, f.d) + '</text>';
      for (var i = 0; i < f.d; i++) {
        out += '<rect x="' + (x0 + i * pw) + '" y="' + y + '" width="' + pw + '" height="34" class="' + (i < f.n ? 'd-fill' : 'd-empty') + '"/>';
      }
    });
    return svg(W, H, out, 'Fraction bars compared');
  };

  D.pie = function (args) {
    var f = frac(args[0]); if (!f || !f.d || f.d > 24) return '';
    var cx = 90, cy = 90, r = 76, out = '';
    for (var i = 0; i < f.d; i++) {
      var cls = i < f.n ? 'd-fill' : 'd-empty';
      if (f.d === 1) { out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="' + cls + '"/>'; break; }
      var a0 = (i / f.d) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / f.d) * 2 * Math.PI - Math.PI / 2;
      var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      out += '<path d="M' + cx + ' ' + cy + ' L' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > Math.PI ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Z" class="' + cls + '"/>';
    }
    out += '<text x="190" y="102" class="d-text d-big">' + fracLabel(f.n, f.d) + '</text>';
    return svg(300, 180, out, f.n + ' out of ' + f.d + ' slices shaded');
  };

  D.line = function (args) {
    var d = parseInt(args[0], 10) || 4, max = 1, marks = [];
    args.slice(1).forEach(function (a) {
      var m = /^max=(\d+)$/.exec(a);
      if (m) { max = Math.min(+m[1], 4); return; }
      var f = frac(a); if (f) marks.push(f);
    });
    var W = 400, x0 = 24, len = W - 48, ticks = d * max, out = '';
    out += '<line x1="' + x0 + '" y1="50" x2="' + (x0 + len) + '" y2="50" class="d-line"/>';
    for (var i = 0; i <= ticks; i++) {
      var x = x0 + (i / ticks) * len, whole = i % d === 0;
      out += '<line x1="' + x + '" y1="' + (whole ? 38 : 43) + '" x2="' + x + '" y2="' + (whole ? 62 : 57) + '" class="d-line"/>';
      if (whole) out += '<text x="' + x + '" y="82" class="d-text" text-anchor="middle">' + (i / d) + '</text>';
    }
    marks.forEach(function (f) {
      var x = x0 + (f.n / f.d / max) * len;
      out += '<circle cx="' + x + '" cy="50" r="7" class="d-dot"/>' +
        '<text x="' + x + '" y="26" class="d-text d-mark" text-anchor="middle">' + fracLabel(f.n, f.d) + '</text>';
    });
    return svg(W, 96, out, 'Number line divided into ' + d + ' equal steps');
  };

  D.array = function (args) {
    var r = Math.min(parseInt(args[0], 10) || 3, 12), c = Math.min(parseInt(args[1], 10) || 4, 12), out = '';
    var step = 28, W = Math.max(c * step + 24, 190), H = r * step + 44;
    for (var i = 0; i < r; i++) for (var j = 0; j < c; j++) {
      out += '<circle cx="' + (22 + j * step) + '" cy="' + (18 + i * step) + '" r="10" class="d-fill"/>';
    }
    out += '<text x="' + W / 2 + '" y="' + (H - 8) + '" class="d-text d-big" text-anchor="middle">' + r + ' × ' + c + ' = ' + (r * c) + '</text>';
    return svg(W, H, out, r + ' rows of ' + c);
  };

  var wrapSvgText = function (t, n) {
    var words = String(t).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  };
  var tspans = function (lines, x, y0, lh) {
    return lines.map(function (l, i) { return '<tspan x="' + x + '" y="' + (y0 + i * lh).toFixed(1) + '">' + esc(l) + '</tspan>'; }).join('');
  };

  D.flow = function (args) {
    var items = args.slice(0, 7); if (!items.length) return '';
    return '<figure class="rc-diagram"><div class="rc-flow">' + items.map(function (t, i) {
      return '<span class="rc-flow-box"><b>' + (i + 1) + '</b>' + inline(t) + '</span>' + (i < items.length - 1 ? '<i class="rc-flow-arrow" aria-hidden="true">→</i>' : '');
    }).join('') + '</div></figure>';
  };

  D.stack = function (args) {
    return '<figure class="rc-diagram"><div class="rc-stack">' + args.slice(0, 8).map(function (t) {
      return '<div class="rc-stack-row">' + inline(t) + '</div>';
    }).join('') + '</div></figure>';
  };

  D.timeline = function (args) {
    return '<figure class="rc-diagram"><ol class="rc-timeline">' + args.slice(0, 8).map(function (t) {
      return '<li>' + inline(t) + '</li>';
    }).join('') + '</ol></figure>';
  };

  D.cycle = function (args) {
    var items = args.slice(0, 8), n = items.length; if (n < 2) return '';
    var W = 380, H = 300, cx = W / 2, cy = H / 2, R = 104, out = '';
    out += '<defs><marker id="rcArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="d-arrow"/></marker></defs>';
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 2 * Math.PI - Math.PI / 2, b = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      var mid = (a + b) / 2 + (b < a ? Math.PI : 0);
      var ax = cx + R * Math.cos(a + 0.34), ay = cy + R * Math.sin(a + 0.34);
      var bx = cx + R * Math.cos(b - 0.34), by = cy + R * Math.sin(b - 0.34);
      out += '<path d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + bx.toFixed(1) + ' ' + by.toFixed(1) + '" class="d-curve" marker-end="url(#rcArr)"/>';
    }
    items.forEach(function (t, i) {
      var a = (i / n) * 2 * Math.PI - Math.PI / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      var ls = wrapSvgText(t, 9);
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="32" class="d-node"/>' +
        '<text class="d-text d-small" text-anchor="middle">' + tspans(ls, x.toFixed(1), y + 4 - (ls.length - 1) * 6, 12) + '</text>';
    });
    return svg(W, H, out, 'A cycle: ' + items.join(', then '));
  };

  D.chart = function (args) {
    var rows = args.map(function (a) { var p = a.split(':'); return { l: p[0].trim(), v: parseFloat(p[1]) }; }).filter(function (r) { return !isNaN(r.v); }).slice(0, 10);
    if (!rows.length) return '';
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    var W = 400, H = 210, bw = (W - 40) / rows.length, out = '<line x1="24" y1="170" x2="' + (W - 8) + '" y2="170" class="d-line"/>';
    rows.forEach(function (r, i) {
      var h = (r.v / max) * 130, x = 30 + i * bw;
      out += '<rect x="' + x + '" y="' + (170 - h) + '" width="' + (bw - 10) + '" height="' + h + '" rx="4" class="d-fill"/>' +
        '<text x="' + (x + (bw - 10) / 2) + '" y="' + (164 - h) + '" class="d-text d-small" text-anchor="middle">' + r.v + '</text>' +
        '<text x="' + (x + (bw - 10) / 2) + '" y="190" class="d-text d-small" text-anchor="middle">' + esc(r.l) + '</text>';
    });
    return svg(W, H, out, 'Bar chart');
  };

  D.mind = function (args) {
    var centre = args[0] || '', leaves = args.slice(1, 9), n = leaves.length; if (!centre) return '';
    var W = 400, H = 280, cx = W / 2, cy = H / 2, R = 104, out = '';
    leaves.forEach(function (t, i) {
      var a = (i / n) * 2 * Math.PI - Math.PI / 2, x = cx + R * 1.18 * Math.cos(a), y = cy + R * 0.98 * Math.sin(a);
      var ls = wrapSvgText(t, 13);
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="d-line"/>' +
        '<rect x="' + (x - 46).toFixed(1) + '" y="' + (y - 17).toFixed(1) + '" width="92" height="34" rx="10" class="d-node"/>' +
        '<text class="d-text d-small" text-anchor="middle">' + tspans(ls, x.toFixed(1), y + 4 - (ls.length - 1) * 6, 12) + '</text>';
    });
    var cl = wrapSvgText(centre, 12);
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="40" class="d-fill"/>' +
      '<text class="d-text d-light" text-anchor="middle">' + tspans(cl, cx, cy + 4 - (cl.length - 1) * 7, 14) + '</text>';
    return svg(W, H, out, 'Mind map of ' + centre);
  };

  /* ---------- anatomy & physiology diagrams: {{anat heart}} etc. ---------- */
  var A = {};
  var C = { blue: '#3b82f6', blueL: '#dbeafe', red: '#ef4444', redL: '#fee2e2', gold: '#f59e0b', goldL: '#fef3c7', green: '#10b981', greenL: '#d1fae5', purple: '#8b5cf6', purpleL: '#ede9fe', grey: '#94a3b8', greyL: '#e2e8f0', skin: '#fde7d3', skinD: '#e0a77a' };
  var MK = function () {
    var m = function (id, col) { return '<marker id="' + id + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="' + col + '"/></marker>'; };
    return '<defs>' + m('rcAb', C.blue) + m('rcAr', C.red) + m('rcAg', '#64748b') + m('rcAp', C.purple) + m('rcAk', C.green) + '</defs>';
  };
  var AM = { b: 'rcAb', r: 'rcAr', g: 'rcAg', p: 'rcAp', k: 'rcAk' }, AC = { b: C.blue, r: C.red, g: '#64748b', p: C.purple, k: C.green };
  var T = function (x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" class="d-text ' + (o.c || 'd-small') + '" text-anchor="' + (o.a || 'middle') + '"' + (o.f ? ' fill="' + o.f + '"' : '') + '>' + esc(s) + '</text>';
  };
  var Rc = function (x, y, w, h, fill, stroke, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx == null ? 8 : rx) + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="2"/>'; };
  var Ci = function (x, y, r, fill, stroke) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="2"/>'; };
  var Ln = function (x1, y1, x2, y2, col, w, dash) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (col || '#64748b') + '" stroke-width="' + (w || 2) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; };
  var Pa = function (d, fill, stroke, w, arrow, dash) {
    return '<path d="' + d + '" fill="' + (fill || 'none') + '" stroke="' + (stroke || 'none') + '" stroke-width="' + (w || 2) + '"' + (arrow ? ' marker-end="url(#' + AM[arrow] + ')"' : '') + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="round" stroke-linejoin="round"/>';
  };
  var Ar = function (x1, y1, x2, y2, k, w) { return Pa('M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2, 'none', AC[k || 'g'], w || 2.5, k || 'g'); };
  var body = function (cx, top, side) {
    var o = Ci(cx, top + 16, 16, C.skin, C.skinD) + Rc(cx - 5, top + 30, 10, 10, C.skin, C.skinD, 3);
    if (side) o += Rc(cx - 17, top + 38, 34, 96, C.skin, C.skinD, 14) + Rc(cx - 9, top + 132, 18, 74, C.skin, C.skinD, 8) + Rc(cx - 5, top + 50, 10, 70, C.skin, C.skinD, 5);
    else o += Rc(cx - 28, top + 38, 56, 96, C.skin, C.skinD, 14) + Rc(cx - 46, top + 42, 14, 82, C.skin, C.skinD, 7) + Rc(cx + 32, top + 42, 14, 82, C.skin, C.skinD, 7) + Rc(cx - 26, top + 132, 22, 76, C.skin, C.skinD, 8) + Rc(cx + 4, top + 132, 22, 76, C.skin, C.skinD, 8);
    return o;
  };

  A.planes = function () {
    var o = body(110, 30, false) + body(380, 30, true);
    o += Ln(110, 18, 110, 250, C.purple, 2.5, '6 4') + T(110, 268, 'Sagittal plane', { f: C.purple }) + T(110, 282, 'splits LEFT | RIGHT', {});
    o += Ln(40, 118, 170, 118, C.green, 2.5, '6 4') + T(176, 110, 'Transverse (axial)', { a: 'start', f: C.green }) + T(176, 124, 'splits SUPERIOR | INFERIOR', { a: 'start' });
    o += Ln(380, 18, 380, 250, C.gold, 2.5, '6 4') + T(380, 268, 'Coronal (frontal) plane', { f: '#b45309' }) + T(380, 282, 'splits ANTERIOR | POSTERIOR', {});
    o += Ar(342, 62, 312, 62, 'g') + T(324, 80, 'Anterior', {}) + Ar(418, 62, 448, 62, 'g') + T(438, 80, 'Posterior', {});
    o += T(110, 12, 'Front view', {}) + T(390, 12, 'Side view', {});
    return svg(500, 292, MK() + o, 'Body in anatomical position with sagittal, transverse and coronal planes');
  };

  A.cavities = function () {
    var o = Pa('M150 30 Q150 8 195 8 Q240 8 240 30 L240 50 Q268 60 270 100 L270 250 Q270 292 225 292 L175 292 Q130 292 130 250 L130 100 Q132 60 160 50Z', C.skin, C.skinD, 2);
    o += Ci(195, 32, 20, C.purpleL, C.purple) + Pa('M150 66 Q150 62 195 62 Q240 62 240 70 L240 148 Q240 156 195 156 Q150 156 150 148Z', C.blueL, C.blue, 2) + Pa('M146 158 Q195 140 244 158', 'none', C.gold, 3);
    o += Pa('M146 164 L244 164 L254 262 Q254 280 225 280 L165 280 Q136 280 136 262Z', C.greenL, C.green, 2) + Ln(160, 205, 230, 205, C.green, 1.5, '5 4');
    o += Ln(235, 28, 296, 28, '#64748b', 1.5) + T(302, 32, 'Cranial cavity (brain)', { a: 'start' });
    o += Ln(235, 105, 296, 105, '#64748b', 1.5) + T(302, 109, 'Thoracic cavity', { a: 'start' }) + T(302, 123, 'heart, lungs, mediastinum', { a: 'start' });
    o += Ln(244, 156, 296, 156, '#64748b', 1.5) + T(302, 160, 'Diaphragm', { a: 'start', f: '#b45309' });
    o += Ln(240, 185, 296, 185, '#64748b', 1.5) + T(302, 189, 'Abdominal cavity', { a: 'start' }) + T(302, 203, 'stomach, liver, intestines', { a: 'start' });
    o += Ln(235, 235, 296, 235, '#64748b', 1.5) + T(302, 239, 'Pelvic cavity', { a: 'start' }) + T(302, 253, 'bladder, reproductive organs', { a: 'start' });
    o += T(195, 306, 'Side (sagittal) view', {});
    return svg(520, 314, o, 'Body cavities: cranial, thoracic, abdominal and pelvic, separated by the diaphragm');
  };

  A.membrane = function () {
    var o = Rc(0, 0, 460, 96, '#eff6ff', 'none', 0) + Rc(0, 214, 460, 106, '#fff7ed', 'none', 0);
    for (var i = 0; i < 15; i++) {
      var x = 20 + i * 29; if (i >= 7 && i <= 8) continue;
      o += Ci(x, 118, 9, C.gold, '#b45309') + Ln(x - 3, 127, x - 3, 150, '#b45309', 2) + Ln(x + 3, 127, x + 3, 150, '#b45309', 2);
      o += Ci(x, 192, 9, C.gold, '#b45309') + Ln(x - 3, 183, x - 3, 160, '#b45309', 2) + Ln(x + 3, 183, x + 3, 160, '#b45309', 2);
    }
    o += Pa('M205 108 Q200 155 205 202 L255 202 Q260 155 255 108Z', C.purpleL, C.purple, 2) + T(230, 158, 'channel', {});
    o += Pa('M300 108 Q290 155 300 202 L345 202 Q355 155 345 108Z', C.greenL, C.green, 2) + T(322, 152, 'Na⁺/K⁺', {}) + T(322, 165, 'pump', {});
    o += T(8, 16, 'OUTSIDE  (high Na⁺, Cl⁻, Ca²⁺)', { a: 'start', f: C.blue }) + T(8, 238, 'INSIDE / cytosol  (high K⁺, proteins)', { a: 'start', f: '#b45309' });
    o += Ar(93, 66, 93, 228, 'g') + T(100, 44, 'Simple diffusion', { a: 'start' }) + T(100, 58, '(O₂, CO₂, lipids)', { a: 'start' });
    o += Ar(230, 66, 230, 228, 'p') + T(236, 44, 'Facilitated / ion flow', { a: 'start', f: C.purple }) + T(236, 58, '(down the gradient)', { a: 'start' });
    o += Ar(310, 222, 310, 98, 'k') + Ar(335, 98, 335, 222, 'k') + T(322, 262, 'Active transport', { f: C.green }) + T(322, 276, 'uses ATP, goes against', {}) + T(322, 290, 'the gradient', {});
    return svg(460, 316, MK() + o, 'Cell membrane: phospholipid bilayer with channel and sodium potassium pump');
  };

  A.neuron = function () {
    var o = '';
    [[40, 70, 90, 125], [28, 132, 85, 142], [38, 200, 88, 160], [96, 50, 104, 118]].forEach(function (d) { o += Ln(d[0], d[1], d[2], d[3], C.blue, 3); });
    o += Ln(66, 100, 40, 88, C.blue, 2) + Ln(66, 100, 56, 70, C.blue, 2) + Ln(60, 182, 34, 192, C.blue, 2);
    o += Ci(120, 144, 32, C.blueL, C.blue) + Ci(120, 144, 11, C.purple, '#6d28d9');
    o += Ln(152, 144, 400, 144, '#64748b', 4);
    for (var i = 0; i < 4; i++) o += Rc(175 + i * 58, 134, 44, 20, C.goldL, '#b45309', 10);
    o += Pa('M400 144 L430 114 M400 144 L434 144 M400 144 L430 174', 'none', '#64748b', 3) + Ci(436, 110, 6, C.red) + Ci(440, 144, 6, C.red) + Ci(436, 178, 6, C.red);
    o += T(12, 24, 'Dendrites (receive input)', { a: 'start' });
    o += T(96, 196, 'Cell body (soma)', {}) + T(96, 210, 'nucleus + organelles', {});
    o += Ln(158, 130, 172, 100, '#64748b', 1) + T(172, 94, 'Axon hillock (trigger zone)', { a: 'start' });
    o += Ln(300, 134, 300, 114, '#64748b', 1) + T(300, 108, 'Myelin sheath (insulates)', {});
    o += Ln(226, 150, 226, 176, '#64748b', 1) + T(214, 190, 'Node of Ranvier', { a: 'start', f: '#b45309' }) + T(214, 204, '(Na⁺ channels cluster)', { a: 'start' });
    o += T(400, 54, 'Axon terminals', { a: 'end' }) + T(400, 68, '(release transmitter)', { a: 'end' });
    o += Ar(190, 244, 380, 244, 'g') + T(285, 264, 'Direction of impulse', {});
    return svg(480, 274, o, 'Neuron with dendrites, cell body, axon, myelin sheath, nodes of Ranvier and axon terminals');
  };

  A.actionpotential = function () {
    var y = function (mv) { return 60 + (40 - mv) * 1.4615; };
    var o = Ln(70, 40, 70, 260, '#64748b', 2) + Ln(70, 260, 470, 260, '#64748b', 2);
    o += Ln(70, y(0), 470, y(0), C.grey, 1, '4 4') + Ln(70, y(-55), 470, y(-55), C.red, 1.5, '6 4') + T(474, y(-55) + 4, '-55 threshold', { a: 'start', f: C.red });
    o += T(62, y(40) + 4, '+40', { a: 'end' }) + T(62, y(0) + 4, '0', { a: 'end' }) + T(62, y(-70) + 4, '-70', { a: 'end' }) + T(62, y(-90) + 4, '-90', { a: 'end' });
    o += Pa('M70 ' + y(-70) + ' L140 ' + y(-70) + ' C150 ' + y(-70) + ' 160 ' + y(-55) + ' 170 ' + y(-55) + ' C185 ' + y(-55) + ' 188 ' + y(30) + ' 208 ' + y(30) + ' C228 ' + y(30) + ' 238 ' + y(-60) + ' 258 ' + y(-76) + ' C268 ' + y(-84) + ' 276 ' + y(-84) + ' 292 ' + y(-82) + ' C320 ' + y(-76) + ' 340 ' + y(-70) + ' 370 ' + y(-70) + ' L460 ' + y(-70), 'none', C.blue, 3.5);
    o += Ar(140, 252, 140, y(-68) + 3, 'r') + T(140, 274, 'Stimulus', { f: C.red });
    o += T(176, y(15), '1 Depolarisation', { a: 'end', f: C.red }) + T(176, y(15) + 13, 'Na⁺ rushes IN', { a: 'end' });
    o += T(208, y(30) - 10, 'Peak ≈ +30 mV', {});
    o += T(262, y(-8), '2 Repolarisation', { a: 'start', f: C.green }) + T(262, y(-8) + 13, 'K⁺ flows OUT', { a: 'start' });
    o += T(300, y(-34), '3 Hyperpolarisation', { a: 'start', f: C.purple }) + T(300, y(-34) + 13, '(K⁺ channels slow to close)', { a: 'start' });
    o += T(84, y(-70) - 8, 'Resting potential', { a: 'start' });
    o += T(16, 150, 'mV', {}) + T(270, 292, 'Time (ms)', {});
    return svg(580, 300, MK() + o, 'Action potential graph: resting potential, depolarisation, peak, repolarisation and hyperpolarisation');
  };

  A.synapse = function () {
    var o = Pa('M30 30 Q30 14 60 14 L220 14 Q250 14 250 30 L250 150 L30 150Z', C.blueL, C.blue, 2.5);
    o += Rc(30, 150, 220, 40, C.goldL, 'none', 0) + Rc(30, 190, 220, 54, C.greenL, C.green, 8);
    [[70, 50], [115, 80], [80, 108], [160, 55], [175, 100]].forEach(function (p) { o += Ci(p[0], p[1], 14, C.purpleL, C.purple) + Ci(p[0] - 3, p[1] - 3, 2.5, C.purple) + Ci(p[0] + 3, p[1] + 2, 2.5, C.purple); });
    o += Pa('M120 136 Q120 150 140 150', 'none', C.purple, 2) + Ci(130, 142, 12, C.purpleL, C.purple);
    o += Rc(196, 140, 24, 16, C.redL, C.red, 4) + T(208, 168, 'Ca²⁺', { f: C.red }) + Ar(208, 186, 208, 158, 'r');
    [[110, 188], [150, 188]].forEach(function (p) { o += Ci(p[0], p[1] - 14, 3, C.purple) + Ci(p[0] + 8, p[1] - 22, 3, C.purple); });
    o += Ar(130, 154, 130, 180, 'p');
    [70, 110, 150].forEach(function (x) { o += Pa('M' + (x - 10) + ' 190 L' + (x - 10) + ' 196 L' + (x - 3) + ' 196 L' + x + ' 204 L' + (x + 3) + ' 196 L' + (x + 10) + ' 196 L' + (x + 10) + ' 190', C.green, '#047857', 1.5); });
    o += T(140, 232, 'Postsynaptic neuron (receptors)', { f: '#047857' }) + T(140, 8, 'Presynaptic terminal', {}) + T(270, 176, 'Synaptic cleft ≈ 20 nm', { a: 'start' });
    var s = ['1  Action potential arrives', '2  Ca²⁺ enters the terminal', '3  Vesicles fuse with the', '    membrane (exocytosis)', '4  Transmitter crosses cleft', '    and binds receptors', '5  Ion channels open: EPSP', '    or IPSP in the next cell'];
    s.forEach(function (t, i) { o += T(272, 30 + i * 15, t, { a: 'start' }); });
    return svg(520, 256, o, 'Chemical synapse: calcium entry, vesicle release, transmitter binding to postsynaptic receptors');
  };

  A.sarcomere = function () {
    var row = function (yo, zl, zr, label) {
      var o = Ln(zl, yo, zl, yo + 80, '#334155', 5) + Ln(zr, yo, zr, yo + 80, '#334155', 5) + T(zl, yo - 6, 'Z', {}) + T(zr, yo - 6, 'Z', {});
      [10, 40, 70].forEach(function (d) { o += Ln(zl, yo + d, zl + 120, yo + d, C.red, 3) + Ln(zr, yo + d, zr - 120, yo + d, C.red, 3); });
      [25, 55].forEach(function (d) {
        o += Ln(140, yo + d, 320, yo + d, C.blue, 7);
        for (var k = 0; k < 5; k++) o += Ln(150 + k * 14, yo + d, 156 + k * 14, yo + d - 8, C.blue, 2) + Ln(250 + k * 14, yo + d, 244 + k * 14, yo + d + 8, C.blue, 2);
      });
      return o + T(zr + 22, yo + 44, label, { a: 'start' });
    };
    var o = row(44, 60, 400, 'Relaxed') + row(184, 100, 360, 'Contracted');
    o += Ln(140, 30, 320, 30, C.blue, 1.5) + T(230, 22, 'A band (thick filament length, constant)', { f: C.blue });
    o += Ln(60, 140, 140, 140, C.red, 1.5) + T(100, 154, 'I band', { f: C.red }) + Ln(180, 140, 280, 140, C.grey, 1.5) + T(230, 154, 'H zone', {});
    o += T(240, 288, 'Contraction: thin filaments slide toward the M line.', {}) + T(240, 303, 'I band and H zone shrink; the A band stays the same.', {}) + T(240, 318, 'Thin = actin (red)   ·   Thick = myosin (blue)', { f: '#64748b' });
    return svg(480, 326, o, 'Sarcomere relaxed and contracted showing actin and myosin filaments sliding');
  };

  A.heart = function () {
    var o = Rc(170, 120, 80, 70, C.blueL, C.blue, 16) + Rc(270, 120, 80, 70, C.redL, C.red, 16) + Rc(170, 198, 80, 100, C.blueL, C.blue, 16) + Rc(270, 198, 90, 112, C.redL, C.red, 16);
    o += T(210, 160, 'RA', { c: 'd-big' }) + T(310, 160, 'LA', { c: 'd-big' }) + T(210, 262, 'RV', { c: 'd-big' }) + T(315, 270, 'LV', { c: 'd-big' });
    o += Rc(186, 190, 48, 8, C.gold, '#b45309', 3) + T(210, 222, 'tricuspid', { f: '#b45309' }) + Rc(288, 190, 52, 8, C.gold, '#b45309', 3) + T(314, 222, 'mitral', { f: '#b45309' });
    o += Ar(210, 60, 210, 118, 'b', 4) + T(210, 40, 'Venae cavae', { f: C.blue }) + T(210, 52, '(from BODY)', {});
    o += Pa('M170 262 L110 262 L110 86', 'none', C.blue, 4, 'b') + T(110, 58, 'Pulmonary artery', { f: C.blue }) + T(110, 72, '→ to LUNGS', {}) + T(140, 280, 'pulmonary valve', { f: '#b45309' }) + Rc(166, 246, 8, 34, C.gold, '#b45309', 3);
    o += Ar(440, 156, 352, 156, 'r', 4) + T(400, 138, 'Pulmonary veins', { f: C.red }) + T(400, 180, 'from LUNGS', {});
    o += Pa('M362 270 L470 270 L470 86', 'none', C.red, 4, 'r') + T(470, 58, 'Aorta', { f: C.red }) + T(470, 72, '→ to BODY', {}) + T(420, 288, 'aortic valve', { f: '#b45309' }) + Rc(358, 254, 8, 34, C.gold, '#b45309', 3);
    o += T(260, 330, 'Blue = deoxygenated  ·  Red = oxygenated  ·  Gold = valves (one-way)', {});
    return svg(520, 340, MK() + o, 'Heart chambers, valves and the path of blood through right and left heart');
  };

  A.ecg = function () {
    var o = '';
    for (var gx = 40; gx <= 460; gx += 20) o += Ln(gx, 40, gx, 240, C.redL, 1);
    for (var gy = 40; gy <= 240; gy += 20) o += Ln(40, gy, 460, gy, C.redL, 1);
    o += Pa('M40 160 L70 160 Q88 130 106 160 L130 160 L137 172 L148 50 L160 196 L168 160 L205 160 Q240 108 275 160 L330 160 Q348 130 366 160 L390 160 L397 172 L408 50 L420 196 L428 160 L460 160', 'none', '#111827', 2.5);
    o += T(88, 122, 'P', { c: 'd-big' }) + T(148, 40, 'R', { c: 'd-big' }) + T(131, 190, 'Q', {}) + T(172, 212, 'S', {}) + T(240, 100, 'T', { c: 'd-big' });
    o += Ln(70, 30, 130, 30, C.gold, 2) + T(100, 24, 'PR interval', { f: '#b45309' }) + Ln(130, 232, 275, 232, C.purple, 2) + T(202, 226, 'QT interval', { f: C.purple });
    o += T(40, 262, 'P wave = atrial depolarisation', { a: 'start', f: C.blue }) + T(40, 276, 'QRS complex = ventricular depolarisation', { a: 'start', f: C.red }) + T(40, 290, 'T wave = ventricular repolarisation', { a: 'start', f: C.green });
    return svg(500, 300, o, 'ECG waveform with P wave, QRS complex and T wave');
  };

  A.circulation = function () {
    var node = function (x, y, w, h, fill, stroke, a, b) { return Rc(x - w / 2, y - h / 2, w, h, fill, stroke, 14) + T(x, y - 2, a, {}) + T(x, y + 13, b || '', {}); };
    var o = node(230, 46, 150, 54, C.purpleL, C.purple, 'LUNGS', 'gas exchange') + node(230, 254, 190, 54, C.goldL, '#b45309', 'BODY TISSUES', 'O₂ delivered, CO₂ collected') + node(80, 150, 120, 66, C.blueL, C.blue, 'RIGHT HEART', 'RA → RV') + node(380, 150, 120, 66, C.redL, C.red, 'LEFT HEART', 'LA → LV');
    o += Pa('M90 117 Q100 60 150 50', 'none', C.blue, 3.5, 'b') + T(36, 70, 'Pulmonary', { f: C.blue }) + T(36, 83, 'arteries', { f: C.blue });
    o += Pa('M310 50 Q360 60 370 117', 'none', C.red, 3.5, 'r') + T(424, 70, 'Pulmonary', { f: C.red }) + T(424, 83, 'veins', { f: C.red });
    o += Pa('M380 183 Q370 240 326 254', 'none', C.red, 3.5, 'r') + T(430, 224, 'Aorta &', { f: C.red }) + T(430, 237, 'arteries', { f: C.red });
    o += Pa('M135 254 Q90 240 80 183', 'none', C.blue, 3.5, 'b') + T(36, 224, 'Venae', { f: C.blue }) + T(36, 237, 'cavae', { f: C.blue });
    o += T(230, 124, 'PULMONARY circuit', { f: C.purple }) + T(230, 137, 'low pressure', {}) + T(230, 168, 'SYSTEMIC circuit', { f: '#b45309' }) + T(230, 181, 'high pressure', {});
    return svg(480, 292, MK() + o, 'Pulmonary and systemic circulation in series');
  };

  A.alveolus = function () {
    var o = Ci(140, 150, 100, '#f0f9ff', C.blue) + T(140, 36, 'ALVEOLUS', { f: C.blue }) + T(140, 144, 'PO₂ ≈ 104 mmHg', {}) + T(140, 160, 'PCO₂ ≈ 40 mmHg', {});
    o += Rc(250, 40, 14, 220, C.goldL, '#b45309', 7) + Rc(330, 40, 14, 220, C.goldL, '#b45309', 7) + Rc(264, 40, 66, 220, C.redL, 'none', 0);
    [80, 150, 220].forEach(function (y) { o += '<ellipse cx="297" cy="' + y + '" rx="22" ry="9" fill="' + C.red + '" opacity=".75"/>'; });
    o += T(297, 28, 'CAPILLARY', { f: C.red }) + T(297, 282, 'PO₂ ≈ 40, PCO₂ ≈ 45', {}) + T(297, 296, '(venous blood arriving)', {});
    o += Ar(222, 104, 268, 104, 'b', 3) + T(244, 94, 'O₂', { f: C.blue }) + Ar(268, 204, 222, 204, 'r', 3) + T(244, 222, 'CO₂', { f: C.red });
    o += Ln(257, 160, 372, 160, '#64748b', 1) + T(378, 128, 'Respiratory membrane', { a: 'start', f: '#b45309' }) + T(378, 144, '≈ 0.5 µm thick:', { a: 'start' }) + T(378, 172, 'type I pneumocyte', { a: 'start' }) + T(378, 186, '+ fused basement', { a: 'start' }) + T(378, 200, 'membranes', { a: 'start' }) + T(378, 214, '+ capillary endothelium', { a: 'start' });
    return svg(560, 306, MK() + o, 'Gas exchange between alveolus and pulmonary capillary across the respiratory membrane');
  };

  A.oxyhb = function () {
    var X = function (p) { return 60 + p * 3.6; }, Y = function (s) { return 250 - s * 190; };
    var curve = function (p50, col, dash) {
      var d = ''; for (var p = 0; p <= 100; p += 4) { var s = Math.pow(p, 2.7) / (Math.pow(p50, 2.7) + Math.pow(p, 2.7)); d += (p ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(s).toFixed(1); }
      return Pa(d, 'none', col, 3.5, null, dash);
    };
    var o = Ln(60, 40, 60, 250, '#64748b', 2) + Ln(60, 250, 430, 250, '#64748b', 2);
    [0, 50, 100].forEach(function (v) { o += T(52, Y(v / 100) + 4, v + '%', { a: 'end' }); });
    [0, 20, 40, 60, 80, 100].forEach(function (p) { o += T(X(p), 266, String(p), {}); });
    o += curve(26, C.blue) + curve(37, C.red, '7 5') + curve(19, C.green, '2 4');
    o += Ln(X(40), 250, X(40), Y(0.75), C.grey, 1.5, '4 4') + Ln(60, Y(0.75), X(40), Y(0.75), C.grey, 1.5, '4 4') + Ci(X(40), Y(0.75), 5, C.blue) + T(X(40) + 10, Y(0.75) + 18, 'Venous ≈ 75%', { a: 'start' });
    o += Ci(X(100), Y(0.975), 5, C.blue) + T(X(100) - 6, Y(0.975) - 12, 'Arterial ≈ 97%', { a: 'end' });
    o += T(245, 288, 'PO₂ (mmHg)', {}) + T(22, 150, 'Hb saturation', {}).replace('<text', '<text transform="rotate(-90 22 150)"');
    o += T(270, 168, 'Right shift (dashed red):', { a: 'start', f: C.red }) + T(270, 181, '↑CO₂  ↑H⁺  ↑temperature  ↑2,3-BPG', { a: 'start' }) + T(270, 194, '→ Hb releases more O₂', { a: 'start' });
    o += T(270, 214, 'Left shift (dotted green):', { a: 'start', f: C.green }) + T(270, 227, '↓CO₂  ↓H⁺  ↓temp, fetal Hb, CO', { a: 'start' }) + T(270, 240, '→ Hb holds O₂ tighter', { a: 'start' }).replace('y="240"', 'y="240"');
    return svg(520, 296, o, 'Oxygen hemoglobin dissociation curve with right and left shifts');
  };

  A.nephron = function () {
    var badge = function (x, y, n) { return Ci(x, y, 10, '#fff', '#334155') + T(x, y + 4, String(n), { f: '#334155' }); };
    var o = Ci(80, 60, 28, C.redL, C.red) + Ci(80, 60, 12, C.red, 'none') + T(10, 16, "Glomerulus + Bowman's capsule", { a: 'start' });
    o += Pa('M80 88 L80 96 Q60 106 80 116 Q100 126 80 136 Q60 146 80 156 L80 168', 'none', C.blue, 8);
    o += Pa('M80 168 L80 270 Q80 292 110 292 Q140 292 140 270 L140 230', 'none', C.gold, 8);
    o += Pa('M140 230 L140 108 Q140 96 156 96 L240 96 L240 118', 'none', C.green, 8);
    o += Pa('M240 118 Q222 128 240 138 Q258 148 240 158 Q222 168 240 178 L240 196 L330 196', 'none', C.purple, 8);
    o += Pa('M330 40 L330 282', 'none', C.red, 10) + Ar(330, 268, 330, 308, 'r', 3);
    o += badge(48, 126, 1) + badge(48, 230, 2) + badge(168, 150, 3) + badge(272, 148, 4) + badge(306, 100, 5);
    o += T(110, 322, 'Loop of Henle', { f: '#b45309' }) + T(330, 324, 'to renal pelvis', {});
    var L = [['1', C.blue, 'PCT: ~65% of Na⁺ and', 'water; ALL glucose and', 'amino acids reabsorbed'], ['2', '#b45309', 'Descending limb:', 'water leaves (permeable),', 'filtrate gets concentrated'], ['3', C.green, 'Thick ascending limb:', 'Na⁺ K⁺ 2Cl⁻ out (NKCC2),', 'water-tight; loop diuretics'], ['4', C.purple, 'DCT: Na⁺ Cl⁻ in (thiazides);', 'Ca²⁺ via PTH'], ['5', C.red, 'Collecting duct: ADH →', 'aquaporin-2 (water);', 'aldosterone → Na⁺ in']];
    var yy = 40;
    L.forEach(function (it) {
      o += badge(364, yy - 3, it[0]);
      for (var k = 2; k < it.length; k++) o += T(380, yy + (k - 2) * 13, it[k], { a: 'start', f: k === 2 ? it[1] : undefined });
      yy += (it.length - 2) * 13 + 22;
    });
    return svg(560, 330, MK() + o, 'Nephron segments from glomerulus to collecting duct with major functions');
  };

  A.gi = function () {
    var box = function (x, y, w, fill, stroke, a, b, c) { return Rc(x, y, w, 62, fill, stroke, 12) + T(x + w / 2, y + 20, a, { f: stroke }) + T(x + w / 2, y + 36, b, {}) + T(x + w / 2, y + 50, c || '', {}); };
    var o = box(10, 24, 112, C.goldL, '#b45309', 'MOUTH', 'amylase, lipase', 'chewing') + box(144, 24, 112, C.greenL, C.green, 'ESOPHAGUS', 'peristalsis', 'to stomach') + box(278, 24, 112, C.redL, C.red, 'STOMACH', 'HCl, pepsin, IF', 'pH 1–3') + box(412, 24, 112, C.purpleL, C.purple, 'DUODENUM', 'bile + pancreatic', 'juice, pH rises');
    o += Ar(122, 55, 144, 55, 'g') + Ar(256, 55, 278, 55, 'g') + Ar(390, 55, 412, 55, 'g');
    o += box(412, 124, 112, C.blueL, C.blue, 'JEJUNUM / ILEUM', 'absorbs nutrients', 'B₁₂ in ileum') + box(278, 124, 112, C.greenL, C.green, 'LARGE GUT', 'water & ions', 'gut bacteria') + box(144, 124, 112, C.goldL, '#b45309', 'RECTUM', 'stores faeces', 'defecation');
    o += Ar(468, 86, 468, 124, 'g') + Ar(412, 155, 390, 155, 'g') + Ar(278, 155, 256, 155, 'g');
    o += box(10, 224, 170, '#fef2f2', '#b91c1c', 'LIVER + GALLBLADDER', 'bile → duodenum', 'metabolism, detox') + box(196, 224, 150, C.goldL, '#b45309', 'PANCREAS', 'enzymes + HCO₃⁻ → gut', 'insulin, glucagon → blood') + box(362, 224, 162, C.greenL, C.green, 'SMALL-GUT WALL', 'villi + microvilli', 'huge surface area');
    o += T(266, 214, 'Accessory organs', { f: '#64748b' });
    return svg(540, 296, MK() + o, 'Digestive tract from mouth to rectum with accessory organs');
  };

  A.reflex = function () {
    var o = '<ellipse cx="260" cy="170" rx="80" ry="64" fill="' + C.greyL + '" stroke="#64748b" stroke-width="2"/>';
    o += Pa('M222 154 Q205 126 228 118 Q248 132 256 152 L264 152 Q272 132 292 118 Q315 126 298 154 Q292 170 298 186 Q315 214 292 222 Q272 208 264 190 L256 190 Q248 208 228 222 Q205 214 222 186 Q228 170 222 154Z', C.purpleL, C.purple, 2);
    o += T(352, 112, 'Dorsal (posterior) horn', { a: 'start', f: C.purple }) + T(352, 262, 'Ventral (anterior) horn', { a: 'start', f: C.green }) + T(260, 176, 'grey matter', {});
    o += Ci(60, 80, 12, C.blueL, C.blue) + T(60, 40, 'Receptor', { f: C.blue }) + T(60, 54, '(muscle spindle)', {}) + T(14, 112, '1  Stretch detected', { a: 'start' });
    o += Pa('M72 80 L150 80 Q200 80 236 124', 'none', C.blue, 3.5, 'b') + T(130, 66, '2  Sensory neuron (dorsal root)', { a: 'start', f: C.blue });
    o += Pa('M240 128 L252 162 L244 196', 'none', C.purple, 2.5, null, '4 3') + Ci(240, 128, 4, C.purple) + T(364, 140, '3  Synapse in the cord', { a: 'start', f: C.purple }) + Ln(300, 150, 360, 142, '#64748b', 1);
    o += Pa('M240 204 Q214 276 130 276 L104 276', 'none', C.green, 3.5, 'k') + T(190, 306, '4  Motor neuron (ventral root)', { f: C.green });
    o += Rc(10, 254, 92, 44, C.goldL, '#b45309', 8) + T(56, 272, 'Effector', { f: '#b45309' }) + T(56, 287, '5  contracts', {});
    o += T(364, 200, 'The brain is told as well,', { a: 'start' }) + T(364, 214, 'but the reflex does not', { a: 'start' }) + T(364, 228, 'wait for it (fast, protective).', { a: 'start' });
    return svg(540, 318, MK() + o, 'Reflex arc: receptor, sensory neuron, spinal cord interneuron, motor neuron and effector');
  };

  D.anat = function (args) {
    var f = A[String(args[0] || '').toLowerCase()];
    return f ? f() : '';
  };

  var diagram = function (spec) {
    var m = /^(\w+)\s*(.*)$/.exec(spec.trim()); if (!m || !D[m[1]]) return '';
    var rest = m[2], args;
    if (/^(flow|cycle)$/.test(m[1])) args = rest.split('>').map(function (s) { return s.trim(); }).filter(Boolean);
    else if (/^(mind|stack|timeline)$/.test(m[1])) args = rest.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    else args = rest.split(/\s+/).filter(Boolean);
    try { return D[m[1]](args); } catch (e) { return ''; }
  };

  /* ---------- block parser ---------- */
  var CALLOUTS = {
    'example': ['rc-example', 'fa-lightbulb', 'Example'],
    'tip': ['rc-tip', 'fa-wand-magic-sparkles', 'Tip'],
    'remember': ['rc-remember', 'fa-bookmark', 'Remember'],
    'key idea': ['rc-remember', 'fa-key', 'Key idea'],
    'careful': ['rc-careful', 'fa-triangle-exclamation', 'Careful'],
    'real life': ['rc-example', 'fa-earth-africa', 'Real life']
  };

  function render(body) {
    var lines = String(body || '').replace(/\r/g, '').split('\n'), html = [], i = 0;
    var isSpecial = function (l) { return /^\s*(#{2,3}\s|[-•]\s|\d+\.\s|>\s?|\||```|\{\{)/.test(l); };

    while (i < lines.length) {
      var line = lines[i], t = line.trim();
      if (!t) { i++; continue; }

      if (/^```/.test(t)) {
        var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) { code.push(lines[i]); i++; }
        i++; html.push('<pre class="rc-code"><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      var dm = /^\{\{(.+)\}\}$/.exec(t);
      if (dm) { html.push(diagram(dm[1])); i++; continue; }
      var hm = /^(#{2,3})\s+(.*)$/.exec(t);
      if (hm) { html.push(hm[1].length === 2 ? '<h3 class="rc-h">' + inline(hm[2]) + '</h3>' : '<h4 class="rc-h2">' + inline(hm[2]) + '</h4>'); i++; continue; }

      if (/^[-•]\s/.test(t)) {
        var ul = [];
        while (i < lines.length && /^\s*[-•]\s/.test(lines[i])) { ul.push('<li>' + inline(lines[i].trim().replace(/^[-•]\s+/, '')) + '</li>'); i++; }
        html.push('<ul class="rc-list">' + ul.join('') + '</ul>'); continue;
      }
      if (/^\d+\.\s/.test(t)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) { ol.push('<li>' + inline(lines[i].trim().replace(/^\d+\.\s+/, '')) + '</li>'); i++; }
        html.push('<ol class="rc-list rc-steps">' + ol.join('') + '</ol>'); continue;
      }
      if (/^\|/.test(t)) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i].trim()); i++; }
        var cells = function (r) { return r.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var hasHead = rows.length > 1 && /^\|?[\s:|-]+\|?$/.test(rows[1]) && /-/.test(rows[1]);
        var out = '<div class="rc-table-wrap"><table class="rc-table">';
        rows.forEach(function (r, ri) {
          if (hasHead && ri === 1) return;
          var tag = hasHead && ri === 0 ? 'th' : 'td';
          out += '<tr>' + cells(r).map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>';
        });
        html.push(out + '</table></div>'); continue;
      }
      if (/^>/.test(t)) {
        var q = [];
        var KW = /^>\s*(Try it|Example|Tip|Remember|Key idea|Careful|Real life)\s*:/i;
        q.push(lines[i].trim().replace(/^>\s?/, '')); i++;
        while (i < lines.length && /^\s*>/.test(lines[i]) && !KW.test(lines[i].trim())) { q.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
        var text = q.join('\n'), cm = /^(Try it|Example|Tip|Remember|Key idea|Careful|Real life)\s*:\s*([\s\S]*)$/i.exec(text);
        if (cm && cm[1].toLowerCase() === 'try it') {
          var parts = cm[2].split('||'), ans = (parts[1] || '').trim();
          html.push('<div class="rc-box rc-try"><div class="rc-box-title"><i class="fa-solid fa-pencil"></i> Try it</div><p>' + inline(parts[0].trim()).replace(/\n/g, '<br>') + '</p>' +
            (ans ? '<details><summary>Show the answer</summary><div class="rc-answer">' + inline(ans).replace(/\n/g, '<br>') + '</div></details>' : '') + '</div>');
        } else if (cm) {
          var c = CALLOUTS[cm[1].toLowerCase()];
          html.push('<div class="rc-box ' + c[0] + '"><div class="rc-box-title"><i class="fa-solid ' + c[1] + '"></i> ' + c[2] + '</div><p>' + inline(cm[2]).replace(/\n/g, '<br>') + '</p></div>');
        } else {
          html.push('<div class="rc-box rc-remember"><p>' + inline(text).replace(/\n/g, '<br>') + '</p></div>');
        }
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !isSpecial(lines[i])) { para.push(lines[i].trim()); i++; }
      if (para.length) html.push('<p class="rc-p">' + para.map(inline).join('<br>') + '</p>');
      else i++;
    }
    return html.join('\n');
  }

  window.S21Rich = { render: render, diagram: diagram };
})();
