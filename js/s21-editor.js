/* Smart21Editor — one editor, many languages.
   Web languages run in a sandboxed iframe, Python (Pyodide) and SQL (SQLite) run in the
   browser, and C++ is compiled by a real g++ compiler (see s21c-runner.js). */
(function () {
  'use strict';
  var R = window.S21CRunner;
  var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
  var BS_CSS = CDN + 'twitter-bootstrap/5.3.3/css/bootstrap.min.css';
  var JQ = CDN + 'jquery/3.7.1/jquery.min.js';
  var RX = CDN + 'react/18.2.0/umd/react.development.js';
  var RXDOM = CDN + 'react-dom/18.2.0/umd/react-dom.development.js';
  var BABEL = CDN + 'babel-standalone/7.23.9/babel.min.js';
  var CLOSE = '<' + '/script>';

  var LANGS = [
    { id: 'html', name: 'HTML / CSS', run: 'web', mode: 'htmlmixed', ext: 'html',
      code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My page</title>\n  <style>\n    body { font-family: sans-serif; padding: 16px; }\n    h1 { color: #0B6E4F; }\n  </style>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n  <p>Edit me and press Run.</p>\n</body>\n</html>' },
    { id: 'web', name: 'HTML + CSS + JS (3-file project)', run: 'web', mode: 'htmlmixed', ext: 'html',
      files: { html: '<h1 id="title">Hello, project!</h1>\n<button id="btn">Click me</button>',
               css: 'body { font-family: sans-serif; padding: 16px; }\nh1 { color: #0B6E4F; }\nbutton { padding: 8px 14px; }',
               js: 'document.getElementById("btn").addEventListener("click", function () {\n  document.getElementById("title").textContent = "You clicked the button!";\n  console.log("clicked");\n});' } },
    { id: 'javascript', name: 'JavaScript', run: 'web', mode: 'javascript', ext: 'js',
      code: '// Write JavaScript here and press Run\nconst name = "Smart21Editor";\nconsole.log("Hello from " + name);\n\nfor (let i = 1; i <= 3; i++) {\n  console.log("Loop number " + i);\n}' },
    { id: 'python', name: 'Python', run: 'python', mode: 'python', ext: 'py', stdin: 'Input (one line for each input() call)',
      code: '# Write Python here and press Run\nname = input("Your name? ")\nprint("Hello,", name)\n\nfor i in range(1, 4):\n    print("Loop number", i)', input: 'Amina' },
    { id: 'cpp', name: 'C++', run: 'cpp', mode: 'text/x-c++src', ext: 'cpp', stdin: 'Input (what the user would type for cin, one value per line)',
      code: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string name;\n  cout << "Your name? ";\n  cin >> name;\n  cout << "Hello, " << name << "!" << endl;\n\n  for (int i = 1; i <= 3; i++) {\n    cout << "Loop number " << i << endl;\n  }\n  return 0;\n}', input: 'Amina' },
    { id: 'sql', name: 'SQL', run: 'sql', mode: 'text/x-sqlite', ext: 'sql',
      code: '-- Try a query on the sample school database\nSELECT name, city, score\nFROM students\nORDER BY score DESC\nLIMIT 5;' },
    { id: 'bootstrap', name: 'Bootstrap', run: 'web', mode: 'htmlmixed', ext: 'html',
      code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link href="' + BS_CSS + '" rel="stylesheet">\n</head>\n<body>\n<div class="container mt-4">\n  <div class="alert alert-success">Bootstrap is loaded!</div>\n  <button class="btn btn-primary">A Bootstrap button</button>\n</div>\n</body>\n</html>' },
    { id: 'jquery', name: 'jQuery', run: 'web', mode: 'htmlmixed', ext: 'html',
      code: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="' + JQ + '">' + CLOSE + '\n</head>\n<body>\n<h2 id="title">Hello!</h2>\n<button id="btn">Click me</button>\n\n<script>\n$("#btn").on("click", function () {\n  $("#title").text("You clicked the button!").css("color", "#0B6E4F");\n});\n' + CLOSE + '\n</body>\n</html>' },
    { id: 'react', name: 'React', run: 'web', mode: 'htmlmixed', ext: 'html',
      code: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="' + RX + '">' + CLOSE + '\n  <script src="' + RXDOM + '">' + CLOSE + '\n  <script src="' + BABEL + '">' + CLOSE + '\n</head>\n<body>\n<div id="root"></div>\n\n<script type="text/babel">\nconst { useState } = React;\n\nfunction App() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>Clicked {n} times</button>;\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);\n' + CLOSE + '\n</body>\n</html>' }
  ];

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }
  function byId(id) { return LANGS.filter(function (l) { return l.id === id; })[0]; }
  function isMobile() { return window.matchMedia('(max-width: 700px)').matches; }

  var cm = null, fallback = null, cur = null, running = false, consoleCount = 0;
  var buf = {}, curFile = 'html', FMODE = { html: 'htmlmixed', css: 'css', js: 'javascript' };
  function persist() {
    if (!cur) return;
    if (cur.files) { buf[curFile] = getVal(); store('s21e-web-' + curFile, buf[curFile]); } else store('s21e-code-' + cur.id, getVal());
  }
  function runCode() {
    if (!cur || !cur.files) return getVal();
    buf[curFile] = getVal();
    var css = '<style>\n' + buf.css + '\n</style>', js = '<script>\n' + buf.js + '\n' + CLOSE, h = buf.html || '';
    h = /<\/head>/i.test(h) ? h.replace(/<\/head>/i, function () { return css + '</head>'; }) : css + h;
    return /<\/body>/i.test(h) ? h.replace(/<\/body>/i, function () { return js + '</body>'; }) : h + js;
  }
  function syncFiles() { $$('#edFiles button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-f') === curFile); }); }
  function setFile(f) {
    if (!cur || !cur.files) return;
    buf[curFile] = getVal(); curFile = f; setVal(buf[f], FMODE[f]); syncFiles();
    if (window.S21E && S21E.onFile) S21E.onFile(f);
  }
  function resetCode() {
    if (cur.files) { ['html', 'css', 'js'].forEach(function (f) { buf[f] = cur.files[f]; store('s21e-web-' + f, buf[f]); }); setVal(buf[curFile], FMODE[curFile]); }
    else { store('s21e-code-' + cur.id, cur.code); setVal(cur.code, cur.mode); }
  }

  /* ------------------------------------------------------------ editor */
  function getVal() { return cm ? cm.getValue() : fallback.value; }
  function setVal(v, mode) {
    if (cm) { cm.setOption('mode', mode); cm.setValue(v); cm.clearHistory(); setTimeout(function () { cm.refresh(); }, 30); }
    else fallback.value = v;
  }
  function makeEditor() {
    var host = $('#tryEditorHost');
    if (window.CodeMirror) {
      cm = CodeMirror(host, {
        value: '', mode: 'htmlmixed', theme: 's21c', lineNumbers: true, lineWrapping: false, indentUnit: 2, tabSize: 2, indentWithTabs: false,
        matchBrackets: true, autoCloseBrackets: true, autoCloseTags: true, inputStyle: 'contenteditable', spellcheck: false,
        extraKeys: {
          Tab: function (c) { if (c.somethingSelected()) c.indentSelection('add'); else c.replaceSelection('  ', 'end'); },
          'Shift-Tab': function (c) { c.indentSelection('subtract'); },
          'Ctrl-Enter': function () { run(); }, 'Cmd-Enter': function () { run(); }
        }
      });
      cm.on('change', persist);
    } else {
      fallback = document.createElement('textarea'); fallback.className = 'c-fallback'; fallback.spellcheck = false;
      fallback.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') { e.preventDefault(); var s = fallback.selectionStart; fallback.value = fallback.value.slice(0, s) + '  ' + fallback.value.slice(fallback.selectionEnd); fallback.selectionStart = fallback.selectionEnd = s + 2; }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
      });
      fallback.addEventListener('input', persist);
      host.appendChild(fallback);
    }
  }

  /* ---------------------------------------------------------- results */
  function showResult(kind) {
    $('#tryFrame').style.display = kind === 'web' ? '' : 'none';
    $('#tryOut').hidden = kind !== 'python' && kind !== 'cpp';
    $('#trySql').hidden = kind !== 'sql';
    $('#tryConsole').hidden = true;
  }
  function setStatus(t) { $('#tryStatus').textContent = t || ''; }
  function setPanel(p) {
    $('#cTry').setAttribute('data-panel', p);
    $$('#tryTabs button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-p') === p); });
    if (p === 'code' && cm) setTimeout(function () { cm.refresh(); }, 20);
  }
  function setRunBtn(on) {
    var b = $('#tryRun');
    b.className = 'c-btn ' + (on ? 'stop' : 'run');
    b.innerHTML = on ? '<i class="fa-solid fa-stop"></i> Stop' : '<i class="fa-solid fa-play"></i> Run';
  }
  function stopAll() { if (R.stopPython) R.stopPython(); if (R.stopCpp) R.stopCpp(); }

  function tableHtml(res) {
    var h = '<div class="c-table-wrap"><table class="c-table"><thead><tr>' + res.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    res.values.forEach(function (row) { h += '<tr>' + row.map(function (v) { return '<td>' + (v === null ? '<i style="color:var(--s21-text-soft)">NULL</i>' : esc(v)) + '</td>'; }).join('') + '</tr>'; });
    return h + '</tbody></table></div><div class="cnt">' + res.values.length + ' row' + (res.values.length === 1 ? '' : 's') + '</div>';
  }
  function renderSchema() {
    return R.dbSchema().then(function (tbls) {
      return '<details class="c-schema"><summary>Database tables (tap a table to query it)</summary><div class="tbls">' + tbls.map(function (t) {
        return '<div class="tbl" data-tbl="' + esc(t.name) + '"><b>' + esc(t.name) + '</b> · ' + t.rows + ' rows<small>' + t.cols.map(esc).join('<br>') + '</small></div>';
      }).join('') + '</div></details>';
    }, function () { return ''; });
  }

  function textRun(fn, emptyHint) {
    var out = $('#tryOut'); out.textContent = '';
    running = true; setRunBtn(true);
    if (isMobile()) setPanel('result');
    fn(function (text, isErr) {
      var span = document.createElement('span'); if (isErr) span.className = 'err'; span.textContent = text + '\n';
      out.appendChild(span); out.scrollTop = out.scrollHeight;
    }).then(function () {
      if (!running) return;
      running = false; setRunBtn(false);
      var has = out.textContent.trim();
      setStatus(has ? 'Finished' : 'Finished (no output)');
      if (window.S21E && S21E.onDone) S21E.onDone(out.textContent, cur);
      if (!has) out.innerHTML = '<span style="opacity:.6">Your program ran but did not print anything. ' + emptyHint + '</span>';
    });
  }

  function run(auto) {
    if (!cur) return;
    if (window.S21E && S21E.onRun) S21E.onRun();
    var code = runCode();
    if (running) { stopAll(); running = false; setRunBtn(false); setStatus('Stopped'); return; }
    if (cur.run === 'web') {
      showResult('web');
      consoleCount = 0; $('#tryConsoleBody').innerHTML = ''; $('#tryConsole').hidden = true;
      $('#tryFrame').srcdoc = R.buildWeb(code);
      setStatus('');
      if (isMobile() && !auto) setPanel('result');
    } else if (cur.run === 'python') {
      showResult('python'); setStatus('Running…');
      textRun(function (onOut) { return R.runPython(code, { stdin: $('#tryStdin').value, onStatus: setStatus, onOut: onOut }); }, 'Use print() to show a result.');
    } else if (cur.run === 'cpp') {
      showResult('cpp'); setStatus('Compiling…');
      textRun(function (onOut) { return R.runCpp(code, { stdin: $('#tryStdin').value, onStatus: setStatus, onOut: onOut }); }, 'Use cout to show a result.');
    } else {
      showResult('sql');
      var box = $('#trySql'); box.innerHTML = '<div class="msg">Running query…</div>';
      setStatus('Loading SQLite…');
      if (isMobile() && !auto) setPanel('result');
      R.runSql(code).then(function (r) {
        setStatus('');
        var h = '';
        if (!r.ok) h = '<div class="msg err">' + esc(r.error) + '</div>';
        else if (!r.results.length) h = '<div class="msg">Query OK — ' + (r.changes ? r.changes + ' row(s) affected.' : 'no rows returned.') + '</div>';
        else r.results.forEach(function (res, i) { h += (r.results.length > 1 ? '<div class="cnt">Result ' + (i + 1) + '</div>' : '') + tableHtml(res); });
        renderSchema().then(function (sc) { box.innerHTML = h + sc; });
      });
    }
  }

  /* --------------------------------------------------------- language */
  function pick(id, auto) {
    var L = byId(id) || LANGS[0];
    stopAll(); running = false; setRunBtn(false);
    cur = L;
    store('s21e-lang', L.id);
    $('#edLang').value = L.id;
    if (location.hash !== '#' + L.id) { try { history.replaceState(null, '', '#' + L.id); } catch (e) { /* ignore */ } }
    document.title = 'Smart21Editor — ' + L.name + ' online editor | Smart21Brain';
    var hasIn = L.run === 'python' || L.run === 'cpp';
    $('#tryStdinWrap').hidden = !hasIn;
    if (hasIn) {
      $('#tryStdinLabel').textContent = L.stdin;
      var savedIn = store('s21e-stdin-' + L.id);
      $('#tryStdin').value = savedIn === null ? (L.input || '') : savedIn;
    }
    $('#tryRestore').hidden = L.run !== 'sql';
    $('#tryFrame').srcdoc = '';
    $('#tryOut').textContent = ''; $('#trySql').innerHTML = ''; setStatus('');
    showResult(L.run);
    if (L.files) { ['html', 'css', 'js'].forEach(function (f) { buf[f] = store('s21e-web-' + f) || L.files[f]; }); curFile = 'html'; setVal(buf.html, FMODE.html); }
    else setVal(store('s21e-code-' + L.id) || L.code, L.mode);
    $('#edFiles').hidden = !L.files; syncFiles();
    if (window.S21E && S21E.onPick) S21E.onPick(L);
    setPanel('code');
    run(true);
  }

  /* -------------------------------------------------------------- init */
  function init() {
    if (!R) return;
    var sel = $('#edLang');
    sel.innerHTML = LANGS.map(function (l) { return '<option value="' + l.id + '">' + esc(l.name) + '</option>'; }).join('');
    var files = document.createElement('div'); files.id = 'edFiles'; files.className = 'ed-files'; files.hidden = true;
    files.innerHTML = '<button data-f="html">index.html</button><button data-f="css">style.css</button><button data-f="js">script.js</button>';
    files.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setFile(b.getAttribute('data-f')); });
    $('#tryEditorHost').parentNode.insertBefore(files, $('#tryEditorHost'));
    makeEditor();
    if (window.S21E && S21E.onReady) S21E.onReady();

    sel.addEventListener('change', function () { pick(sel.value); });
    $('#tryRun').addEventListener('click', function () { run(false); });
    $('#tryReset').addEventListener('click', function () {
      if (!cur) return;
      if (!window.confirm('Reset the ' + cur.name + ' editor to its starter code?')) return;
      resetCode(); run(true);
    });
    $('#tryRestore').addEventListener('click', function () { R.restoreDb().then(function () { setStatus('Database restored'); run(true); }); });
    $('#edDownload').addEventListener('click', function () {
      if (!cur) return;
      var blob = new Blob([runCode()], { type: 'text/plain' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'smart21editor-' + cur.id + '.' + cur.ext;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('#tryStdin').addEventListener('input', function () { if (cur) store('s21e-stdin-' + cur.id, this.value); });
    $('#tryLayout').addEventListener('click', function () {
      var t = $('#cTry'), v = t.getAttribute('data-layout') === 'v';
      t.setAttribute('data-layout', v ? 'h' : 'v'); $('#paneCode').style.flexBasis = '50%'; if (cm) setTimeout(function () { cm.refresh(); }, 30);
    });
    $('#tryClearConsole').addEventListener('click', function () { $('#tryConsoleBody').innerHTML = ''; $('#tryConsole').hidden = true; });
    $$('#tryTabs button').forEach(function (b) { b.addEventListener('click', function () { setPanel(b.getAttribute('data-p')); }); });
    $('#trySql').addEventListener('click', function (e) {
      var tb = e.target.closest('[data-tbl]');
      if (tb && cur && cur.run === 'sql') { setVal('SELECT * FROM ' + tb.getAttribute('data-tbl') + ';', cur.mode); run(true); }
    });
    window.addEventListener('message', function (ev) {
      var d = ev.data, f = $('#tryFrame');
      if (!d || !d.s21c || !f || ev.source !== f.contentWindow) return;
      var c = $('#tryConsole'); c.hidden = false;
      var row = document.createElement('div'); row.className = d.type; row.textContent = (d.type === 'error' ? '✘ ' : d.type === 'warn' ? '⚠ ' : '› ') + d.text;
      var body = $('#tryConsoleBody'); body.appendChild(row); body.scrollTop = body.scrollHeight;
    });
    var split = $('#trySplit'), dragging = false;
    split.addEventListener('pointerdown', function (e) { dragging = true; split.setPointerCapture(e.pointerId); });
    split.addEventListener('pointerup', function () { dragging = false; if (cm) cm.refresh(); });
    split.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var body = $('#tryBody').getBoundingClientRect(), v = $('#cTry').getAttribute('data-layout') === 'v';
      var p = v ? (e.clientY - body.top) / body.height : (e.clientX - body.left) / body.width;
      $('#paneCode').style.flexBasis = (Math.max(0.15, Math.min(0.85, p)) * 100) + '%';
    });
    window.addEventListener('hashchange', function () { var id = location.hash.replace('#', ''); if (byId(id) && (!cur || cur.id !== id)) pick(id); });

    var start = location.hash.replace('#', '');
    pick(byId(start) ? start : (byId(store('s21e-lang')) ? store('s21e-lang') : 'html'));
    if (cm && !isMobile()) setTimeout(function () { cm.focus(); }, 80);
  }

  window.S21E = { langs: LANGS, cm: function () { return cm; }, cur: function () { return cur; }, file: function () { return curFile; }, run: run, get: runCode, raw: getVal, set: setVal, setFile: setFile, pick: pick, byId: byId, store: store, isMobile: isMobile };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
