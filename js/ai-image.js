/* Smart21brain AI — image generation.
   Three ways in:  1) type "draw / create an image of ..." (or "tengeneza picha ya ...") in the chat,
                   2) the "Image" mode button, 3) the image studio (header button) with styles, sizes and My images.
   Pictures are made by POST /api/ai-image and kept only on this device (IndexedDB). */
(function () {
  'use strict';
  var L = window.S21AIL, T = L.t, Chat = window.S21Chat, X = window.S21X;
  if (!L || !Chat || !X) return;
  var $ = X.$, $$ = X.$$, esc = X.esc, el = X.el;

  L.extend({
    en: {
      im_btn: 'Create images', im_title: 'Image studio', mode_image: 'Image', ph_image: 'Describe the picture you want…',
      im_prompt: 'What should I draw?', im_prompt_ph: 'e.g. A friendly robot reading a book under a big tree', im_surprise: 'Surprise me',
      im_style: 'Style', im_size: 'Shape', im_square: 'Square', im_wide: 'Wide', im_tall: 'Tall', im_count: 'How many', im_improve: 'Let AI improve my description',
      st_none: 'Auto', st_realistic: 'Realistic', st_cartoon: 'Cartoon', st_anime: 'Anime', st_3d: '3D', st_watercolor: 'Watercolour', st_pixel: 'Pixel art', st_sketch: 'Sketch', st_flat: 'Flat', st_digital: 'Digital art', st_logo: 'Logo',
      im_make: 'Create image', im_making: 'Painting your picture…', im_new: 'New', im_mine: 'My images', im_none: 'Your pictures will appear here.', im_short: 'Please describe the picture first.',
      im_dl: 'Download', im_big: 'Enlarge', im_use: 'Add to chat', im_del: 'Delete', im_again: 'Try again', im_vary: 'Another version', im_used: 'Prompt used',
      im_here: 'Here is your picture:', im_busy: 'Please wait for the current answer to finish.', im_gone: 'This picture is no longer saved on this device.',
      im_fail: 'I could not make that picture. Check your connection and try again.', im_noroute: 'Image creation is not switched on yet (the /api/ai-image route is missing).', im_close: 'Close',
      card5_t: 'Create an image', card5_d: 'Draw a friendly robot reading a book', card5_p: 'Create an image of a friendly robot reading a book under a big tree, cartoon style.',
      im_saved_chat: 'Added to chat'
    },
    sw: {
      im_btn: 'Tengeneza picha', im_title: 'Studio ya picha', mode_image: 'Picha', ph_image: 'Eleza picha unayotaka…',
      im_prompt: 'Nichore nini?', im_prompt_ph: 'mf. Roboti rafiki akisoma kitabu chini ya mti mkubwa', im_surprise: 'Nishangaze',
      im_style: 'Mtindo', im_size: 'Umbo', im_square: 'Mraba', im_wide: 'Pana', im_tall: 'Refu', im_count: 'Ngapi', im_improve: 'AI iboreshe maelezo yangu',
      st_none: 'Otomatiki', st_realistic: 'Halisi', st_cartoon: 'Katuni', st_anime: 'Anime', st_3d: '3D', st_watercolor: 'Rangi za maji', st_pixel: 'Pikseli', st_sketch: 'Mchoro wa penseli', st_flat: 'Bapa', st_digital: 'Sanaa ya kidijitali', st_logo: 'Nembo',
      im_make: 'Tengeneza picha', im_making: 'Natengeneza picha yako…', im_new: 'Mpya', im_mine: 'Picha zangu', im_none: 'Picha zako zitaonekana hapa.', im_short: 'Tafadhali eleza picha kwanza.',
      im_dl: 'Pakua', im_big: 'Kuza', im_use: 'Weka kwenye mazungumzo', im_del: 'Futa', im_again: 'Jaribu tena', im_vary: 'Toleo jingine', im_used: 'Maelezo yaliyotumika',
      im_here: 'Hii hapa picha yako:', im_busy: 'Tafadhali subiri jibu la sasa liishe.', im_gone: 'Picha hii haijahifadhiwa tena kwenye kifaa hiki.',
      im_fail: 'Sikuweza kutengeneza picha hiyo. Angalia mtandao wako kisha jaribu tena.', im_noroute: 'Utengenezaji wa picha haujawashwa bado (njia ya /api/ai-image haipo).', im_close: 'Funga',
      card5_t: 'Tengeneza picha', card5_d: 'Chora roboti rafiki akisoma kitabu', card5_p: 'Tengeneza picha ya roboti rafiki akisoma kitabu chini ya mti mkubwa, mtindo wa katuni.',
      im_saved_chat: 'Imewekwa kwenye mazungumzo'
    }
  });

  var STYLES = ['', 'realistic', 'cartoon', 'anime', '3d', 'watercolor', 'pixel', 'sketch', 'flat', 'digital', 'logo'];
  var STYLE_ICON = { '': 'fa-wand-magic-sparkles', realistic: 'fa-camera', cartoon: 'fa-face-smile', anime: 'fa-star', '3d': 'fa-cube', watercolor: 'fa-droplet', pixel: 'fa-table-cells', sketch: 'fa-pencil', flat: 'fa-shapes', digital: 'fa-palette', logo: 'fa-gem' };
  var IDEAS = {
    en: ['A friendly robot reading a book under a big tree', 'A lion and a zebra playing football on the savannah', 'The solar system as colourful planets with happy faces', 'A cosy classroom on the moon', 'A school bus driving through Mount Kilimanjaro scenery', 'A scientist cat in a laboratory', 'A giant baobab tree at sunset with children playing', 'A futuristic city with flying bicycles', 'A dragon teaching maths to little animals', 'An underwater library full of fish reading books'],
    sw: ['Roboti rafiki akisoma kitabu chini ya mti mkubwa', 'Simba na pundamilia wakicheza mpira kwenye savana', 'Mfumo wa jua kama sayari za rangi zenye nyuso za furaha', 'Darasa maridadi mwezini', 'Basi la shule likipita mandhari ya Mlima Kilimanjaro', 'Paka mwanasayansi kwenye maabara', 'Mbuyu mkubwa wakati wa machweo na watoto wakicheza', 'Jiji la baadaye lenye baiskeli zinazoruka', 'Joka linafundisha hesabu kwa wanyama wadogo', 'Maktaba chini ya maji iliyojaa samaki wanaosoma vitabu']
  };

  /* ---------------- preferences (last style / shape) ---------------- */
  var PKEY = 's21ai-img-prefs-v1', prefs = { style: '', ratio: 'square', count: 1, enhance: true };
  try { var sv = JSON.parse(localStorage.getItem(PKEY) || '{}'); if (sv && typeof sv === 'object') { if (STYLES.indexOf(sv.style) >= 0) prefs.style = sv.style; if (/^(square|wide|tall)$/.test(sv.ratio)) prefs.ratio = sv.ratio; if ([1, 2, 4].indexOf(sv.count) >= 0) prefs.count = sv.count; if (sv.enhance === false) prefs.enhance = false; } } catch (e) {}
  function savePrefs() { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) {} }

  /* ---------------- image storage (IndexedDB, memory fallback) ---------------- */
  var KEEP = 40, mem = {}, dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      try { var r = indexedDB.open('s21ai-images', 1); r.onupgradeneeded = function () { r.result.createObjectStore('imgs', { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try { var t = d.transaction('imgs', mode), q = fn(t.objectStore('imgs')); t.oncomplete = function () { res(q && q.result !== undefined ? q.result : true); }; t.onerror = t.onabort = function () { res(null); }; } catch (e) { res(null); }
      });
    });
  }
  function uid() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function allImgs() {
    return tx('readonly', function (s) { return s.getAll(); }).then(function (rows) {
      var map = {}; (Array.isArray(rows) ? rows : []).forEach(function (r) { map[r.id] = r; }); Object.keys(mem).forEach(function (k) { map[k] = mem[k]; });
      return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.ts - a.ts; });
    });
  }
  function putImg(rec) {
    mem[rec.id] = rec;
    return tx('readwrite', function (s) { return s.put(rec); }).then(function () {
      return allImgs().then(function (list) { list.slice(KEEP).forEach(function (r) { delete mem[r.id]; tx('readwrite', function (s) { return s.delete(r.id); }); }); return rec; });
    });
  }
  function getImg(id) { if (mem[id]) return Promise.resolve(mem[id]); return tx('readonly', function (s) { return s.get(id); }).then(function (r) { return r && r !== true ? r : null; }); }
  function delImg(id) { delete mem[id]; return tx('readwrite', function (s) { return s.delete(id); }); }

  /* ---------------- API ---------------- */
  function gen(prompt, o, signal) {
    return fetch('/api/ai-image', { method: 'POST', signal: signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, style: o.style || undefined, ratio: o.ratio || 'square', enhance: o.enhance !== false }) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || !d.image) { var e = new Error(d.error || (r.status === 404 || r.status === 405 ? T('im_noroute') : T('im_fail'))); e.code = d.code || String(r.status); throw e; }
          return d;
        });
      });
  }
  function makeRec(d, userPrompt, o) { return { id: uid(), ts: Date.now(), dataUrl: d.image, prompt: userPrompt, used: d.prompt || '', style: o.style || '', ratio: d.ratio || o.ratio || 'square' }; }

  /* ---------------- download / lightbox ---------------- */
  function slug(s) { return String(s || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'; }
  function download(rec) {
    var ext = /image\/png/.test(rec.dataUrl) ? 'png' : /image\/webp/.test(rec.dataUrl) ? 'webp' : 'jpg';
    var a = document.createElement('a'); a.href = rec.dataUrl; a.download = 'smart21brain-ai-' + slug(rec.prompt) + '.' + ext; document.body.appendChild(a); a.click(); a.remove();
  }
  function lightbox(rec) {
    var m = X.modal(T('im_title'), 'fa-image', 'x-wide gi-lb'), b = m.body;
    b.innerHTML = '<img class="gi-big" alt="' + esc(rec.prompt) + '"><p class="gi-cap">' + esc(rec.prompt) + '</p><div class="x-row"><button type="button" class="pill-btn primary"><i class="fa-solid fa-download"></i> ' + esc(T('im_dl')) + '</button></div>';
    $('.gi-big', b).src = rec.dataUrl; $('.pill-btn', b).addEventListener('click', function () { download(rec); });
  }

  /* ---------------- inline chat image ---------------- */
  function figure(rec) {
    var f = el('figure', 'gi-fig gi-' + rec.ratio);
    f.innerHTML = '<button type="button" class="gi-open" aria-label="' + esc(T('im_big')) + '"><img alt="' + esc(rec.prompt) + '" loading="lazy"></button>' +
      '<figcaption><button type="button" class="pill-btn" data-g="dl"><i class="fa-solid fa-download"></i> ' + esc(T('im_dl')) + '</button><button type="button" class="pill-btn" data-g="big"><i class="fa-solid fa-expand"></i> ' + esc(T('im_big')) + '</button>' +
      (rec.used ? '<details class="gi-used"><summary>' + esc(T('im_used')) + '</summary><p>' + esc(rec.used) + '</p></details>' : '') + '</figcaption>';
    $('img', f).src = rec.dataUrl;
    f.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.getAttribute('data-g') === 'dl') download(rec); else lightbox(rec); });
    return f;
  }
  Chat.paintImage = function (node, m) {
    var md = $('.md', node); if (!md || !m.imgId) return;
    var slot = el('div', 'gi-slot'); md.appendChild(slot);
    getImg(m.imgId).then(function (rec) { if (!slot.parentNode) return; if (rec) slot.appendChild(figure(rec)); else { slot.innerHTML = '<p class="gi-gone"><i class="fa-regular fa-image"></i> ' + esc(T('im_gone')) + '</p>'; } });
  };
  function skeleton(node, ratio) {
    $('.md', node).innerHTML = '<div class="gi-skel gi-' + ratio + '" role="status"><span><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('im_making')) + '</span></div>';
  }

  /* run one chat turn that produces an image */
  function runTurn(userText, o) {
    var ctrl = new AbortController(), turn = Chat.beginTurn(userText, function () { ctrl.abort(); });
    if (!turn) { Chat.toast(T('im_busy')); return true; }
    skeleton(turn.node, o.ratio);
    gen(userText, o, ctrl.signal).then(function (d) {
      var rec = makeRec(d, userText, o);
      return putImg(rec).then(function () { turn.finish(T('im_here') + ' *' + userText.replace(/[*_`]/g, '').slice(0, 200) + '*', { imgId: rec.id, imgPrompt: userText, imgStyle: o.style, imgRatio: o.ratio }); });
    }).catch(function (e) {
      if (e && e.name === 'AbortError') { turn.cancel(); return; }
      turn.fail(e && e.message ? e.message : T('im_fail'));
    });
    return true;
  }

  /* ---------------- "draw me ..." detection (English + Kiswahili) ---------------- */
  var NOUN = '(?:image|picture|photo|photograph|illustration|drawing|painting|logo|poster|wallpaper|cartoon|artwork|portrait|avatar|icon|sticker|banner|thumbnail)s?';
  var RE_EN = new RegExp('^\\s*(?:please\\s+)?(?:(?:can|could|would)\\s+you\\s+(?:please\\s+)?|i\\s+(?:want|need|would\\s+like)\\s+(?:you\\s+to\\s+|to\\s+)?)?(?:generate|create|make|draw|paint|design|produce|render|sketch|illustrate|show\\s+me|give\\s+me)\\s+(?:for\\s+me\\s+|me\\s+)?(?:an?\\s+|the\\s+|some\\s+|my\\s+)?(?:[\\w\'-]+\\s+){0,3}?' + NOUN + '\\b', 'i');
  var RE_OF = new RegExp('^\\s*(?:an?\\s+)?(?:image|picture|illustration|drawing|painting|photo)\\s+of\\b', 'i');
  var RE_DRAW = /^\s*(?:please\s+)?(?:draw|paint|sketch)\s+(?:me\s+)?(?:an?|the|some)?\s*\w+/i;
  var RE_STUDY = /\b(diagram|graph|table|chart|flowchart|triangle|angle|circuit|plot|equation|map of the (?:brain|cell))\b/i;
  var RE_SW = /^\s*(?:tafadhali\s+)?(?:(?:tengeneza|tengenezea|nitengenezee|nitengenezea|unda|nichoree|nichorie|nionyeshe|nipe|toa)\s+(?:\S+\s+){0,2}?(?:picha|mchoro|nembo|bango|katuni)\b|(?:chora|nichoree|nichorie)\s+\S+|(?:picha|mchoro)\s+ya\b)/i;
  var RE_TECH = /\b(html|css|javascript|js|python|java|php|sql|svg|react|code|coding|script|program|function|canva|photoshop|figma|excel|word|powerpoint)\b/i;
  var RE_CMD = /^\s*imagine[:,]?\s+(.{3,})/i;   // "imagine a dragon reading a book" (a leading / would open the prompt library)
  var STYLE_WORDS = [[/\b(cartoon|katuni)\b/i, 'cartoon'], [/\banime\b/i, 'anime'], [/\b3d\b/i, '3d'], [/\bwater\s?colou?r\b/i, 'watercolor'], [/\bpixel\s?art\b/i, 'pixel'], [/\b(pencil )?sketch\b/i, 'sketch'], [/\b(realistic|photorealistic|photograph)\b/i, 'realistic'], [/\bflat (?:vector|design|illustration)\b/i, 'flat'], [/\blogo|nembo\b/i, 'logo']];

  function detect(text) {
    var cmd = text.match(RE_CMD); if (cmd) return cmd[1].trim();
    if (Chat.getMode() || RE_TECH.test(text)) return null;      // only in Auto mode, and not for "make an icon in CSS"
    if (RE_EN.test(text) || RE_OF.test(text) || RE_SW.test(text)) return text.trim();
    if (RE_DRAW.test(text) && !RE_STUDY.test(text)) return text.trim();
    return null;
  }
  function styleFor(text) { for (var i = 0; i < STYLE_WORDS.length; i++) if (STYLE_WORDS[i][0].test(text)) return STYLE_WORDS[i][1]; return prefs.style; }

  Chat.intercept = function (text, force) {
    text = (text || '').trim(); if (!text) return false;
    var p = force ? text : (Chat.getMode() === 'image' ? text.replace(RE_CMD, '$1') : detect(text));
    if (!p) return false;
    return runTurn(p.slice(0, 600), { style: styleFor(p), ratio: prefs.ratio, enhance: prefs.enhance });
  };
  Chat.regenImage = function (userText, last) {
    runTurn(userText, { style: (last && last.imgStyle) || prefs.style, ratio: (last && last.imgRatio) || prefs.ratio, enhance: prefs.enhance });
  };

  /* "Image" mode button */
  var bar = $('#modes');
  if (bar) { var mb = el('button', null, '<i class="fa-solid fa-image"></i> <span data-ai-t="mode_image"></span>'); mb.type = 'button'; mb.setAttribute('role', 'radio'); mb.setAttribute('aria-checked', 'false'); mb.setAttribute('data-mode', 'image'); var before = bar.querySelector('[data-mode="math"]'); bar.insertBefore(mb, before || null); }

  /* ---------------- image studio (modal) ---------------- */
  var M = null, ctrl = null;
  function seg(id, label, opts, val) {
    return '<div class="x-field"><label>' + esc(label) + '</label><div class="x-seg" data-seg="' + id + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (String(o[0]) === String(val) ? 'on' : '') + '" aria-pressed="' + (String(o[0]) === String(val)) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
  }
  function openStudio(initial) {
    if (M) M.close();
    M = X.modal(T('im_title'), 'fa-image', 'x-wide gi-studio');
    M.onClose = function () { if (ctrl) ctrl.abort(); M = null; };
    var b = M.body;
    b.innerHTML =
      '<div class="gi-tabs" role="tablist"><button type="button" role="tab" class="on" data-tab="new"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('im_new')) + '</button><button type="button" role="tab" data-tab="mine"><i class="fa-regular fa-images"></i> ' + esc(T('im_mine')) + '</button></div>' +
      '<div class="gi-pane" data-pane="new">' +
        '<div class="x-field"><label for="giPrompt">' + esc(T('im_prompt')) + '</label><textarea id="giPrompt" class="x-ta" rows="3" maxlength="600" placeholder="' + esc(T('im_prompt_ph')) + '"></textarea>' +
        '<div class="x-chips"><button type="button" class="x-chip" id="giIdea"><i class="fa-solid fa-dice"></i> ' + esc(T('im_surprise')) + '</button></div></div>' +
        '<div class="x-field"><label>' + esc(T('im_style')) + '</label><div class="gi-styles" role="radiogroup">' + STYLES.map(function (s) { return '<button type="button" role="radio" data-v="' + s + '" aria-checked="' + (s === prefs.style) + '" class="gi-style' + (s === prefs.style ? ' on' : '') + '"><i class="fa-solid ' + STYLE_ICON[s] + '"></i><span>' + esc(T('st_' + (s || 'none'))) + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="gi-two">' + seg('ratio', T('im_size'), [['square', esc(T('im_square'))], ['wide', esc(T('im_wide'))], ['tall', esc(T('im_tall'))]], prefs.ratio) + seg('count', T('im_count'), [[1, '1'], [2, '2'], [4, '4']], prefs.count) + '</div>' +
        '<label class="x-tg"><input type="checkbox" id="giEnh"' + (prefs.enhance ? ' checked' : '') + '> <span>' + esc(T('im_improve')) + '</span></label>' +
        '<div class="x-row"><button type="button" class="pill-btn primary" id="giGo"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('im_make')) + '</button></div>' +
        '<p class="st-msg gi-msg" role="alert" hidden></p><div class="gi-results" aria-live="polite"></div>' +
      '</div>' +
      '<div class="gi-pane" data-pane="mine" hidden><div class="gi-grid" id="giMine"></div></div>';
    var ta = $('#giPrompt', b), msg = $('.gi-msg', b), results = $('.gi-results', b);
    if (initial) ta.value = initial;

    $$('.gi-tabs button', b).forEach(function (t) { t.addEventListener('click', function () { var k = t.getAttribute('data-tab'); $$('.gi-tabs button', b).forEach(function (x) { x.classList.toggle('on', x === t); }); $$('.gi-pane', b).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== k; }); if (k === 'mine') paintMine(); }); });
    $('.gi-styles', b).addEventListener('click', function (e) { var s = e.target.closest('.gi-style'); if (!s) return; prefs.style = s.getAttribute('data-v'); $$('.gi-style', b).forEach(function (x) { var on = x === s; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); savePrefs(); });
    $$('.x-seg', b).forEach(function (g) { g.addEventListener('click', function (e) { var x = e.target.closest('button'); if (!x) return; $$('button', g).forEach(function (y) { y.classList.toggle('on', y === x); y.setAttribute('aria-pressed', y === x); }); var k = g.getAttribute('data-seg'); if (k === 'ratio') prefs.ratio = x.getAttribute('data-v'); else prefs.count = +x.getAttribute('data-v'); savePrefs(); }); });
    $('#giEnh', b).addEventListener('change', function () { prefs.enhance = this.checked; savePrefs(); });
    $('#giIdea', b).addEventListener('click', function () { var l = IDEAS[L.lang()] || IDEAS.en; ta.value = l[Math.floor(Math.random() * l.length)]; ta.focus(); });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    $('#giGo', b).addEventListener('click', go);

    function tile(rec, own) {
      var t = el('div', 'gi-tile gi-' + rec.ratio);
      t.innerHTML = '<button type="button" class="gi-open" aria-label="' + esc(T('im_big')) + '"><img alt="' + esc(rec.prompt) + '"></button><div class="gi-acts"><button type="button" class="icon-btn" data-g="dl" title="' + esc(T('im_dl')) + '" aria-label="' + esc(T('im_dl')) + '"><i class="fa-solid fa-download"></i></button><button type="button" class="icon-btn" data-g="chat" title="' + esc(T('im_use')) + '" aria-label="' + esc(T('im_use')) + '"><i class="fa-regular fa-comment-dots"></i></button>' + (own ? '<button type="button" class="icon-btn" data-g="del" title="' + esc(T('im_del')) + '" aria-label="' + esc(T('im_del')) + '"><i class="fa-regular fa-trash-can"></i></button>' : '') + '</div>';
      $('img', t).src = rec.dataUrl;
      t.addEventListener('click', function (e) {
        var g = e.target.closest('[data-g]'), op = e.target.closest('.gi-open');
        if (g) { var k = g.getAttribute('data-g'); if (k === 'dl') download(rec); else if (k === 'chat') addToChat(rec); else if (k === 'del') { delImg(rec.id).then(function () { t.remove(); }); } }
        else if (op) lightbox(rec);
      });
      return t;
    }
    function paintMine() {
      var grid = $('#giMine', b); grid.innerHTML = '';
      allImgs().then(function (list) { if (!list.length) { grid.innerHTML = '<p class="st-empty">' + esc(T('im_none')) + '</p>'; return; } list.forEach(function (r) { grid.appendChild(tile(r, true)); }); });
    }
    function addToChat(rec) {
      var turn = Chat.beginTurn(rec.prompt); if (!turn) { Chat.toast(T('im_busy')); return; }
      turn.finish(T('im_here') + ' *' + rec.prompt.replace(/[*_`]/g, '').slice(0, 200) + '*', { imgId: rec.id, imgPrompt: rec.prompt, imgStyle: rec.style, imgRatio: rec.ratio });
      M.close(); Chat.toast(T('im_saved_chat'));
    }
    function go() {
      var p = ta.value.trim(); if (p.length < 3) { msg.textContent = T('im_short'); msg.hidden = false; ta.focus(); return; }
      msg.hidden = true; var goBtn = $('#giGo', b), n = prefs.count, o = { style: prefs.style, ratio: prefs.ratio, enhance: prefs.enhance };
      if (ctrl) ctrl.abort(); ctrl = new AbortController(); var my = ctrl; goBtn.disabled = true; results.innerHTML = '';
      var slots = []; for (var i = 0; i < n; i++) { var s = el('div', 'gi-tile gi-skel gi-' + o.ratio, '<span><i class="fa-solid fa-wand-magic-sparkles"></i> ' + esc(T('im_making')) + '</span>'); results.appendChild(s); slots.push(s); }
      var left = n, firstErr = null;
      slots.forEach(function (slot) {
        gen(p, o, my.signal).then(function (d) { var rec = makeRec(d, p, o); return putImg(rec).then(function () { slot.replaceWith(tile(rec, false)); }); })
          .catch(function (e) { if (e && e.name === 'AbortError') { slot.remove(); return; } firstErr = firstErr || e; slot.remove(); })
          .then(function () { if (--left === 0) { goBtn.disabled = false; if (firstErr && !results.children.length) { msg.textContent = firstErr.message || T('im_fail'); msg.hidden = false; } } });
      });
    }
    setTimeout(function () { ta.focus(); }, 30);
  }

  /* header button + welcome-card re-translation */
  var hb = $('#imageBtn'); if (hb) hb.addEventListener('click', function () { openStudio(Chat.input.value.trim().length > 2 && !/^\//.test(Chat.input.value) ? Chat.input.value.trim() : ''); });
  Chat.openImageStudio = openStudio;
  L.apply();
})();
