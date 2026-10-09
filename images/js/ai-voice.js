/* Smart21brain AI — natural read aloud + hands-free voice chat (v2).
   What makes it feel human:
   - Neural voice (/api/ai-tts, Deepgram Aura) instead of the robotic browser voice; Kiswahili / any failure falls back to the browser voice.
   - Speaks while the answer is still being written: the first sentence is voiced as soon as it is complete, later sentences are fetched ahead.
   - Barge-in: start talking while the AI speaks and it stops and listens, like a real conversation.
   - Spoken-style answers (short, contractions, no Markdown) come from the server's voice prompt.
   Speech recognition still uses the browser (Chrome / Edge). */
(function () {
  'use strict';
  var L = window.S21AIL, T = L.t, Chat = window.S21Chat, X = window.S21X, P = window.S21AIPrefs;
  if (!L || !Chat || !X || !P) return;
  var $ = X.$, esc = X.esc;
  var synth = window.speechSynthesis, SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var BASE = { en: 'en-US', sw: 'sw-TZ' };
  var TTS_URL = '/api/ai-tts';
  if (!Chat.hooks.token) Chat.hooks.token = [];

  /* ---------------- text → speakable sentences ---------------- */
  function clean(t) {
    return String(t || '')
      .replace(/```[\s\S]*?```/g, ' ' + (L.lang() === 'sw' ? 'kipande cha msimbo.' : 'code block.') + ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*+]\s+/gm, '').replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/[*_`>|~]+/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
      .replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  }
  // small fixes so a voice does not read symbols out loud badly
  function speakable(t) {
    t = clean(t);
    if (L.lang() !== 'sw') {
      t = t.replace(/\be\.g\.\s*/gi, 'for example, ').replace(/\bi\.e\.\s*/gi, 'that is, ').replace(/\betc\./gi, 'et cetera.')
        .replace(/(\d)\s*%/g, '$1 percent').replace(/\s&\s/g, ' and ').replace(/\s=\s/g, ' equals ').replace(/\s\+\s/g, ' plus ')
        .replace(/(\d)\s*[×x]\s*(\d)/g, '$1 times $2').replace(/(\d)\s*÷\s*(\d)/g, '$1 divided by $2').replace(/\s[−–-]\s(?=\d)/g, ' minus ');
    }
    return t.replace(/\s+/g, ' ').trim();
  }
  function chunks(t) {
    var out = [], parts = speakable(t).match(/[^.!?…\n]+[.!?…]*/g) || [];
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      while (p.length > 220) { var cut = p.lastIndexOf(',', 220); if (cut < 80) cut = p.lastIndexOf(' ', 220); if (cut < 40) cut = 220; out.push(p.slice(0, cut + 1).trim()); p = p.slice(cut + 1).trim(); }
      if (p) out.push(p);
    });
    return out;
  }
  function pickVoice(lang) {
    var vs = synth ? synth.getVoices() : [], code = lang.toLowerCase(), pre = code.split('-')[0];
    var exact = vs.filter(function (v) { return v.lang && v.lang.toLowerCase() === code; });
    var same = exact.length ? exact : vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pre) === 0; });
    // prefer the better built-in voices (Google / Microsoft "Natural" / Apple "Enhanced") over the default robot
    var good = same.filter(function (v) { return /natural|neural|enhanced|premium|google|online/i.test(v.name); });
    return good[0] || same[0] || null;
  }

  /* ---------------- speaking engine (queue + prefetch) ---------------- */
  var gen = 0, queue = [], playing = false, ended = false, curAudio = null, doneCb = null, speakingBtn = null;
  var ttsFails = 0, startedCb = null;
  function rate() { return +P.get().speed || 1; }

  function fetchAudio(text) {
    if (L.lang() !== 'en' || ttsFails >= 3) return Promise.resolve(null);   // Kiswahili / repeated failure → browser voice
    return fetch(TTS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text, lang: 'en' }) })
      .then(function (r) { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
      .then(function (b) { if (!b.size) throw new Error('empty'); ttsFails = 0; return URL.createObjectURL(b); })
      .catch(function () { ttsFails++; return null; });
  }
  function enqueue(text) {
    var t = speakable(text); if (!t || !/[\p{L}\p{N}]/u.test(t)) return;
    queue.push({ text: t, p: fetchAudio(t) }); pump();
  }
  function begun() { if (startedCb) { var f = startedCb; startedCb = null; f(); } }
  function pump() {
    if (playing) return;
    var item = queue.shift();
    if (!item) { if (ended) finishAll(true); return; }
    playing = true; var my = gen;
    item.p.then(function (url) {
      if (my !== gen) { if (url) URL.revokeObjectURL(url); return; }
      if (url) playUrl(url, my); else playBrowser(item.text, my);
    });
  }
  function advance(my) { if (my !== gen) return; curAudio = null; playing = false; pump(); }
  function playUrl(url, my) {
    var a = new Audio(url); curAudio = a; a.playbackRate = rate();
    a.onplaying = begun;
    a.onended = function () { URL.revokeObjectURL(url); advance(my); };
    a.onerror = function () { URL.revokeObjectURL(url); advance(my); };
    var pr = a.play(); if (pr && pr.catch) pr.catch(function () { URL.revokeObjectURL(url); advance(my); });
  }
  function playBrowser(text, my) {
    if (!synth || !window.SpeechSynthesisUtterance) { advance(my); return; }
    var lang = BASE[L.lang()] || 'en-US', voice = pickVoice(lang), parts = chunks(text), i = 0;
    (function next() {
      if (my !== gen) return;
      if (i >= parts.length) { advance(my); return; }
      var u = new SpeechSynthesisUtterance(parts[i++]); u.lang = lang; u.rate = rate(); if (voice) u.voice = voice;
      u.onstart = begun; u.onend = next; u.onerror = function () { if (my === gen) next(); };
      synth.speak(u);
    })();
  }
  function finishAll(ok) {
    ended = false; playing = false; finishBtn();
    var cb = doneCb; doneCb = null; if (cb) cb(ok);
  }
  function stopSpeaking() {
    gen++; queue = []; playing = false; ended = false; startedCb = null; sbuf = ''; firstOut = false;
    if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; }
    if (synth) { try { synth.cancel(); } catch (e) {} }
    finishBtn();
    var cb = doneCb; doneCb = null; if (cb) cb(false);
  }
  // speak a complete text (read aloud button, "read every answer")
  function speak(text, onend, onstart) {
    var list = chunks(text); stopSpeaking();
    if (!list.length || (!synth && L.lang() !== 'en')) { if (onend) onend(!list.length); return false; }
    doneCb = onend || null; startedCb = onstart || null;
    list.forEach(enqueue); ended = true; pump();
    if (!queue.length && !playing) finishAll(true);
    return true;
  }
  function finishBtn() { if (speakingBtn) { speakingBtn.classList.remove('on'); speakingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; speakingBtn = null; } }
  Chat.speak = speak; Chat.stopSpeaking = stopSpeaking;
  Chat.speakMessage = function (text, btn) {
    var was = speakingBtn === btn; stopSpeaking(); if (was) return;
    speakingBtn = btn; btn.classList.add('on'); btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
    if (!speak(text)) finishBtn();
  };
  // "Read every answer aloud" (My style), but not while voice chat is speaking by itself
  var vcOpen = false;
  Chat.hooks.answerDone.push(function (answer) { if (!vcOpen && P.get().autoread) speak(answer); });
  window.addEventListener('pagehide', function () { if (synth) try { synth.cancel(); } catch (e) {} });

  /* ---------------- streaming: speak while the answer is being written ---------------- */
  var sbuf = '', firstOut = false, streamed = false;
  var ABBR = /\b(?:e\.g|i\.e|etc|Mr|Mrs|Ms|Dr|Prof|vs|St)\.\s*$/i;
  function takeSentences(final) {
    var re = /[.!?…]+["')\]]*(\s+)|\n+/g, m, cut = 0;
    while ((m = re.exec(sbuf))) {
      var end = m.index + m[0].length, sent = sbuf.slice(cut, end);
      if (ABBR.test(sent)) continue;                              // "e.g. " / "Dr. " does not end a sentence
      enqueue(sent); firstOut = true; cut = end;
    }
    sbuf = sbuf.slice(cut);
    // get the first words out early: break at a comma once there is enough text
    if (!firstOut && sbuf.length > 60) {
      var c = sbuf.indexOf(',', 35);
      if (c > 0) { enqueue(sbuf.slice(0, c + 1)); sbuf = sbuf.slice(c + 1); firstOut = true; return takeSentences(final); }
    }
    if (final && sbuf.trim()) { enqueue(sbuf); sbuf = ''; }
  }
  Chat.hooks.token.push(function (delta) {
    if (!vcOpen || turnDead) return;
    if (!streamed) { streamed = true; ended = false; startedCb = function () { if (vcOpen && state !== 'listening') setState('speaking'); }; }
    sbuf += delta; takeSentences(false);
  });

  /* ---------------- voice chat overlay ---------------- */
  var btn = $('#voiceBtn'), ov = null, rec = null, state = 'idle', watch = 0, lastUser = '', lastAI = '', gotAnswer = false, mon = null, turnDead = false;
  // the learner took the turn (spoke over the AI, or tapped the circle): drop the rest of the answer and listen
  function interrupt() { turnDead = true; stopSpeaking(); if (Chat.isBusy()) Chat.stop(); listen(); }
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
    lastUser = text; lastAI = ''; gotAnswer = false; turnDead = false; streamed = false; sbuf = ''; firstOut = false; paintLines(); setState('thinking'); Chat.voice = true;
    if (Chat.isBusy()) Chat.stop();
    setTimeout(function () { Chat.send(text); }, 0);
    clearInterval(watch); var t0 = Date.now();
    watch = setInterval(function () { // answer never arrived (error / stopped)
      if (!vcOpen) { clearInterval(watch); return; }
      if (!Chat.isBusy() && !gotAnswer && Date.now() - t0 > 600) { clearInterval(watch); setState('error', T('unavailable')); }
    }, 400);
  }
  Chat.hooks.answerDone.push(function (answer) {
    if (!vcOpen) return; gotAnswer = true; clearInterval(watch);
    if (turnDead) return;                                        // the learner already interrupted
    lastAI = answer.replace(/\s+/g, ' ').trim(); paintLines();
    var onDone = function (completed) { if (completed && vcOpen) listen(); };
    if (streamed) {                                              // most of it is already being spoken: add the tail and wait for the end
      takeSentences(true); doneCb = onDone; ended = true; pump();
      if (!queue.length && !playing) finishAll(true);
    } else {                                                     // no live tokens (plain JSON reply): speak it whole
      setState('speaking');
      if (!speak(answer, onDone, function () { if (vcOpen) setState('speaking'); })) listen();
    }
  });

  /* ---------------- barge-in: talking over the AI interrupts it ---------------- */
  function startMonitor() {
    if (mon || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var pending = { stop: function () { this.dead = true; } }; mon = pending;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      if (pending.dead || !vcOpen) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var ctx = new AC(), src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(), data, floor = 0.015, loud = 0, spokeAt = 0, lastState = '';
      an.fftSize = 1024; src.connect(an); data = new Uint8Array(an.fftSize);
      var timer = setInterval(function () {
        an.getByteTimeDomainData(data);
        var sum = 0; for (var i = 0; i < data.length; i++) { var v = (data[i] - 128) / 128; sum += v * v; }
        var rms = Math.sqrt(sum / data.length);
        if (state !== 'speaking') { floor = floor * 0.97 + rms * 0.03; loud = 0; lastState = state; return; }   // learn the room noise while the AI is quiet
        if (lastState !== 'speaking') { spokeAt = Date.now(); lastState = 'speaking'; }
        if (Date.now() - spokeAt < 700) return;                    // ignore the first moments (start-up clicks, echo)
        loud = rms > Math.max(0.07, floor * 4) ? loud + 1 : Math.max(0, loud - 1);
        if (loud >= 6) { loud = 0; interrupt(); }     // about 0.3 s of real speech → hand the turn to the learner
      }, 50);
      mon = { stop: function () { clearInterval(timer); stream.getTracks().forEach(function (t) { t.stop(); }); try { ctx.close(); } catch (e) {} } };
    }).catch(function () { mon = null; });
  }
  function stopMonitor() { var m = mon; mon = null; if (m && m.stop) m.stop(); }

  function openVoice() {
    if (!SR || !(synth || L.lang() === 'en')) { Chat.toast(T('voice_no')); return; }
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
      else if (state === 'speaking') interrupt();
      else if (state === 'thinking') { stopSpeaking(); if (Chat.isBusy()) Chat.stop(); clearInterval(watch); setState('idle'); }
      else listen();
    });
    document.addEventListener('keydown', escVoice, true); $('.vc-orb', ov).focus(); listen(); startMonitor();
  }
  function escVoice(e) { if (e.key === 'Escape' && vcOpen) { e.stopPropagation(); closeVoice(); } }
  function closeVoice() {
    if (!vcOpen) return; vcOpen = false; Chat.voice = false; clearInterval(watch); stopMonitor();
    var r = rec; rec = null; if (r) { r.onend = r.onresult = r.onerror = null; try { r.abort(); } catch (e) {} }
    stopSpeaking(); if (Chat.isBusy()) Chat.stop(); document.removeEventListener('keydown', escVoice, true);
    if (ov) { ov.remove(); ov = null; } if (btn) btn.focus();
  }
  if (btn) { if (!SR || !(synth || L.lang() === 'en')) btn.classList.add('x-dim'); btn.addEventListener('click', openVoice); }
  L.onChange(function () { if (ov) { setState(state); $('.vc-hint', ov).textContent = T('voice_hint'); } });
})();
