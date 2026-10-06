/*!
 * System21 — Extra tools: QR Code, Password Generator, Unit Converter, Color Tools, Age & Date,
 * Text Tools, JSON Formatter, Base64/URL, Hash Generator, Timer.
 * Everything runs in the browser. Exposes window.SX_MISC = { qr, password, units, color, age, text, json, base64, hash, timer }
 * — each is mount(host) -> cleanup(). QR uses qrcode-generator (MIT) from js/vendor, loaded on demand.
 */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; };
  var mk = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var uid = function () { return 'mx' + Math.random().toString(36).slice(2, 8); };
  function dl(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function btn(parent, html, cls, cb) { var b = mk('button', cls || 'sx-btn ghost', html); b.type = 'button'; b.addEventListener('click', cb); parent.appendChild(b); return b; }
  function copy(text, b) {
    var done = function () { var o = b.innerHTML; b.innerHTML = '<i class="fa-solid fa-check"></i> Copied'; setTimeout(function () { b.innerHTML = o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var t = mk('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { } t.remove(); }
  }
  function field(parent, label, type, val, attrs) {
    var w = mk('div', 'im-ctl'), id = uid();
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span></label>';
    var i = mk(type === 'textarea' ? 'textarea' : 'input', type === 'textarea' ? 'im-ta' : 'im-text'); i.id = id;
    if (type !== 'textarea') i.type = type; if (val != null) i.value = val;
    Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });
    w.appendChild(i); parent.appendChild(w); return i;
  }
  function slider(parent, label, min, max, val, unit, cb, step) {
    var w = mk('div', 'im-ctl'), id = uid();
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span><output>' + val + unit + '</output></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">';
    var inp = w.querySelector('input'), out = w.querySelector('output');
    inp.addEventListener('input', function () { out.textContent = inp.value + unit; cb(+inp.value); }); parent.appendChild(w); return inp;
  }
  function select(parent, label, options, val, cb) {
    var w = mk('div', 'im-ctl'), id = uid();
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span></label><select id="' + id + '">' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    var s = w.querySelector('select'); s.addEventListener('change', function () { cb(s.value); }); parent.appendChild(w); return s;
  }
  function check(parent, label, val, cb) { var l = mk('label', 'im-tg'), i = mk('input'); i.type = 'checkbox'; i.checked = val; l.appendChild(i); l.appendChild(mk('span', null, label)); i.addEventListener('change', function () { cb(i.checked); }); parent.appendChild(l); return i; }
  function seg(parent, opts, val, cb) {
    var s = mk('div', 'mx-seg'); s.setAttribute('role', 'tablist');
    opts.forEach(function (o) { var b = mk('button', o[0] === val ? 'on' : '', o[1]); b.type = 'button'; b.dataset.v = o[0]; b.addEventListener('click', function () { [].forEach.call(s.children, function (c) { c.classList.toggle('on', c === b); }); cb(o[0]); }); s.appendChild(b); });
    parent.appendChild(s); return s;
  }
  function stats(parent, items) { var s = mk('div', 'im-stats'); parent.appendChild(s); return function (vals) { s.innerHTML = items.map(function (n, i) { return '<div><b>' + vals[i] + '</b><span>' + n + '</span></div>'; }).join(''); }; }
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    return loaded[src] = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { delete loaded[src]; rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); });
  }
  var rnd = function (n) { var a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n, x; do { crypto.getRandomValues(a); x = a[0]; } while (x >= lim); return x % n; };

  /* ====================== QR CODE ====================== */
  function qr(host) {
    var st = { type: 'text', fg: '#000000', bg: '#ffffff', ec: 'M', size: 512, qr: null };
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    var typeSel = select(ctl, 'Content type', [['text', 'Text / URL'], ['wifi', 'Wi-Fi network'], ['email', 'Email'], ['tel', 'Phone number']], 'text', function (v) { st.type = v; layout(); draw(); });
    select(ctl, 'Error correction', [['L', 'L — 7% (smallest)'], ['M', 'M — 15%'], ['Q', 'Q — 25%'], ['H', 'H — 30% (most robust)']], 'M', function (v) { st.ec = v; draw(); });
    var inputs = mk('div', 'im-box'); ctl.appendChild(inputs);
    var colors = mk('div', 'im-grid'); host.appendChild(colors);
    var fgc = mk('label', 'im-col'); fgc.innerHTML = '<span>Code color</span><input type="color" value="#000000">'; colors.appendChild(fgc);
    var bgc = mk('label', 'im-col'); bgc.innerHTML = '<span>Background</span><input type="color" value="#ffffff">'; colors.appendChild(bgc);
    fgc.querySelector('input').addEventListener('input', function (e) { st.fg = e.target.value; draw(); });
    bgc.querySelector('input').addEventListener('input', function (e) { st.bg = e.target.value; draw(); });
    var cvWrap = mk('div', 'im-viewport'); var cv = mk('canvas'); cv.setAttribute('aria-label', 'Generated QR code'); cvWrap.appendChild(cv); host.appendChild(cvWrap);
    var msg = mk('p', 'sx-hint'); host.appendChild(msg);
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var bPng = btn(bar, '<i class="fa-solid fa-download"></i> Save PNG', 'sx-btn', function () { cv.toBlob(function (b) { dl(b, 'qr-code.png'); }); });
    var bSvg = btn(bar, '<i class="fa-solid fa-vector-square"></i> Save SVG', 'sx-btn ghost', function () { if (st.qr) dl(new Blob([toSvg()], { type: 'image/svg+xml' }), 'qr-code.svg'); });
    var f = {};
    function layout() {
      inputs.innerHTML = '';
      if (st.type === 'text') f.text = field(inputs, 'Text or URL', 'textarea', 'https://smart21brain.com', { rows: 3, maxlength: 1200 });
      if (st.type === 'wifi') { f.ssid = field(inputs, 'Network name (SSID)', 'text', ''); f.pass = field(inputs, 'Password', 'text', ''); f.sec = select(inputs, 'Security', [['WPA', 'WPA / WPA2'], ['WEP', 'WEP'], ['nopass', 'None']], 'WPA', draw); }
      if (st.type === 'email') { f.to = field(inputs, 'Email address', 'email', ''); f.sub = field(inputs, 'Subject (optional)', 'text', ''); }
      if (st.type === 'tel') f.tel = field(inputs, 'Phone number', 'tel', '+255');
      inputs.querySelectorAll('input,textarea').forEach(function (i) { i.addEventListener('input', draw); });
    }
    function payload() {
      if (st.type === 'text') return f.text.value;
      if (st.type === 'tel') return f.tel.value.trim() ? 'tel:' + f.tel.value.trim() : '';
      if (st.type === 'email') return f.to.value.trim() ? 'mailto:' + f.to.value.trim() + (f.sub.value ? '?subject=' + encodeURIComponent(f.sub.value) : '') : '';
      var q = function (s) { return s.replace(/([\;,:"])/g, '\\$1'); };
      return f.ssid.value ? 'WIFI:T:' + f.sec.value + ';S:' + q(f.ssid.value) + ';' + (f.sec.value === 'nopass' ? '' : 'P:' + q(f.pass.value) + ';') + ';' : '';
    }
    function toSvg() {
      var n = st.qr.getModuleCount(), m = 4, s = n + m * 2, d = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (st.qr.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" width="' + st.size + '" height="' + st.size + '" shape-rendering="crispEdges"><rect width="' + s + '" height="' + s + '" fill="' + st.bg + '"/><path d="' + d + '" fill="' + st.fg + '"/></svg>';
    }
    function draw() {
      var data = payload();
      [bPng, bSvg].forEach(function (b) { b.disabled = !data; });
      if (!data) { st.qr = null; cv.width = cv.height = 10; cv.getContext('2d').clearRect(0, 0, 10, 10); msg.textContent = 'Type something above to generate a QR code.'; return; }
      loadScript('js/vendor/qrcode.js').then(function () {
        window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
        var q; try { q = window.qrcode(0, st.ec); q.addData(data); q.make(); } catch (e) { st.qr = null; msg.textContent = 'Too much data for a QR code — shorten the text or lower error correction.'; return; }
        st.qr = q; var n = q.getModuleCount(), m = 4, cell = Math.max(2, Math.floor(st.size / (n + m * 2))), px = cell * (n + m * 2);
        cv.width = cv.height = px; var x = cv.getContext('2d'); x.fillStyle = st.bg; x.fillRect(0, 0, px, px); x.fillStyle = st.fg;
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + m) * cell, (r + m) * cell, cell, cell);
        cv.style.width = Math.min(px, 320) + 'px'; cv.style.imageRendering = 'pixelated';
        msg.innerHTML = '<i class="fa-solid fa-circle-info"></i>' + n + '×' + n + ' modules · keep strong contrast between code and background so phones can scan it.';
      }).catch(function (e) { msg.textContent = e.message; });
    }
    layout(); draw();
    return function () { };
  }

  /* ====================== PASSWORD ====================== */
  function password(host) {
    var st = { len: 16, lower: true, upper: true, num: true, sym: true, amb: true, pw: '' };
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    slider(ctl, 'Length', 6, 64, st.len, '', function (v) { st.len = v; gen(); });
    var chk = mk('div'); ctl.appendChild(chk);
    check(chk, 'Lowercase a–z', true, function (v) { st.lower = v; gen(); });
    check(chk, 'Uppercase A–Z', true, function (v) { st.upper = v; gen(); });
    check(chk, 'Numbers 0–9', true, function (v) { st.num = v; gen(); });
    check(chk, 'Symbols !@#$…', true, function (v) { st.sym = v; gen(); });
    check(chk, 'Avoid look-alikes (O/0, l/1)', true, function (v) { st.amb = v; gen(); });
    var out = mk('div', 'mx-out'); out.setAttribute('aria-live', 'polite'); host.appendChild(out);
    var meter = mk('div', 'sx-bar'); meter.innerHTML = '<i></i>'; host.appendChild(meter);
    var info = mk('p', 'sx-hint'); host.appendChild(info);
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    btn(bar, '<i class="fa-solid fa-rotate"></i> Generate new', 'sx-btn', gen);
    var cp = btn(bar, '<i class="fa-regular fa-copy"></i> Copy', 'sx-btn ghost', function () { if (st.pw) copy(st.pw, cp); });
    function gen() {
      var sets = [];
      var amb = st.amb;
      if (st.lower) sets.push(amb ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz');
      if (st.upper) sets.push(amb ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      if (st.num) sets.push(amb ? '23456789' : '0123456789');
      if (st.sym) sets.push('!@#$%^&*()-_=+[]{};:,.?');
      if (!sets.length) { st.pw = ''; out.textContent = 'Select at least one character type'; info.textContent = ''; meter.firstChild.style.width = '0'; return; }
      var all = sets.join(''), p = [];
      sets.forEach(function (s) { p.push(s[rnd(s.length)]); });
      while (p.length < st.len) p.push(all[rnd(all.length)]);
      for (var i = p.length - 1; i > 0; i--) { var j = rnd(i + 1), t = p[i]; p[i] = p[j]; p[j] = t; }
      st.pw = p.slice(0, Math.max(st.len, sets.length)).join('');
      var bits = Math.round(st.pw.length * Math.log2(all.length)), lvl = bits < 40 ? 'Weak' : bits < 60 ? 'Fair' : bits < 80 ? 'Strong' : 'Very strong';
      out.textContent = st.pw; meter.firstChild.style.width = clamp(bits / 128 * 100, 5, 100) + '%';
      info.innerHTML = '<i class="fa-solid fa-shield-halved"></i>' + lvl + ' · about ' + bits + ' bits of entropy · generated with your browser\'s secure random generator, never sent anywhere.';
    }
    gen();
    return function () { st.pw = ''; };
  }

  /* ====================== UNIT CONVERTER ====================== */
  var UNITS = {
    Length: { base: 'm', u: { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, foot: 0.3048, yard: 0.9144, mile: 1609.344 } },
    Weight: { base: 'kg', u: { mg: 1e-6, g: 0.001, kg: 1, tonne: 1000, ounce: 0.028349523125, pound: 0.45359237 } },
    Volume: { base: 'L', u: { mL: 0.001, L: 1, 'm³': 1000, 'tsp': 0.00492892159375, tbsp: 0.01478676478125, cup: 0.2365882365, 'fl oz': 0.0295735295625, gallon: 3.785411784 } },
    Area: { base: 'm²', u: { 'cm²': 0.0001, 'm²': 1, hectare: 10000, 'km²': 1e6, 'sq foot': 0.09290304, acre: 4046.8564224, 'sq mile': 2589988.110336 } },
    Speed: { base: 'm/s', u: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444444 } },
    Time: { base: 's', u: { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, year: 31557600 } },
    Data: { base: 'B', u: { bit: 0.125, byte: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
    Temperature: { temp: true, u: { '°C': 1, '°F': 1, K: 1 } }
  };
  function units(host) {
    var st = { cat: 'Length', from: 'km', to: 'mile' };
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    var catSel = select(ctl, 'Category', Object.keys(UNITS).map(function (k) { return [k, k]; }), st.cat, function (v) { st.cat = v; var k = Object.keys(UNITS[v].u); st.from = k[0]; st.to = k[1]; fill(); calc('a'); });
    var row = mk('div', 'mx-conv'); host.appendChild(row);
    var a = mk('div'), b = mk('div'); var sw = mk('button', 'sx-btn ghost im-mini'); sw.type = 'button'; sw.setAttribute('aria-label', 'Swap units'); sw.innerHTML = '<i class="fa-solid fa-right-left"></i>';
    row.appendChild(a); row.appendChild(sw); row.appendChild(b);
    var va = field(a, 'From', 'number', 1, { step: 'any', inputmode: 'decimal' }), ua = mk('select', 'im-sel-s'); ua.setAttribute('aria-label', 'From unit'); ua.style.width = '100%'; ua.style.marginTop = '.4rem'; a.appendChild(ua);
    var vb = field(b, 'To', 'number', '', { step: 'any', inputmode: 'decimal' }), ub = mk('select', 'im-sel-s'); ub.setAttribute('aria-label', 'To unit'); ub.style.width = '100%'; ub.style.marginTop = '.4rem'; b.appendChild(ub);
    var note = mk('p', 'sx-hint'); host.appendChild(note);
    function fill() { var k = Object.keys(UNITS[st.cat].u), o = k.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); ua.innerHTML = ub.innerHTML = o; ua.value = st.from; ub.value = st.to; }
    function toBase(v, u) { var c = UNITS[st.cat]; if (c.temp) return u === '°C' ? v : u === '°F' ? (v - 32) * 5 / 9 : v - 273.15; return v * c.u[u]; }
    function fromBase(v, u) { var c = UNITS[st.cat]; if (c.temp) return u === '°C' ? v : u === '°F' ? v * 9 / 5 + 32 : v + 273.15; return v / c.u[u]; }
    var nice = function (n) { return isFinite(n) ? String(+n.toPrecision(10)) : ''; };
    function calc(from) {
      st.from = ua.value; st.to = ub.value;
      if (from === 'b') { var x = parseFloat(vb.value); va.value = isNaN(x) ? '' : nice(fromBase(toBase(x, st.to), st.from)); }
      else { var y = parseFloat(va.value); vb.value = isNaN(y) ? '' : nice(fromBase(toBase(y, st.from), st.to)); }
      var one = nice(fromBase(toBase(1, st.from), st.to)); note.innerHTML = '<i class="fa-solid fa-equals"></i>1 ' + esc(st.from) + ' = ' + one + ' ' + esc(st.to);
    }
    va.addEventListener('input', function () { calc('a'); }); vb.addEventListener('input', function () { calc('b'); });
    ua.addEventListener('change', function () { calc('a'); }); ub.addEventListener('change', function () { calc('a'); });
    sw.addEventListener('click', function () { var t = ua.value; ua.value = ub.value; ub.value = t; calc('a'); });
    fill(); calc('a');
    return function () { };
  }

  /* ====================== COLOR TOOLS ====================== */
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r, g, b) { return '#' + [r, g, b].map(function (v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'); }).join(''); }
  function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]; }
  function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); }; return [f(0) * 255, f(8) * 255, f(4) * 255]; }
  function lum(rgb) { var c = rgb.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function color(host) {
    var st = { hex: '#5b4bff' };
    var top = mk('div', 'mx-colortop'); host.appendChild(top);
    var pick = mk('input'); pick.type = 'color'; pick.value = st.hex; pick.className = 'mx-picker'; pick.setAttribute('aria-label', 'Pick a color'); top.appendChild(pick);
    var vals = mk('div', 'mx-colvals'); top.appendChild(vals);
    var fHex = field(vals, 'HEX', 'text', st.hex, { maxlength: 7 }), fRgb = field(vals, 'RGB', 'text', ''), fHsl = field(vals, 'HSL', 'text', '');
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var cbtn = btn(bar, '<i class="fa-regular fa-copy"></i> Copy HEX', 'sx-btn ghost', function () { copy(st.hex, cbtn); });
    if (window.EyeDropper) btn(bar, '<i class="fa-solid fa-eye-dropper"></i> Pick from screen', 'sx-btn ghost', function () { new window.EyeDropper().open().then(function (r) { set(r.sRGBHex); }, function () { }); });
    var h = mk('h3', 'mx-h', 'Harmony palette'); host.appendChild(h);
    var hsel = select(host, 'Scheme', [['comp', 'Complementary'], ['analog', 'Analogous'], ['triad', 'Triadic'], ['tetra', 'Tetradic'], ['mono', 'Shades']], 'analog', function () { render(); });
    var pal = mk('div', 'mx-pal'); host.appendChild(pal);
    var h2 = mk('h3', 'mx-h', 'Contrast checker (text on this color)'); host.appendChild(h2);
    var cres = mk('div', 'mx-contrast'); host.appendChild(cres);
    function set(hex) { if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return; hex = '#' + hex.replace('#', ''); st.hex = rgb2hex.apply(null, hex2rgb(hex)); render(true); }
    function render(sync) {
      var rgb = hex2rgb(st.hex), hsl = rgb2hsl(rgb[0], rgb[1], rgb[2]);
      pick.value = st.hex; if (sync || document.activeElement !== fHex) fHex.value = st.hex;
      fRgb.value = 'rgb(' + rgb.join(', ') + ')'; fHsl.value = 'hsl(' + hsl[0] + ', ' + hsl[1] + '%, ' + hsl[2] + '%)';
      var off = { comp: [0, 180], analog: [-30, 0, 30], triad: [0, 120, 240], tetra: [0, 90, 180, 270] }[hsel.value], list = [];
      if (hsel.value === 'mono') for (var i = 0; i < 5; i++) list.push(rgb2hex.apply(null, hsl2rgb(hsl[0], hsl[1], 12 + i * 19)));
      else list = off.map(function (o) { return rgb2hex.apply(null, hsl2rgb(hsl[0] + o, hsl[1], hsl[2])); });
      pal.innerHTML = ''; list.forEach(function (c) { var s = mk('button', 'mx-sw'); s.type = 'button'; s.style.background = c; s.style.color = lum(hex2rgb(c)) > .4 ? '#000' : '#fff'; s.textContent = c; s.title = 'Click to use this color'; s.addEventListener('click', function () { set(c); }); pal.appendChild(s); });
      cres.innerHTML = [['#ffffff', 'White'], ['#000000', 'Black']].map(function (t) {
        var r = contrast(rgb, hex2rgb(t[0])), g = function (min) { return r >= min ? '<b class="mx-ok">Pass</b>' : '<b class="mx-no">Fail</b>'; };
        return '<div class="mx-cbox" style="background:' + st.hex + ';color:' + t[0] + '"><strong>' + t[1] + ' text</strong><span>Sample text 123</span></div><div class="mx-cinfo"><b>' + r.toFixed(2) + ':1</b> AA normal ' + g(4.5) + ' · AA large ' + g(3) + ' · AAA ' + g(7) + '</div>';
      }).join('');
    }
    pick.addEventListener('input', function () { set(pick.value); });
    fHex.addEventListener('input', function () { set(fHex.value); });
    [fRgb, fHsl].forEach(function (f) { f.readOnly = true; f.addEventListener('focus', function () { f.select(); }); });
    render(true);
    return function () { };
  }

  /* ====================== AGE & DATE ====================== */
  function age(host) {
    var seg1 = seg(host, [['age', 'Age calculator'], ['diff', 'Days between dates'], ['add', 'Add / subtract days']], 'age', function (v) { mode = v; layout(); });
    var mode = 'age', box = mk('div', 'mx-box'); host.appendChild(box);
    var ymd = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var parse = function (s) { var p = s.split('-'); return p.length === 3 && +p[0] ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var dayMs = 864e5, nd = function (a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / dayMs); };
    function ymdDiff(a, b) { var y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate(); if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); } if (m < 0) { y--; m += 12; } return [y, m, d]; }
    function layout() {
      box.innerHTML = ''; var g = mk('div', 'im-grid'); box.appendChild(g); var res = mk('div'); box.appendChild(res);
      if (mode === 'age') {
        var dob = field(g, 'Date of birth', 'date', '', { max: ymd(today) }), on = field(g, 'Age on date', 'date', ymd(today));
        var go = function () {
          var a = parse(dob.value), b = parse(on.value); if (!a || !b) { res.innerHTML = '<p class="sx-hint">Choose a date of birth.</p>'; return; }
          if (b < a) { res.innerHTML = '<p class="sx-hint"><i class="fa-solid fa-triangle-exclamation"></i>The date must be after the birth date.</p>'; return; }
          var d = ymdDiff(a, b), tot = nd(a, b), next = new Date(b.getFullYear(), a.getMonth(), a.getDate()); if (next < b) next.setFullYear(b.getFullYear() + 1);
          var s = stats(res, ['years', 'months', 'days']); s([d[0], d[1], d[2]]);
          var s2 = stats(res, ['total days', 'total weeks', 'total months', 'next birthday in (days)']); s2([tot.toLocaleString(), Math.floor(tot / 7).toLocaleString(), (d[0] * 12 + d[1]).toLocaleString(), nd(b, next)]);
          res.insertAdjacentHTML('beforeend', '<p class="sx-hint"><i class="fa-solid fa-cake-candles"></i>Born on a ' + a.toLocaleDateString(undefined, { weekday: 'long' }) + '. Next birthday falls on a ' + next.toLocaleDateString(undefined, { weekday: 'long' }) + '.</p>');
        };
        res.innerHTML = ''; var rerender = function () { res.innerHTML = ''; go(); };
        [dob, on].forEach(function (i) { i.addEventListener('input', rerender); }); rerender();
      } else if (mode === 'diff') {
        var a1 = field(g, 'From', 'date', ymd(today)), b1 = field(g, 'To', 'date', ymd(new Date(today.getTime() + 30 * dayMs)));
        var g2 = function () {
          res.innerHTML = ''; var a = parse(a1.value), b = parse(b1.value); if (!a || !b) return;
          var rev = b < a, x = rev ? b : a, y = rev ? a : b, d = ymdDiff(x, y), tot = nd(x, y), wk = 0, c = new Date(x);
          for (var i = 0; i < tot; i++) { c.setDate(c.getDate() + 1); var w = c.getDay(); if (w !== 0 && w !== 6) wk++; }
          stats(res, ['total days', 'weeks + days', 'y / m / d', 'weekdays']) ([tot.toLocaleString(), Math.floor(tot / 7) + 'w ' + tot % 7 + 'd', d[0] + 'y ' + d[1] + 'm ' + d[2] + 'd', wk.toLocaleString()]);
          if (rev) res.insertAdjacentHTML('beforeend', '<p class="sx-hint"><i class="fa-solid fa-circle-info"></i>“To” is earlier than “From” — showing the gap anyway.</p>');
        };
        [a1, b1].forEach(function (i) { i.addEventListener('input', g2); }); g2();
      } else {
        var s0 = field(g, 'Start date', 'date', ymd(today)), n = field(g, 'Days (use a negative number to go back)', 'number', 90, { step: 1 });
        var g3 = function () {
          res.innerHTML = ''; var a = parse(s0.value), k = parseInt(n.value, 10); if (!a || isNaN(k)) return; var r = new Date(a); r.setDate(r.getDate() + k);
          res.innerHTML = '<div class="mx-out">' + r.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</div><p class="sx-hint"><i class="fa-solid fa-calendar-day"></i>' + ymd(r) + ' · ' + Math.abs(k) + ' day' + (Math.abs(k) === 1 ? '' : 's') + (k < 0 ? ' before ' : ' after ') + ymd(a) + '</p>';
        };
        [s0, n].forEach(function (i) { i.addEventListener('input', g3); }); g3();
      }
    }
    layout();
    return function () { };
  }

  /* ====================== TEXT TOOLS ====================== */
  function text(host) {
    var ta = field(host, 'Your text', 'textarea', '', { rows: 8, placeholder: 'Type or paste text here…' });
    var upd = stats(host, ['words', 'characters', 'no spaces', 'sentences', 'lines', 'reading time']);
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var title = function (s) { return s.toLowerCase().replace(/(^|[\s\-(])([a-zà-ÿ])/g, function (m, p, c) { return p + c.toUpperCase(); }); };
    var ops = [
      ['UPPER', function (s) { return s.toUpperCase(); }], ['lower', function (s) { return s.toLowerCase(); }], ['Title Case', title],
      ['Sentence case', function (s) { return s.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-zà-ÿ])/g, function (m, p, c) { return p + c.toUpperCase(); }); }],
      ['slug-case', function (s) { return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }],
      ['Clean spaces', function (s) { return s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }],
      ['Sort lines A→Z', function (s) { return s.split('\n').sort(function (a, b) { return a.localeCompare(b); }).join('\n'); }],
      ['Remove duplicate lines', function (s) { var seen = {}; return s.split('\n').filter(function (l) { return seen[l] ? false : (seen[l] = 1); }).join('\n'); }],
      ['Reverse text', function (s) { return Array.from(s).reverse().join(''); }]
    ];
    ops.forEach(function (o) { btn(bar, o[0], 'sx-btn ghost', function () { ta.value = o[1](ta.value); count(); }); });
    var bar2 = mk('div', 'im-bar'); host.appendChild(bar2);
    var cp = btn(bar2, '<i class="fa-regular fa-copy"></i> Copy', 'sx-btn', function () { copy(ta.value, cp); });
    btn(bar2, '<i class="fa-solid fa-download"></i> Save .txt', 'sx-btn ghost', function () { dl(new Blob([ta.value], { type: 'text/plain' }), 'text.txt'); });
    btn(bar2, '<i class="fa-solid fa-eraser"></i> Clear', 'sx-btn ghost', function () { ta.value = ''; count(); ta.focus(); });
    function count() {
      var v = ta.value, w = (v.trim().match(/\S+/g) || []).length, c = Array.from(v).length;
      upd([w.toLocaleString(), c.toLocaleString(), Array.from(v.replace(/\s/g, '')).length.toLocaleString(), (v.match(/[^.!?]+[.!?]+(\s|$)/g) || (v.trim() ? [1] : [])).length, v ? v.split('\n').length : 0, w ? Math.max(1, Math.round(w / 200)) + ' min' : '0 min']);
    }
    ta.addEventListener('input', count); count();
    return function () { };
  }

  /* ====================== JSON ====================== */
  function json(host) {
    var ta = field(host, 'JSON', 'textarea', '', { rows: 12, placeholder: '{ "paste": "your JSON here" }', spellcheck: 'false' });
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var status = mk('p', 'sx-hint'); host.appendChild(status);
    var indent = 2;
    function parse() { try { return { ok: true, v: JSON.parse(ta.value) }; } catch (e) { return { ok: false, e: e }; } }
    function say(ok, m) { status.innerHTML = '<i class="fa-solid ' + (ok ? 'fa-circle-check' : 'fa-circle-xmark') + '" style="color:' + (ok ? '#3ddc97' : 'var(--s21-secondary)') + '"></i>' + esc(m); }
    function sortKeys(v) { if (Array.isArray(v)) return v.map(sortKeys); if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; } return v; }
    function run(fn, msg) { if (!ta.value.trim()) { say(false, 'Paste some JSON first.'); return; } var r = parse(); if (!r.ok) { say(false, r.e.message); return; } ta.value = fn(r.v); say(true, msg + ' · ' + fmt(new Blob([ta.value]).size)); }
    btn(bar, '<i class="fa-solid fa-align-left"></i> Format', 'sx-btn', function () { run(function (v) { return JSON.stringify(v, null, indent); }, 'Formatted'); });
    btn(bar, '<i class="fa-solid fa-compress"></i> Minify', 'sx-btn ghost', function () { run(function (v) { return JSON.stringify(v); }, 'Minified'); });
    btn(bar, '<i class="fa-solid fa-arrow-down-a-z"></i> Sort keys', 'sx-btn ghost', function () { run(function (v) { return JSON.stringify(sortKeys(v), null, indent); }, 'Keys sorted'); });
    btn(bar, '<i class="fa-solid fa-check"></i> Validate', 'sx-btn ghost', function () { if (!ta.value.trim()) { say(false, 'Paste some JSON first.'); return; } var r = parse(); r.ok ? say(true, 'Valid JSON') : say(false, r.e.message); });
    select(bar, 'Indent', [[2, '2 spaces'], [4, '4 spaces'], ['\t', 'Tab']], 2, function (v) { indent = v === '\t' ? '\t' : +v; });
    var cp = btn(bar, '<i class="fa-regular fa-copy"></i> Copy', 'sx-btn ghost', function () { copy(ta.value, cp); });
    return function () { };
  }

  /* ====================== BASE64 / URL ====================== */
  function base64(host) {
    var st = { mode: 'b64', dir: 'enc' };
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    select(ctl, 'Format', [['b64', 'Base64'], ['url', 'URL (percent-encoding)']], 'b64', function (v) { st.mode = v; run(); });
    select(ctl, 'Direction', [['enc', 'Encode'], ['dec', 'Decode']], 'enc', function (v) { st.dir = v; run(); });
    var inp = field(host, 'Input', 'textarea', '', { rows: 5, spellcheck: 'false' });
    var out = field(host, 'Output', 'textarea', '', { rows: 5, readonly: 'readonly' });
    var msg = mk('p', 'sx-hint'); host.appendChild(msg);
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var cp = btn(bar, '<i class="fa-regular fa-copy"></i> Copy output', 'sx-btn', function () { copy(out.value, cp); });
    btn(bar, '<i class="fa-solid fa-arrows-up-down"></i> Use output as input', 'sx-btn ghost', function () { inp.value = out.value; run(); });
    function enc64(s) { var b = new TextEncoder().encode(s), r = ''; for (var i = 0; i < b.length; i += 8192) r += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(r); }
    function dec64(s) { s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
    function run() {
      msg.textContent = '';
      try { out.value = st.mode === 'b64' ? (st.dir === 'enc' ? enc64(inp.value) : dec64(inp.value)) : (st.dir === 'enc' ? encodeURIComponent(inp.value) : decodeURIComponent(inp.value.replace(/\+/g, ' '))); }
      catch (e) { out.value = ''; msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>That input can’t be decoded — check it is valid ' + (st.mode === 'b64' ? 'Base64 text.' : 'percent-encoding.'); }
    }
    inp.addEventListener('input', run);
    return function () { };
  }

  /* ====================== HASH ====================== */
  function hash(host) {
    var st = { src: 'text', file: null, tok: 0 };
    seg(host, [['text', 'Text'], ['file', 'File']], 'text', function (v) { st.src = v; tb.hidden = v !== 'text'; fb.hidden = v !== 'file'; run(); });
    var tb = mk('div', 'mx-box'), fb = mk('div', 'mx-box'); fb.hidden = true; host.appendChild(tb); host.appendChild(fb);
    var ta = field(tb, 'Text to hash', 'textarea', '', { rows: 4, spellcheck: 'false' });
    var fi = mk('input', 'im-text'); fi.type = 'file'; fi.setAttribute('aria-label', 'Choose a file to hash'); fb.appendChild(fi);
    var res = mk('div', 'mx-hashes'); host.appendChild(res);
    var note = mk('p', 'sx-hint', '<i class="fa-solid fa-circle-info"></i>Hashes are computed locally with the Web Crypto API. Files up to ~1 GB depend on your device memory. SHA-1 is shown for compatibility only — it is not secure.'); host.appendChild(note);
    var algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    var hex = function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join(''); };
    function run() {
      var tok = ++st.tok; res.innerHTML = '';
      if (!window.crypto || !crypto.subtle) { res.innerHTML = '<p class="sx-hint">Hashing needs a secure (HTTPS) page.</p>'; return; }
      var get = st.src === 'text' ? Promise.resolve(new TextEncoder().encode(ta.value)) : st.file ? st.file.arrayBuffer() : null;
      if (!get) { res.innerHTML = '<p class="sx-hint">Choose a file to hash.</p>'; return; }
      get.then(function (data) { return Promise.all(algos.map(function (a) { return crypto.subtle.digest(a, data); })); }).then(function (r) {
        if (tok !== st.tok) return; res.innerHTML = '';
        r.forEach(function (b, i) {
          var row = mk('div', 'mx-hrow'); row.innerHTML = '<span>' + algos[i] + '</span><code></code>'; row.querySelector('code').textContent = hex(b);
          var c = btn(row, '<i class="fa-regular fa-copy"></i>', 'sx-btn ghost im-mini', function () { copy(hex(b), c); }); c.setAttribute('aria-label', 'Copy ' + algos[i]); res.appendChild(row);
        });
      }).catch(function (e) { if (tok === st.tok) res.innerHTML = '<p class="sx-hint"><i class="fa-solid fa-triangle-exclamation"></i>Could not read that file (' + esc(e.message) + ').</p>'; });
    }
    ta.addEventListener('input', run); fi.addEventListener('change', function () { st.file = fi.files[0] || null; run(); });
    run();
    return function () { st.tok++; };
  }

  /* ====================== TIMER ====================== */
  function timer(host) {
    var st = { mode: 'stopwatch', run: false, t0: 0, acc: 0, total: 300000, laps: [], raf: 0, pomo: 'focus', done: 0 };
    seg(host, [['stopwatch', 'Stopwatch'], ['countdown', 'Countdown'], ['pomodoro', 'Pomodoro']], 'stopwatch', function (v) { st.mode = v; reset(); setup(); });
    var cfg = mk('div', 'im-grid'); host.appendChild(cfg);
    var disp = mk('div', 'mx-clock'); disp.setAttribute('role', 'timer'); host.appendChild(disp);
    var sub = mk('p', 'sx-hint'); sub.style.textAlign = 'center'; host.appendChild(sub);
    var bar = mk('div', 'im-bar'); bar.style.justifyContent = 'center'; host.appendChild(bar);
    var go = btn(bar, '', 'sx-btn', toggle), lap = btn(bar, '<i class="fa-solid fa-flag"></i> Lap', 'sx-btn ghost', addLap), rs = btn(bar, '<i class="fa-solid fa-rotate-left"></i> Reset', 'sx-btn ghost', function () { reset(); paint(); });
    var laps = mk('ol', 'mx-laps'); host.appendChild(laps);
    var mm, ss, minIn, secIn, ctx;
    var POMO = { focus: [25, 'Focus'], short: [5, 'Short break'], long: [15, 'Long break'] };
    var pad = function (n) { return String(n).padStart(2, '0'); };
    function now() { return st.acc + (st.run ? performance.now() - st.t0 : 0); }
    function target() { return st.mode === 'pomodoro' ? POMO[st.pomo][0] * 60000 : st.total; }
    function show(ms, cs) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600); return (h ? pad(h) + ':' : '') + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60) + (cs ? '<small>.' + pad(Math.floor(ms % 1000 / 10)) + '</small>' : ''); }
    function paint() {
      var ms = now(), left;
      if (st.mode === 'stopwatch') disp.innerHTML = show(ms, true);
      else { left = Math.max(0, target() - ms); disp.innerHTML = show(Math.ceil(left / 1000) * 1000, false); if (st.run && left <= 0) finish(); }
      go.innerHTML = st.run ? '<i class="fa-solid fa-pause"></i> Pause' : '<i class="fa-solid fa-play"></i> ' + (st.acc ? 'Resume' : 'Start');
      lap.hidden = st.mode !== 'stopwatch'; lap.disabled = !st.run;
      if (st.mode === 'pomodoro') sub.innerHTML = '<i class="fa-solid fa-brain"></i>' + POMO[st.pomo][1] + ' · ' + st.done + ' focus session' + (st.done === 1 ? '' : 's') + ' completed'; else if (st.mode === 'countdown') sub.textContent = st.run ? 'Counting down…' : 'Set the time below, then press Start.'; else sub.textContent = '';
      document.title = st.run && st.mode !== 'stopwatch' ? show(Math.ceil(left / 1000) * 1000) + ' — System21' : origTitle;
    }
    var origTitle = document.title;
    function loop() { paint(); if (st.run) st.raf = requestAnimationFrame(loop); }
    function toggle() { if (st.run) { st.acc = now(); st.run = false; cancelAnimationFrame(st.raf); } else { if (st.mode !== 'stopwatch' && target() - st.acc <= 0) st.acc = 0; if (st.mode === 'countdown') readTime(); st.t0 = performance.now(); st.run = true; loop(); } paint(); }
    function reset() { st.run = false; st.acc = 0; st.laps = []; cancelAnimationFrame(st.raf); laps.innerHTML = ''; document.title = origTitle; }
    function addLap() { var ms = now(), prev = st.laps.length ? st.laps[st.laps.length - 1] : 0; st.laps.push(ms); var li = mk('li', null, '<span>Lap ' + st.laps.length + '</span><b>' + show(ms - prev, true) + '</b><em>' + show(ms, true) + '</em>'); laps.insertBefore(li, laps.firstChild); }
    function beep() {
      try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach(function (d) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.15, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + d + .2); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + .22); }); } catch (e) { }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    function finish() {
      st.run = false; cancelAnimationFrame(st.raf); beep(); st.acc = 0; document.title = origTitle;
      if (st.mode === 'pomodoro') { if (st.pomo === 'focus') { st.done++; st.pomo = st.done % 4 === 0 ? 'long' : 'short'; } else st.pomo = 'focus'; pomoSel && (pomoSel.value = st.pomo); }
      disp.innerHTML = st.mode === 'countdown' ? '00:00' : show(target(), false); sub.innerHTML = '<i class="fa-solid fa-bell"></i>Time is up!'; paint(); sub.innerHTML = '<i class="fa-solid fa-bell"></i>Time is up!'; go.innerHTML = '<i class="fa-solid fa-play"></i> Start';
    }
    function readTime() { st.total = clamp((+minIn.value || 0) * 60 + (+secIn.value || 0), 1, 359999) * 1000; }
    var pomoSel;
    function setup() {
      cfg.innerHTML = ''; pomoSel = null;
      if (st.mode === 'countdown') {
        minIn = field(cfg, 'Minutes', 'number', Math.floor(st.total / 60000), { min: 0, max: 5999 }); secIn = field(cfg, 'Seconds', 'number', Math.floor(st.total % 60000 / 1000), { min: 0, max: 59 });
        [minIn, secIn].forEach(function (i) { i.addEventListener('input', function () { if (!st.run) { st.acc = 0; readTime(); paint(); } }); });
      }
      if (st.mode === 'pomodoro') pomoSel = select(cfg, 'Session', [['focus', 'Focus — 25 min'], ['short', 'Short break — 5 min'], ['long', 'Long break — 15 min']], st.pomo, function (v) { st.pomo = v; reset(); paint(); });
      paint();
    }
    setup();
    return function () { st.run = false; cancelAnimationFrame(st.raf); document.title = origTitle; if (ctx && ctx.close) ctx.close(); };
  }

  window.SX_MISC = { qr: qr, password: password, units: units, color: color, age: age, text: text, json: json, base64: base64, hash: hash, timer: timer };
})();
