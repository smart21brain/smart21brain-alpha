/*!
 * System21 — Document tools: Image to PDF, Text to PDF (with word count), Merge PDF, Split PDF.
 * Image to PDF and Text to PDF use a built-in PDF writer (no library). Merge/Split use pdf-lib (MIT), loaded on demand.
 * Exposes window.SX_DOC = { img2pdf, txt2pdf, merge, split } — each is mount(host) -> cleanup().
 * Config (optional, before this file): window.SX_DOC_CONFIG = { pdfLibUrl: 'js/vendor/pdf-lib.min.js' } to self-host pdf-lib.
 */
(function () {
  'use strict';

  var CFG = Object.assign({ pdfLibUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js' }, window.SX_DOC_CONFIG || {});
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; };
  var baseName = function (n) { return n.replace(/\.[^.]+$/, ''); };
  var mk = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var cvs = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  var toBlob = function (c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); };
  function dl(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }
  function btn(parent, html, cls, cb) { var b = mk('button', cls || 'sx-btn ghost', html); b.type = 'button'; b.addEventListener('click', cb); parent.appendChild(b); return b; }
  function slider(parent, label, min, max, val, unit, cb, step) {
    var w = mk('div', 'im-ctl'), id = 'dcs' + Math.random().toString(36).slice(2, 7);
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span><output>' + val + unit + '</output></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">';
    var inp = w.querySelector('input'), out = w.querySelector('output'); inp.addEventListener('input', function () { out.textContent = inp.value + unit; cb(+inp.value); }); parent.appendChild(w); return w;
  }
  function select(parent, label, options, val, cb) {
    var w = mk('div', 'im-ctl'), id = 'dcq' + Math.random().toString(36).slice(2, 7);
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span></label><select id="' + id + '">' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    var s = w.querySelector('select'); s.addEventListener('change', function () { cb(s.value); }); parent.appendChild(w); return s;
  }
  function check(parent, label, val, cb) { var l = mk('label', 'im-tg'), i = mk('input'); i.type = 'checkbox'; i.checked = val; l.appendChild(i); l.appendChild(mk('span', null, label)); i.addEventListener('change', function () { cb(i.checked); }); parent.appendChild(l); return i; }
  function dropzone(host, multiple, accept, test, onFiles, label, hint) {
    var z = mk('div', 'sx-drop'); z.tabIndex = 0; z.setAttribute('role', 'button');
    var msg = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i><p><b>' + label + '</b><br>or drag &amp; drop here · ' + hint + '</p>'; z.innerHTML = msg;
    var inp = mk('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple; inp.hidden = true; z.appendChild(inp); host.appendChild(z);
    var give = function (files) { files = files.filter(test); if (!files.length) { z.querySelector('p').innerHTML = '<b>That file type is not supported.</b><br>' + hint; return; } z.querySelector('p').innerHTML = '<b>' + label + '</b><br>or drag &amp; drop here · ' + hint; onFiles(multiple ? files : [files[0]]); };
    z.addEventListener('click', function (e) { if (e.target !== inp) inp.click(); });
    z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', function () { if (inp.files.length) give([].slice.call(inp.files)); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.remove('over'); }); });
    z.addEventListener('drop', function (e) { give([].slice.call(e.dataTransfer.files)); });
    return z;
  }
  var isImg = function (f) { return /^image\/(png|jpe?g|webp|gif|bmp)$/.test(f.type); };
  var isPdf = function (f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name); };
  function loadImg(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file), i = new Image(); i.onload = function () { res({ img: i, url: u }); }; i.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Cannot read “' + file.name + '”')); }; i.src = u; }); }
  function readBuf(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(new Uint8Array(r.result)); }; r.onerror = function () { rej(new Error('Cannot read “' + file.name + '”')); }; r.readAsArrayBuffer(file); }); }

  /* ====================== tiny PDF writer ====================== */
  function PdfBuilder() { this.objs = []; }
  PdfBuilder.prototype.reserve = function () { this.objs.push(null); return this.objs.length; };
  PdfBuilder.prototype.set = function (id, body, stream) { this.objs[id - 1] = { body: body, stream: stream || null }; };
  PdfBuilder.prototype.add = function (body, stream) { var id = this.reserve(); this.set(id, body, stream); return id; };
  var ascii = function (s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  PdfBuilder.prototype.build = function (rootId) {
    var parts = [], len = 0, offs = [];
    var push = function (u8) { parts.push(u8); len += u8.length; };
    push(ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    this.objs.forEach(function (o, i) {
      offs[i] = len; var head = (i + 1) + ' 0 obj\n';
      if (o.stream) { push(ascii(head + o.body.replace('__LEN__', o.stream.length) + '\nstream\n')); push(o.stream); push(ascii('\nendstream\nendobj\n')); }
      else push(ascii(head + o.body + '\nendobj\n'));
    });
    var xr = len, n = this.objs.length + 1, x = 'xref\n0 ' + n + '\n0000000000 65535 f \n';
    offs.forEach(function (o) { x += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    push(ascii(x + 'trailer\n<</Size ' + n + '/Root ' + rootId + ' 0 R>>\nstartxref\n' + xr + '\n%%EOF\n'));
    var out = new Uint8Array(len), p = 0; parts.forEach(function (u) { out.set(u, p); p += u.length; }); return out;
  };

  var PAGES = { a4: [595.28, 841.89], letter: [612, 792] };

  /* ====================== IMAGE → PDF ====================== */
  function img2pdf(host) {
    var items = [], st = { page: 'a4', orient: 'auto', margin: 24, q: 85 }, alive = true;
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    select(ctl, 'Page size', [['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Same as image']], 'a4', function (v) { st.page = v; });
    select(ctl, 'Orientation', [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], 'auto', function (v) { st.orient = v; });
    select(ctl, 'Margin', [['0', 'None'], ['24', 'Small'], ['48', 'Large']], '24', function (v) { st.margin = +v; });
    slider(ctl, 'Image quality', 40, 100, st.q, '%', function (v) { st.q = v; });
    dropzone(host, true, 'image/png,image/jpeg,image/webp,image/gif,image/bmp', isImg, add, 'Choose images', 'PNG · JPG · WebP');
    var rows = mk('div', 'sx-rows'); host.appendChild(rows);
    var bar = mk('div', 'im-bar'); bar.hidden = true; host.appendChild(bar);
    var go = btn(bar, '<i class="fa-solid fa-file-pdf"></i> Create PDF', 'sx-btn', make);
    btn(bar, '<i class="fa-solid fa-xmark"></i> Clear', 'sx-btn ghost', function () { items.forEach(function (i) { URL.revokeObjectURL(i.url); }); items = []; draw(); });
    var msg = mk('div', 'sx-total'); host.appendChild(msg);
    function add(files) { files.forEach(function (f) { loadImg(f).then(function (r) { items.push({ file: f, img: r.img, url: r.url }); draw(); }).catch(function (e) { msg.textContent = e.message; }); }); }
    function draw() {
      rows.innerHTML = ''; bar.hidden = !items.length;
      items.forEach(function (it, i) {
        var r = mk('div', 'sx-row'); r.innerHTML = '<img alt="" src="' + it.url + '"><div><div class="nm">' + (i + 1) + '. ' + esc(it.file.name) + '</div><div class="st">' + it.img.naturalWidth + '×' + it.img.naturalHeight + ' · ' + fmt(it.file.size) + '</div></div><div class="act"></div>';
        var a = r.querySelector('.act');
        var up = btn(a, '<i class="fa-solid fa-arrow-up"></i>', 'sx-btn ghost im-mini', function () { if (i > 0) { items.splice(i - 1, 0, items.splice(i, 1)[0]); draw(); } }); up.setAttribute('aria-label', 'Move up'); up.disabled = i === 0;
        var dn = btn(a, '<i class="fa-solid fa-arrow-down"></i>', 'sx-btn ghost im-mini', function () { if (i < items.length - 1) { items.splice(i + 1, 0, items.splice(i, 1)[0]); draw(); } }); dn.setAttribute('aria-label', 'Move down'); dn.disabled = i === items.length - 1;
        var rm = btn(a, '<i class="fa-solid fa-xmark"></i>', 'sx-btn ghost im-mini', function () { URL.revokeObjectURL(it.url); items.splice(i, 1); draw(); }); rm.setAttribute('aria-label', 'Remove');
        rows.appendChild(r);
      });
    }
    async function make() {
      if (!items.length) return; go.disabled = true; msg.textContent = 'Building PDF…';
      try {
        var b = new PdfBuilder(), cat = b.reserve(), pagesId = b.reserve(), kids = [];
        for (var i = 0; i < items.length; i++) {
          var im = items[i].img, sc = Math.min(1, 3000 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * sc)), h = Math.max(1, Math.round(im.naturalHeight * sc));
          var c = cvs(w, h), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
          var blob = await toBlob(c, 'image/jpeg', st.q / 100), bytes = new Uint8Array(await blob.arrayBuffer());
          var pw, ph, m = st.margin;
          if (st.page === 'fit') { pw = im.naturalWidth * 0.75 + m * 2; ph = im.naturalHeight * 0.75 + m * 2; }
          else { var base = PAGES[st.page], land = st.orient === 'landscape' || (st.orient === 'auto' && im.naturalWidth > im.naturalHeight); pw = land ? base[1] : base[0]; ph = land ? base[0] : base[1]; }
          var aw = pw - m * 2, ah = ph - m * 2, s = Math.min(aw / im.naturalWidth, ah / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s, dx = (pw - dw) / 2, dy = (ph - dh) / 2;
          var imgId = b.add('<</Type/XObject/Subtype/Image/Width ' + w + '/Height ' + h + '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length __LEN__>>', bytes);
          var content = ascii('q ' + dw.toFixed(2) + ' 0 0 ' + dh.toFixed(2) + ' ' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ' cm /Im0 Do Q'), cId = b.add('<</Length __LEN__>>', content);
          kids.push(b.add('<</Type/Page/Parent ' + pagesId + ' 0 R/MediaBox[0 0 ' + pw.toFixed(2) + ' ' + ph.toFixed(2) + ']/Resources<</XObject<</Im0 ' + imgId + ' 0 R>>>>/Contents ' + cId + ' 0 R>>'));
          msg.textContent = 'Building PDF… ' + (i + 1) + '/' + items.length; await new Promise(function (r) { setTimeout(r, 0); });
        }
        b.set(pagesId, '<</Type/Pages/Count ' + kids.length + '/Kids[' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + ']>>');
        b.set(cat, '<</Type/Catalog/Pages ' + pagesId + ' 0 R>>');
        var pdf = b.build(cat), out = new Blob([pdf], { type: 'application/pdf' });
        if (!alive) return; dl(out, (items.length === 1 ? baseName(items[0].file.name) : 'images') + '.pdf'); msg.innerHTML = '<b>' + items.length + ' page' + (items.length > 1 ? 's' : '') + '</b> · ' + fmt(out.size) + ' — saved.';
      } catch (e) { msg.textContent = 'Could not create the PDF: ' + e.message; }
      go.disabled = false;
    }
    return function () { alive = false; items.forEach(function (i) { URL.revokeObjectURL(i.url); }); };
  }

  /* ====================== TEXT → PDF (+ word count) ====================== */
  var HW = { 32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556, 64: 1015, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 123: 334, 124: 260, 125: 334, 126: 584 };
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (c, i) { HW[65 + i] = [667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611][i]; });
  'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function (c, i) { HW[97 + i] = [556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500][i]; });
  for (var d = 48; d <= 57; d++) HW[d] = 556;
  var WIN = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
  var SPECIAL_W = { 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x96: 556, 0x97: 1000, 0x85: 1000, 0x95: 350, 0x80: 556, 0x99: 1000, 0xDF: 611, 0xE6: 889, 0xC6: 1000, 0xF8: 611, 0xD8: 778, 0xA9: 737, 0xAE: 737, 0xB0: 400, 0xD7: 584, 0xF7: 584, 0xAB: 556, 0xBB: 556, 0xA0: 278 };
  function toByte(ch) { var c = ch.charCodeAt(0); if (c === 9) return 32; if (c < 32) return -1; if (c < 128 || (c >= 160 && c <= 255)) return c; return WIN[c] || 63; }
  function widthOf(byte, ch, mono) {
    if (mono) return 600; if (SPECIAL_W[byte]) return SPECIAL_W[byte]; if (HW[byte]) return HW[byte];
    var base = ch.normalize ? ch.normalize('NFD').charCodeAt(0) : 0; return HW[base] || 556;
  }
  function pdfString(chars) { var s = ''; chars.forEach(function (b) { if (b === 40 || b === 41 || b === 92) s += '\\' + String.fromCharCode(b); else if (b < 32 || b > 126) s += '\\' + ('00' + b.toString(8)).slice(-3); else s += String.fromCharCode(b); }); return '(' + s + ')'; }
  function buildTextPdf(text, o) {
    var mono = o.font === 'mono', pg = PAGES[o.page], mg = o.margin, size = o.size, lead = size * o.lead, usable = pg[0] - mg * 2, maxLines = Math.max(1, Math.floor((pg[1] - mg * 2 - (o.numbers ? 18 : 0)) / lead));
    var lines = [];
    text.replace(/\r\n?/g, '\n').split('\n').forEach(function (para) {
      if (!para.trim()) { lines.push([]); return; }
      var cur = [], curW = 0, wordB = [], wordW = 0, flushWord = function () { if (!wordB.length) return; if (curW + wordW > usable && cur.length) { lines.push(cur); cur = []; curW = 0; } cur = cur.concat(wordB); curW += wordW; wordB = []; wordW = 0; };
      Array.from(para.replace(/\s+$/, '')).forEach(function (ch) {
        var b = toByte(ch); if (b < 0) return; var w = widthOf(b, ch, mono) * size / 1000;
        if (b === 32) { flushWord(); if (curW + w <= usable) { cur.push(32); curW += w; } else { lines.push(cur); cur = []; curW = 0; } }
        else { if (wordW + w > usable) { flushWord(); if (curW + w > usable && cur.length) { lines.push(cur); cur = []; curW = 0; } } wordB.push(b); wordW += w; }
        wordB._ch = ch;
      });
      flushWord(); lines.push(cur);
    });
    while (lines.length && !lines[lines.length - 1].length) lines.pop(); if (!lines.length) lines.push([]);
    var pagesLines = []; for (var i = 0; i < lines.length; i += maxLines) pagesLines.push(lines.slice(i, i + maxLines));
    var b = new PdfBuilder(), cat = b.reserve(), pagesId = b.reserve(), f1 = b.add('<</Type/Font/Subtype/Type1/BaseFont/' + (mono ? 'Courier' : 'Helvetica') + '/Encoding/WinAnsiEncoding>>'), f2 = b.add('<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>'), kids = [];
    pagesLines.forEach(function (pl, pi) {
      var c = 'BT /F1 ' + size + ' Tf ' + lead.toFixed(2) + ' TL ' + mg + ' ' + (pg[1] - mg - size).toFixed(2) + ' Td\n';
      pl.forEach(function (ln) { c += (ln.length ? pdfString(ln) + ' Tj ' : '') + 'T*\n'; }); c += 'ET\n';
      if (o.numbers) { var label = 'Page ' + (pi + 1) + ' of ' + pagesLines.length, lw = 0; Array.from(label).forEach(function (ch) { lw += widthOf(ch.charCodeAt(0), ch, false) * 9 / 1000; }); c += 'BT /F2 9 Tf ' + ((pg[0] - lw) / 2).toFixed(2) + ' ' + (mg / 2 + 4).toFixed(2) + ' Td (' + label + ') Tj ET\n'; }
      var cid = b.add('<</Length __LEN__>>', ascii(c));
      kids.push(b.add('<</Type/Page/Parent ' + pagesId + ' 0 R/MediaBox[0 0 ' + pg[0] + ' ' + pg[1] + ']/Resources<</Font<</F1 ' + f1 + ' 0 R/F2 ' + f2 + ' 0 R>>>>/Contents ' + cid + ' 0 R>>'));
    });
    b.set(pagesId, '<</Type/Pages/Count ' + kids.length + '/Kids[' + kids.map(function (k) { return k + ' 0 R'; }).join(' ') + ']>>'); b.set(cat, '<</Type/Catalog/Pages ' + pagesId + ' 0 R>>');
    return { bytes: b.build(cat), pages: kids.length };
  }
  function textStats(t) {
    var words = (t.match(/\S+/g) || []).length, chars = t.length, noSp = t.replace(/\s/g, '').length, sent = (t.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (words ? 1 : 0), paras = t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
    var mins = words / 200; return { words: words, chars: chars, noSp: noSp, sent: sent, paras: paras, read: words ? (mins < 1 ? '< 1 min' : Math.round(mins) + ' min') : '0 min' };
  }
  function txt2pdf(host) {
    var st = { font: 'sans', size: 12, lead: 1.4, margin: 56, page: 'a4', numbers: true };
    var ta = mk('textarea', 'im-ta'); ta.placeholder = 'Type or paste your text here…'; ta.rows = 10; ta.setAttribute('aria-label', 'Document text'); host.appendChild(ta);
    var stats = mk('div', 'im-stats'); host.appendChild(stats);
    var ctl = mk('div', 'im-grid'); ctl.style.marginTop = '1rem'; host.appendChild(ctl);
    select(ctl, 'Font', [['sans', 'Sans-serif (Helvetica)'], ['mono', 'Monospace (Courier)']], 'sans', function (v) { st.font = v; });
    slider(ctl, 'Font size', 8, 20, st.size, ' pt', function (v) { st.size = v; });
    select(ctl, 'Line spacing', [['1.2', 'Tight'], ['1.4', 'Normal'], ['1.7', 'Relaxed']], '1.4', function (v) { st.lead = +v; });
    select(ctl, 'Margins', [['36', 'Narrow'], ['56', 'Normal'], ['80', 'Wide']], '56', function (v) { st.margin = +v; });
    select(ctl, 'Page size', [['a4', 'A4'], ['letter', 'US Letter']], 'a4', function (v) { st.page = v; });
    check(ctl, 'Page numbers', true, function (v) { st.numbers = v; });
    var bar = mk('div', 'im-bar'); host.appendChild(bar);
    var file = mk('input'); file.type = 'file'; file.accept = '.txt,text/plain'; file.hidden = true; bar.appendChild(file);
    btn(bar, '<i class="fa-solid fa-file-pdf"></i> Download PDF', 'sx-btn', function () {
      if (!ta.value.trim()) { msg.textContent = 'Type some text first.'; return; }
      var r = buildTextPdf(ta.value, st), blob = new Blob([r.bytes], { type: 'application/pdf' }); dl(blob, 'document.pdf'); msg.innerHTML = '<b>' + r.pages + ' page' + (r.pages > 1 ? 's' : '') + '</b> · ' + fmt(blob.size) + ' — saved.';
    });
    btn(bar, '<i class="fa-regular fa-folder-open"></i> Open .txt file', 'sx-btn ghost', function () { file.click(); });
    btn(bar, '<i class="fa-solid fa-eraser"></i> Clear', 'sx-btn ghost', function () { ta.value = ''; upd(); });
    var msg = mk('div', 'sx-total'); host.appendChild(msg);
    file.addEventListener('change', function () { var f = file.files[0]; file.value = ''; if (!f) return; var r = new FileReader(); r.onload = function () { ta.value = String(r.result); upd(); }; r.readAsText(f); });
    function upd() { var s = textStats(ta.value); stats.innerHTML = [['Words', s.words], ['Characters', s.chars], ['No spaces', s.noSp], ['Sentences', s.sent], ['Paragraphs', s.paras], ['Reading time', s.read]].map(function (x) { return '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join(''); }
    ta.addEventListener('input', upd); upd();
    return function () { };
  }

  /* ====================== PDF engine (pdf-lib) ====================== */
  var lib = null;
  function loadLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (lib) return lib;
    lib = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = CFG.pdfLibUrl; s.async = true; s.onload = function () { window.PDFLib ? res(window.PDFLib) : rej(new Error('PDF engine did not start')); }; s.onerror = function () { rej(new Error('Could not load the PDF engine — check your internet connection')); }; document.head.appendChild(s); });
    lib.catch(function () { lib = null; }); return lib;
  }
  function pdfError(e, name) { var m = String(e && e.message || e); return /encrypt|password/i.test(m) ? '“' + name + '” is password-protected — remove the password first.' : /engine|internet/i.test(m) ? m : '“' + name + '” could not be read as a PDF.'; }

  function merge(host) {
    var items = [], alive = true;
    dropzone(host, true, 'application/pdf,.pdf', isPdf, add, 'Choose PDF files to merge', 'PDF');
    var rows = mk('div', 'sx-rows'); host.appendChild(rows);
    var bar = mk('div', 'im-bar'); bar.hidden = true; host.appendChild(bar);
    var go = btn(bar, '<i class="fa-solid fa-object-group"></i> Merge PDFs', 'sx-btn', make);
    btn(bar, '<i class="fa-solid fa-xmark"></i> Clear', 'sx-btn ghost', function () { items = []; draw(); });
    var msg = mk('div', 'sx-total'); host.appendChild(msg);
    function add(files) {
      msg.textContent = '';
      files.forEach(function (f) {
        var it = { file: f, pages: null, err: null }; items.push(it); draw();
        Promise.all([loadLib(), readBuf(f)]).then(function (r) { it.bytes = r[1]; return r[0].PDFDocument.load(r[1]); }).then(function (doc) { it.pages = doc.getPageCount(); draw(); }).catch(function (e) { it.err = pdfError(e, f.name); draw(); });
      });
    }
    function draw() {
      rows.innerHTML = ''; bar.hidden = !items.length;
      items.forEach(function (it, i) {
        var r = mk('div', 'sx-row im-pdfrow'); r.innerHTML = '<div class="im-pdfic"><i class="fa-solid fa-file-pdf"></i></div><div><div class="nm">' + (i + 1) + '. ' + esc(it.file.name) + '</div><div class="st">' + (it.err ? '<span class="bad">' + esc(it.err) + '</span>' : it.pages == null ? 'reading…' : it.pages + ' page' + (it.pages > 1 ? 's' : '') + ' · ' + fmt(it.file.size)) + '</div></div><div class="act"></div>';
        var a = r.querySelector('.act');
        var up = btn(a, '<i class="fa-solid fa-arrow-up"></i>', 'sx-btn ghost im-mini', function () { if (i > 0) { items.splice(i - 1, 0, items.splice(i, 1)[0]); draw(); } }); up.setAttribute('aria-label', 'Move up'); up.disabled = i === 0;
        var dn = btn(a, '<i class="fa-solid fa-arrow-down"></i>', 'sx-btn ghost im-mini', function () { if (i < items.length - 1) { items.splice(i + 1, 0, items.splice(i, 1)[0]); draw(); } }); dn.setAttribute('aria-label', 'Move down'); dn.disabled = i === items.length - 1;
        var rm = btn(a, '<i class="fa-solid fa-xmark"></i>', 'sx-btn ghost im-mini', function () { items.splice(i, 1); draw(); }); rm.setAttribute('aria-label', 'Remove');
        rows.appendChild(r);
      });
    }
    async function make() {
      var good = items.filter(function (i) { return i.pages != null && !i.err; });
      if (good.length < 2) { msg.textContent = 'Add at least two readable PDFs to merge.'; return; }
      go.disabled = true; msg.textContent = 'Merging…';
      try {
        var L = await loadLib(), out = await L.PDFDocument.create(), total = 0;
        for (var i = 0; i < good.length; i++) { var src = await L.PDFDocument.load(good[i].bytes), pgs = await out.copyPages(src, src.getPageIndices()); pgs.forEach(function (p) { out.addPage(p); }); total += pgs.length; }
        var bytes = await out.save(), blob = new Blob([bytes], { type: 'application/pdf' }); if (!alive) return; dl(blob, 'merged.pdf'); msg.innerHTML = '<b>' + good.length + ' files → ' + total + ' pages</b> · ' + fmt(blob.size) + ' — saved as merged.pdf.';
      } catch (e) { msg.textContent = 'Merge failed: ' + (e.message || e); }
      go.disabled = false;
    }
    return function () { alive = false; };
  }

  function parseRanges(str, n) {
    var out = [], seen = {}, parts = str.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!parts.length) throw new Error('Enter pages, for example 1-3, 5, 8-');
    parts.forEach(function (p) {
      var m = /^(\d*)\s*-\s*(\d*)$/.exec(p), a, b;
      if (m && (m[1] || m[2])) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : n; } else if (/^\d+$/.test(p)) { a = b = +p; } else throw new Error('“' + p + '” is not a valid page or range.');
      if (a < 1 || b > n || a > b) throw new Error('“' + p + '” is outside 1–' + n + '.');
      for (var i = a; i <= b; i++) if (!seen[i]) { seen[i] = 1; out.push(i - 1); }
    });
    return out;
  }
  function split(host) {
    var doc = null, bytes = null, name = 'document', n = 0, mode = 'range', alive = true, outs = [];
    var drop = dropzone(host, false, 'application/pdf,.pdf', isPdf, open, 'Choose a PDF to split', 'PDF');
    var app = mk('div', 'im-app'); app.hidden = true; host.appendChild(app);
    var info = mk('div', 'im-info'); app.appendChild(info);
    var seg = mk('div', 'im-seg3'); seg.innerHTML = '<button type="button" data-m="range" class="on">Extract pages</button><button type="button" data-m="every">Split every N pages</button><button type="button" data-m="each">Every page separately</button>'; app.appendChild(seg);
    var box = mk('div', 'im-grid'); box.style.marginTop = '.9rem'; app.appendChild(box);
    var rangeW = mk('div', 'im-ctl'); rangeW.innerHTML = '<label for="spR"><span>Pages to keep</span></label><input id="spR" class="im-text" placeholder="e.g. 1-3, 5, 8-" value="1">'; box.appendChild(rangeW);
    var everyW = mk('div', 'im-ctl'); everyW.hidden = true; everyW.innerHTML = '<label for="spN"><span>Pages per file</span></label><input id="spN" class="im-text" type="number" min="1" value="1">'; box.appendChild(everyW);
    var bar = mk('div', 'im-bar'); app.appendChild(bar);
    var go = btn(bar, '<i class="fa-solid fa-scissors"></i> Split PDF', 'sx-btn', make);
    btn(bar, '<i class="fa-solid fa-file-pdf"></i> Choose another PDF', 'sx-btn ghost', function () { doc = null; app.hidden = true; drop.hidden = false; res.innerHTML = ''; msg.textContent = ''; });
    var msg = mk('div', 'sx-total'); app.appendChild(msg);
    var res = mk('div', 'sx-rows'); app.appendChild(res);
    seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); rangeW.hidden = mode !== 'range'; everyW.hidden = mode !== 'every'; });
    function open(files) {
      var f = files[0]; name = baseName(f.name); msg.textContent = ''; res.innerHTML = '';
      Promise.all([loadLib(), readBuf(f)]).then(function (r) { bytes = r[1]; return r[0].PDFDocument.load(r[1]); }).then(function (d) {
        doc = d; n = d.getPageCount(); info.textContent = f.name + ' · ' + n + ' page' + (n > 1 ? 's' : '') + ' · ' + fmt(f.size);
        app.querySelector('#spR').value = n > 1 ? '1-' + Math.ceil(n / 2) : '1'; drop.hidden = true; app.hidden = false;
      }).catch(function (e) { drop.querySelector('p').innerHTML = '<b>' + esc(pdfError(e, f.name)) + '</b>'; });
    }
    async function part(indices) { var L = await loadLib(), o = await L.PDFDocument.create(), pgs = await o.copyPages(doc, indices); pgs.forEach(function (p) { o.addPage(p); }); return new Blob([await o.save()], { type: 'application/pdf' }); }
    async function make() {
      if (!doc) return; msg.textContent = 'Splitting…'; res.innerHTML = ''; go.disabled = true; outs = [];
      try {
        var groups = [];
        if (mode === 'range') { var idx = parseRanges(app.querySelector('#spR').value, n); groups.push({ idx: idx, label: 'pages-' + app.querySelector('#spR').value.replace(/\s+/g, '').replace(/,/g, '_') }); }
        else { var k = mode === 'each' ? 1 : Math.max(1, Math.floor(+app.querySelector('#spN').value) || 1); for (var s = 0; s < n; s += k) { var idxs = []; for (var j = s; j < Math.min(n, s + k); j++) idxs.push(j); groups.push({ idx: idxs, label: 'part-' + (groups.length + 1) }); } }
        if (groups.length > 200) throw new Error('That would make ' + groups.length + ' files — choose a larger number of pages per file.');
        for (var g = 0; g < groups.length; g++) { var blob = await part(groups[g].idx); outs.push({ blob: blob, file: name + '-' + groups[g].label + '.pdf', pages: groups[g].idx.length }); }
        if (!alive) return; res.innerHTML = '';
        outs.forEach(function (o) { var r = mk('div', 'sx-row im-pdfrow'); r.innerHTML = '<div class="im-pdfic"><i class="fa-solid fa-file-pdf"></i></div><div><div class="nm">' + esc(o.file) + '</div><div class="st">' + o.pages + ' page' + (o.pages > 1 ? 's' : '') + ' · ' + fmt(o.blob.size) + '</div></div><div class="act"></div>'; btn(r.querySelector('.act'), '<i class="fa-solid fa-download"></i> Save', 'sx-btn', function () { dl(o.blob, o.file); }); res.appendChild(r); });
        if (outs.length === 1) dl(outs[0].blob, outs[0].file);
        else btn(res, '<i class="fa-solid fa-download"></i> Save all ' + outs.length + ' files', 'sx-btn', function () { outs.forEach(function (o, i) { setTimeout(function () { dl(o.blob, o.file); }, i * 300); }); });
        msg.innerHTML = '<b>' + outs.length + ' file' + (outs.length > 1 ? 's' : '') + '</b> ready.';
      } catch (e) { msg.textContent = e.message || String(e); }
      go.disabled = false;
    }
    return function () { alive = false; };
  }

  window.SX_DOC = { img2pdf: img2pdf, txt2pdf: txt2pdf, merge: merge, split: split, _buildTextPdf: buildTextPdf, _parseRanges: parseRanges };
})();
