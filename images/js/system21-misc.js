/*!
 * System21 — Extra tools: QR Code, Password Generator, Unit Converter, Color Tools, Age & Date,
 * Text Tools, JSON Formatter, Base64/URL, Hash Generator, Timer.
 * Everything runs in the browser. QR Code: 9 content types, dot/eye styles, gradients, logo, PNG/SVG/JPG/copy/share/print. Exposes window.SX_MISC = { qr, password, units, color, age, text, json, base64, hash, timer }
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
    var st = { type: 'text', dot: 'square', eye: 'square', fg: '#000000', fg2: '#5b4bff', grad: false, eyeCustom: false, eyeColor: '#5b4bff', bg: '#ffffff', transp: false, margin: 4, ec: 'M', size: 1024, logo: null, logoPct: 20, qr: null, data: '', g: null, scanTok: 0, scanTm: 0 };
    var r3 = function (v) { return +v.toFixed(3); };

    /* --- content --- */
    var top = mk('div', 'im-grid'); host.appendChild(top);
    select(top, 'Content type', [['text', 'Text / URL'], ['wifi', 'Wi-Fi network'], ['vcard', 'Contact card (vCard)'], ['email', 'Email'], ['tel', 'Phone number'], ['sms', 'SMS message'], ['wa', 'WhatsApp message'], ['geo', 'Location (map pin)'], ['event', 'Calendar event']], 'text', function (v) { st.type = v; layout(); draw(); });
    var inputs = mk('div', 'im-box'); top.appendChild(inputs);

    /* --- two columns: preview | style --- */
    var cols = mk('div', 'im-filters'); host.appendChild(cols);
    var left = mk('div', 'im-left'), right = mk('div', 'im-right'); cols.appendChild(left); cols.appendChild(right);
    var vp = mk('div', 'im-viewport'), cv = mk('canvas'); cv.setAttribute('aria-label', 'Generated QR code'); vp.appendChild(cv); left.appendChild(vp);
    var msg = mk('p', 'sx-hint'), warn = mk('p', 'sx-hint'), scan = mk('p', 'sx-hint'); left.appendChild(msg); left.appendChild(warn); left.appendChild(scan);
    var bar = mk('div', 'im-bar'); left.appendChild(bar);
    var bPng = btn(bar, '<i class="fa-solid fa-download"></i> PNG', 'sx-btn', function () { cv.toBlob(function (b) { dl(b, 'qr-code.png'); }); });
    var bSvg = btn(bar, '<i class="fa-solid fa-vector-square"></i> SVG', 'sx-btn ghost', function () { dl(new Blob([toSvg()], { type: 'image/svg+xml' }), 'qr-code.svg'); });
    var bJpg = btn(bar, '<i class="fa-regular fa-image"></i> JPG', 'sx-btn ghost', function () { var c = mk('canvas'); c.width = cv.width; c.height = cv.height; var x = c.getContext('2d'); x.fillStyle = st.transp ? '#ffffff' : st.bg; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0); c.toBlob(function (b) { dl(b, 'qr-code.jpg'); }, 'image/jpeg', .95); });
    var bCopy = btn(bar, '<i class="fa-regular fa-copy"></i> Copy image', 'sx-btn ghost', function () {
      var ok = function () { var o = bCopy.innerHTML; bCopy.innerHTML = '<i class="fa-solid fa-check"></i> Copied'; setTimeout(function () { bCopy.innerHTML = o; }, 1200); };
      if (!(navigator.clipboard && window.ClipboardItem)) { msg.innerHTML = '<i class="fa-solid fa-circle-info"></i>This browser cannot copy images — use Save PNG instead.'; return; }
      cv.toBlob(function (b) { navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(ok, function () { msg.innerHTML = '<i class="fa-solid fa-circle-info"></i>Copy was blocked — use Save PNG instead.'; }); });
    });
    var bShare = btn(bar, '<i class="fa-solid fa-share-nodes"></i> Share', 'sx-btn ghost', function () { cv.toBlob(function (b) { var f = new File([b], 'qr-code.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'QR code' }).catch(function () { }); }); });
    bShare.hidden = !(navigator.canShare && typeof File === 'function');
    var bPrint = btn(bar, '<i class="fa-solid fa-print"></i> Print', 'sx-btn ghost', function () {
      var fr = mk('iframe'); fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; document.body.appendChild(fr);
      var d = fr.contentWindow.document; d.open(); d.write('<!doctype html><title>QR code</title><style>body{margin:0;display:grid;place-items:center;min-height:100vh}img{width:12cm;max-width:90vw}</style><img src="' + cv.toDataURL('image/png') + '">'); d.close();
      var img = d.querySelector('img'); var go = function () { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(function () { fr.remove(); }, 1500); }; if (img.complete) go(); else img.onload = go;
    });
    var acts = [bPng, bSvg, bJpg, bCopy, bShare, bPrint];

    /* --- style panel --- */
    var H = function (t) { right.appendChild(mk('h3', 'mx-h', t)).style.marginTop = '.2rem'; };
    function colorRow(label, val, cb) { var l = mk('label', 'im-col'); l.style.margin = '.35rem 0'; l.innerHTML = '<span>' + label + '</span><input type="color" value="' + val + '">'; var i = l.querySelector('input'); i.addEventListener('input', function () { cb(i.value); }); right.appendChild(l); return i; }
    var sub = function (t) { var h = mk('h3', 'mx-h', t); h.style.marginTop = '.9rem'; right.appendChild(h); };
    H('Quick styles');
    var presets = mk('div', 'mx-pal'); right.appendChild(presets);
    var inCode, inCode2, inEye, inBg, chkGrad, chkEye, chkTr;
    [['Classic', '#000000', '#000000', false], ['Smart21', '#5b4bff', '#5b4bff', false], ['Forest', '#0b6b3a', '#0b6b3a', false], ['Sunset', '#be123c', '#ea580c', true], ['Ocean', '#023e8a', '#0077b6', true], ['Night', '#6d28d9', '#0e7490', true]].forEach(function (p) {
      var b = mk('button', 'mx-sw'); b.type = 'button'; b.style.cssText = 'min-width:70px;flex:1 1 70px;height:42px;place-items:center;color:#fff;background:linear-gradient(135deg,' + p[1] + ',' + p[2] + ')'; b.textContent = p[0]; b.title = 'Apply ' + p[0];
      b.addEventListener('click', function () { st.fg = p[1]; st.fg2 = p[2]; st.grad = p[3]; st.bg = '#ffffff'; st.transp = false; inCode.value = st.fg; inCode2.value = st.fg2; chkGrad.checked = st.grad; inBg.value = st.bg; chkTr.checked = false; draw(); });
      presets.appendChild(b);
    });
    sub('Shape');
    select(right, 'Dot style', [['square', 'Square'], ['rounded', 'Rounded'], ['dots', 'Dots'], ['diamond', 'Diamond']], st.dot, function (v) { st.dot = v; draw(); });
    select(right, 'Corner eyes', [['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle']], st.eye, function (v) { st.eye = v; draw(); });
    sub('Colors');
    inCode = colorRow('Code color', st.fg, function (v) { st.fg = v; draw(); });
    chkGrad = check(right, 'Gradient (add second color)', false, function (v) { st.grad = v; draw(); });
    inCode2 = colorRow('Gradient end', st.fg2, function (v) { st.fg2 = v; draw(); });
    chkEye = check(right, 'Custom eye color', false, function (v) { st.eyeCustom = v; draw(); });
    inEye = colorRow('Eye color', st.eyeColor, function (v) { st.eyeColor = v; draw(); });
    inBg = colorRow('Background', st.bg, function (v) { st.bg = v; draw(); });
    chkTr = check(right, 'Transparent background (PNG / SVG)', false, function (v) { st.transp = v; draw(); });
    sub('Size & margin');
    slider(right, 'Margin', 0, 10, st.margin, ' modules', function (v) { st.margin = v; draw(); });
    select(right, 'Export size', [[256, '256 px'], [512, '512 px'], [1024, '1024 px — print'], [2048, '2048 px — large print']], st.size, function (v) { st.size = +v; draw(); });
    var ecSel = select(right, 'Error correction', [['L', 'L — 7% (smallest)'], ['M', 'M — 15%'], ['Q', 'Q — 25%'], ['H', 'H — 30% (most robust)']], st.ec, function (v) { st.ec = v; draw(); });
    sub('Logo in the center');
    var lf = mk('input', 'im-text'); lf.type = 'file'; lf.accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif'; lf.setAttribute('aria-label', 'Choose a logo image'); right.appendChild(lf);
    var logoSl = slider(right, 'Logo size', 8, 25, st.logoPct, '%', function (v) { st.logoPct = v; draw(); });
    var logoBar = mk('div', 'im-bar'); right.appendChild(logoBar);
    var rmLogo = btn(logoBar, '<i class="fa-solid fa-xmark"></i> Remove logo', 'sx-btn ghost', function () { st.logo = null; lf.value = ''; sync(); draw(); });
    function sync() { logoSl.disabled = !st.logo; rmLogo.hidden = !st.logo; logoSl.parentNode.style.opacity = st.logo ? 1 : .45; inCode2.parentNode.style.opacity = st.grad ? 1 : .5; }
    lf.addEventListener('change', function () {
      var file = lf.files[0]; if (!file) return;
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 256 / Math.max(im.naturalWidth || 256, im.naturalHeight || 256)), c = mk('canvas'); c.width = Math.max(1, Math.round((im.naturalWidth || 256) * s)); c.height = Math.max(1, Math.round((im.naturalHeight || 256) * s));
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        var url = c.toDataURL('image/png'), i2 = new Image(); i2.onload = function () { st.logo = { img: i2, url: url, w: c.width, h: c.height }; if (st.ec !== 'H') { st.ec = 'H'; ecSel.value = 'H'; } sync(); draw(); }; i2.src = url;
      };
      im.onerror = function () { URL.revokeObjectURL(u); msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>Could not read that image.'; };
      im.src = u;
    });

    /* --- content inputs --- */
    var f = {};
    function layout() {
      inputs.innerHTML = ''; f = {}; var t = st.type, g = function (l, ty, v, a) { return field(inputs, l, ty, v, a); };
      if (t === 'text') f.text = g('Text or URL', 'textarea', 'https://smart21brain.com', { rows: 3, maxlength: 2000 });
      if (t === 'wifi') { f.ssid = g('Network name (SSID)', 'text', ''); f.pass = g('Password', 'text', ''); f.sec = select(inputs, 'Security', [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'None']], 'WPA', draw); f.hid = check(inputs, 'Hidden network', false, draw); }
      if (t === 'vcard') { f.fn = g('First name', 'text', ''); f.ln = g('Last name', 'text', ''); f.org = g('Company', 'text', ''); f.job = g('Job title', 'text', ''); f.tel = g('Phone', 'tel', ''); f.mail = g('Email', 'email', ''); f.url = g('Website', 'url', ''); f.adr = g('Address', 'text', ''); }
      if (t === 'email') { f.to = g('Email address', 'email', ''); f.sub = g('Subject (optional)', 'text', ''); f.body = g('Message (optional)', 'textarea', '', { rows: 2 }); }
      if (t === 'tel') f.tel = g('Phone number', 'tel', '+255');
      if (t === 'sms') { f.tel = g('Phone number', 'tel', '+255'); f.body = g('Message', 'textarea', '', { rows: 2 }); }
      if (t === 'wa') { f.tel = g('WhatsApp number (with country code)', 'tel', '+255'); f.body = g('Pre-filled message (optional)', 'textarea', '', { rows: 2 }); }
      if (t === 'geo') { f.lat = g('Latitude', 'number', '-6.7924', { step: 'any' }); f.lng = g('Longitude', 'number', '39.2083', { step: 'any' }); }
      if (t === 'event') { var d = new Date(Date.now() + 864e5); d.setMinutes(0, 0, 0); var loc = function (x) { return new Date(x.getTime() - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }; f.title = g('Event title', 'text', ''); f.start = g('Starts', 'datetime-local', loc(d)); f.end = g('Ends', 'datetime-local', loc(new Date(d.getTime() + 36e5))); f.where = g('Location (optional)', 'text', ''); f.desc = g('Description (optional)', 'textarea', '', { rows: 2 }); }
      inputs.querySelectorAll('input,textarea').forEach(function (i) { i.addEventListener('input', draw); });
    }
    var vEsc = function (s) { return String(s || '').replace(/([\;,])/g, '\\$1').replace(/\r?\n/g, '\\n'); };
    var dt = function (s) { return s.replace(/[-:]/g, '') + (s.length === 16 ? '00' : ''); };
    var digits = function (s) { return String(s).replace(/[^\d]/g, ''); };
    function payload() {
      var t = st.type, v = function (k) { return (f[k].value || '').trim(); };
      if (t === 'text') return f.text.value;
      if (t === 'tel') return v('tel') && digits(v('tel')) ? 'tel:' + v('tel').replace(/[^\d+]/g, '') : '';
      if (t === 'sms') return digits(v('tel')) ? 'SMSTO:' + v('tel').replace(/[^\d+]/g, '') + ':' + f.body.value : '';
      if (t === 'wa') return digits(v('tel')) ? 'https://wa.me/' + digits(v('tel')) + (f.body.value ? '?text=' + encodeURIComponent(f.body.value) : '') : '';
      if (t === 'email') { if (!v('to')) return ''; var q = []; if (v('sub')) q.push('subject=' + encodeURIComponent(f.sub.value)); if (f.body.value) q.push('body=' + encodeURIComponent(f.body.value)); return 'mailto:' + v('to') + (q.length ? '?' + q.join('&') : ''); }
      if (t === 'geo') { var la = parseFloat(f.lat.value), lo = parseFloat(f.lng.value); return isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 ? 'geo:' + la + ',' + lo : ''; }
      if (t === 'wifi') { var e = function (s) { return s.replace(/([\;,:"])/g, '\\$1'); }; return f.ssid.value ? 'WIFI:T:' + f.sec.value + ';S:' + e(f.ssid.value) + ';' + (f.sec.value === 'nopass' ? '' : 'P:' + e(f.pass.value) + ';') + (f.hid.checked ? 'H:true;' : '') + ';' : ''; }
      if (t === 'vcard') { if (!v('fn') && !v('ln') && !v('org')) return ''; return ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + vEsc(v('ln')) + ';' + vEsc(v('fn')) + ';;;', 'FN:' + vEsc((v('fn') + ' ' + v('ln')).trim() || v('org')), v('org') && 'ORG:' + vEsc(v('org')), v('job') && 'TITLE:' + vEsc(v('job')), v('tel') && 'TEL:' + v('tel'), v('mail') && 'EMAIL:' + v('mail'), v('url') && 'URL:' + v('url'), v('adr') && 'ADR:;;' + vEsc(v('adr')) + ';;;;', 'END:VCARD'].filter(Boolean).join('\n'); }
      if (t === 'event') { if (!v('title') || !f.start.value) return ''; return ['BEGIN:VEVENT', 'SUMMARY:' + vEsc(v('title')), 'DTSTART:' + dt(f.start.value), f.end.value && 'DTEND:' + dt(f.end.value), v('where') && 'LOCATION:' + vEsc(v('where')), f.desc.value && 'DESCRIPTION:' + vEsc(f.desc.value), 'END:VEVENT'].filter(Boolean).join('\n'); }
      return '';
    }

    /* --- geometry (one set of SVG path strings drives both canvas and SVG) --- */
    function shape(kind, x, y, s, rad) {
      x = r3(x); y = r3(y); s = r3(s);
      if (kind === 'circle' || kind === 'dot') { var r = r3(s / 2), cy = r3(y + r); return 'M' + x + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + s + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-s) + ' 0z'; }
      if (kind === 'diamond') { var h = r3(s / 2); return 'M' + r3(x + h) + ' ' + y + 'l' + h + ' ' + h + 'l' + (-h) + ' ' + h + 'l' + (-h) + ' ' + (-h) + 'z'; }
      if (kind === 'rounded') { var q = r3(rad), w = r3(s - 2 * q); return 'M' + r3(x + q) + ' ' + y + 'h' + w + 'a' + q + ' ' + q + ' 0 0 1 ' + q + ' ' + q + 'v' + w + 'a' + q + ' ' + q + ' 0 0 1 ' + (-q) + ' ' + q + 'h' + (-w) + 'a' + q + ' ' + q + ' 0 0 1 ' + (-q) + ' ' + (-q) + 'v' + (-w) + 'a' + q + ' ' + q + ' 0 0 1 ' + q + ' ' + (-q) + 'z'; }
      return 'M' + x + ' ' + y + 'h' + s + 'v' + s + 'h' + (-s) + 'z';
    }
    function geometry(q) {
      var n = q.getModuleCount(), m = st.margin, total = n + m * 2, data = [], ring = [], center = [];
      var box = null; if (st.logo) { var L = total * st.logoPct / 100, ar = st.logo.w / st.logo.h, lw = ar >= 1 ? L : L * ar, lh = ar >= 1 ? L / ar : L; box = { x: (total - lw) / 2, y: (total - lh) / 2, w: lw, h: lh }; }
      var pad = .6, isEye = function (r, c) { return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); };
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        if (!q.isDark(r, c) || isEye(r, c)) continue; var x = c + m, y = r + m;
        if (box && x + .5 > box.x - pad && x + .5 < box.x + box.w + pad && y + .5 > box.y - pad && y + .5 < box.y + box.h + pad) continue;
        data.push(st.dot === 'dots' ? shape('dot', x + .06, y + .06, .88) : st.dot === 'rounded' ? shape('rounded', x, y, 1, .34) : st.dot === 'diamond' ? shape('diamond', x - .04, y - .04, 1.08) : shape('square', x - .015, y - .015, 1.03));
      }
      [[0, 0], [0, n - 7], [n - 7, 0]].forEach(function (p) {
        var x = p[1] + m, y = p[0] + m;
        ring.push(shape(st.eye, x, y, 7, 2.2), shape(st.eye, x + 1, y + 1, 5, 1.5)); center.push(shape(st.eye, x + 2, y + 2, 3, 1));
      });
      return { n: n, total: total, data: data.join(''), ring: ring.join(''), center: center.join(''), box: box };
    }
    var eyeFill = function (g) { return st.eyeCustom ? st.eyeColor : g; };
    function toSvg() {
      var g = st.g, s = g.total, px = st.size, grad = st.grad ? '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + s + '" y2="' + s + '"><stop offset="0" stop-color="' + st.fg + '"/><stop offset="1" stop-color="' + st.fg2 + '"/></linearGradient></defs>' : '', main = st.grad ? 'url(#g)' : st.fg, eye = eyeFill(main);
      return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + s + ' ' + s + '" width="' + px + '" height="' + px + '">' + grad + (st.transp ? '' : '<rect width="' + s + '" height="' + s + '" fill="' + st.bg + '"/>') + '<path d="' + g.data + '" fill="' + main + '"/><path d="' + g.ring + '" fill="' + eye + '" fill-rule="evenodd"/><path d="' + g.center + '" fill="' + eye + '"/>' + (g.box ? '<image x="' + r3(g.box.x) + '" y="' + r3(g.box.y) + '" width="' + r3(g.box.w) + '" height="' + r3(g.box.h) + '" href="' + st.logo.url + '" xlink:href="' + st.logo.url + '"/>' : '') + '</svg>';
    }
    function paint() {
      var g = st.g, sc = Math.max(1, Math.round(st.size / g.total)), px = sc * g.total; cv.width = cv.height = px; var x = cv.getContext('2d'); x.scale(sc, sc);
      if (!st.transp) { x.fillStyle = st.bg; x.fillRect(0, 0, g.total, g.total); }
      var main = st.fg; if (st.grad) { main = x.createLinearGradient(0, 0, g.total, g.total); main.addColorStop(0, st.fg); main.addColorStop(1, st.fg2); }
      x.fillStyle = main; x.fill(new Path2D(g.data)); x.fillStyle = eyeFill(main); x.fill(new Path2D(g.ring), 'evenodd'); x.fill(new Path2D(g.center));
      if (g.box) { x.imageSmoothingQuality = 'high'; x.drawImage(st.logo.img, g.box.x, g.box.y, g.box.w, g.box.h); }
      cv.style.width = Math.min(px, 340) + 'px'; cv.style.height = 'auto'; vp.classList.toggle('sx-checker', st.transp);
    }
    function checks(q) {
      var a = hex2rgb(st.fg), b = hex2rgb(st.bg), c1 = contrast(a, b), c2 = st.grad ? contrast(hex2rgb(st.fg2), b) : 21, c3 = st.eyeCustom ? contrast(hex2rgb(st.eyeColor), b) : 21, w = [];
      if (!st.transp && Math.min(c1, c2, c3) < 3) w.push('Low contrast (' + Math.min(c1, c2, c3).toFixed(1) + ':1) — scanners may fail. Make the code darker than the background.');
      else if (!st.transp && lum(a) > lum(b)) w.push('Light code on a dark background is “inverted” — some scanner apps cannot read it.');
      if (st.transp) w.push('Transparent background: place the code on a light, plain surface so it stays readable.');
      if (st.margin < 2) w.push('Margin below 2 modules can make scanning unreliable.');
      if (st.logo && st.ec !== 'H') w.push('Use error correction H with a logo.');
      warn.innerHTML = w.length ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--s21-secondary)"></i>' + w.map(esc).join('<br><i class="fa-solid fa-triangle-exclamation" style="color:var(--s21-secondary)"></i>') : '';
    }
    function verify() {
      scan.innerHTML = ''; if (!window.BarcodeDetector) return; var tok = ++st.scanTok, want = st.data;
      clearTimeout(st.scanTm); st.scanTm = setTimeout(function () {
        try { new window.BarcodeDetector({ formats: ['qr_code'] }).detect(cv).then(function (r) { if (tok !== st.scanTok) return; var ok = r.length && r[0].rawValue === want; scan.innerHTML = ok ? '<i class="fa-solid fa-circle-check" style="color:#3ddc97"></i>Scan test passed — this browser read the code correctly.' : '<i class="fa-solid fa-circle-xmark" style="color:var(--s21-secondary)"></i>Scan test could not read this design. Try more contrast, a bigger margin or a smaller logo.'; }, function () { }); } catch (e) { }
      }, 350);
    }
    function draw() {
      sync(); var data = payload(); st.data = data;
      acts.forEach(function (b) { b.disabled = !data; });
      if (!data) { st.qr = null; st.g = null; cv.width = cv.height = 10; cv.style.width = '120px'; cv.getContext('2d').clearRect(0, 0, 10, 10); msg.textContent = 'Fill in the details above to generate a QR code.'; warn.innerHTML = ''; scan.innerHTML = ''; return; }
      loadScript('js/vendor/qrcode.js').then(function () {
        if (st.data !== data) return;
        window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8'];
        var q; try { q = window.qrcode(0, st.ec); q.addData(data); q.make(); } catch (e) { st.qr = null; acts.forEach(function (b) { b.disabled = true; }); msg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>Too much data for a QR code — shorten it or lower the error correction.'; return; }
        st.qr = q; st.g = geometry(q); paint(); checks(q);
        var bytes = new TextEncoder().encode(data).length;
        msg.innerHTML = '<i class="fa-solid fa-circle-info"></i>Version ' + ((st.g.n - 17) / 4) + ' · ' + st.g.n + '×' + st.g.n + ' modules · ' + bytes + ' bytes · exports at ' + cv.width + ' px';
        verify();
      }).catch(function (e) { msg.textContent = e.message; });
    }
    layout(); sync(); draw();
    return function () { clearTimeout(st.scanTm); st.scanTok++; };
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
