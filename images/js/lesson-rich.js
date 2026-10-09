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
