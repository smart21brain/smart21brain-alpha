/* Smart21Brain School System — "Download the app" (installable web app).
 *
 * One small script, used on index.html, school.html, school-login.html and
 * school-app.html. It:
 *   1. links the School System manifest + registers its service worker,
 *   2. turns every  [data-school-install]  element into a working
 *      "Download the app" button (native install prompt where the browser
 *      supports it, clear step-by-step help where it doesn't),
 *   3. shows a one-time popup offering the download when the System is opened
 *      (every visit, only on pages with  data-school-install-popup  on <html>; never inside the installed app).
 *
 * Nothing here touches the rest of the site or the school app's own code.
 */
(function () {
  'use strict';
  if (window.S21SchoolInstall) return;

  var SNOOZE_KEY = 's21-school-install-snooze';   // "not now" -> ask again in 7 days
  var DONE_KEY = 's21-school-installed';          // installed on this browser
  var SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
  var APP_URL = 'school-app.html';

  var deferred = null;

  function store(fn) { try { return fn(); } catch (e) { return null; } }
  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edg|android/i.test(ua);
  var isFirefox = /firefox|fxios/i.test(ua);

  /* ---------- manifest + service worker ---------- */
  if (!document.querySelector('link[rel="manifest"]')) {
    var l = document.createElement('link');
    l.rel = 'manifest'; l.href = '/school-manifest.json';
    document.head.appendChild(l);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"][data-school]')) {
    var a = document.createElement('link');
    a.rel = 'apple-touch-icon'; a.href = '/icons/school-apple-touch.png'; a.setAttribute('data-school', '1');
    document.head.appendChild(a);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/school-sw.js', { scope: '/school-' }).catch(function () {});
    });
  }

  /* ---------- install events ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    refreshButtons();
  });
  window.addEventListener('appinstalled', function () {
    deferred = null;
    store(function () { localStorage.setItem(DONE_KEY, '1'); });
    closeSheet();
    refreshButtons();
    toast('School System installed — find it on your home screen or app list.');
  });

  function alreadyInstalled() {
    return isStandalone || store(function () { return localStorage.getItem(DONE_KEY) === '1'; });
  }

  /* ---------- styles ---------- */
  var css = '' +
    '.s21i-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(6,14,10,.55);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .25s ease;font-family:Inter,"Segoe UI",system-ui,-apple-system,sans-serif}' +
    '.s21i-overlay.open{opacity:1;pointer-events:auto}' +
    '.s21i-card{width:100%;max-width:440px;margin:0 0 0 0;background:#fff;color:#14231C;border-radius:22px 22px 0 0;padding:1.5rem 1.4rem calc(1.4rem + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 60px rgba(0,0,0,.3);transform:translateY(30px);transition:transform .3s cubic-bezier(.22,1,.36,1);position:relative}' +
    '.s21i-overlay.open .s21i-card{transform:none}' +
    '@media(min-width:560px){.s21i-overlay{align-items:center}.s21i-card{border-radius:22px;padding-bottom:1.5rem}}' +
    'html[data-theme="dark"] .s21i-card,html.dark .s21i-card{background:#15211B;color:#EAF3EE}' +
    '.s21i-head{display:flex;gap:.9rem;align-items:center;margin-bottom:.9rem}' +
    '.s21i-head img{width:58px;height:58px;border-radius:14px;box-shadow:0 6px 16px rgba(11,110,79,.35);flex:none}' +
    '.s21i-head h3{margin:0;font-size:1.15rem;font-weight:700;line-height:1.25}' +
    '.s21i-head p{margin:.15rem 0 0;font-size:.82rem;opacity:.7}' +
    '.s21i-list{list-style:none;margin:.2rem 0 1.1rem;padding:0;display:grid;gap:.45rem;font-size:.9rem}' +
    '.s21i-list li:before{content:"\\2713";color:#0B6E4F;font-weight:800;margin-right:.55rem}' +
    'html[data-theme="dark"] .s21i-list li:before{color:#2FD49A}' +
    '.s21i-steps{margin:.2rem 0 1.1rem;padding-left:1.2rem;font-size:.92rem;line-height:1.55}' +
    '.s21i-steps li{margin-bottom:.35rem}' +
    '.s21i-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.85rem 1rem;border:0;border-radius:12px;font:600 .98rem/1 Inter,system-ui,sans-serif;cursor:pointer;background:#0B6E4F;color:#fff;text-decoration:none;box-shadow:0 8px 20px rgba(11,110,79,.35);transition:transform .15s ease,background .15s ease}' +
    '.s21i-btn:hover{background:#095c42}.s21i-btn:active{transform:scale(.98)}' +
    '.s21i-link{display:block;width:100%;margin-top:.55rem;padding:.6rem;border:0;background:none;color:inherit;opacity:.65;font:500 .88rem Inter,system-ui,sans-serif;cursor:pointer}' +
    '.s21i-link:hover{opacity:1}' +
    '.s21i-x{position:absolute;top:.7rem;right:.8rem;width:34px;height:34px;border:0;border-radius:50%;background:rgba(127,127,127,.14);color:inherit;font-size:1.1rem;cursor:pointer;line-height:1}' +
    '.s21i-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);z-index:2147483001;background:#0B6E4F;color:#fff;padding:.8rem 1.2rem;border-radius:12px;font:500 .9rem Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3);opacity:0;transition:all .3s ease;max-width:92vw;text-align:center}' +
    '.s21i-toast.show{opacity:1;transform:translate(-50%,0)}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- UI helpers ---------- */
  var overlay = null;

  function root() { return document.documentElement; } // survives the school app rewriting <body>

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 's21i-toast'; t.textContent = msg;
    root().appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  }

  function closeSheet() {
    if (overlay) { overlay.classList.remove('open'); var o = overlay; overlay = null; setTimeout(function () { o.remove(); }, 300); }
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function openSheet(opts) {
    closeSheet();
    var el = document.createElement('div');
    el.className = 's21i-overlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Download the School System app');
    el.innerHTML =
      '<div class="s21i-card">' +
      '<button class="s21i-x" type="button" aria-label="Close">&times;</button>' +
      '<div class="s21i-head"><img src="/icons/school-192.png" alt="" width="58" height="58"><div><h3>' + esc(opts.title) + '</h3><p>' + esc(opts.sub) + '</p></div></div>' +
      opts.body +
      '<div class="s21i-actions"></div></div>';
    var actions = el.querySelector('.s21i-actions');
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement(a.href ? 'a' : 'button');
      b.className = a.primary ? 's21i-btn' : 's21i-link';
      b.innerHTML = a.label;
      if (a.href) b.href = a.href; else b.type = 'button';
      b.addEventListener('click', function () { if (a.onClick) a.onClick(); if (!a.keepOpen) closeSheet(); });
      actions.appendChild(b);
    });
    el.querySelector('.s21i-x').addEventListener('click', function () { if (opts.onDismiss) opts.onDismiss(); closeSheet(); });
    el.addEventListener('click', function (e) { if (e.target === el) { if (opts.onDismiss) opts.onDismiss(); closeSheet(); } });
    root().appendChild(el);
    overlay = el;
    requestAnimationFrame(function () { el.classList.add('open'); });
  }

  var FEATURES = '<ul class="s21i-list"><li>Opens like a real app — its own icon and full screen</li><li>Faster to reach: one tap from your home screen or desktop</li><li>Works on phones, tablets, Windows, Mac and Chromebooks</li></ul>';

  function manualSteps() {
    var steps, note = '';
    if (isIOS) {
      steps = '<li>Tap the <b>Share</b> button <span aria-hidden="true">(the square with the arrow)</span> in Safari.</li><li>Scroll and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The School System icon appears on your home screen.</li>';
      if (!isSafari) note = '<p style="font-size:.82rem;opacity:.7;margin:-.4rem 0 1rem">On iPhone/iPad, installing only works from <b>Safari</b>. Open this page in Safari first.</p>';
    } else if (isAndroid) {
      steps = '<li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>&#8942; menu</b> (top right).</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</li>';
    } else if (isFirefox) {
      steps = '<li>Firefox on computers can\'t install web apps.</li><li>Open this page in <b>Chrome</b> or <b>Edge</b>, then use the install icon in the address bar.</li>';
    } else {
      steps = '<li>Look for the <b>install icon</b> <span aria-hidden="true">(a small monitor with a down-arrow)</span> at the right end of the address bar.</li><li>Or open the browser <b>&#8942; menu</b> and choose <b>Install School System</b>.</li><li>Click <b>Install</b>.</li>';
    }
    return '<ol class="s21i-steps">' + steps + '</ol>' + note;
  }

  /* ---------- the action ---------- */
  function install(fromPopup) {
    if (alreadyInstalled() && isStandalone) { location.href = APP_URL; return; }
    if (deferred) {
      var d = deferred; deferred = null;
      closeSheet();
      d.prompt();
      d.userChoice.then(function (c) {
        if (c && c.outcome === 'accepted') store(function () { localStorage.setItem(DONE_KEY, '1'); });
        refreshButtons();
      }).catch(function () {});
      return;
    }
    // No native prompt available (iOS, Firefox, already-installed, or not yet eligible): guide the person.
    openSheet({
      title: 'Install the School System',
      sub: 'Add it to your device in a few taps',
      body: manualSteps(),
      actions: [
        { label: '<i class="fa-solid fa-arrow-up-right-from-square"></i> Open School System', href: APP_URL, primary: true, keepOpen: true },
        { label: 'Close' }
      ]
    });
  }

  function snooze() { /* "Not now" only closes it for this page view; it returns next visit. */ }

  // The popup shows on EVERY visit to the school pages and after every login.
  // The only time it stays away is inside the installed app itself.
  function shouldPopup() { return !isStandalone; }

  function showPopup() {
    if (!shouldPopup() || overlay) return;
    openSheet({
      title: 'Get the School System app',
      sub: 'Free · installs in seconds · no app store',
      body: FEATURES,
      onDismiss: snooze,
      actions: [
        { label: '<i class="fa-solid fa-download"></i> Download the app', primary: true, keepOpen: true, onClick: function () { install(true); } },
        { label: 'Not now', onClick: snooze }
      ]
    });
  }

  /* ---------- buttons ---------- */
  function refreshButtons() {
    var installed = isStandalone;
    document.querySelectorAll('[data-school-install]').forEach(function (b) {
      if (installed) { b.style.display = 'none'; return; }
      b.removeAttribute('hidden');
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-school-install]');
    if (!b) return;
    e.preventDefault();
    install(false);
  });

  window.S21SchoolInstall = { install: install, showPopup: showPopup, canPrompt: function () { return !!deferred; } };

  /* ---------- auto popup ---------- */
  function boot() {
    refreshButtons();
    if (document.documentElement.hasAttribute('data-school-install-popup')) {
      // wait a moment so the page (or the app, which draws itself) has settled
      setTimeout(showPopup, 1800);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
