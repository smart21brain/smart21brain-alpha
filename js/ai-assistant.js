/* Smart21Brain AI — chat panel (ChatGPT-style assistant + coding helper)
   - Streams answers token-by-token from /api/ai-assistant (no API keys in the browser).
   - Rich Markdown: headings, lists, tables, quotes, links, syntax-highlighted code blocks.
   - Stop / Regenerate / Copy, New chat, Expand, remembered conversation (this tab).
   Pages can plug in with:
     window.S21AI = {
       getContext: () => ({ page, language, lesson, code, output }),
       insertCode: (code, lang) => { ... }      // optional → "Use in editor" button
     }                                                                              */
(function () {
  'use strict';
  var MAX_HISTORY = 12, STORE_KEY = 's21ai-chat-v2';
  var messages = [];                // [{role:'user'|'assistant', content}]

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ================= syntax highlighting (small, dependency-free) ================= */
  var KW = {
    js: 'async await break case catch class const continue default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while yield true false null undefined',
    py: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda None nonlocal not or pass raise return try while with yield True False self print',
    c: 'auto bool break case catch char class const continue default delete do double else enum extern false final float for friend goto if inline int long namespace new nullptr operator private protected public register return short signed sizeof static struct switch template this throw true try typedef union unsigned using virtual void volatile while string cout cin endl include',
    java: 'abstract boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws try void while true false var String System',
    cs: 'abstract async await bool break case catch char class const continue decimal default do double else enum false finally float for foreach if in int interface is long namespace new null object override private protected public readonly return static string struct switch this throw true try using var virtual void while Console',
    go: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil fmt',
    rust: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while println',
    php: 'abstract array as break case catch class const continue default do echo else elseif extends false finally for foreach function if implements include namespace new null private protected public require return static switch this throw true try use var while',
    sql: 'select from where and or not insert into values update set delete create table alter drop index join left right inner outer on group by order having limit offset as distinct union all null is in like between exists case when then else end primary key foreign references default count sum avg min max',
    css: 'important',
    sh: 'if then else fi for do done while case esac function echo cd ls cat grep sudo npm git pip python node export return in'
  };
  var FAMILY = { javascript: 'js', js: 'js', jsx: 'js', ts: 'js', typescript: 'js', tsx: 'js', json: 'js', python: 'py', py: 'py', cpp: 'c', 'c++': 'c', c: 'c', h: 'c', java: 'java', csharp: 'cs', 'c#': 'cs', cs: 'cs', go: 'go', golang: 'go', rust: 'rust', rs: 'rust', php: 'php', sql: 'sql', css: 'css', scss: 'css', bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh', html: 'html', xml: 'html', svg: 'html' };
  var kwSets = {};
  function kwSet(f) { if (!kwSets[f]) { var o = {}; (KW[f] || '').split(' ').forEach(function (w) { if (w) o[f === 'sql' ? w.toLowerCase() : w] = 1; }); kwSets[f] = o; } return kwSets[f]; }

  function highlight(code, lang) {
    var f = FAMILY[(lang || '').toLowerCase()];
    if (!f) {                                    // guess from content
      if (/^\s*</.test(code)) f = 'html'; else if (/\bdef \w+\(|^\s*import \w+$|print\(/m.test(code)) f = 'py'; else if (/\b(const|let|function|=>)\b/.test(code)) f = 'js'; else return esc(code);
    }
    var hash = (f === 'py' || f === 'sh' || f === 'php');
    var cmt = f === 'sql' ? '--[^\\n]*' : f === 'html' ? '<!--[\\s\\S]*?-->' : (hash ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/');
    if (f === 'php') cmt += '|\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
    if (f === 'css') cmt = '\\/\\*[\\s\\S]*?\\*\\/';
    var parts = [
      '(' + cmt + ')',                                                              // 1 comment
      '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`)', // 2 string
      '(' + (f === 'html' ? '<\\/?[a-zA-Z][\\w:-]*|\\/?>' : '(?!)') + ')',          // 3 tag
      '(\\b\\d+(?:\\.\\d+)?\\b)',                                                   // 4 number
      '([A-Za-z_$][\\w$]*)'                                                          // 5 word
    ];
    var re = new RegExp(parts.join('|'), 'g'), out = '', last = 0, m, set = kwSet(f);
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      var t = m[0], cls = '';
      if (m[1]) cls = 'c'; else if (m[2]) cls = 's'; else if (m[3]) cls = 't'; else if (m[4]) cls = 'n';
      else if (m[5]) {
        var w = f === 'sql' ? t.toLowerCase() : t;
        if (set[w]) cls = 'k';
        else if (code.charAt(re.lastIndex) === '(') cls = 'f';
        else if (/^[A-Z][A-Za-z0-9]+$/.test(t) && f !== 'sql') cls = 'y';
      }
      out += cls ? '<span class="hl-' + cls + '">' + esc(t) + '</span>' : esc(t);
      last = re.lastIndex;
      if (m[0] === '') re.lastIndex++;
    }
    return out + esc(code.slice(last));
  }

  /* ================= Markdown (everything is escaped first) ================= */
  function inline(t) {
    var codes = [];
    t = t.replace(/`([^`\n]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    t = esc(t)
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
      .replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')
      .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + esc(codes[+i]) + '</code>'; });
  }
  function cells(row) { return row.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); }
  function renderText(block) {
    var lines = block.split('\n'), out = '', para = [], stack = [], i = 0, m;
    function flushPara() { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } }
    function closeLists(to) { while (stack.length > to) { out += '</li></' + stack.pop().type + '>'; } }
    while (i < lines.length) {
      var ln = lines[i];
      if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        flushPara(); closeLists(0);
        var head = cells(ln), al = cells(lines[i + 1]).map(function (c) { return /^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : ''; });
        out += '<div class="ai-table"><table><thead><tr>' + head.map(function (c, k) { return '<th' + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
        i += 2;
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          out += '<tr>' + cells(lines[i]).map(function (c, k) { return '<td' + (al[k] ? ' style="text-align:' + al[k] + '"' : '') + '>' + inline(c) + '</td>'; }).join('') + '</tr>'; i++;
        }
        out += '</tbody></table></div>'; continue;
      }
      if ((m = ln.match(/^\s{0,3}(#{1,4})\s+(.*)$/))) { flushPara(); closeLists(0); out += '<h' + (m[1].length + 2) + '>' + inline(m[2]) + '</h' + (m[1].length + 2) + '>'; }
      else if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(ln)) { flushPara(); closeLists(0); out += '<hr>'; }
      else if ((m = ln.match(/^\s{0,3}>\s?(.*)$/))) {
        flushPara(); closeLists(0); var q = [m[1]];
        while (i + 1 < lines.length && (m = lines[i + 1].match(/^\s{0,3}>\s?(.*)$/))) { q.push(m[1]); i++; }
        out += '<blockquote>' + q.map(inline).join('<br>') + '</blockquote>';
      }
      else if ((m = ln.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/))) {
        flushPara();
        var ind = m[1].replace(/\t/g, '    ').length, type = /\d/.test(m[2]) ? 'ol' : 'ul';
        while (stack.length && ind < stack[stack.length - 1].ind) { out += '</li></' + stack.pop().type + '>'; }
        var top = stack[stack.length - 1];
        if (top && ind === top.ind && top.type === type) out += '</li><li>';
        else if (top && ind === top.ind) { out += '</li></' + stack.pop().type + '><' + type + '><li>'; stack.push({ ind: ind, type: type }); }
        else { out += '<' + type + '><li>'; stack.push({ ind: ind, type: type }); }
        out += inline(m[3]);
      }
      else if (!ln.trim()) { flushPara(); /* blank line: keep list open if next line continues it */ if (!(i + 1 < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i + 1]))) closeLists(0); }
      else { if (stack.length && /^\s+/.test(ln)) out += '<br>' + inline(ln.trim()); else { closeLists(0); para.push(inline(ln)); } }
      i++;
    }
    flushPara(); closeLists(0);
    return out;
  }
  function renderMarkdown(src) {
    var re = /```([\w+#.-]*)[^\n]*\n([\s\S]*?)(```|$)/g, html = '', last = 0, m;
    var canUse = !!(window.S21AI && typeof window.S21AI.insertCode === 'function');
    while ((m = re.exec(src))) {
      html += renderText(src.slice(last, m.index));
      var lang = (m[1] || '').toLowerCase(), code = m[2].replace(/\n$/, '');
      html += '<div class="ai-code" data-lang="' + esc(lang) + '"><div class="ai-code-bar"><span>' + esc(lang || 'code') + '</span><span class="ai-code-actions">' +
        '<button type="button" data-ai-copy><i class="fa-regular fa-copy"></i> Copy</button>' +
        (canUse ? '<button type="button" data-ai-use><i class="fa-solid fa-play"></i> Use in editor</button>' : '') +
        '</span></div><pre><code>' + highlight(code, lang) + '</code></pre></div>';
      last = m.index + m[0].length;
      if (!m[3]) { last = src.length; break; }
    }
    html += renderText(src.slice(last));
    return html;
  }

  /* ================= helpers ================= */
  function getContext() {
    var ctx = {};
    try { if (window.S21AI && typeof window.S21AI.getContext === 'function') ctx = window.S21AI.getContext() || {}; } catch (e) { ctx = {}; }
    if (!ctx.page) ctx.page = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    return ctx;
  }
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (er) {} t.remove(); }
  }
  function save() { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30))); } catch (e) {} }
  function load() { try { var v = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.querySelector('[data-ai-trigger]');
    var panel = document.querySelector('#s21-ai-panel');
    if (!trigger || !panel) return;
    var log = panel.querySelector('.ai-log'), form = panel.querySelector('form'), head = panel.querySelector('.ai-head');
    var closeBtn = panel.querySelector('[data-ai-close]');
    var welcomeHTML = log ? log.innerHTML : '';
    var input = form && form.querySelector('input'), send = form && form.querySelector('button[type=submit]');
    var busy = false, abort = null, userScrolled = false;

    trigger.addEventListener('click', function () { panel.classList.toggle('open'); });
    if (closeBtn) closeBtn.addEventListener('click', function () { panel.classList.remove('open'); });

    /* header buttons: new chat + expand */
    if (head && closeBtn) {
      var tools = document.createElement('span'); tools.className = 'ai-head-tools';
      tools.innerHTML = '<a class="ai-head-link" href="ai.html" title="Open full-page chat" aria-label="Open full-page chat"><i class="fa-solid fa-up-right-from-square"></i></a>' +
                        '<button type="button" data-ai-new title="New chat" aria-label="New chat"><i class="fa-solid fa-pen-to-square"></i></button>' +
                        '<button type="button" data-ai-expand title="Expand" aria-label="Expand chat"><i class="fa-solid fa-expand"></i></button>';
      closeBtn.parentNode.insertBefore(tools, closeBtn);
      closeBtn.removeAttribute('style'); closeBtn.className = 'ai-head-btn';
      tools.querySelector('[data-ai-expand]').addEventListener('click', function () {
        var on = panel.classList.toggle('ai-expanded');
        this.innerHTML = '<i class="fa-solid fa-' + (on ? 'compress' : 'expand') + '"></i>';
        this.title = on ? 'Shrink' : 'Expand';
      });
      tools.querySelector('[data-ai-new]').addEventListener('click', newChat);
    }

    /* multi-line input: Enter = send, Shift+Enter = new line */
    if (input) {
      var ta = document.createElement('textarea');
      ta.rows = 1; ta.placeholder = 'Message Smart21brain AI…'; ta.setAttribute('aria-label', 'Ask the AI'); ta.maxLength = 4000; ta.className = input.className;
      input.replaceWith(ta); input = ta;
      var grow = function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
      ta.addEventListener('input', grow);
      ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) form.requestSubmit(); } });
      form._grow = grow;
    }

    /* coding quick-actions (only where the page exposes code context) */
    if (window.S21AI && typeof window.S21AI.getContext === 'function' && form) {
      var chips = document.createElement('div'); chips.className = 'ai-chips';
      [['Explain my code', 'Explain my code step by step in simple words.'],
       ['Find the bug', 'Find any bugs or errors in my code and show the fixed version.'],
       ['Improve it', 'Suggest improvements to my code (readability, best practice, safety) and show the improved version.'],
       ['Add comments', 'Add clear, helpful comments to my code and show the full commented version.'],
       ['Give me a challenge', 'Give me a small practice challenge about what I am learning, without the solution yet.']].forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = c[0];
        b.addEventListener('click', function () { if (!busy) ask(c[1]); });
        chips.appendChild(b);
      });
      form.parentNode.insertBefore(chips, form);
    }

    /* ---------- rendering ---------- */
    function nearBottom() { return log.scrollHeight - log.scrollTop - log.clientHeight < 90; }
    function scrollDown(force) { if (force || !userScrolled) log.scrollTop = log.scrollHeight; }
    log.addEventListener('scroll', function () { userScrolled = !nearBottom(); });

    function addUser(text) {
      var b = document.createElement('div'); b.className = 'ai-bubble ai-bubble-user'; b.textContent = text; log.appendChild(b); return b;
    }
    function addAI() {
      var b = document.createElement('div'); b.className = 'ai-bubble ai-bubble-ai ai-md'; log.appendChild(b); return b;
    }
    function setAI(b, text, streaming) {
      b.innerHTML = renderMarkdown(text) + (streaming ? '<span class="ai-cursor"></span>' : '');
    }
    function actionsFor(b, text, isLast) {
      var old = b.querySelector('.ai-actions'); if (old) old.remove();
      var bar = document.createElement('div'); bar.className = 'ai-actions';
      bar.innerHTML = '<button type="button" data-a="copy" title="Copy answer"><i class="fa-regular fa-copy"></i></button>' +
        (isLast ? '<button type="button" data-a="regen" title="Regenerate"><i class="fa-solid fa-rotate-right"></i></button>' : '');
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('button'); if (!btn) return;
        if (btn.getAttribute('data-a') === 'copy') copyText(text, function () { btn.innerHTML = '<i class="fa-solid fa-check"></i>'; setTimeout(function () { btn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 1400); });
        else if (!busy) regenerate();
      });
      b.appendChild(bar);
    }
    function setBusy(on) {
      busy = on;
      if (!send) return;
      send.classList.toggle('is-stop', on);
      send.innerHTML = on ? '<i class="fa-solid fa-stop"></i>' : '<i class="fa-solid fa-paper-plane"></i>';
      send.setAttribute('aria-label', on ? 'Stop generating' : 'Send');
    }

    function starters() {
      var coding = window.S21AI && typeof window.S21AI.getContext === 'function';
      var list = coding
        ? ['Explain what a loop is with an example', 'Write a function that reverses a string', 'What is the difference between let and const?', 'Help me debug an error message']
        : ['Explain photosynthesis simply', 'Help me make a study plan for exams', 'Quiz me on fractions', 'Write a short Python program for me'];
      var wrap = document.createElement('div'); wrap.className = 'ai-starters';
      list.forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.addEventListener('click', function () { if (!busy) ask(t); }); wrap.appendChild(b); });
      log.appendChild(wrap);
    }
    function clearStarters() { var s = log.querySelector('.ai-starters'); if (s) s.remove(); }

    function newChat() {
      if (abort) abort.abort();
      messages = []; save(); setBusy(false);
      log.innerHTML = welcomeHTML; starters(); userScrolled = false;
      if (input) { input.value = ''; form._grow && form._grow(); input.focus(); }
    }

    /* ---------- talking to the server ---------- */
    function ask(text, opts) {
      opts = opts || {};
      text = (text || '').trim(); if (!text || busy) return;
      clearStarters();
      if (!opts.skipUser) { addUser(text); messages.push({ role: 'user', content: text }); }
      var bubble = addAI(); bubble.innerHTML = '<span class="ai-typing"><i></i><i></i><i></i></span>';
      userScrolled = false; scrollDown(true);
      setBusy(true);
      abort = new AbortController();
      var hist = messages.slice(0, -1).slice(-MAX_HISTORY);   // everything before this question
      var answer = '', raf = 0, gotAny = false;
      function paint(streaming) { setAI(bubble, answer, streaming); scrollDown(false); }
      function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(true); }); }
      function finish(failed) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (answer) { paint(false); messages.push({ role: 'assistant', content: answer }); save(); actionsFor(bubble, answer, true); }
        else if (!failed) { bubble.textContent = 'I could not generate an answer. Please try again.'; }
        setBusy(false); abort = null; scrollDown(false);
      }
      function fail(msg) {
        if (answer) { answer += '\n\n*' + msg + '*'; finish(true); }
        else { bubble.textContent = msg; finish(true); }
      }

      fetch('/api/ai-assistant', {
        method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, history: hist, context: getContext(), stream: true })
      }).then(function (resp) {
        var type = resp.headers.get('content-type') || '';
        if (!resp.ok || type.indexOf('text/event-stream') < 0 || !resp.body) {
          return resp.json().catch(function () { return {}; }).then(function (data) {
            if (!resp.ok) throw new Error(data.error || 'The assistant is unavailable.');
            answer = data.answer || ''; finish(false);
          });
        }
        var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '';
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { finish(false); return; }
            buf += dec.decode(r.value, { stream: true });
            var idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              var chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
              chunk.split('\n').forEach(function (line) {
                if (line.indexOf('data:') !== 0) return;
                var d = line.slice(5).trim();
                if (!d || d === '[DONE]') return;
                try { var j = JSON.parse(d); if (j.t) { answer += j.t; gotAny = true; } if (j.error) { answer += (answer ? '\n\n' : '') + '*' + j.error + '*'; } } catch (e) {}
              });
              if (gotAny) schedule();
            }
            return pump();
          });
        }
        return pump();
      }).catch(function (err) {
        if (err && err.name === 'AbortError') { if (!answer) bubble.textContent = 'Stopped.'; finish(!answer); return; }
        fail(err && err.message ? err.message : 'The assistant is unavailable.');
      });
    }

    function regenerate() {
      // drop the last assistant answer + its bubble, then ask the same question again
      if (!messages.length || messages[messages.length - 1].role !== 'assistant') return;
      messages.pop();
      var last = log.lastElementChild; if (last && last.classList.contains('ai-bubble-ai')) last.remove();
      var q = messages[messages.length - 1];
      if (!q || q.role !== 'user') return;
      ask(q.content, { skipUser: true });
    }

    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) { if (abort) abort.abort(); return; }       // button doubles as "Stop"
      var q = input.value.trim(); if (!q) return;
      input.value = ''; form._grow && form._grow();
      ask(q);
    });
    if (send) send.addEventListener('click', function (e) { if (busy) { e.preventDefault(); if (abort) abort.abort(); } });

    /* copy / use-in-editor buttons in code blocks */
    log.addEventListener('click', function (e) {
      var copy = e.target.closest('[data-ai-copy]'), use = e.target.closest('[data-ai-use]');
      var box = (copy || use) && (copy || use).closest('.ai-code'); if (!box) return;
      var code = box.querySelector('code').textContent;
      if (copy) copyText(code, function () { copy.innerHTML = '<i class="fa-solid fa-check"></i> Copied'; setTimeout(function () { copy.innerHTML = '<i class="fa-regular fa-copy"></i> Copy'; }, 1500); });
      else { try { window.S21AI.insertCode(code, box.getAttribute('data-lang')); use.innerHTML = '<i class="fa-solid fa-check"></i> Inserted'; setTimeout(function () { use.innerHTML = '<i class="fa-solid fa-play"></i> Use in editor'; }, 1500); } catch (er) {} }
    });

    /* restore this tab's conversation */
    var saved = load();
    if (saved.length) {
      messages = saved;
      saved.forEach(function (m, i) {
        if (m.role === 'user') addUser(m.content);
        else { var b = addAI(); setAI(b, m.content, false); actionsFor(b, m.content, i === saved.length - 1); }
      });
      log.scrollTop = log.scrollHeight;
    } else starters();

    // other scripts (e.g. "Ask the AI" buttons) can pre-fill + send
    panel.addEventListener('s21ai:prefill', function (e) { if (input) { input.value = e.detail || ''; input.focus(); form._grow && form._grow(); } });
  });
})();
