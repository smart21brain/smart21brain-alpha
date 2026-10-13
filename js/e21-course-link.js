/* Links the "Electronics for Beginners" course to Electron21 (the hands-on lab).
   - course.html : shows the "Practice in Electron21" card for this course only.
   - lesson.html : adds a "Try it in Electron21" box under lessons that have a matching lab. */
(function () {
  'use strict';
  var SLUG = 'electronics-for-beginners';
  var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
  var q = new URLSearchParams(location.search);

  if (page === 'course' && q.get('slug') === SLUG) {
    var card = document.getElementById('e21-course-link');
    if (card) card.style.display = '';
    return;
  }
  if (page !== 'lesson') return;

  var id = q.get('id') || '';
  if (id.indexOf(SLUG + '::') !== 0) return;
  var n = parseInt(id.split('::')[1], 10);
  /* lesson number -> [lab hash, what to do there] */
  var MAP = {
    5:  ['#lab=circuit', 'Circuit Lab', "Type any two of voltage, current and resistance and watch Ohm's law solve the rest."],
    6:  ['#lab=color', 'Colour Code lab', 'Set the coloured bands and read the resistor value, or the other way round.'],
    7:  ['#lab=circuit', 'Circuit Lab', 'Use the series / parallel calculator to check your answers.'],
    8:  ['#lab=circuit', 'Circuit Lab', 'Use the series / parallel calculator to check your answers.'],
    9:  ['#lab=circuit', 'Circuit Lab', 'Work out power with the Ohm\'s law calculator.'],
    10: ['#lab=circuit', 'Circuit Lab', 'Try the RC circuit tab and see how a capacitor charges over time.'],
    11: ['#lab=circuit', 'Circuit Lab', 'The LED resistor tab picks the right resistor for you.'],
    19: ['#lab=numbers', 'Number Lab', 'Convert between decimal, binary and hex, and see how bits add up.'],
    20: ['#lab=logic', 'Logic Lab', 'Flip the switches on every gate and fill in the truth tables yourself.'],
    22: ['#lab=cpu', 'CPU Emulator', 'Write assembly and watch an 8-bit processor run it, one instruction at a time.'],
    23: ['#projects', 'Electron21 projects', 'Thirty step-by-step builds with parts lists, steps and safety notes.']
  };
  var m = MAP[n];
  if (!m) return;

  function build() {
    var host = document.getElementById('lesson-body-text');
    if (!host || document.getElementById('e21-lesson-link')) return !!document.getElementById('e21-lesson-link');
    var a = document.createElement('aside');
    a.id = 'e21-lesson-link';
    a.setAttribute('aria-label', 'Try this in Electron21');
    a.style.cssText = 'display:flex;gap:1rem;align-items:center;flex-wrap:wrap;margin:1.5rem 0;padding:1rem 1.2rem;border-radius:var(--radius-md,18px);border:1px solid var(--s21-border,#dde);border-left:5px solid var(--s21-primary,#0B6E4F);background:var(--s21-primary-light,#E8F3EE)';
    var img = document.createElement('img');
    img.src = 'images/logo/electron21-icon.svg'; img.alt = ''; img.width = 44; img.height = 44; img.style.cssText = 'border-radius:12px;flex:none';
    var txt = document.createElement('div');
    txt.style.cssText = 'flex:1 1 220px;min-width:0';
    var h = document.createElement('strong'); h.textContent = 'Try it in Electron21: ' + m[1]; h.style.display = 'block';
    var p = document.createElement('span'); p.textContent = m[2]; p.style.cssText = 'font-size:.9rem;opacity:.85';
    txt.appendChild(h); txt.appendChild(p);
    var btn = document.createElement('a');
    btn.href = (m[0].indexOf('#lab=') === 0 ? 'electron21-workbench.html' : 'electron21.html') + m[0]; btn.className = 'btn-s21 btn-s21-primary';
    btn.style.cssText = 'padding:.5rem 1.1rem;font-size:.85rem;white-space:nowrap';
    btn.textContent = 'Open the lab';
    a.appendChild(img); a.appendChild(txt); a.appendChild(btn);
    host.parentNode.insertBefore(a, host.nextSibling);
    return true;
  }
  function start() {
    if (build()) return;
    var target = document.getElementById('lesson-content') || document.body;
    var mo = new MutationObserver(function () {
      var lc = document.getElementById('lesson-content');
      if (lc && lc.style.display === 'none') return;
      if (build()) mo.disconnect();
    });
    mo.observe(target, { attributes: true, childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 20000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
