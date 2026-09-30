/* Smart21Code — runner.
   web    : HTML / CSS / JavaScript in a sandboxed iframe (console captured)
   python : real CPython (Pyodide) in a Web Worker, loaded on first use
   sql    : real SQLite (sql.js), with a sample school database
   cpp    : real g++ compiler, reached through the free Wandbox web service  */
(function () {
  'use strict';

  var PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var SQLJS = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/';

  /* ------------------------------------------------------------- web */
  var HOOK = '<script>(function(){function s(t,a){try{parent.postMessage({s21c:1,type:t,text:Array.prototype.map.call(a,function(x){' +
    'if(typeof x==="object"&&x!==null){try{return JSON.stringify(x)}catch(e){return String(x)}}return String(x)}).join(" ")},"*")}catch(e){}}' +
    '["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);o.apply(console,arguments)}});' +
    'window.addEventListener("error",function(e){s("error",[e.message+(e.lineno?" (line "+e.lineno+")":"")])});' +
    'window.addEventListener("unhandledrejection",function(e){s("error",["Unhandled promise error: "+(e.reason&&e.reason.message||e.reason)])});' +
    '})();<\/script>';

  function looksLikeHtml(code) { return /^\s*</.test(code); }

  function buildWeb(code) {
    if (!looksLikeHtml(code)) {
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:12px;color:#222}</style>' + HOOK + '</head><body><script>\n' +
        code + '\n<\/script></body></html>';
    }
    var m;
    if ((m = /<head[^>]*>/i.exec(code))) return code.slice(0, m.index + m[0].length) + HOOK + code.slice(m.index + m[0].length);
    if ((m = /<html[^>]*>/i.exec(code))) return code.slice(0, m.index + m[0].length) + '<head>' + HOOK + '</head>' + code.slice(m.index + m[0].length);
    if ((m = /<!doctype[^>]*>/i.exec(code))) return code.slice(0, m.index + m[0].length) + '<html><head>' + HOOK + '</head><body>' + code.slice(m.index + m[0].length) + '</body></html>';
    // Fragment: give it a sensible page around it
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:12px;color:#222}</style>' + HOOK + '</head><body>' + code + '</body></html>';
  }

  /* ---------------------------------------------------------- python */
  var pyWorker = null, pyReady = false, pyJob = null;

  var WORKER_SRC = [
    "importScripts('" + PYODIDE + "pyodide.js');",
    'var py=null,stdinLines=[];',
    'async function init(){if(py)return;postMessage({type:"status",text:"Loading Python (first time only, about 10 MB)..."});',
    'py=await loadPyodide({indexURL:"' + PYODIDE + '"});',
    'py.setStdout({batched:function(s){postMessage({type:"out",text:s})}});',
    'py.setStderr({batched:function(s){postMessage({type:"err",text:s})}});',
    'py.setStdin({stdin:function(){return stdinLines.length?stdinLines.shift():undefined}});',
    'postMessage({type:"ready"});}',
    'onmessage=async function(e){var d=e.data;',
    'try{await init();stdinLines=(d.stdin||"").split(/\\r?\\n/).filter(function(l,i,a){return !(i===a.length-1&&l==="")});',
    'try{await py.loadPackagesFromImports(d.code)}catch(x){}',
    'var g=py.globals.get("dict")();',
    'try{await py.runPythonAsync(d.code,{globals:g})}finally{g.destroy()}',
    'postMessage({type:"done",id:d.id});}',
    'catch(err){var msg=String(err&&err.message||err);',
    'var lines=msg.split("\\n");var i=0;for(;i<lines.length;i++){if(/File "<exec>"/.test(lines[i]))break}',
    'if(i<lines.length)msg="Traceback (most recent call last):\\n"+lines.slice(i).join("\\n");',
    'postMessage({type:"error",text:msg,id:d.id});}};'
  ].join('\n');

  function startWorker() {
    var blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
    pyWorker = new Worker(URL.createObjectURL(blob));
    pyWorker.onmessage = function (e) {
      var m = e.data;
      if (m.type === 'ready') { pyReady = true; return; }
      if (!pyJob) return;
      if (m.type === 'status') pyJob.onStatus && pyJob.onStatus(m.text);
      else if (m.type === 'out') pyJob.onOut(m.text, false);
      else if (m.type === 'err') pyJob.onOut(m.text, true);
      else if (m.type === 'done') { var j = pyJob; pyJob = null; clearTimeout(j.timer); j.resolve(); }
      else if (m.type === 'error') { var k = pyJob; pyJob = null; clearTimeout(k.timer); k.onOut(m.text, true); k.resolve(); }
    };
    pyWorker.onerror = function (ev) {
      if (pyJob) { var j = pyJob; pyJob = null; clearTimeout(j.timer); j.onOut('Could not load the Python engine. Check your internet connection and try again.', true); j.resolve(); }
      pyWorker = null; pyReady = false;
    };
  }

  function runPython(code, opts) {
    return new Promise(function (resolve) {
      if (!window.Worker) { opts.onOut('Your browser cannot run Python here.', true); return resolve(); }
      if (!pyWorker) startWorker();
      if (pyJob) { try { pyWorker.terminate(); } catch (e) { /* ignore */ } pyWorker = null; pyReady = false; startWorker(); }
      var job = { onOut: opts.onOut, onStatus: opts.onStatus, resolve: resolve };
      // Stop runaway programs (infinite loops) after 20 s of running, but allow a long first download.
      var limit = pyReady ? 20000 : 120000;
      job.timer = setTimeout(function () {
        try { pyWorker.terminate(); } catch (e) { /* ignore */ }
        pyWorker = null; pyReady = false; pyJob = null;
        opts.onOut('\nStopped: the program ran for too long (possible infinite loop).', true);
        resolve();
      }, limit);
      pyJob = job;
      pyWorker.postMessage({ code: code, stdin: opts.stdin || '' });
    });
  }

  /* ------------------------------------------------------------- sql */
  var SEED = [
    "CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT, teacher TEXT, price REAL);",
    "INSERT INTO courses VALUES (1,'Intro to Coding','Ms. Neema',0),(2,'Fractions Made Fun','Mr. Salim',15),(3,'English Storytelling','Ms. Rehema',10),(4,'Robotics Basics','Mr. Idd',25),(5,'Chess for Beginners','Ms. Zawadi',0);",
    "CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, grade TEXT, score INTEGER, city TEXT, course_id INTEGER);",
    "INSERT INTO students VALUES (1,'Amina','A',91,'Dodoma',1),(2,'Juma','B',78,'Arusha',2),(3,'Zawadi','A',96,'Dodoma',1),(4,'Baraka','C',58,'Mwanza',3),(5,'Neema','B',72,'Arusha',2),(6,'Idi','A',88,'Dar es Salaam',4),(7,'Rehema','C',64,'Mwanza',3),(8,'Salim','B',75,'Dodoma',1),(9,'Asha','A',93,'Dar es Salaam',4),(10,'Omari','D',45,'Arusha',2),(11,'Fatuma','B',69,'Dar es Salaam',1),(12,'Hassan','C',61,'Mwanza',2);",
    "CREATE TABLE enrollments (student_id INTEGER, course_id INTEGER, joined TEXT);",
    "INSERT INTO enrollments VALUES (1,1,'2026-01-10'),(2,2,'2026-01-12'),(3,1,'2026-01-15'),(6,4,'2026-02-01'),(9,4,'2026-02-03'),(4,3,'2026-02-10');"
  ].join('\n');

  var sqlEngine = null, sqlDb = null, sqlLoading = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureSql() {
    if (sqlEngine) return Promise.resolve(sqlEngine);
    if (sqlLoading) return sqlLoading;
    sqlLoading = loadScript(SQLJS + 'sql-wasm.js').then(function () {
      return window.initSqlJs({ locateFile: function (f) { return SQLJS + f; } });
    }).then(function (SQL) { sqlEngine = SQL; return SQL; })
      .catch(function (e) { sqlLoading = null; throw e; });
    return sqlLoading;
  }
  function restoreDb() {
    return ensureSql().then(function (SQL) {
      if (sqlDb) sqlDb.close();
      sqlDb = new SQL.Database();
      sqlDb.exec(SEED);
      return sqlDb;
    });
  }
  function runSql(code) {
    return ensureSql().then(function () { return sqlDb ? sqlDb : restoreDb(); }).then(function (db) {
      try {
        var res = db.exec(code);
        return { ok: true, results: res, changes: db.getRowsModified() };
      } catch (e) { return { ok: false, error: String(e.message || e) }; }
    }, function (e) { return { ok: false, error: String(e.message || e) }; });
  }
  function dbSchema() {
    return ensureSql().then(function () { return sqlDb ? sqlDb : restoreDb(); }).then(function (db) {
      var t = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      var names = t.length ? t[0].values.map(function (r) { return r[0]; }) : [];
      return names.map(function (n) {
        var cols = db.exec('PRAGMA table_info(' + n + ')');
        var cnt = db.exec('SELECT COUNT(*) FROM ' + n);
        return { name: n, rows: cnt[0].values[0][0], cols: cols.length ? cols[0].values.map(function (r) { return r[1] + ' ' + (r[2] || ''); }) : [] };
      });
    });
  }


  /* ------------------------------------------------------------- cpp */
  var WANDBOX = 'https://wandbox.org/api/compile.json';
  var cppCtl = null;

  function stopCpp() { if (cppCtl) { try { cppCtl.abort(); } catch (e) { /* ignore */ } cppCtl = null; } }

  /* opts: { stdin, onStatus(text), onOut(text, isErr) }  ->  Promise (always resolves) */
  function runCpp(code, opts) {
    opts = opts || {};
    stopCpp();
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    cppCtl = ctl;
    var timedOut = false;
    var timer = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); }, 40000);
    if (opts.onStatus) opts.onStatus('Compiling…');
    var stdin = opts.stdin || '';
    if (stdin && stdin.slice(-1) !== '\n') stdin += '\n';
    return fetch(WANDBOX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, compiler: 'gcc-head', 'compiler-option-raw': '-std=c++17\n-Wall', stdin: stdin, save: false }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('The C++ compiler service answered with an error (' + r.status + ').');
      return r.json();
    }).then(function (d) {
      clearTimeout(timer);
      if (cppCtl !== ctl) return;               // stopped by the user
      cppCtl = null;
      var ok = String(d.status) === '0';
      var cErr = (d.compiler_error || '').trim();
      var cMsg = (d.compiler_message || '').trim();
      var out = d.program_output || '';
      var err = d.program_error || '';
      if (!out && !err && d.program_message) { out = d.program_message; }
      if (cErr || (!ok && !out && cMsg)) {
        opts.onOut((cErr || cMsg), true);        // compile errors (and warnings)
      } else if (cMsg && /warning/i.test(cMsg)) {
        opts.onOut(cMsg, true);
      }
      if (out) opts.onOut(out.replace(/\n$/, ''), false);
      if (err) opts.onOut(err.replace(/\n$/, ''), true);
      if (!ok && (out || err) && !cErr) opts.onOut('[program ended with exit code ' + d.status + ']', true);
    }).catch(function (e) {
      clearTimeout(timer);
      if (cppCtl === ctl) cppCtl = null;
      else if (!timedOut) return;              // stopped by the user
      if (timedOut) opts.onOut('The compiler took too long to answer (over 40 seconds). Check your code for an endless loop and try again.', true);
      else opts.onOut('Could not reach the C++ compiler. Check your internet connection and try again.\n(' + (e && e.message || e) + ')', true);
    });
  }

  window.S21CRunner = {
    buildWeb: buildWeb,
    runPython: runPython,
    stopPython: function () { if (pyWorker) { try { pyWorker.terminate(); } catch (e) { /* ignore */ } pyWorker = null; pyReady = false; if (pyJob) { clearTimeout(pyJob.timer); pyJob.resolve(); pyJob = null; } } },
    runCpp: runCpp,
    stopCpp: stopCpp,
    runSql: runSql,
    restoreDb: restoreDb,
    dbSchema: dbSchema
  };
})();
