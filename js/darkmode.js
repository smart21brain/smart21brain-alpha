/* Smart21Brain — Dark Mode Toggle
   Applies a saved theme preference (or the visitor's system preference)
   on load, then lets them flip it with any [data-theme-toggle] button —
   there's one in the desktop nav and one in the mobile offcanvas menu
   on every page, and this keeps them all in sync. */
(function () {
  var STORAGE_KEY = 's21-theme';
  var RESET_KEY = 's21-theme-reset-v2';

  // One-time force-reset: any browser carrying an old saved preference
  // (dark or light) from before this update — including leftovers from
  // the color-theme picker that was removed — gets wiped exactly once so
  // dark mode is what everyone actually sees by default again. After
  // this runs once per browser, a visitor's own toggle choice is sticky
  // as normal; this doesn't run again.
  try {
    if (!localStorage.getItem(RESET_KEY)) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('s21-color-theme');
      localStorage.removeItem('s21-glass');
      localStorage.setItem(RESET_KEY, '1');
    }
  } catch (e) { /* ignore */ }

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* ignore */ }
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var isDark = theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-moon', !isDark);
        icon.classList.toggle('fa-sun', isDark);
      }
      var label = btn.querySelector('[data-theme-toggle-label]');
      if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      btn.setAttribute('aria-pressed', String(isDark));
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  function setTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* ignore */ }
    applyTheme(theme);
  }

  // Apply immediately (before DOMContentLoaded) to avoid a flash of the wrong theme.
  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getPreferredTheme());
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
})();
