/* Smart21brain AI — photo & file attachments.
   Photos are shrunk in the browser (max 1280 px JPEG) before they are sent; text, code and PDF files are read in the
   browser and sent as plain text. Nothing is stored on the server by this script. */
(function () {
  'use strict';
  var L = window.S21AIL, T = L.t;
  var MAX_IMG = 3, MAX_FILE = 2, IMG_SIDE = 1280, THUMB = 96, MAX_BYTES = 12 * 1024 * 1024, MAX_TEXT_BYTES = 1500000, MAX_CHARS = 12000;
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|html?|css|js|mjs|ts|jsx|tsx|py|java|c|h|cpp|cs|php|rb|go|rs|sql|ya?ml|log|ini|sh|swift|kt)$/i;

  L.extend && L.extend({
    en: { att_add: 'Attach a photo or file', att_cam: 'Take a photo', att_limit: 'You can attach up to 3 photos and 2 files.', att_bad: 'That file type is not supported. Use a photo, PDF or text file.', att_big: 'That file is too large.', att_pdf_empty: 'This PDF has no readable text (it may be scanned). Take a photo of the page instead.', att_pdf_fail: 'Could not read that PDF.', att_remove: 'Remove', att_busy: 'Preparing…', att_img_fail: 'Could not read that image.', att_trunc: '[… file shortened …]', att_default_q: 'Please look at what I attached and help me.' },
    sw: { att_add: 'Ambatisha picha au faili', att_cam: 'Piga picha', att_limit: 'Unaweza kuambatisha hadi picha 3 na faili 2.', att_bad: 'Aina hiyo ya faili haitumiki. Tumia picha, PDF au faili la maandishi.', att_big: 'Faili hilo ni kubwa mno.', att_pdf_empty: 'PDF hii haina maandishi yanayosomeka (huenda ni skani). Piga picha ya ukurasa badala yake.', att_pdf_fail: 'Imeshindwa kusoma PDF hiyo.', att_remove: 'Ondoa', att_busy: 'Inaandaa…', att_img_fail: 'Imeshindwa kusoma picha hiyo.', att_trunc: '[… faili limefupishwa …]', att_default_q: 'Tafadhali angalia nilichoambatisha unisaidie.' }
  });

  var items = [], row = null, changeCb = function () {}, errCb = function () {}, seq = 0, working = 0;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function counts() { var i = 0, f = 0; items.forEach(function (x) { if (x.kind === 'img') i++; else f++; }); return { img: i, file: f }; }

  function draw() {
    if (!row) return;
    row.hidden = !items.length && !working;
    row.innerHTML = items.map(function (it) {
      var rm = '<button type="button" class="att-x" data-rm="' + it.id + '" aria-label="' + esc(T('att_remove')) + ' ' + esc(it.name) + '"><i class="fa-solid fa-xmark"></i></button>';
      return it.kind === 'img'
        ? '<div class="att-chip att-img" title="' + esc(it.name) + '"><img src="' + it.thumb + '" alt="' + esc(it.name) + '">' + rm + '</div>'
        : '<div class="att-chip att-file" title="' + esc(it.name) + '"><i class="fa-solid ' + (/\.pdf$/i.test(it.name) ? 'fa-file-pdf' : 'fa-file-lines') + '"></i><span>' + esc(it.name) + '</span>' + rm + '</div>';
    }).join('') + (working ? '<div class="att-chip att-wait"><span class="att-spin"></span><span>' + esc(T('att_busy')) + '</span></div>' : '');
    changeCb();
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (res, rej) { var u = URL.createObjectURL(file), i = new Image(); i.onload = function () { URL.revokeObjectURL(u); res(i); }; i.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); }; i.src = u; });
  }
  function dims(b) { return [b.width || b.naturalWidth, b.height || b.naturalHeight]; }
  function render(b, maxSide, q) {
    var d = dims(b), s = Math.min(1, maxSide / Math.max(d[0], d[1])), w = Math.max(1, Math.round(d[0] * s)), h = Math.max(1, Math.round(d[1] * s));
    var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(b, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q);
  }
  function processImage(file) {
    return loadBitmap(file).then(function (b) {
      var side = IMG_SIDE, q = 0.82, url = render(b, side, q);
      while (url.length > 1.9e6 && (q > 0.45 || side > 640)) { if (q > 0.45) q -= 0.12; else side = Math.round(side * 0.8); url = render(b, side, q); }
      return { dataUrl: url, thumb: render(b, THUMB, 0.7) };
    });
  }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('script')); }; document.head.appendChild(s); }); }
  function readPdf(file) {
    return (window.pdfjsLib ? Promise.resolve() : loadScript(PDFJS)).then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return file.arrayBuffer();
    }).then(function (buf) { return window.pdfjsLib.getDocument({ data: buf }).promise; }).then(function (pdf) {
      var out = '', p = 1, max = Math.min(pdf.numPages, 15);
      function next() {
        if (p > max || out.length > MAX_CHARS) return out;
        return pdf.getPage(p++).then(function (pg) { return pg.getTextContent(); }).then(function (tc) { out += tc.items.map(function (i) { return i.str; }).join(' ') + '\n\n'; return next(); });
      }
      return next();
    });
  }
  function readText(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result)); }; r.onerror = function () { rej(new Error('read')); }; r.readAsText(file); }); }
  function clipText(t) { t = t.replace(/\u0000/g, ''); return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS) + '\n' + T('att_trunc') : t; }

  function addOne(file) {
    var c = counts(), isImg = /^image\/(png|jpe?g|webp|gif|bmp)$/.test(file.type), isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name), isTxt = /^text\//.test(file.type) || TEXT_EXT.test(file.name);
    if (!isImg && !isPdf && !isTxt) { errCb(T('att_bad')); return Promise.resolve(); }
    if ((isImg && c.img >= MAX_IMG) || (!isImg && c.file >= MAX_FILE)) { errCb(T('att_limit')); return Promise.resolve(); }
    if (file.size > MAX_BYTES || (isTxt && !isPdf && file.size > MAX_TEXT_BYTES)) { errCb(T('att_big')); return Promise.resolve(); }
    working++; draw();
    var job = isImg ? processImage(file).then(function (r) { items.push({ id: ++seq, kind: 'img', name: file.name || 'photo.jpg', dataUrl: r.dataUrl, thumb: r.thumb }); }, function () { errCb(T('att_img_fail')); })
      : isPdf ? readPdf(file).then(function (t) { t = (t || '').trim(); if (!t) { errCb(T('att_pdf_empty')); return; } items.push({ id: ++seq, kind: 'file', name: file.name, text: clipText(t) }); }, function () { errCb(T('att_pdf_fail')); })
        : readText(file).then(function (t) { if (!t.trim()) { errCb(T('att_bad')); return; } items.push({ id: ++seq, kind: 'file', name: file.name, text: clipText(t) }); }, function () { errCb(T('att_bad')); });
    return job.then(function () { working--; draw(); });
  }
  function add(files) { files = [].slice.call(files || []); var p = Promise.resolve(); files.forEach(function (f) { p = p.then(function () { return addOne(f); }); }); return p; }

  window.S21Attach = {
    init: function (o) {
      row = o.row; changeCb = o.onChange || changeCb; errCb = o.onError || errCb;
      row.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; var id = +b.getAttribute('data-rm'); items = items.filter(function (x) { return x.id !== id; }); draw(); });
    },
    add: add,
    list: function () { return items.slice(); },
    count: function () { return items.length; },
    busy: function () { return working > 0; },
    clear: function () { items = []; draw(); },
    /* what the server receives */
    payload: function (list) { return (list || items).map(function (x) { return x.kind === 'img' ? { type: 'image', name: x.name, dataUrl: x.dataUrl } : { type: 'text', name: x.name, text: x.text }; }); },
    /* what is saved in the chat history (small) */
    meta: function (list) { return (list || items).map(function (x) { return x.kind === 'img' ? { k: 'img', name: x.name, thumb: x.thumb } : { k: 'file', name: x.name }; }); }
  };
})();
