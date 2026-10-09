/* Smart21Brain School System — app shell, navigation and router. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  // route segment -> { module, nav (sidebar item to highlight), title }
  const ROUTES = {
    dashboard: { mod: 'dashboard', nav: 'dashboard', title: SC.t('Dashboard', 'Dashibodi') },
    home: { mod: 'portal', nav: 'home', title: SC.t('My Children', 'Watoto Wangu') },
    students: { mod: 'students', nav: 'students', title: SC.t('Students', 'Wanafunzi') },
    student: { mod: 'student', nav: 'students', title: SC.t('Student', 'Mwanafunzi') },
    teachers: { mod: 'teachers', nav: 'teachers', title: SC.t('Teachers', 'Walimu') },
    teacher: { mod: 'teacher', nav: 'teachers', title: SC.t('Teacher', 'Mwalimu') },
    parents: { mod: 'parents', nav: 'parents', title: SC.t('Parents & Guardians', 'Wazazi na Walezi') },
    parent: { mod: 'parent', nav: 'parents', title: SC.t('Parent / Guardian', 'Mzazi / Mlezi') },
    classes: { mod: 'classes', nav: 'classes', title: SC.t('Classes', 'Madarasa') },
    subjects: { mod: 'subjects', nav: 'subjects', title: SC.t('Subjects', 'Masomo') },
    attendance: { mod: 'attendance', nav: 'attendance', title: SC.t('Attendance', 'Mahudhurio') },
    fees: { mod: 'fees', nav: 'fees', title: SC.t('Fees & Payments', 'Ada na Malipo') },
    receipt: { mod: 'fees', nav: 'fees', title: SC.t('Fees & Payments', 'Ada na Malipo') },
    exams: { mod: 'exams', nav: 'exams', title: SC.t('Examinations', 'Mitihani') },
    exam: { mod: 'exam', nav: 'exams', title: SC.t('Examination', 'Mtihani') },
    marks: { mod: 'marks', nav: 'exams', title: SC.t('Enter Marks', 'Ingiza Alama') },
    results: { mod: 'results', nav: 'results', title: SC.t('Results', 'Matokeo') },
    reportcard: { mod: 'reportcard', nav: 'results', title: SC.t('Report Card', 'Ripoti ya Matokeo') },
    timetable: { mod: 'timetable', nav: 'timetable', title: SC.t('Timetable', 'Ratiba') },
    notifications: { mod: 'notifications', nav: 'notifications', title: SC.t('Notifications', 'Arifa') },
    reports: { mod: 'reports', nav: 'reports', title: SC.t('Reports', 'Ripoti') },
    users: { mod: 'users', nav: 'users', title: SC.t('Users', 'Watumiaji') },
    settings: { mod: 'settings', nav: 'settings', title: SC.t('Settings', 'Mipangilio') },
    audit: { mod: 'audit', nav: 'audit', title: SC.t('Audit Logs', 'Kumbukumbu za Ukaguzi') },
  };

  function navItems() {
    const c = SC.can; const staff = !SC.isParent();
    return [
      { group: SC.t('Overview', 'Muhtasari'), items: [
        { r: 'dashboard', i: 'fa-gauge-high', l: SC.t('Dashboard', 'Dashibodi'), show: staff },
        { r: 'home', i: 'fa-house-chimney-user', l: SC.t('My Children', 'Watoto Wangu'), show: !staff },
      ] },
      { group: SC.t('People', 'Watu'), items: [
        { r: 'students', i: 'fa-user-graduate', l: SC.t('Students', 'Wanafunzi'), show: c('students.view') },
        { r: 'teachers', i: 'fa-chalkboard-user', l: SC.t('Teachers', 'Walimu'), show: c('teachers.manage') },
        { r: 'parents', i: 'fa-people-roof', l: SC.t('Parents', 'Wazazi'), show: c('parents.manage') && SC.state.role !== 'teacher' },
      ] },
      { group: SC.t('Academics', 'Taaluma'), items: [
        { r: 'classes', i: 'fa-school', l: SC.t('Classes', 'Madarasa'), show: staff },
        { r: 'subjects', i: 'fa-book-open', l: SC.t('Subjects', 'Masomo'), show: staff },
        { r: 'attendance', i: 'fa-clipboard-user', l: SC.t('Attendance', 'Mahudhurio'), show: c('attendance.take') || c('attendance.view') },
        { r: 'exams', i: 'fa-file-pen', l: SC.t('Examinations', 'Mitihani'), show: c('exams.manage') || c('results.enter') || c('results.view') },
        { r: 'results', i: 'fa-ranking-star', l: SC.t('Results', 'Matokeo'), show: c('results.view') || c('results.enter') },
        { r: 'timetable', i: 'fa-calendar-week', l: SC.t('Timetable', 'Ratiba'), show: true },
      ] },
      { group: SC.t('Finance', 'Fedha'), items: [
        { r: 'fees', i: 'fa-coins', l: SC.t('Fees & Payments', 'Ada na Malipo'), show: c('fees.view') },
      ] },
      { group: SC.t('Communication', 'Mawasiliano'), items: [
        { r: 'notifications', i: 'fa-bell', l: SC.t('Notifications', 'Arifa'), show: true, badge: true },
      ] },
      { group: SC.t('System', 'Mfumo'), items: [
        { r: 'reports', i: 'fa-chart-pie', l: SC.t('Reports', 'Ripoti'), show: c('reports.view') && SC.state.role !== 'teacher' },
        { r: 'users', i: 'fa-users-gear', l: SC.t('Users', 'Watumiaji'), show: c('users.manage') },
        { r: 'settings', i: 'fa-sliders', l: SC.t('Settings', 'Mipangilio'), show: c('settings.manage') },
        { r: 'audit', i: 'fa-shield-halved', l: SC.t('Audit Logs', 'Kumbukumbu za Ukaguzi'), show: c('audit.view') },
      ] },
    ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
  }

  SC.setTitle = (title, sub) => {
    const t = document.getElementById('scTitle'); if (t) t.textContent = title;
    const s = document.getElementById('scSub'); if (s) s.textContent = sub || (SC.state.school ? SC.state.school.name : '');
    document.title = `${title} · ${SC.state.school ? SC.state.school.name : 'School System'}`;
  };
  // Modules call SC.after(fn) to run code once their HTML is on the page (charts, QR codes…).
  SC.after = (fn) => { if (SC._building) (SC._after = SC._after || []).push(fn); else setTimeout(fn, 0); };
  SC.go = (hash) => { if (location.hash === '#' + hash) route(); else location.hash = hash; };

  // Shows the language you'd switch TO, same convention as the rest of the site.
  const langToggleBtn = () => `<button class="sc-icon-btn" id="scLangToggle" aria-label="${SC.t('Switch language', 'Badilisha lugha')}" title="${SC.t('Switch language', 'Badilisha lugha')}" style="font-weight:800;font-size:.72rem">${SC.isSw() ? 'EN' : 'SW'}</button>`;

  function shell() {
    const s = SC.state.school;
    document.body.classList.add('sc-body');
    document.body.innerHTML = `
      <div class="sc-shell">
        <div class="sc-backdrop" id="scBackdrop"></div>
        <aside class="sc-sidebar" id="scSidebar" aria-label="Main navigation">
          <div class="sc-brand">${SC.schoolLogo()}<div><div class="sc-brand-name">${esc(s.name)}</div><div class="sc-brand-sub">${SC.t('School System', 'Mfumo wa Shule')}</div></div></div>
          <nav class="sc-nav" id="scNav">${navItems().map((g) => `<div class="sc-nav-group">${g.group}</div>${g.items.map((i) => `<a href="#${i.r}" data-nav="${i.r}"><i class="fa-solid ${i.i}"></i><span>${i.l}</span>${i.badge ? '<span class="sc-badge-dot sc-hide" id="scNavBadge">0</span>' : ''}</a>`).join('')}`).join('')}</nav>
          <div class="sc-sidebar-foot">
            <div class="sc-me">${SC.avatar('x', 0, SC.state.user.name, false)}<div style="min-width:0"><div class="sc-me-name">${esc(SC.state.user.name)}</div><span class="sc-role-pill">${esc(SC.state.role)}</span></div></div>
            ${SC.state.memberships.length > 1 ? `<select class="sc-select" id="scSwitch" aria-label="${SC.t('Switch school', 'Badilisha shule')}">${SC.state.memberships.map((m) => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}
            <button class="sc-btn ghost sm block" id="scLogout"><i class="fa-solid fa-right-from-bracket"></i> ${SC.t('Sign out', 'Toka')}</button>
          </div>
        </aside>
        <div class="sc-main">
          <header class="sc-topbar">
            <button class="sc-icon-btn sc-menu-btn" id="scMenu" aria-label="${SC.t('Open menu', 'Fungua menyu')}"><i class="fa-solid fa-bars"></i></button>
            <div><div class="sc-title" id="scTitle">${SC.t('Dashboard', 'Dashibodi')}</div><div class="sc-sub" id="scSub">${esc(s.name)}</div></div>
            ${SC.isParent() ? '<div style="flex:1"></div>' : `<div class="sc-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="scSearch" placeholder="${SC.t('Search students, teachers, parents, payments…', 'Tafuta wanafunzi, walimu, wazazi, malipo…')}" autocomplete="off" aria-label="${SC.t('Global search', 'Tafuta kila kitu')}"><div class="sc-search-panel" id="scSearchPanel"></div></div>`}
            <div class="sc-top-actions" style="position:relative">
              ${langToggleBtn()}
              <button class="sc-icon-btn" id="scTheme" aria-label="${SC.t('Toggle dark mode', 'Badilisha mwonekano')}" title="${SC.t('Dark / light mode', 'Mwonekano mweusi / mweupe')}"><i class="fa-solid fa-moon"></i></button>
              <button class="sc-icon-btn" id="scBell" aria-label="${SC.t('Notifications', 'Arifa')}"><i class="fa-solid fa-bell"></i><span class="sc-badge-dot sc-hide" id="scBellBadge">0</span></button>
              <div class="sc-search-panel" id="scBellPanel" style="left:auto;right:0;width:min(380px,92vw);top:calc(100% + 8px)"></div>
            </div>
          </header>
          <main class="sc-content" id="scContent" tabindex="-1"></main>
        </div>
      </div>`;

    const side = document.getElementById('scSidebar'); const back = document.getElementById('scBackdrop');
    const toggle = (open) => { side.classList.toggle('open', open); back.classList.toggle('show', open); };
    document.getElementById('scMenu').addEventListener('click', () => toggle(!side.classList.contains('open')));
    back.addEventListener('click', () => toggle(false));
    document.getElementById('scNav').addEventListener('click', () => toggle(false));
    document.getElementById('scLogout').addEventListener('click', async () => { await SC.api.post('/logout').catch(() => {}); localStorage.removeItem('sc-school-id'); location.href = 'school-login.html'; });
    document.getElementById('scLangToggle').addEventListener('click', () => SC.toggleLang());
    const switcher = document.getElementById('scSwitch');
    if (switcher) switcher.addEventListener('change', () => { localStorage.setItem('sc-school-id', switcher.value); location.hash = SC.isParent() ? 'home' : 'dashboard'; location.reload(); });
    document.getElementById('scTheme').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('sc-theme', dark ? 'dark' : 'light');
      document.dispatchEvent(new Event('sc-theme'));
    });
    wireSearch(); wireBell();
  }

  // ---------------------------------------------------------- global search
  function wireSearch() {
    const input = document.getElementById('scSearch'); if (!input) return;
    const panel = document.getElementById('scSearchPanel');
    const GROUPS = { students: SC.t('Students', 'Wanafunzi'), teachers: SC.t('Teachers', 'Walimu'), parents: SC.t('Parents', 'Wazazi'), payments: SC.t('Payments', 'Malipo'), classes: SC.t('Classes', 'Madarasa'), results: SC.t('Results', 'Matokeo') };
    const run = SC.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="sc-search-group">${SC.t('Searching…', 'Inatafuta…')}</div>`; panel.classList.add('open');
      try {
        const { results } = await SC.api.get('/search' + SC.qs({ q }));
        const html = Object.entries(GROUPS).filter(([k]) => results[k] && results[k].length).map(([k, label]) =>
          `<div class="sc-search-group">${label}</div>${results[k].map((r) => `<a class="sc-search-item" href="#${r.route}" tabindex="0"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></a>`).join('')}`).join('');
        panel.innerHTML = html || `<div class="sc-search-group" style="text-transform:none;letter-spacing:0;font-size:.85rem">${SC.t(`No results for "${esc(q)}".`, `Hakuna matokeo ya "${esc(q)}".`)}</div>`;
      } catch (e) { panel.innerHTML = `<div class="sc-search-group">${esc(e.message)}</div>`; }
    }, 250);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (panel.innerHTML) panel.classList.add('open'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sc-search')) panel.classList.remove('open'); });
    panel.addEventListener('click', (e) => { if (e.target.closest('.sc-search-item')) { panel.classList.remove('open'); input.value = ''; } });
    document.addEventListener('keydown', (e) => { if ((e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) ) { e.preventDefault(); input.focus(); } });
  }

  // ---------------------------------------------------------- notifications bell
  async function refreshBadge() {
    try {
      const { unread } = await SC.api.get('/notifications?limit=1');
      SC.state.unread = unread;
      [['scBellBadge'], ['scNavBadge']].forEach(([id]) => { const b = document.getElementById(id); if (b) { b.textContent = unread > 99 ? '99+' : unread; b.classList.toggle('sc-hide', !unread); } });
    } catch (e) { /* silent */ }
  }
  SC.refreshBadge = refreshBadge;
  function wireBell() {
    const bell = document.getElementById('scBell'); const panel = document.getElementById('scBellPanel');
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="sc-search-group">${SC.t('Loading…', 'Inapakia…')}</div>`; panel.classList.add('open');
      try {
        const { notifications } = await SC.api.get('/notifications?limit=6');
        panel.innerHTML = `<div class="sc-search-group">${SC.t('Latest notifications', 'Arifa za Hivi Karibuni')}</div>${notifications.length ? notifications.map((n) => `<a class="sc-search-item" href="#notifications"><b>${n.is_read ? '' : '<span style="color:var(--sc-danger)">● </span>'}${esc(n.title)}</b><small>${esc(n.message.slice(0, 90))}${n.message.length > 90 ? '…' : ''}</small></a>`).join('') : `<div class="sc-search-item sc-muted">${SC.t('You are all caught up.', 'Umekamilisha kila kitu.')}</div>`}
          <a class="sc-search-item sc-strong" href="#notifications" style="text-align:center;color:var(--sc-primary)!important">${SC.t('See all notifications', 'Ona Arifa Zote')}</a>`;
      } catch (err) { panel.innerHTML = `<div class="sc-search-group">${esc(err.message)}</div>`; }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#scBellPanel') && !e.target.closest('#scBell')) panel.classList.remove('open'); });
    panel.addEventListener('click', () => panel.classList.remove('open'));
  }

  // ---------------------------------------------------------- router
  async function route() {
    const parts = (location.hash || (SC.isParent() ? '#home' : '#dashboard')).replace(/^#\/?/, '').split('/').filter(Boolean);
    let seg = parts[0] || 'dashboard';
    if (SC.isParent() && seg === 'dashboard') seg = 'home';
    let def = ROUTES[seg];
    if (!def) { seg = SC.isParent() ? 'home' : 'dashboard'; def = ROUTES[seg]; }
    document.querySelectorAll('#scNav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === def.nav));
    SC.setTitle(def.title);
    const el = document.getElementById('scContent');
    const mod = SC.modules[def.mod];
    if (SC.destroyCharts) SC.destroyCharts();
    el.innerHTML = SC.skeletonPage();
    window.scrollTo({ top: 0 });
    if (!mod) { el.innerHTML = SC.errorBox(new Error(SC.t('This screen is not available.', 'Ukurasa huu haupatikani.'))); return; }
    const token = (route.token = (route.token || 0) + 1);
    try {
      const fresh = document.createElement('div');
      SC._after = []; SC._building = true;
      try { await mod(fresh, parts.slice(1), seg); } finally { SC._building = false; }
      if (token !== route.token) return; // user already navigated elsewhere
      el.replaceChildren(fresh);
      el.focus({ preventScroll: true });
      const jobs = SC._after; SC._after = [];
      jobs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    } catch (err) {
      if (token === route.token) el.innerHTML = SC.errorBox(err);
    }
  }
  SC.route = route;

  // ---------------------------------------------------------- start
  function onboarding(ctx) {
    document.body.classList.add('sc-body');
    document.body.innerHTML = `<div class="sc-auth"><div class="sc-auth-art"><div class="sc-row" style="justify-content:space-between;align-items:center"><div class="sc-row"><span class="sc-logo"><i class="fa-solid fa-graduation-cap"></i></span><b style="font-family:var(--sc-font-display);font-size:1.2rem">Smart21Brain School System</b></div>${langToggleBtn()}</div>
      <div><h1>${SC.t('Welcome', 'Karibu')}, ${esc(ctx.user.name.split(' ')[0])} 👋</h1><p>${SC.t('Set up your school in less than a minute. You will get a ready-made starter with classes, subjects, fees and roles that you can change any time.', 'Sanidi shule yako kwa chini ya dakika moja. Utapata mwanzo tayari wenye madarasa, masomo, ada na majukumu unayoweza kubadilisha wakati wowote.')}</p></div><div></div></div>
      <div class="sc-auth-form"><div class="sc-auth-box"><div class="sc-card">
      <h3 style="margin-bottom:.3rem">${SC.t('Create your school', 'Fungua shule yako')}</h3><p class="sc-muted" style="margin-top:0">${SC.t('This becomes the school you manage. Teachers, receptionists and parents you add will only see this school.', 'Hii itakuwa shule utakayosimamia. Walimu, wapokezi na wazazi utakaoongeza wataona shule hii tu.')}</p>
      <form class="sc-form" id="scSetup" novalidate><div class="sc-form-error" role="alert"></div>
      ${SC.f.input('school_name', SC.t('School name', 'Jina la shule'), { required: true, placeholder: SC.t('e.g. Smart Hills Secondary School', 'mfano: Shule ya Sekondari ya Smart Hills') })}
      ${SC.f.input('phone', SC.t('School phone (optional)', 'Simu ya shule (si lazima)'), { type: 'tel', placeholder: '+255 712 345 678' })}
      <button class="sc-btn primary block lg" type="submit">${SC.t('Create my school', 'Fungua shule yangu')}</button></form>
      <p class="sc-small sc-muted" style="margin:1rem 0 0">${SC.t('Were you invited by a school? Ask your school administrator to add', 'Umealikwa na shule? Muombe msimamizi wa shule yako aongeze')} <b>${esc(ctx.user.email)}</b> ${SC.t('in', 'katika')} <i>${SC.t('Users', 'Watumiaji')}</i>, ${SC.t('then sign in again.', 'kisha ingia tena.')}</p>
      <p class="sc-small" style="margin:.4rem 0 0"><a href="#" id="scOut">${SC.t('Sign out', 'Toka')}</a></p></div></div></div></div>`;
    document.querySelector('#scSetup [name=phone]').dataset.kind = 'phone';
    document.getElementById('scOut').addEventListener('click', async (e) => { e.preventDefault(); await SC.api.post('/logout').catch(() => {}); location.href = 'school-login.html'; });
    const langBtn = document.getElementById('scLangToggle'); if (langBtn) langBtn.addEventListener('click', () => SC.toggleLang());
    const form = document.getElementById('scSetup');
    const createLabel = SC.t('Create my school', 'Fungua shule yangu');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SC.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = `<span class="sc-spin"></span> ${SC.t('Setting up…', 'Inasanidi…')}`;
      try { const d = await SC.api.post('/schools', SC.formData(form)); localStorage.setItem('sc-school-id', d.school_id); location.reload(); }
      catch (err) { const b = form.querySelector('.sc-form-error'); b.textContent = err.message; b.classList.add('show'); btn.disabled = false; btn.textContent = createLabel; }
    });
  }

  async function start() {
    document.body.classList.add('sc-body');
    document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center"><span class="sc-spin" style="width:36px;height:36px"></span></div>';
    const saved = Number(localStorage.getItem('sc-school-id') || 0);
    if (saved) SC.state.school = { id: saved };
    let ctx;
    try { ctx = await SC.api.get('/context'); } catch (e) { document.body.innerHTML = `<div class="sc-verify-box sc-card">${SC.errorBox(e)}</div>`; return; }
    SC.state.school = null;
    if (!ctx.school) return onboarding(ctx);
    Object.assign(SC.state, { user: ctx.user, school: ctx.school, role: ctx.role, perms: ctx.permissions, settings: ctx.settings, memberships: ctx.memberships, teacherId: ctx.teacher_id, parentId: ctx.parent_id, year: ctx.current_year });
    localStorage.setItem('sc-school-id', ctx.school.id);
    SC.setBrand(ctx.school.primary_color);
    shell();
    SC.lookups().catch(() => {});
    refreshBadge(); setInterval(refreshBadge, 90000);
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', start);
})();
