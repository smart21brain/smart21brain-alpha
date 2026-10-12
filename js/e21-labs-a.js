/* Electron21 — labs A: Logic Lab, Circuit Lab, Colour Code */
(function () {
  'use strict';
  var E = window.E21; if (!E) return;
  var $ = E.$, $$ = E.$$, esc = E.esc;

  function head(title, text, extra) {
    return '<div class="e21-lab-head"><div><h3>' + title + '</h3><p>' + text + '</p></div>' + (extra || '') + '</div>';
  }
  function seg(id, items, active) {
    return '<div class="e21-seg" id="' + id + '" role="group">' + items.map(function (it) {
      return '<button type="button" data-v="' + it[0] + '" aria-pressed="' + (it[0] === active) + '">' + it[1] + '</button>';
    }).join('') + '</div>';
  }
  function bindSeg(root, cb) {
    $$('button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        cb(b.dataset.v);
      });
    });
  }
  E.head = head; E.seg = seg; E.bindSeg = bindSeg;

  /* =====================================================================
     LOGIC LAB
     ===================================================================== */
  var GATES = {
    AND: { f: function (a, b) { return a & b; }, expr: 'Y = A · B', info: 'Output is 1 only when BOTH inputs are 1. Like two switches in series.' },
    OR: { f: function (a, b) { return a | b; }, expr: 'Y = A + B', info: 'Output is 1 when AT LEAST ONE input is 1. Like two switches in parallel.' },
    NOT: { f: function (a) { return a ? 0 : 1; }, expr: "Y = A'", info: 'The inverter: output is the opposite of the input.', single: true },
    NAND: { f: function (a, b) { return (a & b) ? 0 : 1; }, expr: "Y = (A · B)'", info: 'AND followed by NOT. A universal gate: every circuit can be built from NANDs.' },
    NOR: { f: function (a, b) { return (a | b) ? 0 : 1; }, expr: "Y = (A + B)'", info: 'OR followed by NOT. Also a universal gate.' },
    XOR: { f: function (a, b) { return a ^ b; }, expr: 'Y = A ⊕ B', info: 'Output is 1 when the inputs are DIFFERENT. It is the sum bit of a half adder.' },
    XNOR: { f: function (a, b) { return (a ^ b) ? 0 : 1; }, expr: 'Y = (A ⊕ B)\'', info: 'Output is 1 when the inputs are the SAME (an equality detector).' }
  };
  var SHAPES = {
    AND: 'M90 25 H140 A50 50 0 0 1 140 125 H90 Z',
    NAND: 'M90 25 H140 A50 50 0 0 1 140 125 H90 Z',
    OR: 'M88 25 Q135 25 190 75 Q135 125 88 125 Q118 75 88 25 Z',
    NOR: 'M88 25 Q135 25 190 75 Q135 125 88 125 Q118 75 88 25 Z',
    XOR: 'M92 25 Q139 25 194 75 Q139 125 92 125 Q122 75 92 25 Z',
    XNOR: 'M92 25 Q139 25 194 75 Q139 125 92 125 Q122 75 92 25 Z',
    NOT: 'M90 35 L90 115 L172 75 Z'
  };

  E.labs.logic = function (p) {
    var st = { mode: 'gate', gate: 'AND', a: 0, b: 0, A: [0, 1, 0, 1], B: [0, 1, 1, 0], cin: 0 };
    p.innerHTML = head('Logic Lab', 'Flip the switches and watch the gate respond. Then add two 4-bit numbers with a ripple-carry adder built from the same gates.',
      seg('lg-mode', [['gate', 'Single gate'], ['adder', '4-bit adder']], 'gate')) + '<div id="lg-body"></div>';
    bindSeg($('#lg-mode', p), function (v) { st.mode = v; render(); });
    var body = $('#lg-body', p);

    function render() { st.mode === 'gate' ? gateView() : adderView(); }

    function gateView() {
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>Schematic</h4>' + seg('lg-gates', Object.keys(GATES).map(function (g) { return [g, g]; }), st.gate) +
        '<div class="e21-logic-stage mt-3"><div class="e21-switches" id="lg-sw"></div><div id="lg-svg"></div><div style="text-align:center"><div class="e21-led" id="lg-led">0</div><small class="mono" style="color:var(--e-soft)">Y</small></div></div>' +
        '<p class="e21-note" id="lg-info"></p></div>' +
        '<div class="e21-card"><h4>Truth table</h4><div class="mono" style="color:var(--e-lime);margin-bottom:.6rem" id="lg-expr"></div><div id="lg-table"></div></div></div>';
      bindSeg($('#lg-gates', body), function (v) { st.gate = v; draw(); });
      draw();
    }
    function draw() {
      var g = GATES[st.gate], single = !!g.single, a = st.a, b = single ? 0 : st.b, y = g.f(a, b);
      $('#lg-sw', body).innerHTML = swHtml('A', a, 'a') + (single ? '' : swHtml('B', b, 'b'));
      $$('.e21-sw', body).forEach(function (s) { s.addEventListener('click', function () { st[s.dataset.k] = st[s.dataset.k] ? 0 : 1; draw(); }); });
      var bub = /^(NAND|NOR|XNOR|NOT)$/.test(st.gate), tipX = st.gate === 'NOT' ? 172 : (st.gate === 'AND' || st.gate === 'NAND') ? 190 : (st.gate === 'XOR' || st.gate === 'XNOR') ? 194 : 190;
      var outX = bub ? tipX + 12 : tipX;
      var svg = '<svg class="e21-gate-svg" viewBox="0 0 300 150" role="img" aria-label="' + st.gate + ' gate, A=' + a + (single ? '' : ', B=' + b) + ', output ' + y + '">';
      if (single) svg += '<line class="w ' + (a ? 'hi' : '') + '" x1="0" y1="75" x2="90" y2="75"/><text x="2" y="65">A</text>';
      else svg += '<line class="w ' + (a ? 'hi' : '') + '" x1="0" y1="45" x2="100" y2="45"/><line class="w ' + (b ? 'hi' : '') + '" x1="0" y1="105" x2="100" y2="105"/><text x="2" y="35">A</text><text x="2" y="125">B</text>';
      if (st.gate === 'XOR' || st.gate === 'XNOR') svg += '<path d="M80 25 Q110 75 80 125" fill="none" stroke="#22d3ee" stroke-width="3"/>';
      svg += '<path class="body" d="' + SHAPES[st.gate] + '"/>';
      if (bub) svg += '<circle cx="' + (tipX + 6) + '" cy="75" r="6" class="body"/>';
      svg += '<line class="w ' + (y ? 'hi' : '') + '" x1="' + outX + '" y1="75" x2="300" y2="75"/><text x="278" y="65">Y</text></svg>';
      $('#lg-svg', body).innerHTML = svg;
      var led = $('#lg-led', body); led.classList.toggle('on', !!y); led.textContent = y;
      $('#lg-info', body).textContent = g.info;
      $('#lg-expr', body).textContent = g.expr;
      var rows = single ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      $('#lg-table', body).innerHTML = '<table class="e21-table"><tr>' + (single ? '<th>A</th>' : '<th>A</th><th>B</th>') + '<th>Y</th></tr>' + rows.map(function (r) {
        var on = r[0] === a && (single || r[1] === b);
        return '<tr class="' + (on ? 'on' : '') + '"><td>' + r.join('</td><td>') + '</td><td>' + g.f(r[0], r[1]) + '</td></tr>';
      }).join('') + '</table>';
    }
    function swHtml(l, v, k) {
      return '<button type="button" class="e21-sw" role="switch" data-k="' + k + '" aria-checked="' + (v === 1) + '" aria-label="Input ' + l + '"><span class="t"></span>' + l + ' = ' + v + '</button>';
    }

    /* 4-bit ripple-carry adder */
    function adderView() {
      var A = st.A, B = st.B, cin = st.cin, S = [0, 0, 0, 0], carries = [cin, 0, 0, 0, 0], i;
      for (i = 0; i < 4; i++) { // bit 0 is LSB
        var a = A[i], b = B[i], c = carries[i];
        S[i] = a ^ b ^ c; carries[i + 1] = (a & b) | (c & (a ^ b));
      }
      var val = function (arr) { return arr.reduce(function (s, v, k) { return s + v * (1 << k); }, 0); };
      var bitsRow = function (arr, name, editable, cls) {
        var h = '<div class="e21-bits">';
        for (var k = 3; k >= 0; k--) h += '<button type="button" class="e21-bit ' + (arr[k] ? 'on ' : '') + (cls || '') + '" ' + (editable ? 'data-n="' + name + '" data-i="' + k + '" aria-pressed="' + (arr[k] === 1) + '" aria-label="' + name + k + '"' : 'tabindex="-1" aria-label="' + name + k + ' = ' + arr[k] + '"') + '>' + arr[k] + '<small>' + name + k + '</small></button>';
        return h + '</div>';
      };
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>Inputs: click the bits</h4>' +
        '<div style="display:grid;gap:1rem">' +
        '<div><div class="mono" style="color:var(--e-soft);font-size:.78rem;margin-bottom:.4rem">Number A = <b style="color:var(--e-cyan)">' + val(A) + '</b></div>' + bitsRow(A, 'A', true) + '</div>' +
        '<div><div class="mono" style="color:var(--e-soft);font-size:.78rem;margin-bottom:.4rem">Number B = <b style="color:var(--e-cyan)">' + val(B) + '</b></div>' + bitsRow(B, 'B', true) + '</div>' +
        '<div><div class="mono" style="color:var(--e-soft);font-size:.78rem;margin-bottom:.4rem">Carry in</div><div class="e21-bits"><button type="button" class="e21-bit ' + (cin ? 'on' : '') + '" data-n="cin" aria-pressed="' + (cin === 1) + '" aria-label="Carry in">' + cin + '<small>Cin</small></button></div></div>' +
        '</div></div>' +
        '<div class="e21-card"><h4>Result</h4><div class="e21-kv" style="margin-bottom:1rem"><div><small>Decimal</small><b>' + val(A) + ' + ' + val(B) + (cin ? ' + 1' : '') + ' = ' + (val(S) + carries[4] * 16) + '</b></div><div><small>Binary</small><b>' + carries[4] + ' ' + S.slice().reverse().join('') + '</b></div></div>' +
        '<div class="mono" style="color:var(--e-soft);font-size:.78rem;margin-bottom:.4rem">Sum bits S3 S2 S1 S0, carry-out</div><div class="e21-bits">' + bitsRow(S, 'S', false, 'out') + '<div class="e21-bits"><button type="button" class="e21-bit out ' + (carries[4] ? 'on' : '') + '" tabindex="-1" aria-label="Carry out ' + carries[4] + '">' + carries[4] + '<small>Cout</small></button></div></div>' +
        '<p class="e21-note">Each bit position is a <b>full adder</b>: <code>S = A ⊕ B ⊕ Cin</code> and <code>Cout = A·B + Cin·(A ⊕ B)</code>. The carry ripples from bit 0 upward. Carries now: C1=' + carries[1] + ' C2=' + carries[2] + ' C3=' + carries[3] + ' C4=' + carries[4] + '.</p>' +
        (carries[4] ? '<p class="e21-note" style="border-color:var(--e-amber)">Overflow! The answer needs 5 bits. In a real 4-bit register the carry-out is lost.</p>' : '') + '</div></div>';
      $$('.e21-bit[data-n]', body).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = b.dataset.n; if (n === 'cin') st.cin = st.cin ? 0 : 1; else { var k = +b.dataset.i; st[n][k] = st[n][k] ? 0 : 1; }
          adderView();
        });
      });
    }
    render();
  };

  /* =====================================================================
     CIRCUIT LAB
     ===================================================================== */
  var E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  function nextE12(r) {
    if (!(r > 0)) return NaN;
    var dec = Math.pow(10, Math.floor(Math.log10(r))), m = r / dec;
    for (var i = 0; i < E12.length; i++) if (E12[i] >= m - 1e-9) return E12[i] * dec;
    return 10 * dec;
  }
  E.nextE12 = nextE12;

  E.labs.circuit = function (p) {
    p.innerHTML = head('Circuit Lab', 'Five calculators for the formulas you use every day. Type values with units such as <code>4.7k</code>, <code>10u</code> or <code>2.2M</code>.',
      seg('ck-mode', [['ohm', "Ohm's law"], ['sp', 'Series / parallel'], ['div', 'Divider'], ['led', 'LED resistor'], ['rc', 'RC circuit']], 'ohm')) + '<div id="ck-body"></div>';
    var body = $('#ck-body', p), view = { ohm: ohm, sp: sp, div: divider, led: led, rc: rc };
    bindSeg($('#ck-mode', p), function (v) { view[v](); });
    ohm();

    function field(id, label, val, ph) {
      return '<div class="e21-field"><label for="' + id + '">' + label + '</label><input class="e21-in" id="' + id + '" value="' + (val == null ? '' : val) + '" placeholder="' + (ph || '') + '" inputmode="decimal" autocomplete="off"></div>';
    }

    /* --- Ohm's law --- */
    function ohm() {
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>Fill in any two</h4><div class="e21-row">' +
        field('o-v', 'Voltage (V)', '', 'e.g. 9') + field('o-i', 'Current (A)', '', 'e.g. 20m') + field('o-r', 'Resistance (Ω)', '', 'e.g. 330') + field('o-p', 'Power (W)', '', 'e.g. 250m') +
        '</div><p class="e21-note">The two fields you edited last are used; the other two are calculated for you.</p><button type="button" class="e21-btn sm ghost" id="o-clr">Clear</button></div>' +
        '<div class="e21-card"><h4>What it means</h4><div id="o-out" class="e21-lead" style="font-size:.95rem">Enter two values to see the full picture.</div><svg viewBox="0 0 300 120" class="e21-chart" style="margin-top:1rem" id="o-svg"></svg></div></div>';
      var ids = { v: '#o-v', i: '#o-i', r: '#o-r', p: '#o-p' }, hist = [], vals = {};
      function calc() {
        var k = hist.slice(-2).slice().sort().join(''), a = vals[hist[hist.length - 1]], b = vals[hist[hist.length - 2]], x = vals, V, I, R, P;
        if (hist.length < 2) return;
        var h = hist.slice(-2); V = x.v; I = x.i; R = x.r; P = x.p;
        var has = function (n) { return h.indexOf(n) > -1; };
        if (has('v') && has('i')) { R = V / I; P = V * I; }
        else if (has('v') && has('r')) { I = V / R; P = V * V / R; }
        else if (has('v') && has('p')) { I = P / V; R = V * V / P; }
        else if (has('i') && has('r')) { V = I * R; P = I * I * R; }
        else if (has('i') && has('p')) { V = P / I; R = P / (I * I); }
        else if (has('r') && has('p')) { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
        var res = { v: V, i: I, r: R, p: P };
        ['v', 'i', 'r', 'p'].forEach(function (n) {
          if (h.indexOf(n) === -1) { var el = $(ids[n], body); el.value = isFinite(res[n]) ? E.plain(res[n]) : ''; el.style.borderColor = 'var(--e-lime)'; }
        });
        if ([V, I, R, P].every(isFinite)) {
          $('#o-out', body).innerHTML = 'Across <b>' + E.eng(R, 'Ω') + '</b>, <b>' + E.eng(V, 'V') + '</b> pushes <b>' + E.eng(I, 'A') + '</b> and the resistor turns <b>' + E.eng(P, 'W') + '</b> into heat.' +
            (P > 0.25 ? '<br><span style="color:var(--e-amber)">Heads up: a common ¼ W resistor can only handle 250 mW. Use a higher-power part.</span>' : '');
          var w = E.clamp(Math.log10(Math.max(I, 1e-6)) + 6, 0, 6) / 6;
          $('#o-svg', body).innerHTML = '<rect x="20" y="40" width="260" height="40" rx="8" fill="#0b1220" stroke="#1e293b"/><rect x="20" y="40" width="' + (260 * w).toFixed(0) + '" height="40" rx="8" fill="rgba(34,211,238,.35)"/><text x="150" y="65" text-anchor="middle" fill="#e6edf7" font-family="monospace" font-size="14">I = ' + E.eng(I, 'A') + '</text><text x="20" y="108" fill="#93a4bf" font-family="monospace" font-size="11">current (log scale)</text>';
        }
      }
      ['v', 'i', 'r', 'p'].forEach(function (n) {
        $(ids[n], body).addEventListener('input', function () {
          var v = E.num(this.value);
          this.style.borderColor = '';
          hist = hist.filter(function (z) { return z !== n; });
          if (isFinite(v) && v > 0) { vals[n] = v; hist.push(n); } else delete vals[n];
          calc();
        });
      });
      $('#o-clr', body).addEventListener('click', ohm);
    }

    /* --- series / parallel --- */
    function sp() {
      var rs = ['100', '220', '330'], mode = 'series';
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>Resistors</h4><div id="sp-list" class="e21-row" style="margin-bottom:.8rem"></div><div class="e21-row" style="align-items:center"><button class="e21-btn sm" id="sp-add" type="button"><i class="fa-solid fa-plus"></i> Add resistor</button>' + seg('sp-mode', [['series', 'Series'], ['parallel', 'Parallel']], 'series') + '</div></div>' +
        '<div class="e21-card"><h4>Equivalent resistance</h4><div class="e21-out" id="sp-out" style="font-size:1.6rem"></div><div id="sp-sch" style="margin-top:1rem"></div><p class="e21-note" id="sp-note"></p></div></div>';
      function paint() {
        $('#sp-list', body).innerHTML = rs.map(function (v, i) { return '<div class="e21-field" style="flex:1 1 90px"><label>R' + (i + 1) + ' (Ω)</label><div style="display:flex;gap:.3rem"><input class="e21-in" data-i="' + i + '" value="' + esc(v) + '" inputmode="decimal"><button type="button" class="e21-btn sm red" data-rm="' + i + '" aria-label="Remove R' + (i + 1) + '" ' + (rs.length <= 2 ? 'disabled' : '') + '>×</button></div></div>'; }).join('');
        $$('input[data-i]', body).forEach(function (el) { el.addEventListener('input', function () { rs[+el.dataset.i] = el.value; calc(); }); });
        $$('[data-rm]', body).forEach(function (b) { b.addEventListener('click', function () { rs.splice(+b.dataset.rm, 1); paint(); }); });
        calc();
      }
      function calc() {
        var v = rs.map(E.num), ok = v.every(function (x) { return x > 0; }), tot;
        if (!ok) { $('#sp-out', body).textContent = 'Enter positive values'; return; }
        tot = mode === 'series' ? v.reduce(function (a, b) { return a + b; }, 0) : 1 / v.reduce(function (a, b) { return a + 1 / b; }, 0);
        $('#sp-out', body).textContent = E.eng(tot, 'Ω');
        $('#sp-note', body).textContent = mode === 'series' ? 'Series: resistances add. The total is always larger than the biggest resistor.' : 'Parallel: conductances add. The total is always smaller than the smallest resistor (' + E.eng(Math.min.apply(null, v), 'Ω') + ').';
        var W = 300, h = '';
        if (mode === 'series') {
          var step = 260 / v.length; h = '<svg viewBox="0 0 300 70" class="e21-chart"><line x1="10" y1="35" x2="290" y2="35" stroke="#475569" stroke-width="3"/>';
          v.forEach(function (x, i) { var cx = 20 + step * i + step / 2; h += '<rect x="' + (cx - 24) + '" y="22" width="48" height="26" rx="4" fill="#0b1220" stroke="#fbbf24" stroke-width="2"/><text x="' + cx + '" y="39" text-anchor="middle" fill="#e6edf7" font-family="monospace" font-size="10">' + E.eng(x, '').trim() + '</text>'; });
          h += '</svg>';
        } else {
          var n = v.length, rowH = Math.min(34, 160 / n), H = rowH * n + 20; h = '<svg viewBox="0 0 300 ' + H + '" class="e21-chart"><line x1="40" y1="10" x2="40" y2="' + (H - 10) + '" stroke="#475569" stroke-width="3"/><line x1="260" y1="10" x2="260" y2="' + (H - 10) + '" stroke="#475569" stroke-width="3"/>';
          v.forEach(function (x, i) { var y = 10 + rowH * i + rowH / 2; h += '<line x1="40" y1="' + y + '" x2="260" y2="' + y + '" stroke="#475569" stroke-width="3"/><rect x="125" y="' + (y - 10) + '" width="50" height="20" rx="4" fill="#0b1220" stroke="#fbbf24" stroke-width="2"/><text x="150" y="' + (y + 4) + '" text-anchor="middle" fill="#e6edf7" font-family="monospace" font-size="10">' + E.eng(x, '').trim() + '</text>'; });
          h += '</svg>';
        }
        $('#sp-sch', body).innerHTML = h;
      }
      $('#sp-add', body).addEventListener('click', function () { if (rs.length < 8) { rs.push('1k'); paint(); } });
      bindSeg($('#sp-mode', body), function (v) { mode = v; calc(); });
      paint();
    }

    /* --- voltage divider --- */
    function divider() {
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>Voltage divider</h4><div class="e21-row">' + field('d-v', 'Vin (V)', '9') + field('d-1', 'R1 (Ω)', '10k') + field('d-2', 'R2 (Ω)', '4.7k') + '</div><p class="e21-note">Two resistors in series share the voltage in proportion to their size. A sensor in place of R2 turns a changing resistance into a changing voltage.</p></div>' +
        '<div class="e21-card"><h4>Result</h4><div class="e21-kv" id="d-out"></div><svg viewBox="0 0 300 150" class="e21-chart" style="margin-top:1rem" id="d-svg"></svg></div></div>';
      function calc() {
        var V = E.num($('#d-v', body).value), a = E.num($('#d-1', body).value), b = E.num($('#d-2', body).value);
        if (!(V >= 0 && a > 0 && b > 0)) { $('#d-out', body).innerHTML = '<div><small>Check inputs</small><b>—</b></div>'; return; }
        var I = V / (a + b), vo = V * b / (a + b);
        $('#d-out', body).innerHTML = '<div><small>Vout</small><b>' + E.eng(vo, 'V') + '</b></div><div><small>Current</small><b>' + E.eng(I, 'A') + '</b></div><div><small>Ratio</small><b>' + (b / (a + b) * 100).toFixed(1) + '%</b></div><div><small>Power</small><b>' + E.eng(V * I, 'W') + '</b></div>';
        var h1 = 120 * a / (a + b), h2 = 120 - h1;
        $('#d-svg', body).innerHTML = '<rect x="110" y="15" width="80" height="' + h1.toFixed(1) + '" fill="rgba(251,191,36,.3)" stroke="#fbbf24"/><rect x="110" y="' + (15 + h1).toFixed(1) + '" width="80" height="' + h2.toFixed(1) + '" fill="rgba(34,211,238,.3)" stroke="#22d3ee"/><text x="150" y="' + (15 + h1 / 2 + 4).toFixed(1) + '" text-anchor="middle" fill="#e6edf7" font-family="monospace" font-size="11">R1 drops ' + E.eng(V - vo, 'V') + '</text><text x="150" y="' + (15 + h1 + h2 / 2 + 4).toFixed(1) + '" text-anchor="middle" fill="#e6edf7" font-family="monospace" font-size="11">R2 drops ' + E.eng(vo, 'V') + '</text>';
      }
      $$('input', body).forEach(function (i) { i.addEventListener('input', calc); }); calc();
    }

    /* --- LED resistor --- */
    function led() {
      var LEDS = { red: 2.0, orange: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.2 };
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>LED resistor calculator</h4><div class="e21-row">' + field('l-v', 'Supply (V)', '5') + '<div class="e21-field"><label for="l-c">LED colour</label><select class="e21-sel" id="l-c">' + Object.keys(LEDS).map(function (k) { return '<option value="' + k + '">' + k + ' (≈' + LEDS[k] + ' V)</option>'; }).join('') + '</select></div>' + field('l-vf', 'Forward V (V)', '2.0') + field('l-i', 'LED current (mA)', '15') + '</div><p class="e21-note">Always put a resistor in series with an LED. Without one it draws too much current and burns out.</p></div>' +
        '<div class="e21-card"><h4>Result</h4><div class="e21-kv" id="l-out"></div><div id="l-warn"></div></div></div>';
      $('#l-c', body).addEventListener('change', function () { $('#l-vf', body).value = LEDS[this.value]; calc(); });
      function calc() {
        var Vs = E.num($('#l-v', body).value), Vf = E.num($('#l-vf', body).value), I = E.num($('#l-i', body).value) / 1000;
        if (!(Vs > 0 && Vf > 0 && I > 0)) { $('#l-out', body).innerHTML = '<div><small>Check inputs</small><b>—</b></div>'; return; }
        if (Vs <= Vf) { $('#l-out', body).innerHTML = '<div><small>Problem</small><b>Supply ≤ LED voltage</b></div>'; $('#l-warn', body).innerHTML = '<p class="e21-note" style="border-color:var(--e-red)">The supply must be higher than the LED forward voltage.</p>'; return; }
        var R = (Vs - Vf) / I, Rs = nextE12(R), Ia = (Vs - Vf) / Rs, Pr = Ia * Ia * Rs;
        $('#l-out', body).innerHTML = '<div><small>Exact R</small><b>' + E.eng(R, 'Ω') + '</b></div><div><small>Use (E12)</small><b>' + E.eng(Rs, 'Ω') + '</b></div><div><small>Real current</small><b>' + E.eng(Ia, 'A') + '</b></div><div><small>Resistor heat</small><b>' + E.eng(Pr, 'W') + '</b></div>';
        $('#l-warn', body).innerHTML = Ia > 0.02 ? '<p class="e21-note" style="border-color:var(--e-red)">Over 20 mA is above the limit of most small LEDs. Pick a larger resistor.</p>' : '<p class="e21-note">The standard value rounds <i>up</i> so the LED never gets more current than you asked for.</p>';
      }
      $$('input', body).forEach(function (i) { i.addEventListener('input', calc); }); calc();
    }

    /* --- RC circuit --- */
    function rc() {
      body.innerHTML = '<div class="e21-two"><div class="e21-card"><h4>RC charging circuit</h4><div class="e21-row">' + field('c-r', 'R (Ω)', '10k') + field('c-c', 'C (F)', '100u') + field('c-v', 'Vs (V)', '5') + '</div><div class="e21-kv mt-3" id="c-out"></div><p class="e21-note">After one time constant (τ = R × C) a charging capacitor reaches 63.2% of the supply. After 5τ it is effectively full.</p></div>' +
        '<div class="e21-card"><h4>Voltage across the capacitor</h4><canvas id="c-cv" class="e21-chart" width="640" height="340"></canvas></div></div>';
      var cv = $('#c-cv', body), cx = cv.getContext('2d'), tAnim = 0, raf = 0, par = {};
      function calc() {
        var R = E.num($('#c-r', body).value), C = E.num($('#c-c', body).value), V = E.num($('#c-v', body).value);
        if (!(R > 0 && C > 0 && V > 0)) { $('#c-out', body).innerHTML = '<div><small>Check inputs</small><b>—</b></div>'; par = null; return; }
        var tau = R * C; par = { tau: tau, V: V };
        $('#c-out', body).innerHTML = '<div><small>τ = R×C</small><b>' + E.eng(tau, 's') + '</b></div><div><small>5τ (full)</small><b>' + E.eng(5 * tau, 's') + '</b></div><div><small>Cutoff fc</small><b>' + E.eng(1 / (2 * Math.PI * tau), 'Hz') + '</b></div><div><small>Energy ½CV²</small><b>' + E.eng(0.5 * C * V * V, 'J') + '</b></div>';
        tAnim = 0; draw();
      }
      function draw() {
        var W = 640, H = 340, l = 56, r = 20, t = 20, b = 40; cx.fillStyle = '#02060d'; cx.fillRect(0, 0, W, H);
        if (!par) return;
        var T = 5 * par.tau, X = function (s) { return l + (W - l - r) * s / T; }, Y = function (v) { return H - b - (H - b - t) * v / par.V; };
        cx.strokeStyle = 'rgba(148,163,184,.15)'; cx.fillStyle = '#93a4bf'; cx.font = '11px JetBrains Mono, monospace'; cx.lineWidth = 1;
        for (var k = 0; k <= 5; k++) { cx.beginPath(); cx.moveTo(X(k * par.tau), t); cx.lineTo(X(k * par.tau), H - b); cx.stroke(); cx.fillText(k + 'τ', X(k * par.tau) - 8, H - 18); }
        [0, .25, .5, .75, 1].forEach(function (f) { cx.beginPath(); cx.moveTo(l, Y(f * par.V)); cx.lineTo(W - r, Y(f * par.V)); cx.stroke(); cx.fillText((f * par.V).toFixed(2) + ' V', 4, Y(f * par.V) + 4); });
        cx.strokeStyle = '#fbbf24'; cx.setLineDash([6, 5]); cx.beginPath(); cx.moveTo(X(par.tau), Y(0)); cx.lineTo(X(par.tau), Y(.632 * par.V)); cx.lineTo(l, Y(.632 * par.V)); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle = '#fbbf24'; cx.fillText('63.2% at 1τ', X(par.tau) + 8, Y(.632 * par.V) + 14);
        var lim = Math.min(T, tAnim); cx.strokeStyle = '#22d3ee'; cx.lineWidth = 3; cx.shadowColor = '#22d3ee'; cx.shadowBlur = 10; cx.beginPath();
        for (var s = 0; s <= lim; s += T / 200) { var y = Y(par.V * (1 - Math.exp(-s / par.tau))); s ? cx.lineTo(X(s), y) : cx.moveTo(X(s), y); }
        cx.stroke(); cx.shadowBlur = 0;
        var cy = Y(par.V * (1 - Math.exp(-lim / par.tau))); cx.fillStyle = '#a3e635'; cx.beginPath(); cx.arc(X(lim), cy, 6, 0, 7); cx.fill();
        cx.fillStyle = '#e6edf7'; cx.fillText('Vc = ' + (par.V * (1 - Math.exp(-lim / par.tau))).toFixed(3) + ' V   t = ' + E.eng(lim, 's'), W - 230, 18);
      }
      function loop() {
        if (!par || !document.body.contains(cv)) return;
        if (tAnim < 5 * par.tau) { tAnim += 5 * par.tau / (E.reduce ? 1 : 150); draw(); raf = requestAnimationFrame(loop); } else { tAnim = 5 * par.tau; draw(); }
      }
      $$('input', body).forEach(function (i) { i.addEventListener('input', function () { cancelAnimationFrame(raf); calc(); if (par) raf = requestAnimationFrame(loop); }); });
      calc(); if (par) raf = requestAnimationFrame(loop);
    }
  };

  /* =====================================================================
     RESISTOR COLOUR CODE
     ===================================================================== */
  var COL = [
    { n: 'Black', c: '#111827', d: 0, m: 1, t: null }, { n: 'Brown', c: '#7c4a21', d: 1, m: 10, t: 1 }, { n: 'Red', c: '#dc2626', d: 2, m: 100, t: 2 },
    { n: 'Orange', c: '#f97316', d: 3, m: 1e3, t: null }, { n: 'Yellow', c: '#facc15', d: 4, m: 1e4, t: null }, { n: 'Green', c: '#16a34a', d: 5, m: 1e5, t: 0.5 },
    { n: 'Blue', c: '#2563eb', d: 6, m: 1e6, t: 0.25 }, { n: 'Violet', c: '#8b5cf6', d: 7, m: 1e7, t: 0.1 }, { n: 'Grey', c: '#9ca3af', d: 8, m: 1e8, t: 0.05 },
    { n: 'White', c: '#f8fafc', d: 9, m: 1e9, t: null }, { n: 'Gold', c: '#d4a017', d: null, m: 0.1, t: 5 }, { n: 'Silver', c: '#cbd5e1', d: null, m: 0.01, t: 10 }
  ];
  E.labs.color = function (p) {
    var st = { bands: 4, b: [1, 0, 2, 10] }; // brown black red gold = 1k 5%
    p.innerHTML = E.head('Resistor Colour Code', 'Pick the colour bands to read a resistor, or type a value to see which bands to look for.', seg('rc-bands', [['4', '4-band'], ['5', '5-band']], '4')) +
      '<div class="e21-two"><div class="e21-card"><h4>Resistor</h4><svg id="rc-svg" class="e21-resistor" viewBox="0 0 420 120" role="img" aria-label="Resistor"></svg><div class="e21-row mt-3" id="rc-sel"></div></div>' +
      '<div class="e21-card"><h4>Value</h4><div class="e21-out" id="rc-val" style="font-size:2rem"></div><div class="e21-kv mt-3" id="rc-kv"></div><h4 class="mt-4">Or look up a value</h4><div class="e21-row" style="align-items:end"><div class="e21-field"><label for="rc-in">Resistance (Ω)</label><input class="e21-in" id="rc-in" placeholder="e.g. 4.7k" inputmode="decimal"></div></div><div id="rc-rev" class="e21-note"></div></div></div>';
    bindSeg($('#rc-bands', p), function (v) { st.bands = +v; st.b = st.bands === 4 ? [1, 0, 2, 10] : [1, 0, 0, 1, 1]; build(); paint(); });
    function labels() { return st.bands === 4 ? ['1st digit', '2nd digit', 'Multiplier', 'Tolerance'] : ['1st digit', '2nd digit', '3rd digit', 'Multiplier', 'Tolerance']; }
    function allowed(i) {
      var last = st.bands - 1, mult = st.bands - 2;
      return COL.map(function (c, k) { return { c: c, k: k }; }).filter(function (o) {
        if (i === last) return o.c.t != null; if (i === mult) return true; return o.c.d != null;
      });
    }
    function build() {
      $('#rc-sel', p).innerHTML = labels().map(function (l, i) {
        return '<div class="e21-field" style="flex:1 1 130px"><label for="rc-b' + i + '">' + l + '</label><select class="e21-sel" id="rc-b' + i + '">' + allowed(i).map(function (o) { return '<option value="' + o.k + '"' + (st.b[i] === o.k ? ' selected' : '') + '>' + o.c.n + '</option>'; }).join('') + '</select></div>';
      }).join('');
      $$('select', $('#rc-sel', p)).forEach(function (s, i) { s.addEventListener('change', function () { st.b[i] = +s.value; paint(); }); });
    }
    function value() {
      var b = st.b, n = st.bands, dig = '';
      for (var i = 0; i < n - 2; i++) dig += COL[b[i]].d;
      return { ohms: parseInt(dig, 10) * COL[b[n - 2]].m, tol: COL[b[n - 1]].t };
    }
    function paint() {
      var v = value(), n = st.bands, xs = n === 4 ? [112, 148, 184, 262] : [100, 132, 164, 196, 270];
      var svg = '<line x1="0" y1="60" x2="95" y2="60" stroke="#94a3b8" stroke-width="5"/><line x1="325" y1="60" x2="420" y2="60" stroke="#94a3b8" stroke-width="5"/><rect x="85" y="25" width="250" height="70" rx="30" fill="#e8c9a0" stroke="#b08a5a" stroke-width="2"/>';
      st.b.forEach(function (k, i) { svg += '<rect x="' + xs[i] + '" y="25" width="20" height="70" fill="' + COL[k].c + '" stroke="rgba(0,0,0,.35)" stroke-width="1"/>'; });
      $('#rc-svg', p).innerHTML = svg;
      $('#rc-val', p).textContent = E.eng(v.ohms, 'Ω') + '  ±' + v.tol + '%';
      var lo = v.ohms * (1 - v.tol / 100), hi = v.ohms * (1 + v.tol / 100);
      $('#rc-kv', p).innerHTML = '<div><small>Exact</small><b>' + (+v.ohms.toPrecision(6)) + ' Ω</b></div><div><small>Minimum</small><b>' + E.eng(lo, 'Ω') + '</b></div><div><small>Maximum</small><b>' + E.eng(hi, 'Ω') + '</b></div>';
    }
    $('#rc-in', p).addEventListener('input', function () {
      var v = E.num(this.value), out = $('#rc-rev', p);
      if (!(v >= 0.01) || v > 99e9) { out.textContent = this.value ? 'Enter a value between 0.01 Ω and 99 GΩ.' : ''; return; }
      var n = st.bands, sig = n === 4 ? 2 : 3, m = Math.floor(Math.log10(v)) - (sig - 1), d;
      if (m < -2) m = -2;
      d = Math.round(v / Math.pow(10, m)); if (d >= Math.pow(10, sig)) { d = Math.round(d / 10); m++; }
      var digs = String(d), names = [], mi = COL.findIndex(function (c) { return Math.abs(c.m - Math.pow(10, m)) / c.m < 1e-9; });
      if (mi < 0) { out.textContent = 'That value cannot be shown with colour bands.'; return; }
      for (var i = 0; i < sig; i++) names.push(COL[+digs[i]].n);
      names.push(COL[mi].n);
      out.innerHTML = 'Bands: <b>' + names.join(' · ') + '</b> + a tolerance band (gold = ±5%).';
    });
    build(); paint();
  };
})();
