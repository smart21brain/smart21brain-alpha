/*!
 * System21 — Image tools: Resize, Crop & Rotate, Convert, Photo Filters.
 * Everything runs in the browser (canvas). Exposes window.SX_IMG = { resize, crop, convert, filters } — each is mount(host) -> cleanup().
 */
(function () {
  'use strict';

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; };
  var baseName = function (n) { return n.replace(/\.[^.]+$/, ''); };
  var mk = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var cvs = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  var toBlob = function (c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); };
  var extOf = function (t) { return t === 'image/jpeg' ? 'jpg' : t === 'image/webp' ? 'webp' : 'png'; };
  var MAXPX = 8192;

  function dl(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function loadFile(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), i = new Image();
      i.onload = function () { URL.revokeObjectURL(u); res(i); };
      i.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Cannot read “' + file.name + '” — is it an image?')); };
      i.src = u;
    });
  }
  var OK = /^image\/(png|jpe?g|webp|gif|bmp)$/;
  function dropzone(host, multiple, onFiles, label) {
    var z = mk('div', 'sx-drop'); z.tabIndex = 0; z.setAttribute('role', 'button');
    var msg = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i><p><b>' + label + '</b><br>or drag &amp; drop here · PNG · JPG · WebP</p>';
    z.innerHTML = msg;
    var inp = mk('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp'; inp.multiple = !!multiple; inp.hidden = true; z.appendChild(inp);
    host.appendChild(z);
    var give = function (files) {
      files = files.filter(function (f) { return OK.test(f.type); });
      if (!files.length) { z.querySelector('p').innerHTML = '<b>That file type is not supported.</b><br>Use PNG, JPG or WebP.'; return; }
      onFiles(multiple ? files : [files[0]]);
    };
    z.addEventListener('click', function (e) { if (e.target !== inp) inp.click(); });
    z.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    inp.addEventListener('change', function () { if (inp.files.length) give([].slice.call(inp.files)); inp.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { z.addEventListener(ev, function (e) { e.preventDefault(); z.classList.remove('over'); }); });
    z.addEventListener('drop', function (e) { give([].slice.call(e.dataTransfer.files)); });
    z.reset = function () { z.querySelector('p').innerHTML = '<b>' + label + '</b><br>or drag &amp; drop here · PNG · JPG · WebP'; };
    return z;
  }
  function slider(parent, label, min, max, val, unit, cb, step) {
    var w = mk('div', 'im-ctl'), id = 'ims' + Math.random().toString(36).slice(2, 7);
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span><output>' + val + unit + '</output></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">';
    var inp = w.querySelector('input'), out = w.querySelector('output');
    inp.addEventListener('input', function () { out.textContent = inp.value + unit; cb(+inp.value); });
    parent.appendChild(w); return { el: w, input: inp, set: function (v) { inp.value = v; out.textContent = v + unit; } };
  }
  function select(parent, label, options, val, cb) {
    var w = mk('div', 'im-ctl'), id = 'imq' + Math.random().toString(36).slice(2, 7);
    w.innerHTML = '<label for="' + id + '"><span>' + label + '</span></label><select id="' + id + '">' + options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    var s = w.querySelector('select'); s.addEventListener('change', function () { cb(s.value); }); parent.appendChild(w); return { el: w, sel: s };
  }
  function check(parent, label, val, cb) {
    var l = mk('label', 'im-tg'), i = mk('input'); i.type = 'checkbox'; i.checked = val; l.appendChild(i); l.appendChild(mk('span', null, label));
    i.addEventListener('change', function () { cb(i.checked); }); parent.appendChild(l); return { el: l, input: i };
  }
  function btn(parent, html, cls, cb) { var b = mk('button', cls || 'sx-btn ghost', html); b.type = 'button'; b.addEventListener('click', cb); parent.appendChild(b); return b; }
  function outType(file, choice) { if (choice !== 'same') return choice; return /jpe?g/.test(file.type) ? 'image/jpeg' : /webp/.test(file.type) ? 'image/webp' : 'image/png'; }

  /* Batch scaffold shared by Resize and Convert */
  function batch(host, label, controlsBuilder, processor, saveSuffix) {
    var ctl = mk('div', 'im-grid'); host.appendChild(ctl);
    var items = [], tm, rows = mk('div', 'sx-rows'), total = mk('div', 'sx-total'), bar = mk('div', 'im-bar');
    var api = controlsBuilder(ctl, function () { clearTimeout(tm); tm = setTimeout(function () { items.forEach(run); }, 220); });
    dropzone(host, true, add, label); host.appendChild(bar); host.appendChild(rows); host.appendChild(total);
    var saveAll = btn(bar, '<i class="fa-solid fa-download"></i> Save all', 'sx-btn', function () { items.filter(function (i) { return i.blob; }).forEach(function (i, n) { setTimeout(function () { dl(i.blob, i.name); }, n * 250); }); });
    var clearB = btn(bar, '<i class="fa-solid fa-xmark"></i> Clear', 'sx-btn ghost', function () { items.forEach(function (i) { i.row.remove(); }); items = []; sum(); });
    bar.hidden = true;
    function add(files) {
      files.forEach(function (file) {
        var it = { file: file, row: mk('div', 'sx-row') };
        it.row.innerHTML = '<img alt=""><div><div class="nm">' + esc(file.name) + '</div><div class="st">reading…</div></div><div class="act"></div>';
        rows.appendChild(it.row); items.push(it); bar.hidden = false;
        loadFile(file).then(function (img) { it.img = img; it.row.querySelector('img').src = img.src || ''; run(it); }).catch(function (e) { it.row.querySelector('.st').textContent = e.message; });
        // thumbnail from an object URL (kept until cleanup)
        it.thumb = URL.createObjectURL(file); it.row.querySelector('img').src = it.thumb;
      });
    }
    function run(it) {
      if (!it.img) return;
      var r = processor(it, api); if (!r) return;
      toBlob(r.canvas, r.type, r.q).then(function (b) {
        if (!b) { it.row.querySelector('.st').textContent = 'This browser cannot encode ' + extOf(r.type).toUpperCase() + '.'; return; }
        it.blob = b; it.name = baseName(it.file.name) + saveSuffix + '.' + extOf(r.type);
        var d = (b.size - it.file.size) / it.file.size, pct = Math.round(Math.abs(d) * 100);
        it.row.querySelector('.st').innerHTML = esc(it.img.naturalWidth + '×' + it.img.naturalHeight) + ' → <b>' + r.canvas.width + '×' + r.canvas.height + '</b> · ' + fmt(it.file.size) + ' → ' + fmt(b.size) + ' <span class="' + (d > 0 ? 'bad' : 'good') + '">(' + (d > 0 ? '+' : '−') + pct + '%)</span>';
        var a = it.row.querySelector('.act'); a.innerHTML = '';
        btn(a, '<i class="fa-solid fa-download"></i> Save', 'sx-btn', function () { dl(b, it.name); });
        sum();
      });
    }
    function sum() { var n = items.filter(function (i) { return i.blob; }).length; total.textContent = n ? n + ' file' + (n > 1 ? 's' : '') + ' ready' : ''; saveAll.hidden = n < 2; if (!items.length) bar.hidden = true; }
    return function () { items.forEach(function (i) { if (i.thumb) URL.revokeObjectURL(i.thumb); }); items = []; };
  }

  /* ============================== RESIZE ============================== */
  var PRESETS = [['', 'Custom size'], ['1080x1080', 'Instagram post · 1080×1080'], ['1080x1920', 'Story / Reel · 1080×1920'], ['500x500', 'WhatsApp profile · 500×500'], ['1280x720', 'YouTube thumbnail · 1280×720'], ['1920x1080', 'Full HD · 1920×1080'], ['413x531', 'Passport photo 35×45 mm · 413×531'], ['820x312', 'Facebook cover · 820×312']];
  function resize(host) {
    return batch(host, 'Choose images to resize', function (ctl, changed) {
      var st = { mode: 'px', w: 1080, h: 0, fit: 'inside', pct: 50, fmt: 'same', q: 90 };
      var modeSeg = mk('div', 'im-seg'); modeSeg.innerHTML = '<button type="button" data-m="px" class="on">By pixels</button><button type="button" data-m="pct">By percent</button>'; ctl.appendChild(modeSeg);
      var pxBox = mk('div', 'im-box'), pctBox = mk('div', 'im-box'); ctl.appendChild(pxBox); ctl.appendChild(pctBox); pctBox.hidden = true;
      var pre = select(pxBox, 'Preset', PRESETS, '', function (v) { if (!v) return; var p = v.split('x'); st.w = +p[0]; st.h = +p[1]; wIn.value = st.w; hIn.value = st.h; fitSel.sel.value = 'cover'; st.fit = 'cover'; changed(); });
      var dims = mk('div', 'im-dims'); dims.innerHTML = '<label>Width<input type="number" min="1" max="' + MAXPX + '" value="' + st.w + '" id="imW"></label><span>×</span><label>Height<input type="number" min="1" max="' + MAXPX + '" placeholder="auto" id="imH"></label><em>px</em>'; pxBox.appendChild(dims);
      var wIn = dims.querySelector('#imW'), hIn = dims.querySelector('#imH');
      var upd = function () { st.w = +wIn.value || 0; st.h = +hIn.value || 0; pre.sel.value = ''; changed(); };
      wIn.addEventListener('input', upd); hIn.addEventListener('input', upd);
      var fitSel = select(pxBox, 'When both are set', [['inside', 'Keep proportions (fit inside)'], ['stretch', 'Stretch to exact size'], ['cover', 'Fill exact size (crop edges)']], 'inside', function (v) { st.fit = v; changed(); });
      slider(pctBox, 'Scale', 5, 300, st.pct, '%', function (v) { st.pct = v; changed(); });
      modeSeg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.mode = b.dataset.m; modeSeg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); pxBox.hidden = st.mode !== 'px'; pctBox.hidden = st.mode !== 'pct'; changed(); });
      var f = select(ctl, 'Output format', [['same', 'Same as original'], ['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], 'same', function (v) { st.fmt = v; qc.el.hidden = v === 'image/png'; changed(); });
      var qc = slider(ctl, 'Quality', 40, 100, st.q, '%', function (v) { st.q = v; changed(); });
      return st;
    }, function (it, st) {
      var iw = it.img.naturalWidth, ih = it.img.naturalHeight, w, h, sx = 0, sy = 0, sw = iw, sh = ih;
      if (st.mode === 'pct') { w = Math.round(iw * st.pct / 100); h = Math.round(ih * st.pct / 100); }
      else if (st.w && st.h) {
        if (st.fit === 'stretch') { w = st.w; h = st.h; }
        else if (st.fit === 'cover') { w = st.w; h = st.h; var k = Math.max(w / iw, h / ih); sw = w / k; sh = h / k; sx = (iw - sw) / 2; sy = (ih - sh) / 2; }
        else { var s = Math.min(st.w / iw, st.h / ih); w = Math.round(iw * s); h = Math.round(ih * s); }
      } else if (st.w) { w = st.w; h = Math.round(ih * st.w / iw); }
      else if (st.h) { h = st.h; w = Math.round(iw * st.h / ih); }
      else { it.row.querySelector('.st').textContent = 'Enter a width and/or height.'; return null; }
      w = clamp(Math.round(w), 1, MAXPX); h = clamp(Math.round(h), 1, MAXPX);
      var c = cvs(w, h), x = c.getContext('2d'), type = outType(it.file, st.fmt);
      if (type === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); }
      x.imageSmoothingQuality = 'high';
      // step-down for big reductions keeps detail crisp
      var src = it.img, cw = iw, ch = ih;
      if (sx === 0 && sy === 0 && sw === iw && sh === ih && w < iw / 2) {
        var tmp = cvs(iw, ih); tmp.getContext('2d').drawImage(it.img, 0, 0); src = tmp;
        while (cw / 2 > w * 1.0 && ch / 2 > h) { var n = cvs(Math.ceil(cw / 2), Math.ceil(ch / 2)), nx = n.getContext('2d'); nx.imageSmoothingQuality = 'high'; nx.drawImage(src, 0, 0, n.width, n.height); src = n; cw = n.width; ch = n.height; }
        x.drawImage(src, 0, 0, cw, ch, 0, 0, w, h);
      } else x.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
      return { canvas: c, type: type, q: st.q / 100 };
    }, '-resized');
  }

  /* ============================== CONVERT ============================== */
  function convert(host) {
    return batch(host, 'Choose images to convert', function (ctl, changed) {
      var st = { fmt: 'image/jpeg', q: 90, bg: '#ffffff' };
      select(ctl, 'Convert to', [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], 'image/jpeg', function (v) { st.fmt = v; qc.el.hidden = v === 'image/png'; bgc.hidden = v !== 'image/jpeg'; changed(); });
      var qc = slider(ctl, 'Quality', 40, 100, st.q, '%', function (v) { st.q = v; changed(); });
      var bgc = mk('label', 'im-col'); bgc.innerHTML = '<span>Fill transparent areas with</span><input type="color" value="#ffffff">'; ctl.appendChild(bgc);
      bgc.querySelector('input').addEventListener('input', function (e) { st.bg = e.target.value; changed(); });
      return st;
    }, function (it, st) {
      var w = it.img.naturalWidth, h = it.img.naturalHeight, c = cvs(w, h), x = c.getContext('2d');
      if (st.fmt === 'image/jpeg') { x.fillStyle = st.bg; x.fillRect(0, 0, w, h); }
      x.drawImage(it.img, 0, 0); return { canvas: c, type: st.fmt, q: st.q / 100 };
    }, '-converted');
  }

  /* ============================== CROP & ROTATE ============================== */
  function crop(host) {
    var img = null, work = null, xf = { rot: 0, fh: false, fv: false }, box = null, aspect = 0, name = 'image', alive = true;
    var drop = dropzone(host, false, function (f) { open(f[0]); }, 'Choose an image to crop');
    var app = mk('div', 'im-app'); app.hidden = true; host.appendChild(app);
    app.innerHTML = '<div class="im-bar2"></div><div class="im-cropwrap" id="imCW"><div class="im-cropbox"><canvas id="imCC"></canvas><div class="im-sel" id="imSel" tabindex="0" aria-label="Crop area"></div></div></div><div class="im-info" id="imInfo"></div>';
    var bar = app.querySelector('.im-bar2'), cc = app.querySelector('#imCC'), sel = app.querySelector('#imSel'), wrap = app.querySelector('#imCW'), info = app.querySelector('#imInfo');
    var rotL = btn(bar, '<i class="fa-solid fa-rotate-left"></i> Left', 'sx-btn ghost', function () { xf.rot = (xf.rot + 3) % 4; rebuild(); });
    btn(bar, '<i class="fa-solid fa-rotate-right"></i> Right', 'sx-btn ghost', function () { xf.rot = (xf.rot + 1) % 4; rebuild(); });
    btn(bar, '<i class="fa-solid fa-arrows-left-right"></i> Flip H', 'sx-btn ghost', function () { xf.fh = !xf.fh; rebuild(); });
    btn(bar, '<i class="fa-solid fa-arrows-up-down"></i> Flip V', 'sx-btn ghost', function () { xf.fv = !xf.fv; rebuild(); });
    var asp = mk('select', 'im-sel-s'); asp.setAttribute('aria-label', 'Aspect ratio');
    [['0', 'Free'], ['1', '1:1'], ['1.3333', '4:3'], ['0.75', '3:4'], ['1.7778', '16:9'], ['0.5625', '9:16'], ['1.5', '3:2']].forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; asp.appendChild(op); });
    bar.appendChild(asp);
    var fmtS = mk('select', 'im-sel-s'); fmtS.setAttribute('aria-label', 'Output format');
    [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']].forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; fmtS.appendChild(op); });
    bar.appendChild(fmtS);
    btn(bar, '<i class="fa-solid fa-download"></i> Download', 'sx-btn', save);
    btn(bar, '<i class="fa-solid fa-image"></i> New', 'sx-btn ghost', function () { img = null; app.hidden = true; drop.hidden = false; drop.reset(); });
    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(function (h) { var d = mk('i', 'im-h im-h-' + h); d.dataset.h = h; sel.appendChild(d); });

    function open(file) {
      name = file.name;
      loadFile(file).then(function (im) {
        var sc = Math.min(1, MAXPX / Math.max(im.naturalWidth, im.naturalHeight)); img = cvs(Math.round(im.naturalWidth * sc), Math.round(im.naturalHeight * sc));
        img.getContext('2d').drawImage(im, 0, 0, img.width, img.height); xf = { rot: 0, fh: false, fv: false }; aspect = 0; asp.value = '0';
        drop.hidden = true; app.hidden = false; rebuild();
      }).catch(function (e) { drop.querySelector('p').innerHTML = '<b>' + esc(e.message) + '</b>'; });
    }
    function rebuild() {
      var sw = xf.rot % 2 ? img.height : img.width, sh = xf.rot % 2 ? img.width : img.height;
      work = cvs(sw, sh); var x = work.getContext('2d'); x.translate(sw / 2, sh / 2); x.rotate(xf.rot * Math.PI / 2); x.scale(xf.fh ? -1 : 1, xf.fv ? -1 : 1); x.drawImage(img, -img.width / 2, -img.height / 2);
      cc.width = sw; cc.height = sh; cc.getContext('2d').drawImage(work, 0, 0); box = { l: 0, t: 0, r: sw, b: sh }; if (aspect) fitAspect(); layout();
    }
    var scale = 1;
    function layout() {
      var maxW = Math.max(200, wrap.clientWidth - 8), maxH = Math.min(window.innerHeight * 0.58, 620); scale = Math.min(maxW / work.width, maxH / work.height, 1);
      cc.style.width = work.width * scale + 'px'; cc.style.height = work.height * scale + 'px'; paint();
    }
    function paint() {
      sel.style.left = box.l * scale + 'px'; sel.style.top = box.t * scale + 'px'; sel.style.width = (box.r - box.l) * scale + 'px'; sel.style.height = (box.b - box.t) * scale + 'px';
      sel.classList.toggle('locked', !!aspect); info.textContent = Math.round(box.r - box.l) + ' × ' + Math.round(box.b - box.t) + ' px  (from ' + work.width + ' × ' + work.height + ')';
    }
    function fitAspect() { // largest centred box with the ratio inside current box
      var w = box.r - box.l, h = box.b - box.t, cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2, nw = w, nh = w / aspect; if (nh > h) { nh = h; nw = h * aspect; }
      box = { l: cx - nw / 2, t: cy - nh / 2, r: cx + nw / 2, b: cy + nh / 2 };
    }
    asp.addEventListener('change', function () { aspect = +asp.value; if (aspect) fitAspect(); paint(); });
    var drag = null, MIN = 16;
    sel.addEventListener('pointerdown', function (e) { sel.setPointerCapture(e.pointerId); drag = { h: e.target.dataset.h || 'move', x: e.clientX, y: e.clientY, b: Object.assign({}, box) }; e.preventDefault(); });
    sel.addEventListener('pointermove', function (e) {
      if (!drag) return; var dx = (e.clientX - drag.x) / scale, dy = (e.clientY - drag.y) / scale, b = drag.b, W = work.width, H = work.height, n = Object.assign({}, b);
      if (drag.h === 'move') { var w = b.r - b.l, h = b.b - b.t; n.l = clamp(b.l + dx, 0, W - w); n.t = clamp(b.t + dy, 0, H - h); n.r = n.l + w; n.b = n.t + h; }
      else {
        var hh = drag.h;
        if (hh.indexOf('w') >= 0) n.l = clamp(b.l + dx, 0, b.r - MIN); if (hh.indexOf('e') >= 0) n.r = clamp(b.r + dx, b.l + MIN, W);
        if (hh.indexOf('n') >= 0) n.t = clamp(b.t + dy, 0, b.b - MIN); if (hh.indexOf('s') >= 0) n.b = clamp(b.b + dy, b.t + MIN, H);
        if (aspect && hh.length === 2) { // corner with locked ratio: anchor the opposite corner
          var ax = hh.indexOf('w') >= 0 ? b.r : b.l, ay = hh.indexOf('n') >= 0 ? b.b : b.t, nw = Math.abs((hh.indexOf('w') >= 0 ? n.l : n.r) - ax), nh2 = nw / aspect;
          var maxW2 = hh.indexOf('w') >= 0 ? ax : W - ax, maxH2 = hh.indexOf('n') >= 0 ? ay : H - ay; if (nh2 > maxH2) { nh2 = maxH2; nw = nh2 * aspect; } if (nw > maxW2) { nw = maxW2; nh2 = nw / aspect; }
          nw = Math.max(nw, MIN); nh2 = nw / aspect;
          n.l = hh.indexOf('w') >= 0 ? ax - nw : ax; n.r = hh.indexOf('w') >= 0 ? ax : ax + nw; n.t = hh.indexOf('n') >= 0 ? ay - nh2 : ay; n.b = hh.indexOf('n') >= 0 ? ay : ay + nh2;
        }
      }
      box = n; paint();
    });
    var end = function () { drag = null; }; sel.addEventListener('pointerup', end); sel.addEventListener('pointercancel', end);
    sel.addEventListener('keydown', function (e) { var d = e.shiftKey ? 10 : 1, m = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]; if (!m) return; e.preventDefault(); var w = box.r - box.l, h = box.b - box.t; box.l = clamp(box.l + m[0], 0, work.width - w); box.t = clamp(box.t + m[1], 0, work.height - h); box.r = box.l + w; box.b = box.t + h; paint(); });
    var onResize = function () { if (work && !app.hidden) layout(); }; window.addEventListener('resize', onResize);
    function save() {
      var x0 = Math.round(box.l), y0 = Math.round(box.t), w = Math.max(1, Math.round(box.r - box.l)), h = Math.max(1, Math.round(box.b - box.t)), c = cvs(w, h), x = c.getContext('2d'), t = fmtS.value;
      if (t === 'image/jpeg') { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); } x.drawImage(work, x0, y0, w, h, 0, 0, w, h);
      toBlob(c, t, 0.92).then(function (b) { if (b) dl(b, baseName(name) + '-cropped.' + extOf(t)); });
    }
    return function () { alive = false; window.removeEventListener('resize', onResize); };
  }

  /* ============================== PHOTO FILTERS ============================== */
  var FP = { brightness: 0, contrast: 0, saturation: 0, hue: 0, warmth: 0, sepia: 0, gray: 0, blur: 0, vignette: 0, invert: false };
  var LOOKS = [['Original', {}], ['B&W', { gray: 100, contrast: 12 }], ['Warm', { warmth: 40, saturation: 10, brightness: 4 }], ['Cool', { warmth: -40, saturation: 6 }], ['Vivid', { saturation: 45, contrast: 18 }], ['Fade', { contrast: -22, brightness: 10, saturation: -20 }], ['Vintage', { sepia: 60, contrast: -8, vignette: 45, warmth: 14 }], ['Drama', { contrast: 40, saturation: -15, vignette: 35, brightness: -6 }]];
  function applyPixels(id, p) {
    var d = id.data, n = d.length, W = id.width, H = id.height;
    var B = p.brightness * 2.55, C = p.contrast * 2.55, cf = (259 * (C + 255)) / (255 * (259 - C)), S = 1 + p.saturation / 100, wm = p.warmth * 0.5;
    var a = p.hue * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    var m00 = 0.213 + cs * 0.787 - sn * 0.213, m01 = 0.715 - cs * 0.715 - sn * 0.715, m02 = 0.072 - cs * 0.072 + sn * 0.928,
      m10 = 0.213 - cs * 0.213 + sn * 0.143, m11 = 0.715 + cs * 0.285 + sn * 0.140, m12 = 0.072 - cs * 0.072 - sn * 0.283,
      m20 = 0.213 - cs * 0.213 - sn * 0.787, m21 = 0.715 - cs * 0.715 + sn * 0.715, m22 = 0.072 + cs * 0.928 + sn * 0.072;
    var se = p.sepia / 100, gr = p.gray / 100, hueOn = p.hue !== 0, i, r, g, b, l, nr, ng, nb;
    for (i = 0; i < n; i += 4) {
      r = d[i] + B + wm; g = d[i + 1] + B; b = d[i + 2] + B - wm;
      if (C) { r = cf * (r - 128) + 128; g = cf * (g - 128) + 128; b = cf * (b - 128) + 128; }
      if (S !== 1) { l = 0.299 * r + 0.587 * g + 0.114 * b; r = l + (r - l) * S; g = l + (g - l) * S; b = l + (b - l) * S; }
      if (hueOn) { nr = m00 * r + m01 * g + m02 * b; ng = m10 * r + m11 * g + m12 * b; nb = m20 * r + m21 * g + m22 * b; r = nr; g = ng; b = nb; }
      if (se) { nr = 0.393 * r + 0.769 * g + 0.189 * b; ng = 0.349 * r + 0.686 * g + 0.168 * b; nb = 0.272 * r + 0.534 * g + 0.131 * b; r += (nr - r) * se; g += (ng - g) * se; b += (nb - b) * se; }
      if (gr) { l = 0.299 * r + 0.587 * g + 0.114 * b; r += (l - r) * gr; g += (l - g) * gr; b += (l - b) * gr; }
      if (p.invert) { r = 255 - r; g = 255 - g; b = 255 - b; }
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r; d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    if (p.vignette) {
      var v = p.vignette / 100, cx = W / 2, cy = H / 2, md = Math.sqrt(cx * cx + cy * cy), x, y, t, k;
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        t = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / md; t = (t - 0.35) / 0.65; if (t <= 0) continue; t = t > 1 ? 1 : t; k = 1 - v * t * t * (3 - 2 * t); i = (y * W + x) * 4; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
      }
    }
  }
  function blurred(src, radius) { // cheap, even blur: shrink then enlarge
    if (radius <= 0) return src; var f = 1 + radius * 0.9, w = Math.max(2, Math.round(src.width / f)), h = Math.max(2, Math.round(src.height / f)), a = cvs(w, h), ax = a.getContext('2d'); ax.imageSmoothingQuality = 'high'; ax.drawImage(src, 0, 0, w, h);
    var w2 = Math.max(2, Math.round(w / 1.6)), h2 = Math.max(2, Math.round(h / 1.6)), b = cvs(w2, h2); b.getContext('2d').drawImage(a, 0, 0, w2, h2);
    var o = cvs(src.width, src.height), ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(b, 0, 0, o.width, o.height); return o;
  }
  function filters(host) {
    var full = null, prev = null, p = Object.assign({}, FP), name = 'image', comparing = false, raf = 0, controls = {};
    var drop = dropzone(host, false, function (f) { open(f[0]); }, 'Choose a photo to edit');
    var app = mk('div', 'im-app im-filters'); app.hidden = true; host.appendChild(app);
    app.innerHTML = '<div class="im-left"><div class="im-viewport"><canvas id="imFC"></canvas></div><div class="im-looks" id="imLooks"></div></div><div class="im-right" id="imPanel"></div>';
    var fc = app.querySelector('#imFC'), looks = app.querySelector('#imLooks'), panel = app.querySelector('#imPanel');
    LOOKS.forEach(function (l) { var b = mk('button', 'im-look', esc(l[0])); b.type = 'button'; b.addEventListener('click', function () { Object.assign(p, FP, l[1]); syncControls(); render(); }); looks.appendChild(b); });
    [['brightness', 'Brightness', -100, 100], ['contrast', 'Contrast', -100, 100], ['saturation', 'Saturation', -100, 100], ['hue', 'Hue', -180, 180], ['warmth', 'Warmth', -100, 100], ['sepia', 'Sepia', 0, 100], ['gray', 'Black & white', 0, 100], ['blur', 'Blur', 0, 12], ['vignette', 'Vignette', 0, 100]].forEach(function (c) {
      controls[c[0]] = slider(panel, c[1], c[2], c[3], 0, '', function (v) { p[c[0]] = v; render(); });
    });
    var inv = check(panel, 'Invert colours', false, function (v) { p.invert = v; render(); });
    var row = mk('div', 'im-bar'); panel.appendChild(row);
    var cmp = btn(row, '<i class="fa-solid fa-eye"></i> Compare', 'sx-btn ghost', function () { });
    cmp.addEventListener('pointerdown', function (e) { e.preventDefault(); comparing = true; render(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { cmp.addEventListener(ev, function () { if (comparing) { comparing = false; render(); } }); });
    btn(row, '<i class="fa-solid fa-rotate-left"></i> Reset', 'sx-btn ghost', function () { Object.assign(p, FP); syncControls(); render(); });
    var fs = select(panel, 'Save as', [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']], 'image/jpeg', function () { });
    var row2 = mk('div', 'im-bar'); panel.appendChild(row2);
    btn(row2, '<i class="fa-solid fa-download"></i> Download', 'sx-btn', save);
    btn(row2, '<i class="fa-solid fa-image"></i> New photo', 'sx-btn ghost', function () { full = null; app.hidden = true; drop.hidden = false; drop.reset(); });
    function syncControls() { Object.keys(controls).forEach(function (k) { controls[k].set(p[k]); }); inv.input.checked = p.invert; }
    function open(file) {
      name = file.name;
      loadFile(file).then(function (im) {
        var sc = Math.min(1, 4000 / Math.max(im.naturalWidth, im.naturalHeight)); full = cvs(Math.round(im.naturalWidth * sc), Math.round(im.naturalHeight * sc)); full.getContext('2d').drawImage(im, 0, 0, full.width, full.height);
        var ps = Math.min(1, 900 / Math.max(full.width, full.height)); prev = cvs(Math.round(full.width * ps), Math.round(full.height * ps)); var px = prev.getContext('2d'); px.imageSmoothingQuality = 'high'; px.drawImage(full, 0, 0, prev.width, prev.height);
        fc.width = prev.width; fc.height = prev.height; Object.assign(p, FP); syncControls(); drop.hidden = true; app.hidden = false; render();
      }).catch(function (e) { drop.querySelector('p').innerHTML = '<b>' + esc(e.message) + '</b>'; });
    }
    function process(src, scale) {
      var q = Object.assign({}, p), base = src; if (q.blur > 0) base = blurred(src, q.blur * scale);
      var c = cvs(base.width, base.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(base, 0, 0); var id = x.getImageData(0, 0, c.width, c.height); applyPixels(id, q); x.putImageData(id, 0, 0); return c;
    }
    function render() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; if (!prev) return; var x = fc.getContext('2d'); if (comparing) { x.drawImage(prev, 0, 0); return; } x.drawImage(process(prev, 1), 0, 0); }); }
    function save() {
      var t = fs.sel.value, out = process(full, full.width / prev.width), c = out;
      if (t === 'image/jpeg') { c = cvs(out.width, out.height); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(out, 0, 0); }
      toBlob(c, t, 0.92).then(function (b) { if (b) dl(b, baseName(name) + '-edited.' + extOf(t)); });
    }
    return function () { cancelAnimationFrame(raf); full = prev = null; };
  }

  window.SX_IMG = { resize: resize, crop: crop, convert: convert, filters: filters, _applyPixels: applyPixels };
})();
