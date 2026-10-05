/* Smart21Code — app controller: routing, sidebar, lessons, references,
   playground and the full-screen "Try it Yourself" editor. */
(function () {
  'use strict';
  var S = window.S21C, R = window.S21CRunner;
  if (!S) return;

  var ICON = { html: 'fa-brands fa-html5', css: 'fa-brands fa-css3-alt', javascript: 'fa-brands fa-js', python: 'fa-brands fa-python', sql: 'fa-solid fa-database', cpp: 'fa-solid fa-code', c: 'fa-solid fa-microchip', java: 'fa-brands fa-java', php: 'fa-brands fa-php', csharp: 'fa-solid fa-hashtag', go: 'fa-brands fa-golang', rust: 'fa-brands fa-rust', typescript: 'fa-solid fa-t', bootstrap: 'fa-brands fa-bootstrap', jquery: 'fa-solid fa-bolt', react: 'fa-brands fa-react' };
  var STARTER = {
    bootstrap: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">\n</head>\n<body>\n<div class="container mt-4">\n  <h1 class="text-primary">My Bootstrap page</h1>\n  <p class="lead">Add classes to style things.</p>\n  <button class="btn btn-success">Click me</button>\n</div>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.3.3/js/bootstrap.bundle.min.js"><\/script>\n</body>\n</html>',
    jquery: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"><\/script>\n</head>\n<body>\n<h2 id="title">Hello!</h2>\n<button id="btn">Click me</button>\n\n<script>\n$(function () {\n  $("#btn").click(function () {\n    $("#title").text("jQuery works!").css("color", "crimson");\n  });\n});\n<\/script>\n</body>\n</html>',
    react: '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.development.js"><\/script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.development.js"><\/script>\n  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"><\/script>\n</head>\n<body>\n<div id="root"></div>\n\n<script type="text/babel">\nconst { useState } = React;\n\nfunction App() {\n  const [n, setN] = useState(0);\n  return <button onClick={() => setN(n + 1)}>Clicked {n} times</button>;\n}\n\nReactDOM.createRoot(document.getElementById("root")).render(<App />);\n<\/script>\n</body>\n</html>',
    html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My page</title>\n  <style>\n    body { font-family: sans-serif; padding: 16px; }\n    h1 { color: #0B6E4F; }\n  </style>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n  <p>Edit me and press Run.</p>\n</body>\n</html>',
    javascript: '// Write JavaScript here and press Run\nconst name = "Smart21Code";\nconsole.log("Hello from " + name);\n\nfor (let i = 1; i <= 3; i++) {\n  console.log("Loop number " + i);\n}',
    python: '# Write Python here and press Run\nname = "Smart21Code"\nprint("Hello from", name)\n\nfor i in range(1, 4):\n    print("Loop number", i)',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hello from Smart21Code!" << endl;\n\n  for (int i = 1; i <= 3; i++) {\n    cout << "Loop number " << i << endl;\n  }\n  return 0;\n}',
    c: '#include <stdio.h>\n\nint main(void) {\n  printf("Hello from Smart21Code!\\n");\n\n  for (int i = 1; i <= 3; i++) {\n    printf("Loop number %d\\n", i);\n  }\n  return 0;\n}',
    java: 'class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Smart21Code!");\n\n    for (int i = 1; i <= 3; i++) {\n      System.out.println("Loop number " + i);\n    }\n  }\n}',
    php: '<?php\n$name = "Smart21Code";\necho "Hello from $name\\n";\n\nfor ($i = 1; $i <= 3; $i++) {\n  echo "Loop number $i\\n";\n}\n',
    csharp: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello from Smart21Code!");\n\n    for (int i = 1; i <= 3; i++) {\n      Console.WriteLine("Loop number " + i);\n    }\n  }\n}',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Smart21Code!")\n\n\tfor i := 1; i <= 3; i++ {\n\t\tfmt.Println("Loop number", i)\n\t}\n}',
    rust: 'fn main() {\n    println!("Hello from Smart21Code!");\n\n    for i in 1..=3 {\n        println!("Loop number {}", i);\n    }\n}',
    typescript: 'const app: string = "Smart21Code";\nconsole.log("Hello from " + app);\n\nfor (let i: number = 1; i <= 3; i++) {\n  console.log("Loop number " + i);\n}',
    sql: '-- Try a query on the school database\nSELECT name, city, score\nFROM students\nORDER BY score DESC\nLIMIT 5;'
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function lang(id) { return S.langs.filter(function (l) { return l.id === id; })[0]; }
  function list(id) { return S.lessons[id] || []; }
  function compiled(L) { return !!L && (L.run === 'cpp' || L.run === 'wbx'); }
  function looksHtml(code) { return /^\s*</.test(code); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* ignore */ } return null; }

  /* ----------------------------------------------------- progress */
  var done = {};
  try { (JSON.parse(store('s21c-done') || '[]') || []).forEach(function (id) { done[id] = 1; }); } catch (e) { /* ignore */ }
  function saveDone() { store('s21c-done', JSON.stringify(Object.keys(done))); }
  function pct(id) {
    var l = list(id); if (!l.length) return 0;
    return Math.round(l.filter(function (x) { return done[x.i]; }).length * 100 / l.length);
  }

  /* -------------------------------------------------- highlighting */
  function modeFor(langId, code) {
    if (langId === 'python') return 'python';
    if (langId === 'sql') return 'text/x-sqlite';
    if (langId === 'cpp') return 'text/x-c++src';
    if (langId === 'c') return 'text/x-csrc';
    if (langId === 'java') return 'text/x-java';
    if (langId === 'php') return 'text/x-php';
    if (langId === 'csharp') return 'text/x-csharp';
    if (langId === 'go') return 'text/x-go';
    if (langId === 'rust') return 'rust';
    if (langId === 'typescript') return 'text/typescript';
    if (langId === 'javascript') return looksHtml(code) ? 'htmlmixed' : 'javascript';
    return 'htmlmixed';
  }
  function highlight(el, code, mode) {
    el.textContent = '';
    if (window.CodeMirror && CodeMirror.runMode) { CodeMirror.runMode(code, mode, el); } else { el.textContent = code; }
  }

  /* --------------------------------------------------------- header */
  function renderLangs(route) {
    var h = S.langs.map(function (l) {
      var on = (route.view === 'lesson' && route.lang === l.id) ? ' active' : '';
      return '<a href="#/' + l.id + '" class="' + on.trim() + '" style="--lc:' + l.color + '"><i class="' + ICON[l.id] + '"></i>' + esc(l.name) + '</a>';
    }).join('');
    h += '<span class="sep"></span>';
    h += '<a href="#/ref/' + (route.lang || 'html') + '" class="' + (route.view === 'ref' ? 'active' : '') + '"><i class="fa-solid fa-book"></i>References</a>';
    h += '<a href="#/playground" class="' + (route.view === 'play' ? 'active' : '') + '"><i class="fa-solid fa-flask"></i>Playground</a>';
    $('#cLangs').innerHTML = h;
    var act = $('#cLangs a.active'); if (act && act.scrollIntoView) { try { act.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ignore */ } }
  }

  /* -------------------------------------------------------- sidebar */
  function renderSide(route) {
    var side = $('#cSide'), h = '';
    if (route.view === 'lesson') {
      var L = lang(route.lang), items = list(route.lang), g = '';
      h += '<h2><i class="' + ICON[L.id] + '" style="color:' + L.color + '"></i> ' + esc(L.name) + ' Tutorial</h2>';
      items.forEach(function (x) {
        if (x.g !== g) { g = x.g; h += '<h3>' + esc(g) + '</h3>'; }
        h += '<a href="#/' + L.id + '/' + x.i + '" class="' + (x.i === route.id ? 'active ' : '') + (done[x.i] ? 'done' : '') + '"><span>' + esc(x.t) + '</span><i class="fa-solid fa-circle-check ck"></i></a>';
      });
      h += '<div class="extra"><a href="#/ref/' + L.id + '"><i class="fa-solid fa-book"></i> ' + esc(L.name) + ' Reference</a>' +
        '<a href="#/playground/' + L.id + '"><i class="fa-solid fa-flask"></i> ' + esc(L.name) + ' Playground</a></div>';
    } else if (route.view === 'ref') {
      h += '<h2><i class="fa-solid fa-book" style="color:var(--s21-primary)"></i> References</h2>';
      S.langs.forEach(function (l) {
        h += '<a href="#/ref/' + l.id + '" class="' + (route.lang === l.id ? 'active' : '') + '"><i class="' + ICON[l.id] + '" style="width:1.2rem;text-align:center"></i><span>' + esc(l.name) + ' Reference</span></a>';
      });
    }
    side.innerHTML = h;
    var a = $('.c-side a.active', side);
    if (a && a.scrollIntoView && window.innerWidth > 991) { try { a.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignore */ } }
  }

  function renderRight(route) {
    var r = $('#cRight'), h = '';
    if (route.view === 'lesson') {
      var L = lang(route.lang), p = pct(L.id);
      h += '<div class="c-panel"><h4>Your progress</h4><p>' + p + '% of ' + esc(L.name) + ' complete</p><div class="c-bar"><span style="width:' + p + '%"></span></div></div>';
      h += '<div class="c-panel"><h4><i class="fa-solid fa-robot" style="color:var(--s21-primary)"></i> Smart21brain AI</h4><p>Stuck on something? Ask our AI to explain it in simple words.</p><button class="c-btn sm" data-ai-ask="1">Ask the AI</button></div>';
      h += '<div class="c-panel"><h4><i class="fa-solid fa-flask" style="color:var(--s21-primary)"></i> Playground</h4><p>Write your own ' + esc(L.name) + ' code with a full editor.</p><a class="c-btn sm ghost" href="#/playground/' + L.id + '">Open editor</a></div>';
    }
    r.innerHTML = h;
  }

  /* ---------------------------------------------------------- views */
  function setLayout(sideOn, rightOn, wide) {
    var lay = $('#cLayout');
    lay.classList.toggle('no-side', !sideOn);
    lay.classList.toggle('no-right', !rightOn);
    $('#cMain').classList.toggle('wide', !!wide);
    $('#cSide').style.display = sideOn ? '' : 'none';
    $('#cRight').style.display = rightOn ? '' : 'none';
  }

  function viewHome() {
    document.title = 'Smart21Code — Learn HTML, CSS, JavaScript, Python, C++, C, Java, PHP, C#, Go, Rust, TypeScript, SQL, Bootstrap, jQuery & React | Smart21Brain';
    setLayout(false, false, true);
    var last = (store('s21c-last') || '').split('/');
    var cont = '';
    if (last.length === 2 && lang(last[0])) {
      var lx = list(last[0]).filter(function (x) { return x.i === last[1]; })[0];
      if (lx) cont = '<a class="c-btn alt" href="#/' + last[0] + '/' + last[1] + '"><i class="fa-solid fa-forward"></i> Continue: ' + esc(lx.t) + '</a>';
    }
    var total = S.langs.reduce(function (n, l) { return n + list(l.id).length; }, 0);
    var h = '<section class="c-hero"><h1>Learn to code. Try it. Build it.</h1>' +
      '<p>Free, hands-on tutorials in HTML, CSS, JavaScript, Python, C++, C, Java, PHP, C#, Go, Rust, TypeScript, SQL, Bootstrap, jQuery and React. Every example opens in a real editor — change the code and run it right in your browser.</p>' +
      '<div class="btns"><a class="c-btn" href="#/html"><i class="fa-solid fa-play"></i> Start with HTML</a>' +
      '<a class="c-btn alt" href="#/playground"><i class="fa-solid fa-flask"></i> Open the Playground</a>' + cont + '</div></section>';
    h += '<h2 class="c-h2">Choose a tutorial</h2><div class="c-cards">';
    S.langs.forEach(function (l) {
      h += '<a class="c-card" href="#/' + l.id + '" style="--lc:' + l.color + '"><div class="ic"><i class="' + ICON[l.id] + '"></i></div><h3>' + esc(l.name) + '</h3><p>' + esc(l.tag) + '</p>' +
        '<div class="c-bar"><span style="width:' + pct(l.id) + '%;background:' + l.color + '"></span></div>' +
        '<div class="meta"><span>' + list(l.id).length + ' lessons</span><span class="go">' + (pct(l.id) ? pct(l.id) + '% done' : 'Start ›') + '</span></div></a>';
    });
    h += '</div><h2 class="c-h2">How it works</h2><div class="c-steps">' +
      '<div class="c-step"><b>1</b><h4>Read a short lesson</h4><p>Plain-English explanations, one idea at a time.</p></div>' +
      '<div class="c-step"><b>2</b><h4>Try it Yourself</h4><p>Edit any example and run it. Web frameworks, Python and SQL run in your browser, while C++, C, Java, PHP, C#, Go, Rust and TypeScript are compiled and run by real compilers online.</p></div>' +
      '<div class="c-step"><b>3</b><h4>Practise with exercises</h4><p>Fill in the blank to check what you learned — ' + total + ' lessons in all.</p></div></div>';
    h += '<div class="c-panel" style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between"><div><h4 style="margin:0 0 .2rem"><i class="fa-solid fa-robot" style="color:var(--s21-primary)"></i> Get more advanced with Smart21brain AI</h4><p style="margin:0">Ask the AI to explain a lesson, debug your code, or suggest what to build next.</p></div><button class="c-btn" data-ai-ask="1">Ask the AI</button></div>';
    $('#cMain').innerHTML = h;
  }

  function viewLesson(route) {
    var L = lang(route.lang), items = list(route.lang);
    var idx = -1;
    items.forEach(function (x, i) { if (x.i === route.id) idx = i; });
    if (idx < 0) { location.hash = '#/' + route.lang + '/' + items[0].i; return; }
    var x = items[idx], prev = items[idx - 1], next = items[idx + 1];
    store('s21c-last', route.lang + '/' + x.i);
    document.title = x.t + ' | ' + L.name + ' Tutorial | Smart21Code';
    setLayout(true, true, false);

    function pn() {
      return '<div class="c-pn">' +
        (prev ? '<a class="c-btn ghost" href="#/' + L.id + '/' + prev.i + '"><i class="fa-solid fa-chevron-left"></i> Previous</a>' : '<span></span>') +
        (next ? '<a class="c-btn" href="#/' + L.id + '/' + next.i + '" data-next="1">Next <i class="fa-solid fa-chevron-right"></i></a>' : '<a class="c-btn" href="#/ref/' + L.id + '">' + esc(L.name) + ' Reference <i class="fa-solid fa-chevron-right"></i></a>') +
        '</div>';
    }
    var h = '<div class="c-crumb"><a href="#/">Smart21Code</a> › <a href="#/' + L.id + '">' + esc(L.name) + ' Tutorial</a> › <span>' + esc(x.g) + '</span></div>';
    h += pn() + '<h1>' + esc(x.t) + '</h1><div class="c-body">' + x.x + '</div>';
    (x.e || []).forEach(function (ex, n) {
      h += '<div class="c-exb"><div class="c-exb-head"><b>Example</b><span>' + esc(ex[0]) + '</span></div>' +
        '<div class="c-code"><button class="c-copy" data-copy="' + n + '">Copy</button><pre><code class="cm-s-s21c" data-ex="' + n + '"></code></pre></div>' +
        '<div class="c-exb-foot"><button class="c-tryit" data-try="' + n + '">Try it Yourself »</button></div></div>';
    });
    if (x.q) {
      var parts = x.q[1].split('___'), tpl = '';
      parts.forEach(function (p, i) { tpl += esc(p) + (i < parts.length - 1 ? '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer" size="' + Math.max(4, x.q[2].length + 1) + '">' : ''); });
      h += '<div class="c-ex-q"><h3><i class="fa-solid fa-pen-to-square" style="color:var(--s21-primary)"></i> Exercise</h3><p class="prompt">' + esc(x.q[0]).replace('___', '<b>____</b>') + '</p>' +
        '<div class="tpl">' + tpl + '</div><div class="acts"><button class="c-btn sm" data-check="1">Submit Answer »</button><button class="c-btn sm ghost" data-show="1">Show Answer</button><span class="fb" id="cFb" role="status"></span></div></div>';
    }
    h += '<div class="c-lessonfoot"><button class="c-btn ghost done-btn ' + (done[x.i] ? 'on' : '') + '" data-done="1"><i class="fa-solid fa-circle-check"></i> <span>' + (done[x.i] ? 'Completed' : 'Mark as complete') + '</span></button>' +
      '<button class="c-btn ghost" data-ai-ask="1"><i class="fa-solid fa-robot"></i> Explain with AI</button></div>' + pn();
    $('#cMain').innerHTML = h;

    $$('#cMain code[data-ex]').forEach(function (el) {
      var code = x.e[+el.getAttribute('data-ex')][1];
      highlight(el, code, modeFor(L.id, code));
    });
    var main = $('#cMain');
    main.onclick = function (ev) {
      var t = ev.target.closest('button, a'); if (!t) return;
      if (t.hasAttribute('data-try')) {
        var ex = x.e[+t.getAttribute('data-try')];
        openTry({ lang: L.id, code: ex[1], stdin: ex[2], title: x.t + ' — Try it Yourself', reset: ex[1] });
      } else if (t.hasAttribute('data-copy')) {
        var txt = x.e[+t.getAttribute('data-copy')][1];
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { t.textContent = 'Copied!'; }, function () { t.textContent = 'Press Ctrl+C'; });
        setTimeout(function () { t.textContent = 'Copy'; }, 1400);
      } else if (t.hasAttribute('data-check') || t.hasAttribute('data-show')) {
        var inputs = $$('.c-ex-q .tpl input'), fb = $('#cFb'), ans = String(x.q[2]);
        if (t.hasAttribute('data-show')) { inputs.forEach(function (i) { i.value = ans; }); fb.textContent = 'Answer: ' + ans; fb.className = 'fb'; return; }
        var allOk = inputs.length && inputs.every(function (i) { return i.value.trim().toLowerCase() === ans.toLowerCase(); });
        if (allOk) { fb.textContent = '✔ Correct! Well done.'; fb.className = 'fb ok'; markDone(x.i, true); }
        else { fb.textContent = '✘ Not quite — try again or press Show Answer.'; fb.className = 'fb no'; }
      } else if (t.hasAttribute('data-done')) {
        markDone(x.i, !done[x.i]);
      } else if (t.hasAttribute('data-next')) {
        markDone(x.i, true, true);
      }
    };
    main.onkeydown = function (ev) { if (ev.key === 'Enter' && ev.target.matches('.c-ex-q input')) { var b = $('[data-check]'); if (b) b.click(); } };
  }

  function markDone(id, on, silent) {
    if (on) done[id] = 1; else delete done[id];
    saveDone();
    var btn = $('[data-done]');
    if (btn && !silent) { btn.classList.toggle('on', !!on); btn.querySelector('span').textContent = on ? 'Completed' : 'Mark as complete'; }
    var a = $('.c-side a[href$="/' + id + '"]'); if (a) a.classList.toggle('done', !!on);
    var r = parseRoute(); renderRight(r);
  }

  function viewRef(route) {
    var L = lang(route.lang) || lang('html');
    var rows = S.refs[L.id] || [];
    document.title = L.name + ' Reference | Smart21Code';
    setLayout(true, false, true);
    var h = '<div class="c-crumb"><a href="#/">Smart21Code</a> › <span>References</span></div><h1><i class="' + ICON[L.id] + '" style="color:' + L.color + '"></i> ' + esc(L.name) + ' Reference</h1>' +
      '<p class="c-body">Quick lookup for the most useful ' + esc(L.name) + ' features. Learn them step by step in the <a href="#/' + L.id + '" style="color:var(--s21-primary);font-weight:800">' + esc(L.name) + ' tutorial</a>.</p>' +
      '<div class="c-reftools"><input id="cRefFilter" type="search" placeholder="Filter ' + esc(L.name) + ' reference…" aria-label="Filter reference"></div>' +
      '<div class="c-table-wrap"><table class="c-table"><thead><tr><th>Name</th><th>What it does</th></tr></thead><tbody id="cRefBody"></tbody></table></div>';
    $('#cMain').innerHTML = h;
    function fill(q) {
      q = (q || '').toLowerCase();
      var out = rows.filter(function (r) { return !q || (r[0] + ' ' + r[1]).toLowerCase().indexOf(q) > -1; });
      $('#cRefBody').innerHTML = out.length ? out.map(function (r) { return '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td></tr>'; }).join('') : '<tr><td colspan="2" class="c-empty">Nothing matches.</td></tr>';
    }
    fill('');
    $('#cRefFilter').addEventListener('input', function (e) { fill(e.target.value); });
  }

  function viewPlay(route) {
    document.title = 'Playground | Smart21Code';
    setLayout(false, false, true);
    var opts = ['html', 'javascript', 'python', 'cpp', 'c', 'java', 'php', 'csharp', 'go', 'rust', 'typescript', 'sql', 'bootstrap', 'jquery', 'react'];
    var h = '<div class="c-crumb"><a href="#/">Smart21Code</a> › <span>Playground</span></div><h1><i class="fa-solid fa-flask" style="color:var(--s21-primary)"></i> Playground</h1>' +
      '<p class="c-body">A full-screen editor with syntax colours. HTML, CSS, JavaScript, Bootstrap, jQuery and React run instantly; Python, C++, C, Java, PHP, C#, Go, Rust, TypeScript and SQL run for real too. Your code is saved on this device.</p><div class="c-cards">';
    opts.forEach(function (id) {
      var l = lang(id);
      h += '<a class="c-card" href="#/playground/' + id + '" style="--lc:' + l.color + '"><div class="ic"><i class="' + ICON[id] + '"></i></div><h3>' + (id === 'html' ? 'HTML / CSS' : esc(l.name)) + '</h3><p>' + esc(l.tag) + '</p><div class="meta"><span>Open editor</span><span class="go">Go ›</span></div></a>';
    });
    h += '</div>';
    $('#cMain').innerHTML = h;
    if (route.lang && opts.indexOf(route.lang) > -1) {
      var key = 's21c-play-' + route.lang;
      openTry({ lang: route.lang, code: store(key) || STARTER[route.lang], title: (route.lang === 'html' ? 'HTML / CSS' : lang(route.lang).name) + ' Playground', reset: STARTER[route.lang], saveKey: key, onClose: function () { location.hash = '#/playground'; } });
    }
  }

  /* --------------------------------------------------------- router */
  function parseRoute() {
    var p = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!p.length) return { view: 'home' };
    if (p[0] === 'ref') return { view: 'ref', lang: p[1] && lang(p[1]) ? p[1] : 'html' };
    if (p[0] === 'playground') return { view: 'play', lang: p[1] };
    if (lang(p[0])) return { view: 'lesson', lang: p[0], id: p[1] || list(p[0])[0].i };
    return { view: 'home' };
  }
  function route() {
    var r = parseRoute();
    closeTry(true);
    renderLangs(r);
    renderSide(r);
    renderRight(r);
    if (r.view === 'home') viewHome();
    else if (r.view === 'lesson') viewLesson(r);
    else if (r.view === 'ref') viewRef(r);
    else viewPlay(r);
    if (r.view !== 'play' || !r.lang) window.scrollTo(0, 0);
    closeDrawer();
  }

  /* --------------------------------------------------------- drawer */
  function openDrawer() { $('#cSide').classList.add('open'); $('#cBackdrop').classList.add('show'); document.body.classList.add('c-lock'); }
  function closeDrawer() { $('#cSide').classList.remove('open'); $('#cBackdrop').classList.remove('show'); if (!tryOpen) document.body.classList.remove('c-lock'); }

  /* --------------------------------------------------------- search */
  var index = null;
  function buildIndex() {
    index = [];
    S.langs.forEach(function (l) {
      list(l.id).forEach(function (x) {
        var tmp = document.createElement('div'); tmp.innerHTML = x.x;
        index.push({ lang: l.id, id: x.i, title: x.t, text: (x.t + ' ' + tmp.textContent).toLowerCase() });
      });
    });
  }
  function doSearch(q) {
    var box = $('#cResults'); q = q.trim().toLowerCase();
    if (!q) { box.classList.remove('show'); box.innerHTML = ''; return; }
    if (!index) buildIndex();
    var words = q.split(/\s+/);
    var hits = index.filter(function (e) { return words.every(function (w) { return e.text.indexOf(w) > -1; }); });
    hits.sort(function (a, b) { return (b.title.toLowerCase().indexOf(q) > -1) - (a.title.toLowerCase().indexOf(q) > -1); });
    hits = hits.slice(0, 8);
    box.innerHTML = hits.length ? hits.map(function (e) {
      var l = lang(e.lang);
      return '<a href="#/' + e.lang + '/' + e.id + '"><span class="tag" style="background:' + l.color + '">' + esc(l.name) + '</span><span>' + esc(e.title) + '</span></a>';
    }).join('') : '<div class="none">No tutorials match “' + esc(q) + '”.</div>';
    box.classList.add('show');
  }

  /* ------------------------------------------------- Try it editor */
  var tryOpen = false, cm = null, fallback = null, cur = null, running = false, consoleCount = 0;

  function getVal() { return cm ? cm.getValue() : fallback.value; }
  function setVal(v, mode) {
    if (cm) { cm.setOption('mode', mode); cm.setValue(v); cm.clearHistory(); setTimeout(function () { cm.refresh(); }, 30); }
    else fallback.value = v;
  }
  function ensureEditor() {
    if (cm || fallback) return;
    var host = $('#tryEditorHost');
    if (window.CodeMirror) {
      cm = CodeMirror(host, {
        value: '', mode: 'htmlmixed', theme: 's21c', lineNumbers: true, lineWrapping: false, indentUnit: 2, tabSize: 2, indentWithTabs: false,
        matchBrackets: true, autoCloseBrackets: true, autoCloseTags: true, inputStyle: 'contenteditable', spellcheck: false,
        extraKeys: {
          Tab: function (c) { if (c.somethingSelected()) c.indentSelection('add'); else c.replaceSelection('  ', 'end'); },
          'Shift-Tab': function (c) { c.indentSelection('subtract'); },
          'Ctrl-Enter': function () { runTry(); }, 'Cmd-Enter': function () { runTry(); }
        }
      });
      cm.on('change', function () { if (cur && cur.saveKey) store(cur.saveKey, cm.getValue()); });
    } else {
      fallback = document.createElement('textarea'); fallback.className = 'c-fallback'; fallback.spellcheck = false;
      fallback.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') { e.preventDefault(); var s = fallback.selectionStart; fallback.value = fallback.value.slice(0, s) + '  ' + fallback.value.slice(fallback.selectionEnd); fallback.selectionStart = fallback.selectionEnd = s + 2; }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runTry();
      });
      fallback.addEventListener('input', function () { if (cur && cur.saveKey) store(cur.saveKey, fallback.value); });
      host.appendChild(fallback);
    }
  }

  function showResult(kind) {
    $('#tryFrame').style.display = kind === 'web' ? '' : 'none';
    $('#tryOut').hidden = kind !== 'python' && kind !== 'cpp' && kind !== 'wbx';
    $('#trySql').hidden = kind !== 'sql';
    $('#tryConsole').hidden = true;
  }
  function setStatus(t) { $('#tryStatus').textContent = t || ''; }
  function setPanel(p) { $('#cTry').setAttribute('data-panel', p); $$('#tryTabs button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-p') === p); }); if (p === 'code' && cm) setTimeout(function () { cm.refresh(); }, 20); }
  function isMobile() { return window.matchMedia('(max-width: 700px)').matches; }

  function openTry(o) {
    cur = o; tryOpen = true;
    ensureEditor();
    var L = lang(o.lang), t = $('#cTry');
    $('#tryTitle').textContent = o.title || 'Try it Yourself';
    t.hidden = false; document.body.classList.add('c-lock');
    var mode = modeFor(o.lang, o.code);
    setVal(o.code, mode);
    $('#tryStdinWrap').hidden = o.lang !== 'python' && !compiled(L);
    if (compiled(L)) { $('#tryStdin').value = o.stdin || ''; $('#tryStdinLabel').textContent = L.stdin || 'Input (what the user would type for cin, one value per line)'; }
    else if (o.lang === 'python') { $('#tryStdinLabel').textContent = 'Input (one line for each input() call)'; }
    $('#tryRestore').hidden = o.lang !== 'sql';
    var kind = L.run;
    showResult(kind);
    $('#tryOut').textContent = ''; $('#tryStatus').textContent = '';
    setPanel('code');
    runTry(true);
    setTimeout(function () { if (cm && !isMobile()) cm.focus(); }, 60);
  }
  function closeTry(silent) {
    if (!tryOpen) return;
    tryOpen = false;
    $('#cTry').hidden = true;
    $('#tryFrame').srcdoc = '';
    if (R && R.stopPython) R.stopPython();
    if (R && R.stopCpp) R.stopCpp();
    running = false;
    if (!$('#cSide').classList.contains('open')) document.body.classList.remove('c-lock');
    var cb = cur && cur.onClose; cur = null;
    if (!silent && cb) cb();
  }

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

  function runTry(auto) {
    if (!cur) return;
    var L = lang(cur.lang), code = getVal(), btn = $('#tryRun');
    if (running) { if (R.stopPython) R.stopPython(); if (R.stopCpp) R.stopCpp(); running = false; btn.className = 'c-btn run'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run'; setStatus('Stopped'); return; }
    if (L.run === 'web') {
      showResult('web');
      consoleCount = 0; $('#tryConsoleBody').innerHTML = ''; $('#tryConsole').hidden = true;
      $('#tryFrame').srcdoc = R.buildWeb(code);
      setStatus('');
      if (isMobile() && !auto) setPanel('result');
    } else if (compiled(L)) {
      showResult(L.run);
      var cout_ = $('#tryOut'); cout_.textContent = '';
      running = true; btn.className = 'c-btn stop'; btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop'; setStatus('Compiling…');
      if (isMobile()) setPanel('result');
      var copts = {
        stdin: $('#tryStdin').value,
        onStatus: function (s) { setStatus(s); },
        onOut: function (text, isErr) {
          var span = document.createElement('span'); if (isErr) span.className = 'err'; span.textContent = text + '\n'; cout_.appendChild(span); cout_.scrollTop = cout_.scrollHeight;
        }
      };
      (L.run === 'wbx' ? R.runCompiled(L.wbx, code, copts) : R.runCpp(code, copts)).then(function () {
        if (!running) return;
        running = false; btn.className = 'c-btn run'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
        setStatus(cout_.textContent.trim() ? 'Finished' : 'Finished (no output)');
        if (!cout_.textContent.trim()) cout_.innerHTML = '<span style="opacity:.6">Your program ran but did not print anything. Use ' + esc(L.out || 'cout') + ' to show a result.</span>';
      });
    } else if (L.run === 'python') {
      showResult('python');
      var out = $('#tryOut'); out.textContent = '';
      running = true; btn.className = 'c-btn stop'; btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop'; setStatus('Running…');
      if (isMobile()) setPanel('result');
      R.runPython(code, {
        stdin: $('#tryStdin').value,
        onStatus: function (s) { setStatus(s); },
        onOut: function (text, isErr) {
          var span = document.createElement('span'); if (isErr) span.className = 'err'; span.textContent = text + '\n'; out.appendChild(span); out.scrollTop = out.scrollHeight;
        }
      }).then(function () {
        if (!running) return;
        running = false; btn.className = 'c-btn run'; btn.innerHTML = '<i class="fa-solid fa-play"></i> Run';
        setStatus(out.textContent.trim() ? 'Finished' : 'Finished (no output)');
        if (!out.textContent.trim()) out.innerHTML = '<span style="opacity:.6">Your program ran but did not print anything. Use print() to show a result.</span>';
      });
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

  window.addEventListener('message', function (ev) {
    var d = ev.data, f = $('#tryFrame');
    if (!d || !d.s21c || !f || ev.source !== f.contentWindow) return;
    var c = $('#tryConsole'); c.hidden = false;
    var row = document.createElement('div'); row.className = d.type; row.textContent = (d.type === 'error' ? '✘ ' : d.type === 'warn' ? '⚠ ' : '› ') + d.text;
    var body = $('#tryConsoleBody'); body.appendChild(row); body.scrollTop = body.scrollHeight;
  });

  function initTry() {
    $('#tryRun').addEventListener('click', function () { runTry(false); });
    $('#tryClose').addEventListener('click', function () { closeTry(false); });
    $('#tryReset').addEventListener('click', function () { if (cur) { setVal(cur.reset || cur.code, modeFor(cur.lang, cur.reset || cur.code)); if (cur.saveKey) store(cur.saveKey, cur.reset || cur.code); runTry(true); } });
    $('#tryRestore').addEventListener('click', function () { R.restoreDb().then(function () { setStatus('Database restored'); runTry(true); }); });
    $('#tryLayout').addEventListener('click', function () {
      var t = $('#cTry'), v = t.getAttribute('data-layout') === 'v';
      t.setAttribute('data-layout', v ? 'h' : 'v'); $('#paneCode').style.flexBasis = '50%'; if (cm) setTimeout(function () { cm.refresh(); }, 30);
    });
    $('#tryClearConsole').addEventListener('click', function () { $('#tryConsoleBody').innerHTML = ''; $('#tryConsole').hidden = true; });
    $$('#tryTabs button').forEach(function (b) { b.addEventListener('click', function () { setPanel(b.getAttribute('data-p')); }); });
    $('#trySql').addEventListener('click', function (e) {
      var tb = e.target.closest('[data-tbl]');
      if (tb) { setVal('SELECT * FROM ' + tb.getAttribute('data-tbl') + ';', 'text/x-sqlite'); runTry(true); }
    });
    // drag to resize
    var split = $('#trySplit'), dragging = false;
    split.addEventListener('pointerdown', function (e) { dragging = true; split.setPointerCapture(e.pointerId); });
    split.addEventListener('pointerup', function () { dragging = false; if (cm) cm.refresh(); });
    split.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var body = $('#tryBody').getBoundingClientRect(), v = $('#cTry').getAttribute('data-layout') === 'v';
      var p = v ? (e.clientY - body.top) / body.height : (e.clientX - body.left) / body.width;
      p = Math.max(0.15, Math.min(0.85, p));
      $('#paneCode').style.flexBasis = (p * 100) + '%';
      // iframes swallow pointer events; capture keeps the drag alive
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tryOpen) closeTry(false); });
  }

  /* ---------------------------------------------------------- init */
  /* Smart21brain AI context: lets the AI see the lesson / code the learner is looking at */
  window.S21AI = {
    getContext: function () {
      var r = parseRoute(), c = { page: 'smart21code' };
      try {
        if (r.lang) c.language = lang(r.lang).name;
        if (r.view === 'lesson') { var x = list(r.lang).filter(function (y) { return y.i === r.id; })[0]; if (x) c.lesson = x.t; }
        if (tryOpen && (cm || fallback)) {
          c.code = getVal();
          if (cur && cur.lang) c.language = lang(cur.lang).name;
          var o = $('#tryOut'), k = $('#tryConsoleBody');
          c.output = ((o && !o.hidden ? o.textContent : '') + (k && !$('#tryConsole').hidden ? '\n' + k.textContent : '')).trim();
        }
      } catch (e) {}
      return c;
    },
    insertCode: function (code, blockLang) {
      if (tryOpen && (cm || fallback)) { setVal(code, cur && cur.mode ? cur.mode : modeFor(cur && cur.lang, code)); runTry(true); return; }
      var alias = { js: 'javascript', ts: 'typescript', py: 'python', 'c++': 'cpp', 'c#': 'csharp', golang: 'go', rs: 'rust' };
      var id = alias[blockLang] || blockLang, r = parseRoute();
      if (!lang(id)) id = lang(r.lang) ? r.lang : 'html';
      openTry({ lang: id, code: code, title: 'AI code — Try it Yourself', reset: code });
    }
  };

  function askAI() {
    var r = parseRoute(), q = 'Explain in simple words';
    if (r.view === 'lesson') { var x = list(r.lang).filter(function (y) { return y.i === r.id; })[0]; if (x) q = 'Explain "' + x.t + '" in ' + lang(r.lang).name + ' in simple words with an example.'; }
    var trig = $('[data-ai-trigger]'), panel = $('#s21-ai-panel');
    if (!trig || !panel) return;
    if (!panel.classList.contains('open')) trig.click();
    panel.dispatchEvent(new CustomEvent('s21ai:prefill', { detail: q }));
  }

  function init() {
    $('#cMenu').addEventListener('click', function () { $('#cSide').classList.contains('open') ? closeDrawer() : openDrawer(); });
    $('#cBackdrop').addEventListener('click', closeDrawer);
    $('#cSide').addEventListener('click', function (e) { if (e.target.closest('a')) closeDrawer(); });
    $('#cSearchBtn').addEventListener('click', function () { var h = $('.c-head'); h.classList.toggle('search-open'); if (h.classList.contains('search-open')) $('#cSearch').focus(); });
    var si = $('#cSearch');
    si.addEventListener('input', function () { doSearch(si.value); });
    si.addEventListener('keydown', function (e) {
      var box = $('#cResults'), items = $$('a', box), i = items.findIndex(function (a) { return a.classList.contains('sel'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; if (i > -1) items[i].classList.remove('sel'); i = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length; items[i].classList.add('sel'); }
      else if (e.key === 'Enter') { var t = items[i > -1 ? i : 0]; if (t) { location.hash = t.getAttribute('href'); si.blur(); box.classList.remove('show'); si.value = ''; $('.c-head').classList.remove('search-open'); } }
      else if (e.key === 'Escape') { box.classList.remove('show'); si.blur(); }
    });
    $('#cResults').addEventListener('click', function (e) { if (e.target.closest('a')) { $('#cResults').classList.remove('show'); si.value = ''; $('.c-head').classList.remove('search-open'); } });
    document.addEventListener('click', function (e) { if (!e.target.closest('.c-search')) $('#cResults').classList.remove('show'); });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !tryOpen) { e.preventDefault(); $('.c-head').classList.add('search-open'); si.focus(); } });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-ai-ask]'); if (b) askAI(); });
    initTry();
    window.addEventListener('hashchange', route);
    window.addEventListener('resize', function () { if (window.innerWidth > 991) closeDrawer(); if (cm && tryOpen) cm.refresh(); });
    $('#cYear').textContent = new Date().getFullYear();
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
