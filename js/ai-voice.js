/* Smart21brain AI — read aloud + hands-free voice chat.
   Read aloud: speaks an answer sentence by sentence (long text is chunked so browsers do not cut it off), with speed and "read every answer" in My style.
   Voice chat: tap the circle, speak, the AI answers out loud, then listens again. Needs the browser's speech features (Chrome / Edge). */
(function () {
  'use strict';
  var L = window.S21AIL, T = L.t, Chat = window.S21Chat, X = window.S21X, P = window.S21AIPrefs;
  if (!L || !Chat || !X || !P) return;
  var $ = X.$, esc = X.esc;
  var synth = window.speechSynthesis, SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var BASE = { en: 'en-US', sw: 'sw-TZ' };

  /* ---------------- text → speakable chunks ---------------- */
  function clean(t) {
    return String(t || '')
      .replace(/```[\s\S]*?```/g, ' ' + (L.lang() === 'sw' ? 'kipande cha msimbo.' : 'code block.') + ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*+]\s+/gm, '').replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/[*_`>|~]+/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  }
  function chunks(t) {
    var out = [], parts = clean(t).match(/[^.!?…\n]+[.!?…]*/g) || [];
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > 220) { var cut = p.lastIndexOf(',', 220); if (cut < 80) cut = p.lastIndexOf(' ', 220); if (cut < 40) cut = 220; out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim(); }
      if (p) out.push(p);
    });
    return out;
  }
  function pickVoice(lang) {
    var vs = synth ? synth.getVoices() : [], code = lang.toLowerCase(), pre = code.split('-')[0];
    return vs.filter(function (v) { return v.lang && v.lang.toLowerCase() === code; })[0] || vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pre) === 0; })[0] || null;
  }

  /* ---------------- speaking engine ---------------- */
  var token = 0, speakingBtn = null, endCb = null;
  function stopSpeaking() {
    token++; if (synth) { try { synth.cancel(); } catch (e) {} }
    if (speakingBtn) { speakingBtn.classList.remove('on'); speakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; speakingBtn = null; }
    var cb = endCb; endCb = null; if (cb) cb(false);
  }
  function speak(text, onend) {
    if (!synth || !window.SpeechSynthesisUtterance) { if (onend) onend(false); return false; }
    stopSpeaking(); var list = chunks(text), my = ++token, i = 0, lang = BASE[L.lang()] || 'en-US', voice = pickVoice(lang), rate = +P.get().speed || 1;
    if (!list.length) { if (onend) onend(true); return false; }
    endCb = onend || null;
    (function next() {
      if (my !== token) return;
      if (i >= list.length) { var cb = endCb; endCb = null; finishBtn(); if (cb) cb(true); return; }
      var u = new SpeechSynthesisUtterance(list[i++]); u.lang = lang; u.rate = rate; if (voice) u.voice = voice;
      u.onend = next; u.onerror = function () { if (my === token) next(); };
      synth.speak(u);
    })();
    return true;
  }
  function finishBtn() { if (speakingBtn) { speakingBtn.classList.remove('on'); speakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; speakingBtn = null; } }
  Chat.speak = speak; Chat.stopSpeaking = stopSpeaking;
  Chat.speakMessage = function (text, btn) {
    if (!synth) { Chat.toast(T('voice_no')); return; }
    var was = speakingBtn === btn; stopSpeaking(); if (was) return;
    if (speak(text)) { speakingBtn = btn; btn.classList.add('on'); btn.innerHTML = '<i class="fa-solid fa-stop"></i>'; }
  };
  // "Read every answer aloud" (My style), but not while voice chat is speaking by itself
  var vcOpen = false;
  Chat.hooks.answerDone.push(function (answer) { if (!vcOpen && P.get().autoread) speak(answer); });
  window.addEventListener('pagehide', function () { if (synth) try { synth.cancel(); } catch (e) {} });

  /* ---------------- voice chat overlay ---------------- */
  var btn = $('#voiceBtn'), ov = null, rec = null, state = 'idle', watch = 0, lastUser = '', lastAI = '', gotAnswer = false;
  function setState(s, msg) {
    state = s; if (!ov) return; ov.setAttribute('data-state', s);
    var map = { idle: T('voice_start'), listening: T('voice_listening'), thinking: T('voice_thinking'), speaking: T('voice_speaking'), error: msg || T('voice_err') };
    $('.vc-status', ov).textContent = map[s] || '';
    $('.vc-orb', ov).setAttribute('aria-label', map[s] || '');
  }
  function paintLines() { if (!ov) return; $('.vc-you', ov).textContent = lastUser; $('.vc-ai', ov).textContent = lastAI; $('.vc-you', ov).hidden = !lastUser; $('.vc-ai', ov).hidden = !lastAI; }
  function listen() {
    if (!vcOpen || !SR) return; stopSpeaking(); clearInterval(watch);
    var r = new SR(), final = '', gotAny = false; rec = r; r.interimResults = true; r.continuous = false; r.lang = BASE[L.lang()] || 'en-US';
    r.onstart = function () { setState('listening'); };
    r.onresult = function (ev) { var t = ''; gotAny = true; for (var i = 0; i < ev.results.length; i++) { t += ev.results[i][0].transcript; if (ev.results[i].isFinal) final = t; } lastUser = t; paintLines(); };
    r.onerror = function (ev) { if (rec !== r) return; if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) { setState('error', T('no_mic')); } };
    r.onend = function () {
      if (rec !== r) return; rec = null; if (!vcOpen) return;
      var said = (final || lastUser || '').trim();
      if (state === 'error') return;
      if (!gotAny || !said) { setState('error'); return; }
      ask(said);
    };
    try { r.start(); } catch (e) { rec = null; setState('error'); }
  }
  function ask(text) {
    lastUser = text; lastAI = ''; gotAnswer = false; paintLines(); setState('thinking'); Chat.voice = true;
    if (Chat.isBusy()) Chat.stop();
    setTimeout(function () { Chat.send(text); }, 0);
    clearInterval(watch); var t0 = Date.now();
    watch = setInterval(function () { // answer never arrived (error / stopped)
      if (!vcOpen) { clearInterval(watch); return; }
      if (!Chat.isBusy() && !gotAnswer && Date.now() - t0 > 600) { clearInterval(watch); setState('error', T('unavailable')); }
    }, 400);
  }
  Chat.hooks.answerDone.push(function (answer) {
    if (!vcOpen) return; gotAnswer = true; clearInterval(watch); lastAI = answer.replace(/\s+/g, ' ').trim(); paintLines();
    setState('speaking'); if (!speak(answer, function (completed) { if (completed && vcOpen) listen(); })) listen();
  });
  function openVoice() {
    if (!SR || !synth) { Chat.toast(T('voice_no')); return; }
    if (vcOpen) return; vcOpen = true; lastUser = lastAI = ''; Chat.voice = true; stopSpeaking();
    ov = X.el('div', 'vc'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', T('voice'));
    ov.innerHTML = '<button type="button" class="icon-btn vc-x" aria-label="' + esc(T('voice_close')) + '" title="' + esc(T('voice_close')) + '"><i class="fa-solid fa-xmark"></i></button>' +
      '<div class="vc-mid"><button type="button" class="vc-orb" aria-label=""><span class="vc-ring"></span><span class="vc-ring r2"></span><i class="fa-solid fa-microphone"></i></button>' +
      '<p class="vc-status" aria-live="polite"></p><p class="vc-hint">' + esc(T('voice_hint')) + '</p><p class="vc-you" hidden></p><p class="vc-ai" hidden></p></div>' +
      '<button type="button" class="pill-btn vc-end"><i class="fa-solid fa-phone-slash"></i> ' + esc(T('voice_close')) + '</button>';
    document.body.appendChild(ov); setState('idle');
    $('.vc-x', ov).addEventListener('click', closeVoice); $('.vc-end', ov).addEventListener('click', closeVoice);
    $('.vc-orb', ov).addEventListener('click', function () {
      if (state === 'listening') { if (rec) try { rec.stop(); } catch (e) {} }
      else if (state === 'speaking') { stopSpeaking(); listen(); }
      else if (state === 'thinking') { if (Chat.isBusy()) Chat.stop(); clearInterval(watch); setState('idle'); }
      else listen();
    });
    document.addEventListener('keydown', escVoice, true); $('.vc-orb', ov).focus(); listen();
  }
  function escVoice(e) { if (e.key === 'Escape' && vcOpen) { e.stopPropagation(); closeVoice(); } }
  function closeVoice() {
    if (!vcOpen) return; vcOpen = false; Chat.voice = false; clearInterval(watch);
    var r = rec; rec = null; if (r) { r.onend = r.onresult = r.onerror = null; try { r.abort(); } catch (e) {} }
    stopSpeaking(); if (Chat.isBusy()) Chat.stop(); document.removeEventListener('keydown', escVoice, true);
    if (ov) { ov.remove(); ov = null; } if (btn) btn.focus();
  }
  if (btn) { if (!SR || !synth) btn.classList.add('x-dim'); btn.addEventListener('click', openVoice); }
  L.onChange(function () { if (ov) { setState(state); $('.vc-hint', ov).textContent = T('voice_hint'); } });
})();
