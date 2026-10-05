/* Smart21Editor <-> Smart21brain AI: lets the AI see the code in the editor and put its answers back. */
(function () {
  window.S21AI = {
    getContext: function () {
      var c = { page: 'smart21editor' };
      try {
        var E = window.S21E; if (!E) return c;
        var cur = E.cur && E.cur();
        if (cur) c.language = cur.name + (cur.files && E.file ? ' (' + E.file().toUpperCase() + ' tab)' : '');
        c.code = E.raw();
        var o = document.getElementById('tryOut'), k = document.getElementById('tryConsoleBody'), kc = document.getElementById('tryConsole');
        c.output = ((o && !o.hidden ? o.textContent : '') + (k && kc && !kc.hidden ? '\n' + k.textContent : '')).trim();
      } catch (e) {}
      return c;
    },
    insertCode: function (code, blockLang) {
      var E = window.S21E; if (!E) return;
      var cur = E.cur && E.cur();
      var alias = { js: 'javascript', ts: 'typescript', py: 'python', 'c++': 'cpp', 'c#': 'csharp', golang: 'go', rs: 'rust' };
      var id = alias[blockLang] || blockLang;
      if (cur && cur.files) {                       // HTML/CSS/JS editor: put it in the matching tab
        var tab = { html: 'html', css: 'css', javascript: 'js', js: 'js' }[id];
        if (tab && E.setFile && E.file() !== tab) E.setFile(tab);
        E.set(code, { html: 'htmlmixed', css: 'css', js: 'javascript' }[E.file()] || (cur.mode));
        return;
      }
      if (id && E.byId(id) && (!cur || cur.id !== id)) E.pick(id);
      cur = E.cur();
      E.set(code, cur && cur.mode);
    }
  };

  /* Code sent from the AI chat ("Smart21Editor" tab) arrives via localStorage; load it once the editor is ready. */
  try {
    var raw = localStorage.getItem('s21-ai-handoff');
    if (raw) {
      localStorage.removeItem('s21-ai-handoff');
      var h = JSON.parse(raw), tries = 0;
      if (h && h.code && Date.now() - h.t < 120000) {
        var timer = setInterval(function () {
          if ((window.S21E && window.S21E.set && window.S21E.cur && window.S21E.cur()) || ++tries > 100) {
            clearInterval(timer);
            if (window.S21E && window.S21E.set) window.S21AI.insertCode(h.code, (h.lang || '').toLowerCase());
          }
        }, 100);
      }
    }
  } catch (e) {}
})();
