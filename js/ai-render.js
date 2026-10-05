/* Smart21Brain — shared Markdown + syntax-highlight renderer (used by the AI chat page).
   Everything is HTML-escaped before formatting, so model output can never inject markup. */
(function () {
  'use strict';
  function T(k, d) { return (window.S21AIL && window.S21AIL.t) ? window.S21AIL.t(k) : d; }
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
    while ((m = re.exec(src))) {
      html += renderText(src.slice(last, m.index));
      var lang = (m[1] || '').toLowerCase(), code = m[2].replace(/\n$/, '');
      var canPrev = true;
      html += '<div class="ai-code" data-lang="' + esc(lang) + '" data-view="code"><div class="ai-code-bar"><span class="ai-code-lang">' + esc(lang || 'code') + '</span>' +
        '<span class="ai-code-actions"><span class="ai-seg" role="tablist" aria-label="Code output view">' +
        (canPrev ? '<button type="button" role="tab" data-view="preview"><i class="fa-solid fa-eye"></i> ' + T('preview', 'Preview') + '</button>' : '') +
        '<button type="button" role="tab" data-view="code" class="on" aria-selected="true"><i class="fa-solid fa-code"></i> ' + T('c_code', 'Code') + '</button>' +
        '<button type="button" role="tab" data-ai-editor title="Open this code in Smart21Editor"><i class="fa-solid fa-up-right-from-square"></i> Smart21Editor</button>' +
        '</span><button type="button" data-ai-copy><i class="fa-regular fa-copy"></i> ' + T('copy', 'Copy') + '</button></span></div>' +
        '<pre><code>' + highlight(code, lang) + '</code></pre>' +
        (canPrev ? '<div class="ai-code-prev" hidden></div>' : '') + '</div>';
      last = m.index + m[0].length;
      if (!m[3]) { last = src.length; break; }
    }
    html += renderText(src.slice(last));
    return html;
  }

  /* Build a runnable document for a code block (null = this language can't run in the browser). */
  function previewDoc(code, lang) {
    lang = (lang || '').toLowerCase();
    if (lang === 'svg') return '<!doctype html><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">' + code;
    if (lang === 'html' || lang === 'htm' || (!lang && /^\s*<(!doctype|html|svg|body|div|head|style|h1|p|section|main)/i.test(code))) return code;
    if (lang === 'css') return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;padding:1rem}</style><style>' + code + '</style><body><h1>Heading</h1><p>A paragraph with a <a href="#">link</a> and <strong>bold text</strong>.</p><button>Button</button><ul><li>One</li><li>Two</li><li>Three</li></ul><div class="box card container">A box</div>';
    if (lang === 'js' || lang === 'javascript') return '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui,sans-serif;padding:1rem"><div id="app"></div><pre id="out" style="white-space:pre-wrap;font:13px/1.5 ui-monospace,Menlo,monospace;background:#f3f6f4;padding:.7rem;border-radius:8px;margin-top:.8rem"></pre><script>(function(){var o=document.getElementById("out");function w(c,a){o.textContent+=(c?c+": ":"")+[].map.call(a,function(x){try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(" ")+"\\n"}console.log=function(){w("",arguments)};console.error=function(){w("error",arguments)};console.warn=function(){w("warn",arguments)};window.onerror=function(m){w("error",[m])};})();<\/script><script>' + code.replace(/<\/script/gi, '<\\/script') + '<\/script>';
    return null;
  }

  /* ---- code block actions: Preview / Code tabs + hand-off to Smart21Editor ---- */
  var HANDOFF = 's21-ai-handoff';
  function sendToEditor(code, lang) {
    if (window.S21AI && typeof window.S21AI.insertCode === 'function') { window.S21AI.insertCode(code, lang); return true; }   // already inside the editor
    try { localStorage.setItem(HANDOFF, JSON.stringify({ code: code, lang: lang || '', t: Date.now() })); } catch (e) { return false; }
    window.open('smart21editor.html?from=ai', '_blank');
    return true;
  }
  function setView(box, view) {
    var prev = box.querySelector('.ai-code-prev'), pre = box.querySelector('pre');
    box.setAttribute('data-view', view);
    [].forEach.call(box.querySelectorAll('.ai-seg [data-view]'), function (b) { var on = b.getAttribute('data-view') === view; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (!prev) return;
    if (view === 'preview') {
      var f = document.createElement('iframe'); f.title = 'Code preview'; f.setAttribute('sandbox', 'allow-scripts');
      var doc = previewDoc(box.querySelector('code').textContent, box.getAttribute('data-lang')); prev.innerHTML = '';
      if (doc === null) prev.innerHTML = '<div class="ai-code-note"><i class="fa-solid fa-circle-info"></i> ' + T('c_note', 'Live preview works for HTML, CSS, JavaScript and SVG. To run this code, open it in Smart21Editor.') + '</div>';
      else { f.srcdoc = doc; prev.appendChild(f); }
      prev.hidden = false; pre.hidden = true;
    } else { prev.hidden = true; prev.innerHTML = ''; pre.hidden = false; }
  }
  function onCodeClick(e) {            // returns true if the click was handled
    var b = e.target.closest && e.target.closest('.ai-seg [data-view], [data-ai-editor]');
    if (!b) return false;
    var box = b.closest('.ai-code'); if (!box) return false;
    if (b.hasAttribute('data-ai-editor')) {
      var ok = sendToEditor(box.querySelector('code').textContent, box.getAttribute('data-lang'));
      var old = b.innerHTML; b.innerHTML = ok ? '<i class="fa-solid fa-check"></i> ' + T('c_sent', 'Sent') : old; setTimeout(function () { b.innerHTML = old; }, 1500);
    } else setView(box, b.getAttribute('data-view'));
    return true;
  }

  window.S21Md = { previewDoc: previewDoc, onCodeClick: onCodeClick, sendToEditor: sendToEditor, render: renderMarkdown, highlight: highlight, esc: esc };
})();
