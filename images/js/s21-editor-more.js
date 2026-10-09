/* Smart21Editor — multiple tabs, Git-style version history, Vim mode and colour themes. */
(function () {
  'use strict';
  var E = window.S21E; if (!E || !E.langs) return;
  var $ = function (s) { return document.querySelector(s); }, st = E.store, cm = function () { return E.cm(); };
  var W = ['html', 'css', 'js'], CMU = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  var tt; function toast(t) { var d = $('.ed-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'ed-toast' })); d.textContent = t; d.hidden = false; clearTimeout(tt); tt = setTimeout(function () { d.hidden = true; }, 2200); }
  function modal(html, onClick) {
    var m = document.createElement('div'); m.className = 'ed-modal'; m.innerHTML = '<div>' + html + '</div>';
    m.addEventListener('click', function (e) { if (e.target === m) return m.remove(); if (onClick) onClick(e, m); });
    document.body.appendChild(m); return m;
  }
  var cfg = { vim: false, theme: 's21c' };
  try { Object.assign(cfg, JSON.parse(st('s21e-more') || '{}')); } catch (e) { /* ignore */ }
  function saveCfg() { st('s21e-more', JSON.stringify(cfg)); }

  /* ---------------------------------------------------------------- documents (tabs) */
  var tabs = [], active = null, switching = false;
  try { var saved = JSON.parse(st('s21e-tabs') || 'null'); if (saved && saved.tabs && saved.tabs.length) { tabs = saved.tabs; active = saved.active; } } catch (e) { /* ignore */ }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function act() { return tabs.filter(function (t) { return t.id === active; })[0]; }
  function fromStore(lang) {
    var d = { lang: lang };
    if (lang === 'web') { d.files = {}; W.forEach(function (f) { d.files[f] = st('s21e-web-' + f) || ''; }); } else d.code = st('s21e-code-' + lang) || '';
    return d;
  }
  function full() {
    var L = E.cur(), d = { lang: L.id };
    if (L.files) { d.files = {}; W.forEach(function (f) { d.files[f] = f === E.file() ? E.raw() : (st('s21e-web-' + f) || L.files[f]); }); } else d.code = E.raw();
    return d;
  }
  function text(d) { return d.lang === 'web' ? W.map(function (f) { return '/* ' + f + ' */\n' + (d.files[f] || ''); }).join('\n') : (d.code || ''); }
  function apply(d) {
    switching = true;
    if (d.lang === 'web') W.forEach(function (f) { st('s21e-web-' + f, (d.files && d.files[f]) || ''); }); else st('s21e-code-' + d.lang, d.code || '');
    E.pick(d.lang); switching = false;
  }
  function sync() {
    var a = act(); if (a && E.cur()) { var d = full(); a.lang = d.lang; a.code = d.code; a.files = d.files; }
    st('s21e-tabs', JSON.stringify({ tabs: tabs, active: active }));
  }
  function label(t) { return t.name || E.byId(t.lang).name.replace(/ \(.*\)/, ''); }

  if (E.shared) { var sd = fromStore(E.shared); sd.id = uid(); sd.name = ''; tabs.push(sd); active = sd.id; }
  else if (act()) { var ad = act(); if (ad.lang === 'web') W.forEach(function (f) { st('s21e-web-' + f, (ad.files && ad.files[f]) || ''); }); else st('s21e-code-' + ad.lang, ad.code || ''); st('s21e-lang', ad.lang); try { history.replaceState(null, '', location.pathname + '#' + ad.lang); } catch (e) { /* ignore */ } }

  var bar = document.createElement('div'); bar.id = 'edTabs'; bar.className = 'ed-tabs';
  $('.ed-tools').after(bar);
  var css = document.createElement('style');
  css.textContent = '.ed-tabs{display:flex;gap:2px;overflow-x:auto;background:var(--s21-bg);border-bottom:1px solid var(--s21-border);padding:.25rem .5rem 0;flex-shrink:0;scrollbar-width:thin}' +
    '.ed-tab{display:flex;align-items:center;gap:.5rem;padding:.35rem .6rem;border:1px solid var(--s21-border);border-bottom:0;border-radius:8px 8px 0 0;background:var(--s21-white);color:var(--s21-text-soft);font:700 .8rem var(--font-body,sans-serif);cursor:pointer;white-space:nowrap}' +
    '.ed-tab.active{color:var(--s21-primary);border-color:var(--s21-primary);background:var(--s21-bg)}.ed-tab i{font-style:normal;opacity:.6;padding:0 2px}.ed-tab i:hover{opacity:1;color:#ff4646}' +
    '#edNew{border:0;background:transparent;color:var(--s21-primary);font:800 1.2rem sans-serif;cursor:pointer;padding:0 .6rem}' +
    '.ed-hrow{display:flex;gap:.4rem;align-items:center;padding:.4rem 0;border-bottom:1px solid var(--s21-border);font-size:.85rem}.ed-hrow span{flex:1;min-width:0}.ed-hrow small{display:block;opacity:.65}' +
    '.ed-hrow button,.ed-lang{border:1px solid var(--s21-border);background:var(--s21-bg);color:var(--s21-text);border-radius:8px;padding:.25rem .55rem;font:700 .78rem sans-serif;cursor:pointer}' +
    '.ed-lang{margin:.2rem}.ed-diff{font:.78rem/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;margin:.5rem 0 0;max-height:40vh;overflow:auto}.ed-diff .a{background:rgba(40,200,120,.2)}.ed-diff .d{background:rgba(255,70,70,.2)}';
  document.head.appendChild(css);
  function render() {
    bar.innerHTML = tabs.map(function (t) { return '<div class="ed-tab' + (t.id === active ? ' active' : '') + '" data-id="' + t.id + '" title="Double-click to rename"><span>' + esc(label(t)) + '</span><i data-x="' + t.id + '" title="Close">×</i></div>'; }).join('') + '<button id="edNew" title="New tab">+</button>';
  }
  function switchTo(id) { if (id === active) return; sync(); active = id; apply(act()); render(); st('s21e-tabs', JSON.stringify({ tabs: tabs, active: active })); }
  function newTab(lang) {
    sync(); var d = { id: uid(), lang: lang, name: '', code: '', files: null }; tabs.push(d); active = d.id;
    if (lang === 'web') d.files = { html: '', css: '', js: '' };
    apply(d); render(); sync();
  }
  function closeTab(id) {
    if (tabs.length < 2) return toast('Keep at least one tab open');
    var i = tabs.map(function (t) { return t.id; }).indexOf(id); tabs.splice(i, 1); try { localStorage.removeItem('s21e-hist-' + id); } catch (e) { /* ignore */ }
    if (id === active) { active = tabs[Math.max(0, i - 1)].id; apply(act()); } render(); st('s21e-tabs', JSON.stringify({ tabs: tabs, active: active }));
  }
  bar.addEventListener('click', function (e) {
    if (e.target.id === 'edNew') {
      modal('<h3 style="margin:0 0 .6rem">New tab — choose a language</h3>' + E.langs.map(function (l) { return '<button class="ed-lang" data-l="' + l.id + '">' + esc(l.name.replace(/ \(.*\)/, '')) + '</button>'; }).join(''),
        function (ev, m) { var b = ev.target.closest('[data-l]'); if (b) { m.remove(); newTab(b.getAttribute('data-l')); } });
    } else if (e.target.getAttribute('data-x')) closeTab(e.target.getAttribute('data-x'));
    else { var t = e.target.closest('.ed-tab'); if (t) switchTo(t.getAttribute('data-id')); }
  });
  bar.addEventListener('dblclick', function (e) {
    var t = e.target.closest('.ed-tab'); if (!t) return;
    var d = tabs.filter(function (x) { return x.id === t.getAttribute('data-id'); })[0], n = window.prompt('Tab name:', label(d));
    if (n !== null) { d.name = n.trim().slice(0, 30); render(); sync(); }
  });

  /* ---------------------------------------------------------------- version history */
  function hk() { return 's21e-hist-' + active; }
  function hist() { try { return JSON.parse(st(hk()) || '[]'); } catch (e) { return []; } }
  var lastAuto = 0;
  function commit(msg, auto) {
    var d = full(), h = hist();
    if (h.length && text(h[0]) === text(d)) { if (!auto) toast('No changes since the last commit'); return false; }
    d.t = Date.now(); d.msg = msg; h.unshift(d);
    try { st(hk(), JSON.stringify(h.slice(0, 30))); } catch (e) { toast('Storage is full — delete old commits'); return false; }
    if (!auto) toast('Committed: ' + msg); return true;
  }
  function diff(a, b) {
    var A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length, i, j, out = [];
    if (n * m > 640000) return [['~', 'Files are too large to compare line by line.']];
    var L = []; for (i = 0; i <= n; i++) L.push(new Array(m + 1).fill(0));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    i = 0; j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', A[i++]]); else out.push(['+', B[j++]]); }
    while (i < n) out.push(['-', A[i++]]); while (j < m) out.push(['+', B[j++]]);
    return out;
  }
  function openHistory() {
    var h = hist();
    function body() {
      return '<h3 style="margin:0 0 .4rem">Version history — ' + esc(label(act() || { lang: E.cur().id })) + '</h3><p style="margin:0 0 .4rem;font-size:.8rem;opacity:.7">Newest first. Restore keeps your current code as a commit first.</p>' +
        (h.length ? h.map(function (c, i) { return '<div class="ed-hrow"><span><b>' + esc(c.msg) + '</b><small>' + new Date(c.t).toLocaleString() + '</small></span><button data-a="diff" data-i="' + i + '">Diff</button><button data-a="restore" data-i="' + i + '">Restore</button><button data-a="del" data-i="' + i + '" title="Delete">✕</button></div>'; }).join('') : '<p>No commits yet. Press <b>Commit</b> to save a version.</p>') + '<div id="edDiff"></div>';
    }
    var m = modal(body(), function (e, mm) {
      var b = e.target.closest('[data-a]'); if (!b) return; var i = +b.getAttribute('data-i'), c = h[i], a = b.getAttribute('data-a');
      if (a === 'diff') {
        var ch = diff(text(c), text(full())).filter(function (x) { return x[0] !== ' '; }), add = ch.filter(function (x) { return x[0] === '+'; }).length;
        $('#edDiff').innerHTML = '<p style="margin:.6rem 0 0"><b>Commit → current:</b> +' + add + ' / −' + (ch.length - add) + ' lines</p><pre class="ed-diff">' + (ch.length ? ch.slice(0, 400).map(function (x) { return '<div class="' + (x[0] === '+' ? 'a' : 'd') + '">' + x[0] + ' ' + esc(x[1]) + '</div>'; }).join('') : 'Identical to the current code.') + '</pre>';
      } else if (a === 'restore') { commit('Before restore', true); mm.remove(); apply(c); sync(); toast('Restored: ' + c.msg); }
      else { h.splice(i, 1); st(hk(), JSON.stringify(h)); mm.firstChild.innerHTML = body(); }
    });
  }

  /* ---------------------------------------------------------------- toolbar, themes, vim */
  var TH = [['Smart21 (default)', 's21c'], ['Monokai', 'monokai'], ['Dracula', 'dracula'], ['Material', 'material'], ['Nord', 'nord'], ['Solarized dark', 'solarized dark'], ['Solarized light', 'solarized light'], ['Eclipse', 'eclipse']];
  $('#edKeys').insertAdjacentHTML('beforebegin',
    '<select id="edTheme" title="Colour theme">' + TH.map(function (t) { return '<option value="' + t[1] + '">' + t[0] + '</option>'; }).join('') + '</select>' +
    '<button id="edVim" title="Vim key bindings">Vim</button>' +
    '<button id="edCommit" title="Save a version"><i class="fa-solid fa-code-commit"></i> Commit</button>' +
    '<button id="edHist" title="Version history"><i class="fa-solid fa-clock-rotate-left"></i> History</button>');
  function setTheme(v) {
    var f = v.split(' ')[0];
    if (f !== 's21c' && !document.getElementById('th-' + f)) { var l = document.createElement('link'); l.id = 'th-' + f; l.rel = 'stylesheet'; l.href = CMU + 'theme/' + f + '.min.css'; document.head.appendChild(l); }
    if (cm()) cm().setOption('theme', v); $('#edTheme').value = v; cfg.theme = v; saveCfg();
  }
  function setVim(on) {
    var c = cm(); if (!c) return; cfg.vim = on; saveCfg();
    c.setOption('keyMap', on ? 'vim' : 'default'); c.setOption('showCursorWhenSelecting', on); $('#edVim').classList.toggle('on', on);
    if (on) toast('Vim on — Esc for normal mode, :w saves, :run runs');
  }
  $('#edTheme').onchange = function () { setTheme(this.value); };
  $('#edVim').onclick = function () { setVim(!cfg.vim); cm().focus(); };
  $('#edCommit').onclick = function () { var m = window.prompt('Commit message:', 'Save point'); if (m !== null) commit(m.trim().slice(0, 80) || 'Save point', false); };
  $('#edHist').onclick = openHistory;

  var oPick = E.onPick, oRun = E.onRun, oReady = E.onReady;
  E.onPick = function (L) {
    if (oPick) oPick(L);
    if (!tabs.length) { var d = { id: uid(), lang: L.id, name: '' }; tabs.push(d); active = d.id; }
    else if (!switching && act()) act().lang = L.id;
    sync(); render();
  };
  E.onRun = function () {
    if (oRun) oRun();
    if (Date.now() - lastAuto > 120000 && act()) { lastAuto = Date.now(); commit('Auto-saved on run', true); }
  };
  E.onReady = function () {
    if (oReady) oReady();
    var c = cm(); if (!c) return;
    setTheme(cfg.theme); if (cfg.vim) setVim(true);
    if (window.CodeMirror && CodeMirror.Vim) {
      CodeMirror.Vim.defineEx('write', 'w', function () { $('#edDownload').click(); });
      CodeMirror.Vim.defineEx('run', 'ru', function () { E.run(); });
    }
    var t; c.on('change', function () { clearTimeout(t); t = setTimeout(sync, 1000); });
  };
  window.addEventListener('pagehide', sync);
})();
