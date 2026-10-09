/*!
 * System21 — Background Remover (Canva-style editor)
 * One-click AI removal (U²-Net via onnxruntime-web, runs on-device), erase/restore brush, magic wand,
 * undo/redo, compare, backgrounds, edge refine, outline, shadow, crop and export.
 * Exposes: window.SX_BG.mount(hostElement) -> cleanup()
 * Config (optional, set window.SX_BG_CONFIG before this file): ortUrl, ortBase, modelUrl, maxSide
 */
(function () {
  'use strict';

  var CFG = Object.assign({
    ortUrl: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/ort.min.js',
    ortBase: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/',
    modelUrl: 'models/u2netp.onnx',
    maxSide: 2000
  }, window.SX_BG_CONFIG || {});

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtBytes = function (n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB'; };
  var baseName = function (n) { return n.replace(/\.[^.]+$/, ''); };
  var mk = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var canvasOf = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  var toBlob = function (c, type, q) { return new Promise(function (r) { c.toBlob(r, type, q); }); };

  /* ---------- AI engine (lazy, shared across mounts) ---------- */
  var ai = { session: null, loading: null };
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function getSession(onStatus) {
    if (ai.session) return Promise.resolve(ai.session);
    if (ai.loading) return ai.loading;
    ai.loading = (async function () {
      if (!window.ort) { onStatus('Loading AI engine…'); await loadScript(CFG.ortUrl); }
      var ort = window.ort;
      ort.env.wasm.wasmPaths = CFG.ortBase;
      ort.env.wasm.proxy = false;
      onStatus('Downloading model…');
      var resp = await fetch(CFG.modelUrl);
      if (!resp.ok) throw new Error('Model not found (' + resp.status + ')');
      var buf = await resp.arrayBuffer();
      onStatus('Starting model…');
      ai.session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
      return ai.session;
    })();
    ai.loading.catch(function () { ai.loading = null; });
    return ai.loading;
  }
  // Returns Uint8Array alpha (W*H) for the source canvas.
  async function aiMask(src, W, H, onStatus) {
    var session = await getSession(onStatus);
    onStatus('Detecting subject…');
    var S = 320, c = canvasOf(S, S), x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, S, S);
    var d = x.getImageData(0, 0, S, S).data, n = S * S, max = 1e-6, i;
    for (i = 0; i < n; i++) { if (d[i * 4] > max) max = d[i * 4]; if (d[i * 4 + 1] > max) max = d[i * 4 + 1]; if (d[i * 4 + 2] > max) max = d[i * 4 + 2]; }
    var inp = new Float32Array(3 * n), mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
    for (i = 0; i < n; i++) for (var ch = 0; ch < 3; ch++) inp[ch * n + i] = (d[i * 4 + ch] / max - mean[ch]) / std[ch];
    var feeds = {}; feeds[session.inputNames[0]] = new window.ort.Tensor('float32', inp, [1, 3, S, S]);
    var res = await session.run(feeds);
    var o = res[session.outputNames[0]].data, mn = Infinity, mx = -Infinity;
    for (i = 0; i < n; i++) { if (o[i] < mn) mn = o[i]; if (o[i] > mx) mx = o[i]; }
    var m = canvasOf(S, S), mc = m.getContext('2d'), id = mc.createImageData(S, S), rng = (mx - mn) || 1;
    for (i = 0; i < n; i++) {
      var a = (o[i] - mn) / rng; a = clamp((a - 0.08) / 0.84, 0, 1); // mild contrast so the edge is crisp
      id.data[i * 4 + 3] = Math.round(a * 255);
    }
    mc.putImageData(id, 0, 0);
    var big = canvasOf(W, H), bx = big.getContext('2d', { willReadFrequently: true });
    bx.imageSmoothingQuality = 'high'; bx.drawImage(m, 0, 0, W, H);
    var bd = bx.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
    for (i = 0; i < out.length; i++) out[i] = bd[i * 4 + 3];
    return out;
  }

  /* ---------- classic image ops on alpha arrays ---------- */
  function morph(a, W, H, r, isMax) {
    var t = new Uint8Array(a.length), o = new Uint8Array(a.length), x, y, k, v, idx;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      v = isMax ? 0 : 255;
      for (k = -r; k <= r; k++) { idx = y * W + clamp(x + k, 0, W - 1); if (isMax ? a[idx] > v : a[idx] < v) v = a[idx]; }
      t[y * W + x] = v;
    }
    for (x = 0; x < W; x++) for (y = 0; y < H; y++) {
      v = isMax ? 0 : 255;
      for (k = -r; k <= r; k++) { idx = clamp(y + k, 0, H - 1) * W + x; if (isMax ? t[idx] > v : t[idx] < v) v = t[idx]; }
      o[y * W + x] = v;
    }
    return o;
  }
  function boxBlur(a, W, H, r) {
    var t = new Float32Array(a.length), o = new Uint8Array(a.length), w = 2 * r + 1, x, y, s;
    for (y = 0; y < H; y++) {
      s = 0; for (x = -r; x <= r; x++) s += a[y * W + clamp(x, 0, W - 1)];
      for (x = 0; x < W; x++) { t[y * W + x] = s / w; s += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)]; }
    }
    for (x = 0; x < W; x++) {
      s = 0; for (y = -r; y <= r; y++) s += t[clamp(y, 0, H - 1) * W + x];
      for (y = 0; y < H; y++) { o[y * W + x] = Math.round(s / w); s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; }
    }
    return o;
  }
  function refine(a, W, H, shift, feather) {
    var o = a;
    if (shift > 0) o = morph(o, W, H, shift, true);
    else if (shift < 0) o = morph(o, W, H, -shift, false);
    if (feather > 0) o = boxBlur(o, W, H, feather);
    return o;
  }
  function floodRegion(data, W, H, seeds, near) { // returns Uint8Array 1 = in region (4-connected)
    var n = W * H, mark = new Uint8Array(n), stack = new Int32Array(n), sp = 0;
    seeds.forEach(function (i) { if (!mark[i] && near(i)) { mark[i] = 1; stack[sp++] = i; } });
    while (sp) {
      var c = stack[--sp], cx = c % W, cy = (c / W) | 0, nb;
      if (cx > 0) { nb = c - 1; if (!mark[nb] && near(nb)) { mark[nb] = 1; stack[sp++] = nb; } }
      if (cx < W - 1) { nb = c + 1; if (!mark[nb] && near(nb)) { mark[nb] = 1; stack[sp++] = nb; } }
      if (cy > 0) { nb = c - W; if (!mark[nb] && near(nb)) { mark[nb] = 1; stack[sp++] = nb; } }
      if (cy < H - 1) { nb = c + W; if (!mark[nb] && near(nb)) { mark[nb] = 1; stack[sp++] = nb; } }
    }
    return mark;
  }

  var SWATCHES = ['#ffffff', '#000000', '#f1f5f9', '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#8338ec', '#ff7b00', '#2ec4b6', '#e9c46a'];
  var GRADS = [['#ff9a9e', '#fad0c4'], ['#a18cd1', '#fbc2eb'], ['#43e97b', '#38f9d7'], ['#4facfe', '#00f2fe'], ['#fa709a', '#fee140'], ['#0f2027', '#2c5364'], ['#f6d365', '#fda085'], ['#232526', '#414345']];

  /* ================================================================= */
  function mount(host) {
    host.innerHTML = '';
    var S = null;           // current image state
    var alive = true;
    var raf = 0, refTimer = 0;

    /* ---------- DOM ---------- */
    var drop = mk('div', 'sx-drop'); drop.tabIndex = 0; drop.setAttribute('role', 'button');
    drop.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i><p><b>Choose an image</b><br>or drag &amp; drop · paste with Ctrl+V · PNG · JPG · WebP</p>';
    var fileIn = mk('input'); fileIn.type = 'file'; fileIn.accept = 'image/png,image/jpeg,image/webp'; fileIn.hidden = true; drop.appendChild(fileIn);
    host.appendChild(drop);

    var app = mk('div', 'bg-app'); app.hidden = true; host.appendChild(app);
    app.innerHTML =
      '<div class="bg-main">' +
        '<div class="bg-bar" role="toolbar" aria-label="Editor tools">' +
          '<div class="bg-grp" role="group" aria-label="Tool">' +
            '<button type="button" class="bg-ib" data-tool="pan" title="Move / pan (hold Space)"><i class="fa-solid fa-hand"></i></button>' +
            '<button type="button" class="bg-ib" data-tool="erase" title="Erase brush (E)"><i class="fa-solid fa-eraser"></i></button>' +
            '<button type="button" class="bg-ib" data-tool="restore" title="Restore brush (R)"><i class="fa-solid fa-paintbrush"></i></button>' +
            '<button type="button" class="bg-ib" data-tool="wand" title="Magic wand (W)"><i class="fa-solid fa-wand-sparkles"></i></button>' +
          '</div>' +
          '<div class="bg-grp">' +
            '<button type="button" class="bg-ib" id="bgUndo" title="Undo (Ctrl+Z)"><i class="fa-solid fa-rotate-left"></i></button>' +
            '<button type="button" class="bg-ib" id="bgRedo" title="Redo (Ctrl+Y)"><i class="fa-solid fa-rotate-right"></i></button>' +
          '</div>' +
          '<button type="button" class="bg-ib wide" id="bgCmp" title="Hold to see the original"><i class="fa-solid fa-eye"></i><span>Compare</span></button>' +
          '<div class="bg-grp ms-auto">' +
            '<button type="button" class="bg-ib" id="bgZo" title="Zoom out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>' +
            '<span class="bg-zv" id="bgZv">100%</span>' +
            '<button type="button" class="bg-ib" id="bgZi" title="Zoom in"><i class="fa-solid fa-magnifying-glass-plus"></i></button>' +
            '<button type="button" class="bg-ib" id="bgFit" title="Fit to screen"><i class="fa-solid fa-expand"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="bg-stage" id="bgStage"><canvas class="bg-cv" id="bgCv"></canvas><div class="bg-ring" id="bgRing" hidden></div>' +
          '<div class="bg-busy" id="bgBusy" hidden><div class="bg-spin"></div><span id="bgBusyT">Working…</span></div></div>' +
        '<div class="bg-note" id="bgNote" role="status"></div>' +
      '</div>' +
      '<aside class="bg-side">' +
        '<div class="bg-tabs" role="tablist">' +
          '<button type="button" role="tab" data-tab="remove" aria-selected="true"><i class="fa-solid fa-scissors"></i>Remove</button>' +
          '<button type="button" role="tab" data-tab="bg" aria-selected="false"><i class="fa-solid fa-image"></i>Background</button>' +
          '<button type="button" role="tab" data-tab="fx" aria-selected="false"><i class="fa-solid fa-sliders"></i>Effects</button>' +
          '<button type="button" role="tab" data-tab="out" aria-selected="false"><i class="fa-solid fa-download"></i>Export</button>' +
        '</div>' +
        '<div class="bg-panels">' +
          '<div class="bg-panel" data-panel="remove"></div>' +
          '<div class="bg-panel" data-panel="bg" hidden></div>' +
          '<div class="bg-panel" data-panel="fx" hidden></div>' +
          '<div class="bg-panel" data-panel="out" hidden></div>' +
        '</div>' +
      '</aside>';

    var $ = function (s) { return app.querySelector(s); };
    var cv = $('#bgCv'), cx = cv.getContext('2d'), stage = $('#bgStage'), ring = $('#bgRing');
    var note = function (t, kind) { var n = $('#bgNote'); n.textContent = t || ''; n.className = 'bg-note' + (kind ? ' ' + kind : ''); };
    var busy = function (on, t) { $('#bgBusy').hidden = !on; if (t) $('#bgBusyT').textContent = t; };

    /* ---------- control builders ---------- */
    function slider(parent, label, min, max, val, unit, cb, step) {
      var w = mk('div', 'bg-ctl'), id = 'bgs' + Math.random().toString(36).slice(2, 7);
      w.innerHTML = '<label for="' + id + '"><span>' + label + '</span><output>' + val + unit + '</output></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '">';
      var inp = w.querySelector('input'), out = w.querySelector('output');
      inp.addEventListener('input', function () { out.textContent = inp.value + unit; cb(+inp.value); });
      parent.appendChild(w); return { el: w, input: inp, set: function (v) { inp.value = v; out.textContent = v + unit; } };
    }
    function section(parent, title) { var s = mk('div', 'bg-sec'); if (title) s.appendChild(mk('h4', null, title)); parent.appendChild(s); return s; }
    function button(parent, html, cls, cb) { var b = mk('button', cls || 'sx-btn ghost', html); b.type = 'button'; b.addEventListener('click', cb); parent.appendChild(b); return b; }
    function toggle(parent, label, val, cb) {
      var l = mk('label', 'bg-tg'), i = mk('input'); i.type = 'checkbox'; i.checked = val;
      l.appendChild(i); l.appendChild(mk('span', null, label)); i.addEventListener('change', function () { cb(i.checked); }); parent.appendChild(l); return i;
    }
    function colorPick(parent, label, val, cb) {
      var l = mk('label', 'bg-col'), i = mk('input'); i.type = 'color'; i.value = val;
      l.appendChild(mk('span', null, label)); l.appendChild(i); i.addEventListener('input', function () { cb(i.value); }); parent.appendChild(l); return i;
    }

    /* ---------- state ---------- */
    var opts = {
      tool: 'erase', size: 44, hard: 0.7, wandTol: 32, wandMode: 'erase', autoTol: 40,
      bg: { type: 'transparent', color: '#ffffff', grad: 0, blur: 18, img: null },
      fx: { feather: 0, shift: 0, outline: false, outColor: '#ffffff', outW: 8, shadow: false, shOp: 45, shBlur: 24, shX: 0, shY: 14 },
      exp: { fmt: 'image/png', q: 92, crop: false, pad: 12, scale: 100 }
    };
    var view = { z: 1, x: 0, y: 0 }, fitZ = 1, spaceDown = false, comparing = false;

    /* ---------- REMOVE panel ---------- */
    var pRemove = $('[data-panel="remove"]');
    var sAi = section(pRemove, 'Automatic');
    var aiBtn = button(sAi, '<i class="fa-solid fa-wand-magic-sparkles"></i> Remove background', 'sx-btn w-100', function () { runAI(true); });
    sAi.appendChild(mk('p', 'bg-help', 'One click, on-device AI (U²-Net). Your image never leaves your browser. Then fix any spot with the brushes.'));
    var sTools = section(pRemove, 'Brush');
    var toolRow = mk('div', 'bg-seg'); sTools.appendChild(toolRow);
    [['erase', 'fa-eraser', 'Erase'], ['restore', 'fa-paintbrush', 'Restore']].forEach(function (t) {
      var b = mk('button', null, '<i class="fa-solid ' + t[1] + '"></i> ' + t[2]); b.type = 'button'; b.dataset.tool = t[0]; b.addEventListener('click', function () { setTool(t[0]); }); toolRow.appendChild(b);
    });
    slider(sTools, 'Size', 4, 300, opts.size, ' px', function (v) { opts.size = v; updateRing(); });
    slider(sTools, 'Softness', 0, 100, Math.round((1 - opts.hard) * 100), '%', function (v) { opts.hard = 1 - v / 100; });
    var sWand = section(pRemove, 'Magic wand');
    var wRow = mk('div', 'bg-seg'); sWand.appendChild(wRow);
    [['erase', 'Remove area'], ['restore', 'Keep area']].forEach(function (t) {
      var b = mk('button', null, t[1]); b.type = 'button'; b.dataset.wm = t[0]; b.addEventListener('click', function () { opts.wandMode = t[0]; setTool('wand'); syncSeg(); }); wRow.appendChild(b);
    });
    slider(sWand, 'Tolerance', 1, 120, opts.wandTol, '', function (v) { opts.wandTol = v; });
    sWand.appendChild(mk('p', 'bg-help', 'Click a colour on the picture to select the connected area.'));
    var sFall = section(pRemove, 'Plain background? (no AI)');
    slider(sFall, 'Colour tolerance', 1, 140, opts.autoTol, '', function (v) { opts.autoTol = v; });
    button(sFall, '<i class="fa-solid fa-fill-drip"></i> Remove by edge colour', 'sx-btn ghost w-100', function () { runColour(); });
    var sReset = section(pRemove, null);
    var rr = mk('div', 'bg-two'); sReset.appendChild(rr);
    button(rr, '<i class="fa-solid fa-layer-group"></i> Keep all', 'sx-btn ghost', function () { setMask(fillArr(255)); pushHist(); note('Whole image kept.'); });
    button(rr, '<i class="fa-solid fa-trash"></i> Clear all', 'sx-btn ghost', function () { setMask(fillArr(0)); pushHist(); note('Whole image removed — use Restore to paint the subject back.'); });
    function syncSeg() {
      toolRow.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', opts.tool === b.dataset.tool); });
      wRow.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', opts.tool === 'wand' && opts.wandMode === b.dataset.wm); });
      app.querySelectorAll('.bg-bar [data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === opts.tool); b.setAttribute('aria-pressed', b.dataset.tool === opts.tool); });
    }

    /* ---------- BACKGROUND panel ---------- */
    var pBg = $('[data-panel="bg"]');
    var sType = section(pBg, 'Style');
    var typeGrid = mk('div', 'bg-types'); sType.appendChild(typeGrid);
    [['transparent', 'fa-border-none', 'None'], ['color', 'fa-fill', 'Colour'], ['gradient', 'fa-droplet', 'Gradient'], ['blur', 'fa-circle-half-stroke', 'Blur'], ['image', 'fa-image', 'Image']].forEach(function (t) {
      var b = mk('button', null, '<i class="fa-solid ' + t[1] + '"></i><span>' + t[2] + '</span>'); b.type = 'button'; b.dataset.bt = t[0];
      b.addEventListener('click', function () { setBg(t[0]); }); typeGrid.appendChild(b);
    });
    var bgOpts = section(pBg, null);
    var cWrap = mk('div'); bgOpts.appendChild(cWrap);
    var sw = mk('div', 'bg-sw'); cWrap.appendChild(sw);
    SWATCHES.forEach(function (c) { var b = mk('button'); b.type = 'button'; b.style.background = c; b.title = c; b.setAttribute('aria-label', 'Colour ' + c); b.addEventListener('click', function () { opts.bg.color = c; colInput.value = c; setBg('color'); }); sw.appendChild(b); });
    var colInput = colorPick(cWrap, 'Custom colour', opts.bg.color, function (v) { opts.bg.color = v; setBg('color'); });
    var gWrap = mk('div'); bgOpts.appendChild(gWrap);
    var gs = mk('div', 'bg-sw'); gWrap.appendChild(gs);
    GRADS.forEach(function (g, i) { var b = mk('button'); b.type = 'button'; b.style.background = 'linear-gradient(135deg,' + g[0] + ',' + g[1] + ')'; b.setAttribute('aria-label', 'Gradient ' + (i + 1)); b.addEventListener('click', function () { opts.bg.grad = i; setBg('gradient'); }); gs.appendChild(b); });
    var blWrap = mk('div'); bgOpts.appendChild(blWrap);
    slider(blWrap, 'Blur amount', 2, 60, opts.bg.blur, '', function (v) { opts.bg.blur = v; schedule(); });
    blWrap.appendChild(mk('p', 'bg-help', 'Keeps your photo as a softly blurred backdrop.'));
    var imWrap = mk('div'); bgOpts.appendChild(imWrap);
    var bgFile = mk('input'); bgFile.type = 'file'; bgFile.accept = 'image/*'; bgFile.hidden = true; imWrap.appendChild(bgFile);
    button(imWrap, '<i class="fa-solid fa-upload"></i> Upload background image', 'sx-btn ghost w-100', function () { bgFile.click(); });
    bgFile.addEventListener('change', function () {
      var f = bgFile.files[0]; bgFile.value = ''; if (!f) return;
      loadImage(f).then(function (r) { opts.bg.img = r.img; setBg('image'); }).catch(function (e) { note(e.message, 'err'); });
    });
    function setBg(t) {
      if (t === 'image' && !opts.bg.img) { bgFile.click(); return; }
      opts.bg.type = t;
      typeGrid.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.bt === t); });
      cWrap.hidden = t !== 'color'; gWrap.hidden = t !== 'gradient'; blWrap.hidden = t !== 'blur'; imWrap.hidden = t !== 'image';
      schedule();
    }

    /* ---------- EFFECTS panel ---------- */
    var pFx = $('[data-panel="fx"]');
    var sEdge = section(pFx, 'Edges');
    slider(sEdge, 'Smooth edge', 0, 10, 0, ' px', function (v) { opts.fx.feather = v; scheduleRefine(); });
    slider(sEdge, 'Shrink / grow', -10, 10, 0, ' px', function (v) { opts.fx.shift = v; scheduleRefine(); });
    sEdge.appendChild(mk('p', 'bg-help', 'Shrink removes leftover halo around the subject; grow brings back lost edges.'));
    var sOut = section(pFx, 'Outline');
    var outBody = mk('div'); outBody.hidden = true;
    toggle(sOut, 'Add outline (sticker look)', false, function (v) { opts.fx.outline = v; outBody.hidden = !v; schedule(); });
    sOut.appendChild(outBody);
    colorPick(outBody, 'Colour', opts.fx.outColor, function (v) { opts.fx.outColor = v; schedule(); });
    slider(outBody, 'Width', 1, 40, opts.fx.outW, ' px', function (v) { opts.fx.outW = v; schedule(); });
    var sSh = section(pFx, 'Shadow');
    var shBody = mk('div'); shBody.hidden = true;
    toggle(sSh, 'Add drop shadow', false, function (v) { opts.fx.shadow = v; shBody.hidden = !v; schedule(); });
    sSh.appendChild(shBody);
    slider(shBody, 'Opacity', 5, 100, opts.fx.shOp, '%', function (v) { opts.fx.shOp = v; schedule(); });
    slider(shBody, 'Blur', 0, 80, opts.fx.shBlur, ' px', function (v) { opts.fx.shBlur = v; schedule(); });
    slider(shBody, 'Horizontal', -80, 80, opts.fx.shX, ' px', function (v) { opts.fx.shX = v; schedule(); });
    slider(shBody, 'Vertical', -80, 80, opts.fx.shY, ' px', function (v) { opts.fx.shY = v; schedule(); });

    /* ---------- EXPORT panel ---------- */
    var pOut = $('[data-panel="out"]');
    var sFmt = section(pOut, 'Format');
    var fmtSeg = mk('div', 'bg-seg'); sFmt.appendChild(fmtSeg);
    [['image/png', 'PNG'], ['image/jpeg', 'JPG'], ['image/webp', 'WebP']].forEach(function (t) {
      var b = mk('button', null, t[1]); b.type = 'button'; b.dataset.f = t[0];
      b.addEventListener('click', function () { opts.exp.fmt = t[0]; qCtl.el.hidden = t[0] === 'image/png'; fmtSeg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); jpgNote.hidden = !(t[0] === 'image/jpeg' && opts.bg.type === 'transparent'); });
      fmtSeg.appendChild(b);
    });
    fmtSeg.firstChild.classList.add('on');
    var qCtl = slider(sFmt, 'Quality', 40, 100, opts.exp.q, '%', function (v) { opts.exp.q = v; }); qCtl.el.hidden = true;
    var jpgNote = mk('p', 'bg-help', 'JPG has no transparency — transparent areas will be filled white.'); jpgNote.hidden = true; sFmt.appendChild(jpgNote);
    var sSize = section(pOut, 'Size');
    slider(sSize, 'Scale', 25, 100, 100, '%', function (v) { opts.exp.scale = v; });
    var cropIn = toggle(sSize, 'Crop to subject', false, function (v) { opts.exp.crop = v; padCtl.el.hidden = !v; });
    var padCtl = slider(sSize, 'Padding', 0, 100, opts.exp.pad, ' px', function (v) { opts.exp.pad = v; }); padCtl.el.hidden = true;
    var sGo = section(pOut, null);
    var dlBtn = button(sGo, '<i class="fa-solid fa-download"></i> Download', 'sx-btn w-100', function () { doExport('download'); });
    button(sGo, '<i class="fa-regular fa-copy"></i> Copy to clipboard', 'sx-btn ghost w-100', function () { doExport('copy'); });
    var exInfo = mk('p', 'bg-help'); sGo.appendChild(exInfo);
    var sNew = section(pOut, null);
    button(sNew, '<i class="fa-solid fa-image"></i> Edit another image', 'sx-btn ghost w-100', function () { reset(); });

    /* ---------- tabs ---------- */
    app.querySelectorAll('.bg-tabs [data-tab]').forEach(function (t) {
      t.addEventListener('click', function () {
        app.querySelectorAll('.bg-tabs [data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === t); });
        app.querySelectorAll('.bg-panel').forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.tab; });
      });
    });

    /* ---------- image loading ---------- */
    function loadImage(file) {
      return new Promise(function (res, rej) {
        var u = URL.createObjectURL(file), i = new Image();
        i.onload = function () { URL.revokeObjectURL(u); res({ img: i }); };
        i.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Cannot read “' + file.name + '” — is it an image?')); };
        i.src = u;
      });
    }
    function fileIsImage(f) { return f && /^image\/(png|jpe?g|webp)$/.test(f.type); }
    function open(file) {
      if (!fileIsImage(file)) { drop.querySelector('p').innerHTML = '<b>That file type is not supported.</b><br>Use PNG, JPG or WebP.'; return; }
      loadImage(file).then(function (r) {
        var im = r.img, sc = Math.min(1, CFG.maxSide / Math.max(im.naturalWidth, im.naturalHeight));
        var W = Math.max(1, Math.round(im.naturalWidth * sc)), H = Math.max(1, Math.round(im.naturalHeight * sc));
        var src = canvasOf(W, H), sx = src.getContext('2d', { willReadFrequently: true });
        sx.imageSmoothingQuality = 'high'; sx.drawImage(im, 0, 0, W, H);
        var mask = canvasOf(W, H), ref = canvasOf(W, H);
        S = { name: file.name, W: W, H: H, src: src, srcData: null, mask: mask, ref: ref, hist: [], hi: -1, tmp: canvasOf(W, H), sil: canvasOf(W, H), sc: sc, orig: [im.naturalWidth, im.naturalHeight] };
        cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
        drop.hidden = true; app.hidden = false;
        setMask(fillArr(255)); pushHist(); setTool('erase'); setBg('transparent');
        requestAnimationFrame(function () { fitView(); runAI(false); });
      }).catch(function (e) { drop.querySelector('p').innerHTML = '<b>' + esc(e.message) + '</b>'; });
    }
    function reset() { S = null; app.hidden = true; drop.hidden = false; drop.querySelector('p').innerHTML = '<b>Choose an image</b><br>or drag &amp; drop · paste with Ctrl+V · PNG · JPG · WebP'; note(''); }
    drop.addEventListener('click', function (e) { if (e.target !== fileIn) fileIn.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
    fileIn.addEventListener('change', function () { if (fileIn.files[0]) open(fileIn.files[0]); fileIn.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { host.addEventListener(ev, function (e) { if (S) return; e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { host.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    host.addEventListener('drop', function (e) { if (S) return; var f = e.dataTransfer.files[0]; if (f) open(f); });
    function onPaste(e) { if (S) return; var it = [].slice.call(e.clipboardData && e.clipboardData.files || []).filter(fileIsImage)[0]; if (it) open(it); }
    document.addEventListener('paste', onPaste);

    /* ---------- mask helpers ---------- */
    function fillArr(v) { var a = new Uint8Array(S.W * S.H); a.fill(v); return a; }
    function readMask() {
      var d = S.mask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, S.W, S.H).data, a = new Uint8Array(S.W * S.H);
      for (var i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      return a;
    }
    function putAlpha(canvas, a) {
      var x = canvas.getContext('2d'), id = x.createImageData(S.W, S.H);
      for (var i = 0; i < a.length; i++) id.data[i * 4 + 3] = a[i];
      x.putImageData(id, 0, 0);
    }
    function setMask(a) { putAlpha(S.mask, a); doRefine(); }
    function doRefine() {
      if (!S) return;
      var base = readMask(), r = (opts.fx.shift || opts.fx.feather) ? refine(base, S.W, S.H, opts.fx.shift, opts.fx.feather) : base;
      putAlpha(S.ref, r); schedule();
    }
    function scheduleRefine() { clearTimeout(refTimer); refTimer = setTimeout(doRefine, 90); }
    function pushHist() {
      S.hist = S.hist.slice(0, S.hi + 1); S.hist.push(readMask()); if (S.hist.length > 25) S.hist.shift(); S.hi = S.hist.length - 1; syncHist();
    }
    function syncHist() { $('#bgUndo').disabled = !S || S.hi <= 0; $('#bgRedo').disabled = !S || S.hi >= S.hist.length - 1; }
    function undo() { if (S && S.hi > 0) { S.hi--; setMask(S.hist[S.hi]); syncHist(); } }
    function redo() { if (S && S.hi < S.hist.length - 1) { S.hi++; setMask(S.hist[S.hi]); syncHist(); } }
    $('#bgUndo').addEventListener('click', undo); $('#bgRedo').addEventListener('click', redo);

    /* ---------- engines ---------- */
    var aiRunning = false;
    async function runAI(userClick) {
      if (!S || aiRunning) return;
      aiRunning = true; aiBtn.disabled = true; var mine = S;
      try {
        busy(true, 'Preparing…');
        var a = await aiMask(S.src, S.W, S.H, function (t) { busy(true, t); });
        if (!alive || S !== mine) return;
        setMask(a); pushHist();
        note('Background removed. Refine with Erase / Restore, or choose a new background.', 'ok');
      } catch (err) {
        if (!alive || S !== mine) return;
        console.warn('[System21] AI removal unavailable:', err);
        if (userClick || true) {
          runColour(true);
          note('AI engine could not start (' + (err && err.message ? err.message : 'unknown error') + '). Used edge-colour removal instead — use the brushes to finish.', 'warn');
        }
      } finally { aiRunning = false; aiBtn.disabled = false; busy(false); }
    }
    function runColour(quiet) {
      if (!S) return;
      var W = S.W, H = S.H, p = srcPixels(), t2 = opts.autoTol * opts.autoTol, rs = [], gs = [], bs = [], x, y, i;
      var push = function (px, py) { var j = (py * W + px) * 4; rs.push(p[j]); gs.push(p[j + 1]); bs.push(p[j + 2]); };
      for (x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
      var med = function (a) { a.sort(function (a, b) { return a - b; }); return a[a.length >> 1]; }, k = [med(rs), med(gs), med(bs)];
      var near = function (j) { var dr = p[j * 4] - k[0], dg = p[j * 4 + 1] - k[1], db = p[j * 4 + 2] - k[2]; return dr * dr + dg * dg + db * db <= t2; };
      var seeds = []; for (x = 0; x < W; x++) { seeds.push(x, (H - 1) * W + x); } for (y = 0; y < H; y++) { seeds.push(y * W, y * W + W - 1); }
      var bgm = floodRegion(p, W, H, seeds, near), a = new Uint8Array(W * H);
      for (i = 0; i < a.length; i++) a[i] = bgm[i] ? 0 : 255;
      setMask(a); pushHist();
      if (!quiet) note('Removed background colour rgb(' + k.join(', ') + ').', 'ok');
    }
    function srcPixels() { if (!S.srcData) S.srcData = S.src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, S.W, S.H).data; return S.srcData; }
    function wand(px, py) {
      var W = S.W, H = S.H, p = srcPixels(), i0 = (py * W + px) * 4, k = [p[i0], p[i0 + 1], p[i0 + 2]], t2 = opts.wandTol * opts.wandTol;
      var near = function (j) { var dr = p[j * 4] - k[0], dg = p[j * 4 + 1] - k[1], db = p[j * 4 + 2] - k[2]; return dr * dr + dg * dg + db * db <= t2; };
      var reg = floodRegion(p, W, H, [py * W + px], near), a = readMask(), v = opts.wandMode === 'erase' ? 0 : 255;
      for (var i = 0; i < a.length; i++) if (reg[i]) a[i] = v;
      setMask(a); pushHist();
    }

    /* ---------- compositing ---------- */
    function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; compose(); }); }
    function cutout() {
      var t = S.tmp.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, S.W, S.H);
      t.drawImage(S.src, 0, 0); t.globalCompositeOperation = 'destination-in'; t.drawImage(S.ref, 0, 0); t.globalCompositeOperation = 'source-over';
      return S.tmp;
    }
    function drawBackground(x, W, H) {
      var b = opts.bg;
      if (b.type === 'color') { x.fillStyle = b.color; x.fillRect(0, 0, W, H); }
      else if (b.type === 'gradient') { var g = x.createLinearGradient(0, 0, W, H), c = GRADS[b.grad]; g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); x.fillStyle = g; x.fillRect(0, 0, W, H); }
      else if (b.type === 'blur') {
        var f = clamp(b.blur, 2, 60) / 2.2, w1 = Math.max(2, Math.round(W / f)), h1 = Math.max(2, Math.round(H / f)), s = canvasOf(w1, h1), sx = s.getContext('2d');
        sx.imageSmoothingQuality = 'high'; sx.drawImage(S.src, 0, 0, w1, h1);
        var w2 = Math.max(2, Math.round(w1 / 2)), h2 = Math.max(2, Math.round(h1 / 2)), s2 = canvasOf(w2, h2); s2.getContext('2d').drawImage(s, 0, 0, w2, h2);
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(s2, 0, 0, W, H);
      } else if (b.type === 'image' && b.img) {
        var iw = b.img.naturalWidth, ih = b.img.naturalHeight, sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
        x.drawImage(b.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    }
    function compose() {
      if (!S) return;
      var W = S.W, H = S.H; cx.globalCompositeOperation = 'source-over'; cx.shadowColor = 'transparent'; cx.clearRect(0, 0, W, H);
      if (comparing) { cx.drawImage(S.src, 0, 0); return; }
      drawBackground(cx, W, H);
      var cut = cutout(), f = opts.fx, shadowOn = f.shadow;
      var setShadow = function () { cx.shadowColor = 'rgba(0,0,0,' + (f.shOp / 100) + ')'; cx.shadowBlur = f.shBlur; cx.shadowOffsetX = f.shX; cx.shadowOffsetY = f.shY; };
      var noShadow = function () { cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetX = 0; cx.shadowOffsetY = 0; };
      if (f.outline) {
        var sl = S.sil, sx = sl.getContext('2d'); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, W, H);
        sx.drawImage(cut, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = f.outColor; sx.fillRect(0, 0, W, H); sx.globalCompositeOperation = 'source-over';
        var u = canvasOf(W, H), ux = u.getContext('2d'), steps = Math.max(16, Math.round(f.outW * 4)), a, ring2;
        for (ring2 = 1; ring2 >= 0.5; ring2 -= 0.5) for (a = 0; a < steps; a++) { var ang = a / steps * Math.PI * 2; ux.drawImage(sl, Math.cos(ang) * f.outW * ring2, Math.sin(ang) * f.outW * ring2); }
        ux.drawImage(sl, 0, 0);
        if (shadowOn) setShadow(); cx.drawImage(u, 0, 0); noShadow();
      } else if (shadowOn) { setShadow(); cx.drawImage(cut, 0, 0); noShadow(); }
      cx.drawImage(cut, 0, 0);
    }

    /* ---------- view (zoom / pan) ---------- */
    function applyView() {
      cv.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
      cv.style.backgroundSize = (18 / view.z) + 'px ' + (18 / view.z) + 'px';
      $('#bgZv').textContent = Math.round(view.z / (S ? S.sc : 1) * 100) + '%';
      updateRing();
    }
    function fitView() {
      if (!S) return; var r = stage.getBoundingClientRect(); fitZ = Math.min(r.width / S.W, r.height / S.H) * 0.96;
      view.z = fitZ; view.x = (r.width - S.W * fitZ) / 2; view.y = (r.height - S.H * fitZ) / 2; applyView();
    }
    function zoomAt(px, py, nz) {
      nz = clamp(nz, fitZ * 0.3, 10); view.x = px - (px - view.x) * nz / view.z; view.y = py - (py - view.y) * nz / view.z; view.z = nz; applyView();
    }
    $('#bgZi').addEventListener('click', function () { var r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, view.z * 1.25); });
    $('#bgZo').addEventListener('click', function () { var r = stage.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, view.z / 1.25); });
    $('#bgFit').addEventListener('click', fitView);
    stage.addEventListener('wheel', function (e) { if (!S) return; e.preventDefault(); var r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
    var onResize = function () { if (S && !app.hidden) { var keep = Math.abs(view.z - fitZ) < 1e-6; if (keep) fitView(); } };
    window.addEventListener('resize', onResize);

    function setTool(t) { opts.tool = t; stage.dataset.tool = t; syncSeg(); updateRing(); }
    app.querySelectorAll('.bg-bar [data-tool]').forEach(function (b) { b.addEventListener('click', function () { setTool(b.dataset.tool); }); });
    function updateRing() {
      var brush = opts.tool === 'erase' || opts.tool === 'restore';
      if (!brush || spaceDown) { ring.hidden = true; return; }
      var d = opts.size * view.z; ring.style.width = ring.style.height = d + 'px'; ring.classList.toggle('restore', opts.tool === 'restore');
    }

    /* ---------- pointer handling ---------- */
    var pts = new Map(), stroke = null, panning = null, pinch = null;
    function toImg(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * S.W, y: (e.clientY - r.top) / r.height * S.H }; }
    function stamp(x, y, erase) {
      var r = opts.size / 2, h = clamp(opts.hard, 0, 0.99);
      [S.mask, S.ref].forEach(function (c) {
        var g = c.getContext('2d'), gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(h, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = erase ? 'destination-out' : 'source-over'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over';
      });
    }
    function segment(a, b, erase) {
      var d = Math.hypot(b.x - a.x, b.y - a.y), step = Math.max(1, opts.size * 0.18), n = Math.max(1, Math.ceil(d / step));
      for (var i = 1; i <= n; i++) stamp(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, erase);
    }
    stage.addEventListener('pointerdown', function (e) {
      if (!S || e.target.closest('.bg-busy')) return;
      stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { stroke = null; var a = [].slice.call(pts.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: view.z, cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, vx: view.x, vy: view.y }; panning = null; return; }
      var tool = opts.tool;
      if (e.button === 1 || spaceDown || tool === 'pan') { panning = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; stage.classList.add('grab'); return; }
      if (tool === 'erase' || tool === 'restore') { var p = toImg(e); stroke = { last: p, erase: tool === 'erase' }; stamp(p.x, p.y, stroke.erase); schedule(); }
      else if (tool === 'wand') { var q = toImg(e); if (q.x >= 0 && q.y >= 0 && q.x < S.W && q.y < S.H) wand(Math.floor(q.x), Math.floor(q.y)); }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!S) return;
      var r = stage.getBoundingClientRect(); ring.style.left = (e.clientX - r.left) + 'px'; ring.style.top = (e.clientY - r.top) + 'px'; if (!spaceDown && !panning && !pinch) ring.hidden = !(opts.tool === 'erase' || opts.tool === 'restore');
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        var a = [].slice.call(pts.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), ccx = (a[0].x + a[1].x) / 2, ccy = (a[0].y + a[1].y) / 2;
        var nz = clamp(pinch.z * d / pinch.d, fitZ * 0.3, 10), px = pinch.cx - r.left, py = pinch.cy - r.top;
        view.z = nz; view.x = (ccx - r.left) - (px - pinch.vx) * nz / pinch.z; view.y = (ccy - r.top) - (py - pinch.vy) * nz / pinch.z; applyView(); return;
      }
      if (panning) { view.x = panning.vx + e.clientX - panning.x; view.y = panning.vy + e.clientY - panning.y; applyView(); return; }
      if (stroke) {
        var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        (evs.length ? evs : [e]).forEach(function (ev) { var p = toImg(ev); segment(stroke.last, p, stroke.erase); stroke.last = p; }); schedule();
      }
    });
    function endPtr(e) {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (stroke) { stroke = null; pushHist(); if (opts.fx.shift || opts.fx.feather) doRefine(); }
      if (panning && pts.size === 0) { panning = null; stage.classList.remove('grab'); }
    }
    stage.addEventListener('pointerup', endPtr); stage.addEventListener('pointercancel', endPtr);
    stage.addEventListener('pointerleave', function () { if (!stroke) ring.hidden = true; });

    var cmp = $('#bgCmp');
    var cmpOn = function (v) { comparing = v; compose(); };
    cmp.addEventListener('pointerdown', function (e) { e.preventDefault(); cmpOn(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { cmp.addEventListener(ev, function () { if (comparing) cmpOn(false); }); });
    cmp.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cmpOn(true); } });
    cmp.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') cmpOn(false); });

    /* ---------- keyboard ---------- */
    function onKey(e) {
      if (!S || app.hidden) return;
      var tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
      var k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
      else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (k === 'e') setTool('erase'); else if (k === 'r') setTool('restore'); else if (k === 'w') setTool('wand'); else if (k === 'h') setTool('pan');
        else if (k === '[') { opts.size = clamp(opts.size - 6, 4, 300); updateRing(); } else if (k === ']') { opts.size = clamp(opts.size + 6, 4, 300); updateRing(); }
        else if (k === ' ' && tag !== 'button') { e.preventDefault(); if (!spaceDown) { spaceDown = true; stage.classList.add('grab'); updateRing(); } }
      }
    }
    function onKeyUp(e) { if (e.key === ' ' && spaceDown) { spaceDown = false; stage.classList.remove('grab'); updateRing(); } }
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);

    /* ---------- export ---------- */
    async function doExport(mode) {
      if (!S) return;
      comparing = false; compose();
      var W = S.W, H = S.H, f = opts.fx, e = opts.exp, x0 = 0, y0 = 0, w = W, h = H;
      if (e.crop) {
        var d = S.ref.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data, minX = W, minY = H, maxX = -1, maxY = -1, xx, yy;
        for (yy = 0; yy < H; yy++) for (xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 10) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
        if (maxX >= 0) {
          var pad = e.pad + (f.outline ? f.outW : 0), sx2 = f.shadow ? f.shBlur + Math.abs(f.shX) : 0, sy2 = f.shadow ? f.shBlur + Math.abs(f.shY) : 0;
          x0 = clamp(minX - pad - sx2, 0, W - 1); y0 = clamp(minY - pad - sy2, 0, H - 1); w = clamp(maxX + pad + sx2 + 1, 1, W) - x0; h = clamp(maxY + pad + sy2 + 1, 1, H) - y0;
        }
      }
      var sc = e.scale / 100, ow = Math.max(1, Math.round(w * sc)), oh = Math.max(1, Math.round(h * sc)), o = canvasOf(ow, oh), ox = o.getContext('2d');
      if (e.fmt === 'image/jpeg') { ox.fillStyle = '#ffffff'; ox.fillRect(0, 0, ow, oh); }
      ox.imageSmoothingQuality = 'high'; ox.drawImage(cv, x0, y0, w, h, 0, 0, ow, oh);
      var blob = await toBlob(o, e.fmt, e.fmt === 'image/png' ? undefined : e.q / 100);
      if (!blob) { note('This browser cannot encode ' + e.fmt.replace('image/', '').toUpperCase() + '.', 'err'); return; }
      var ext = e.fmt === 'image/jpeg' ? 'jpg' : e.fmt === 'image/webp' ? 'webp' : 'png';
      if (mode === 'copy') {
        try {
          var pngBlob = e.fmt === 'image/png' ? blob : await toBlob(o, 'image/png');
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]); note('Copied to clipboard.', 'ok');
        } catch (err) { note('Copy is not allowed here — use Download instead.', 'warn'); }
        return;
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = baseName(S.name) + '-system21.' + ext; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      exInfo.textContent = a.download + ' · ' + ow + '×' + oh + ' · ' + fmtBytes(blob.size);
      note('Saved ' + a.download + '.', 'ok');
    }

    // initial state of controls
    syncSeg(); syncHist();
    return function cleanup() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(refTimer);
      document.removeEventListener('paste', onPaste); document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); window.removeEventListener('resize', onResize);
      S = null;
    };
  }

  window.SX_BG = { mount: mount, _internals: { morph: morph, boxBlur: boxBlur, refine: refine } };
})();
