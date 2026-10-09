/* Smart21Editor — pro features: autocomplete, find/replace, folding, formatter, snippets, live preview,
   device preview, share links, file import/drop, error-line marking, shortcuts and AI helper. */
(function () {
  'use strict';
  var E = window.S21E; if (!E) return;
  var $ = function (s) { return document.querySelector(s); }, st = E.store, cm = function () { return E.cm(); };
  var cfg = { size: 15, wrap: false, hints: true, auto: false };
  try { Object.assign(cfg, JSON.parse(st('s21e-settings') || '{}')); } catch (e) { /* ignore */ }
  function saveCfg() { st('s21e-settings', JSON.stringify(cfg)); }
  var tt; function toast(t) { var d = $('.ed-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'ed-toast' })); d.textContent = t; d.hidden = false; clearTimeout(tt); tt = setTimeout(function () { d.hidden = true; }, 2200); }

  /* open a shared link (?l=lang&c=base64) before the editor starts */
  try {
    var q = new URLSearchParams(location.search), l = q.get('l'), c = q.get('c');
    if (c && l && E.byId(l)) {
      var code = decodeURIComponent(escape(atob(c)));
      if (l === 'web') { var o = JSON.parse(code); ['html', 'css', 'js'].forEach(function (f) { st('s21e-web-' + f, o[f] || ''); }); } else st('s21e-code-' + l, code);
      st('s21e-lang', l); E.shared = l; history.replaceState(null, '', location.pathname + '#' + l);
    }
  } catch (e) { /* ignore bad links */ }

  /* ------------------------------------------------------------ toolbar */
  var tools = document.createElement('div'); tools.className = 'ed-tools';
  tools.innerHTML = '<button id="edFmt" title="Format code (Shift+Alt+F)"><i class="fa-solid fa-wand-magic-sparkles"></i> Format</button>' +
    '<button id="edFind" title="Find (Ctrl+F) · Replace (Ctrl+H)"><i class="fa-solid fa-magnifying-glass"></i> Find</button>' +
    '<button id="edUndo" title="Undo"><i class="fa-solid fa-rotate-left"></i></button><button id="edRedo" title="Redo"><i class="fa-solid fa-rotate-right"></i></button>' +
    '<select id="edSnip" title="Insert a snippet"></select>' +
    '<button id="edFontD" title="Smaller text">A−</button><button id="edFontU" title="Bigger text">A+</button>' +
    '<button id="edWrap" title="Wrap long lines">Wrap</button><button id="edHints" title="Autocomplete while typing (Ctrl+Space)">Hints</button>' +
    '<button id="edAuto" class="w" title="Re-run the preview as you type">Live</button>' +
    '<select id="edDev" class="w" title="Preview size"><option value="">Full width</option><option value="768">Tablet</option><option value="375">Phone</option></select>' +
    '<button id="edTab" class="w" title="Open the preview in a new tab"><i class="fa-solid fa-up-right-from-square"></i> Preview</button>' +
    '<button id="edShare" title="Copy a link to this code"><i class="fa-solid fa-link"></i> Share</button>' +
    '<button id="edOpen" title="Open a file from your device"><i class="fa-solid fa-folder-open"></i> Open</button>' +
    '<button id="edCopy" title="Copy the output"><i class="fa-solid fa-copy"></i> Output</button>' +
    '<button id="edKeys" title="Keyboard shortcuts (F1)"><i class="fa-solid fa-keyboard"></i></button>' +
    '<button id="edAI" data-ai-trigger title="Ask Smart21brain AI"><i class="fa-solid fa-robot"></i> AI</button><input type="file" id="edFile" hidden>';
  $('.c-try-bar').after(tools);
  var bar = document.createElement('div'); bar.className = 'ed-status';
  bar.innerHTML = '<span id="edPos"></span><span id="edLen"></span><span id="edTime"></span><span class="sp"></span><span>Auto-saved on this device</span>';
  $('#paneCode').appendChild(bar);
  var fs = document.createElement('style'); document.head.appendChild(fs);
  function applyCfg() {
    fs.textContent = '.CodeMirror { font-size: ' + cfg.size + 'px !important; }';
    var c = cm(); if (c) { c.setOption('lineWrapping', cfg.wrap); c.refresh(); }
    $('#edWrap').classList.toggle('on', cfg.wrap); $('#edHints').classList.toggle('on', cfg.hints); $('#edAuto').classList.toggle('on', cfg.auto);
  }
  function upd() { var c = cm(); if (!c) return; var p = c.getCursor(); $('#edPos').textContent = 'Ln ' + (p.line + 1) + ', Col ' + (p.ch + 1); $('#edLen').textContent = c.lineCount() + ' lines · ' + c.getValue().length + ' chars'; }

  /* ---------------------------------------------------------- formatter */
  var PJ = 'https://cdnjs.cloudflare.com/ajax/libs/prettier/2.8.8/', loaded = null;
  function loadPrettier() {
    if (loaded) return loaded;
    loaded = ['standalone.js', 'parser-babel.js', 'parser-html.js', 'parser-postcss.js'].reduce(function (p, n) {
      return p.then(function () { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = PJ + n; s.onload = res; s.onerror = function () { loaded = null; rej(); }; document.head.appendChild(s); }); });
    }, Promise.resolve());
    return loaded;
  }
  function format() {
    var c = cm(), L = E.cur(); if (!c || !L) return;
    var parser = L.files ? { html: 'html', css: 'css', js: 'babel' }[E.file()] : { html: 'html', bootstrap: 'html', jquery: 'html', react: 'html', javascript: 'babel' }[L.id];
    if (!parser) {
      if (L.id === 'python') return toast('Python: keep 4 spaces per level');
      c.operation(function () { for (var i = 0; i < c.lineCount(); i++) c.indentLine(i, 'smart'); }); return toast('Re-indented');
    }
    toast('Formatting…');
    loadPrettier().then(function () {
      try {
        var out = prettier.format(c.getValue(), { parser: parser, plugins: prettierPlugins, tabWidth: 2 }).replace(/\n$/, ''), pos = c.getCursor();
        if (out !== c.getValue()) { c.setValue(out); c.setCursor(pos); } toast('Formatted');
      } catch (e) { toast('Format error: ' + String(e.message).split('\n')[0].slice(0, 80)); }
    }, function () { toast('Could not load the formatter (offline?)'); });
  }

  /* ----------------------------------------------------------- snippets */
  var SN = {
    html: [['Table', '<table border="1">\n  <tr><th>Name</th><th>Score</th></tr>\n  <tr><td>Amina</td><td>90</td></tr>\n</table>'], ['Form', '<form>\n  <label>Name <input type="text" placeholder="Your name"></label>\n  <button type="submit">Send</button>\n</form>'], ['Flex row', '<div style="display:flex;gap:10px">\n  <div>One</div>\n  <div>Two</div>\n</div>']],
    css: [['Flex center', '.center {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}'], ['Card', '.card {\n  padding: 16px;\n  border-radius: 12px;\n  box-shadow: 0 4px 14px rgba(0,0,0,.15);\n}'], ['Media query', '@media (max-width: 600px) {\n  \n}']],
    js: [['for loop', 'for (let i = 0; i < 5; i++) {\n  console.log(i);\n}'], ['Function', 'function add(a, b) {\n  return a + b;\n}'], ['Arrow + map', 'const doubled = [1, 2, 3].map(n => n * 2);\nconsole.log(doubled);'], ['Click event', 'document.addEventListener("click", function (e) {\n  console.log("clicked", e.target);\n});'], ['Class', 'class Person {\n  constructor(name) { this.name = name; }\n  hello() { return "Hi " + this.name; }\n}']],
    python: [['for loop', 'for i in range(5):\n    print(i)'], ['Function', 'def add(a, b):\n    return a + b'], ['Class', 'class Person:\n    def __init__(self, name):\n        self.name = name\n\n    def hello(self):\n        return "Hi " + self.name'], ['List comprehension', 'squares = [n * n for n in range(10)]\nprint(squares)'], ['Try / except', 'try:\n    x = int(input())\nexcept ValueError:\n    print("Not a number")']],
    cpp: [['for loop', 'for (int i = 0; i < 5; i++) {\n  cout << i << endl;\n}'], ['Function', 'int add(int a, int b) {\n  return a + b;\n}'], ['Class', 'class Person {\npublic:\n  string name;\n  Person(string n) : name(n) {}\n};'], ['Vector', 'vector<int> v = {3, 1, 2};\nsort(v.begin(), v.end());'], ['Read input', 'int n;\ncin >> n;']],
    sql: [['Filter', 'SELECT * FROM students\nWHERE score > 80\nORDER BY score DESC;'], ['Group by', 'SELECT city, COUNT(*) AS total, AVG(score) AS average\nFROM students\nGROUP BY city;'], ['Create table', 'CREATE TABLE notes (\n  id INTEGER PRIMARY KEY,\n  title TEXT\n);'], ['Insert', "INSERT INTO notes (title) VALUES ('Hello');"]]
  };
  function snKey() { var L = E.cur(); return L.files ? E.file() : ({ bootstrap: 'html', jquery: 'html', react: 'html', javascript: 'js' }[L.id] || L.id); }
  function fillSnip() { var l = SN[snKey()] || []; $('#edSnip').innerHTML = '<option value="">Snippets…</option>' + l.map(function (x, i) { return '<option value="' + i + '">' + x[0] + '</option>'; }).join(''); }

  /* ---------------------------------------------------- errors & timing */
  var errs = [], t0 = 0;
  function clearErr() { var c = cm(); if (!c) return; errs.forEach(function (n) { if (n < c.lineCount()) { c.removeLineClass(n, 'background', 'ed-errline'); c.setGutterMarker(n, 'ed-err', null); } }); errs = []; }
  E.onRun = function () { t0 = Date.now(); clearErr(); };
  E.onDone = function (text, L) {
    $('#edTime').textContent = 'Ran in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's';
    var re = L.run === 'cpp' ? /\.(?:cc|cpp|cxx):(\d+):(?:\d+:)?\s*(?:fatal )?error/g : L.run === 'python' ? /File "<exec>", line (\d+)/g : null, m, c = cm();
    if (!re) return;
    while ((m = re.exec(text))) {
      var n = +m[1] - 1;
      if (n >= 0 && n < c.lineCount() && errs.indexOf(n) < 0) { errs.push(n); c.addLineClass(n, 'background', 'ed-errline'); var d = document.createElement('span'); d.className = 'ed-dot'; d.textContent = '●'; c.setGutterMarker(n, 'ed-err', d); }
    }
    if (errs.length) c.scrollIntoView({ line: errs[0], ch: 0 }, 80);
  };
  E.onPick = function (L) {
    var web = L.run === 'web';
    Array.prototype.forEach.call(document.querySelectorAll('.ed-tools .w'), function (el) { el.hidden = !web; });
    $('#edDev').value = ''; $('#tryFrame').style.width = ''; fillSnip(); clearErr(); $('#edTime').textContent = ''; upd();
  };
  E.onFile = function () { fillSnip(); };

  /* -------------------------------------------------------------- setup */
  E.onReady = function () {
    var c = cm(); if (!c) return;
    c.setOption('gutters', ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'ed-err']);
    c.setOption('foldGutter', true); c.setOption('styleActiveLine', true); c.setOption('highlightSelectionMatches', { showToken: /\w/ });
    function dupLine() { var p = c.getCursor(); c.replaceRange(c.getLine(p.line) + '\n', { line: p.line, ch: 0 }); }
    function moveLine(d) {
      var p = c.getCursor(), a = p.line, b = a + d; if (b < 0 || b >= c.lineCount()) return;
      var A = c.getLine(a), B = c.getLine(b);
      c.operation(function () { c.replaceRange(B, { line: a, ch: 0 }, { line: a, ch: A.length }); c.replaceRange(A, { line: b, ch: 0 }, { line: b, ch: B.length }); c.setCursor({ line: b, ch: p.ch }); });
    }
    c.addKeyMap({
      'Ctrl-F': 'findPersistent', 'Cmd-F': 'findPersistent', 'Ctrl-H': 'replace', 'Ctrl-G': 'findNext', 'Shift-Ctrl-G': 'findPrev', 'Alt-G': 'jumpToLine',
      'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment', 'Ctrl-Space': function (x) { x.showHint({ completeSingle: false }); },
      'Shift-Alt-F': format, 'Ctrl-D': dupLine, 'Alt-Up': function () { moveLine(-1); }, 'Alt-Down': function () { moveLine(1); },
      'Ctrl-S': function () { $('#edDownload').click(); }, 'Cmd-S': function () { $('#edDownload').click(); }, 'F1': keys
    });
    var t;
    c.on('inputRead', function (x, ch) {
      if (!cfg.hints || x.state.completionActive) return;
      var ch1 = ch.text[0], w = x.getTokenAt(x.getCursor()).string;
      if (/^[.<\/]$/.test(ch1) || (/^\w$/.test(ch1) && /^\w{2,}$/.test(w))) x.showHint({ completeSingle: false });
    });
    c.on('cursorActivity', upd);
    c.on('change', function () {
      upd(); clearErr();
      var L = E.cur();
      if (cfg.auto && L && L.run === 'web') { clearTimeout(t); t = setTimeout(function () { E.run(true); }, 800); }
    });
    applyCfg(); upd();
  };

  function keys() {
    var m = document.createElement('div'); m.className = 'ed-modal';
    var rows = [['Run', 'Ctrl + Enter'], ['Find / Replace', 'Ctrl + F / Ctrl + H'], ['Next match', 'Ctrl + G'], ['Go to line', 'Alt + G'], ['Autocomplete', 'Ctrl + Space'], ['Comment line', 'Ctrl + /'], ['Format code', 'Shift + Alt + F'], ['Duplicate line', 'Ctrl + D'], ['Move line', 'Alt + ↑ / ↓'], ['Fold / unfold', 'Click the gutter arrow'], ['Download code', 'Ctrl + S'], ['This list', 'F1']];
    m.innerHTML = '<div><h3 style="margin:0 0 .6rem">Keyboard shortcuts</h3><table>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td><kbd>' + r[1] + '</kbd></td></tr>'; }).join('') + '</table><p style="margin:.8rem 0 0;font-size:.82rem;opacity:.75">Click anywhere to close. Use Cmd instead of Ctrl on a Mac.</p></div>';
    m.addEventListener('click', function () { m.remove(); }); document.body.appendChild(m);
  }

  function share() {
    var L = E.cur(), code = E.raw();
    if (L.files) { var o = {}; ['html', 'css', 'js'].forEach(function (f) { o[f] = st('s21e-web-' + f) || ''; }); o[E.file()] = E.raw(); code = JSON.stringify(o); }
    var url = location.origin + location.pathname + '?l=' + L.id + '&c=' + encodeURIComponent(btoa(unescape(encodeURIComponent(code))));
    var done = function () { toast(url.length > 6000 ? 'Link copied (long — some apps may cut it)' : 'Link copied!'); };
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(done, function () { window.prompt('Copy this link:', url); });
  }
  function loadFile(f) {
    var r = new FileReader();
    r.onload = function () {
      var txt = String(r.result), ext = (f.name.split('.').pop() || '').toLowerCase();
      var M = { html: 'html', htm: 'html', js: 'javascript', py: 'python', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp', sql: 'sql' };
      if (ext === 'css') { st('s21e-web-css', txt); E.pick('web'); E.setFile('css'); toast('Opened ' + f.name + ' in the project'); }
      else if (M[ext]) { st('s21e-code-' + M[ext], txt); E.pick(M[ext]); toast('Opened ' + f.name); }
      else toast('Unsupported file type: .' + ext);
    };
    r.readAsText(f);
  }

  $('#edFmt').onclick = format;
  $('#edFind').onclick = function () { cm().execCommand('findPersistent'); };
  $('#edUndo').onclick = function () { cm().undo(); cm().focus(); };
  $('#edRedo').onclick = function () { cm().redo(); cm().focus(); };
  $('#edSnip').onchange = function () { var l = SN[snKey()] || [], i = this.value; this.value = ''; if (i !== '' && l[i]) { cm().replaceSelection(l[i][1]); cm().focus(); } };
  $('#edSnip').onmousedown = fillSnip;
  $('#edFontD').onclick = function () { cfg.size = Math.max(10, cfg.size - 1); saveCfg(); applyCfg(); };
  $('#edFontU').onclick = function () { cfg.size = Math.min(28, cfg.size + 1); saveCfg(); applyCfg(); };
  $('#edWrap').onclick = function () { cfg.wrap = !cfg.wrap; saveCfg(); applyCfg(); };
  $('#edHints').onclick = function () { cfg.hints = !cfg.hints; saveCfg(); applyCfg(); };
  $('#edAuto').onclick = function () { cfg.auto = !cfg.auto; saveCfg(); applyCfg(); if (cfg.auto) E.run(true); };
  $('#edDev').onchange = function () { var f = $('#tryFrame'), v = this.value; f.style.width = v ? v + 'px' : ''; f.style.maxWidth = '100%'; f.style.margin = v ? '0 auto' : ''; f.style.border = v ? '1px solid var(--s21-border)' : ''; };
  $('#edTab').onclick = function () { var u = URL.createObjectURL(new Blob([E.get()], { type: 'text/html' })); window.open(u, '_blank'); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); };
  $('#edShare').onclick = share;
  $('#edOpen').onclick = function () { $('#edFile').click(); };
  $('#edFile').onchange = function () { if (this.files[0]) loadFile(this.files[0]); this.value = ''; };
  $('#edKeys').onclick = keys;
  $('#edCopy').onclick = function () {
    var el = !$('#tryOut').hidden ? $('#tryOut') : !$('#trySql').hidden ? $('#trySql') : $('#tryConsoleBody'), t = el.innerText || '';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Output copied'); }, function () { toast('Press Ctrl+C to copy'); });
  };
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  applyCfg();
})();
