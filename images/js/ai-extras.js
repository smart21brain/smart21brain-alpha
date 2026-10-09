/* Smart21brain AI — extras: more modes, prompt library (type / to search), "My style" settings, share menu.
   Plugs into ai-page.js through window.S21Chat. Shared helpers for the other modules live on window.S21X. */
(function () {
  'use strict';
  var L = window.S21AIL, T = L.t, Chat = window.S21Chat;
  if (!L || !Chat) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  L.extend({
    en: {
      mode_math: 'Math', mode_translate: 'Translate', mode_summarize: 'Summarise', mode_homework: 'Homework', mode_eli10: 'Simple',
      ph_math: 'Type or photograph a maths problem…', ph_translate: 'Text to translate (English ⇄ Kiswahili)…', ph_summarize: 'Paste text or attach a file to summarise…', ph_homework: 'What is your homework question?', ph_eli10: 'What should I explain in simple words?',
      pc_all: 'All', pc_study: 'Study', pc_code: 'Code', pc_write: 'Write', pc_fun: 'Fun', pc_mine: 'Mine', prompts_save: 'Save my text as a prompt', prompts_saved: 'Prompt saved', prompts_type_first: 'Type something first', prompts_del: 'Delete prompt', prompts_hint: 'Tip: type / in the message box to search prompts.',
      share_copy: 'Copy chat as text', share_native: 'Share…', share_md: 'Download (.md)', share_print: 'Print / Save as PDF',
      style_len: 'Answer length', len_short: 'Short', len_balanced: 'Balanced', len_long: 'Detailed', style_level: 'Explain at the level of', lvl_auto: 'Auto', lvl_kid: 'Child', lvl_teen: 'Teenager', lvl_adult: 'Adult',
      style_read: 'Read aloud', style_autoread: 'Read every answer aloud', style_speed: 'Speaking speed', study_btn: 'Flashcards & quizzes'
    },
    sw: {
      mode_math: 'Hesabu', mode_translate: 'Tafsiri', mode_summarize: 'Fupisha', mode_homework: 'Kazi ya nyumbani', mode_eli10: 'Rahisi',
      ph_math: 'Andika au piga picha ya swali la hesabu…', ph_translate: 'Maandishi ya kutafsiri (Kiingereza ⇄ Kiswahili)…', ph_summarize: 'Bandika maandishi au ambatisha faili la kufupisha…', ph_homework: 'Swali lako la kazi ya nyumbani ni lipi?', ph_eli10: 'Nieleze nini kwa maneno rahisi?',
      pc_all: 'Zote', pc_study: 'Masomo', pc_code: 'Msimbo', pc_write: 'Andika', pc_fun: 'Burudani', pc_mine: 'Zangu', prompts_save: 'Hifadhi maandishi yangu kama swali', prompts_saved: 'Swali limehifadhiwa', prompts_type_first: 'Andika kitu kwanza', prompts_del: 'Futa swali', prompts_hint: 'Kidokezo: andika / kwenye kisanduku cha ujumbe kutafuta maswali.',
      share_copy: 'Nakili mazungumzo kama maandishi', share_native: 'Shiriki…', share_md: 'Pakua (.md)', share_print: 'Chapisha / Hifadhi kama PDF',
      style_len: 'Urefu wa jibu', len_short: 'Fupi', len_balanced: 'Wastani', len_long: 'Kirefu', style_level: 'Eleza kwa kiwango cha', lvl_auto: 'Otomatiki', lvl_kid: 'Mtoto', lvl_teen: 'Kijana', lvl_adult: 'Mtu mzima',
      style_read: 'Soma kwa sauti', style_autoread: 'Soma kila jibu kwa sauti', style_speed: 'Kasi ya kuongea', study_btn: 'Kadi na majaribio'
    }
  });

  /* ---------------- shared helpers (S21X) ---------------- */
  var openModals = [];
  function modal(title, icon, cls) {
    var m = el('div', 'x-modal');
    m.innerHTML = '<div class="x-box ' + (cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="x-head"><strong><i class="fa-solid ' + icon + '"></i> <span class="x-title">' + esc(title) + '</span></strong><button type="button" class="icon-btn x-close" aria-label="' + esc(T('style_close')) + '"><i class="fa-solid fa-xmark"></i></button></div><div class="x-body"></div></div>';
    document.body.appendChild(m);
    var prev = document.activeElement, api = { el: m, body: $('.x-body', m), box: $('.x-box', m), onClose: null };
    api.close = function () { if (!m.parentNode) return; m.remove(); openModals = openModals.filter(function (x) { return x !== api; }); if (api.onClose) api.onClose(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} };
    api.setTitle = function (t) { $('.x-title', m).textContent = t; };
    $('.x-close', m).addEventListener('click', api.close);
    m.addEventListener('mousedown', function (e) { if (e.target === m) api.close(); });
    openModals.push(api); setTimeout(function () { var f = $('.x-close', m); if (f) f.focus(); }, 0);
    return api;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openModals.length) { e.stopPropagation(); openModals[openModals.length - 1].close(); } }, true);
  window.S21X = { modal: modal, esc: esc, el: el, $: $, $$: $$ };

  /* ---------------- preferences (My style + read-aloud) ---------------- */
  var PKEY = 's21ai-prefs-v1', prefs = { note: '', len: 'balanced', lvl: 'auto', autoread: false, speed: 1 }, pcbs = [];
  try { var sv = JSON.parse(localStorage.getItem(PKEY) || '{}'); if (sv && typeof sv === 'object') Object.keys(prefs).forEach(function (k) { if (sv[k] !== undefined) prefs[k] = sv[k]; }); } catch (e) {}
  function savePrefs() { try { localStorage.setItem(PKEY, JSON.stringify(prefs)); } catch (e) {} paintStyleDot(); pcbs.forEach(function (f) { try { f(prefs); } catch (e) {} }); }
  window.S21AIPrefs = { get: function () { return prefs; }, set: function (o) { Object.assign(prefs, o); savePrefs(); }, onChange: function (f) { pcbs.push(f); } };
  function compose() {
    var p = [];
    if (prefs.len === 'short') p.push('Keep answers short.'); else if (prefs.len === 'long') p.push('Give detailed, thorough answers.');
    if (prefs.lvl === 'kid') p.push('Explain for a young child.'); else if (prefs.lvl === 'teen') p.push('Explain for a teenager.'); else if (prefs.lvl === 'adult') p.push('Explain for an adult.');
    if (prefs.note) p.push(prefs.note.trim());
    return p.join(' ').slice(0, 600);
  }
  Chat.getCustom = compose;
  function styleOn() { return !!compose(); }
  function paintStyleDot() { var b = $('#styleBtn'); if (!b) return; b.classList.toggle('x-on', styleOn()); b.title = styleOn() ? T('style_on') : T('style_btn'); }

  /* ---------------- more modes ---------------- */
  var MODES = [['math', 'fa-square-root-variable'], ['translate', 'fa-language'], ['summarize', 'fa-align-left'], ['homework', 'fa-book-open'], ['eli10', 'fa-child-reaching']];
  var bar = $('#modes');
  if (bar) { MODES.forEach(function (m) { var b = el('button', null, '<i class="fa-solid ' + m[1] + '"></i> <span data-ai-t="mode_' + m[0] + '"></span>'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('data-mode', m[0]); bar.appendChild(b); }); }

  /* ---------------- popovers ---------------- */
  var pops = [];
  function closePops(except) { pops.forEach(function (p) { if (p !== except && !p.el.hidden) p.hide(); }); }
  document.addEventListener('mousedown', function (e) { pops.forEach(function (p) { if (!p.el.hidden && !p.el.contains(e.target) && !(p.btn && p.btn.contains(e.target)) && e.target !== Chat.input) p.hide(); }); });
  function makePop(host, cls, btn) {
    var e = el('div', 'x-pop ' + cls); e.hidden = true; host.appendChild(e);
    var p = { el: e, btn: btn, show: function () { closePops(p); e.hidden = false; if (btn) btn.setAttribute('aria-expanded', 'true'); }, hide: function () { e.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); } };
    pops.push(p); return p;
  }

  /* ---------------- prompt library ---------------- */
  var BUILT = [
    { c: 'study', m: 'learn', en: 'Explain photosynthesis step by step', sw: 'Eleza usanisinuru hatua kwa hatua' },
    { c: 'study', m: 'learn', en: 'Make me a 2-week revision plan for my exams', sw: 'Nitengenezee ratiba ya wiki 2 ya kujisomea kwa mitihani yangu' },
    { c: 'study', m: 'quiz', en: 'Give me 5 practice questions on fractions and check my answers', sw: 'Nipe maswali 5 ya mazoezi kuhusu visehemu na uhakiki majibu yangu' },
    { c: 'study', m: 'summarize', en: 'Summarise this text in 5 bullet points:\n\n', sw: 'Fupisha maandishi haya kwa vipengele 5:\n\n' },
    { c: 'study', m: 'math', en: 'Solve step by step: 3x + 7 = 25', sw: 'Tatua hatua kwa hatua: 3x + 7 = 25' },
    { c: 'study', m: 'eli10', en: 'Explain gravity like I am 10 years old', sw: 'Nieleze mvutano wa dunia kama mtoto wa miaka 10' },
    { c: 'code', m: 'code', en: 'Write a Python program that guesses a number', sw: 'Andika programu ya Python inayokisia namba' },
    { c: 'code', m: 'code', en: 'Explain what a loop is with an example', sw: 'Eleza mzunguko (loop) ni nini kwa mfano' },
    { c: 'code', m: 'code', en: 'Find the bug in this code:\n\n', sw: 'Tafuta kosa kwenye msimbo huu:\n\n' },
    { c: 'code', m: 'code', en: 'Build a simple HTML page with a button that changes colour', sw: 'Tengeneza ukurasa rahisi wa HTML wenye kitufe kinachobadilisha rangi' },
    { c: 'code', m: 'code', en: 'What is the difference between let and const in JavaScript?', sw: 'Tofauti ya let na const katika JavaScript ni ipi?' },
    { c: 'write', m: 'write', en: 'Write a polite email asking my teacher for extra help', sw: 'Andika barua pepe ya heshima kumuomba mwalimu wangu msaada wa ziada' },
    { c: 'write', m: 'write', en: 'Write a short story about a brave robot', sw: 'Andika hadithi fupi kuhusu roboti jasiri' },
    { c: 'write', m: 'write', en: 'Improve this paragraph and fix the mistakes:\n\n', sw: 'Boresha aya hii na urekebishe makosa:\n\n' },
    { c: 'write', m: 'write', en: 'Write a one-minute speech on why reading matters', sw: 'Andika hotuba ya dakika moja kuhusu umuhimu wa kusoma' },
    { c: 'fun', m: '', en: 'Tell me 5 surprising facts about space', sw: 'Niambie mambo 5 ya kushangaza kuhusu anga za juu' },
    { c: 'fun', m: '', en: 'Give me a riddle and wait for my answer', sw: 'Nipe kitendawili na usubiri jibu langu' },
    { c: 'fun', m: 'translate', en: 'Teach me 10 useful Kiswahili phrases with English meanings', sw: 'Nifundishe misemo 10 muhimu ya Kiswahili na maana zake kwa Kiingereza' },
    { c: 'fun', m: 'translate', en: 'Translate to Kiswahili: Good morning, how are you today?', sw: 'Tafsiri kwa Kiingereza: Habari za asubuhi, hujambo leo?' },
    { c: 'fun', m: 'quiz', en: 'Quiz me with a fun trivia game', sw: 'Nijaribu kwa mchezo wa maswali ya kufurahisha' }
  ];
  var UKEY = 's21ai-user-prompts-v1', mine = [];
  try { var um = JSON.parse(localStorage.getItem(UKEY) || '[]'); if (Array.isArray(um)) mine = um.filter(function (x) { return x && typeof x.t === 'string'; }).slice(0, 60); } catch (e) {}
  function saveMine() { try { localStorage.setItem(UKEY, JSON.stringify(mine)); } catch (e) {} }
  var composerWrap = $('.composer-wrap'), pBtn = $('#promptBtn'), pPop = makePop(composerWrap, 'x-prompts', pBtn), pCat = 'all', pQuery = '', pSel = 0, pItems = [];
  pPop.el.innerHTML = '<div class="xp-head"><div class="xp-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" class="xp-q" autocomplete="off"></div><button type="button" class="icon-btn xp-x"><i class="fa-solid fa-xmark"></i></button></div><div class="xp-tabs" role="tablist"></div><div class="xp-list" role="listbox"></div><div class="xp-foot"><button type="button" class="xp-save"><i class="fa-regular fa-floppy-disk"></i> <span></span></button><span class="xp-hint"></span></div>';
  var xq = $('.xp-q', pPop.el), xl = $('.xp-list', pPop.el), xt = $('.xp-tabs', pPop.el);
  function pText(p) { return p.t || p[L.lang()] || p.en; }
  function paintPrompts() {
    xq.placeholder = T('prompts_search'); xq.setAttribute('aria-label', T('prompts_search')); $('.xp-x', pPop.el).setAttribute('aria-label', T('prompts_close')); $('.xp-save span', pPop.el).textContent = T('prompts_save'); $('.xp-hint', pPop.el).textContent = T('prompts_hint');
    var cats = ['all', 'study', 'code', 'write', 'fun'].concat(mine.length ? ['mine'] : []);
    xt.innerHTML = cats.map(function (c) { return '<button type="button" role="tab" aria-selected="' + (c === pCat) + '" data-cat="' + c + '" class="' + (c === pCat ? 'on' : '') + '">' + esc(T('pc_' + c)) + '</button>'; }).join('');
    var q = pQuery.trim().toLowerCase(), all = mine.map(function (m, i) { return { t: m.t, c: 'mine', own: i, m: '' }; }).concat(BUILT);
    pItems = all.filter(function (p) { return (pCat === 'all' || p.c === pCat) && (!q || pText(p).toLowerCase().indexOf(q) >= 0); });
    pSel = Math.max(0, Math.min(pSel, pItems.length - 1));
    xl.innerHTML = pItems.length ? pItems.map(function (p, i) { return '<div class="xp-item' + (i === pSel ? ' sel' : '') + '" role="option" data-i="' + i + '"><span class="xp-t">' + esc(pText(p).split('\n')[0]) + '</span>' + (p.own != null ? '<button type="button" class="xp-del" data-del="' + p.own + '" aria-label="' + esc(T('prompts_del')) + '" title="' + esc(T('prompts_del')) + '"><i class="fa-regular fa-trash-can"></i></button>' : '<em>' + esc(T('pc_' + p.c)) + '</em>') + '</div>'; }).join('') : '<p class="xp-empty">' + esc(T('prompts_empty')) + '</p>';
    var s = $('.xp-item.sel', xl); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
  }
  function usePrompt(p) {
    if (!p) return; pPop.hide();
    if (p.m !== undefined && p.m !== '' && p.m !== Chat.getMode()) Chat.setMode(p.m); else if (p.m === '' && Chat.getMode()) Chat.setMode('');
    Chat.input.value = pText(p); Chat.grow(); Chat.input.focus(); try { Chat.input.setSelectionRange(Chat.input.value.length, Chat.input.value.length); } catch (e) {}
  }
  function openPrompts(fromSlash) { pQuery = fromSlash ? Chat.input.value.slice(1) : ''; xq.value = pQuery; pCat = 'all'; pSel = 0; paintPrompts(); pPop.show(); if (!fromSlash) xq.focus(); }
  if (pBtn) { pBtn.setAttribute('aria-haspopup', 'listbox'); pBtn.setAttribute('aria-expanded', 'false'); pBtn.addEventListener('click', function () { pPop.el.hidden ? openPrompts(false) : pPop.hide(); }); }
  xq.addEventListener('input', function () { pQuery = xq.value; pSel = 0; paintPrompts(); });
  xq.addEventListener('keydown', function (e) { listKeys(e); });
  function listKeys(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); pSel = Math.min(pItems.length - 1, pSel + 1); paintPrompts(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pSel = Math.max(0, pSel - 1); paintPrompts(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); usePrompt(pItems[pSel]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pPop.hide(); Chat.input.focus(); }
  }
  xl.addEventListener('click', function (e) { var d = e.target.closest('[data-del]'); if (d) { e.stopPropagation(); mine.splice(+d.getAttribute('data-del'), 1); saveMine(); if (!mine.length && pCat === 'mine') pCat = 'all'; paintPrompts(); return; } var it = e.target.closest('.xp-item'); if (it) usePrompt(pItems[+it.getAttribute('data-i')]); });
  xt.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) { pCat = b.getAttribute('data-cat'); pSel = 0; paintPrompts(); } });
  $('.xp-x', pPop.el).addEventListener('click', function () { pPop.hide(); Chat.input.focus(); });
  $('.xp-save', pPop.el).addEventListener('click', function () {
    var t = Chat.input.value.trim(); if (!t || t.charAt(0) === '/') { Chat.toast(T('prompts_type_first')); return; }
    if (!mine.some(function (m) { return m.t === t; })) { mine.unshift({ t: t.slice(0, 1500) }); mine = mine.slice(0, 60); saveMine(); }
    Chat.toast(T('prompts_saved')); pCat = 'mine'; paintPrompts();
  });
  // type "/" at the start of the message box to search prompts
  Chat.input.addEventListener('input', function () {
    var v = Chat.input.value;
    if (v.charAt(0) === '/' && v.indexOf('\n') < 0) { pQuery = v.slice(1); xq.value = pQuery; if (pPop.el.hidden) { pCat = 'all'; pSel = 0; pPop.show(); } else pSel = 0; paintPrompts(); }
    else if (!pPop.el.hidden && document.activeElement === Chat.input) pPop.hide();
  });
  Chat.input.addEventListener('keydown', function (e) { if (!pPop.el.hidden && document.activeElement === Chat.input && Chat.input.value.charAt(0) === '/') listKeys(e); }, true);

  /* ---------------- My style (settings) ---------------- */
  var sBtn = $('#styleBtn');
  function openStyle() {
    var m = modal(T('style_title'), 'fa-sliders', 'x-narrow'), b = m.body;
    var seg = function (id, label, opts, val) { return '<div class="x-field"><label>' + esc(label) + '</label><div class="x-seg" data-seg="' + id + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" class="' + (o[0] === val ? 'on' : '') + '" aria-pressed="' + (o[0] === val) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>'; };
    b.innerHTML = '<p class="x-desc">' + esc(T('style_desc')) + '</p>' +
      '<div class="x-field"><textarea class="x-ta" maxlength="450" rows="4" placeholder="' + esc(T('style_ph')) + '" aria-label="' + esc(T('style_title')) + '"></textarea></div>' +
      '<div class="x-chips"><span>' + esc(T('style_try')) + '</span>' + (L.lang() === 'sw' ? ['Tumia maneno rahisi', 'Toa mfano mmoja kila wakati', 'Jibu kwa ufupi', 'Niko Kidato cha Pili'] : ['Use simple words', 'Always give one example', 'Keep answers short', 'I am in Form 2']).map(function (t) { return '<button type="button" class="x-chip">' + esc(t) + '</button>'; }).join('') + '</div>' +
      seg('len', T('style_len'), [['short', T('len_short')], ['balanced', T('len_balanced')], ['long', T('len_long')]], prefs.len) +
      seg('lvl', T('style_level'), [['auto', T('lvl_auto')], ['kid', T('lvl_kid')], ['teen', T('lvl_teen')], ['adult', T('lvl_adult')]], prefs.lvl) +
      '<div class="x-field"><label>' + esc(T('style_read')) + '</label><label class="x-tg"><input type="checkbox" class="x-auto"' + (prefs.autoread ? ' checked' : '') + '> <span>' + esc(T('style_autoread')) + '</span></label>' +
      '<label class="x-rng"><span>' + esc(T('style_speed')) + '</span><input type="range" class="x-spd" min="0.6" max="1.6" step="0.1" value="' + prefs.speed + '"><output>' + Number(prefs.speed).toFixed(1) + '×</output></label></div>' +
      '<div class="x-row"><button type="button" class="pill-btn x-clear">' + esc(T('style_clear')) + '</button><button type="button" class="pill-btn primary x-save">' + esc(T('style_save')) + '</button></div>';
    var ta = $('.x-ta', b); ta.value = prefs.note || '';
    $$('.x-chip', b).forEach(function (c) { c.addEventListener('click', function () { var v = ta.value.trim(); ta.value = (v ? v + ' ' : '') + c.textContent + (/[.!?]$/.test(c.textContent) ? '' : '.'); ta.focus(); }); });
    $$('.x-seg', b).forEach(function (g) { g.addEventListener('click', function (e) { var x = e.target.closest('button'); if (!x) return; $$('button', g).forEach(function (y) { y.classList.toggle('on', y === x); y.setAttribute('aria-pressed', y === x); }); }); });
    var spd = $('.x-spd', b), out = $('output', b); spd.addEventListener('input', function () { out.textContent = Number(spd.value).toFixed(1) + '×'; });
    $('.x-save', b).addEventListener('click', function () {
      window.S21AIPrefs.set({ note: ta.value.trim().slice(0, 450), len: $('[data-seg=len] .on', b).getAttribute('data-v'), lvl: $('[data-seg=lvl] .on', b).getAttribute('data-v'), autoread: $('.x-auto', b).checked, speed: +spd.value }); m.close(); Chat.toast(T('style_saved'));
    });
    $('.x-clear', b).addEventListener('click', function () { window.S21AIPrefs.set({ note: '', len: 'balanced', lvl: 'auto', autoread: false, speed: 1 }); m.close(); Chat.toast(T('style_cleared')); });
    setTimeout(function () { ta.focus(); }, 30);
  }
  if (sBtn) sBtn.addEventListener('click', openStyle);

  /* ---------------- share ---------------- */
  var shBtn = $('#shareBtn'), shPop = makePop($('.top'), 'x-share', shBtn);
  function chatText() {
    var c = Chat.cur(); if (!c || !c.messages.length) return '';
    return c.title + '\n\n' + c.messages.map(function (m) { return (m.role === 'user' ? 'You: ' : 'Smart21brain AI: ') + m.content; }).join('\n\n') + '\n';
  }
  function copyText(t, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(); }); else fallback();
    function fallback() { var a = el('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) {} a.remove(); }
  }
  function paintShare() {
    shPop.el.innerHTML = '<button type="button" data-s="copy"><i class="fa-regular fa-copy"></i> ' + esc(T('share_copy')) + '</button>' + (navigator.share ? '<button type="button" data-s="native"><i class="fa-solid fa-arrow-up-from-bracket"></i> ' + esc(T('share_native')) + '</button>' : '') + '<button type="button" data-s="md"><i class="fa-solid fa-download"></i> ' + esc(T('share_md')) + '</button><button type="button" data-s="print"><i class="fa-solid fa-print"></i> ' + esc(T('share_print')) + '</button>';
  }
  if (shBtn) {
    shBtn.setAttribute('aria-haspopup', 'menu'); shBtn.setAttribute('aria-expanded', 'false');
    shBtn.addEventListener('click', function () { if (!shPop.el.hidden) { shPop.hide(); return; } if (!chatText()) { Chat.toast(T('share_empty')); return; } paintShare(); shPop.show(); });
    shPop.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return; var a = b.getAttribute('data-s'), t = chatText(); shPop.hide();
      if (a === 'copy') copyText(t, function () { Chat.toast(T('shared')); });
      else if (a === 'native') navigator.share({ title: T('share_title'), text: t }).catch(function () {});
      else if (a === 'md') { var x = $('#exportChat'); if (x) x.click(); }
      else if (a === 'print') window.print();
    });
  }

  /* re-translate dynamic UI when the language changes */
  L.onChange(function () { paintStyleDot(); if (!pPop.el.hidden) paintPrompts(); });
  paintStyleDot(); L.apply();
})();
