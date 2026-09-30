(function (global) {
  'use strict';

  // NOTE: guest browsing is an intentional, supported part of the product —
  // visitors can explore Smart21Brain without an account. This guard's job
  // is narrower: on the login page specifically, it stops fake "Continue as
  // Student / Teacher / Parent" role shortcuts from creating a session
  // without real credentials. It no longer disables guest-access controls.

  const ROLE_NAMES = new Set(['student', 'teacher', 'parent', 'admin']);

  function textOf(el) {
    return String(
      el?.textContent || el?.value || el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || ''
    ).replace(/\s+/g, ' ').trim();
  }

  function isLoginPage() {
    return !!global.document?.getElementById?.('login-form') || /(?:^|\/)login(?:\.html)?$/i.test(global.location?.pathname || '');
  }

  function roleFromElement(el) {
    if (!el) return '';
    const dataRole = String(
      el.getAttribute?.('data-role') || el.getAttribute?.('data-account-type') || el.getAttribute?.('data-login-as') || ''
    ).trim().toLowerCase();
    if (ROLE_NAMES.has(dataRole)) return dataRole;

    const text = textOf(el).toLowerCase();
    if (ROLE_NAMES.has(text)) return text;
    const match = text.match(/^(?:continue\s+as\s+(?:a\s+)?)?(student|teacher|parent|admin)$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function isLoginRoleShortcut(el) {
    if (!el || !isLoginPage()) return false;
    const tag = String(el.tagName || '').toUpperCase();
    if (!['A', 'BUTTON', 'INPUT'].includes(tag)) return false;
    return !!roleFromElement(el);
  }

  function block(el, message) {
    if (!el || el.dataset.s21AuthBlocked === '1') return;
    el.dataset.s21AuthBlocked = '1';
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('tabindex', '-1');
    if ('disabled' in el) el.disabled = true;
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.5';
    el.title = message;
  }

  function scan() {
    if (!global.document?.querySelectorAll || !isLoginPage()) return;
    global.document.querySelectorAll('a, button, input[type="button"], input[type="submit"]').forEach((el) => {
      if (isLoginRoleShortcut(el)) {
        block(el, 'Login required. Enter your email and password first.');
      }
    });
  }

  function installHardBlock() {
    if (!global.document) return;

    // Capture the click BEFORE any inline onclick, delegated handler, or
    // navigation handler can use the role button to create/bypass a session.
    global.document.addEventListener('click', (event) => {
      if (!isLoginPage()) return;
      const target = event.target?.closest?.('a, button, input[type="button"], input[type="submit"]');
      if (!target) return;

      const role = roleFromElement(target);
      if (role) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        global.window?.S21_toast?.('Please enter your email and password and click Log In. The ' + role + ' shortcut cannot bypass authentication.');
      }
    }, true);

    scan();
    if (global.MutationObserver && global.document.body) {
      new MutationObserver(scan).observe(global.document.body, { childList: true, subtree: true });
    }
  }

  const api = {
    isLoginRoleShortcut,
    shouldAllowGuestFlow: () => true,
    blockGuestBypass: scan,
  };

  global.S21AuthGuard = api;

  if (global.document?.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', installHardBlock, { once: true });
  } else {
    installHardBlock();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
