/* smart21brain — Cookie notice.
   This site only uses cookies that are strictly necessary (to keep you
   signed in) — there is no third-party analytics or ad tracking here.
   Shown once, on whichever page a visitor lands on first (including
   splash.html), then remembered in localStorage. */
(function () {
  'use strict';
  var STORAGE_KEY = 's21-cookie-notice-ack';

  function alreadyAcknowledged() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
    var el = document.getElementById('s21CookieNotice');
    if (!el) return;
    el.classList.remove('s21-cookie-notice-show');
    setTimeout(function () { el.remove(); }, 300);
  }

  function show() {
    if (document.getElementById('s21CookieNotice')) return;
    var el = document.createElement('div');
    el.id = 's21CookieNotice';
    el.className = 's21-cookie-notice';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie notice');
    el.innerHTML =
      '<div class="s21-cookie-notice-inner">' +
        '<i class="fa-solid fa-cookie-bite s21-cookie-notice-icon" aria-hidden="true"></i>' +
        '<p class="s21-cookie-notice-text">We use only the cookies needed to keep you signed in and remember your preferences — no third-party tracking or ad cookies. ' +
          '<a href="contact.html">Questions? Contact us</a>.</p>' +
        '<button type="button" class="btn-s21 btn-s21-primary s21-cookie-notice-btn" id="s21CookieNoticeOk">Got it</button>' +
      '</div>';
    document.body.appendChild(el);
    // Force layout, then add the show class so the slide-up transition runs.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('s21-cookie-notice-show'); });
    });
    document.getElementById('s21CookieNoticeOk').addEventListener('click', acknowledge);
  }

  if (alreadyAcknowledged()) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else {
    show();
  }
})();
