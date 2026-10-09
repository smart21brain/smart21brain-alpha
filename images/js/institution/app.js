/* Smart21Institution — app shell, navigation and router. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc; const sw = IN.isSw();

  // route segment -> { module, nav (sidebar item to highlight), title }
  const ROUTES = {
    dashboard: { mod: 'dashboard', nav: 'dashboard', title: IN.t('Dashboard', 'Dashibodi') },
    catalogue: { mod: 'catalogue', nav: 'catalogue', title: IN.t('Library catalogue', 'Katalogi ya maktaba') },
    books: { mod: 'books', nav: 'books', title: IN.t('Manage books', 'Simamia vitabu') },
    book: { mod: 'book', nav: 'books', title: IN.t('Book', 'Kitabu') },
    categories: { mod: 'categories', nav: 'books', title: IN.t('Book categories', 'Jamii za vitabu') },
    loans: { mod: 'loans', nav: 'loans', title: IN.t('Lending & returns', 'Kukopesha na kurudisha') },
    reservations: { mod: 'reservations', nav: 'loans', title: IN.t('Reservations', 'Uhifadhi') },
    fines: { mod: 'fines', nav: 'loans', title: IN.t('Fines', 'Faini') },
    'my-library': { mod: 'myLibrary', nav: 'my-library', title: IN.t('My library', 'Maktaba yangu') },
    'my-reading': { mod: 'myReading', nav: 'my-reading', title: IN.t('My reading', 'Kusoma kwangu') },
    elibrary: { mod: 'elibrary', nav: 'elibrary', title: IN.t('E-Library', 'Maktaba Mtandao') },
    students: { mod: 'students', nav: 'students', title: IN.t('Students', 'Wanafunzi') },
    student: { mod: 'student', nav: 'students', title: IN.t('Student', 'Mwanafunzi') },
    staff: { mod: 'staff', nav: 'staff', title: IN.t('Staff', 'Wafanyakazi') },
    structure: { mod: 'structure', nav: 'courses', title: IN.t('Departments & programmes', 'Idara na programu') },
    courses: { mod: 'courses', nav: 'courses', title: IN.t('Courses', 'Kozi') },
    enrol: { mod: 'enrol', nav: 'courses', title: IN.t('Enrolment', 'Usajili') },
    results: { mod: 'results', nav: 'results', title: IN.t('Marks & results', 'Alama na matokeo') },
    'my-results': { mod: 'myResults', nav: 'my-results', title: IN.t('My results', 'Matokeo yangu') },
    'my-profile': { mod: 'myProfile', nav: 'my-profile', title: IN.t('My profile', 'Wasifu wangu') },
    website: { mod: 'website', nav: 'website', title: IN.t('Website', 'Tovuti') },
    'site-page': { mod: 'sitePage', nav: 'website', title: IN.t('Edit page', 'Hariri ukurasa') },
    applications: { mod: 'applications', nav: 'applications', title: IN.t('Applications & messages', 'Maombi na jumbe') },
    announcements: { mod: 'announcements', nav: 'announcements', title: IN.t('Announcements', 'Matangazo') },
    'notification-settings': { mod: 'notification-settings', nav: 'notification-settings', title: IN.t('Notifications', 'Arifa') },
    reports: { mod: 'reports', nav: 'reports', title: IN.t('Reports', 'Ripoti') },
    import: { mod: 'import', nav: 'import', title: IN.t('Import records', 'Leta rekodi') },
    users: { mod: 'users', nav: 'users', title: IN.t('Logins & roles', 'Akaunti na majukumu') },
    permissions: { mod: 'permissions', nav: 'users', title: IN.t('Roles & permissions', 'Majukumu na ruhusa') },
    settings: { mod: 'settings', nav: 'settings', title: IN.t('Settings', 'Mipangilio') },
    backup: { mod: 'backup', nav: 'backup', title: IN.t('Backup & restore', 'Hifadhi nakala') },
    audit: { mod: 'audit', nav: 'audit', title: IN.t('Audit log', 'Kumbukumbu za ukaguzi') },
    health: { mod: 'health', nav: 'health', title: IN.t('System health', 'Afya ya mfumo') },
    search: { mod: 'searchPage', nav: 'dashboard', title: IN.t('Search', 'Tafuta') },
  };

  function navItems() {
    const c = IN.can; const st = IN.state;
    const linked = !!(st.student_id || st.staff_id);
    return [
      { group: IN.t('Overview', 'Muhtasari'), items: [
        { r: 'dashboard', i: 'fa-gauge-high', l: IN.t('Dashboard', 'Dashibodi'), show: true },
        { r: 'announcements', i: 'fa-bullhorn', l: IN.t('Announcements', 'Matangazo'), show: true },
        { r: 'notification-settings', i: 'fa-bell', l: IN.t('Notifications', 'Arifa'), show: true },
      ] },
      { group: IN.t('Library', 'Maktaba'), items: [
        { r: 'catalogue', i: 'fa-magnifying-glass', l: IN.t('Catalogue (OPAC)', 'Katalogi (OPAC)'), show: true },
        { r: 'my-library', i: 'fa-book-bookmark', l: IN.t('My library', 'Maktaba yangu'), show: linked },
        { r: 'loans', i: 'fa-right-left', l: IN.t('Lending & returns', 'Kukopesha na kurudisha'), show: c('loans.view') },
        { r: 'books', i: 'fa-books', l: IN.t('Manage books', 'Simamia vitabu'), show: c('books.view') },
        { r: 'my-reading', i: 'fa-book-open-reader', l: IN.t('My reading', 'Kusoma kwangu'), show: c('resources.view') },
        { r: 'elibrary', i: 'fa-laptop-file', l: IN.t('E-Library', 'Maktaba Mtandao'), show: c('resources.view') || c('resources.manage') },
      ] },
      { group: IN.t('Students & academics', 'Wanafunzi na masomo'), items: [
        { r: 'my-profile', i: 'fa-id-card', l: IN.t('My profile', 'Wasifu wangu'), show: !!st.student_id },
        { r: 'my-results', i: 'fa-square-poll-vertical', l: IN.t('My results', 'Matokeo yangu'), show: !!st.student_id },
        { r: 'students', i: 'fa-user-graduate', l: IN.t('Students', 'Wanafunzi'), show: c('students.view') },
        { r: 'staff', i: 'fa-chalkboard-user', l: IN.t('Staff', 'Wafanyakazi'), show: c('staff.view') },
        { r: 'courses', i: 'fa-book-open-reader', l: IN.t('Courses & programmes', 'Kozi na programu'), show: c('academics.view') || c('academics.manage') },
        { r: 'results', i: 'fa-pen-to-square', l: IN.t('Marks & results', 'Alama na matokeo'), show: c('results.enter') || c('results.all') || c('academics.view') },
      ] },
      { group: IN.t('Website', 'Tovuti'), items: [
        { r: 'website', i: 'fa-globe', l: IN.t('Website builder', 'Jenga tovuti'), show: c('site.manage') },
        { r: 'applications', i: 'fa-user-plus', l: IN.t('Applications & messages', 'Maombi na jumbe'), show: c('applications.manage') },
      ] },
      { group: IN.t('Administration', 'Utawala'), items: [
        { r: 'reports', i: 'fa-chart-pie', l: IN.t('Reports', 'Ripoti'), show: c('reports.view') || c('academics.view') || c('audit.view') },
        { r: 'import', i: 'fa-file-import', l: IN.t('Import records', 'Leta rekodi'), show: c('import.manage') },
        { r: 'users', i: 'fa-user-gear', l: IN.t('Logins & roles', 'Akaunti na majukumu'), show: c('users.manage') },
        { r: 'settings', i: 'fa-sliders', l: IN.t('Settings', 'Mipangilio'), show: c('settings.manage') },
        { r: 'backup', i: 'fa-cloud-arrow-up', l: IN.t('Backup & restore', 'Hifadhi nakala'), show: c('backup.manage') },
        { r: 'audit', i: 'fa-shield-halved', l: IN.t('Audit log', 'Kumbukumbu za ukaguzi'), show: c('audit.view') },
        { r: 'health', i: 'fa-heart-pulse', l: IN.t('System health', 'Afya ya mfumo'), show: c('health.view') },
      ] },
    ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
  }

  const langToggleBtn = () => `<button class="in-icon-btn" id="inLangToggle" aria-label="${IN.t('Switch language', 'Badilisha lugha')}" title="${IN.t('Switch language', 'Badilisha lugha')}" style="font-weight:800;font-size:.72rem">${sw ? 'EN' : 'SW'}</button>`;

  IN.setTitle = (title, sub) => {
    const t = document.getElementById('inTitle'); if (t) t.textContent = title;
    const s = document.getElementById('inSub'); if (s) s.textContent = sub || (IN.state.inst ? IN.state.inst.name : '');
    document.title = `${title} · ${IN.state.inst ? IN.state.inst.name : 'Smart21Institution'}`;
  };
  IN.after = (fn) => { if (IN._building) (IN._after = IN._after || []).push(fn); else setTimeout(fn, 0); };
  IN.go = (hash) => { if (location.hash === '#' + hash) route(); else location.hash = hash; };
  // query part of the current hash:  #loans?filter=overdue
  IN.hashQuery = () => new URLSearchParams((location.hash.split('?')[1]) || '');

  function shell() {
    const s = IN.state.inst;
    document.body.classList.add('in-body');
    document.body.innerHTML = `
      <div class="in-shell">
        <div class="in-backdrop" id="inBackdrop"></div>
        <aside class="in-sidebar" id="inSidebar" aria-label="${IN.t('Main navigation', 'Menyu kuu')}">
          <div class="in-brand">${IN.instLogo()}<div><div class="in-brand-name">${esc(s.name)}</div><div class="in-brand-sub">Smart21Institution</div></div></div>
          <nav class="in-nav" id="inNav">${navItems().map((g) => `<div class="in-nav-group">${g.group}</div>${g.items.map((i) => `<a href="#${i.r}" data-nav="${i.r}"><i class="fa-solid ${i.i}"></i><span>${i.l}</span></a>`).join('')}`).join('')}</nav>
          <div class="in-sidebar-foot">
            <div class="in-me">${IN.avatar('x', 0, IN.state.user.name, false)}<div style="min-width:0"><div class="in-me-name">${esc(IN.state.user.name)}</div><span class="in-role-pill">${esc(IN.state.role_label)}</span></div></div>
            ${IN.state.memberships.length > 1 ? `<select class="in-select" id="inSwitch" aria-label="${IN.t('Switch institution', 'Badilisha taasisi')}">${IN.state.memberships.map((m) => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}
            <button class="in-btn ghost sm block" id="inLogout"><i class="fa-solid fa-right-from-bracket"></i> ${IN.t('Sign out', 'Toka')}</button>
          </div>
        </aside>
        <div class="in-main">
          <header class="in-topbar">
            <button class="in-icon-btn in-menu-btn" id="inMenu" aria-label="${IN.t('Open menu', 'Fungua menyu')}"><i class="fa-solid fa-bars"></i></button>
            <div><div class="in-title" id="inTitle">${IN.t('Dashboard', 'Dashibodi')}</div><div class="in-sub" id="inSub">${esc(s.name)}</div></div>
            <div class="in-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="inSearch" placeholder="${IN.t('Search books, students, resources…', 'Tafuta vitabu, wanafunzi, rasilimali…')}" autocomplete="off" aria-label="${IN.t('Global search', 'Tafuta kila kitu')}"><div class="in-search-panel" id="inSearchPanel"></div></div>
            <div class="in-top-actions" style="position:relative">
              ${langToggleBtn()}
              <button class="in-icon-btn" id="inTheme" aria-label="${IN.t('Toggle dark mode', 'Badilisha mwonekano')}"><i class="fa-solid fa-moon"></i></button>
              <button class="in-icon-btn" id="inBell" aria-label="${IN.t('Notifications', 'Arifa')}"><i class="fa-solid fa-bell"></i><span class="in-badge-dot in-hide" id="inBellBadge">0</span></button>
              <div class="in-search-panel" id="inBellPanel" style="left:auto;right:0;width:min(400px,92vw);top:calc(100% + 8px)"></div>
            </div>
          </header>
          <main class="in-content" id="inContent" tabindex="-1"></main>
        </div>
      </div>
      <div class="in-offline" id="inOffline" role="status"><i class="fa-solid fa-wifi"></i> ${IN.t('You are offline. Returns, marks and reading progress are kept on this device and sent when you reconnect; other changes need a connection.', 'Huna mtandao. Kurudisha vitabu, alama na maendeleo ya kusoma vinahifadhiwa kwenye kifaa na kutumwa mtandao ukirudi; mabadiliko mengine yanahitaji mtandao.')}</div>`;

    const side = document.getElementById('inSidebar'); const back = document.getElementById('inBackdrop');
    const toggle = (open) => { side.classList.toggle('open', open); back.classList.toggle('show', open); };
    document.getElementById('inMenu').addEventListener('click', () => toggle(!side.classList.contains('open')));
    back.addEventListener('click', () => toggle(false));
    document.getElementById('inNav').addEventListener('click', () => toggle(false));
    document.getElementById('inLogout').addEventListener('click', async () => { if (IN.offline && !(await IN.offline.beforeSignOut())) return; await IN.api.post('/logout').catch(() => {}); localStorage.removeItem('in-inst-id'); location.href = 'institution-start.html?go=login'; });
    document.getElementById('inLangToggle').addEventListener('click', () => IN.toggleLang());
    const swc = document.getElementById('inSwitch');
    if (swc) swc.addEventListener('change', () => { localStorage.setItem('in-inst-id', swc.value); location.hash = 'dashboard'; location.reload(); });
    document.getElementById('inTheme').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('in-theme', dark ? 'dark' : 'light');
      document.dispatchEvent(new Event('in-theme'));
    });
    // connection indicator (the app needs a connection to save; this tells people why things fail)
    const off = document.getElementById('inOffline');
    const sync = () => off.classList.toggle('show', !navigator.onLine);
    window.addEventListener('online', sync); window.addEventListener('offline', sync); sync();
    wireSearch(); wireBell();
    if (IN.offline) IN.offline.mount();
  }

  // ---------------------------------------------------------- global search
  function wireSearch() {
    const input = document.getElementById('inSearch'); if (!input) return;
    const panel = document.getElementById('inSearchPanel');
    const run = IN.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="in-search-group">${IN.t('Searching…', 'Inatafuta…')}</div>`; panel.classList.add('open');
      try {
        const { groups } = await IN.api.get('/search' + IN.qs({ q }));
        panel.innerHTML = groups.length
          ? groups.map((g) => `<div class="in-search-group">${esc(g.label)}</div>${g.items.map((r) => `<a class="in-search-item" href="${esc(r.link)}" tabindex="0"><b>${esc(r.title)}</b><small>${esc(r.sub || '')}</small></a>`).join('')}`).join('')
          : `<div class="in-search-group" style="text-transform:none;letter-spacing:0;font-size:.85rem">${IN.t(`No results for "${esc(q)}". Try a shorter word, or check the spelling.`, `Hakuna matokeo ya "${esc(q)}". Jaribu neno fupi, au hakiki tahajia.`)}</div>`;
      } catch (e) { panel.innerHTML = `<div class="in-search-group">${esc(e.message)}</div>`; }
    }, 250);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (panel.innerHTML) panel.classList.add('open'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.in-search')) panel.classList.remove('open'); });
    panel.addEventListener('click', (e) => { if (e.target.closest('.in-search-item')) { panel.classList.remove('open'); input.value = ''; } });
    document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
  }

  // ---------------------------------------------------------- notifications bell
  const KIND_ICON = { overdue: 'fa-clock', announcement: 'fa-bullhorn', academic: 'fa-graduation-cap', security: 'fa-lock', admin: 'fa-gear', system: 'fa-circle-info' };
  async function refreshBadge() {
    try {
      const { unread } = await IN.api.get('/notifications');
      const b = document.getElementById('inBellBadge'); if (b) { b.textContent = unread > 99 ? '99+' : unread; b.classList.toggle('in-hide', !unread); }
    } catch (e) { /* silent */ }
  }
  IN.refreshBadge = refreshBadge;
  function wireBell() {
    const bell = document.getElementById('inBell'); const panel = document.getElementById('inBellPanel');
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="in-search-group">${IN.t('Loading…', 'Inapakia…')}</div>`; panel.classList.add('open');
      try {
        const { notifications } = await IN.api.get('/notifications');
        panel.innerHTML = `<div class="in-search-group" style="display:flex;justify-content:space-between;align-items:center">${IN.t('Notifications', 'Arifa')}<button class="in-btn ghost sm" id="inReadAll">${IN.t('Mark all read', 'Weka zote zimesomwa')}</button></div>${notifications.length ? notifications.map((n) => `<a class="in-search-item" href="${esc(n.link || '#dashboard')}" style="${n.read_at ? 'opacity:.65' : ''}"><b><i class="fa-solid ${KIND_ICON[n.kind] || 'fa-circle-info'}"></i> ${esc(n.title)}</b><small>${esc(n.message || '')} · ${IN.dateTime(n.created_at)}</small></a>`).join('') : `<div class="in-search-item in-muted">${IN.t('You are all caught up.', 'Umekamilisha kila kitu.')}</div>`}`;
        const ra = document.getElementById('inReadAll');
        if (ra) ra.addEventListener('click', async (ev) => { ev.stopPropagation(); await IN.api.post('/notifications/read', {}); refreshBadge(); panel.classList.remove('open'); });
      } catch (err) { panel.innerHTML = `<div class="in-search-group">${esc(err.message)}</div>`; }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#inBellPanel') && !e.target.closest('#inBell')) panel.classList.remove('open'); });
  }

  // ---------------------------------------------------------- router
  async function route() {
    const raw = (location.hash || '#dashboard').replace(/^#\/?/, '').split('?')[0];
    const parts = raw.split('/').filter(Boolean);
    let seg = parts[0] || 'dashboard';
    let def = ROUTES[seg];
    if (!def) { seg = 'dashboard'; def = ROUTES[seg]; }
    document.querySelectorAll('#inNav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === def.nav));
    IN.setTitle(def.title);
    const el = document.getElementById('inContent');
    const mod = IN.modules[def.mod];
    if (IN.destroyCharts) IN.destroyCharts();
    el.innerHTML = IN.skeletonPage();
    window.scrollTo({ top: 0 });
    if (!mod) { el.innerHTML = IN.errorBox(new Error(IN.t('This screen is not available.', 'Ukurasa huu haupatikani.'))); return; }
    const token = (route.token = (route.token || 0) + 1);
    try {
      const fresh = document.createElement('div');
      IN._after = []; IN._building = true;
      try { await mod(fresh, parts.slice(1), seg); } finally { IN._building = false; }
      if (token !== route.token) return;
      el.replaceChildren(fresh);
      el.focus({ preventScroll: true });
      const jobs = IN._after; IN._after = [];
      jobs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    } catch (err) {
      if (token === route.token) el.innerHTML = IN.errorBox(err);
    }
  }
  IN.route = route;

  // ---------------------------------------------------------- onboarding (signed in, no institution yet)
  function onboarding(ctx) {
    document.body.classList.add('in-body');
    document.body.innerHTML = `<div class="in-auth"><div class="in-auth-art"><div class="in-row" style="justify-content:space-between;align-items:center"><div class="in-row"><span class="in-logo"><i class="fa-solid fa-building-columns"></i></span><b style="font-family:var(--in-font-display);font-size:1.2rem">Smart21Institution</b></div>${langToggleBtn()}</div>
      <div><h1>${IN.t('Welcome', 'Karibu')}, ${esc(ctx.user.name.split(' ')[0])} 👋</h1><p>${IN.t('Register your institution in under a minute. You get ready-made roles, book categories and an academic year that you can change any time.', 'Sajili taasisi yako kwa chini ya dakika moja. Utapata majukumu, jamii za vitabu na mwaka wa masomo tayari ambavyo unaweza kubadilisha wakati wowote.')}</p></div><div></div></div>
      <div class="in-auth-form"><div class="in-auth-box"><div class="in-card">
      <h3 style="margin-bottom:.3rem">${IN.t('Register your institution', 'Sajili taasisi yako')}</h3><p class="in-muted" style="margin-top:0">${IN.t('You become its Super Administrator. People you add will only see this institution.', 'Utakuwa Msimamizi Mkuu wake. Watu utakaoongeza wataona taasisi hii tu.')}</p>
      <form class="in-form" id="inSetup" novalidate><div class="in-form-error" role="alert"></div>
      ${IN.f.input('institution_name', IN.t('Institution name', 'Jina la taasisi'), { required: true, placeholder: IN.t('e.g. Kilimani Technical College', 'mfano: Chuo cha Ufundi Kilimani') })}
      ${IN.f.select('inst_type', IN.t('Type', 'Aina'), [['school', IN.t('School', 'Shule')], ['college', IN.t('College', 'Chuo')], ['university', IN.t('University', 'Chuo kikuu')], ['library', IN.t('Library', 'Maktaba')], ['training_center', IN.t('Training centre', 'Kituo cha mafunzo')], ['organization', IN.t('Organization', 'Shirika')]], { value: 'school', noBlank: true })}
      ${IN.f.input('phone', IN.t('Phone (optional)', 'Simu (si lazima)'), { type: 'tel', placeholder: '+255 712 345 678' })}
      <button class="in-btn primary block lg" type="submit">${IN.t('Register my institution', 'Sajili taasisi yangu')}</button></form>
      <p class="in-small" style="margin:.4rem 0 0"><a href="#" id="inOut">${IN.t('Sign out', 'Toka')}</a></p></div></div></div></div>`;
    document.querySelector('#inSetup [name=phone]').dataset.kind = 'phone';
    document.getElementById('inOut').addEventListener('click', async (e) => { e.preventDefault(); await IN.api.post('/logout').catch(() => {}); location.href = 'institution-start.html?go=login'; });
    const lb = document.getElementById('inLangToggle'); if (lb) lb.addEventListener('click', () => IN.toggleLang());
    const form = document.getElementById('inSetup'); const label = IN.t('Register my institution', 'Sajili taasisi yangu');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!IN.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = `<span class="in-spin"></span> ${IN.t('Setting up…', 'Inasanidi…')}`;
      try { const d = await IN.api.post('/institutions', IN.formData(form)); localStorage.setItem('in-inst-id', d.institution_id); location.reload(); }
      catch (err) { const b = form.querySelector('.in-form-error'); b.textContent = err.message; b.classList.add('show'); btn.disabled = false; btn.textContent = label; }
    });
  }

  async function start() {
    document.body.classList.add('in-body');
    document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center"><span class="in-spin" style="width:36px;height:36px"></span></div>';
    const saved = Number(localStorage.getItem('in-inst-id') || 0);
    if (saved) IN.state.inst = { id: saved };
    let ctx;
    try { ctx = await IN.api.get('/context'); } catch (e) { document.body.innerHTML = `<div class="in-verify-box in-card">${IN.errorBox(e)}</div>`; return; }
    IN.state.inst = null;
    if (!ctx.institution) return onboarding(ctx);
    Object.assign(IN.state, { user: ctx.user, inst: ctx.institution, role: ctx.role, role_label: ctx.role_label, perms: ctx.permissions, settings: ctx.settings, memberships: ctx.memberships, student_id: ctx.student_id, staff_id: ctx.staff_id });
    localStorage.setItem('in-inst-id', ctx.institution.id);
    IN.setBrand(ctx.institution.primary_color);
    shell();
    IN.lookups().catch(() => {});
    refreshBadge(); setInterval(refreshBadge, 90000);
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', start);
})();
