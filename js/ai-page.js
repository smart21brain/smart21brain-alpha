/* Smart21brain AI — full-page chat app
   Talks to POST /api/ai-assistant (streaming). Chats are saved in this browser only. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var Md = window.S21Md, esc = Md.esc, L = window.S21AIL, T = L.t;
  var STORE = 's21ai-convos-v1', MAX_CONVOS = 40, MAX_MSGS = 60, MAX_HISTORY = 12;

  var A = window.S21Attach, Chat = window.S21Chat = { hooks: { answerDone: [], token: [] }, voice: false, getCustom: function () { return ''; } };
  var app = $('#app'), thread = $('#thread'), stage = $('#stage'), input = $('#aiInput'), sendBtn = $('#sendBtn');
  var convos = [], activeId = null, mode = '', busy = false, abort = null, userScrolled = false;

  /* ---------------- storage ---------------- */
  function skipPrivate(k, v) { return k.charAt(0) === '_' ? undefined : v; }   // keys starting with _ (full photos/files) are never saved
  function loadAll() { try { var v = JSON.parse(localStorage.getItem(STORE) || '[]'); convos = Array.isArray(v) ? v : []; } catch (e) { convos = []; } }
  function saveAll() {
    convos.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updated - a.updated; });
    convos = convos.slice(0, MAX_CONVOS);
    try { localStorage.setItem(STORE, JSON.stringify(convos, skipPrivate)); }
    catch (e) { convos = convos.slice(0, Math.max(5, convos.length >> 1)); try { localStorage.setItem(STORE, JSON.stringify(convos, skipPrivate)); } catch (e2) {} }
  }
  function cur() { return convos.filter(function (c) { return c.id === activeId; })[0] || null; }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 1800); }

  /* ---------------- sidebar history ---------------- */
  function groupName(ts) {
    var d = new Date(); d.setHours(0, 0, 0, 0); var day = 864e5, t = d.getTime();
    if (ts >= t) return T('today'); if (ts >= t - day) return T('yesterday'); if (ts >= t - 7 * day) return T('prev7'); return T('older');
  }
  function renderHistory() {
    var q = ($('#chatSearch').value || '').trim().toLowerCase(), box = $('#history'), html = '', last = '';
    var list = convos.filter(function (c) { return !q || c.title.toLowerCase().indexOf(q) >= 0 || c.messages.some(function (m) { return m.content.toLowerCase().indexOf(q) >= 0; }); });
    if (!list.length) { box.innerHTML = '<p class="h-empty">' + (q ? T('no_match') : T('empty_hist')) + '</p>'; return; }
    list.forEach(function (c) {
      var g = c.pinned ? T('pinned') : groupName(c.updated);
      if (g !== last) { html += '<div class="h-group">' + g + '</div>'; last = g; }
      html += '<div class="h-item' + (c.id === activeId ? ' active' : '') + (c.pinned ? ' pinned' : '') + '"><button class="h-title" data-open="' + c.id + '" title="' + esc(c.title) + '">' + (c.pinned ? '<i class="fa-solid fa-thumbtack h-pin-ic" aria-hidden="true"></i>' : '') + esc(c.title) + '</button>' +
              '<button class="icon-btn h-act" data-pin="' + c.id + '" aria-label="' + (c.pinned ? T('unpin') : T('pin')) + '" title="' + (c.pinned ? T('unpin') : T('pin')) + '"><i class="fa-solid fa-thumbtack"></i></button>' +
              '<button class="icon-btn h-act" data-ren="' + c.id + '" aria-label="' + T('rename') + '" title="' + T('rename') + '"><i class="fa-solid fa-pen"></i></button>' +
              '<button class="icon-btn h-del h-act" data-del="' + c.id + '" aria-label="' + T('del_chat') + '"><i class="fa-regular fa-trash-can"></i></button></div>';
    });
    box.innerHTML = html;
  }

  /* ---------------- rendering ---------------- */
  function setHasChat(on) { app.classList.toggle('has-chat', on); }
  function decorate(root) {                                   // add "Preview" to HTML code blocks
    /* Preview / Code / Smart21Editor tabs are now built into each code block by ai-render.js */
  }
  function attsHtml(atts) {
    if (!atts || !atts.length) return '';
    return '<div class="u-atts">' + atts.map(function (a) {
      return a.k === 'img' ? '<img class="u-thumb" src="' + esc(a.thumb || '') + '" alt="' + esc(a.name) + '">'
        : '<span class="u-file"><i class="fa-solid ' + (/\.pdf$/i.test(a.name) ? 'fa-file-pdf' : 'fa-file-lines') + '"></i>' + esc(a.name) + '</span>';
    }).join('') + '</div>';
  }
  function userNode(text, i, atts) {
    var el = document.createElement('div'); el.className = 'msg user'; el.setAttribute('data-i', i);
    el.innerHTML = '<div class="u-wrap">' + attsHtml(atts) + '<div class="u-bubble"></div><div class="u-tools"><button class="icon-btn" data-act="copyu" title="' + T('copy') + '"><i class="fa-regular fa-copy"></i></button><button class="icon-btn" data-act="edit" title="' + T('edit') + '"><i class="fa-solid fa-pen"></i></button></div></div>';
    el.querySelector('.u-bubble').textContent = text; return el;
  }
  function aiNode(i) {
    var el = document.createElement('div'); el.className = 'msg ai'; el.setAttribute('data-i', i);
    el.innerHTML = '<img class="avatar" src="images/logo/coool.png" alt="" width="32" height="32"><div class="ai-body"><div class="md"></div><div class="actions"></div></div>'; return el;
  }
  function paint(node, text, streaming) {
    var md = node.querySelector('.md');
    md.innerHTML = Md.render(text) + (streaming ? '<span class="cursor"></span>' : ''); decorate(md);
  }
  function setActions(node, isLast, liked) {
    var a = node.querySelector('.actions');
    a.innerHTML = '<button class="icon-btn" data-act="copy" title="' + T('copy') + '"><i class="fa-regular fa-copy"></i></button>' +
      '<button class="icon-btn' + (liked === 1 ? ' on' : '') + '" data-act="up" title="' + T('good') + '"><i class="fa-regular fa-thumbs-up"></i></button>' +
      '<button class="icon-btn' + (liked === -1 ? ' on' : '') + '" data-act="down" title="' + T('bad') + '"><i class="fa-regular fa-thumbs-down"></i></button>' +
      ('speechSynthesis' in window ? '<button class="icon-btn" data-act="speak" title="' + T('read') + '"><i class="fa-solid fa-volume-high"></i></button>' : '') +
      (isLast ? '<button class="icon-btn" data-act="regen" title="' + T('regen') + '"><i class="fa-solid fa-rotate-right"></i></button>' : '') +
      (Chat.extraActions ? Chat.extraActions() : '');
  }
  function renderThread() {
    var c = cur(); thread.innerHTML = '';
    if (!c || !c.messages.length) { setHasChat(false); return; }
    setHasChat(true);
    c.messages.forEach(function (m, i) {
      if (m.role === 'user') thread.appendChild(userNode(m.content, i, m.atts));
      else { var n = aiNode(i); paint(n, m.content, false); if (m.imgId && Chat.paintImage) Chat.paintImage(n, m); setActions(n, i === c.messages.length - 1, m.liked); thread.appendChild(n); }
    });
    stage.scrollTop = stage.scrollHeight;
  }
  function nearBottom() { return stage.scrollHeight - stage.scrollTop - stage.clientHeight < 120; }
  function scrollDown(force) { if (force || !userScrolled) stage.scrollTop = stage.scrollHeight; }
  stage.addEventListener('scroll', function () { userScrolled = !nearBottom(); $('#toBottom').classList.toggle('show', userScrolled && thread.children.length > 0); });
  $('#toBottom').addEventListener('click', function () { userScrolled = false; stage.scrollTop = stage.scrollHeight; });

  function setBusy(on) {
    busy = on; sendBtn.classList.toggle('stop', on);
    sendBtn.innerHTML = on ? '<i class="fa-solid fa-stop"></i>' : '<i class="fa-solid fa-arrow-up"></i>';
    sendBtn.setAttribute('aria-label', on ? T('stop') : T('send')); sendBtn.disabled = on ? false : !canSend();
  }

  /* ---------------- chat flow ---------------- */
  function newChat() {
    if (abort) abort.abort();
    activeId = null; thread.innerHTML = ''; setHasChat(false); setBusy(false); renderHistory(); input.value = ''; grow(); input.focus(); closeSide();
  }
  function openConvo(id) {
    if (abort) abort.abort(); activeId = id; setBusy(false); renderThread(); renderHistory(); closeSide(); userScrolled = false;
  }
  function ensureConvo(firstText) {
    var c = cur();
    if (!c) { c = { id: uid(), title: firstText.replace(/\s+/g, ' ').slice(0, 48) || 'New chat', updated: Date.now(), messages: [] }; convos.unshift(c); activeId = c.id; }
    return c;
  }
  function send(text) {
    text = (text || '').trim(); var list = A.list();
    if ((!text && !list.length) || busy || A.busy()) return;
    if (!list.length && !Chat.voice && Chat.intercept && Chat.intercept(text)) { input.value = ''; grow(); return; }
    var titleFrom = text || (list[0] && list[0].name) || '';
    if (!text) text = T('att_default_q');
    var c = ensureConvo(titleFrom), msg = { role: 'user', content: text };
    if (list.length) { msg.atts = A.meta(list); msg._full = A.payload(list); }
    c.messages.push(msg); c.updated = Date.now(); saveAll();
    setHasChat(true); thread.appendChild(userNode(text, c.messages.length - 1, msg.atts)); A.clear();
    input.value = ''; grow(); renderHistory(); stream();
  }
  // follow-up questions in the same visit keep seeing the latest photo / file (they are not saved after a reload)
  function stickyAtts(c, upto) {
    for (var i = upto, n = 0; i >= 0 && n < 8; i--, n++) if (c.messages[i]._full) return c.messages[i]._full;
    return null;
  }
  function stream() {
    var c = cur(); if (!c) return;
    var q = c.messages[c.messages.length - 1]; if (!q || q.role !== 'user') return;
    var node = aiNode(c.messages.length); node.querySelector('.md').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    thread.appendChild(node); userScrolled = false; scrollDown(true);
    // only the newest answer keeps the "regenerate" button
    $$('.msg.ai .actions [data-act="regen"]').forEach(function (b) { b.remove(); });
    setBusy(true); abort = new AbortController();
    var hist = c.messages.slice(0, -1).slice(-MAX_HISTORY).map(function (m) { return { role: m.role, content: m.content }; });
    var answer = '', raf = 0, got = false;
    function flush() { raf = 0; paint(node, answer, true); scrollDown(false); }
    function finish(note) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (answer) {
        paint(node, answer, false); c.messages.push({ role: 'assistant', content: answer });
        if (c.messages.length > MAX_MSGS) c.messages = c.messages.slice(-MAX_MSGS);
        c.updated = Date.now(); saveAll(); setActions(node, true); renderHistory();
        Chat.hooks.answerDone.forEach(function (f) { try { f(answer); } catch (e) {} });
      } else { node.querySelector('.md').innerHTML = '<p class="err">' + esc(note || T('no_answer')) + '</p>'; setActions(node, false); node.querySelector('.actions').innerHTML = '<button class="icon-btn" data-act="retry" title="' + T('retry') + '"><i class="fa-solid fa-rotate-right"></i></button>'; }
      setBusy(false); abort = null; scrollDown(false);
    }
    fetch('/api/ai-assistant', {
      method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: q.content, history: hist, attachments: (q._full || stickyAtts(c, c.messages.length - 2)) || undefined, context: { page: 'ai', mode: mode, locale: L.lang(), custom: Chat.getCustom() || undefined, voice: Chat.voice || undefined }, stream: true })
    }).then(function (resp) {
      var type = resp.headers.get('content-type') || '';
      if (!resp.ok || type.indexOf('text/event-stream') < 0 || !resp.body) {
        return resp.json().catch(function () { return {}; }).then(function (d) {
          if (!resp.ok) { finish(d.error || T('unavailable')); return; }
          answer = d.answer || ''; finish();
        });
      }
      var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { finish(); return; }
          buf += dec.decode(r.value, { stream: true });
          var i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            var chunk = buf.slice(0, i); buf = buf.slice(i + 2);
            chunk.split('\n').forEach(function (line) {
              if (line.indexOf('data:') !== 0) return;
              var d = line.slice(5).trim(); if (!d || d === '[DONE]') return;
              try { var j = JSON.parse(d); if (j.t) { answer += j.t; got = true; Chat.hooks.token.forEach(function (f) { try { f(j.t); } catch (e) {} }); } if (j.error) answer += (answer ? '\n\n' : '') + '*' + j.error + '*'; } catch (e) {}
            });
            if (got && !raf) raf = requestAnimationFrame(flush);
          }
          return pump();
        });
      }
      return pump();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { if (answer) finish(); else { if (raf) cancelAnimationFrame(raf); node.remove(); setBusy(false); abort = null; } return; }
      finish(T('conn'));
    });
  }
  function regenerate() {
    var c = cur(); if (!c || busy) return;
    var lastM = c.messages[c.messages.length - 1];
    if (lastM && lastM.imgId && Chat.regenImage) { c.messages.pop(); var um = c.messages.pop(); saveAll(); renderThread(); Chat.regenImage(um ? um.content : lastM.imgPrompt, lastM); return; }
    if (c.messages.length && c.messages[c.messages.length - 1].role === 'assistant') c.messages.pop();
    saveAll(); renderThread(); stream();
  }
  function startEdit(msgEl) {
    var c = cur(), i = +msgEl.getAttribute('data-i'); if (!c || busy) return;
    var wrap = msgEl.querySelector('.u-wrap'), original = c.messages[i].content;
    wrap.innerHTML = '<div class="u-edit"><textarea aria-label="' + T('edit_msg') + '"></textarea><div class="row"><button class="pill-btn" data-act="cancel-edit">' + T('cancel') + '</button><button class="pill-btn primary" data-act="save-edit">' + T('save_send') + '</button></div></div>';
    var ta = wrap.querySelector('textarea'); ta.value = original; ta.focus(); ta.setSelectionRange(original.length, original.length);
    wrap.querySelector('[data-act="cancel-edit"]').onclick = function () { renderThread(); };
    wrap.querySelector('[data-act="save-edit"]').onclick = function () {
      var v = ta.value.trim(); if (!v) return;
      var old = c.messages[i], nm = { role: 'user', content: v }; if (old.atts) { nm.atts = old.atts; nm._full = old._full; } c.messages = c.messages.slice(0, i); c.updated = Date.now(); if (!nm.atts && Chat.intercept) { saveAll(); renderThread(); if (Chat.intercept(v)) return; } c.messages.push(nm); saveAll(); renderThread(); stream();
    };
  }

  /* ---------------- events ---------------- */
  thread.addEventListener('click', function (e) {
    if (Md.onCodeClick(e)) return;
    var codeCopy = e.target.closest('[data-ai-copy]'), prev = null, act = e.target.closest('[data-act]');
    var c = cur();
    if (codeCopy || prev) {
      var code = (codeCopy || prev).closest('.ai-code').querySelector('code').textContent;
      if (codeCopy) copy(code, function () { codeCopy.innerHTML = '<i class="fa-solid fa-check"></i> ' + T('copied'); setTimeout(function () { codeCopy.innerHTML = '<i class="fa-regular fa-copy"></i> ' + T('copy'); }, 1400); });
      else { $('#previewFrame').srcdoc = code; $('#previewModal').hidden = false; }
      return;
    }
    if (!act) return;
    var msg = act.closest('.msg'), i = msg ? +msg.getAttribute('data-i') : -1, a = act.getAttribute('data-act');
    if (a === 'copy' || a === 'copyu') { var t = c && c.messages[i] ? c.messages[i].content : ''; copy(t, function () { toast(T('copied')); }); }
    else if (a === 'edit') startEdit(msg);
    else if (a === 'retry-img') {
      var rt = msg.getAttribute('data-retry') || ''; msg.remove();
      if (c && c.messages.length && c.messages[c.messages.length - 1].role === 'user') { c.messages.pop(); saveAll(); }
      var lu = thread.lastElementChild; if (lu && lu.classList.contains('user')) lu.remove();
      if (rt && Chat.intercept) Chat.intercept(rt, true);
    }
    else if (a === 'regen' || a === 'retry') { if (a === 'retry') { msg.remove(); stream(); } else regenerate(); }
    else if (a === 'up' || a === 'down') {
      var m = c && c.messages[i]; if (!m) return; var v = a === 'up' ? 1 : -1; m.liked = m.liked === v ? 0 : v; saveAll(); setActions(msg, i === c.messages.length - 1, m.liked);
      if (m.liked) toast(T('thanks'));
    }
    else if (a === 'speak' && Chat.speakMessage) Chat.speakMessage(c.messages[i].content, act);
    else if (a !== 'speak' && Chat.onAct) Chat.onAct(a, act, c && c.messages[i], i);
    else if (a === 'speak') {
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      var txt = (c.messages[i].content || '').replace(/```[\s\S]*?```/g, ' code block. ').replace(/[*#`>|_~-]+/g, ' ');
      var u = new SpeechSynthesisUtterance(txt); speechSynthesis.speak(u);
    }
  });
  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
  }
  $('#previewClose').addEventListener('click', function () { $('#previewModal').hidden = true; $('#previewFrame').srcdoc = ''; });
  $('#previewModal').addEventListener('click', function (e) { if (e.target.id === 'previewModal') $('#previewClose').click(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { $('#previewClose').click(); closeSide(); } });

  $('#history').addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'), d = e.target.closest('[data-del]'), pn = e.target.closest('[data-pin]'), rn = e.target.closest('[data-ren]');
    if (pn) { var pc = convos.filter(function (c) { return c.id === pn.getAttribute('data-pin'); })[0]; if (pc) { pc.pinned = !pc.pinned; saveAll(); renderHistory(); toast(T(pc.pinned ? 'pinned_toast' : 'unpinned_toast')); } }
    else if (rn) {
      var rc = convos.filter(function (c) { return c.id === rn.getAttribute('data-ren'); })[0], item = rn.closest('.h-item'); if (!rc) return;
      var inp = document.createElement('input'); inp.className = 'h-ren'; inp.value = rc.title; inp.maxLength = 80; inp.setAttribute('aria-label', T('rename')); inp.placeholder = T('rename_ph');
      item.innerHTML = ''; item.appendChild(inp); inp.focus(); inp.select();
      var fin = false, commit = function (save) { if (fin) return; fin = true; if (save) { var v = inp.value.trim().replace(/\s+/g, ' '); if (v) { rc.title = v.slice(0, 80); saveAll(); } } renderHistory(); };
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); commit(true); } else if (ev.key === 'Escape') { ev.stopPropagation(); commit(false); } });
      inp.addEventListener('blur', function () { commit(true); });
    }
    else if (o) openConvo(o.getAttribute('data-open'));
    else if (d) {
      var id = d.getAttribute('data-del'); convos = convos.filter(function (c) { return c.id !== id; }); saveAll();
      if (id === activeId) newChat(); else renderHistory();
    }
  });
  $('#chatSearch').addEventListener('input', renderHistory);
  $('#newChat').addEventListener('click', newChat);
  $('#clearAll').addEventListener('click', function () { if (convos.length && confirm(T('confirm_clear'))) { convos = []; saveAll(); newChat(); } });

  /* composer */
  function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 200) + 'px'; if (!busy) sendBtn.disabled = !canSend(); }
  function canSend() { return !!input.value.trim() || (A.count() > 0 && !A.busy()); }
  input.addEventListener('input', grow);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!busy) $('#composer').requestSubmit(); } });
  $('#composer').addEventListener('submit', function (e) { e.preventDefault(); if (busy) { if (abort) abort.abort(); return; } send(input.value); });
  $$('.modes').forEach(function (g) { g.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; mode = b.getAttribute('data-mode') || '';
    $$('.modes button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
    var ph = { '': T('placeholder'), learn: T('ph_learn'), code: T('ph_code'), write: T('ph_write'), quiz: T('ph_quiz') };
    input.placeholder = ph[mode] || T('ph_' + mode); input.focus();
  }); });

  /* attachments: button, camera, paste, drag & drop */
  A.init({ row: $('#attRow'), onChange: function () { grow(); }, onError: toast });
  $('#attBtn').addEventListener('click', function () { $('#attInput').click(); });
  $('#camBtn').addEventListener('click', function () { $('#camInput').click(); });
  ['attInput', 'camInput'].forEach(function (id) { $('#' + id).addEventListener('change', function () { A.add(this.files); this.value = ''; }); });
  if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) $('#camBtn').style.display = 'none';
  input.addEventListener('paste', function (e) {
    var files = [].filter.call((e.clipboardData && e.clipboardData.files) || [], function (f) { return /^image\//.test(f.type); });
    if (files.length) { e.preventDefault(); A.add(files); }
  });
  var dragN = 0, hasFiles = function (e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
  document.addEventListener('dragenter', function (e) { if (hasFiles(e)) { dragN++; app.classList.add('drag'); } });
  document.addEventListener('dragleave', function (e) { if (hasFiles(e) && --dragN <= 0) { dragN = 0; app.classList.remove('drag'); } });
  document.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('drop', function (e) { if (!hasFiles(e)) return; e.preventDefault(); dragN = 0; app.classList.remove('drag'); A.add(e.dataTransfer.files); input.focus(); });

  /* voice input */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  if (!SR) $('#micBtn').style.display = 'none';
  else $('#micBtn').addEventListener('click', function () {
    var btn = this; if (rec) { rec.stop(); return; }
    rec = new SR(); rec.interimResults = true; rec.lang = document.documentElement.lang === 'sw' ? 'sw-TZ' : 'en-US';
    var base = input.value; btn.classList.add('rec');
    rec.onresult = function (ev) { var t = ''; for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; input.value = (base ? base + ' ' : '') + t; grow(); };
    rec.onend = function () { rec = null; btn.classList.remove('rec'); input.focus(); };
    rec.onerror = function () { toast(T('no_mic')); };
    try { rec.start(); } catch (e) { rec = null; btn.classList.remove('rec'); }
  });

  /* sidebar + theme + export */
  function closeSide() { app.classList.remove('side-open'); }
  $('#sideOpen').addEventListener('click', function () { app.classList.add('side-open'); });
  $('#sideClose').addEventListener('click', closeSide); $('#scrim').addEventListener('click', closeSide);
  $('#sideToggle').addEventListener('click', function () { app.classList.toggle('side-hidden'); });
  function paintTheme() { var dark = document.documentElement.getAttribute('data-theme') === 'dark'; $('#themeBtn').innerHTML = '<i class="fa-solid fa-' + (dark ? 'sun' : 'moon') + '"></i>'; }
  $('#themeBtn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('s21-theme', next); } catch (e) {} paintTheme();
  });
  $('#exportChat').addEventListener('click', function () {
    var c = cur(); if (!c || !c.messages.length) { toast(T('nothing_dl')); return; }
    var md = '# ' + c.title + '\n\n' + c.messages.map(function (m) { return (m.role === 'user' ? '**You:**\n\n' : '**Smart21brain AI:**\n\n') + m.content; }).join('\n\n---\n\n') + '\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'smart21brain-ai-chat.md'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* welcome cards */
  var CARDS = [
    { i: 'fa-graduation-cap', c: 'linear-gradient(135deg,#0B6E4F,#2fbf8a)', k: 'card1', m: 'learn' },
    { i: 'fa-code', c: 'linear-gradient(135deg,#7c5cff,#5b8def)', k: 'card2', m: 'code' },
    { i: 'fa-feather-pointed', c: 'linear-gradient(135deg,#f5a623,#ef476f)', k: 'card3', m: 'write' },
    { i: 'fa-circle-question', c: 'linear-gradient(135deg,#ef476f,#7c5cff)', k: 'card4', m: 'quiz' },
    { i: 'fa-image', c: 'linear-gradient(135deg,#00b4d8,#7c5cff)', k: 'card5', m: '' }
  ];
  function paintCards() { $('#cards').innerHTML = CARDS.map(function (k, n) { return '<button class="card" data-card="' + n + '"><i class="fa-solid ' + k.i + '" style="background:' + k.c + '"></i><div><b>' + esc(T(k.k + '_t')) + '</b><span>' + esc(T(k.k + '_d')) + '</span></div></button>'; }).join(''); }
  $('#cards').addEventListener('click', function (e) {
    var b = e.target.closest('[data-card]'); if (!b) return; var k = CARDS[+b.getAttribute('data-card')];
    var mb = $('.modes [data-mode="' + k.m + '"]'); if (mb) mb.click(); send(T(k.k + '_p'));
  });

  /* image turns: used by ai-image.js to add a "draw me ..." exchange to the active chat */
  Chat.beginTurn = function (userText, onCancel) {
    if (busy) return null;
    var c = ensureConvo(userText);
    c.messages.push({ role: 'user', content: userText }); c.updated = Date.now(); saveAll();
    setHasChat(true); thread.appendChild(userNode(userText, c.messages.length - 1)); renderHistory();
    var node = aiNode(c.messages.length); node.querySelector('.md').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    thread.appendChild(node); userScrolled = false; scrollDown(true);
    $$('.msg.ai .actions [data-act="regen"]').forEach(function (b) { b.remove(); });
    setBusy(true); abort = { abort: function () { if (onCancel) onCancel(); } };
    var done = false;
    function end() { done = true; setBusy(false); abort = null; scrollDown(false); }
    return {
      node: node,
      finish: function (text, extra) {
        if (done) return; var m = { role: 'assistant', content: text }; Object.keys(extra || {}).forEach(function (k) { m[k] = extra[k]; });
        c.messages.push(m); c.updated = Date.now(); saveAll();
        paint(node, text, false); if (m.imgId && Chat.paintImage) Chat.paintImage(node, m);
        setActions(node, true); renderHistory(); end();
      },
      fail: function (text) {
        if (done) return; node.querySelector('.md').innerHTML = '<p class="err">' + esc(text) + '</p>';
        node.querySelector('.actions').innerHTML = '<button class="icon-btn" data-act="retry-img" title="' + T('retry') + '"><i class="fa-solid fa-rotate-right"></i></button>';
        node.setAttribute('data-retry', userText); end();
      },
      cancel: function () { if (done) return; node.remove(); end(); }
    };
  };
  Chat.send = send; Chat.input = input; Chat.toast = toast; Chat.cur = cur; Chat.grow = grow; Chat.isBusy = function () { return busy; };
  Chat.stop = function () { if (abort) abort.abort(); };
  Chat.getMode = function () { return mode; };
  Chat.newChat = newChat; Chat.renderHistory = renderHistory;
  Chat.setMode = function (m) { var b = $('.modes [data-mode="' + m + '"]'); if (b) b.click(); };

  /* ---------------- boot ---------------- */
  function paintGreet() { var h = new Date().getHours(); $('#greet').textContent = T(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'); }
  $('#langBtn').addEventListener('click', function () { L.set(L.lang() === 'en' ? 'sw' : 'en'); });
  L.onChange(function () {
    paintGreet(); paintCards(); renderHistory(); setBusy(busy);
    var on = $('.modes button.on'); var om = on ? on.getAttribute('data-mode') || '' : ''; input.placeholder = T(({ '': 'placeholder', learn: 'ph_learn', code: 'ph_code', write: 'ph_write', quiz: 'ph_quiz' })[om] || ('ph_' + om));
    if (cur() && cur().messages.length) { var sc = stage.scrollTop; renderThread(); stage.scrollTop = sc; }
  });
  L.apply();
  paintTheme(); loadAll(); renderHistory(); grow();
  var params = new URLSearchParams(location.search);
  var qm = params.get('mode'); if (qm) { var mb2 = $('.modes [data-mode="' + qm + '"]'); if (mb2) mb2.click(); }
  var q0 = (params.get('q') || '').trim();
  if (q0) { history.replaceState(null, '', location.pathname); send(q0); }
  else if (convos.length && params.get('resume') === '1') openConvo(convos[0].id);
  else input.focus();
})();
