/* Smart21Brain — anatomy-viewer.js
   Opens a labelled anatomy picture full screen when a reader taps it.
   Pictures are described in js/anatomy-photos.js (window.S21_ANAT).
   Any element with data-photo="heart" opens that picture. */
(function () {
  'use strict';
  var DATA = window.S21_ANAT || {};
  var root = null, els = {}, state = { key: null, active: -1, opener: null };

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function build() {
    root = document.createElement('div');
    root.className = 'av-overlay';
    root.hidden = true;
    root.innerHTML =
      '<div class="av-panel" role="dialog" aria-modal="true" aria-labelledby="avTitle">' +
        '<header class="av-head">' +
          '<h2 class="av-title" id="avTitle"></h2>' +
          '<button type="button" class="av-btn" id="avNames" aria-pressed="true">Names: on</button>' +
          '<button type="button" class="av-btn av-close" id="avClose" aria-label="Close picture">&#10005;</button>' +
        '</header>' +
        '<div class="av-body" id="avBody">' +
          '<div class="av-stagewrap"><div class="av-stage" id="avStage"></div></div>' +
          '<ol class="av-list" id="avList" aria-label="Labelled parts"></ol>' +
        '</div>' +
        '<div class="av-info" id="avInfo" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(root);
    els.title = root.querySelector('#avTitle');
    els.stage = root.querySelector('#avStage');
    els.list = root.querySelector('#avList');
    els.info = root.querySelector('#avInfo');
    els.names = root.querySelector('#avNames');
    els.close = root.querySelector('#avClose');
    els.body = root.querySelector('#avBody');

    els.close.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    els.names.addEventListener('click', function () { setNames(!els.stage.classList.contains('av-names')); });
    els.stage.addEventListener('click', function (e) {
      var pin = e.target.closest('.av-pin');
      if (pin) select(+pin.getAttribute('data-i'), false);
      else select(-1, false);
    });
    els.list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]');
      if (b) select(+b.getAttribute('data-i'), true);
    });
    document.addEventListener('keydown', onKey);
  }

  function setNames(on) {
    els.stage.classList.toggle('av-names', on);
    els.names.setAttribute('aria-pressed', on ? 'true' : 'false');
    els.names.textContent = on ? 'Names: on' : 'Names: off';
  }

  function open(key, opener) {
    var d = DATA[key];
    if (!d) return;
    if (!root) build();
    state.key = key; state.active = -1; state.opener = opener || null;
    els.title.textContent = d.title;

    var pins = '', items = '';
    d.labels.forEach(function (l, i) {
      pins += '<button type="button" class="av-pin" data-i="' + i + '" data-side="' + l[3] + '" style="left:' + (l[1] * 100) + '%;top:' + (l[2] * 100) + '%" aria-label="' + esc(l[0]) + '">' +
        '<span class="av-num">' + (i + 1) + '</span><span class="av-tag">' + esc(l[0]) + '</span></button>';
      items += '<li><button type="button" data-i="' + i + '"><span class="av-n">' + (i + 1) + '</span><span>' + esc(l[0]) + '</span></button></li>';
    });
    els.stage.innerHTML = '<img src="images/anatomy/' + esc(key) + '.jpg" alt="' + esc(d.title) + '" draggable="false">' + pins;
    els.list.innerHTML = items;
    els.info.innerHTML = '<p class="av-hint">Tap a numbered pin or a name in the list to see what that part does.</p>';
    els.body.scrollTop = 0;
    setNames(window.innerWidth >= 900);

    root.hidden = false;
    document.documentElement.classList.add('av-lock');
    els.close.focus();
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove('av-lock');
    if (state.opener && state.opener.focus) state.opener.focus();
  }

  function select(i, fromList) {
    var d = DATA[state.key];
    if (!d) return;
    state.active = i;
    [].forEach.call(els.stage.querySelectorAll('.av-pin'), function (p) {
      p.classList.toggle('on', +p.getAttribute('data-i') === i);
    });
    [].forEach.call(els.list.querySelectorAll('button'), function (b) {
      var on = +b.getAttribute('data-i') === i;
      b.classList.toggle('on', on);
      if (on && !fromList && window.innerWidth >= 900) {            /* wide layout: keep the list item in view */
        var L = els.list, top = b.parentNode.offsetTop, bottom = top + b.offsetHeight;
        if (top < L.scrollTop) L.scrollTop = top; else if (bottom > L.scrollTop + L.clientHeight) L.scrollTop = bottom - L.clientHeight;
      }
    });
    if (i < 0) {
      els.info.innerHTML = '<p class="av-hint">Tap a numbered pin or a name in the list to see what that part does.</p>';
      return;
    }
    var l = d.labels[i];
    els.info.innerHTML = '<div class="av-card"><span class="av-n">' + (i + 1) + '</span><div><strong>' + esc(l[0]) + '</strong><p>' + esc(l[4]) + '</p></div></div>';
    if (fromList) {
      var pin = els.stage.querySelector('.av-pin[data-i="' + i + '"]');
      if (pin && pin.scrollIntoView) pin.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function onKey(e) {
    if (!root || root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.av-btn')) return;
      e.preventDefault(); var n = DATA[state.key].labels.length; select((state.active + 1) % n, false);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); var m = DATA[state.key].labels.length; select((state.active - 1 + m) % m, false);
    } else if (e.key === 'Tab') {
      var f = root.querySelectorAll('button'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-photo]') : null;
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute('data-photo'), t);
  });

  window.S21AnatViewer = { open: open, close: close };
})();
