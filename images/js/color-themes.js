/* Smart21Brain — Color Themes
   Adds a floating "Themes" button to every page that loads this script.
   Lets visitors pick a color theme (in addition to light/dark mode, which
   darkmode.js already handles) and remembers the choice in localStorage.
   Every theme is just a set of CSS custom-property overrides keyed by
   [data-color-theme="…"] in css/style.css — this file only manages the
   attribute + the picker UI, not the colors themselves. */
(function () {
  var STORAGE_KEY = 's21-color-theme';
  var GLASS_KEY = 's21-glass';
  var DEFAULT_THEME = 'nebula';

  var THEMES = [
    { id: 'forest',   label: 'Forest',   swatch: '#0B6E4F' },
    { id: 'ocean',    label: 'Ocean',    swatch: '#0369A1' },
    { id: 'sunset',   label: 'Sunset',   swatch: '#EA580C' },
    { id: 'berry',    label: 'Berry',    swatch: '#A21CAF' },
    { id: 'grape',    label: 'Grape',    swatch: '#6D28D9' },
    { id: 'mint',     label: 'Mint',     swatch: '#0D9488' },
    { id: 'sunshine', label: 'Sunshine', swatch: '#CA8A04' },
    { id: 'candy',    label: 'Candy',    swatch: '#DB2777' },
    { id: 'nebula',   label: 'Nebula',   swatch: 'linear-gradient(135deg,#8B5CF6,#22D3EE,#F472B6)' },
  ];

  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES.some(function (t) { return t.id === saved; })) return saved;
    } catch (e) { /* ignore */ }
    return DEFAULT_THEME;
  }

  function applyTheme(id) {
    document.documentElement.setAttribute('data-color-theme', id);
  }

  function getGlass() {
    try {
      var saved = localStorage.getItem(GLASS_KEY);
      if (saved === '0' || saved === '1') return saved === '1';
    } catch (e) { /* ignore */ }
    return true; // glassmorphism on by default
  }

  function applyGlass(on) {
    document.documentElement.setAttribute('data-glass', on ? '1' : '0');
  }

  function setGlass(on) {
    try { localStorage.setItem(GLASS_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
    applyGlass(on);
  }

  function saveTheme(id) {
    try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
    applyTheme(id);
    // Nebula is a dark-glass dashboard theme — it only reads correctly in
    // dark mode, so switch mode along with it (still a normal, undo-able
    // preference — picking any other theme doesn't force a mode change).
    if (id === 'nebula') setMode('dark');
  }

  // Apply immediately, before the panel exists, to avoid a flash of the
  // default theme on pages that have a saved preference.
  applyTheme(getSavedTheme());
  applyGlass(getGlass());

  function getMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setMode(mode) {
    try { localStorage.setItem('s21-theme', mode); } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('data-theme', mode);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      var icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-moon', mode !== 'dark');
        icon.classList.toggle('fa-sun', mode === 'dark');
      }
      btn.setAttribute('aria-pressed', String(mode === 'dark'));
    });
  }

  function buildPanel() {
    var current = getSavedTheme();

    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 's21-theme-fab';
    fab.setAttribute('aria-label', 'Choose a theme');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = '<i class="fa-solid fa-palette" aria-hidden="true"></i>';

    var panel = document.createElement('div');
    panel.className = 's21-theme-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Theme picker');

    var swatchesHtml = THEMES.map(function (t) {
      var isActive = t.id === current;
      return (
        '<button type="button" class="s21-theme-swatch' + (isActive ? ' active' : '') + '" data-theme-id="' + t.id + '" aria-pressed="' + isActive + '">' +
          '<span class="s21-theme-swatch-dot" style="background:' + t.swatch + '"></span>' +
          '<span>' + t.label + '</span>' +
        '</button>'
      );
    }).join('');

    panel.innerHTML =
      '<div class="s21-theme-panel-head">' +
        '<strong><i class="fa-solid fa-palette" aria-hidden="true" style="color:var(--s21-primary);margin-right:.35rem"></i>Themes</strong>' +
        '<button type="button" class="s21-theme-panel-close" aria-label="Close theme picker"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<div class="s21-theme-mode-row" role="radiogroup" aria-label="Light or dark mode">' +
        '<button type="button" class="s21-theme-mode-btn" data-mode="light"><i class="fa-solid fa-sun"></i> Light</button>' +
        '<button type="button" class="s21-theme-mode-btn" data-mode="dark"><i class="fa-solid fa-moon"></i> Dark</button>' +
      '</div>' +
      '<label class="s21-theme-glass-row">' +
        '<span><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Glassmorphism</span>' +
        '<span class="s21-theme-switch"><input type="checkbox" id="s21-glass-toggle"><span class="s21-theme-switch-track"></span></span>' +
      '</label>' +
      '<div class="s21-theme-grid">' + swatchesHtml + '</div>';

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    function syncModeButtons() {
      var mode = getMode();
      panel.querySelectorAll('.s21-theme-mode-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    }
    syncModeButtons();

    function openPanel() {
      panel.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');
    }
    function closePanel() {
      panel.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
    }

    fab.addEventListener('click', function () {
      panel.classList.contains('open') ? closePanel() : openPanel();
    });
    panel.querySelector('.s21-theme-panel-close').addEventListener('click', closePanel);

    document.addEventListener('click', function (e) {
      if (!panel.classList.contains('open')) return;
      if (panel.contains(e.target) || fab.contains(e.target)) return;
      closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    panel.querySelectorAll('.s21-theme-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
        syncModeButtons();
      });
    });

    var glassToggle = panel.querySelector('#s21-glass-toggle');
    glassToggle.checked = getGlass();
    glassToggle.addEventListener('change', function () {
      setGlass(glassToggle.checked);
    });

    panel.querySelectorAll('.s21-theme-swatch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.dataset.themeId;
        saveTheme(id);
        syncModeButtons();
        panel.querySelectorAll('.s21-theme-swatch').forEach(function (s) {
          var active = s === btn;
          s.classList.toggle('active', active);
          s.setAttribute('aria-pressed', String(active));
        });
        if (window.S21_toast) {
          var label = THEMES.find(function (t) { return t.id === id; }).label;
          window.S21_toast(label + ' theme applied.');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
  } else {
    buildPanel();
  }
})();
