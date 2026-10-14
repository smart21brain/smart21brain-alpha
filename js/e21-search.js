/* Electron21: hero search. One box that finds labs, projects, cheat sheets and topics.
   - Labs open on the workbench page (electron21-workbench.html#lab=...).
   - Projects open their step-by-step window on this page.
   - Cheat sheets and topics scroll to the section and open it. */
(function () {
  'use strict';
  var input = document.getElementById('e21-q'), list = document.getElementById('e21-results');
  if (!input || !list) return;
  var E = window.E21 || {};
  var box = document.getElementById('e21-search');
  var WB = 'electron21-workbench.html', COURSE = 'course.html?slug=electronics-for-beginners';
  var DOMAIN = { electronics: 'Electronics', computer: 'Computer Eng.', data: 'Data Science', engineering: 'Engineering' };
  var TYPES = { Lab: { c: 'var(--e-lime)', bonus: 3 }, Project: { c: 'var(--e-cyan)', bonus: 0 }, 'Cheat sheet': { c: 'var(--e-amber)', bonus: 1.5 }, Topic: { c: 'var(--e-violet)', bonus: 1 } };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/['’`]/g, '').replace(/[²]/g, '2').replace(/\s+/g, ' ').trim(); }
  function scrollToId(id, after) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (after) setTimeout(after, 350); }

  /* ---------- build the index ---------- */
  var items = [];
  function add(type, title, desc, kw, icon, go) { items.push({ type: type, title: title, desc: desc, icon: icon, go: go, t: norm(title), k: norm(kw || ''), d: norm(desc || '') }); }

  [['logic', 'Logic Lab', 'AND, OR, NOT gates, truth tables and a 4-bit adder.', 'fa-diagram-project', 'logic gates and or not nand nor xor xnor boolean truth table adder half full carry switches led'],
   ['circuit', 'Circuit Lab', "Ohm's law, series and parallel, dividers, LED resistor and RC calculators.", 'fa-bolt', 'ohm ohms law voltage current resistance power watts series parallel divider led resistor rc capacitor time constant calculator'],
   ['scope', 'Signal Scope', 'An oscilloscope with sine, square and triangle waves and filters.', 'fa-wave-square', 'oscilloscope scope waveform wave sine square triangle frequency amplitude filter signal low pass high pass'],
   ['cpu', 'CPU Emulator', 'A real 8-bit computer: assembly, machine code, memory and a stack.', 'fa-microchip', 'cpu processor emulator assembly assembler machine code registers memory stack fetch decode execute 8-bit computer architecture program'],
   ['numbers', 'Number Lab', 'Convert decimal, binary, hex and octal and see the bits.', 'fa-hashtag', 'number numbers binary decimal hex hexadecimal octal base convert bits bytes twos complement ascii'],
   ['data', 'Data Lab', 'Load a CSV, get statistics, charts and a line of best fit.', 'fa-chart-line', 'data csv statistics mean median mode regression correlation chart histogram scatter spreadsheet science'],
   ['color', 'Colour Code', 'Decode resistor colour bands to ohms, or the other way round.', 'fa-palette', 'colour color code resistor bands ohms tolerance decoder']
  ].forEach(function (l) { add('Lab', l[1], l[2], l[4], l[3], function () { location.href = WB + '#lab=' + l[0]; }); });

  if (E.projects) E.projects.forEach(function (p, i) {
    add('Project', p.t, p.b, [DOMAIN[p.d], p.lvl, p.labName, p.learn.join(' '), p.parts.join(' ')].join(' '), p.ic, function () {
      scrollToId('projects', function () { if (E.openProject) E.openProject(i); });
    });
  });

  var SHEETS = {
    "Ohm's law & power": 'Formulas for voltage, current, resistance and power.',
    'Boolean algebra & gates': 'Truth tables and the rules of digital logic.',
    'Common components': 'Resistors, capacitors, diodes, transistors and what they do.',
    'UART, I²C and SPI': 'How chips talk to each other: the three common serial buses.',
    'Number systems': 'Binary, decimal and hex, and how to convert between them.',
    'Data science workflow': 'From question to data, chart and conclusion.',
    'Engineering design process': 'Define, design, build, test and improve.',
    'Lab safety rules': 'Staying safe with electricity, tools and heat.'
  };
  Array.prototype.forEach.call(document.querySelectorAll('.e21-ref details'), function (d) {
    var s = d.querySelector('summary'), ic = s && s.querySelector('i'), t = s ? s.textContent.trim() : '';
    if (!t) return;
    add('Cheat sheet', t, (SHEETS[t] || 'Quick reference sheet.'), d.textContent, ic ? (ic.className.match(/fa-[a-z0-9-]+/g) || ['fa-book-open']).filter(function (c) { return c !== 'fa-solid'; })[0] : 'fa-book-open', function () {
      d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (s) s.focus({ preventScroll: true });
    });
  });

  [['Meet the electron', 'Charge, mass, discovery and key facts about the electron.', 'electron charge mass discovered thomson 1897 particle proton neutron atom spin facts', 'fa-atom', 'electron'],
   ['Electron drift speed', 'See electrons drift in a copper wire and calculate how fast.', 'drift velocity speed current copper wire electrons per second ampere conventional current free electrons', 'fa-circle-nodes', 'electron'],
   ['History of electronics', 'From the 1897 discovery to the transistor and the microprocessor.', 'timeline history transistor vacuum tube integrated circuit microprocessor 1947 1958 1971 thomson fleming kilby', 'fa-clock-rotate-left', 'electron']
  ].forEach(function (t) { add('Topic', t[0], t[1], t[2], t[3], function () { scrollToId(t[4]); }); });
  add('Topic', 'Electronics for Beginners course', '5 modules and 24 lessons that go with these labs.', 'course lessons learn beginners theory tutorial electronics module', 'fa-graduation-cap', function () { location.href = COURSE; });
  add('Topic', 'Workbench page', 'All seven labs on their own page.', 'workbench labs page open all', 'fa-flask', function () { location.href = WB; });

  /* ---------- search ---------- */
  function search(q) {
    var toks = norm(q).split(/[^a-z0-9+#.\-]+/).filter(Boolean);
    if (!toks.length) return [];
    var out = [];
    items.forEach(function (it, idx) {
      var score = 0, ok = toks.every(function (tk) {
        var s = 0;
        if (it.t.split(' ').some(function (w) { return w.indexOf(tk) === 0; })) s += 6;
        else if (it.t.indexOf(tk) > -1) s += 4;
        if (it.k.indexOf(tk) > -1) s += 2;
        if (it.d.indexOf(tk) > -1) s += 1;
        score += s; return s > 0;
      });
      if (ok) out.push({ it: it, s: score + TYPES[it.type].bonus - idx * 0.001 });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out.slice(0, 8).map(function (x) { return x.it; });
  }

  var shown = [], active = -1;
  function setOpen(v) { list.hidden = !v; input.setAttribute('aria-expanded', v ? 'true' : 'false'); box.classList.toggle('open', v); if (!v) { active = -1; input.removeAttribute('aria-activedescendant'); } }
  function setActive(n) {
    active = n;
    Array.prototype.forEach.call(list.children, function (li, i) { li.setAttribute('aria-selected', i === n ? 'true' : 'false'); });
    if (n >= 0 && list.children[n]) { input.setAttribute('aria-activedescendant', list.children[n].id); list.children[n].scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
  }
  function render() {
    var q = input.value.trim();
    box.classList.toggle('has-text', !!q);
    if (!q) { setOpen(false); return; }
    shown = search(q);
    if (!shown.length) {
      list.innerHTML = '<li class="none" role="presentation"><i class="fa-regular fa-face-frown-open" aria-hidden="true"></i>No match for “' + esc(q) + '”. Try <b>ohm</b>, <b>binary</b>, <b>logic</b>, <b>CPU</b> or <b>sensor</b>.</li>';
    } else {
      list.innerHTML = shown.map(function (it, i) {
        return '<li role="option" id="e21-r-' + i + '" aria-selected="false" data-i="' + i + '" style="--c:' + TYPES[it.type].c + '"><span class="ic"><i class="fa-solid ' + it.icon + '" aria-hidden="true"></i></span>' +
          '<span class="tx"><b>' + esc(it.title) + '</b><small>' + esc(it.desc) + '</small></span><span class="ty">' + it.type + '</span></li>';
      }).join('');
    }
    setOpen(true); setActive(shown.length ? 0 : -1);
  }
  function choose(i) { var it = shown[i]; if (!it) return; setOpen(false); input.blur(); it.go(); }

  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) render(); else setActive(Math.min(shown.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && shown.length) choose(active < 0 ? 0 : active); }
    else if (e.key === 'Escape') { if (!list.hidden) { setOpen(false); } else { input.value = ''; box.classList.remove('has-text'); input.blur(); } }
  });
  list.addEventListener('mousedown', function (e) { e.preventDefault(); });          // keep focus so the click lands
  list.addEventListener('click', function (e) { var li = e.target.closest('li[data-i]'); if (li) choose(+li.dataset.i); });
  list.addEventListener('mousemove', function (e) { var li = e.target.closest('li[data-i]'); if (li && +li.dataset.i !== active) setActive(+li.dataset.i); });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) setOpen(false); });
  var clear = document.getElementById('e21-q-clear');
  if (clear) clear.addEventListener('click', function () { input.value = ''; render(); input.focus(); });
  Array.prototype.forEach.call(document.querySelectorAll('.e21-search-hints button'), function (b) { b.addEventListener('click', function () { input.value = b.dataset.q || b.textContent; input.focus(); render(); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !(document.activeElement && document.activeElement.isContentEditable)) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); input.focus(); }
  });
})();
